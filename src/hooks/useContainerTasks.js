/**
 * useContainerTasks.js
 * 
 * A custom hook that filters tasks for a specific container type using
 * the container rules system and rule context.
 * 
 * Features:
 * - Filters tasks for a specified container ('current', 'future', 'archive', 'exam')
 * - Uses rule context to adapt filtering based on time of day and subject schedules
 * - Handles loading and error states from multiple data sources
 * - Optimizes performance with memoization
 * 
 * @returns {Object} Filtered tasks and state for the specified container
 */

import { useContext, useMemo } from 'react';
import { TaskContext } from '../context/TaskContext';
import { useRuleContext } from './useRuleContext';
import * as ContainerRules from '../rules/containerRules';

/**
 * Container type constants
 * @type {Object}
 */
export const CONTAINER_TYPE = {
  CURRENT: 'current',
  TOMORROW: 'tomorrow',
  FUTURE: 'future',
  ARCHIVE: 'archive',
  EXAM: 'exam'
};

/**
 * Hook that provides filtered tasks for a specific container
 * @param {string} containerType - The type of container to filter tasks for
 * @returns {Object} Container data object
 * @property {Array} tasks - Filtered tasks for the specified container
 * @property {boolean} isLoading - True if any dependent data is loading
 * @property {string|null} error - Error message if any
 * @property {Function} completeTask - Function to mark a task as complete
 * @property {Function} uncompleteTask - Function to mark a task as incomplete
 * @property {string} title - Container title (for 'current' container only)
 * @property {string} emptyMessage - Empty state message (for 'current' container only)
 */
export function useContainerTasks(containerType = CONTAINER_TYPE.CURRENT) {
  // Get tasks data from TaskContext
  const { tasks, loading: tasksLoading, error: tasksError, completeTask, uncompleteTask } = useContext(TaskContext);
  
  // Get contextual data for rule evaluation
  const { 
    timeOfDay, 
    todaySubjects, 
    tomorrowSubjects, 
    isLoading: contextLoading, 
    error: contextError 
  } = useRuleContext();
  
  // Combined loading and error states
  const isLoading = tasksLoading || contextLoading;
  const error = tasksError || contextError;
  
  // Container-specific data (title, empty message for current container)
  const containerData = useMemo(() => {
    if (containerType === CONTAINER_TYPE.CURRENT) {
      return {
        title: ContainerRules.getCurrentContainerTitle(timeOfDay),
        emptyMessage: ContainerRules.getCurrentContainerEmptyMessage(timeOfDay)
      };
    }
    
    return {
      title: "",
      emptyMessage: ""
    };
  }, [containerType, timeOfDay]);
  
  // Create rule context for container rules
  const ruleContext = useMemo(() => ({
    timeOfDay,
    todaySubjects,
    tomorrowSubjects
  }), [timeOfDay, todaySubjects, tomorrowSubjects]);
  
  // Filter and sort tasks based on container type
  const filteredTasks = useMemo(() => {
    // Return empty array if still loading or error or no tasks
    if (isLoading || error || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }
    
    // Get the appropriate rule function based on container type
    let ruleFunction;
    switch (containerType) {
      case CONTAINER_TYPE.CURRENT:
        ruleFunction = ContainerRules.currentContainerRule(ruleContext);
        break;
      case CONTAINER_TYPE.TOMORROW:
        ruleFunction = ContainerRules.tomorrowContainerRule(ruleContext);
        break;
      case CONTAINER_TYPE.FUTURE:
        ruleFunction = ContainerRules.futureContainerRule();
        break;
      case CONTAINER_TYPE.ARCHIVE:
        ruleFunction = ContainerRules.archiveContainerRule();
        break;
      case CONTAINER_TYPE.EXAM:
        ruleFunction = ContainerRules.examContainerRule();
        break;
      default:
        console.warn(`Unknown container type: ${containerType}, defaulting to current container`);
        ruleFunction = ContainerRules.currentContainerRule(ruleContext);
    }
    
    // Apply the rule and return filtered tasks
    const filtered = ContainerRules.applyRule(tasks, ruleFunction);
    
    // Sort tasks appropriately based on container type
    return sortTasksByContainer(filtered, containerType);
  }, [tasks, containerType, isLoading, error, ruleContext]);
  
  return {
    tasks: filteredTasks,
    isLoading,
    error,
    completeTask,
    uncompleteTask,
    ...containerData
  };
}

/**
 * Sort tasks appropriately based on container type
 * @param {Array} tasks - Tasks to sort
 * @param {string} containerType - Container type
 * @returns {Array} Sorted tasks
 */
function sortTasksByContainer(tasks, containerType) {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }
  
  const sortedTasks = [...tasks]; // Create a copy to avoid mutating original
  
  switch (containerType) {
    case CONTAINER_TYPE.ARCHIVE:
      // Archive tasks: sort by completion date (newest first)
      return sortedTasks.sort((a, b) => {
        const aDate = a.completedDate ? new Date(a.completedDate) : 
                     (a.due_date ? new Date(a.due_date) : new Date(0));
        const bDate = b.completedDate ? new Date(b.completedDate) : 
                     (b.due_date ? new Date(b.due_date) : new Date(0));
        return bDate - aDate; // Newest first
      });
      
    case CONTAINER_TYPE.FUTURE:
      // Future tasks: sort by due date (soonest first)
      return sortedTasks.sort((a, b) => {
        // For tasks without due dates, set to far future date
        const aDate = a.due_date ? new Date(a.due_date) : new Date(3000, 0, 1);
        const bDate = b.due_date ? new Date(b.due_date) : new Date(3000, 0, 1);
        return aDate - bDate; // Soonest first
      });
      
    case CONTAINER_TYPE.EXAM:
      // Exam tasks: sort by due date (closest first)
      return sortedTasks.sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date) : new Date(3000, 0, 1);
        const bDate = b.due_date ? new Date(b.due_date) : new Date(3000, 0, 1);
        return aDate - bDate; // Closest due date first
      });
    
    case CONTAINER_TYPE.TOMORROW:
      // Tomorrow tasks: sort by creation date (oldest first)
      return sortedTasks.sort((a, b) => {
        const aDate = a.date_added ? new Date(a.date_added) : 
                     (a.due_date ? new Date(a.due_date) : new Date(0));
        const bDate = b.date_added ? new Date(b.date_added) : 
                     (b.due_date ? new Date(b.due_date) : new Date(0));
        return aDate - bDate; // Oldest first
      });
      
    case CONTAINER_TYPE.CURRENT:
    default:
      // Current container: prioritize today's tasks first, then sort by creation date
      return sortedTasks.sort((a, b) => {
        const aDate = a.date_added ? new Date(a.date_added) : 
                     (a.due_date ? new Date(a.due_date) : new Date(0));
        const bDate = b.date_added ? new Date(b.date_added) : 
                     (b.due_date ? new Date(b.due_date) : new Date(0));
        return aDate - bDate; // Oldest first
      });
  }
}

export default useContainerTasks;
