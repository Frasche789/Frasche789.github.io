// Hook to access subject information
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        setIsLoading(true);
        const subjectsCollection = collection(db, 'subjects');
        const subjectsSnapshot = await getDocs(subjectsCollection);
        
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSubjects(subjectsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError('Failed to load subjects');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  // Get subjects scheduled for tomorrow
  const getTomorrowSubjects = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get day of week in lowercase (e.g., 'monday', 'tuesday', etc.)
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const tomorrowDay = daysOfWeek[tomorrow.getDay()];
    
    // Filter subjects scheduled for tomorrow
    return subjects.filter(subject => 
      subject.schedule && subject.schedule[tomorrowDay] === true
    );
  };

  // Return color for a subject
  const getSubjectColor = (subjectName) => {
    if (!subjectName) return '#808080'; // Default gray color
    
    const subject = subjects.find(s => 
      s.name && s.name.toLowerCase() === subjectName.toLowerCase()
    );
    
    return subject?.color || '#808080'; // Return subject color or default
  };
  
  return {
    allSubjects: subjects,
    tomorrowSubjects: getTomorrowSubjects(),
    getSubjectColor,
    isLoading,
    error
  };
}