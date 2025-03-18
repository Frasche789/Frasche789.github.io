/**
 * TaskList.js - Task List Component
 * Handles rendering lists of tasks grouped by date or class schedule
 * Unified implementation that supports all display modes
 */

import { createTaskCard } from './TaskCard.js';
import { isToday, isTomorrow, getRelativeDateText, getTodayFinDate, parseFinDate, getDaysBetweenDates } from '../utils/dateUtils.js';
import { dispatch, getState, setState, subscribe } from '../state/appState.js';
import { calculateNextClassDay } from '../utils/subjectUtils.js';

// DOM elements cache for today's tasks
let todayTasksEl = null;
let todayEmptyStateEl = null;
let unsubscribeFunctions = [];

/**
 * Create a date-based task list container
 * @param {string} date - The date in Finnish format (DD.MM.YYYY)
 * @param {Array} tasks - Array of tasks for this date
 * @param {string} todayFormatted - Today's date in Finnish format for comparison
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 * @returns {HTMLElement} The task list container element
 */
export function createDateTaskList(date, tasks, todayFormatted, onTaskCompleted) {
  const container = document.createElement('div');
  container.className = 'task-day';
  container.dataset.date = date;
  
  // Create the date header with appropriate visual distinction
  let dateClass = '';
  let dateText = date;
  
  // Add visual distinction based on date relation to today
  if (isToday(date)) {
    dateClass = 'today';
    dateText = 'Today';
  } else if (isTomorrow(date)) {
    dateClass = 'tomorrow';
    dateText = 'Tomorrow';
  } else {
    // Get a human-readable date format
    dateText = getRelativeDateText(date, todayFormatted);
  }
  
  // Create date header
  const dateHeader = document.createElement('div');
  dateHeader.className = `task-day-header ${dateClass}`;
  dateHeader.innerHTML = `<h3 class="task-day-title">${dateText}</h3>`;
  container.appendChild(dateHeader);
  
  // Create task list by calling shared method
  const taskList = createGenericTaskList(tasks, onTaskCompleted);
  container.appendChild(taskList);
  
  return container;
}

/**
 * Create a subject-based task list container
 * @param {string} subject - The subject name
 * @param {Array} tasks - Array of tasks for this subject
 * @param {Object} nextClassInfo - Information about when the next class occurs
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 * @returns {HTMLElement} The task list container element
 */
export function createSubjectTaskList(subject, tasks, nextClassInfo, onTaskCompleted) {
  const container = document.createElement('div');
  container.className = 'task-day subject-group';
  container.dataset.subject = subject;
  
  // Create subject header with next class information
  const subjectHeader = document.createElement('div');
  subjectHeader.className = 'task-day-header';
  
  let nextClassText = 'Not scheduled';
  if (nextClassInfo && nextClassInfo.found) {
    if (nextClassInfo.daysUntil === 0) {
      nextClassText = 'Today';
    } else if (nextClassInfo.daysUntil === 1) {
      nextClassText = 'Tomorrow';
    } else {
      nextClassText = `${nextClassInfo.dayName} (in ${nextClassInfo.daysUntil} days)`;
    }
  }
  
  subjectHeader.innerHTML = `
    <h3 class="task-day-title">${subject}</h3>
    <div class="next-class-info">Next: ${nextClassText}</div>
  `;
  container.appendChild(subjectHeader);
  
  // Create task list by calling shared method
  const taskList = createGenericTaskList(tasks, onTaskCompleted);
  container.appendChild(taskList);
  
  return container;
}

/**
 * Create an empty state container when no tasks are available
 * @param {string} message - Message to display
 * @returns {HTMLElement} Empty state container
 */
export function createEmptyState(message = 'No tasks found') {
  const container = document.createElement('div');
  container.className = 'empty-state-container';
  container.style.display = 'flex';
  
  container.innerHTML = `
    <div class="empty-state-content">
      <i class="ri-emotion-happy-line"></i>
      <h3>All done!</h3>
      <p>${message}</p>
    </div>
  `;
  
  return container;
}

