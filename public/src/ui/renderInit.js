/**
 * renderInit.js - Centralized Task Rendering Module
 * Consolidates rendering logic to a single architectural pattern (bootstrap-based)
 * with explicit ownership of DOM elements
 */

import { 
  registerInitStep, 
  registerRenderComponent, 
  renderComponent 
} from '../bootstrap.js';
import { UI_COMPONENTS_INIT_ID } from './uiInit.js';
import { TASK_INIT_ID } from '../services/taskInit.js';
import { getState, setState, subscribe, dispatch } from '../state/appState.js';
import { getTodayFinDate, formatFinDate } from '../utils/dateUtils.js';
import { renderTodayTasks, createEmptyState } from '../components/TaskList.js';
import { renderArchiveTasks } from '../components/ArchiveTaskList.js';
import { categorizeTaskByContainer } from '../services/taskCategorization.js';
import { createTaskCard } from '../components/TaskCard.js';
import { markTaskComplete } from '../services/taskService.js';

// Registration constants
export const RENDER_INIT_ID = 'render';

// DOM elements (will be populated during initialization)
const elements = {
  todayTasks: null,
  todayEmptyState: null,
  taskContainer: null,
  currentTasks: null,
  currentTasksContainer: null,
  futureTasks: null,
  futureTasksContainer: null,
  archiveContainer: null,
  archiveToggle: null,
  noTasksMessage: null,
  emptyCurrentTasks: null,
  emptyFutureTasks: null
};

// Store unsubscribe functions
const unsubscribeFunctions = [];

/**
 * Initialize the renderer
 * @returns {Promise<void>}
 */
async function initializeRenderer() {
  console.log('Initializing centralized task renderer...');
  
  try {
    // Populate DOM elements from document
    elements.todayTasks = document.getElementById('currentTasks'); // Map to existing element
    elements.todayEmptyState = document.getElementById('emptyCurrentTasks'); // Map to existing element
    elements.taskContainer = document.getElementById('task-container');
    elements.currentTasks = document.getElementById('currentTasks');
    elements.currentTasksContainer = document.getElementById('current-tasks-container');
    elements.futureTasks = document.getElementById('futureTasks');
    elements.futureTasksContainer = document.getElementById('future-tasks-container');
    elements.archiveContainer = document.getElementById('archiveContainer');
    elements.archiveToggle = document.getElementById('archiveToggle');
    elements.noTasksMessage = document.getElementById('no-tasks');
    elements.emptyCurrentTasks = document.getElementById('emptyCurrentTasks');
    elements.emptyFutureTasks = document.getElementById('emptyFutureTasks');
    
    // Log element availability status
    console.log('Element initialization status:', {
      todayTasks: !!elements.todayTasks,
      todayEmptyState: !!elements.todayEmptyState,
      taskContainer: !!elements.taskContainer,
      currentTasks: !!elements.currentTasks,
      currentTasksContainer: !!elements.currentTasksContainer,
      futureTasks: !!elements.futureTasks,
      futureTasksContainer: !!elements.futureTasksContainer,
      archiveContainer: !!elements.archiveContainer,
      archiveToggle: !!elements.archiveToggle,
      noTasksMessage: !!elements.noTasksMessage,
      emptyCurrentTasks: !!elements.emptyCurrentTasks,
      emptyFutureTasks: !!elements.emptyFutureTasks
    });
    
    // Register components with explicit dependencies
    registerRenderComponents();
    
    // Set up event listeners for task updates
    setupEventListeners();
    
    // Subscribe to state changes
    setupStateSubscriptions();
    
    console.log('Centralized task renderer initialized successfully');
    return true;
    
  } catch (error) {
    console.error('Error initializing centralized task renderer:', error);
    throw new Error(`Failed to initialize task renderer: ${error.message}`);
  }
}

/**
 * Register all rendering components with bootstrap system
 */
function registerRenderComponents() {
  // Register Today Tasks component
  registerRenderComponent({
    id: 'todayTasks',
    name: 'Today Tasks',
    render: renderTodayTasksComponent,
    dependencies: [],
    dataDependencies: ['tasks'],
    autoRender: true
  });
  
  // Register Current Tasks component
  registerRenderComponent({
    id: 'currentTasks',
    name: 'Current Tasks',
    render: renderCurrentTasks,
    dependencies: [],
    dataDependencies: ['tasks'],
    autoRender: true
  });
  
  // Register Future Tasks component
  registerRenderComponent({
    id: 'futureTasks',
    name: 'Future Tasks',
    render: renderFutureTasks,
    dependencies: [],
    dataDependencies: ['tasks'],
    autoRender: true
  });
  
  // Register Archive Tasks component
  registerRenderComponent({
    id: 'archiveTasks',
    name: 'Archive Tasks',
    render: renderArchiveTasksComponent,
    dependencies: [],
    dataDependencies: ['tasks'],
    autoRender: true
  });
}

