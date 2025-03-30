/**
 * useTaskData.js
 * 
 * ⚠️ DEPRECATED: This hook has been refactored to remove all filtering logic.
 * New components should use useContainerTasks for filtered tasks.
 * 
 * This hook now only provides basic task data and operations:
 * - Raw tasks array
 * - Loading and error states
 * - Task operations (completeTask, uncompleteTask)
 * 
 * @module hooks/useTaskData
 */

import { useContext } from 'react';
import { TaskContext } from '../context/TaskContext';

/**
 * Provides access to task data and operations.
 * No longer returns filtered task lists - use useContainerTasks instead.
 * 
 * @returns {Object} Task data and operations
 * @property {Array} tasks - All tasks (unfiltered)
 * @property {boolean} isLoading - Loading status
 * @property {string|null} error - Error message if any
 * @property {Function} completeTask - Function to mark a task complete
 * @property {Function} uncompleteTask - Function to mark a task incomplete
 */
export function useTaskData() {
    // Display deprecation warning in development environment
    if (process.env.NODE_ENV === 'development') {
        console.warn(
            '⚠️ DEPRECATED: useTaskData no longer provides filtered task lists. ' +
            'Use useContainerTasks instead. This hook will be removed in October 2025.'
        );
    }
    
    // Get tasks and operations directly from context
    const { 
        tasks, 
        loading, 
        error, 
        completeTask, 
        uncompleteTask 
    } = useContext(TaskContext);
    
    // Return only basic data - no filtering
    return {
        tasks,
        isLoading: loading,
        error,
        completeTask,
        uncompleteTask
    };
}

export default useTaskData;