/**
 * Update tasks in an existing task list
 * @param {HTMLElement} listElement - The existing task list element
 * @param {Array} updatedTasks - Updated tasks data
 * @param {Function} onTaskCompleted - Callback for when a task is completed 
 */
export function updateTaskList(listElement, updatedTasks, onTaskCompleted) {
  if (!listElement) return;
  
  // Clear existing tasks
  const taskList = listElement.querySelector('.task-list');
  if (!taskList) return;
  
  taskList.innerHTML = '';
  
  // Add updated tasks using shared functionality
  updatedTasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      if (onTaskCompleted && typeof onTaskCompleted === 'function') {
        onTaskCompleted(taskId);
      }
      
      // Also dispatch a global event
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
}

/**
 * Create a generic task list containing task cards
 * @param {Array} tasks - Array of tasks
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 * @param {string} [additionalClass] - Optional additional class for the task list
 * @returns {HTMLElement} The task list container element
 */
function createGenericTaskList(tasks, onTaskCompleted, additionalClass = '') {
  const taskList = document.createElement('div');
  taskList.className = `task-list ${additionalClass}`.trim();
  
  // Add tasks to the list
  tasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      if (onTaskCompleted && typeof onTaskCompleted === 'function') {
        onTaskCompleted(taskId);
      }
      
      // Also dispatch a global event
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  return taskList;
}

/**
 * Initialize the Today Tasks component
 * @param {Object} elements - DOM elements object
 */
export function initTodayTasks(elements) {
  // More resilient element assignment
  todayTasksEl = elements.todayTasks || elements.currentTasks;
  todayEmptyStateEl = elements.todayEmptyState || elements.emptyCurrentTasks;
  
  console.log('Initializing today tasks with elements:', {
    todayTasks: todayTasksEl?.id,
    todayEmptyState: todayEmptyStateEl?.id
  });
  
  // Try to find elements if they're still missing
  if (!todayTasksEl) {
    console.warn('Today tasks element not found, trying to find by ID');
    todayTasksEl = document.getElementById('currentTasks');
  }
  
  if (!todayEmptyStateEl) {
    console.warn('Today empty state element not found, trying to find by ID');
    todayEmptyStateEl = document.getElementById('emptyCurrentTasks');
  }
  
  // Final check before continuing
  if (!todayTasksEl) {
    console.error('Critical: Unable to find today tasks container element');
    return;
  }
  
  // Subscribe to task updates
  const unsubscribe = subscribe((state, changes) => {
    // Check if the tasks array changed
    if (changes.includes('tasks')) {
      renderTodayTasks(state.tasks);
    }
  }, { path: 'tasks' });
  
  unsubscribeFunctions.push(unsubscribe);
  
  // Subscribe to task-completed events
  const unsubscribeEvents = subscribe((payload) => {
    if (payload && payload.taskId) {
      handleTaskUpdate(payload);
    }
  }, { event: 'task-completed' });
  
  unsubscribeFunctions.push(unsubscribeEvents);
}

/**
 * Cleanup on component destruction
 */
export function cleanupTodayTasks() {
  // Unsubscribe from all subscriptions
  unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  unsubscribeFunctions = [];
}

/**
 * Render today's tasks in the fixed header
 * @param {Array} tasks - All tasks
 * @param {string} [todayFormatted] - Today's date in Finnish format (optional)
 */
