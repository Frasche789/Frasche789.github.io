import { createContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export const SubjectContext = createContext();

export function SubjectProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch subjects from Firestore on component mount
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const subjectsRef = collection(db, 'subjects');
        const snapshot = await getDocs(subjectsRef);
        
        const fetchedSubjects = [];
        snapshot.forEach(doc => {
          fetchedSubjects.push({ id: doc.id, ...doc.data() });
        });
        
        setSubjects(fetchedSubjects);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSubjects();
  }, []);
  
  // Function to get tomorrow's subjects based on day of week
  function getTomorrowSubjects() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const tomorrowDay = dayNames[tomorrow.getDay()];
    
    return subjects.filter(subject => 
      subject.schedule && subject.schedule[tomorrowDay]
    );
  }
  
  return (
    <SubjectContext.Provider value={{
      subjects,
      loading,
      getTomorrowSubjects
    }}>
      {children}
    </SubjectContext.Provider>
  );
}