import React from 'react';
import TaskList from './TaskList';  
import { useTaskData } from '../../hooks/useTaskData';
import { useSubjects } from '../../hooks/useSubjects';

function CurrentTasksContainer() {
  const { tomorrowTasks, isLoading, error, completeTask } = useTaskData();
  const { getSubjectColor } = useSubjects();

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (isLoading) {
    return <div className="loading">Loading tomorrow's tasks...</div>;
  }

  return (
    <div className="current-tasks-container">
      <TaskList
        title="Tasks for Tomorrow's Classes"
        tasks={tomorrowTasks}
        onComplete={completeTask}
        emptyMessage="No tasks due for tomorrow's classes"
        getSubjectColor={getSubjectColor}
      />
    </div>
  );
}

export default CurrentTasksContainer;