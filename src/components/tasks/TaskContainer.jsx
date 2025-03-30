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
 * - Handles container-specific styling and presentation
 * - Supports toggle functionality for expandable containers
 * 
 * @param {string} containerType - "current", "tomorrow", "future", or "archive"
 */

import React, { useState, useMemo } from 'react';
import { TaskList } from './TaskList';
import ContainerToggle from '../layout/ContainerToggle';
import { useSubjects } from '../../hooks/useSubjects';
import { useContainerTasks, CONTAINER_TYPE } from '../../hooks/useContainerTasks';

// Container configuration by type
const CONTAINER_CONFIG = {
  [CONTAINER_TYPE.CURRENT]: {
    className: "current-tasks-container task-container container-emphasis-high",
    defaultTitle: "Today's Tasks",
    defaultEmptyMessage: "No tasks due today",
    isExpandable: false,
    defaultExpanded: true,
    emphasisLevel: "high",
  },
  [CONTAINER_TYPE.TOMORROW]: {
    className: "tomorrow-tasks-container task-container container-emphasis-medium-high",
    defaultTitle: "Tomorrow's Tasks",
    defaultEmptyMessage: "No tasks due tomorrow",
    isExpandable: false,
    defaultExpanded: true,
    emphasisLevel: "medium-high",
  },
  [CONTAINER_TYPE.FUTURE]: {
    className: "future-tasks-container task-container container-emphasis-medium",
    defaultTitle: "Upcoming Tasks",
    defaultEmptyMessage: "No upcoming tasks. You're all caught up!",
    isExpandable: false,
    defaultExpanded: true,
    emphasisLevel: "medium",
  },
  [CONTAINER_TYPE.ARCHIVE]: {
    className: "archive-tasks-container task-container container-emphasis-low",
    defaultTitle: "Completed Tasks",
    defaultEmptyMessage: "No completed tasks yet. Complete a task to see it here!",
    isExpandable: true,
    defaultExpanded: false,
    emphasisLevel: "low",
  },
  [CONTAINER_TYPE.EXAM]: {
    className: "exam-tasks-container task-container container-emphasis-high",
    defaultTitle: "Upcoming Exams",
    defaultEmptyMessage: "No upcoming exams. You're all set!",
    isExpandable: false,
    defaultExpanded: true,
    emphasisLevel: "high",
  }
};

// Valid container types list
const VALID_CONTAINER_TYPES = Object.values(CONTAINER_TYPE);

function TaskContainer({ containerType = CONTAINER_TYPE.CURRENT }) {
  // Validate containerType prop
  const validatedContainerType = VALID_CONTAINER_TYPES.includes(containerType) 
    ? containerType 
    : CONTAINER_TYPE.CURRENT;
  
  // Get configuration for this container type
  const config = CONTAINER_CONFIG[validatedContainerType];
  
  // State for expandable containers
  const [isExpanded, setIsExpanded] = useState(config.defaultExpanded);
  
  // Get subject color data
  const { getSubjectColor } = useSubjects();
  
  // Get container-specific tasks and data using the new hook
  const { 
    tasks, 
    isLoading, 
    error, 
    completeTask, 
    uncompleteTask,
    title: containerTitle,
    emptyMessage: containerEmptyMessage
  } = useContainerTasks(validatedContainerType);
  
  // Process container-specific data using useMemo to avoid recalculations
  const containerData = useMemo(() => {
    let displayTitle = containerTitle || config.defaultTitle;
    let displayEmptyMessage = containerEmptyMessage || config.defaultEmptyMessage;
    let containerClassName = config.className;
    let taskCompletionHandler = completeTask;
    
    // Container-specific logic
    if (validatedContainerType === CONTAINER_TYPE.CURRENT) {
      // Enhance title with emoji based on time of day (morning vs afternoon)
      const timeBasedTitle = displayTitle;
      const isMorningMode = timeBasedTitle.includes("Today");
      
      displayTitle = isMorningMode 
        ? `🌞 Morning Check - ${timeBasedTitle}` 
        : `⏳ Prepping for Tomorrow - ${timeBasedTitle}`;
      
      containerClassName = `${containerClassName} ${isMorningMode ? 'today-mode' : 'tomorrow-mode'}`;
    } 
    else if (validatedContainerType === CONTAINER_TYPE.ARCHIVE) {
      // Use the uncompleteTask function to toggle tasks back to incomplete for archive container
      taskCompletionHandler = uncompleteTask;
    }
    
    return {
      tasks,
      title: displayTitle,
      emptyMessage: displayEmptyMessage,
      containerClassName,
      taskCompletionHandler
    };
  }, [
    validatedContainerType, 
    tasks, 
    containerTitle, 
    containerEmptyMessage, 
    config, 
    completeTask, 
    uncompleteTask
  ]);
  
  // Toggle handler for expandable containers
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Handle error and loading states
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (isLoading) {
    return <div className="loading">Loading tasks...</div>;
  }
  
  // Extract values from the memoized container data
  const {
    title,
    emptyMessage,
    containerClassName,
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
                containerType={validatedContainerType}
              />
            </div>
          )}
        </>
      ) : (
        // Standard container (Current, Future, Exam)
        <>
          <TaskList
            title={title}
            tasks={tasks}
            onComplete={taskCompletionHandler}
            emptyMessage={emptyMessage}
            getSubjectColor={getSubjectColor}
            containerType={validatedContainerType}
          />
        </>
      )}
    </div>
  );
}

export default TaskContainer;
