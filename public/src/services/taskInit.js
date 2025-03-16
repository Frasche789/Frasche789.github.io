/**
 * taskInit.js - Task service initialization with bootstrap integration
 * Handles loading tasks and students from Firebase
 */

import { registerInitStep } from '../bootstrap.js';
import { fetchCollection } from './firebaseInit.js';
import { setState } from '../state/appState.js';

// Registration constants
export const TASK_INIT_ID = 'tasks';
export const STUDENT_INIT_ID = 'students';

/**
 * Initialize tasks from Firebase
 * @returns {Promise<Array>} Array of loaded tasks
 */
async function loadTasks() {
  console.log('Loading tasks from Firebase...');
  
  try {
    // Fetch tasks from Firestore
    const tasks = await fetchCollection('tasks', { useCache: false });
    
    // Sort tasks by dueDate and priority
    const sortedTasks = tasks.sort((a, b) => {
      // First by due date
      const dateA = new Date(a.dueDate || '9999-12-31');
      const dateB = new Date(b.dueDate || '9999-12-31');
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      
      // Then by priority (higher number = higher priority)
      return (b.priority || 0) - (a.priority || 0);
    });
    
    // Update state with loaded tasks
    setState({ tasks: sortedTasks }, 'taskService.loadTasks');
    
    console.log(`Loaded ${tasks.length} tasks`);
    return sortedTasks;
    
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw new Error(`Failed to load tasks: ${error.message}`);
  }
}

/**
 * Initialize students from Firebase
 * @returns {Promise<Array>} Array of loaded students
 */
async function loadStudents() {
  console.log('Loading students from Firebase...');
  
  try {
    // Fetch students from Firestore
    const students = await fetchCollection('students', { useCache: false });
    
    // Update state with loaded students
    setState({ students }, 'taskService.loadStudents');
    
    console.log(`Loaded ${students.length} students`);
    return students;
    
  } catch (error) {
    console.error('Error loading students:', error);
    throw new Error(`Failed to load students: ${error.message}`);
  }
}

// Register tasks initialization with bootstrap
registerInitStep({
  id: TASK_INIT_ID,
  name: 'Task Data Initialization',
  initFn: loadTasks,
  dependencies: ['firebase'], // Depends on Firebase being initialized
  required: true,
  critical: true
});

// Register students initialization with bootstrap
registerInitStep({
  id: STUDENT_INIT_ID,
  name: 'Student Data Initialization',
  initFn: loadStudents,
  dependencies: ['firebase'], // Depends on Firebase being initialized
  required: true,
  critical: false // Not critical as the app can function with default student
});

// Export an event name for task data ready
export const TASKS_READY_EVENT = 'tasks:ready';
export const STUDENTS_READY_EVENT = 'students:ready';
