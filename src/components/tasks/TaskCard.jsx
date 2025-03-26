// src/components/tasks/TaskCard.jsx - Individual task display component
import React, { useState, useRef, useEffect } from 'react';
import { formatDate, getRelativeTextFromISODate, isToday } from '../../utils/dateUtils';

/**
 * Component for displaying an individual task card with standardized information hierarchy:
 * 1. Task Description (Primary) - What needs to be done
 * 2. Subject (Secondary) - Category/classification 
 * 3. Due Date (Tertiary) - When it's needed
 * 4. Completion Status (Quaternary) - Task state
 * 
 * @param {Object} props - Component props
 * @param {Object} props.task - Task data object
 * @param {Function} props.onComplete - Callback function when task is marked complete
 * @param {string} props.containerType - Type of container (current, future, archive)
 */
function TaskCard({ task, onComplete, containerType = 'current' }) {
  const {
    id,
    subject,
    description,
    date_added,
    due_date,
    type,
    completed
  } = task;

  // State to track animation
  const [isCompleting, setIsCompleting] = useState(false);
  const cardRef = useRef(null);
  const buttonRef = useRef(null);

  // Determine if task is due today/tomorrow for special styling
  const isDueToday = isToday(due_date);
  const isDueTomorrow = getRelativeTextFromISODate(due_date) === 'Tomorrow';
  
  // Handle completion button click with animation
  const handleCompleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onComplete && !completed && !isCompleting) {
      // Trigger animation first
      setIsCompleting(true);
      
      // Add animation classes
      if (buttonRef.current) {
        buttonRef.current.classList.add('task-completing');
      }
      
      if (cardRef.current) {
        cardRef.current.classList.add('task-completing');
      }
      
      // Delay the actual completion to allow animation to run
      // Use 1800ms to match the crumple animation duration (1.8s)
      setTimeout(() => {
        onComplete(id);
        // Animation will be removed when component re-renders with completed=true
      }, 1800); // Match this with the animation duration in task-card.css
    }
  };

  // Cleanup animation classes when component updates
  useEffect(() => {
    if (!isCompleting && buttonRef.current) {
      buttonRef.current.classList.remove('task-completing');
    }
    
    if (!isCompleting && cardRef.current) {
      cardRef.current.classList.remove('task-completing');
    }
  }, [isCompleting]);

  // Determine CSS classes based on task properties and container type
  const cardClasses = [
    'task-card',
    `subject-${subject.toLowerCase()}`,
    type === 'exam' ? 'exam-task' : '',
    isDueToday && type === 'exam' ? 'exam-due-today' : '',
    isDueTomorrow && type === 'exam' ? 'exam-due-tomorrow' : '',
    completed ? 'completed-task' : '',
    `container-emphasis-${containerType === 'current' ? 'high' : containerType === 'future' ? 'medium' : 'low'}`
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} ref={cardRef}>
      <div className="task-card-inner">
        {/* QUATERNARY: Completion status - interactive feedback */}
        <button 
          className="complete-btn" 
          onClick={handleCompleteClick}
          disabled={completed}
          aria-label={completed ? "Task completed" : "Mark as complete"}
          ref={buttonRef}
        >
          <span>{completed ? '✓' : ''}</span>
        </button>
        
        <div className="task-card-content">
          {/* PRIMARY: Task description - highest visual prominence */}
          <div className="task-description">
            {description}
          </div>
          
          {/* SECONDARY: Subject/categorization - distinctive color, medium emphasis */}
          <div className="task-card-header">
            <span className={`task-subject subject-badge ${subject.toLowerCase()}`}>
              {subject}
            </span>
            
            {/* Task type badge removed as requested */}
          </div>
          
          {/* TERTIARY: Temporal information - smaller size, lighter color */}
          <div className="task-meta">
            <span className="task-date">
              <span className="task-date-label">Assigned:</span> {getRelativeTextFromISODate(date_added)}
            </span>
            
            {due_date && (
              <span className={`task-due-date ${isDueToday ? 'task-due-today' : ''}`}>
                <span className="task-date-label">Due:</span> {getRelativeTextFromISODate(due_date)}
              </span>
            )}
          </div>
          
          {/* Completion status visual indicator */}
          {completed && <div className="completed-stamp">Completed</div>}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;