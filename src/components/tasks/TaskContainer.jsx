import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { useContainerTasks, CONTAINER_TYPE } from '../../hooks/useContainerTasks';


/**
 * TaskContainer - A unified container component for task display that adapts 
 * based on container type and emphasis level.
 * 
 * @param {Object} props - Component props
 * @param {string} props.containerType - Container type from CONTAINER_TYPE enum
 * @param {boolean} props.showTitle - Whether to show the container title
 * @param {React.ReactNode} props.children - Optional children components to render in the container
 */
function TaskContainer({ 
  containerType = CONTAINER_TYPE.CURRENT,
  showTitle = true,
  children
}) {
  // Get container-specific tasks and data using the container hooks
  const { 
    tasks, 
    isLoading, 
    error, 
    completeTask, 
    uncompleteTask,
    title: containerTitle,
    emptyMessage: containerEmptyMessage
  } = useContainerTasks(containerType);
  
  // For archive container, track expanded state
  const [isExpanded, setIsExpanded] = useState(containerType !== CONTAINER_TYPE.ARCHIVE);
  
  // Get the appropriate CSS classes based on container type
  const getContainerClasses = () => {
    const baseClasses = ['task-container'];
    
    // Add emphasis level class
    switch(containerType) {
      case CONTAINER_TYPE.CURRENT:
        baseClasses.push('container-emphasis-high');
        break;
      case CONTAINER_TYPE.TOMORROW:
        baseClasses.push('container-emphasis-medium-high');
        break;
      case CONTAINER_TYPE.FUTURE:
        baseClasses.push('container-emphasis-medium');
        break;
      case CONTAINER_TYPE.ARCHIVE:
      case CONTAINER_TYPE.EXAM:
      default:
        baseClasses.push('container-emphasis-low');
    }
    
    // Add container type specific class
    baseClasses.push(`${containerType}-tasks-container`);
    
    // Add loading/error states if needed
    if (isLoading) baseClasses.push('is-loading');
    if (error) baseClasses.push('has-error');
    
    return baseClasses.join(' ');
  };
  
  // Handle toggle for expandable containers (Archive)
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Task completion handler - use the appropriate function based on container type
  const handleTaskComplete = (taskId) => {
    if (containerType === CONTAINER_TYPE.ARCHIVE) {
      // For archive container, uncomplete tasks to move them back
      uncompleteTask(taskId);
    } else {
      // For all other containers, mark tasks as complete
      completeTask(taskId);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className={getContainerClasses()}>
        <div className="task-container__content">
          <div className="loading-text">
            <div className="loading-indicator"></div>
            <p>Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className={getContainerClasses()}>
        <div className="task-container__error">{error}</div>
      </div>
    );
  }
  
  // For archive container, render with toggle
  if (containerType === CONTAINER_TYPE.ARCHIVE) {
    return (
      <div className={getContainerClasses()}>
        <button 
          className="container-toggle" 
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls="archive-content"
        >
          <div className={`toggle-content ${isExpanded ? 'expanded' : ''}`}>
            <span className="toggle-title">{containerTitle || "Completed Tasks"}</span>
            <span className="toggle-icon">{isExpanded ? '▼' : '▲'}</span>
          </div>
          <p>{tasks.length} tasks completed</p>
        </button>
        
        <div id="archive-content" className={`archive-content ${isExpanded ? 'visible' : ''}`}>
          {tasks.length > 0 ? (
            <div className="task-list">
              {tasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onComplete={handleTaskComplete}
                  containerType={containerType}
                />
              ))}
            </div>
          ) : (
            <div className="task-container__empty">
              <span className="task-container__empty-icon">✓</span>
              <p className="task-container__empty-text">
                {containerEmptyMessage || "No completed tasks yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // For all other containers, render standard view
  return (
    <div className={getContainerClasses()}>
      {showTitle && (
        <div className="task-container__header">
          <h2 className="task-container__title">{containerTitle}</h2>
          {tasks.length > 0 && (
            <span className="task-container__count">{tasks.length}</span>
          )}
        </div>
      )}
      
      {/* Render children components (e.g., TodaySubjects or TomorrowSubjects) if provided */}
      {children && (
        <div className="task-container__subjects">
          {children}
        </div>
      )}
      
      <div className="task-container__content">
        {tasks.length > 0 ? (
          <div className="task-list">
            {tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onComplete={handleTaskComplete}
                containerType={containerType}
              />
            ))}
          </div>
        ) : (
          <div className="task-container__empty">
            <span className="task-container__empty-icon">✓</span>
            <p className="task-container__empty-text">
              {containerEmptyMessage || "No tasks to display"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskContainer;