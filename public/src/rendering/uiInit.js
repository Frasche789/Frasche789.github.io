/**
 * uiInit.js - UI component initialization with bootstrap integration
 * Handles initializing UI components after data dependencies are available
 */

import { registerInitStep } from '../core/appBootstrap.js';
import { TASK_INIT_ID, STUDENT_INIT_ID } from '../services/taskInit.js';
import { initAnimationStyles } from '../utils/animationUtils.js';
import { initTodayTasks } from '../components/TaskList.js';
import { initTaskModal } from '../components/TaskModal.js';
import { getState, setState, subscribe } from '../state/appState.js';

// Registration constants
export const UI_INIT_ID = 'ui';
export const UI_COMPONENTS_INIT_ID = 'ui-components';
export const UI_EVENTS_INIT_ID = 'ui-events';

// DOM elements
const elements = {
  currentTasks: null,
  futureTasks: null,
  archiveTasks: null,
  tomorrowClasses: null,
  emptyCurrentTasks: null,
  emptyFutureTasks: null,
  emptyArchive: null,
  archiveToggle: null,
  archiveContainer: null,
  studentNameEl: null,
  currentDateEl: null,
  taskContainer: null,
  todayTasks: null,
  noTasksMessage: null,
  studentPointsEl: null,
  loadingIndicator: null,
  filterButtons: null,
  recentFilterText: null,
  addTaskBtn: null,
  taskModal: null,
  closeModalBtn: null,
  addTaskSubmitBtn: null,
  taskDescriptionInput: null,
  taskPointsInput: null,
  archiveIndicator: null
};

/**
 * Initialize DOM element references - this provides a central place for DOM references
 * in case we need to rebuild them later, e.g. after template changes
 */
function initDomElements() {
  console.log('Initializing UI DOM element references...');
  try {
    // Task container elements
    elements.currentTasks = document.getElementById('currentTasks');
    elements.futureTasks = document.getElementById('futureTasks');
    elements.archiveTasks = document.getElementById('archiveTasks');
    elements.tomorrowClasses = document.getElementById('tomorrowClasses');
    
    // Empty state elements
    elements.emptyCurrentTasks = document.getElementById('emptyCurrentTasks');
    elements.emptyFutureTasks = document.getElementById('emptyFutureTasks');
    elements.emptyArchive = document.getElementById('emptyArchive');
    
    // UI control elements
    elements.archiveToggle = document.getElementById('archiveToggle');
    elements.archiveContainer = document.getElementById('archiveContainer');
    elements.studentNameEl = document.getElementById('studentName');
    elements.currentDateEl = document.getElementById('currentDate');
    
    // Map legacy element names to new ones to maintain compatibility
    elements.taskContainer = elements.currentTasks; // Main task container is now currentTasks
    elements.todayTasks = elements.currentTasks;

    console.log('DOM element references initialized:', {
      currentTasks: !!elements.currentTasks,
      futureTasks: !!elements.futureTasks,
      archiveTasks: !!elements.archiveTasks,
      emptyCurrentTasks: !!elements.emptyCurrentTasks,
      emptyFutureTasks: !!elements.emptyFutureTasks,
      emptyArchive: !!elements.emptyArchive,
      archiveToggle: !!elements.archiveToggle,
      archiveContainer: !!elements.archiveContainer
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing DOM elements:', error);
    return false;
  }
}

/**
 * Initialize UI components
 * @returns {Promise<void>}
 */
async function initializeUIComponents() {
  console.log('Initializing UI components...');
  
  try {
    // Initialize animation styles
    initAnimationStyles();
    
    // Initialize Today Tasks component
    if (elements.todayTasks) {
      initTodayTasks(elements);
    }
    
    // Initialize Task Modal component
    if (elements.taskModal) {
      initTaskModal(elements);
    }
    
    // Create archive controls
    createArchiveControls();
    
    console.log('UI components initialized successfully');
    return true;
    
  } catch (error) {
    console.error('Error initializing UI components:', error);
    throw new Error(`Failed to initialize UI components: ${error.message}`);
  }
}

/**
 * Initialize UI event listeners
 * @returns {Promise<void>}
 */
async function initializeUIEvents() {
  console.log('Initializing UI event listeners...');
  
  try {
    // Filter buttons
    if (elements.filterButtons) {
      elements.filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Remove active class from all buttons
          elements.filterButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Get filter type from data attribute
          const filter = button.dataset.filter;
          
          // Update state
          setState({ activeFilter: filter }, 'filterButtonClick');
        });
      });
    }
    
    // Recent filter
    if (elements.recentFilterText) {
      elements.recentFilterText.addEventListener('click', toggleRecentFilter);
    }
    
    // Create archive toggle event listener
    if (elements.archiveToggle) {
      elements.archiveToggle.addEventListener('click', toggleArchiveView);
    }
    
    // Subscribe to state changes
    subscribe((newState, oldState, info) => {
      // Re-render tasks if relevant state changed
      if (
        info.changedPaths.includes('tasks') ||
        info.changedPaths.includes('activeFilter') ||
        info.changedPaths.includes('showRecentOnly') ||
        info.changedPaths.includes('showArchive')
      ) {
        const event = new CustomEvent('ui:render-tasks');
        window.dispatchEvent(event);
      }
      
      // Update student info if students changed
      if (info.changedPaths.includes('students')) {
        updateStudentInfo();
      }
    });
    
    console.log('UI event listeners initialized successfully');
    return true;
    
  } catch (error) {
    console.error('Error initializing UI event listeners:', error);
    throw new Error(`Failed to initialize UI event listeners: ${error.message}`);
  }
}

