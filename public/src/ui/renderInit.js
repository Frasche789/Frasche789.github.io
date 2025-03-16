/**
 * renderInit.js - Task rendering module with bootstrap integration
 * Handles rendering tasks after data dependencies are available
 */

import { registerInitStep } from '../bootstrap.js';
import { UI_COMPONENTS_INIT_ID } from './uiInit.js';
import { TASK_INIT_ID } from '../services/taskInit.js';
import { getState, setState, dispatch } from '../state/appState.js';
import { getTodayFinDate } from '../utils/dateUtils.js';
import { renderTodayTasks } from '../components/TodayTasks.js';
import { createEmptyState } from '../components/TaskList.js';
import { createContainerTasksView } from '../components/UrgencyTaskList.js';
import { groupTasksByContainer } from '../services/taskService.js';
import { initArchiveModal } from '../components/ArchiveModal.js';

// Registration constants
export const RENDER_INIT_ID = 'render';

// DOM elements (will be populated during initialization)
const elements = {
  todayTasks: null,
  todayEmptyState: null,
  taskContainer: null,
  noTasksMessage: null
};

/**
 * Initialize the renderer
 * @returns {Promise<void>}
 */
async function initializeRenderer() {
  console.log('Initializing task renderer...');
  
  try {
    // Populate DOM elements from document
    elements.todayTasks = document.getElementById('today-tasks');
    elements.todayEmptyState = document.getElementById('today-empty-state');
    elements.taskContainer = document.getElementById('task-container');
    elements.noTasksMessage = document.getElementById('no-tasks');
    
    // Initialize the archive modal
    initArchiveModal();
    
    // Log element availability status
    console.log('Element initialization status:', {
      todayTasks: !!elements.todayTasks,
      todayEmptyState: !!elements.todayEmptyState,
      taskContainer: !!elements.taskContainer,
      noTasksMessage: !!elements.noTasksMessage
    });
    
    // Add event listener for bootstrap completion
    window.addEventListener('bootstrap:completed', (event) => {
      console.log('Bootstrap completed, triggering render', event);
      // Slight delay to ensure DOM and state are fully ready
      setTimeout(() => renderTasks(), 100);
    });
    
    // Add event listener for UI render-tasks events
    window.addEventListener('ui:render-tasks', () => {
      console.log('ui:render-tasks event received');
      renderTasks();
    });
    
    // Listen for tasks-loaded event from the task service
    window.addEventListener('tasks-loaded', (event) => {
      console.log('Tasks loaded, triggering render', event?.detail?.length || 0);
      renderTasks();
    });
    
    // Listen for task completion
    window.addEventListener('task-completed', (event) => {
      console.log('Task completed, triggering render', event?.detail);
      // Give time for the database to update
      setTimeout(() => renderTasks(), 300);
    });
    
    // Don't render immediately - wait for tasks to be loaded
    // Only verify that elements exist for now
    if (!elements.todayTasks || !elements.taskContainer) {
      console.warn('Required DOM elements not found for task rendering');
    }
    
    console.log('Task renderer initialized successfully');
    return true;
    
  } catch (error) {
    console.error('Error initializing task renderer:', error);
    throw new Error(`Failed to initialize task renderer: ${error.message}`);
  }
}

/**
 * Render tasks using the container-based approach
 */
function renderTasks() {
  try {
    console.log('Rendering tasks in renderInit.js');
    
    // Verify DOM elements are available
    if (!elements.taskContainer) {
      console.error('Task container element not found. DOM may not be ready.');
      elements.taskContainer = document.getElementById('task-container');
      
      // Still not found after retry
      if (!elements.taskContainer) {
        console.error('Task container still not found after retry. Aborting render.');
        return;
      }
    }
    
    // Get state
    const state = getState();
    if (!state || !state.tasks) {
      console.warn('No tasks available in state');
      showNoTasksMessage(true);
      return;
    }
    
    // Get tasks
    const { tasks } = state;
    
    // Get today's date for comparison
    const todayFormatted = getTodayFinDate();
    
    // Group tasks by container
    const containerGroups = groupTasksByContainer(tasks);
    
    console.log('Task container groups:', {
      current: containerGroups.current.length,
      future: containerGroups.future.length,
      archive: containerGroups.archive.length
    });
    
    // Clear container
    elements.taskContainer.innerHTML = '';
    
    // Handle empty state
    if (!containerGroups.current.length && !containerGroups.future.length) {
      showNoTasksMessage(true);
      return;
    }
    
    // Hide empty state message
    showNoTasksMessage(false);
    
    // Create the container-based view
    const containerView = createContainerTasksView(
      containerGroups,
      (taskId) => {
        // Task completed callback
        console.log(`Task ${taskId} completed in container view`);
        // This will trigger a state update and re-render
        dispatch('task-completed', { taskId });
      }
    );
    
    // Add the view to the DOM
    elements.taskContainer.appendChild(containerView);
    
    // Also update today's tasks section
    if (elements.todayTasks) {
      renderTodayTasks(tasks, todayFormatted);
    }
    
  } catch (error) {
    console.error('Error in renderTasks:', error);
    elements.taskContainer.innerHTML = '';
    elements.taskContainer.appendChild(createEmptyState('Error rendering tasks. Try refreshing.'));
  }
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
  name: 'Task Renderer Initialization',
  dependencies: [UI_COMPONENTS_INIT_ID, TASK_INIT_ID],
  run: initializeRenderer
});
