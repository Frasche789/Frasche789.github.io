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
import { useRuleContext } from '../../hooks/useRuleContext';

function TimeAwareSubjects() {
  const { todaySubjects, tomorrowSubjects, isLoading: subjectsLoading, error: subjectsError } = useSubjects();
  const { timeOfDay, isLoading: contextLoading, error: contextError } = useRuleContext();
  
  // Combined loading and error states
  const isLoading = subjectsLoading || contextLoading;
  const error = subjectsError || contextError;
  
  // Select subjects based on time of day
  const isMorning = timeOfDay === 'morning';
  const relevantSubjects = isMorning ? todaySubjects : tomorrowSubjects;
  const headingText = isMorning ? "TODAY'S CLASSES" : "TOMORROW'S CLASSES";
  const emptyMessage = isMorning 
    ? "No classes scheduled for today" 
    : "No classes scheduled for tomorrow";

  if (isLoading) {
    return <div className="loading">Loading classes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className={`time-aware-subjects ${isMorning ? 'today-mode' : 'tomorrow-mode'}`}>
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
