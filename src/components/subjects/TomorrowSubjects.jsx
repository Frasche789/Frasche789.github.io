/**
 * TomorrowSubjects
 * 
 * A component that displays tomorrow's classes.
 * To be used in the tomorrow container.
 * 
 * This optimizes information presentation for ADHD/autism users by showing
 * contextually relevant information.
 */

import React from 'react';
import { useSubjects } from '../../hooks/useSubjects';

function TomorrowSubjects() {
  const { tomorrowSubjects, isLoading, error } = useSubjects();
  
  if (isLoading) {
    return <div className="loading">Loading tomorrow's classes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tomorrow-subjects">
      {tomorrowSubjects.length > 0 ? (
        <div className="subject-list">
          {tomorrowSubjects.map(subject => (
            <div 
              key={subject.id} 
              className={`subject-pill subject-${subject.id.toLowerCase()}`}
            >
              {subject.name}
            </div>
          ))}
        </div>
      ) : (
        <p>No school tomorrow</p>
      )}
    </div>
  );
}

export default TomorrowSubjects;
