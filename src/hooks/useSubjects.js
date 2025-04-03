// Hook to access subject information
import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Create a debug logger that only logs in development and prevents duplicate logs
const createLogger = (namespace) => {
  const logged = new Set();
  
  return (message, data = null, forceLog = false) => {
    // Only log in development or if forced
    if (process.env.NODE_ENV !== 'development' && !forceLog) return;
    
    // Create a key from the message to track duplicates
    const key = `${namespace}:${message}`;
    
    // Skip duplicate logs unless forced
    if (logged.has(key) && !forceLog) return;
    
    // Add to logged set to prevent duplicates
    logged.add(key);
    
    // Log with proper formatting
    if (data) {
      console.log(`[${namespace}] ${message}`, data);
    } else {
      console.log(`[${namespace}] ${message}`);
    }
  };
};

// Create subject logger
const subjectLogger = createLogger('Subjects');

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchAttempts = useRef(0);
  const hasLoggedToday = useRef(false);
  const hasLoggedTomorrow = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchSubjects() {
      // Avoid refetching if we already have subjects
      if (subjects.length > 0) {
        subjectLogger('Using cached subjects data');
        return;
      }
      
      // Track fetch attempts to prevent excessive retries
      fetchAttempts.current += 1;
      
      if (fetchAttempts.current > 3) {
        subjectLogger('Too many fetch attempts, aborting', null, true);
        setError('Unable to load subjects after multiple attempts');
        setIsLoading(false);
        return;
      }
      
      try {
        subjectLogger(`Fetching subjects (attempt ${fetchAttempts.current})`);
        setIsLoading(true);
        const subjectsCollection = collection(db, 'subjects');
        const subjectsSnapshot = await getDocs(subjectsCollection);
        
        if (!isMounted) return;
        
        if (subjectsSnapshot.empty) {
          subjectLogger('No subjects found in Firestore', null, true);
          setError('No subjects found in database');
          setSubjects([]);
          return;
        }
        
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Only log once
        subjectLogger(`Fetched ${subjectsData.length} subjects successfully`);
        
        setSubjects(subjectsData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        subjectLogger('Error fetching subjects', err, true);
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
  }, [subjects.length]);

  // Get subjects scheduled for today - memoized to prevent recalculations
  const todaySubjects = useMemo(() => {
    if (error || subjects.length === 0) return []; 
    
    const today = new Date();
    
    // Get day of week in lowercase (e.g., 'monday', 'tuesday', etc.)
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = daysOfWeek[today.getDay()];
    
    // Only log this once
    if (!hasLoggedToday.current) {
      subjectLogger(`Today is ${todayDay}`);
      hasLoggedToday.current = true;
    }
    
    // Filter subjects scheduled for today
    const result = subjects.filter(subject => 
      subject.schedule && subject.schedule[todayDay] === true
    );
    
    // Only log this once
    if (!hasLoggedToday.current || result.length === 0) {
      subjectLogger(`Found ${result.length} subjects for today`, 
                  result.map(s => s.name || s.id).join(', '));
    }
    
    return result;
  }, [subjects, error]);

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
    if (!hasLoggedTomorrow.current) {
      subjectLogger(`Tomorrow is ${tomorrowDay}`);
      hasLoggedTomorrow.current = true;
    }
    
    // Filter subjects scheduled for tomorrow
    const result = subjects.filter(subject => 
      subject.schedule && subject.schedule[tomorrowDay] === true
    );
    
    // Only log this once
    if (!hasLoggedTomorrow.current || result.length === 0) {
      subjectLogger(`Found ${result.length} subjects for tomorrow`, 
                  result.map(s => s.name || s.id).join(', '));
    }
    
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
    todaySubjects,
    tomorrowSubjects,
    getSubjectColor,
    isLoading,
    error
  };
}