/**
 * TaskList.js - Task List Component
 * Handles rendering lists of tasks grouped by date or class schedule
 */

import { createTaskCard } from './TaskCard.js';
import { isToday, isTomorrow, getRelativeDateText } from '../utils/dateUtils.js';
import { dispatch } from '../state/appState.js';

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
  container.className = 'quest-day';
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
  dateHeader.className = `quest-day-header ${dateClass}`;
  dateHeader.innerHTML = `<h3 class="quest-day-title">${dateText}</h3>`;
  container.appendChild(dateHeader);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'quest-list';
  
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
  container.className = 'quest-day subject-group';
  container.dataset.subject = subject;
  
  // Create subject header with next class information
  const subjectHeader = document.createElement('div');
  subjectHeader.className = 'quest-day-header';
  
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
    <h3 class="quest-day-title">${subject}</h3>
    <div class="next-class-info">Next: ${nextClassText}</div>
  `;
  container.appendChild(subjectHeader);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'quest-list';
  
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
  const taskList = listElement.querySelector('.quest-list');
  if (!taskList) return;
  
  taskList.innerHTML = '';
  
  // Add updated tasks
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
