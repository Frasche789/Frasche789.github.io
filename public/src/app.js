/**
 * app.js - Quest Board ADHD-Optimized UI (Modular Version)
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
  dispatch,
  loadStateFromStorage,
  saveStateToStorage
} from './state/appState.js';

// Import services
import { waitForFirebase } from './services/firebaseService.js';
import { 
  loadTasks, 
  loadStudents, 
  getFilteredTasks,
  groupTasksByDueDate,
  groupTasksByNextClass
} from './services/taskService.js';

// Import components
import { initTodayTasks, renderTodayTasks } from './components/TodayTasks.js';
import { initStreakTracker, updateStreak, loadStreakData } from './components/StreakTracker.js';
import { initChoreModal } from './components/ChoreModal.js';
import { createDateTaskList, createSubjectTaskList, createEmptyState } from './components/TaskList.js';

// DOM elements
const elements = {
  todayQuests: document.getElementById('today-quests'),
  todayEmptyState: document.getElementById('today-empty-state'),
  questContainer: document.getElementById('quest-container'),
  noQuestsMessage: document.getElementById('no-quests'),
  studentNameEl: document.getElementById('studentName'),
  studentPointsEl: document.getElementById('studentPoints'),
  loadingIndicator: document.getElementById('loading-indicator'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  recentFilterText: document.getElementById('recentText'),
  streakCount: document.getElementById('streakCount'),
  streakBar: document.getElementById('streakBar'),
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
async function initializeApp() {
  // Initialize animation styles
  initAnimationStyles();
  
  // Restore scroll position if available
  try {
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition !== null) {
      // Use setTimeout to ensure DOM is fully loaded before scrolling
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }, 100);
    }
  } catch (error) {
    console.error('Error accessing localStorage:', error);
  }
  
  try {
    // Try to load saved streak data early
    loadStreakData();
  } catch (error) {
    console.error('Error in initial streak setup:', error);
  }
  
  // Show loading indicator
  showLoading(true);
  
  try {
    // Wait for Firebase to be initialized
    await waitForFirebase();
    
    // Load data
    await Promise.all([
      loadTasks(),
      loadStudents()
    ]);
    
    // Initialize components
    initializeComponents();
    
    // Render tasks
    renderTasks();
    
    // Update streak information
    updateStreak();
    
    // Add event listeners
    initializeEventListeners();
    
  } catch (error) {
    console.error('Error initializing app:', error);
    alert('Could not connect to the database. Please check your internet connection and try again.');
  } finally {
    // Hide loading indicator
    showLoading(false);
  }
  
  // Save scroll position when user leaves the page
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem('scrollPosition', window.scrollY);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  });
}

/**
 * Initialize components
 */
function initializeComponents() {
  // Initialize Today Tasks component
  initTodayTasks(elements);
  
  // Initialize Streak Tracker component
  initStreakTracker(elements);
  
  // Initialize Chore Modal component
  initChoreModal(elements);
  
  // Create archive controls
  createArchiveControls();
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Filter buttons
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
      
      // Render tasks with new filter
      renderTasks();
    });
  });
  
  // Recent filter
  elements.recentFilterText?.addEventListener('click', toggleRecentFilter);
  
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
      renderTasks();
    }
    
    // Update student info if it changed
    if (info.changedPaths.includes('students')) {
      updateStudentInfo();
    }
  });
  
  // Listen for task-completed events
  document.addEventListener('task-completed', () => {
    // Update streak when a task is completed
    updateStreak();
  });
}

/**
 * Create archive controls (indicator and toggle)
 */
