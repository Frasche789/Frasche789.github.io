/**
 * useContainerTasks.js
 * 
 * A custom hook that filters tasks for a specific container type using
 * the container rules system and rule context.
 * 
 * Features:
 * - Filters tasks for a specified container ('current', 'future', 'archive', 'exam')
 * - Uses rule context to adapt filtering based on subject schedules
 * - Handles loading and error states from multiple data sources
 * - Optimizes performance with memoization
 * 
 * @returns {Object} Filtered tasks and state for the specified container
 */

import { useContext, useMemo, useRef, useEffect } from 'react';
import { TaskContext } from '../context/TaskContext';
import { useRuleContext } from './useRuleContext';
import * as ContainerRules from '../rules/containerRules';

// Create a performance monitoring utility
const createPerformanceMonitor = (namespace) => {
  const callCounts = new Map();
  const filterCounts = new Map();
  const logThreshold = 3; // Only log issues after this many calls
  
  return {
    trackCall: (name, containerType) => {
      if (process.env.NODE_ENV !== 'development') return;
      
      const key = `${name}-${containerType}`;
      const count = (callCounts.get(key) || 0) + 1;
      callCounts.set(key, count);
      
      if (count === logThreshold) {
        console.warn(`[${namespace}] Performance warning: ${name} for ${containerType} called ${count} times`);
      }
    },
    trackFilter: (containerType, taskCount) => {
      if (process.env.NODE_ENV !== 'development') return;
      
      const key = `filter-${containerType}`;
      const count = (filterCounts.get(key) || 0) + 1;
      filterCounts.set(key, count);
      
      if (count === logThreshold) {
        console.warn(`[${namespace}] Filter warning: ${containerType} filtered ${taskCount} tasks ${count} times`);
      }
    },
    reset: () => {
      callCounts.clear();
      filterCounts.clear();
    }
  };
};

const taskPerformance = createPerformanceMonitor('ContainerTasks');

/**
 * Container type constants
 * @type {Object}
 */
export const CONTAINER_TYPE = {
  CURRENT: 'current',
  TOMORROW: 'tomorrow',
  FUTURE: 'future',
  ARCHIVE: 'archive',
};

// Cache for containerData to prevent recreating the same objects
const containerDataCache = {
  [CONTAINER_TYPE.CURRENT]: {
    title: "🌞 Today",
    emptyMessage: "Nothing left to do today!"
  },
  [CONTAINER_TYPE.TOMORROW]: {
    title: "🌄 Tomorrow",
    emptyMessage: "No tasks for tomorrow"
  },
  [CONTAINER_TYPE.FUTURE]: {
    title: "📆 Later",
    emptyMessage: "No upcoming tasks"
  },
  [CONTAINER_TYPE.ARCHIVE]: {
    title: "🗄️ Archive",
    emptyMessage: "No completed tasks yet"
  }
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
 * @property {string} title - Container title
 * @property {string} emptyMessage - Empty state message
 */
export function useContainerTasks(containerType = CONTAINER_TYPE.CURRENT) {
  // Track for performance analysis
  taskPerformance.trackCall('useContainerTasks', containerType);
  
  // Track render counts
  const renderCount = useRef(0);
  renderCount.current++;
  
  // Track previous task counts for performance logging
  const prevTaskCount = useRef(0);
  
  // Get tasks data from TaskContext
  const { tasks, loading: tasksLoading, error: tasksError, completeTask, uncompleteTask } = useContext(TaskContext);
  
  // Get contextual data for rule evaluation
  const { 
    todaySubjects, 
    tomorrowSubjects, 
    isLoading: contextLoading, 
    error: contextError 
  } = useRuleContext();
  
  // Combined loading and error states
  const isLoading = tasksLoading || contextLoading;
  const error = tasksError || contextError;
  
  // Use cached container data instead of recreating it each time
  const containerData = containerDataCache[containerType] || {
    title: "",
    emptyMessage: ""
  };
  
  // Create rule context for container rules - memoized
  const ruleContext = useMemo(() => ({
    todaySubjects,
    tomorrowSubjects
  }), [todaySubjects, tomorrowSubjects]);
  
  // Memoize rule function selection to prevent recreating functions on each render
  const ruleFunction = useMemo(() => {
    // Select the rule based on container type
    switch (containerType) {
      case CONTAINER_TYPE.CURRENT:
        return ContainerRules.currentContainerRule(ruleContext);
      case CONTAINER_TYPE.TOMORROW:
        return ContainerRules.tomorrowContainerRule(ruleContext);
      case CONTAINER_TYPE.FUTURE:
        return ContainerRules.futureContainerRule();
      case CONTAINER_TYPE.ARCHIVE:
        return ContainerRules.archiveContainerRule();
      default:
        console.warn(`Unknown container type: ${containerType}, defaulting to current container`);
        return ContainerRules.currentContainerRule(ruleContext);
    }
  }, [containerType, ruleContext]);
  
  // Filter and sort tasks based on container type
  const filteredTasks = useMemo(() => {
    // Return empty array if still loading or error or no tasks
    if (isLoading || error || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }
    
    // Track for performance analysis
    taskPerformance.trackFilter(containerType, tasks.length);
    
    // Log if task count has changed significantly
    if (Math.abs(tasks.length - prevTaskCount.current) > 5) {
      console.log(`[ContainerTasks] Task count changed from ${prevTaskCount.current} to ${tasks.length}`);
      prevTaskCount.current = tasks.length;
    }
    
    // Apply the rule and return filtered tasks
    const filtered = ContainerRules.applyRule(tasks, ruleFunction);
    
    // Sort tasks appropriately based on container type
    return sortTasksByContainer(filtered, containerType);
  }, [tasks, containerType, isLoading, error, ruleFunction]);
  
  // Reset performance monitoring on mount
  useEffect(() => {
    // Only reset once on initial mount
    if (renderCount.current === 1) {
      taskPerformance.reset();
    }
    
    // Log high render counts (could indicate a performance issue)
    if (renderCount.current === 10) {
      console.warn(`[ContainerTasks] High render count for ${containerType}: ${renderCount.current}`);
    }
    
    return () => {};
  }, [containerType]);
  
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
      // Current tasks: sort by priority then due date
      return sortedTasks.sort((a, b) => {
        // First sort by priority (higher is more important)
        const aPriority = a.priority || 0;
        const bPriority = b.priority || 0;
        if (bPriority !== aPriority) {
          return bPriority - aPriority;
        }
        
        // Then sort by due date (soonest first)
        const aDate = a.due_date ? new Date(a.due_date) : new Date(3000, 0, 1);
        const bDate = b.due_date ? new Date(b.due_date) : new Date(3000, 0, 1);
        return aDate - bDate;
      });
  }
}

export default useContainerTasks;
