/**
 * TaskContainer
 * 
 * A unified, configurable container for task display that replaces:
 * - CurrentTasksContainer (today/tomorrow tasks)
 * - FutureTaskContainer (upcoming tasks)
 * - ArchiveTasksContainer (completed tasks)
 * 
 * Core responsibilities:
 * - Provides a consistent container structure for task display
 * - Adapts behavior and appearance based on containerType
 * - Handles container-specific filtering logic
 * - Supports toggle functionality for expandable containers
 * 
 * @param {string} containerType - "current", "future", or "archive"
 */

import React, { useState, useMemo } from 'react';
import { TaskList } from './TaskList';
import ContainerToggle from '../layout/ContainerToggle';
import { useTimeBasedFiltering } from '../../hooks/useTimeBasedFiltering';
import { useTaskData } from '../../hooks/useTaskData';
import { useSubjects } from '../../hooks/useSubjects';

// Container configuration by type
const CONTAINER_CONFIG = {
  current: {
    className: "current-tasks-container task-container container-emphasis-high",
    defaultTitle: "Current Tasks",
    defaultEmptyMessage: "No current tasks",
    isExpandable: false,
    defaultExpanded: true,
    emphasisLevel: "high",
  },
  future: {
    className: "future-tasks-container task-container container-emphasis-medium",
    defaultTitle: "Upcoming Tasks",
    defaultEmptyMessage: "No upcoming tasks. You're all caught up!",
    isExpandable: false,
    defaultExpanded: true,
    emphasisLevel: "medium",
  },
  archive: {
    className: "archive-tasks-container task-container container-emphasis-low",
    defaultTitle: "Completed Tasks",
    defaultEmptyMessage: "No completed tasks yet. Complete a task to see it here!",
    isExpandable: true,
    defaultExpanded: false,
    emphasisLevel: "low",
  }
};

function TaskContainer({ containerType }) {
  // IMPORTANT: Call ALL hooks at the top level unconditionally
  
  // Get configuration for this container type - use a default if invalid
  const config = CONTAINER_CONFIG[containerType] || CONTAINER_CONFIG.current;
  
  // State for expandable containers
  const [isExpanded, setIsExpanded] = useState(config.defaultExpanded);
  
  // Get common data and task handlers
  const { getSubjectColor } = useSubjects();
  
  const { 
    todayTasks, 
    tomorrowTasks, 
    futureTasks, 
    completedTasks, 
    completeTask, 
    uncompleteTask,
    isLoading, 
    error 
  } = useTaskData();
  
  // Get time-based filtering data for current tasks
  const timeBasedData = useTimeBasedFiltering();
  
  // Process container-specific logic using useMemo to avoid recalculations
  const containerData = useMemo(() => {
    // Validation check
    const isValidType = ["current", "future", "archive"].includes(containerType);
    if (!isValidType) {
      return {
        isValid: false,
        errorMessage: `Invalid container type: ${containerType}`
      };
    }
    
    let tasks = [];
    let title = config.defaultTitle;
    let emptyMessage = config.defaultEmptyMessage;
    let containerClassName = config.className;
    let headerContent = null;
    let taskCompletionHandler = completeTask;
    
    // Container-specific logic
    if (containerType === "current") {
      // Current tasks container (time-based)
      tasks = timeBasedData.activeTasks;
      // Integrate emoji directly into the title
      title = timeBasedData.isBeforeNoon 
        ? `🌞 Morning Check - ${timeBasedData.title}` 
        : `⏳ Prepping for Tomorrow - ${timeBasedData.title}`;
      emptyMessage = timeBasedData.emptyMessage;
      containerClassName = `${containerClassName} ${timeBasedData.isBeforeNoon ? 'today-mode' : 'tomorrow-mode'}`;
      
      // No custom header - integrating into title instead
    } 
    else if (containerType === "future") {
      // Future tasks container
      // Filter out tasks that are already displayed in the current container
      const currentTaskIds = timeBasedData.activeTasks.map(task => task.id);
      const filteredFutureTasks = futureTasks.filter(task => !currentTaskIds.includes(task.id));
      
      // Sort tasks chronologically by due date
      tasks = [...filteredFutureTasks].sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date) : new Date(3000, 0, 1); // Fallback for tasks without due date
        const dateB = b.due_date ? new Date(b.due_date) : new Date(3000, 0, 1);
        return dateA - dateB; // Ascending (closest due dates first)
      });
    } 
    else if (containerType === "archive") {
      // Archive tasks container
      // Sort completed tasks by completedDate (newest first)
      tasks = [...completedTasks].sort((a, b) => {
        const dateA = a.completedDate ? new Date(a.completedDate) : new Date(0);
        const dateB = b.completedDate ? new Date(b.completedDate) : new Date(0);
        return dateB - dateA; // Newest first
      });
      
      // Use the uncompleteTask function to toggle tasks back to incomplete
      taskCompletionHandler = uncompleteTask;
    }
    
    return {
      isValid: true,
      tasks,
      title,
      emptyMessage,
      containerClassName,
      headerContent,
      taskCompletionHandler
    };
  }, [containerType, timeBasedData, futureTasks, completedTasks, completeTask, uncompleteTask, config]);
  
  // Toggle handler for expandable containers
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Handle all conditional returns AFTER all hooks have been called
  
  // First handle validation errors
  if (!containerData.isValid) {
    console.error(containerData.errorMessage);
    return <div className="error">{containerData.errorMessage}</div>;
  }
  
  // Then handle loading and error states
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (isLoading) {
    return <div className="loading">Loading tasks...</div>;
  }
  
  // Extract values from the memoized container data
  const {
    tasks,
    title,
    emptyMessage,
    containerClassName,
    headerContent,
    taskCompletionHandler
  } = containerData;
  
  // Render the appropriate container structure
  return (
    <div className={containerClassName}>
      {config.isExpandable ? (
        // Expandable container (Archive)
        <>
          <ContainerToggle 
            onToggle={handleToggle}
            title={title}
            description={`${tasks.length} tasks completed`}
            isExpanded={isExpanded}
          />
          
          {isExpanded && (
            <div className="archive-content">
              <TaskList
                title="Your Accomplishments"
                tasks={tasks}
                onComplete={taskCompletionHandler}
                emptyMessage={emptyMessage}
                getSubjectColor={getSubjectColor}
                containerType={containerType}
              />
            </div>
          )}
        </>
      ) : (
        // Standard container (Current & Future)
        <>
          <TaskList
            title={title}
            tasks={tasks}
            onComplete={taskCompletionHandler}
            emptyMessage={emptyMessage}
            getSubjectColor={getSubjectColor}
            containerType={containerType}
          />
        </>
      )}
    </div>
  );
}

export default TaskContainer;
