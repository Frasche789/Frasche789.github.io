/**
 * TodaySubjects
 * 
 * A component that displays today's classes.
 * To be used in the current/today container.
 * 
 * This optimizes information presentation for ADHD/autism users by showing
 * contextually relevant information.
 */

import React from 'react';
import { useSubjects } from '../../hooks/useSubjects';

function TodaySubjects() {
  const { todaySubjects, isLoading, error } = useSubjects();
  
  if (isLoading) {
    return <div className="loading">Loading today's classes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="today-subjects">
      {todaySubjects.length > 0 ? (
        <div className="subject-list">
          {todaySubjects.map(subject => (
            <div 
              key={subject.id} 
              className={`subject-pill subject-${subject.id.toLowerCase()}`}
            >
              {subject.name}
            </div>
          ))}
        </div>
      ) : (
        <p>No school today</p>
      )}
    </div>
  );
}

export default TodaySubjects;