/**
 * Toggle between showing recent items only and all items
 */
function toggleRecentFilter() {
  // Get current state
  const { showRecentOnly } = getState();
  
  // Toggle recent filter
  setState({ showRecentOnly: !showRecentOnly }, 'toggleRecentFilter');
  
  // Update text
  if (elements.recentFilterText) {
    elements.recentFilterText.textContent = !showRecentOnly ? 'Show All' : 'Recent Only';
  }
}

/**
 * Toggle between current and archive views
 */
function toggleArchiveView() {
  if (!elements.archiveToggle) return;
  
  // Get current state
  const { showArchive } = getState();
  
  // Toggle archive state
  setState({ showArchive: !showArchive }, 'toggleArchiveView');
  
  // Update button text and icon
  if (elements.archiveToggle) {
    const newText = !showArchive ? 'Hide Archive' : 'Show Archive';
    const newIcon = !showArchive ? 'ri-archive-fill' : 'ri-archive-line';
    
    elements.archiveToggle.innerHTML = `
      <i class="${newIcon}"></i>
      <span>${newText}</span>
    `;
  }
}

/**
 * Create archive controls (indicator and toggle)
 */
function createArchiveControls() {
  // Only create if we have the container
  if (!elements.taskContainer) return;
  
  // Create archive indicator
  const indicator = document.createElement('div');
  indicator.className = 'archive-indicator';
  indicator.style.display = 'none';
  elements.taskContainer.parentNode.insertBefore(indicator, elements.taskContainer.nextSibling);
  elements.archiveIndicator = indicator;
  
  // Check if an archive toggle button already exists
  if (!elements.archiveToggle) {
    console.log('No archive toggle found, creating one');
    // Create archive toggle
    const toggle = document.createElement('button');
    toggle.className = 'archive-toggle';
    toggle.innerHTML = `
      <i class="ri-archive-line"></i>
      <span>Show Archive</span>
    `;
    elements.taskContainer.parentNode.insertBefore(toggle, elements.taskContainer.nextSibling);
    elements.archiveToggle = toggle;
  } else {
    console.log('Archive toggle already exists, using existing one');
  }
}

/**
 * Update student information display
 */
function updateStudentInfo() {
  const { students } = getState();
  
  // Skip if no students or student display elements
  if (!students.length || !elements.studentNameEl || !elements.studentPointsEl) {
    return;
  }
  
  try {
    // Get first student (current implementation only supports one)
    const student = students[0];
    
    // Update student name and points
    elements.studentNameEl.textContent = student.name || 'Student';
    elements.studentPointsEl.textContent = student.points || 0;
    
  } catch (error) {
    console.error('Error updating student info:', error);
  }
}

// Register DOM elements initialization with bootstrap
registerInitStep({
  id: UI_INIT_ID,
  name: 'UI Elements Initialization',
  initFn: initDomElements,
  dependencies: [], // No dependencies for DOM initialization
  required: true,
  critical: true
});

// Register UI components initialization with bootstrap
registerInitStep({
  id: UI_COMPONENTS_INIT_ID,
  name: 'UI Components Initialization',
  initFn: initializeUIComponents,
  dependencies: [UI_INIT_ID, TASK_INIT_ID, STUDENT_INIT_ID], // Depends on DOM elements and data
  required: true,
  critical: true
});

// Register UI events initialization with bootstrap
registerInitStep({
  id: UI_EVENTS_INIT_ID,
  name: 'UI Event Listeners Initialization',
  initFn: initializeUIEvents,
  dependencies: [UI_COMPONENTS_INIT_ID], // Depends on UI components being initialized
  required: true,
  critical: false // Not critical as the app can function without some event listeners
});
