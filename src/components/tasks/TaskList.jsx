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
 * Expected props:
 * - tasks: Array - filtered tasks to display
 * - containerType: String - "archive"|"current"|"future" for styling
 * - onComplete: Function - handler for task completion
 * - emptyMessage: String - contextual message when no tasks exist
 * 
 * Implementation considerations:
 * - Pure rendering component that maintains styling consistency
 * - Applies information density appropriate to container type
 * - Preserves subject color continuity across all containers
 */

// TaskList.jsx
import React from 'react';
import TaskCard from './TaskCard';
import EmptyState from '../common/EmptyState';
import { useTaskData } from '../../hooks/useTaskData';

function TaskList({ title, tasks, emptyMessage, onComplete }) {
  if (tasks.length === 0) {
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
        />
      ))}
    </div>
  );
}

// These components use the TaskList with specific data
export function CurrentTaskList() {
  const { todayTasks, tomorrowTasks, completeTask } = useTaskData();
  const combinedTasks = [...todayTasks, ...tomorrowTasks];
  
  return (
    <TaskList
      title="Tasks To Complete" 
      tasks={combinedTasks}
      onComplete={completeTask}
      emptyMessage="Nothing left to do! Well done!" 
    />
  );
}

export function FutureTaskList() {
  const { futureTasks, completeTask } = useTaskData();
  
  return (
    <TaskList 
      title="Upcoming Tasks" 
      tasks={futureTasks}
      onComplete={completeTask}
      emptyMessage="No upcoming tasks" 
    />
  );
}

export default TaskList;