/**
 * TimeAwareSubjects
 * 
 * A time-aware component that displays either today's or tomorrow's classes
 * based on the current time of day.
 * 
 * Morning view (before noon): Shows TODAY'S CLASSES
 * Evening view (after noon): Shows TOMORROW'S CLASSES
 * 
 * This optimizes information presentation for ADHD/autism users by showing
 * the most contextually relevant information at the right time.
 */

import React from 'react';
import { useSubjects } from '../../hooks/useSubjects';
import { useTimeBasedFiltering } from '../../hooks/useTimeBasedFiltering';

function TimeAwareSubjects() {
  const { todaySubjects, tomorrowSubjects, isLoading, error } = useSubjects();
  const { isBeforeNoon } = useTimeBasedFiltering();
  
  // Select subjects based on time of day
  const relevantSubjects = isBeforeNoon ? todaySubjects : tomorrowSubjects;
  const headingText = isBeforeNoon ? "TODAY'S CLASSES" : "TOMORROW'S CLASSES";
  const emptyMessage = isBeforeNoon 
    ? "No classes scheduled for today" 
    : "No classes scheduled for tomorrow";

  if (isLoading) {
    return <div className="loading">Loading classes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className={`time-aware-subjects ${isBeforeNoon ? 'today-mode' : 'tomorrow-mode'}`}>
      <h2 className="section-title">{headingText}</h2>
      {relevantSubjects.length > 0 ? (
        <div className="subject-list">
          {relevantSubjects.map(subject => (
            <div 
              key={subject.id} 
              className={`subject-pill subject-${subject.id.toLowerCase()}`}
            >
              {subject.name}
            </div>
          ))}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </div>
  );
}

export default TimeAwareSubjects;
