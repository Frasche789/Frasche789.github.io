/**
 * TaskList
 * 
 * Generic task list renderer used by all container components.
 * Implements consistent visual grammar for tasks across containers.
 * 
 * Core responsibilities:
 * - Renders consistent task cards for all containers
 * - Applies container-specific visual styling via containerType prop
 * - Handles empty states with appropriate messaging
 * - Propagates completion events back to container
 * 
 * Visual grammar implementation:
 * - Consistent left-to-right information flow (subject → action)
 * - Subject color applied to left border and subject badge
 * - Position hierarchy follows strict chronological ordering
 * - Shape language: pill-shaped subject badges, consistent rounding
 * 
 * @param {string} title - The heading text for the task list
 * @param {Array} tasks - The array of task objects to display
 * @param {string} emptyMessage - Message to show when tasks array is empty
 * @param {Function} onComplete - Handler for task completion events
 * @param {string} containerType - Container type for styling ("current", "future", "archive", "exam")
 * @param {Function} getSubjectColor - Function to get color code for a subject
 */

// TaskList.jsx
import React from 'react';
import TaskCard from './TaskCard';
import EmptyState from '../common/EmptyState';
import { CONTAINER_TYPE } from '../../hooks/useContainerTasks';

export function TaskList({ 
  title, 
  tasks, 
  emptyMessage, 
  onComplete, 
  containerType = CONTAINER_TYPE.CURRENT,
  getSubjectColor
}) {
  if (!tasks || tasks.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  
  return (
    <div className="task-list">
      <h2>{title}</h2>
      {tasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task} 
          onComplete={onComplete}
          containerType={containerType}
          getSubjectColor={getSubjectColor}
        />
      ))}
    </div>
  );
}

export default TaskList;