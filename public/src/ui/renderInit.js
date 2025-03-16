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
import { getState, setState, dispatch } from '../state/appState.js';
import { getTodayFinDate } from '../utils/dateUtils.js';
import { renderTodayTasks } from '../components/TodayTasks.js';
import { createEmptyState } from '../components/TaskList.js';
import { renderArchiveTasks } from '../components/ArchiveTaskList.js';
import { categorizeTasksByBusinessRules } from '../services/taskCategorization.js';

// Registration constants
export const RENDER_INIT_ID = 'render';

// DOM elements (will be populated during initialization)
const elements = {
  todayTasks: null,
  todayEmptyState: null,
  taskContainer: null,
  currentTasksContainer: null,
  futureTasksContainer: null,
  archiveContainer: null,
  archiveToggle: null,
  noTasksMessage: null
};

/**
 * Initialize the renderer
 * @returns {Promise<void>}
 */
async function initializeRenderer() {
  console.log('Initializing centralized task renderer...');
  
  try {
    // Populate DOM elements from document
    elements.todayTasks = document.getElementById('today-tasks');
    elements.todayEmptyState = document.getElementById('today-empty-state');
    elements.taskContainer = document.getElementById('task-container');
    elements.currentTasksContainer = document.getElementById('current-tasks-container');
    elements.futureTasksContainer = document.getElementById('future-tasks-container');
    elements.archiveContainer = document.getElementById('archive-container');
    elements.archiveToggle = document.getElementById('archive-toggle');
    elements.noTasksMessage = document.getElementById('no-tasks');
    
    // Log element availability status
    console.log('Element initialization status:', {
      todayTasks: !!elements.todayTasks,
      todayEmptyState: !!elements.todayEmptyState,
      taskContainer: !!elements.taskContainer,
      currentTasksContainer: !!elements.currentTasksContainer,
      futureTasksContainer: !!elements.futureTasksContainer,
      archiveContainer: !!elements.archiveContainer,
      archiveToggle: !!elements.archiveToggle,
      noTasksMessage: !!elements.noTasksMessage
    });
    
    // Register components with explicit dependencies
    registerRenderComponents();
    
    // Set up event listeners for task updates
    setupEventListeners();
    
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
  
  // Add event listener for UI render-tasks events
  window.addEventListener('ui:render-tasks', () => {
    console.log('ui:render-tasks event received');
    renderAllComponents();
  });
  
  // Listen for tasks-loaded event from the task service
  window.addEventListener('tasks-loaded', (event) => {
    console.log('Tasks loaded, triggering render', event?.detail?.length || 0);
    renderAllComponents();
  });
  
  // Listen for task completion
  window.addEventListener('task-completed', (event) => {
    console.log('Task completed, triggering render', event?.detail);
    // Give time for the database to update
    setTimeout(() => renderAllComponents(), 300);
  });
  
  // Listen for archive toggle
  window.addEventListener('archive-toggled', (event) => {
    console.log('Archive toggled:', event?.detail);
    // Update state with archive visibility preference
    setState({ 
      showArchive: event?.detail?.visible 
    }, 'archiveToggled');
  });
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
    const categorizedTasks = categorizeTasksByBusinessRules(tasks);
    
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
      renderComponent('archiveTasks', { 
        tasks: categorizedTasks.archive,
        showArchive
      })
    ]);
    
  } catch (error) {
    console.error('Error in renderAllComponents:', error);
    if (elements.taskContainer) {
      elements.taskContainer.innerHTML = '';
      elements.taskContainer.appendChild(createEmptyState('Error rendering tasks. Try refreshing.'));
    }
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
  if (!elements.currentTasksContainer) {
    console.error('Current tasks container element not found');
    return;
  }
  
  const { tasks } = data;
  
  // Clear existing content
  elements.currentTasksContainer.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    elements.currentTasksContainer.appendChild(
      createEmptyState('No current tasks')
    );
    return;
  }
  
  // Create header
  const header = document.createElement('div');
  header.className = 'container-header';
  header.innerHTML = `
    <h2 class="container-title">Current Tasks</h2>
    <div class="container-description">Tasks with class today or tomorrow</div>
  `;
  elements.currentTasksContainer.appendChild(header);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list current-tasks';
  
  // Create task cards for each task
  tasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      // When completed, task will move to archive
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  elements.currentTasksContainer.appendChild(taskList);
}

/**
 * Render Future Tasks component
 * @param {Object} data - Component data
 * @returns {Promise<void>}
 */
async function renderFutureTasks(data) {
  if (!elements.futureTasksContainer) {
    console.error('Future tasks container element not found');
    return;
  }
  
  const { tasks } = data;
  
  // Clear existing content
  elements.futureTasksContainer.innerHTML = '';
  
  // Handle empty state
  if (!tasks || tasks.length === 0) {
    elements.futureTasksContainer.appendChild(
      createEmptyState('No future tasks')
    );
    return;
  }
  
  // Create header
  const header = document.createElement('div');
  header.className = 'container-header';
  header.innerHTML = `
    <h2 class="container-title">Future Tasks</h2>
    <div class="container-description">Tasks for later days</div>
  `;
  elements.futureTasksContainer.appendChild(header);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list future-tasks';
  
  // Create task cards for each task
  tasks.forEach(task => {
    const taskCard = createTaskCard(task, (taskId) => {
      // When completed, task will move to archive
      dispatch('task-completed', { taskId, task });
    });
    taskList.appendChild(taskCard);
  });
  
  elements.futureTasksContainer.appendChild(taskList);
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
 * Create a task card element
 * @param {Object} task - Task data
 * @param {Function} onComplete - Callback for task completion
 * @param {string} [container='standard'] - Container type for styling
 * @returns {HTMLElement} Task card element
 */
function createTaskCard(task, onComplete, container = 'standard') {
  // Import is not available here, so we'll implement a basic card creation
  // In a real implementation, this should use the imported createTaskCard function
  
  const card = document.createElement('div');
  card.className = `task-card ${container}`;
  card.dataset.id = task.id;
  
  // Add completion status class
  if (task.completed) {
    card.classList.add('completed');
  }
  
  // Create card content
  card.innerHTML = `
    <div class="task-card-content">
      <div class="task-info">
        <div class="task-description">${task.description}</div>
        ${task.subject ? `<div class="task-subject">${task.subject}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="task-complete-btn">
          <i class="ri-check-line"></i>
        </button>
      </div>
    </div>
  `;
  
  // Add completion handler
  const completeBtn = card.querySelector('.task-complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      if (onComplete && typeof onComplete === 'function') {
        onComplete(task.id);
      }
    });
  }
  
  return card;
}

/**
 * Show or hide the no tasks message
 * @param {boolean} show - Whether to show the message
 */
function showNoTasksMessage(show) {
  if (!elements.noTasksMessage) return;
  
  elements.noTasksMessage.classList.toggle('hidden', !show);
}

// Register renderer initialization with bootstrap
registerInitStep({
  id: RENDER_INIT_ID,
  name: 'Centralized Task Renderer Initialization',
  dependencies: [UI_COMPONENTS_INIT_ID, TASK_INIT_ID],
  run: initializeRenderer
});
