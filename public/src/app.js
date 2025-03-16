/**
 * app.js - Task Board ADHD-Optimized UI (Modular Version)
 * Main entry point that orchestrates module initialization
 */

// Import utilities
import { initAnimationStyles } from './utils/animationUtils.js';
import { getTodayFinDate } from './utils/dateUtils.js';
import { calculateNextClassDay, hasClassTodayOrTomorrow } from './utils/subjectUtils.js';

// Import state management
import { 
  getState, 
  setState, 
  subscribe, 
  dispatch
} from './state/appState.js';

// Import services
import { waitForFirebase } from './services/firebaseService.js';
import { 
  loadTasks, 
  loadStudents
} from './services/taskService.js';
import { categorizeTasksByBusinessRules } from './services/taskCategorization.js';

// Import components
import { initTodayTasks } from './components/TodayTasks.js';
import { initChoreModal } from './components/ChoreModal.js';
import { createEmptyState } from './components/TaskList.js';
import { initArchiveTaskList } from './components/ArchiveTaskList.js';

// Import bootstrap functionality
import { bootstrap, registerRenderComponent, renderComponent } from './bootstrap.js';

// DOM elements
const elements = {
  todayTasks: document.getElementById('today-tasks'),
  todayEmptyState: document.getElementById('today-empty-state'),
  taskContainer: document.getElementById('task-container'),
  currentTasksContainer: document.getElementById('current-tasks-container'),
  futureTasksContainer: document.getElementById('future-tasks-container'),
  archiveContainer: document.getElementById('archive-container'),
  archiveToggle: document.getElementById('archive-toggle'),
  noTasksMessage: document.getElementById('no-tasks'),
  studentNameEl: document.getElementById('studentName'),
  studentPointsEl: document.getElementById('studentPoints'),
  loadingIndicator: document.getElementById('loading-indicator'),
  addChoreBtn: document.getElementById('addChoreBtn'),
  choreModal: document.getElementById('choreModal'),
  closeModalBtn: document.getElementById('closeModal'),
  addChoreSubmitBtn: document.getElementById('addChoreSubmit'),
  choreDescriptionInput: document.getElementById('choreDescription'),
  chorePointsInput: document.getElementById('chorePoints')
};

/**
 * Toggle the loading indicator visibility
 * @param {boolean} show - Whether to show or hide the loading indicator
 */
