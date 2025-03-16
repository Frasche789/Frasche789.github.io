/**
 * TodayTasks.js - Today's Tasks Component
 * Manages the fixed header "What's up today" section
 */

import { createTaskCard } from './TaskCard.js';
import { dispatch } from '../state/appState.js';
import { getTodayFinDate } from '../utils/dateUtils.js';

// DOM elements cache
let todayTasksEl = null;
let todayEmptyStateEl = null;

/**
 * Initialize the Today Tasks component
 * @param {Object} elements - DOM elements object
 */
export function initTodayTasks(elements) {
  todayTasksEl = elements.todayTasks;
  todayEmptyStateEl = elements.todayEmptyState;
  
  if (!todayTasksEl || !todayEmptyStateEl) {
    console.error('Today tasks elements not found');
    return;
  }
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
  
  // Get today's date if not provided
  if (!todayFormatted) {
    todayFormatted = getTodayFinDate();
  }
  
  // Clear previous content
  todayTasksEl.innerHTML = '';
  
  // Find today's incomplete tasks
  const todayTasks = tasks.filter(task => 
    task.dueDate === todayFormatted && !task.completed
  );
  
  // Handle empty state
  if (todayTasks.length === 0) {
    todayEmptyStateEl.style.display = 'flex';
    return;
  }
  
  // Hide empty state
  todayEmptyStateEl.style.display = 'none';
  
  // Render today's tasks
  todayTasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      // Handle task completion
      onTodayTaskCompleted(taskId);
      
      // Also dispatch a global event
      dispatch('today-task-completed', { taskId, task });
    });
    
    // Add a special class for today's task cards
    taskCard.classList.add('today-task-card');
    
    todayTasksEl.appendChild(taskCard);
  });
}

/**
 * Handle completion of a task in the today section
 * @param {string} taskId - ID of the completed task
 */
function onTodayTaskCompleted(taskId) {
  if (!todayTasksEl || !todayEmptyStateEl) return;
  
  // Remove the task card
  const taskCard = todayTasksEl.querySelector(`.task-card[data-id="${taskId}"]`);
  if (taskCard) {
    taskCard.remove();
  }
  
  // Check if there are any tasks left
  if (todayTasksEl.children.length === 0) {
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
export function handleTaskUpdate(detail) {
  // Get the updated task or task ID
  const { taskId, task } = detail;
  
  if (!taskId) return;
  
  // Check if this task is in the today section
  const taskCard = todayTasksEl.querySelector(`.task-card[data-id="${taskId}"]`);
  
  if (taskCard) {
    // If the task was completed, remove it
    if (task && task.completed) {
      onTodayTaskCompleted(taskId);
    }
  }
}

/**
 * Add event listeners for task updates
 */
export function addTodayTasksEventListeners() {
  // Listen for task completed events
  document.addEventListener('task-completed', (event) => {
    if (event.detail) {
      handleTaskUpdate(event.detail);
    }
  });
}
