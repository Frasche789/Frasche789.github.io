// src/components/tasks/TaskCard.jsx - Individual task display component
import React from 'react';

/**
 * Component for displaying an individual task card
 * 
 * @param {Object} props - Component props
 * @param {Object} props.task - Task data object
 * @param {Function} props.onComplete - Callback function when task is marked complete
 */
function TaskCard({ task, onComplete }) {
  const {
    id,
    subject,
    description,
    date_added,
    due_date,
    type,
    completed
  } = task;

  // Handle completion button click
  const handleCompleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onComplete && !completed) {
      onComplete(id);
    }
  };

  return (
    <div className="task-card">
      <div className="task-card-inner">
        <button 
          className="complete-btn" 
          onClick={handleCompleteClick}
          disabled={completed}
          aria-label={completed ? "Task completed" : "Mark as complete"}
        >
          {completed ? '✓' : ''}
        </button>
        
        <div className="task-card-content">
          <div className="task-card-header">
            <span className={`task-subject subject-badge ${subject.toLowerCase()}`}>
              {subject}
            </span>
            
            <span className={`task-type ${type === 'exam' ? 'exam-badge' : 'task-badge'}`}>
              {type}
            </span>
          </div>
          
          <div className="task-description">
            {description}
          </div>
          
          <div className="task-meta">
            <span>Added: {date_added}</span>
          </div>
          
          {completed && <div className="completed-stamp">Completed</div>}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;