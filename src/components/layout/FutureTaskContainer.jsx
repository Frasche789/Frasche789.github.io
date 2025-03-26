/**
 * FutureTasksContainer
 * 
 * Presents upcoming tasks beyond the current/tomorrow timeframe to
 * support planning and reduce cognitive load through external storage.
 * 
 * Core responsibilities:
 * - Chronologically organizes upcoming tasks by due date (fallback: dateAdded)
 * - Provides advance visibility into workload distribution
 * - Allows early completion of future tasks when capacity permits
 * - May implement grouping by day, week, or subject in the future
 * 
 * Information presentation characteristics:
 * - Moderate information density (emphasizes what and when)
 * - Secondary planning area with medium visual emphasis
 * - Slight opacity reduction (90%), standard spacing
 * 
 * Data filtering criteria:
 * - Not in Current container AND
 * - task.completed === false AND
 * - Has future due date OR belongs to class scheduled beyond tomorrow
 * 
 * Visual treatment:
 * - Medium vertical space allocation in container hierarchy
 * - Slightly reduced opacity compared to Current container
 * - Maintains subject color coding via left border
 * - Preserves task type visual differentiation (homework/exam)
 * 
 * Implementation notes:
 * - Consider implementing relative timeframes ("In 3 days")
 * - May benefit from collapsed day-based groups for longer timeframes
 * - Lower visual emphasis compared to Current container
 * - Could incorporate workload analysis for balanced planning
 */

import React from 'react';
import TaskList from '../tasks/TaskList';
import { useTaskData } from '../../hooks/useTaskData';
import { useTimeBasedFiltering } from '../../hooks/useTimeBasedFiltering';
import { useSubjects } from '../../hooks/useSubjects';
import ContainerWrapper from '../common/ContainerWrapper';
import { useTheme } from '../../context/ThemeContext';

function FutureTaskContainer() {
  // Get all task data and time-based filtered tasks
  const { futureTasks, completeTask, isLoading, error } = useTaskData();
  const { activeTasks, isBeforeNoon } = useTimeBasedFiltering(); 
  const { getSubjectColor } = useSubjects();
  const { getContainerStyles } = useTheme();
  
  // Filter out tasks that are already displayed in the current container
  // to prevent duplication between containers
  const currentTaskIds = activeTasks.map(task => task.id);
  const filteredFutureTasks = futureTasks.filter(task => !currentTaskIds.includes(task.id));
  
  // Sort tasks chronologically by due date
  const sortedFutureTasks = [...filteredFutureTasks].sort((a, b) => {
    const dateA = a.due_date ? new Date(a.due_date) : new Date(3000, 0, 1); // Fallback for tasks without due date
    const dateB = b.due_date ? new Date(b.due_date) : new Date(3000, 0, 1);
    return dateA - dateB; // Ascending (closest due dates first)
  });
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (isLoading) {
    return <div className="loading">Loading upcoming tasks...</div>;
  }
  
  return (
    <ContainerWrapper containerType="future">
      <div className="container-header">
        <h2>Upcoming Tasks</h2>
        <span className="task-count">{sortedFutureTasks.length} tasks</span>
      </div>
      
      <TaskList
        title="Plan Ahead"
        tasks={sortedFutureTasks}
        onComplete={completeTask}
        emptyMessage="No upcoming tasks. You're all caught up!"
        getSubjectColor={getSubjectColor}
        containerType="future"
      />
    </ContainerWrapper>
  );
}

export default FutureTaskContainer;