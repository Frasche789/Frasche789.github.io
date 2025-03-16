/**
 * uiInit.js - UI component initialization with bootstrap integration
 * Handles initializing UI components after data dependencies are available
 */

import { registerInitStep } from '../bootstrap.js';
import { TASK_INIT_ID, STUDENT_INIT_ID } from '../services/taskInit.js';
import { initAnimationStyles } from '../utils/animationUtils.js';
import { initTodayTasks } from '../components/TodayTasks.js';
import { initChoreModal } from '../components/ChoreModal.js';
import { getState, setState, subscribe } from '../state/appState.js';

// Registration constants
export const UI_INIT_ID = 'ui';
export const UI_COMPONENTS_INIT_ID = 'ui-components';
export const UI_EVENTS_INIT_ID = 'ui-events';

// DOM elements
const elements = {
  todayQuests: null,
  todayEmptyState: null,
  questContainer: null,
  noQuestsMessage: null,
  studentNameEl: null,
  studentPointsEl: null,
  loadingIndicator: null,
  filterButtons: null,
  recentFilterText: null,
  addChoreBtn: null,
  choreModal: null,
  closeModalBtn: null,
  addChoreSubmitBtn: null,
  choreDescriptionInput: null,
  chorePointsInput: null,
  archiveIndicator: null,
  archiveToggle: null
};

/**
 * Initialize DOM element references
 * @returns {Object} Object containing DOM element references
 */
function initDomElements() {
  console.log('Initializing DOM element references...');
  
  elements.todayQuests = document.getElementById('today-quests');
  elements.todayEmptyState = document.getElementById('today-empty-state');
  elements.questContainer = document.getElementById('quest-container');
  elements.noQuestsMessage = document.getElementById('no-quests');
  elements.studentNameEl = document.getElementById('studentName');
  elements.studentPointsEl = document.getElementById('studentPoints');
  elements.loadingIndicator = document.getElementById('loading-indicator');
  elements.filterButtons = document.querySelectorAll('.filter-btn');
  elements.recentFilterText = document.getElementById('recentText');
  elements.addChoreBtn = document.getElementById('addChoreBtn');
  elements.choreModal = document.getElementById('choreModal');
  elements.closeModalBtn = document.getElementById('closeModal');
  elements.addChoreSubmitBtn = document.getElementById('addChoreSubmit');
  elements.choreDescriptionInput = document.getElementById('choreDescription');
  elements.chorePointsInput = document.getElementById('chorePoints');
  
  // Validate required elements
  const missingElements = [];
  
  ['todayQuests', 'questContainer', 'loadingIndicator'].forEach(key => {
    if (!elements[key]) {
      missingElements.push(key);
    }
  });
  
  if (missingElements.length > 0) {
    console.warn(`Missing required DOM elements: ${missingElements.join(', ')}`);
  }
  
  return elements;
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
    if (elements.todayQuests) {
      initTodayTasks(elements);
    }
    
    // Initialize Chore Modal component
    if (elements.choreModal) {
      initChoreModal(elements);
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
  if (!elements.questContainer) return;
  
  // Create archive indicator
  const indicator = document.createElement('div');
  indicator.className = 'archive-indicator';
  indicator.style.display = 'none';
  elements.questContainer.parentNode.insertBefore(indicator, elements.questContainer.nextSibling);
  elements.archiveIndicator = indicator;
  
  // Create archive toggle
  const toggle = document.createElement('button');
  toggle.className = 'archive-toggle';
  toggle.innerHTML = `
    <i class="ri-archive-line"></i>
    <span>Show Archive</span>
  `;
  elements.questContainer.parentNode.insertBefore(toggle, elements.questContainer.nextSibling);
  elements.archiveToggle = toggle;
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
