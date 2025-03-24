// TaskCard.jsx - Individual task display component
import React from 'react';

/**
 * Component for displaying an individual task card
 * 
 * @param {Object} props - Component props
 * @param {Object} props.task - Task data object
 * @param {string} props.task.id - Unique identifier for the task
 * @param {string} props.task.description - Task description/title
 * @param {string} props.task.subject - Subject category (math, english, etc.)
 * @param {string} props.task.type - Type indicator (homework/exam/task)
 * @param {string} props.task.dueDate - Due date of the task
 * @param {boolean} props.task.completed - Completion status of the task
 * @param {Function} props.onComplete - Callback function when task is marked complete
 */
function TaskCard({ task, onComplete }) {
  // Default values for missing props
  const {
    id,
    description = 'Untitled Task',
    subject = 'other',
    type = 'task',
    dueDate = 'No due date',
    completed = false
  } = task;

  /**
   * Handle task completion click
   * @param {Event} e - Click event
   */
  const handleCompleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onComplete?.(id);
  };

  // Determine CSS classes based on task properties
  const cardClasses = [
    'task-card',
    `subject-${subject.toLowerCase()}`,
    completed ? 'completed' : '',
  ].filter(Boolean).join(' ');

  // Get the appropriate type indicator class
  const typeClass = type === 'exam' ? 'exam-indicator' : 'task-indicator';

  return (
    <div className={cardClasses}>
      <div className="task-content">
        {/* Subject pill with appropriate color coding */}
        <div className={`subject-badge ${subject.toLowerCase()}`}>
          {subject}
        </div>
        
        {/* Type indicator (homework/exam/task) */}
        <div className={typeClass}>
          {type}
        </div>
        
        {/* Task description */}
        <h3 className="task-description">{description}</h3>
        
        {/* Due date information */}
        <div className="task-due-date">
          Due: {dueDate}
        </div>
        
        {/* Completion button */}
        <button 
          className={`completion-button ${completed ? 'completed' : ''}`}
          onClick={handleCompleteClick}
          aria-label={completed ? "Completed task" : "Mark as complete"}
        >
          {completed ? '✓' : 'Complete'}
        </button>
      </div>
    </div>
  );
}

export default TaskCard;