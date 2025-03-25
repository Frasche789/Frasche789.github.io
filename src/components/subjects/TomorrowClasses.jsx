import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

function TomorrowClasses() {
  const [tomorrowSubjects, setTomorrowSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTomorrowSubjects() {
      try {
        setLoading(true);
        
        // 1. Get tomorrow's day name
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayOfWeek = tomorrow.getDay();
        
        // Convert to day name for Firestore query
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const tomorrowDay = dayNames[dayOfWeek];
        
        // 2. Fetch subjects from Firestore where the schedule for tomorrow is true
        const subjectsRef = collection(db, 'subjects');
        const subjectsSnapshot = await getDocs(subjectsRef);
        
        const filteredSubjects = [];
        subjectsSnapshot.forEach(doc => {
          const subject = { id: doc.id, ...doc.data() };
          // Check if the subject is scheduled for tomorrow
          if (subject.schedule && subject.schedule[tomorrowDay] === true) {
            filteredSubjects.push(subject);
          }
        });
        
        setTomorrowSubjects(filteredSubjects);
      } catch (err) {
        console.error("Error fetching tomorrow's subjects:", err);
        setError("Failed to load class schedule. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchTomorrowSubjects();
  }, []);

  if (loading) {
    return <div className="loading">Loading tomorrow's classes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tomorrow-classes">
      <h2 className="section-title">TOMORROW'S CLASSES</h2>
      {tomorrowSubjects.length > 0 ? (
        <div className="subject-list">
          {tomorrowSubjects.map(subject => (
            <div 
              key={subject.id} 
              className={`subject-pill subject-${subject.id}`}
              style={{ backgroundColor: subject.color || '#6c757d' }}
            >
              {subject.name}
            </div>
          ))}
        </div>
      ) : (
        <p>No classes scheduled for tomorrow</p>
      )}
    </div>
  );
}

export default TomorrowClasses;