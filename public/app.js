/**
 * app.js - Quest Board ADHD-Optimized UI
 * Handles task rendering, Firebase integration, and UI interactions
 */

// Import animations module
import { createConfetti, playCompletionAnimation } from './animations.js';

// App state
const appState = {
  students: [],
  tasks: [],
  activeFilter: 'all',
  filteredLists: {},
  showRecentOnly: false,
  lastScrollPosition: 0,
  showArchive: false, // New flag to toggle archive view
  streak: {
    count: 0,
    target: 7, // Target for a complete streak (e.g., 7 days)
    lastActive: null
  },
  // Schedule mapping: maps subjects to the days of the week they occur
  schedule: {
    main: {
      "Math": [1, 2, 3, 4], // Monday, Tuesday, Wednesday, Thursday (1-based index, 1=Monday)
      "Eco": [1, 4], // Monday, Thursday
      "Crafts": [1], // Monday
      "PE": [1, 2, 3], // Monday, Tuesday, Wednesday
      "Finnish": [2, 3, 4, 5], // Tuesday, Wednesday, Thursday, Friday
      "History": [2], // Tuesday
      "Music": [2], // Tuesday
      "English": [3, 4], // Wednesday, Thursday
      "Ethics": [3], // Wednesday
      "Art": [5], // Friday
      "Civics": [5], // Friday
      "Digi": [5]  // Friday
    },
    alternative: {} // Can be expanded for a second child's schedule
  }
};

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