function showLoading(show) {
  if (!elements.loadingIndicator) {
    console.warn('Loading indicator element not found');
    return;
  }
  
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * Initialize app
 */
export async function initApp() {
  try {
    console.log('Initializing app with consolidated rendering architecture...');
    
    // Initialize component DOM references
    initComponentDOMReferences();
    
    // Set default app state
    setState({
      tasks: [],
      showRecentOnly: false,
      showArchive: false,
    });
    
    // Initialize component event handlers
    setupEventListeners();
    
    // Start the bootstrap process for the application
    bootstrap().then(() => {
      console.log('Bootstrap process completed');
    }).catch(error => {
      console.error('Bootstrap process failed:', error);
    });
    
    console.log('App initialization complete');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

/**
 * Initialize component DOM references
 */
function initComponentDOMReferences() {
  // Initialize today tasks component
  if (elements.todayTasks && elements.todayEmptyState) {
    initTodayTasks({
      todayTasks: elements.todayTasks,
      todayEmptyState: elements.todayEmptyState
    });
  }
  
  // Initialize archive task list component
  if (elements.archiveContainer && elements.archiveToggle) {
    initArchiveTaskList({
      archiveContainer: elements.archiveContainer,
      archiveToggle: elements.archiveToggle,
      archiveEmptyState: null // Can be provided later if needed
    });
  }
  
  // Initialize chore modal
  initChoreModal();
}

/**
 * Set up event listeners for the application
 */
function setupEventListeners() {
  // Listen for task updates
  document.addEventListener('tasks-loaded', handleTasksLoaded);
  document.addEventListener('task-completed', handleTaskCompleted);
  document.addEventListener('task-added', handleTaskAdded);
  document.addEventListener('task-deleted', handleTaskDeleted);
  
  // Listen for archive toggle
  document.addEventListener('archive-toggled', handleArchiveToggled);
}

/**
 * Handle tasks loaded event
 * @param {CustomEvent} event - Tasks loaded event
 */
function handleTasksLoaded(event) {
  console.log('Tasks loaded:', event.detail);
  
  // Update state with loaded tasks
  setState({ tasks: event.detail || [] });
  
  // Re-render tasks
  dispatch('ui:render-tasks');
}

/**
 * Handle task completed event
 * @param {CustomEvent} event - Task completed event
 */
function handleTaskCompleted(event) {
  console.log('Task completed:', event.detail);
  
  // Trigger a re-render after a brief delay to allow state updates
  setTimeout(() => {
    dispatch('ui:render-tasks');
  }, 300);
}

/**
 * Handle task added event
 * @param {CustomEvent} event - Task added event
 */
function handleTaskAdded(event) {
  console.log('Task added:', event.detail);
  
  // Get the current tasks from state
  const { tasks } = getState();
  
  // Add the new task to the tasks array
  const updatedTasks = [...tasks, event.detail];
  
  // Update the state with the new tasks array
  setState({ tasks: updatedTasks });
  
  // Trigger a re-render
  dispatch('ui:render-tasks');
}

/**
 * Handle task deleted event
 * @param {CustomEvent} event - Task deleted event
 */
function handleTaskDeleted(event) {
  console.log('Task deleted:', event.detail);
  
  // Get the current tasks from state
  const { tasks } = getState();
  
  // Remove the deleted task from the tasks array
  const updatedTasks = tasks.filter(task => task.id !== event.detail.taskId);
  
  // Update the state with the new tasks array
  setState({ tasks: updatedTasks });
  
  // Trigger a re-render
  dispatch('ui:render-tasks');
}

/**
 * Handle archive toggled event
 * @param {CustomEvent} event - Archive toggled event
 */
function handleArchiveToggled(event) {
  console.log('Archive toggled:', event.detail);
  
  // Update state with archive visibility preference
  setState({ 
    showArchive: event.detail.visible 
  }, 'archiveToggled');
}

/**
 * Render tasks using the centralized categorization and rendering system
 */
export async function renderTasks() {
  try {
    console.log('Rendering tasks using consolidated architecture');
    
    // Verify container elements exist
    const requiredContainers = [
      elements.taskContainer,
      elements.currentTasksContainer,
      elements.futureTasksContainer
    ];
    
    const missingContainers = requiredContainers
      .filter(container => !container)
      .length;
      
    if (missingContainers > 0) {
      console.error(`${missingContainers} required container elements not found`);
      // Try to refresh DOM references
      elements.taskContainer = document.getElementById('task-container');
      elements.currentTasksContainer = document.getElementById('current-tasks-container');
      elements.futureTasksContainer = document.getElementById('future-tasks-container');
    }
    
    // Get tasks from state
    const { tasks, showArchive = false } = getState();
    
    if (!tasks || tasks.length === 0) {
      console.log('No tasks to render');
      
      // Show empty state if task container exists
      if (elements.taskContainer) {
        elements.taskContainer.innerHTML = '';
        elements.taskContainer.appendChild(createEmptyState('No tasks found'));
      }
      
      // Hide loading indicator
      showLoading(false);
      return;
    }
    
    // Apply strict business rules for task categorization
    const categorizedTasks = categorizeTasksByBusinessRules(tasks);
    
    console.log('Task categories:', {
      current: categorizedTasks.current.length,
      future: categorizedTasks.future.length,
      archive: categorizedTasks.archive.length
    });
    
    // Use the bootstrap rendering system to render tasks
    dispatch('ui:render-tasks', { categorizedTasks, showArchive });
    
    // Render archive tasks specifically
    import('./components/ArchiveTaskList.js').then(module => {
      if (typeof module.renderArchiveTasks === 'function') {
        module.renderArchiveTasks(categorizedTasks.archive, showArchive);
        
        // Update archive count in the toggle button
        if (elements.archiveToggle) {
          const archiveCountEl = elements.archiveToggle.querySelector('#archiveCount');
          if (archiveCountEl) {
            archiveCountEl.textContent = categorizedTasks.archive.length;
          }
        }
      }
    }).catch(error => {
      console.error('Failed to import ArchiveTaskList module:', error);
    });
    
    // Hide loading indicator
    showLoading(false);
    
  } catch (error) {
    console.error('Error rendering tasks:', error);
    showLoading(false);
  }
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
