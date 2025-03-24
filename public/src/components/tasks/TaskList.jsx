// TaskList.jsx - Component for displaying a list of tasks
import React from 'react';
import TaskCard from './TaskCard';

/**
 * Component that renders multiple TaskCard components
 * 
 * @param {Object} props - Component props
 * @param {Array} props.tasks - Array of task objects to display
 * @param {Function} props.onTaskComplete - Callback function when a task is completed
 * @param {string} [props.title] - Optional title for the task list section
 * @param {string} [props.emptyMessage] - Optional message to display when no tasks are available
 */
function TaskList({ 
  tasks = [], 
  onTaskComplete,
  title,
  emptyMessage = 'No tasks available'
}) {
  // Handle case when there are no tasks
  if (tasks.length === 0) {
    return (
      <div className="task-list-container">
        {title && <h2 className="section-title">{title}</h2>}
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="task-list-container">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="task-list">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onComplete={onTaskComplete}
          />
        ))}
      </div>
    </div>
  );
}

export default TaskList;