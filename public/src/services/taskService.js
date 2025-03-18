/**
 * taskService.js - Task management services for Quest Board
 * Provides methods for CRUD operations on tasks via Firebase
 */

import { 
  fetchCollection, 
  fetchDocument,
  updateDocument,
  setDocument
} from './firebaseService.js';
import { getState, setState, dispatch } from '../state/appState.js';
import { 
  parseFinDate, 
  getTodayFinDate, 
  compareDates, 
} from '../utils/dateUtils.js';
import { 
  updateTaskWithCalculatedDueDate, 
  getEffectiveDueDate,  
  calculateNextClassDay,
  hasClassTodayOrTomorrow
} from '../utils/subjectUtils.js';
import { categorizeTask } from '../services/taskCategorization.js';

/**
 * Load tasks from Firestore
 * @param {Object} options - Options for loading tasks
 * @param {boolean} [options.useCache=true] - Whether to use cache for this query
 * @returns {Promise<Array>} Array of loaded tasks
 */
export async function loadTasks(options = { useCache: true }) {
  try {
    const tasks = await fetchCollection('tasks', options);
    
    // Calculate due dates and containers for tasks that don't have them
    const tasksWithDueDates = tasks.map(task => {
      // If the task doesn't have a calculatedDueDate, compute it
      if (!task.calculatedDueDate && task.subject) {
        task = updateTaskWithCalculatedDueDate(task);
      }
      
      // If the task doesn't have a container assigned, determine it
      if (!task.container) {
        task.container = categorizeTask(task);
      }
      
      return task;
    });
    
    // Update application state with the loaded tasks
    setState({ tasks: tasksWithDueDates }, 'taskService.loadTasks');
    
    // Dispatch loaded event
    dispatch('tasks-loaded', tasksWithDueDates);
    
    return tasksWithDueDates;
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
}

/**
 * Load students from Firestore
 * @param {Object} options - Options for loading students
 * @param {boolean} [options.useCache=true] - Whether to use cache for this query
 * @returns {Promise<Array>} Array of loaded students
 */
export async function loadStudents(options = { useCache: true }) {
  try {
    const students = await fetchCollection('students', options);
    
    // Update application state with the loaded students
    setState({ students }, 'taskService.loadStudents');
    
    // Dispatch loaded event
    dispatch('students-loaded', students);
    
    return students;
  } catch (error) {
    console.error('Error loading students:', error);
    throw error;
  }
}

/**
 * Add a new task
 * @param {Object} taskData - Data for the new task
 * @param {string} taskData.description - Description of the task
 * @param {number} taskData.points - Points for completing the task
 * @returns {Promise<Object>} The newly created task
 */
export async function addTask(taskData) {
  try {
    if (!taskData.description) {
      throw new Error('Task description is required');
    }
    // Create a timestamp for the task
    const timestamp = Date.now();
    
    // Get today's date in Finnish format
    const today = getTodayFinDate();
    
    // Create the task object
    const newTask = {
      description: taskData.description,
      assignDate: today, // Today's date
      dateAdded: today, // Track when the task was added
      dueDate: today, // Due today
      calculatedDueDate: today, // Same as due date for chores
      manuallySetDueDate: true, // Mark as manually set
      completed: false,
      completedDate: null,
      type: 'task',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Determine which container this task belongs to
    newTask.container = categorizeTask(newTask);
    
    // Generate a unique ID for the task
    const taskId = `task_${timestamp}`;
    
    // Save to Firestore
    await setDocument('tasks', taskId, newTask);
    
    // Add ID to the task object
    const taskWithId = { id: taskId, ...newTask };
    
    // Update local state
    const currentTasks = getState().tasks || [];
    setState({ 
      tasks: [...currentTasks, taskWithId] 
    }, 'taskService.addTask');
    
    // Dispatch task added event
    dispatch('task-added', taskWithId);
    
    return taskWithId;
    
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
}

/**
 * Add a new subject task
 * @param {Object} taskData - Data for the new task
 * @param {string} taskData.description - Description of the task
 * @param {string} taskData.subject - Subject of the task
 * @param {number} taskData.points - Points for completing the task (optional)
 * @param {string} taskData.dueDate - Due date in Finnish format (optional)
 * @returns {Promise<Object>} The newly created task
 */
export async function addHomework(taskData) {
  try {
    if (!taskData.description || !taskData.subject) {
      throw new Error('Homework description and subject are required');
    }

    // Create a timestamp for the task
    const timestamp = Date.now();
    
    // Get today's date in Finnish format
    const today = getTodayFinDate();
    
    // Create a task object with calculated due date if not provided
    const taskWithSubject = {
      ...taskData,
      type: 'subject',
      dateAdded: today,
      assignDate: today,
      completed: false,
      completedDate: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Calculate due date based on the subject's next class
    const taskWithDueDate = updateTaskWithCalculatedDueDate(taskWithSubject);
    
    // Set manuallySetDueDate flag if a due date was explicitly provided
    if (taskData.dueDate) {
      taskWithDueDate.manuallySetDueDate = true;
      taskWithDueDate.dueDate = taskData.dueDate;
    }
    
    // Determine which container this task belongs to
    taskWithDueDate.container = categorizeTask(taskWithDueDate);
    
    // Generate a unique ID for the task
    const taskId = `subject_${timestamp}`;
    
    // Save to Firestore
    await setDocument('tasks', taskId, taskWithDueDate);
    
    // Add ID to the task object
    const taskWithId = { id: taskId, ...taskWithDueDate };
    
    // Update local state
    const currentTasks = getState().tasks || [];
    setState({ 
      tasks: [...currentTasks, taskWithId] 
    }, 'taskService.addHomework');
    
    // Dispatch task added event
    dispatch('task-added', taskWithId);
    
    return taskWithId;
    
  } catch (error) {
    console.error('Error adding homework:', error);
    throw error;
  }
}

/**
 * Mark a task as complete
 * @param {string} taskId - ID of the task to mark as complete
 * @returns {Promise<void>}
 */
export async function markTaskComplete(taskId) {
  try {
    console.log('Marking task as complete:', taskId);
    
    // Get today's date in Finnish format
    const today = getTodayFinDate();
    
    // Update the task in Firestore
    await updateDocument('tasks', taskId, {
      completed: true,
      completedDate: today,
      updatedAt: Date.now()
    });
    
    console.log('Task marked as complete in Firestore');
    
    // Update local state
    const currentTasks = getState().tasks || [];
    setState({ 
      tasks: currentTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: true, completedDate: today, updatedAt: Date.now() } 
          : task
      ) 
    }, 'taskService.markTaskComplete');
    
    // Dispatch task completed event
    dispatch('task-completed', { taskId });
    
    // Refresh tasks after completion
    await loadTasks({ useCache: false });
    
    return taskId;
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}

/**
 * Complete a task
 * @param {string} taskId - ID of the task to complete
 * @returns {Promise<Object>} The updated task
 */
export async function completeTask(taskId) {
  // Simply use the markTaskComplete function to maintain consistency
  return markTaskComplete(taskId);
}

/**
 * Update a task's due date
 * @param {string} taskId - ID of the task to update
 * @param {string} dueDate - New due date in Finnish format
 * @returns {Promise<Object>} The updated task
 */
export async function updateTaskDueDate(taskId, dueDate) {
  try {
    // Get the current state
    const state = getState();
    const { tasks } = state;
    
    // Find the task in state
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const task = tasks[taskIndex];
    
    // Update task data
    const updatedTask = {
      ...task,
      dueDate,
      manuallySetDueDate: true, // Mark as manually set
      updatedAt: Date.now()
    };
    
    // Recalculate the container based on the new due date
    updatedTask.container = categorizeTask(updatedTask);
    
    // Update in Firestore
    await updateDocument('tasks', taskId, {
      dueDate,
      manuallySetDueDate: true,
      container: updatedTask.container,
      updatedAt: Date.now()
    });
    
    // Update task in state
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;
    
    setState({ tasks: updatedTasks }, 'taskService.updateTaskDueDate');
    
    // Dispatch task updated event
    dispatch('task-updated', updatedTask);
    
    return updatedTask;
    
  } catch (error) {
    console.error('Error updating task due date:', error);
    throw error;
  }
}

/**
 * Reset a task's due date to the calculated value
 * @param {string} taskId - ID of the task to reset
 * @returns {Promise<Object>} The updated task
 */
export async function resetTaskDueDate(taskId) {
  try {
    // Get the current state
    const state = getState();
    const { tasks } = state;
    
    // Find the task in state
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const task = tasks[taskIndex];
    
    // Only apply to subject tasks
    if (task.type !== 'subject') {
      throw new Error(`Cannot reset due date for non-subject tasks`);
    }
    
    // Calculate the due date based on the subject's next class
    const updatedTask = updateTaskWithCalculatedDueDate(task, true);
    updatedTask.manuallySetDueDate = false;
    updatedTask.updatedAt = Date.now();
    
    // Recalculate the container based on the new due date
    updatedTask.container = categorizeTask(updatedTask);
    
    // Update in Firestore
    await updateDocument('tasks', taskId, {
      calculatedDueDate: updatedTask.calculatedDueDate,
      dueDate: updatedTask.calculatedDueDate,
      manuallySetDueDate: false,
      container: updatedTask.container,
      updatedAt: Date.now()
    });
    
    // Update task in state
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;
    
    setState({ tasks: updatedTasks }, 'taskService.resetTaskDueDate');
    
    // Dispatch task updated event
    dispatch('task-updated', updatedTask);
    
    return updatedTask;
    
  } catch (error) {
    console.error('Error resetting task due date:', error);
    throw error;
  }
}

/**
 * Group tasks by container (Archive, Current, Future)
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Tasks grouped by container
 */
export function groupTasksByContainer(tasks) {
  const containerGroups = {
    archive: [],
    current: [],
    future: []
  };
  
  if (!tasks || !Array.isArray(tasks)) {
    console.warn('Invalid tasks array provided to groupTasksByContainer');
    return containerGroups;
  }
  
  tasks.forEach(task => {
    // Skip tasks with invalid data
    if (!task) return;
    
    // Use categorizeTask to decide which container the task belongs to
    const container = categorizeTask(task);
    
    // Add task to the appropriate container group
    if (container === 'archive' && containerGroups.archive) {
      containerGroups.archive.push({
        ...task,
        container,
      });
    } else if (container === 'current' && containerGroups.current) {
      containerGroups.current.push({
        ...task,
        container,
      });
    } else if (container === 'future' && containerGroups.future) {
      containerGroups.future.push({
        ...task,
        container,
      });
    }
  });
  
  return containerGroups;
}

/**
 * Group tasks by their next class day
 * @param {Array} tasks - Array of tasks to group
 * @returns {Object} Object with tasks grouped by next class occurrence
 */
export function groupTasksByNextClass(tasks) {
  // Filter subject tasks that aren't completed
  const subjectTasks = tasks.filter(task => 
    task.type === 'subject' && !task.completed
  );
  
  // Group the tasks using the task.subject property
  const groupedBySubject = subjectTasks.reduce((groups, task) => {
    if (!task.subject) return groups;
    
    if (!groups[task.subject]) {
      groups[task.subject] = [];
    }
    
    groups[task.subject].push(task);
    
    return groups;
  }, {});
  
  return groupedBySubject;
}

/**
 * Group tasks by urgency (today, tomorrow, later)
 * @param {Array} tasks - Array of tasks to group
 * @returns {Object} Object with tasks grouped by urgency levels
 */
export function groupTasksByUrgency(tasks) {
  try {
    // Initialize groups
    const grouped = {
      immediate: {
        today: [],
        tomorrow: []
      },
      later: []
    };
    
    // Get today's date in Finnish format
    const todayFinDate = getTodayFinDate();
    
    // Parse today's date to create tomorrow's date
    const todayDate = parseFinDate(todayFinDate);
    
    // Safety check - if today's date can't be parsed, use current date
    if (!todayDate) {
      console.warn('Could not parse today\'s date', todayFinDate);
      // Log and use fallback groups
      return grouped;
    }
    
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    // Format tomorrow's date in Finnish format
    const tomorrowFinDate = `${tomorrowDate.getDate().toString().padStart(2, '0')}.${(tomorrowDate.getMonth() + 1).toString().padStart(2, '0')}.${tomorrowDate.getFullYear()}`;
    
    // Sort tasks into appropriate categories
    tasks.forEach(task => {
      // Use the effective due date (manually set or calculated)
      const effectiveDueDate = getEffectiveDueDate(task);
      
      // Handle tasks without due dates
      if (!effectiveDueDate || effectiveDueDate === 'No Due Date') {
        grouped.later.push({...task, urgencyCategory: 'later'});
        return;
      }
      
      // Compare the task due date with today's date
      const comparison = compareDates(effectiveDueDate, todayFinDate);
      
      // Handle invalid dates (comparison returns 2, 3, or 4)
      if (comparison >= 2) {
        console.warn(`Invalid date comparison result for task: ${task.id}, dueDate: ${effectiveDueDate}`);
        grouped.later.push({...task, urgencyCategory: 'later'});
        return;
      }
      
      if (comparison === 0) {
        // Due today
        grouped.immediate.today.push({...task, urgencyCategory: 'today'});
      } else if (compareDates(effectiveDueDate, tomorrowFinDate) === 0) {
        // Due tomorrow
        grouped.immediate.tomorrow.push({...task, urgencyCategory: 'tomorrow'});
      } else if (comparison < 0) {
        // Overdue (before today)
        grouped.immediate.today.push({...task, urgencyCategory: 'overdue'});
      } else {
        // Due later (after tomorrow)
        grouped.later.push({...task, urgencyCategory: 'later'});
      }
    });
    
    return grouped;
  } catch (error) {
    console.error('Error grouping tasks by urgency:', error);
    // Return empty groups if there's an error
    return {
      immediate: {
        today: [],
        tomorrow: []
      },
      later: []
    };
  }
}
