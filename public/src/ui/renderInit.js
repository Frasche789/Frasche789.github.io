/**
 * renderInit.js - Task rendering module with bootstrap integration
 * Handles rendering tasks after data dependencies are available
 */

import { registerInitStep } from '../bootstrap.js';
import { UI_COMPONENTS_INIT_ID } from './uiInit.js';
import { TASK_INIT_ID } from '../services/taskInit.js';
import { getState, setState, dispatch } from '../state/appState.js';
import { getTodayFinDate } from '../utils/dateUtils.js';
import { calculateNextClassDay } from '../utils/subjectUtils.js';
import { renderTodayTasks } from '../components/TodayTasks.js';
import { createDateTaskList, createSubjectTaskList, createEmptyState } from '../components/TaskList.js';
import { createImmediateTasksContainer, createLaterTasksContainer } from '../components/UrgencyTaskList.js';
import { groupTasksByUrgency } from '../services/taskService.js';

// Registration constants
export const RENDER_INIT_ID = 'render';

// DOM elements (will be populated during initialization)
const elements = {
  todayTasks: null,
  todayEmptyState: null,
  taskContainer: null,
  noTasksMessage: null,
  archiveIndicator: null
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
    elements.archiveIndicator = document.querySelector('.archive-indicator');
    
    // Add event listener for UI render-tasks events
    window.addEventListener('ui:render-tasks', () => {
      renderTasks();
    });
    
    // Listen for tasks-loaded event from the task service
    window.addEventListener('tasks-loaded', () => {
      console.log('Tasks loaded, triggering render');
      renderTasks();
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
 * Render tasks based on current filter
 */
function renderTasks() {
  try {
    const state = getState();
    
    // Handle possible null state (additional safety)
    if (!state) {
      console.error('Application state is not available');
      return;
    }
    
    const { tasks = [], activeFilter = 'all', showRecentOnly = false, showArchive = false } = state;
    
    if (!tasks || !Array.isArray(tasks)) {
      console.error('No tasks available for rendering');
      return;
    }
    
    // Get today's date for comparisons
    const todayFormatted = getTodayFinDate();
    
    // Only try to render today's tasks if we have data and elements are initialized
    if (elements.todayTasks && elements.todayEmptyState) {
      renderTodayTasks(tasks, todayFormatted);
    }
    
    // Get filtered tasks
    const filteredTasks = getFilteredTasks(tasks, { 
      filter: activeFilter, 
      showRecentOnly, 
      showArchive 
    });
    
    // Check if we have tasks after filtering
    if (filteredTasks.length === 0) {
      showNoTasksMessage(true);
      return;
    }
    
    // Hide no tasks message
    showNoTasksMessage(false);
    
    // Choose rendering method based on active filter
    if (activeFilter === 'subject') {
      const subjectGroups = groupTasksByNextClass(filteredTasks);
      renderTasksByNextClassGroups(subjectGroups, todayFormatted);
    } else if (activeFilter === 'urgency') {
      const urgencyGroups = groupTasksByUrgency(filteredTasks);
      renderTasksByUrgencyGroups(urgencyGroups);
    } else {
      const dateGroups = groupTasksByDueDate(filteredTasks);
      renderTasksByDateGroups(dateGroups, todayFormatted);
    }
    
    // Show archive indicator if needed
    const archiveCount = tasks.filter(task => task.archived).length;
    renderArchiveIndicator(archiveCount);
    
  } catch (error) {
    console.error('Error rendering tasks:', error);
  }
}

/**
 * Show or hide the no tasks message
 * @param {boolean} show - Whether to show the message
 */
function showNoTasksMessage(show) {
  if (!elements.taskContainer || !elements.noTasksMessage) return;
  
  elements.taskContainer.innerHTML = '';
  elements.noTasksMessage.style.display = show ? 'block' : 'none';
}

/**
 * Get filtered tasks based on filter options
 * @param {Array} tasks - All tasks
 * @param {Object} options - Filter options
 * @param {string} options.filter - The active filter ('all', 'subject', etc.)
 * @param {boolean} options.showRecentOnly - Whether to show only recent tasks
 * @param {boolean} options.showArchive - Whether to show archived tasks
 * @returns {Array} Filtered tasks
 */
function getFilteredTasks(tasks, options) {
  const { filter, showRecentOnly, showArchive } = options;
  
  return tasks.filter(task => {
    // Filter out archived tasks unless showArchive is true
    if (task.archived && !showArchive) {
      return false;
    }
    
    // Filter out completed tasks by default
    if (task.completed && !showArchive) {
      return false;
    }
    
    // If showing recent only, filter out tasks with a due date more than 7 days away
    if (showRecentOnly) {
      const today = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      
      if (dueDate) {
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 7) {
          return false;
        }
      }
    }
    
    return true;
  });
}

/**
 * Group tasks by due date
 * @param {Array} tasks - Tasks to group
 * @returns {Object} Tasks grouped by due date
 */
function groupTasksByDueDate(tasks) {
  const groups = {};
  
  // Group tasks by due date
  tasks.forEach(task => {
    const dueDate = task.dueDate || 'No Due Date';
    
    if (!groups[dueDate]) {
      groups[dueDate] = [];
    }
    
    groups[dueDate].push(task);
  });
  
  return groups;
}

/**
 * Group tasks by their next class day
 * @param {Array} tasks - Tasks to group
 * @returns {Object} Tasks grouped by subject
 */
function groupTasksByNextClass(tasks) {
  const groups = {};
  
  // Group tasks by subject
  tasks.forEach(task => {
    if (!task.subject) {
      // Skip tasks without a subject
      if (!groups['Other']) {
        groups['Other'] = [];
      }
      groups['Other'].push(task);
      return;
    }
    
    const subject = task.subject;
    
    if (!groups[subject]) {
      groups[subject] = [];
    }
    
    groups[subject].push(task);
  });
  
  return groups;
}

/**
 * Render tasks grouped by date
 * @param {Object} dateGroups - Tasks grouped by date
 * @param {string} todayFormatted - Today's date for comparison
 */
function renderTasksByDateGroups(dateGroups, todayFormatted) {
  if (!elements.taskContainer) return;
  
  // Clear container
  elements.taskContainer.innerHTML = '';
  
  // Sort dates for display
  const sortedDates = Object.keys(dateGroups).sort((a, b) => {
    if (a === 'No Due Date') return 1;
    if (b === 'No Due Date') return -1;
    return new Date(a) - new Date(b);
  });
  
  // Add each date group
  sortedDates.forEach(date => {
    const tasks = dateGroups[date];
    
    // Create date header with appropriate styling
    let headerClass = '';
    let dateDisplay = date;
    
    if (date === todayFormatted) {
      headerClass = 'today';
      dateDisplay = 'Today';
    } else if (date === 'No Due Date') {
      headerClass = 'no-date';
    }
    
    // Create and append the task list for this date
    elements.taskContainer.appendChild(
      createDateTaskList(dateDisplay, tasks, headerClass)
    );
  });
  
  // If no date groups, show empty state
  if (sortedDates.length === 0) {
    elements.taskContainer.appendChild(createEmptyState());
  }
}

/**
 * Render tasks grouped by their next class day
 * @param {Object} subjectGroups - Tasks grouped by subject
 * @param {string} todayFormatted - Today's date for comparison
 */
function renderTasksByNextClassGroups(subjectGroups, todayFormatted) {
  if (!elements.taskContainer) return;
  
  // Clear container
  elements.taskContainer.innerHTML = '';
  
  // Sort subjects by their next class day
  const sortedSubjects = Object.keys(subjectGroups).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    
    const nextA = calculateNextClassDay(a);
    const nextB = calculateNextClassDay(b);
    
    return nextA - nextB;
  });
  
  // Add each subject group
  sortedSubjects.forEach(subject => {
    const tasks = subjectGroups[subject];
    
    // Calculate when the next class is
    let nextClassText = '';
    let headerClass = '';
    
    if (subject !== 'Other') {
      const nextClassDate = calculateNextClassDay(subject);
      const today = new Date();
      
      const diffTime = nextClassDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        nextClassText = 'Today';
        headerClass = 'today';
      } else if (diffDays === 1) {
        nextClassText = 'Tomorrow';
        headerClass = 'tomorrow';
      } else if (diffDays > 1) {
        const options = { weekday: 'long' };
        nextClassText = nextClassDate.toLocaleDateString('en-US', options);
      }
    }
    
    // Create and append the task list for this subject
    elements.taskContainer.appendChild(
      createSubjectTaskList(subject, tasks, nextClassText, headerClass)
    );
  });
  
  // If no subject groups, show empty state
  if (sortedSubjects.length === 0) {
    elements.taskContainer.appendChild(createEmptyState());
  }
}