/**
 * Set up event listeners for task updates
 */
function setupEventListeners() {
  // Add event listener for bootstrap completion
  window.addEventListener('bootstrap:completed', (event) => {
    console.log('Bootstrap completed, triggering render', event);
    // Slight delay to ensure DOM and state are fully ready
    setTimeout(() => renderAllComponents(), 100);
  });
  
  // Add event listener for 'ui:render-tasks' event
  document.addEventListener('ui:render-tasks', (event) => {
    console.log('ui:render-tasks event received, rendering components', event.detail);
    renderAllComponents();
  });
  
  // Add event listener for archive toggle
  if (elements.archiveToggle) {
    elements.archiveToggle.addEventListener('click', () => {
      const state = getState();
      const newShowArchive = !state.showArchive;
      
      // Update archive visibility in state
      setState({ showArchive: newShowArchive }, 'archiveToggled');
    });
  }
}

/**
 * Set up subscriptions to state changes
 */
function setupStateSubscriptions() {
  // Subscribe to task changes
  const taskSubscribe = subscribe((state, changes) => {
    console.log('Tasks changed in state, rendering components');
    renderAllComponents();
  }, { path: 'tasks' });
  
  unsubscribeFunctions.push(taskSubscribe);
  
  // Subscribe to archive visibility changes
  const archiveSubscribe = subscribe((state, changes) => {
    console.log('Archive visibility changed:', state.showArchive);
    renderAllComponents();
  }, { path: 'showArchive' });
  
  unsubscribeFunctions.push(archiveSubscribe);
  
  // Subscribe to task-completed events
  const completedSubscribe = subscribe((payload) => {
    console.log('Task completed, triggering render:', payload);
    // Give time for the database to update
    setTimeout(() => renderAllComponents(), 300);
  }, { event: 'task-completed' });
  
  unsubscribeFunctions.push(completedSubscribe);
}

/**
 * Cleanup on module destruction
 */
export function cleanupRenderer() {
  // Unsubscribe from all subscriptions
  unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  unsubscribeFunctions.length = 0;
}

/**
 * Render all task components
 */
async function renderAllComponents() {
  try {
    // Get state
    const state = getState();
    if (!state || !state.tasks) {
      console.warn('No tasks available in state');
      showNoTasksMessage(true);
      return;
    }
    
    // Get tasks and archive visibility preference
    const { tasks, showArchive = false } = state;
    
    // Apply strict business rules to categorize tasks
    const categorizedTasks = categorizeTaskByContainer(tasks);
    
    // Store categorized tasks in state
    setState({
      categorizedTasks: {
        current: categorizedTasks.current,
        future: categorizedTasks.future,
        archive: categorizedTasks.archive
      }
    }, 'tasksCategorized');
    
    console.log('Task categories:', {
      current: categorizedTasks.current.length,
      future: categorizedTasks.future.length,
      archive: categorizedTasks.archive.length
    });
    
    // Handle empty state
    if (!categorizedTasks.current.length && !categorizedTasks.future.length) {
      showNoTasksMessage(true);
    } else {
      showNoTasksMessage(false);
    }
    
    // Render all components with their appropriate data
    await Promise.all([
      renderComponent('todayTasks', { tasks }),
      renderComponent('currentTasks', { tasks: categorizedTasks.current }),
      renderComponent('futureTasks', { tasks: categorizedTasks.future }),
      renderComponent('archiveTasks', { tasks: categorizedTasks.archive, showArchive })
    ]);
    
  } catch (error) {
    console.error('Error rendering components:', error);
    // Show error notification
    setState({
      notification: {
        message: 'Failed to render task components. Please refresh the page.',
        type: 'error',
        timestamp: Date.now()
      }
    }, 'renderError');
  }
}

/**
 * Render the Today Tasks component
 * @param {Object} data - Component data
 * @returns {Promise<void>}
 */
async function renderTodayTasksComponent(data) {
  if (!elements.todayTasks) return;
  
  const { tasks } = data;
  const todayFormatted = getTodayFinDate();
  
  // Use existing renderTodayTasks function
  renderTodayTasks(tasks, todayFormatted);
}

/**
 * Render Current Tasks component
 * @param {Object} data - Component data
 * @returns {Promise<void>}
 */
