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
import { parseFinDate, getTodayFinDate, compareDates } from '../utils/dateUtils.js';

/**
 * Load tasks from Firestore
 * @param {Object} options - Options for loading tasks
 * @param {boolean} [options.useCache=true] - Whether to use cache for this query
 * @returns {Promise<Array>} Array of loaded tasks
 */
export async function loadTasks(options = { useCache: true }) {
  try {
    const tasks = await fetchCollection('tasks', options);
    
    // Update application state with the loaded tasks
    setState({ tasks }, 'taskService.loadTasks');
    
    // Dispatch loaded event
    dispatch('tasks-loaded', tasks);
    
    return tasks;
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
      dueDate: today, // Due today
      points: parseInt(choreData.points),
      completed: false,
      type: 'chore',
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
      updatedAt: Date.now()
    };
    
    // Update in Firestore
    await updateDocument('tasks', taskId, {
      completed: true,
      completedDate: today,
      updatedAt: Date.now()
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
 * Get tasks filtered by various criteria
 * @param {Object} options - Filter options
 * @param {string} [options.filter='all'] - Filter type ('all', 'subjects', 'chores')
 * @param {boolean} [options.showRecentOnly=false] - Show only recent tasks
 * @param {boolean} [options.showArchive=false] - Show archived tasks
 * @returns {Object} Filtered tasks organized by container
 */
export function getFilteredTasks(options = {}) {
  const { filter = 'all', showRecentOnly = false, showArchive = false } = options;
  
  // Get tasks from state
  const tasks = getState().tasks || [];
  
  // Today's date for comparison
  const todayFormatted = getTodayFinDate();
  
  // Filter tasks by completed status and date
  const allTasks = tasks.filter(task => {
    const dueDate = task.dueDate;
    
    // Skip tasks without a due date
    if (!dueDate) return false;
    
    // Apply the "recent only" filter if active
    if (showRecentOnly) {
      const taskDate = parseFinDate(dueDate);
      const today = new Date();
      
      // Calculate days difference
      const diffTime = Math.abs(today - taskDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Only show tasks within last 14 days
      if (diffDays > 14) return false;
    }
    
    // Apply type filter
    if (filter === 'subjects') {
      return task.type === 'subject';
    } else if (filter === 'chores') {
      return task.type === 'chore';
    }
    
    // Filter is 'all'
    return true;
  });
  
  // Separate current from archive based on task age
  const { current, archive } = getTaskContainers(allTasks);
  
  // Return the appropriate container based on showArchive flag
  return {
    tasks: showArchive ? archive : current,
    archiveCount: archive.length,
    currentCount: current.length
  };
}

/**
 * Get task containers (current and archive) based on task age
 * @param {Array} tasks - Array of tasks to sort
 * @returns {Object} Object with current and archive task arrays
 */
export function getTaskContainers(tasks) {
  const current = [];
  const archive = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thresholdDate = new Date(today);
  thresholdDate.setDate(today.getDate() - 14); // Two weeks ago
  
  tasks.forEach(task => {
    // Try to get the date to use for sorting
    // Prefer completedDate for completed tasks, otherwise use dueDate
    const dateToUse = task.completed ? 
      (task.completedDate || task.dueDate) : 
      task.dueDate;
    
    if (!dateToUse) {
      // Default to current if no date available
      current.push(task);
      return;
    }
    
    // Parse the date
    const taskDate = parseFinDate(dateToUse);
    
    // If date parsing failed, default to current
    if (!taskDate) {
      current.push(task);
      return;
    }
    
    // Clear time part for accurate date comparison
    taskDate.setHours(0, 0, 0, 0);
    
    // If the task is completed and older than the threshold, put in archive
    if (task.completed && taskDate < thresholdDate) {
      archive.push(task);
    } else {
      current.push(task);
    }
  });
  
  return { current, archive };
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
