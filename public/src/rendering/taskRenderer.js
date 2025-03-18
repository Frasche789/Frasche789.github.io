/**
 * taskRenderer.js - Consolidated Task Rendering System
 * Handles all task rendering with a clean interface
 */

import { getElements } from '../utils/domUtils.js';
import { getState, subscribe, dispatch } from '../state/appState.js';
import { createTaskCard } from '../components/TaskCard.js';
import { categorizeTaskByContainer } from '../services/taskCategorization.js';
import { isToday, isTomorrow, getRelativeDateText, getTodayFinDate } from '../utils/dateUtils.js';

// Event names for rendering coordination
export const EVENTS = {
  RENDER_REQUESTED: 'render:requested',
  RENDER_COMPLETE: 'render:complete',
  TASK_ADDED: 'task:added',
  TASK_COMPLETED: 'task:completed',
  TASK_DELETED: 'task:deleted'
};

// Internal tracking of render subscriptions
const subscriptions = [];

/**
 * Initialize the rendering system
 * @returns {Function} Cleanup function to remove event listeners
 */
export function initializeRenderer() {
  console.log('Initializing task renderer system');
  const elements = getElements();
  
  // Subscribe to state changes that should trigger renders
  const stateSubscription = subscribe((state, oldState, info) => {
    if (info.changedPaths.includes('tasks') || 
        info.changedPaths.includes('showArchive') ||
        info.changedPaths.includes('activeFilter')) {
      renderAllTasks();
    }
  });
  
  subscriptions.push(stateSubscription);
  
  // Listen for task-completed events
  const taskCompletedSubscription = subscribe((payload) => {
    if (payload && payload.taskId) {
      // Allow animation to complete before re-rendering
      setTimeout(() => renderAllTasks(), 300);
    }
  }, { event: 'task-completed' });
  
  subscriptions.push(taskCompletedSubscription);
  
  // Add event listener for direct render requests
  const renderHandler = () => renderAllTasks();
  document.addEventListener(EVENTS.RENDER_REQUESTED, renderHandler);
  
  // Return cleanup function
  return () => {
    // Remove all subscriptions
    subscriptions.forEach(unsubscribe => unsubscribe());
    subscriptions.length = 0;
    // Remove event listeners
    document.removeEventListener(EVENTS.RENDER_REQUESTED, renderHandler);
  };
}

/**
 * Render all task sections
 */
export function renderAllTasks() {
  const state = getState();
  const elements = getElements();
  
  if (!state.tasks || !Array.isArray(state.tasks)) {
    console.warn('Tasks array not available in state, skipping render');
    return;
  }
  
  // Categorize tasks using business rules
  const categorizedTasks = categorizeTaskByContainer(state.tasks);
  
  console.log('Rendering tasks by container:', {
    current: categorizedTasks.current.length,
    future: categorizedTasks.future.length,
    archive: categorizedTasks.archive.length
  });
  
  // Update state with categorized tasks (for other components to use)
  // This is done through dispatch to avoid circular update loops
  dispatch('tasks-categorized', categorizedTasks);
  
  // Render each container section
  renderCurrentTasks(categorizedTasks.current);
  renderFutureTasks(categorizedTasks.future);
  renderArchiveTasks(categorizedTasks.archive, state.showArchive);
  
  // Notify that rendering is complete
  dispatch(EVENTS.RENDER_COMPLETE, { timestamp: Date.now() });
}

/**
 * Render current tasks
 * @param {Array} tasks - Current tasks to render
 */
function renderCurrentTasks(tasks) {
  const elements = getElements();
  const container = elements.currentTasks;
  const emptyState = elements.emptyCurrentTasks;
  
  if (!container) {
    console.error('Current tasks container not found');
    return;
  }
  
  // Clear container
  container.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    return;
  }
  
  // Hide empty state if we have tasks
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  // Create task list container
  const taskList = document.createElement('div');
  taskList.className = 'task-list current-tasks';
  
  // Add each task
  tasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  container.appendChild(taskList);
}

/**
 * Render future tasks
 * @param {Array} tasks - Future tasks to render
 */
function renderFutureTasks(tasks) {
  const elements = getElements();
  const container = elements.futureTasks;
  const emptyState = elements.emptyFutureTasks;
  
  if (!container) {
    console.error('Future tasks container not found');
    return;
  }
  
  // Clear container
  container.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    return;
  }
  
  // Hide empty state if we have tasks
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  // Create task list container
  const taskList = document.createElement('div');
  taskList.className = 'task-list future-tasks';
  
  // Add each task
  tasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  container.appendChild(taskList);
}

/**
 * Render archive tasks
 * @param {Array} tasks - Archive tasks to render
 * @param {boolean} visible - Whether archive section is visible
 */
function renderArchiveTasks(tasks, visible = false) {
  const elements = getElements();
  const container = elements.archiveContainer;
  const taskList = elements.archiveTasks;
  const emptyState = elements.emptyArchive;
  
  if (!container || !taskList) {
    console.error('Archive container or task list not found');
    return;
  }
  
  // Set visibility
  container.className = visible 
    ? 'card archive-container visible'
    : 'card archive-container hidden';
  
  // Clear current tasks
  taskList.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    return;
  }
  
  // Hide empty state if we have tasks
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  // Add each task
  tasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      dispatch('task-completed', { taskId, task });
    });
    taskCard.classList.add('archive-task');
    taskList.appendChild(taskCard);
  });
  
  // Update archive count if toggle button exists
  if (elements.archiveToggle) {
    const countElement = elements.archiveToggle.querySelector('#archiveCount');
    if (countElement) {
      countElement.textContent = tasks.length;
    }
  }
}

/**
 * Request a render of all tasks
 * This can be called from anywhere in the app
 */
export function requestRender() {
  document.dispatchEvent(new CustomEvent(EVENTS.RENDER_REQUESTED));
}