export function renderTodayTasks(tasks, todayFormatted = null) {
  if (!todayTasksEl || !todayEmptyStateEl) {
    console.error('Today tasks elements not initialized. Call initTodayTasks first.');
    return;
  }
  
  // Check if tasks is undefined or null
  if (!tasks || !Array.isArray(tasks)) {
    console.error('Tasks array is undefined or not an array');
    todayEmptyStateEl.style.display = 'flex';
    return;
  }
  
  // Get today's date if not provided
  if (!todayFormatted) {
    todayFormatted = getTodayFinDate();
  }
  
  // Clear previous content
  todayTasksEl.innerHTML = '';
  
  // Find today's tasks based on new logic
  const todayTasks = tasks.filter(task => {
    // Filter 1: Tasks must not be completed
    if (task.completed) {
      return false;
    }
    
    // Filter 2: Check if task was created within the last 14 days
    const creationDate = task.date; // Use creation date from task.date
    if (!creationDate) {
      return false; // Skip tasks without a creation date
    }
    
    const today = parseFinDate(todayFormatted);
    const creationDateObj = parseFinDate(creationDate);
    
    if (!creationDateObj) {
      return false; // Skip tasks with invalid dates
    }
    
    // Calculate days between creation date and today
    const daysBetween = getDaysBetweenDates(creationDate, todayFormatted);
    
    // Only include tasks from the last 14 days
    if (daysBetween === null || daysBetween > 14) {
      return false;
    }
    
    // Filter 3: Check if the task's subject occurs today or next school day
    if (task.subject) {
      const nextClass = calculateNextClassDay(task.subject);
      
      // Subject occurs today or tomorrow
      return nextClass.found && (nextClass.daysUntil === 0 || nextClass.daysUntil === 1);
    }
    
    // If no subject is assigned (e.g., general tasks or chores),
    // include them if they were created within the last 14 days
    return true;
  });
  
  // Update state with filtered today tasks
  setState({ todayTasks }, 'todayTasksFiltered');
  
  // Handle empty state
  if (todayTasks.length === 0) {
    todayEmptyStateEl.style.display = 'flex';
    return;
  }
  
  // Hide empty state
  todayEmptyStateEl.style.display = 'none';
  
  // Create task list using shared functionality with custom class
  const taskList = createGenericTaskList(todayTasks, onTodayTaskCompleted, 'today-tasks-list');
  
  // Add today-specific class to all task cards
  const taskCards = taskList.querySelectorAll('.task-card');
  taskCards.forEach(card => card.classList.add('today-task-card'));
  
  todayTasksEl.appendChild(taskList);
}

/**
 * Handle completion of a task in the today section
 * @param {string} taskId - ID of the completed task
 */
function onTodayTaskCompleted(taskId) {
  if (!todayTasksEl || !todayEmptyStateEl) return;
  
  // Update state to reflect the task is completed
  setState(state => {
    // Update the task in the main tasks array
    const updatedTasks = state.tasks.map(task => 
      task.id === taskId ? { ...task, completed: true, completedDate: new Date().toLocaleDateString() } : task
    );
    
    // Filter out the completed task from today tasks
    const updatedTodayTasks = (state.todayTasks || []).filter(task => task.id !== taskId);
    
    return {
      tasks: updatedTasks,
      todayTasks: updatedTodayTasks
    };
  }, 'todayTaskCompleted');
  
  // Remove the task card from the DOM
  const taskCard = todayTasksEl.querySelector(`.task-card[data-id="${taskId}"]`);
  if (taskCard) {
    taskCard.remove();
  }
  
  // Check if there are any tasks left
  if (todayTasksEl.children.length === 0 || 
     (todayTasksEl.querySelector('.task-list') && 
      todayTasksEl.querySelector('.task-list').children.length === 0)) {
    // Show empty state with celebration
    todayEmptyStateEl.style.display = 'flex';
    
    // Add animation to the empty state
    const celebrationText = todayEmptyStateEl.querySelector('.celebration-text');
    if (celebrationText) {
      celebrationText.classList.add('bounce');
      
      // Remove animation class after it completes
      setTimeout(() => {
        celebrationText.classList.remove('bounce');
      }, 1000);
    }
  }
}

/**
 * Update the today tasks view when tasks are modified
 * @param {Object} detail - Event detail with updated task information
 */
function handleTaskUpdate(detail) {
  if (!detail || !detail.taskId) return;
  
  const taskId = detail.taskId;
  
  // Access state directly since we're in an event handler
  const state = getState();
  if (!state || !state.tasks) return;
  
  // Find the task that was updated
  const taskIndex = state.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  
  // Check if this task is in today tasks
  const todayTaskIndex = (state.todayTasks || []).findIndex(t => t.id === taskId);
  
  // If task was completed and it's in today tasks, remove it
  if (todayTaskIndex !== -1 && state.tasks[taskIndex].completed) {
    // We don't need to update state here as the event that triggered this
    // should have already updated the state
    renderTodayTasks(state.tasks);
  }
}
