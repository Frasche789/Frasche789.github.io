/**
 * app.js - Task Board ADHD-Optimized UI (Modular Version)
 * Main entry point that orchestrates module initialization
 */

// App configuration
export const appConfig = {
  tasks: {
    // Number of days after which tasks are automatically archived
    archiveThresholdDays: 7,
    
    // Task categorization settings
    categorization: {
      // Include tasks due tomorrow in current category
      includeTomorrowInCurrent: true
    }
  },
  ui: {
    // Animation settings
    animations: {
      enabled: true,
      reducedMotion: false
    }
  }
};

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
import { categorizeTask, categorizeTaskByContainer } from './services/taskCategorization.js';

// Import components
import { initTodayTasks, createEmptyState } from './components/TaskList.js';
import { initTaskModal } from './components/TaskModal.js';
import { initArchiveTaskList } from './components/ArchiveTaskList.js';

// Import UI initialization
import { UI_INIT_ID } from './ui/uiInit.js';

// Import bootstrap functionality
import { bootstrap, registerInitStep, registerRenderComponent, renderComponent } from './bootstrap.js';

// DOM elements
const elements = {
  // Main content containers
  archiveContainer: document.getElementById('archiveContainer'),
  archiveTasks: document.getElementById('archiveTasks'), 
  currentTasks: document.getElementById('currentTasks'),
  futureTasks: document.getElementById('futureTasks'),
  tomorrowClasses: document.getElementById('tomorrowClasses'),
  
  // Empty state containers
  emptyArchive: document.getElementById('emptyArchive'),
  emptyCurrentTasks: document.getElementById('emptyCurrentTasks'),
  emptyFutureTasks: document.getElementById('emptyFutureTasks'),
  
  // User interface elements
  archiveToggle: document.getElementById('archiveToggle'),
  archiveCount: document.getElementById('archiveCount'),
  studentNameEl: document.getElementById('studentName'),
  currentDateEl: document.getElementById('currentDate')
};

// Define references to missing elements to avoid errors
elements.taskContainer = elements.currentTasks; // Use currentTasks as main task container
elements.todayTasks = elements.currentTasks; // Map todayTasks to currentTasks
elements.todayEmptyState = elements.emptyCurrentTasks; // Map todayEmptyState to emptyCurrentTasks
elements.loadingIndicator = document.createElement('div'); // Create a dummy loading indicator

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

// Register components initialization with bootstrap system
registerInitStep({
  id: 'component-dom-references',
  name: 'Component DOM References Initialization',
  run: async () => {
    console.log('Initializing component DOM references...');
    
    // Initialize today tasks component
    if (elements.todayTasks && elements.emptyCurrentTasks) {
      console.log('Initializing today tasks with elements:', {
        todayTasks: elements.todayTasks,
        todayEmptyState: elements.emptyCurrentTasks
      });
      
      initTodayTasks({
        todayTasks: elements.todayTasks,
        todayEmptyState: elements.emptyCurrentTasks
      });
    } else {
      console.error('Cannot initialize today tasks - missing required elements:', {
        todayTasks: !!elements.todayTasks,
        emptyCurrentTasks: !!elements.emptyCurrentTasks
      });
    }
    
    // Initialize archive task list component
    if (elements.archiveContainer && elements.archiveToggle) {
      initArchiveTaskList({
        archiveContainer: elements.archiveContainer,
        archiveToggle: elements.archiveToggle,
        archiveEmptyState: elements.emptyArchive // Can be provided later if needed
      });
    }
    
    // Initialize task modal
    if (elements.taskModal) {
      initTaskModal({
        modalElement: elements.taskModal
      });
    }
    
    return { initialized: true };
  },
  dependencies: [UI_INIT_ID], // Depend on UI initialization
  required: true
});

// Register event listeners initialization with bootstrap system
registerInitStep({
  id: 'app-event-listeners',
  name: 'Application Event Listeners',
  run: async () => {
    console.log('Setting up application event listeners...');
    
    // Listen for task updates
    document.addEventListener('tasks-loaded', handleTasksLoaded);
    document.addEventListener('task-completed', handleTaskCompleted);
    document.addEventListener('task-added', handleTaskAdded);
    document.addEventListener('task-deleted', handleTaskDeleted);
    
    // Listen for archive toggle
    document.addEventListener('archive-toggled', handleArchiveToggled);
    
    return { initialized: true };
  },
  dependencies: ['component-dom-references', UI_INIT_ID],
  required: true
});

// Register app state initialization with bootstrap system
registerInitStep({
  id: 'app-state-init',
  name: 'Application State Initialization',
  run: async () => {
    console.log('Initializing application state...');
    
    // Set default app state
    setState({
      tasks: [],
      showRecentOnly: false,
      showArchive: false,
    });
    
    return { initialized: true };
  },
  dependencies: [],
  required: true
});

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
      elements.currentTasks,
      elements.futureTasks
    ];
    
    const missingContainers = requiredContainers
      .filter(container => !container)
      .length;
      
    if (missingContainers > 0) {
      console.error(`${missingContainers} required container elements not found`);
      // Try to refresh DOM references
      elements.taskContainer = document.getElementById('task-container');
      elements.currentTasks = document.getElementById('currentTasks');
      elements.futureTasks = document.getElementById('futureTasks');
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
    const categorizedTasks = categorizeTaskByContainer(tasks);
    
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

/**
 * Main application initialization
 */
// Execute the bootstrap process when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing app...');
  
  try {
    // Start the bootstrap process
    await bootstrap();
    
    // Initialize Firebase
    await waitForFirebase();
    
    // Load tasks and students data
    await loadTasks();
    await loadStudents();
    
    // Set up date formatting
    if (elements.studentNameEl) {
      const today = new Date();
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      elements.studentNameEl.textContent = elements.studentNameEl.textContent || 'Task Board';
      
      if (document.getElementById('currentDate')) {
        document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', options);
      }
    }
    
    // Hide loading indicator
    showLoading(false);
    
    console.log('App initialization completed successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    showLoading(false);
    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'Failed to initialize the application. Please reload the page.';
    document.body.appendChild(errorMessage);
  }
});
