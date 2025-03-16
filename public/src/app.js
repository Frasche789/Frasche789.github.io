/**
 * app.js - Task Board ADHD-Optimized UI (Modular Version)
 * Main entry point that orchestrates module initialization
 */

// Import utilities
import { initAnimationStyles } from './utils/animationUtils.js';
import { getTodayFinDate } from './utils/dateUtils.js';
import { calculateNextClassDay } from './utils/subjectUtils.js';

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
  loadStudents, 
  getFilteredTasks,
  groupTasksByDueDate,
  groupTasksByNextClass,
  groupTasksByUrgency,
  groupTasksByContainer
} from './services/taskService.js';

// Import components
import { initTodayTasks, renderTodayTasks } from './components/TodayTasks.js';
import { initChoreModal } from './components/ChoreModal.js';
import { createDateTaskList, createSubjectTaskList, createEmptyState } from './components/TaskList.js';
import { 
  createImmediateTasksContainer, 
  createLaterTasksContainer,
  createContainerTasksView,
  updateContainerTasksView 
} from './components/UrgencyTaskList.js';

// DOM elements
const elements = {
  todayTasks: document.getElementById('today-tasks'),
  todayEmptyState: document.getElementById('today-empty-state'),
  taskContainer: document.getElementById('task-container'),
  noTasksMessage: document.getElementById('no-tasks'),
  studentNameEl: document.getElementById('studentName'),
  studentPointsEl: document.getElementById('studentPoints'),
  loadingIndicator: document.getElementById('loading-indicator'),
  addChoreBtn: document.getElementById('addChoreBtn'),
  choreModal: document.getElementById('choreModal'),
  closeModalBtn: document.getElementById('closeModal'),
  addChoreSubmitBtn: document.getElementById('addChoreSubmit'),
  choreDescriptionInput: document.getElementById('choreDescription'),
  chorePointsInput: document.getElementById('chorePoints'),
  archiveIndicator: null, // Will be created dynamically
  archiveToggle: null // Will be created dynamically
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
    console.log('Initializing app...');
    
    // Initialize archive modal
    import('./components/ArchiveModal.js').then(module => {
      const { initArchiveModal } = module;
      initArchiveModal();
    });
    
    // Set default app state
    setState({
      tasks: [],
      showRecentOnly: false,
      showArchive: false,
    });
    
    // Listen for task updates
    document.addEventListener('tasks-loaded', handleTasksLoaded);
    document.addEventListener('task-completed', handleTaskCompleted);
    document.addEventListener('task-added', handleTaskAdded);
    document.addEventListener('task-deleted', handleTaskDeleted);
    
    console.log('App initialization complete');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
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
  document.dispatchEvent(new CustomEvent('ui:render-tasks'));
}

/**
 * Render tasks based on container classification
 */
export async function renderTasks() {
  try {
    console.log('Rendering tasks in app.js');
    
    const taskContainer = document.getElementById('task-container');
    if (!taskContainer) {
      console.error('Task container not found');
      return;
    }
    
    // Get tasks from state
    const { tasks } = getState();
    
    if (!tasks || tasks.length === 0) {
      console.log('No tasks to render');
      
      // Show empty state
      taskContainer.innerHTML = '';
      taskContainer.appendChild(createEmptyState('No tasks found'));
      return;
    }
    
    // Get the current date for comparison
    const todayFormatted = getTodayFinDate();
    
    // Group tasks by container (Archive, Current, Future)
    const containerGroups = groupTasksByContainer(tasks);
    
    console.log('Task groups:', {
      current: containerGroups.current.length,
      future: containerGroups.future.length,
      archive: containerGroups.archive.length
    });
    
    // Render tasks by container
    renderTasksByContainerGroups(containerGroups);
    
    // Also update today's tasks
    renderTodayTasks(tasks, todayFormatted);
    
  } catch (error) {
    console.error('Error rendering tasks:', error);
  }
}

/**
 * Render tasks by container groups
 * @param {Object} containerGroups - Tasks grouped by container
 */
function renderTasksByContainerGroups(containerGroups) {
  const taskContainer = document.getElementById('task-container');
  if (!taskContainer) return;
  
  // Create container-based view
  const containerView = createContainerTasksView(
    containerGroups,
    (taskId) => {
      console.log(`Task ${taskId} completed`);
      // This will trigger state update and re-render
      document.dispatchEvent(new CustomEvent('task-completed', { 
        detail: { taskId } 
      }));
    }
  );
  
  // Clear container and add view
  taskContainer.innerHTML = '';
  taskContainer.appendChild(containerView);
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
