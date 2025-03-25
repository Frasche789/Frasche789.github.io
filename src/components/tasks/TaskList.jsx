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