// Helper function to get today's date in Finnish format
function getTodayFinDate() {
  const today = new Date();
  return `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
}

/**
 * Parse Finnish date format (DD.MM.YYYY) to a JavaScript Date object
 * @param {string} finDate - Date in Finnish format (DD.MM.YYYY)
 * @returns {Date|null} - JavaScript Date object or null if invalid format
 */
function parseFinDate(finDate) {
  if (!finDate || typeof finDate !== 'string') {
    console.warn('Invalid date format provided to parseFinDate:', finDate);
    return null;
  }

  try {
    // Split the date by dots
    const parts = finDate.split('.');
    
    // Check if we have exactly 3 parts (day, month, year)
    if (parts.length !== 3) {
      console.warn('Invalid Finnish date format (should be DD.MM.YYYY):', finDate);
      return null;
    }
    
    // Parse parts to integers
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    // Validate ranges
    if (isNaN(day) || day < 1 || day > 31 ||
        isNaN(month) || month < 0 || month > 11 ||
        isNaN(year) || year < 1900 || year > 2100) {
      console.warn('Date parts out of valid range:', finDate);
      return null;
    }
    
    // Create and return the Date object
    return new Date(year, month, day);
  } catch (error) {
    console.error('Error parsing Finnish date:', finDate, error);
    return null;
  }
}

/**
 * Save current scroll position to localStorage
 */
function saveScrollPosition() {
  localStorage.setItem('scrollPosition', window.scrollY);
}

/**
 * Restore previously saved scroll position
 */
function restoreScrollPosition() {
  const savedPosition = localStorage.getItem('scrollPosition');
  if (savedPosition) {
    window.scrollTo(0, parseInt(savedPosition));
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Restore scroll position if available
  restoreScrollPosition();
  
  // Show loading indicator
  showLoading(true);
  
  try {
    // Wait for Firebase to be initialized
    await waitForFirebase();
    
    // Load data
    await loadData();
    
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
  window.addEventListener('beforeunload', saveScrollPosition);
});

// Wait for Firebase to be initialized
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    // Check if Firebase is already available
    if (window.db && window.firebaseModules) {
      resolve();
      return;
    }
    
    // Listen for the firebase-ready event
    window.addEventListener('firebase-ready', () => {
      if (window.db && window.firebaseModules) {
        resolve();
      } else {
        reject(new Error('Firebase initialized but modules not available'));
      }
    }, { once: true });
    
    // Set a timeout in case Firebase initialization fails
    setTimeout(() => {
      if (!window.db || !window.firebaseModules) {
        reject(new Error('Firebase initialization timed out'));
      }
    }, 5000);
  });
}

// Load data from Firestore
async function loadData() {
  try {
    // Get Firebase modules from the global scope
    const { collection, getDocs } = window.firebaseModules;
    
    // Initialize with default data structure
    Object.assign(appState, {
      students: [],
      tasks: [],
      filteredLists: {},
      lastScrollPosition: localStorage.getItem('scrollPosition') || 0
    });
    
    // Load students collection
    const studentsSnapshot = await getDocs(collection(window.db, "students"));
    if (!studentsSnapshot.empty) {
      studentsSnapshot.forEach((doc) => {
        const studentData = doc.data();
        appState.students.push({ 
          id: doc.id, 
          name: studentData.name,
          points: studentData.points
        });
      });
    } else {
      // If no students found, initialize with default student
      console.log('No students found in Firestore, initializing with default student');
      appState.students = [{ id: 1, name: 'Nuno', points: 0 }];
    }
    
    // Load quests collection (instead of tasks)
    const questsSnapshot = await getDocs(collection(window.db, "quests"));
    if (!questsSnapshot.empty) {
      questsSnapshot.forEach((doc) => {
        const questData = doc.data();
        // Ensure the status field is set to 'open' if it's undefined
        const status = questData.status || 'open';
        // Ensure type is set to a default value if it's undefined
        const type = questData.type || 'homework';
        
        appState.tasks.push({ 
          id: doc.id,
          date: questData.date,
          subject: questData.subject,
          description: questData.description,
          type: type,
          status: status,
          student_id: questData.student_id,
          points: questData.points || 5,
          completedDate: questData.completedDate || null
        });
      });
    }
    
    console.log('Loaded data from Firestore:', appState);
    
    // Set student info
    const student = appState.students[0];
    if (student) {
      elements.studentNameEl.textContent = student.name;
      elements.studentPointsEl.textContent = student.points;
    }
    
  } catch (error) {
    console.error('Error loading data from Firestore:', error);
    throw error;
  }
}

// Initialize event listeners
function initializeEventListeners() {
  // Filter buttons
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      
      // Update active filter
      appState.activeFilter = filter;
      
      // Update UI to reflect the active filter
      elements.filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      
      // Reset archive view when changing filters
      appState.showArchive = false;
      
      // Re-render tasks
      renderTasks();
    });
  });
  
  // Recent filter toggle
  const recentFilterToggle = document.getElementById('recentToggle');
  if (recentFilterToggle) {
    recentFilterToggle.addEventListener('click', toggleRecentFilter);
  }
  
  // Add chore button
  elements.addChoreBtn.addEventListener('click', () => {
    elements.choreModal.style.display = 'flex';
  });
  
  // Close modal button
  elements.closeModalBtn.addEventListener('click', () => {
    elements.choreModal.style.display = 'none';
  });
  
  // Submit chore button
  elements.addChoreSubmitBtn.addEventListener('click', addChore);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === elements.choreModal) {
      elements.choreModal.style.display = 'none';
    }
  });
  
  // Create and add archive toggle
  createArchiveControls();
}

// Get task containers (current and archive) based on task age
function getTaskContainers(tasks) {
  const today = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14); // 14 days = 2 weeks
  
  const current = [];
  const archive = [];
  
  tasks.forEach(task => {
    const taskDate = parseFinDate(task.date);
    
    // Skip completed tasks, they're handled separately
    if (task.status === 'completed') {
      current.push(task);
      return;
    }
    
    // Check if the task is older than 14 days
    if (taskDate < twoWeeksAgo) {
      archive.push(task);
    } else {
      current.push(task);
    }
  });
  
  return { current, archive };
}

// Create archive controls (indicator and toggle)
function createArchiveControls() {
  // Remove existing controls if they exist
  if (elements.archiveIndicator) {
    elements.archiveIndicator.remove();
  }
  
  if (elements.archiveToggle) {
    elements.archiveToggle.remove();
  }
  
  // Create archive indicator
  elements.archiveIndicator = document.createElement('div');
  elements.archiveIndicator.className = 'archive-indicator';
  elements.archiveIndicator.style.display = 'none'; // Hidden by default
  
  // Create archive toggle
  elements.archiveToggle = document.createElement('button');
  elements.archiveToggle.className = 'archive-toggle';
  elements.archiveToggle.style.display = 'none'; // Hidden by default
  elements.archiveToggle.addEventListener('click', toggleArchiveView);
  
  // Add to DOM
  elements.questContainer.insertAdjacentElement('beforebegin', elements.archiveIndicator);
  elements.questContainer.insertAdjacentElement('beforebegin', elements.archiveToggle);
}

// Toggle between current and archive views
function toggleArchiveView() {
  appState.showArchive = !appState.showArchive;
  
  // Save scroll position before changing view
  appState.lastScrollPosition = window.scrollY;
  
  // Update the UI
  renderTasks();
  
  // Announce view change for accessibility
  const message = appState.showArchive ? 'Showing archived tasks' : 'Showing current tasks';
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  // Remove announcement after screen reader has time to read it
  setTimeout(() => {
    announcement.remove();
  }, 3000);
}

// Render archive indicator
function renderArchiveIndicator(archiveCount) {
  if (!elements.archiveIndicator || !elements.archiveToggle) {
    createArchiveControls();
  }
  
  if (archiveCount > 0) {
    // Update indicator
    elements.archiveIndicator.innerHTML = `
      <div class="archive-icon"><i class="ri-archive-line"></i></div>
      <div class="archive-count">${archiveCount}</div>
    `;
    elements.archiveIndicator.style.display = 'flex';
    
    // Update toggle
    elements.archiveToggle.innerHTML = appState.showArchive
      ? `<i class="ri-arrow-left-line"></i> Back to Current Tasks`
      : `<i class="ri-archive-line"></i> View ${archiveCount} Archived Tasks`;
    elements.archiveToggle.style.display = 'flex';
  } else {
    // Hide if no archived tasks
    elements.archiveIndicator.style.display = 'none';
    elements.archiveToggle.style.display = 'none';
  }
}

// Render tasks based on current filter
function renderTasks() {
  // Get today's date in Finnish format (DD.MM.YYYY)
  const today = new Date();
  const todayFormatted = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
  
  // Filter tasks based on current filter
  let filteredTasks = appState.tasks;
  
  // Apply recent filter if enabled
  if (appState.showRecentOnly) {
    filteredTasks = filteredTasks.filter(task => isWithinTwoWeeks(task.date));
  }
  
  // Apply main filter
  switch (appState.activeFilter) {
    case 'homework':
      filteredTasks = filteredTasks.filter(task => task.type === 'homework' && task.status !== 'completed');
      break;
    case 'chore':
      filteredTasks = filteredTasks.filter(task => task.type === 'chore' && task.status !== 'completed');
      break;
    case 'completed':
      filteredTasks = filteredTasks.filter(task => task.status === 'completed');
      break;
    case 'all':
    default:
      // For "all", only include non-completed tasks
      filteredTasks = filteredTasks.filter(task => task.status !== 'completed');
      break;
  }
  
  // Save filtered tasks to state
  appState.filteredLists[appState.activeFilter] = filteredTasks;
  
  // For completed tasks, skip the archive segmentation and use the existing logic
  if (appState.activeFilter === 'completed') {
    // Check if there are any tasks
    if (filteredTasks.length === 0) {
      elements.noQuestsMessage.style.display = 'flex';
      elements.questContainer.innerHTML = '';
      // Hide archive controls
      if (elements.archiveIndicator) elements.archiveIndicator.style.display = 'none';
      if (elements.archiveToggle) elements.archiveToggle.style.display = 'none';
    } else {
      elements.noQuestsMessage.style.display = 'none';
      
      filteredTasks.sort((a, b) => {
        const dateA = parseFinDate(a.completedDate || a.date);
        const dateB = parseFinDate(b.completedDate || b.date);
        return dateB - dateA; // Descending order for completed tasks
      });
      
      // Group tasks by completion date
      const tasksByDate = {};
      filteredTasks.forEach(task => {
        const dateKey = task.completedDate || task.date;
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      });
      
      // Render completed tasks by date groups
      renderTasksByDateGroups(tasksByDate, todayFormatted);
      
      // Hide archive controls for completed tasks
      if (elements.archiveIndicator) elements.archiveIndicator.style.display = 'none';
      if (elements.archiveToggle) elements.archiveToggle.style.display = 'none';
    }
  } else {
    // For active tasks, segment into current and archive
    const { current, archive } = getTaskContainers(filteredTasks);
    
    // Determine which set of tasks to display based on archive toggle
    const tasksToDisplay = appState.showArchive ? archive : current;
    
    // Check if there are any tasks to display
    if (tasksToDisplay.length === 0) {
      // If in archive view and no archived tasks
      if (appState.showArchive) {
        elements.questContainer.innerHTML = '';
        elements.questContainer.innerHTML = `
          <div class="empty-archive">
            <i class="ri-archive-line"></i>
            <p>No archived tasks found</p>
            <small>Tasks older than 14 days automatically move here</small>
          </div>
        `;
        elements.noQuestsMessage.style.display = 'none';
      } else if (archive.length > 0) {
        // If in current view with no current tasks but there are archived tasks
        elements.questContainer.innerHTML = '';
        elements.noQuestsMessage.style.display = 'flex';
      } else {
        // No tasks at all
        elements.questContainer.innerHTML = '';
        elements.noQuestsMessage.style.display = 'flex';
      }
    } else {
      elements.noQuestsMessage.style.display = 'none';
      
      // Calculate next class information for each task
      tasksToDisplay.forEach(task => {
        const nextClassInfo = calculateNextClassDay(task.subject);
        task.nextClassInfo = nextClassInfo;
        
        // For tasks without a scheduled class, use due date for sorting
        if (nextClassInfo.daysUntilNextClass === null) {
          const dueDate = parseFinDate(task.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          // Calculate days until due
          const diffTime = dueDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          task.nextClassInfo.daysUntilNextClass = diffDays;
        }
      });
      
      // Sort by next class occurrence, then by due date within the same day
      tasksToDisplay.sort((a, b) => {
        // First sort by next class occurrence
        const daysUntilA = a.nextClassInfo.daysUntilNextClass;
        const daysUntilB = b.nextClassInfo.daysUntilNextClass;
        
        if (daysUntilA !== daysUntilB) {
          return daysUntilA - daysUntilB;
        }
        
        // If same next class day, sort by due date
        const dateA = parseFinDate(a.date);
        const dateB = parseFinDate(b.date);
        return dateA - dateB;
      });
      
      // Group tasks by days until next class day
      const tasksByNextClass = {};
      tasksToDisplay.forEach(task => {
        // Create a key for the group (days until next class)
        let groupKey;
        
        if (task.nextClassInfo.hasClassToday) {
          groupKey = 'today';
        } else if (task.nextClassInfo.hasClassTomorrow) {
          groupKey = 'tomorrow';
        } else if (task.nextClassInfo.daysUntilNextClass !== null) {
          const daysUntil = task.nextClassInfo.daysUntilNextClass;
          const date = new Date();
          date.setDate(date.getDate() + daysUntil);
          // Format as YYYY-MM-DD (for sorting purposes)
          groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        } else {
          // No scheduled class, group by due date
          const dueDate = parseFinDate(task.date);
          groupKey = `due-${dueDate.getFullYear()}-${(dueDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDate.getDate().toString().padStart(2, '0')}`;
        }
        
        if (!tasksByNextClass[groupKey]) {
          tasksByNextClass[groupKey] = [];
        }
        
        tasksByNextClass[groupKey].push(task);
      });
      
      // Render the task groups
      renderTasksByNextClassGroups(tasksByNextClass, todayFormatted);
    }
    
    // Render archive indicator
    renderArchiveIndicator(archive.length);
  }
  
  // Add archive view class to container if in archive view
  elements.questContainer.classList.toggle('archive-view', appState.showArchive);
  
  // Render today's tasks separately in the fixed header
  // Only show today's tasks from the current (non-archived) view
  const { current } = getTaskContainers(appState.tasks);
  renderTodayTasks(todayFormatted, current);
}

// Render today's tasks in the fixed header
function renderTodayTasks(todayFormatted, currentTasks = null) {
  // Use passed tasks or get from state
  const tasks = currentTasks || appState.tasks;
  
  // Get tasks due today that are not completed
  const todayTasks = tasks.filter(task => 
    task.date === todayFormatted && 
    task.status !== 'completed');
  
  // Clear the container
  elements.todayQuests.innerHTML = '';
  
  // Show empty state if no tasks
  if (todayTasks.length === 0) {
    elements.todayEmptyState.style.display = 'flex';
  } else {
    elements.todayEmptyState.style.display = 'none';
    
    // Render tasks
    todayTasks.forEach(task => {
      const taskElement = createTaskElement(task, true);
      elements.todayQuests.appendChild(taskElement);
    });
  }
}

// Toggle recent filter
function toggleRecentFilter() {
  appState.showRecentOnly = !appState.showRecentOnly;
  
  // Update UI
  if (elements.recentFilterText) {
    elements.recentFilterText.textContent = `Recent: ${appState.showRecentOnly ? 'On' : 'Off'}`;
  }
  
  // Toggle active class
  const recentBtn = document.querySelector('[data-filter="recent"]');
  if (recentBtn) {
    recentBtn.classList.toggle('active', appState.showRecentOnly);
  }
  
  // Reset archive view when toggling recent filter
  appState.showArchive = false;
  
  // Render tasks with the updated filter
  renderTasks();
}

// Add a new chore
function addChore() {
  // Get input values
  const description = elements.choreDescriptionInput.value.trim();
  const points = parseInt(elements.chorePointsInput.value, 10);
  
  // Validate input
  if (!description || !points) {
    alert('Please fill in both description and points');
    return;
  }
  
  // Create new chore object
  const newChore = {
    date: getTodayFinDate(),
    subject: 'Chore',
    description,
    type: 'chore',
    status: 'open',
    student_id: appState.students[0].id,
    points
  };
  
  // Add chore to state
  appState.tasks.push(newChore);
  
  // Save chore to Firestore
  const { addDoc, collection } = window.firebaseModules;
  addDoc(collection(window.db, 'quests'), newChore)
    .then(() => {
      console.log('Chore added successfully');
      // Close modal
      elements.choreModal.style.display = 'none';
      // Clear input fields
      elements.choreDescriptionInput.value = '';
      elements.chorePointsInput.value = '';
      // Re-render tasks
      renderTasks();
    })
    .catch((error) => {
      console.error('Error adding chore:', error);
      alert('Failed to add chore. Please try again.');
    });
}

// Complete a task
async function completeTask(taskId) {
  try {
    showLoading(true);
    
    // Find the task
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }
    
    // Get Firebase modules
    const { doc, updateDoc } = window.firebaseModules;
    
    // Get current date in Finnish format (DD.MM.YYYY)
    const today = new Date();
    const completedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    
    // Update in Firestore
    const taskRef = doc(window.db, "quests", taskId);
    await updateDoc(taskRef, {
      status: 'completed',
      completedDate: completedDate
    });
    
    // Find the student
    const student = appState.students.find(s => s.id === task.student_id);
    if (student) {
      // Update student points in Firestore
      const newPoints = (student.points || 0) + task.points;
      const studentRef = doc(window.db, "students", student.id);
      await updateDoc(studentRef, {
        points: newPoints
      });
      
      // Update local state
      student.points = newPoints;
      elements.studentPointsEl.textContent = newPoints;
    }
    
    // Update local state
    task.status = 'completed';
    task.completedDate = completedDate;
    
    // Play completion animation
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      await playCompletionAnimation(taskElement);
    }
    
    // Create confetti effect
    createConfetti();
    
    // Update streak after completing a task
    updateStreak();
    
    // Re-render tasks
    renderTasks();
    
    console.log('Task completed successfully:', task);
    
  } catch (error) {
    console.error('Error completing task:', error);
    alert('Could not complete the task. Please try again.');
  } finally {
    showLoading(false);
  }
}

// ... rest of the code remains the same ...
