import React from 'react';
import { useSubjects } from '../../hooks/useSubjects';

function TomorrowClasses() {
  const { tomorrowSubjects, isLoading, error } = useSubjects();

  if (isLoading) {
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
              className={`subject-pill subject-${subject.id.toLowerCase()}`}
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