/**
 * Render tasks grouped by urgency
 * @param {Object} urgencyGroups - Tasks grouped by urgency
 */
function renderTasksByUrgencyGroups(urgencyGroups) {
  if (!elements.taskContainer) return;
  
  // Clear container
  elements.taskContainer.innerHTML = '';
  
  // Handle empty state
  if (!urgencyGroups.immediate && !urgencyGroups.later) {
    elements.taskContainer.appendChild(createEmptyState());
    return;
  }
  
  // Create immediate tasks container (today and tomorrow)
  const immediateContainer = createImmediateTasksContainer(
    urgencyGroups.immediate, 
    (taskId) => {
      // Task completed callback
      console.log(`Task ${taskId} completed`);
      dispatch('task-completed', { taskId });
    }
  );
  elements.taskContainer.appendChild(immediateContainer);
  
  // Create later tasks container
  const laterContainer = createLaterTasksContainer(
    urgencyGroups.later,
    (taskId) => {
      // Task completed callback
      console.log(`Task ${taskId} completed`);
      dispatch('task-completed', { taskId });
    }
  );
  elements.taskContainer.appendChild(laterContainer);
}

/**
 * Render archive indicator
 * @param {number} archiveCount - Number of archived tasks
 */
function renderArchiveIndicator(archiveCount) {
  if (!elements.archiveIndicator) return;
  
  const { showArchive } = getState();
  
  if (archiveCount > 0 && !showArchive) {
    elements.archiveIndicator.textContent = `${archiveCount} tasks in archive`;
    elements.archiveIndicator.style.display = 'block';
  } else {
    elements.archiveIndicator.style.display = 'none';
  }
}

// Register renderer initialization with bootstrap
registerInitStep({
  id: RENDER_INIT_ID,
  name: 'Task Renderer Initialization',
  initFn: initializeRenderer,
  dependencies: [UI_COMPONENTS_INIT_ID, TASK_INIT_ID], // Depends on UI components and task data
  required: true,
  critical: false // Not critical as the app can show an error state without the renderer
});
