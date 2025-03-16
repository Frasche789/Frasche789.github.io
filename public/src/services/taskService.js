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
  determineTaskContainer 
} from '../utils/dateUtils.js';
import { 
  calculateDueDate, 
  updateTaskWithCalculatedDueDate, 
  getEffectiveDueDate,
  calculateNextClassDay
} from '../utils/subjectUtils.js';

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
        task.container = determineTaskContainer(task);
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
 * Add a new task (chore)
 * @param {Object} choreData - Data for the new chore
 * @param {string} choreData.description - Description of the chore
 * @param {number} choreData.points - Points for completing the chore
 * @returns {Promise<Object>} The newly created task
 */
export async function addChore(choreData) {
  try {
    if (!choreData.description || !choreData.points) {
      throw new Error('Chore description and points are required');
    }

    // Create a timestamp for the task
    const timestamp = Date.now();
    
    // Get today's date in Finnish format
    const today = getTodayFinDate();
    
    // Create the task object
    const newTask = {
      description: choreData.description,
      assignDate: today, // Today's date
      dateAdded: today, // Track when the task was added
      dueDate: today, // Due today
      calculatedDueDate: today, // Same as due date for chores
      manuallySetDueDate: true, // Mark as manually set
      points: parseInt(choreData.points),
      completed: false,
      completedDate: null,
      type: 'chore',
      container: 'current', // Set container to current by default for chores
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Generate a unique ID for the task
    const taskId = `chore_${timestamp}`;
    
    // Save to Firestore
    await setDocument('tasks', taskId, newTask);
    
    // Add ID to the task object
    const taskWithId = { id: taskId, ...newTask };
    
    // Update local state
    const currentTasks = getState().tasks || [];
    setState({ 
      tasks: [...currentTasks, taskWithId] 
    }, 'taskService.addChore');
    
    // Dispatch task added event
    dispatch('task-added', taskWithId);
    
    return taskWithId;
    
  } catch (error) {
    console.error('Error adding chore:', error);
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
export async function addSubjectTask(taskData) {
  try {
    if (!taskData.description || !taskData.subject) {
      throw new Error('Task description and subject are required');
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
      points: parseInt(taskData.points || 5), // Default to 5 points if not specified
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
    taskWithDueDate.container = determineTaskContainer(taskWithDueDate);
    
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
    }, 'taskService.addSubjectTask');
    
    // Dispatch task added event
    dispatch('task-added', taskWithId);
    
    return taskWithId;
    
  } catch (error) {
    console.error('Error adding subject task:', error);
    throw error;
  }
}

/**
 * Complete a task
 * @param {string} taskId - ID of the task to complete
 * @returns {Promise<Object>} The updated task
 */
export async function completeTask(taskId) {
  try {
    // Get the current state
    const state = getState();
    const { tasks, students } = state;
    
    // Find the task in state
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    const task = tasks[taskIndex];
    
    // Get today's date in Finnish format
    const today = getTodayFinDate();
    
    // Update task data
    const updatedTask = {
      ...task,
      completed: true,
      completedDate: today,
      updatedAt: Date.now(),
      container: 'archive' // Move to archive once completed
    };
    
    // Update in Firestore
    await updateDocument('tasks', taskId, {
      completed: true,
      completedDate: today,
      updatedAt: Date.now(),
      container: 'archive'
    });
    
    // Update student points if needed
    if (students && students.length > 0) {
      // Assuming the first student is the active one
      const student = students[0];
      
      // Calculate new points
      const newPoints = (student.points || 0) + (task.points || 0);
      
      // Update student in Firestore
      await updateDocument('students', student.id, {
        points: newPoints,
        updatedAt: Date.now()
      });
      
      // Update student in state
      const updatedStudents = students.map(s => 
        s.id === student.id ? { ...s, points: newPoints } : s
      );
      
      setState({ students: updatedStudents }, 'taskService.completeTask');
    }
    
    // Update task in state
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;
    
    setState({ tasks: updatedTasks }, 'taskService.completeTask');
    
    // Dispatch task completed event
    dispatch('task-completed', updatedTask);
    
    return updatedTask;
    
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
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
    updatedTask.container = determineTaskContainer(updatedTask);
    
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
    updatedTask.container = determineTaskContainer(updatedTask);
    
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
 * Get tasks filtered by various criteria
 * @param {Object} options - Filter options
 * @param {string} [options.filter='all'] - Filter type ('all', 'subjects', 'chores')
 * @param {boolean} [options.showRecentOnly=false] - Show only recent tasks
 * @param {boolean} [options.showArchive=false] - Show archived tasks
 * @param {string} [options.container=null] - Filter by container ('archive', 'current', 'future')
 * @returns {Object} Filtered tasks organized by container
 */
export function getFilteredTasks(options = {}) {
  const {
    filter = 'all',
    showRecentOnly = false,
    showArchive = false,
    container = null
  } = options;
  
  const { tasks } = getState();
  
  if (!tasks || !tasks.length) {
    return {
      archive: [],
      current: [],
      future: []
    };
  }
  
  // Apply type filter
  let filteredTasks = [...tasks];
  
  if (filter === 'subjects') {
    filteredTasks = filteredTasks.filter(task => task.type === 'subject');
  } else if (filter === 'chores') {
    filteredTasks = filteredTasks.filter(task => task.type === 'chore');
  }
  
  // Apply completion filter (show archive or not)
  if (!showArchive) {
    filteredTasks = filteredTasks.filter(task => !task.completed);
  }
  
  // Apply recency filter if requested
  if (showRecentOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);
    
    filteredTasks = filteredTasks.filter(task => {
      const taskDate = parseFinDate(task.dueDate || task.assignDate);
      if (!taskDate) return true; // Include tasks without dates
      
      taskDate.setHours(0, 0, 0, 0);
      return taskDate >= twoWeeksAgo;
    });
  }
  
  // Apply container filter if specified
  if (container) {
    // If container is not yet set on tasks, calculate it
    filteredTasks = filteredTasks.map(task => {
      if (!task.container) {
        return { ...task, container: determineTaskContainer(task) };
      }
      return task;
    });
    
    filteredTasks = filteredTasks.filter(task => task.container === container);
    
    // Return all filtered tasks in the specified container
    return {
      [container]: filteredTasks,
      // Empty arrays for other containers
      ...(container !== 'archive' ? { archive: [] } : {}),
      ...(container !== 'current' ? { current: [] } : {}),
      ...(container !== 'future' ? { future: [] } : {})
    };
  }
  
  // Group tasks by their container (archive, current, future)
  return getTaskContainers(filteredTasks);
}

/**
 * Group tasks by container (Archive, Current, Future)
 * Archive = ALL tasks that have been created more than 14 days ago
 * Current = ALL tasks that are NOT COMPLETED AND have a subject that has class today or tomorrow
 * Future = ALL tasks that are NOT COMPLETED AND have been created less than two weeks ago
 * 
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
  
  const today = new Date();
  
  // Calculate date 2 weeks ago for archive classification
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  // Format dates for comparison
  const twoWeeksAgoTimestamp = twoWeeksAgo.getTime();
  
  tasks.forEach(task => {
    // Skip tasks with invalid data
    if (!task) return;
    
    // Archive: ALL tasks that have been created more than 14 days ago
    if (task.createdAt && new Date(task.createdAt).getTime() < twoWeeksAgoTimestamp) {
      containerGroups.archive.push({
        ...task,
        container: 'archive',
        containerClass: 'archive'
      });
      return;
    }
    
    // For non-archive tasks, if it's completed, don't show it in current or future
    if (task.completed) {
      return;
    }
    
    // Check if subject has class today or tomorrow
    let hasClassTodayOrTomorrow = false;
    
    if (task.subject) {
      const nextClass = calculateNextClassDay(task.subject);
      hasClassTodayOrTomorrow = nextClass.found && (nextClass.daysUntil === 0 || nextClass.daysUntil === 1);
    }
    
    // Current: ALL tasks that are NOT COMPLETED AND have a subject that has class today or tomorrow
    if (hasClassTodayOrTomorrow) {
      containerGroups.current.push({
        ...task,
        container: 'current',
        containerClass: 'current'
      });
    } 
    // Future: ALL tasks that are NOT COMPLETED AND have been created less than two weeks ago
    else {
      containerGroups.future.push({
        ...task,
        container: 'future',
        containerClass: 'future'
      });
    }
  });
  
  return containerGroups;
}

/**
 * Helper function to format a date for string comparison
 * @param {Date} date - Date to format
 * @returns {string} Formatted date (YYYY-MM-DD)
 */
function formatDateForComparison(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Group tasks by their due date
 * @param {Array} tasks - Array of tasks to group
 * @returns {Object} Object with tasks grouped by due date
 */
export function groupTasksByDueDate(tasks) {
  // Get today's date for comparison
  const todayFormatted = getTodayFinDate();
  
  // Group tasks by due date
  return tasks.reduce((groups, task) => {
    // Skip tasks without a due date
    if (!task.dueDate) return groups;
    
    // Get or create the group for this date
    if (!groups[task.dueDate]) {
      groups[task.dueDate] = [];
    }
    
    // Add task to its date group
    groups[task.dueDate].push(task);
    
    return groups;
  }, {});
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

/**
 * Group tasks by container (archive, current, future)
 * @param {Array} tasks - Tasks to group
 * @returns {Object} Object with tasks grouped by container
 */
export function getTaskContainers(tasks) {
  if (!tasks || !Array.isArray(tasks)) {
    console.error('Invalid tasks data provided to getTaskContainers');
    return {
      archive: [],
      current: [],
      future: []
    };
  }

  // Initialize container groups
  const containerGroups = {
    archive: [],
    current: [],
    future: []
  };

  // Group tasks by their container property
  tasks.forEach(task => {
    // Use the container property if it exists, otherwise determine it
    const container = task.container || determineTaskContainer(task);
    
    // Add task to the appropriate container
    if (containerGroups[container]) {
      containerGroups[container].push(task);
    } else {
      // Fallback to current container if somehow the container is invalid
      console.warn(`Invalid container type found for task: ${task.id}, defaulting to current`, task);
      containerGroups.current.push(task);
    }
  });

  // Sort tasks within each container
  const sortByDueDate = (a, b) => {
    // Default to today if no due date
    const dateA = a.dueDate || a.calculatedDueDate || getTodayFinDate();
    const dateB = b.dueDate || b.calculatedDueDate || getTodayFinDate();
    
    return compareDates(dateA, dateB);
  };

  // Sort tasks in each container
  containerGroups.archive.sort(sortByDueDate);
  containerGroups.current.sort(sortByDueDate);
  containerGroups.future.sort(sortByDueDate);

  return containerGroups;
}