async function renderCurrentTasks(data) {
  if (!elements.currentTasks) {
    console.error('Current tasks container element not found');
    return;
  }
  
  const { tasks } = data;
  
  // Clear existing content
  elements.currentTasks.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    if (elements.emptyCurrentTasks) {
      elements.emptyCurrentTasks.style.display = 'block';
    } else {
      elements.currentTasks.appendChild(
        createEmptyState('No current tasks')
      );
    }
    return;
  }
  
  // Hide empty state if we have tasks
  if (elements.emptyCurrentTasks) {
    elements.emptyCurrentTasks.style.display = 'none';
  }
  
  // Create header
  const header = document.createElement('div');
  header.className = 'container-header';
  header.innerHTML = `
    <h2 class="container-title">Current Tasks</h2>
    <div class="container-description">Tasks with class today or tomorrow</div>
  `;
  elements.currentTasks.appendChild(header);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list current-tasks';
  
  // Create task cards for each task
  tasks.forEach(task => {
    // Using createTaskCard from TaskCard.js, which now handles state updates
    const taskCard = createTaskCard(task, (taskId) => {
      // Using dispatch to emit an event that other components can listen to
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  elements.currentTasks.appendChild(taskList);
}

/**
 * Render Future Tasks component
 * @param {Object} data - Component data
 * @returns {Promise<void>}
 */
async function renderFutureTasks(data) {
  if (!elements.futureTasks) {
    console.error('Future tasks container element not found');
    return;
  }
  
  const { tasks } = data;
  
  // Clear existing content
  elements.futureTasks.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    if (elements.emptyFutureTasks) {
      elements.emptyFutureTasks.style.display = 'block';
    } else {
      elements.futureTasks.appendChild(
        createEmptyState('No future tasks')
      );
    }
    return;
  }
  
  // Hide empty state if we have tasks
  if (elements.emptyFutureTasks) {
    elements.emptyFutureTasks.style.display = 'none';
  }
  
  // Create header
  const header = document.createElement('div');
  header.className = 'container-header';
  header.innerHTML = `
    <h2 class="container-title">Future Tasks</h2>
    <div class="container-description">Tasks for later days</div>
  `;
  elements.futureTasks.appendChild(header);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list future-tasks';
  
  // Create task cards for each task
  tasks.forEach(task => {
    // Using createTaskCard from TaskCard.js, which now handles state updates
    const taskCard = createTaskCard(task, (taskId) => {
      // Using dispatch to emit an event that other components can listen to
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  elements.futureTasks.appendChild(taskList);
}

/**
 * Render Archive Tasks component
 * @param {Object} data - Component data
 * @returns {Promise<void>}
 */
async function renderArchiveTasksComponent(data) {
  if (!elements.archiveContainer) {
    console.error('Archive container element not found');
    return;
  }
  
  const { tasks, showArchive = false } = data;
  
  // Use ArchiveTaskList component to render archive
  renderArchiveTasks(tasks, showArchive);
}

/**
 * Render a list of tasks into a container
 * @param {HTMLElement} container - Container element to render tasks into
 * @param {HTMLElement} emptyState - Empty state element to show when no tasks
 * @param {Array} tasks - Array of tasks to render
 */
export function renderTaskList(container, emptyState, tasks) {
  if (!container) return;
  
  // Clear container first
  container.innerHTML = '';
  
  // Check if there are tasks to display
  if (!tasks || tasks.length === 0) {
    // Show empty state if available
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    return;
  }
  
  // Hide empty state if we have tasks
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  // Sort tasks by due date (if available)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.dueDate || a.date || '';
    const dateB = b.dueDate || b.date || '';
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    // Parse dates and compare
    const datePartsA = dateA.split('.');
    const datePartsB = dateB.split('.');
    
    // Convert to YYYY-MM-DD format for string comparison
    const compA = `${datePartsA[2]}-${datePartsA[1]}-${datePartsA[0]}`;
    const compB = `${datePartsB[2]}-${datePartsB[1]}-${datePartsB[0]}`;
    
    return compA.localeCompare(compB);
  });
  
  // Render each task
  sortedTasks.forEach(task => {
    // Create task card using the component
    const taskCard = createTaskCard(task, (taskId) => {
      // Handle task completion
      markTaskComplete(taskId);
    });
    
    // Add to container
    container.appendChild(taskCard);
  });
}

/**
 * Show or hide the no tasks message
 * @param {boolean} show - Whether to show the message
 */
function showNoTasksMessage(show) {
  if (!elements.noTasksMessage) return;
  
  elements.noTasksMessage.style.display = show ? 'block' : 'none';
}

// Register renderer initialization with bootstrap
registerInitStep({
  id: RENDER_INIT_ID,
  name: 'Centralized Task Renderer Initialization',
  run: initializeRenderer,
  dependencies: [UI_COMPONENTS_INIT_ID, TASK_INIT_ID],
  required: true
});