function createArchiveControls() {
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
 * Toggle between current and archive views
 */
function toggleArchiveView() {
  if (!elements.archiveToggle) return;
  
  // Get current state
  const { showArchive } = getState();
  
  // Toggle archive view
  setState({ showArchive: !showArchive }, 'toggleArchiveView');
  
  // Update button text
  const toggleText = elements.archiveToggle.querySelector('span');
  if (toggleText) {
    toggleText.textContent = !showArchive ? 'Show Current' : 'Show Archive';
  }
  
  // Update button icon
  const toggleIcon = elements.archiveToggle.querySelector('i');
  if (toggleIcon) {
    toggleIcon.className = !showArchive ? 'ri-archive-fill' : 'ri-archive-line';
  }
  
  // Add/remove active class
  elements.archiveToggle.classList.toggle('active', !showArchive);
  
  // Render tasks with new filter
  renderTasks();
}

/**
 * Render archive indicator
 * @param {number} archiveCount - Number of archived tasks
 */
function renderArchiveIndicator(archiveCount) {
  if (!elements.archiveIndicator) return;
  
  if (archiveCount > 0) {
    elements.archiveIndicator.style.display = 'block';
    elements.archiveIndicator.innerHTML = `
      <i class="ri-archive-line"></i>
      ${archiveCount} task${archiveCount === 1 ? '' : 's'} in archive
    `;
  } else {
    elements.archiveIndicator.style.display = 'none';
  }
}

/**
 * Render tasks based on current filter
 */
function renderTasks() {
  if (!elements.questContainer) return;
  
  // Get today's date for comparison
  const todayFormatted = getTodayFinDate();
  
  // Get current state
  const { activeFilter, showRecentOnly, showArchive } = getState();
  
  // Get filtered tasks
  const { tasks, archiveCount } = getFilteredTasks({
    filter: activeFilter,
    showRecentOnly,
    showArchive
  });
  
  // Clear container
  elements.questContainer.innerHTML = '';
  
  // Update archive indicator
  renderArchiveIndicator(archiveCount);
  
  // Handle empty state
  if (tasks.length === 0) {
    elements.noQuestsMessage.style.display = 'flex';
    return;
  }
  
  // Hide empty state
  elements.noQuestsMessage.style.display = 'none';
  
  // Determine rendering method based on filter
  if (activeFilter === 'subjects') {
    // Group tasks by subject and render by next class day
    const subjectGroups = groupTasksByNextClass(tasks);
    renderTasksByNextClassGroups(subjectGroups, todayFormatted);
  } else {
    // Group tasks by due date and render chronologically
    const dateGroups = groupTasksByDueDate(tasks);
    renderTasksByDateGroups(dateGroups, todayFormatted);
  }
  
  // Also update today's tasks section
  renderTodayTasks(getState().tasks, todayFormatted);
}

/**
 * Render tasks grouped by date
 * @param {Object} dateGroups - Tasks grouped by date
 * @param {string} todayFormatted - Today's date for comparison
 */
function renderTasksByDateGroups(dateGroups, todayFormatted) {
  // Get dates sorted chronologically
  const dates = Object.keys(dateGroups).sort((a, b) => {
    // Compare dates (earliest first)
    const dateA = new Date(a.split('.').reverse().join('-'));
    const dateB = new Date(b.split('.').reverse().join('-'));
    return dateA - dateB;
  });
  
  // Render each date group
  dates.forEach(date => {
    const tasksForDate = dateGroups[date];
    
    // Create task list for this date
    const dateTaskList = createDateTaskList(
      date, 
      tasksForDate, 
      todayFormatted,
      (taskId) => {
        // Handle task completion
        console.log(`Task ${taskId} completed`);
        // No need to do anything else here as the state subscription will trigger re-render
      }
    );
    
    elements.questContainer.appendChild(dateTaskList);
  });
}

/**
 * Render tasks grouped by their next class day
 * @param {Object} subjectGroups - Tasks grouped by subject
 * @param {string} todayFormatted - Today's date for comparison
 */
function renderTasksByNextClassGroups(subjectGroups, todayFormatted) {
  // Get subjects
  const subjects = Object.keys(subjectGroups);
  
  // No subjects to display
  if (subjects.length === 0) {
    elements.questContainer.appendChild(
      createEmptyState('No subject tasks found')
    );
    return;
  }
  
  // Sort subjects by their next class day
  subjects.sort((subjectA, subjectB) => {
    const nextClassA = calculateNextClassDay(subjectA);
    const nextClassB = calculateNextClassDay(subjectB);
    
    // If both have next class info
    if (nextClassA.found && nextClassB.found) {
      return nextClassA.daysUntil - nextClassB.daysUntil;
    }
    
    // If only one has next class info
    if (nextClassA.found) return -1;
    if (nextClassB.found) return 1;
    
    // If neither has next class info, sort alphabetically
    return subjectA.localeCompare(subjectB);
  });
  
  // Render each subject group
  subjects.forEach(subject => {
    const tasksForSubject = subjectGroups[subject];
    const nextClassInfo = calculateNextClassDay(subject);
    
    // Create task list for this subject
    const subjectTaskList = createSubjectTaskList(
      subject,
      tasksForSubject,
      nextClassInfo,
      (taskId) => {
        // Handle task completion
        console.log(`Task ${taskId} completed`);
        // No need to do anything else here as the state subscription will trigger re-render
      }
    );
    
    elements.questContainer.appendChild(subjectTaskList);
  });
}

/**
 * Toggle recent filter
 */
function toggleRecentFilter() {
  // Toggle showRecentOnly state
  const { showRecentOnly } = getState();
  setState({ showRecentOnly: !showRecentOnly }, 'toggleRecentFilter');
  
  // Update indicator text
  if (elements.recentFilterText) {
    elements.recentFilterText.textContent = !showRecentOnly ? 'Show All' : 'Recent Only';
    
    // Update indicator icon
    const icon = elements.recentFilterText.previousElementSibling;
    if (icon && icon.classList.contains('ri-time-line')) {
      icon.className = !showRecentOnly ? 'ri-calendar-line' : 'ri-time-line';
    }
  }
}

/**
 * Update student information display
 */
function updateStudentInfo() {
  const { students } = getState();
  
  if (!students || students.length === 0) return;
  
  // For now, just use the first student
  const student = students[0];
  
  // Update student name
  if (elements.studentNameEl && student.name) {
    elements.studentNameEl.textContent = student.name;
  }
  
  // Update student points
  if (elements.studentPointsEl && student.points !== undefined) {
    elements.studentPointsEl.textContent = student.points;
  }
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions for potential external use
export {
  initializeApp,
  renderTasks,
  toggleRecentFilter,
  toggleArchiveView
};
