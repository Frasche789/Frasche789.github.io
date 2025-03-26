/**
 * CurrentTasksContainer
 * 
 * Displays immediately relevant tasks requiring student attention:
 * 1. Before noon: Today's class tasks 
 * 2. After noon: Tomorrow's class tasks to support preparation
 * 
 * Core responsibilities:
 * - Displays tasks for today's/tomorrow's classes based on time
 * - Highlights exam tasks with appropriate visual treatment
 * - Maintains strict chronological ordering (closest deadlines at top)
 * - Provides immediate completion actions
 * 
 * Data filtering criteria:
 * - Time < 12:00: tasks for today's classes OR due today
 * - Time >= 12:00: tasks for tomorrow's classes
 * - task.completed === false (required)
 * 
 * Visual treatment:
 * - Highest vertical space allocation and visual emphasis
 * - Subject-colored left border for categorical recognition
 * - Task type indicators (homework/exam) with consistent styling
 * - Exam tasks receive additional visual prominence via styling
 * 
 * Implementation notes:
 * - Time-dependent filtering refreshes periodically (hourly interval)
 * - Visual differentiation for exam vs homework task types
 * - Consider behavioral nudges for task completion
 */

import React from 'react';
import TaskList from '../tasks/TaskList';  
import { useTimeBasedFiltering } from '../../hooks/useTimeBasedFiltering';
import { useSubjects } from '../../hooks/useSubjects';

function CurrentTasksContainer() {
  // Get time-based filtered tasks and related data
  const { 
    activeTasks, 
    title, 
    emptyMessage, 
    isBeforeNoon,
    isLoading, 
    error, 
    completeTask 
  } = useTimeBasedFiltering();
  
  const { getSubjectColor } = useSubjects();

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (isLoading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className={`current-tasks-container task-container container-emphasis-high ${isBeforeNoon ? 'today-mode' : 'tomorrow-mode'}`}>
      <div className="time-indicator">
        {isBeforeNoon ? '🌞 Morning Check' : '⏳Prepping for Tomorrow'}
      </div>
      <TaskList
        title={title}
        tasks={activeTasks}
        onComplete={completeTask}
        emptyMessage={emptyMessage}
        getSubjectColor={getSubjectColor}
        containerType="current"
      />
    </div>
  );
}

export default CurrentTasksContainer;