// Hook to access subject information
import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchSubjects() {
      try {
        setIsLoading(true);
        const subjectsCollection = collection(db, 'subjects');
        const subjectsSnapshot = await getDocs(subjectsCollection);
        
        if (!isMounted) return;
        
        if (subjectsSnapshot.empty) {
          console.error('No subjects found in Firestore');
          setError('No subjects found in database');
          setSubjects([]);
          return;
        }
        
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Only log once during development
        console.log('Fetched subjects:', subjectsData.length);
        
        setSubjects(subjectsData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching subjects:', err);
        setError(`Failed to load subjects: ${err.message}`);
        // Set subjects to empty array to prevent undefined issues
        setSubjects([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSubjects();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  // Get subjects scheduled for tomorrow - memoized to prevent recalculations
  const tomorrowSubjects = useMemo(() => {
    if (error || subjects.length === 0) return []; 
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get day of week in lowercase (e.g., 'monday', 'tuesday', etc.)
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const tomorrowDay = daysOfWeek[tomorrow.getDay()];
    
    // Only log this once
    console.log(`Tomorrow is ${tomorrowDay}`);
    
    // Filter subjects scheduled for tomorrow
    const result = subjects.filter(subject => 
      subject.schedule && subject.schedule[tomorrowDay] === true
    );
    
    console.log(`Found ${result.length} subjects for tomorrow:`, 
                result.map(s => s.name || s.id).join(', '));
    
    return result;
  }, [subjects, error]);

  // Return color for a subject - memoized to prevent recalculations
  const getSubjectColor = useMemo(() => {
    return (subjectName) => {
      if (!subjectName || error) return '#808080'; // Default gray color
      
      const subject = subjects.find(s => 
        s.name && s.name.toLowerCase() === subjectName.toLowerCase()
      );
      
      return subject?.color || '#808080'; // Return subject color or default
    };
  }, [subjects, error]);
  
  return {
    allSubjects: subjects,
    tomorrowSubjects,
    getSubjectColor,
    isLoading,
    error
  };
}