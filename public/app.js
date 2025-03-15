/**
 * app.js - Quest Board ADHD-Optimized UI
 * Handles task rendering, Firebase integration, and UI interactions
 */

// Import animations module - using a more compatible approach
let createConfetti, playCompletionAnimation;

// Load animations module dynamically
try {
  import('./animations.js').then(module => {
    createConfetti = module.createConfetti;
    playCompletionAnimation = module.playCompletionAnimation;
    console.log('Animations module loaded successfully');
  }).catch(err => {
    console.error('Error loading animations module:', err);
    // Provide fallback implementations if animations fail to load
    createConfetti = () => console.log('Confetti animation (fallback)');
    playCompletionAnimation = () => console.log('Completion animation (fallback)');
  });
} catch (e) {
  console.error('Error with dynamic import:', e);
  // Fallbacks if dynamic import syntax not supported
  createConfetti = () => console.log('Confetti animation (fallback)');
  playCompletionAnimation = () => console.log('Completion animation (fallback)');
}

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

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
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
    await loadData();
    
    // Render tasks
    renderTasks();
    
    // Update streak information (this will now use the loaded streak as a base)
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
});

// Wait for Firebase to be initialized
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    // Check if Firebase is already available
    if (window.db && window.firebaseModules) {
      console.log('Firebase already initialized and available');
      resolve();
      return;
    }
    
    console.log('Waiting for Firebase to initialize...');
    
    // Create a listener that will clean itself up
    const firebaseReadyListener = () => {
      console.log('Firebase ready event received');
      if (window.db && window.firebaseModules) {
        clearTimeout(timeoutId);
        resolve();
      } else {
        console.error('Firebase ready event received but modules not available');
        clearTimeout(timeoutId);
        reject(new Error('Firebase initialized but modules not available'));
      }
    };
    
    // Add event listener
    window.addEventListener('firebase-ready', firebaseReadyListener, { once: true });
    
    // Set a timeout in case Firebase initialization fails
    const timeoutId = setTimeout(() => {
      // Remove event listener to avoid memory leaks
      window.removeEventListener('firebase-ready', firebaseReadyListener);
      
      if (!window.db || !window.firebaseModules) {
        console.error('Firebase initialization timed out after 8 seconds');
        
        // Attempt to reinitialize Firebase
        try {
          document.getElementById('loading-indicator').innerHTML = `
            <div class="error-message">
              <p>Connection to database timed out. Please check your internet connection.</p>
              <button onclick="location.reload()" class="primary-btn">Retry</button>
            </div>
          `;
        } catch (e) {
          console.error('Could not display error message:', e);
        }
        
        reject(new Error('Firebase initialization timed out'));
      }
    }, 8000); // Increased timeout to 8 seconds for slower connections
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
  try {
    appState.lastScrollPosition = window.scrollY;
    localStorage.setItem('scrollPosition', window.scrollY);
  } catch (error) {
    console.error('Error accessing localStorage:', error);
  }
  
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

// Helper function to get today's date in Finnish format
function getTodayFinDate() {
  const today = new Date();
  return `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
}

/**
 * Parse a Finnish format date string (DD.MM.YYYY) into a JavaScript Date object
 * @param {string} finDate - Date string in Finnish format (DD.MM.YYYY)
 * @returns {Date} JavaScript Date object
 */
function parseFinDate(finDate) {
  // Handle null or undefined input
  if (!finDate) {
    return new Date(); // Return today's date as fallback
  }
  
  try {
    // Split the Finnish date format (DD.MM.YYYY) into components
    const [day, month, year] = finDate.split('.');
    
    // Validate the date parts
    if (!day || !month || !year || isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(year))) {
      console.warn(`Invalid date format: ${finDate}. Expected DD.MM.YYYY`);
      return new Date(); // Return today's date as fallback
    }
    
    // Create a new Date object (months are 0-indexed in JavaScript Date)
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${finDate}`);
      return new Date(); // Return today's date as fallback
    }
    
    return date;
  } catch (error) {
    console.error(`Error parsing date ${finDate}:`, error);
    return new Date(); // Return today's date as fallback
  }
}

// Function to save current scroll position to localStorage
function saveScrollPosition() {
  try {
    localStorage.setItem('scrollPosition', window.scrollY);
    appState.lastScrollPosition = window.scrollY;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
  }
}

// Function to restore saved scroll position
function restoreScrollPosition() {
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
}

/**
 * Calculate the next class day for a given subject
 * @param {string} subject - The subject to check
 * @returns {Object} Information about the next class occurrence
 */
function calculateNextClassDay(subject) {
  // Default response object
  const result = {
    daysUntilNextClass: null,
    nextClassDay: null,
    hasClassToday: false,
    hasClassTomorrow: false
  };
  
  // Handle undefined or empty subject
  if (!subject) {
    console.warn('Subject is undefined or empty in calculateNextClassDay');
    return result;
  }
  
  try {
    // Get the current day of the week (1-7 where 1 is Monday)
    const today = new Date();
    // Convert JavaScript's 0-6 (Sun-Sat) format to 1-7 (Mon-Sun) format
    const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    
    // Get the schedule for the subject
    const schedule = appState.schedule.main[subject];
    
    // If subject is not in the schedule, return the default result
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      console.log(`No schedule found for subject: ${subject}`);
      return result;
    }
    
    // Check if there's a class today
    const hasClassToday = schedule.includes(currentDayOfWeek);
    result.hasClassToday = hasClassToday;
    
    if (hasClassToday) {
      result.daysUntilNextClass = 0;
      result.nextClassDay = currentDayOfWeek;
      return result;
    }
    
    // Find the next day with a class
    let daysAhead = 1;
    let nextDayChecked = currentDayOfWeek + 1;
    if (nextDayChecked > 7) nextDayChecked = 1; // Wrap around to Monday
    
    // Check up to 7 days ahead
    while (daysAhead <= 7) {
      if (schedule.includes(nextDayChecked)) {
        result.daysUntilNextClass = daysAhead;
        result.nextClassDay = nextDayChecked;
        
        // Check if it's tomorrow
        if (daysAhead === 1) {
          result.hasClassTomorrow = true;
        }
        
        return result;
      }
      
      // Move to next day
      nextDayChecked++;
      if (nextDayChecked > 7) nextDayChecked = 1; // Wrap around to Monday
      daysAhead++;
    }
    
    // If we get here, no class was found in the next 7 days
    // Use the first day in the schedule as a fallback
    result.daysUntilNextClass = 7; // Just set to a week away as default
    result.nextClassDay = schedule[0];
    
    return result;
  } catch (error) {
    console.error('Error in calculateNextClassDay:', error);
    return result;
  }
}

/**
 * Update streak information and UI
 * Handles streak counting, local storage persistence, and visual feedback
 */
function updateStreak() {
  try {
    // Get today's date and reset time component
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format for storage/comparison
    const todayStr = today.toISOString().split('T')[0];
    
    // Try to get the streak info from localStorage
    let streakInfo;
    try {
      const storedStreak = localStorage.getItem('questBoardStreak');
      streakInfo = storedStreak ? JSON.parse(storedStreak) : null;
    } catch (error) {
      console.error('Error accessing localStorage for streak:', error);
      streakInfo = null;
    }
    
    // If no stored streak, initialize with defaults
    if (!streakInfo) {
      streakInfo = {
        count: 0,
        lastActive: null
      };
    }
    
    // Convert stored date string to Date object for comparison
    const lastActive = streakInfo.lastActive ? new Date(streakInfo.lastActive) : null;
    
    if (lastActive) {
      // Reset time component for comparison
      lastActive.setHours(0, 0, 0, 0);
      
      // Calculate days difference
      const timeDiff = today.getTime() - lastActive.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      // Update streak count based on activity pattern
      if (daysDiff === 0) {
        // Already counted today, keep the streak
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        streakInfo.count += 1;
      } else {
        // Streak broken, reset to 1 for today
        streakInfo.count = 1;
      }
    } else {
      // First time ever, start streak at 1
      streakInfo.count = 1;
    }
    
    // Update the last active date
    streakInfo.lastActive = todayStr;
    
    // Update app state
    appState.streak.count = streakInfo.count;
    appState.streak.lastActive = todayStr;
    
    // Save to localStorage
    try {
      localStorage.setItem('questBoardStreak', JSON.stringify(streakInfo));
    } catch (error) {
      console.error('Error saving streak to localStorage:', error);
    }
    
    // Update UI elements
    updateStreakUI(streakInfo.count);
    
    console.log('Updated streak:', streakInfo);
    
    // If the streak has hit specific milestones, show a celebration
    const milestones = [3, 7, 14, 30, 60, 90];
    if (milestones.includes(streakInfo.count)) {
      celebrateStreakMilestone(streakInfo.count);
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }
}

/**
 * Update the streak UI elements
 * @param {number} streakCount - Current streak count
 */
function updateStreakUI(streakCount) {
  if (!elements.streakCount || !elements.streakBar) {
    console.warn('Streak UI elements not found');
    return;
  }
  
  // Update streak counter
  elements.streakCount.textContent = streakCount;
  
  // Calculate percentage for streak bar (based on target from appState)
  const percentage = Math.min((streakCount / appState.streak.target) * 100, 100);
  elements.streakBar.style.width = `${percentage}%`;
  
  // Add color classes based on progress
  elements.streakBar.classList.remove('beginning', 'progress', 'almost', 'complete');
  
  if (percentage < 25) {
    elements.streakBar.classList.add('beginning');
  } else if (percentage < 75) {
    elements.streakBar.classList.add('progress');
  } else if (percentage < 100) {
    elements.streakBar.classList.add('almost');
  } else {
    elements.streakBar.classList.add('complete');
  }
}

/**
 * Celebrate reaching a streak milestone
 * @param {number} milestone - The milestone reached
 */
function celebrateStreakMilestone(milestone) {
  // Create a celebration message
  const message = document.createElement('div');
  message.className = 'streak-celebration';
  
  let emoji, streakText;
  
  // Customize message based on milestone
  if (milestone >= 90) {
    emoji = '🏆';
    streakText = 'LEGENDARY STREAK!';
  } else if (milestone >= 30) {
    emoji = '🔥';
    streakText = 'AMAZING STREAK!';
  } else if (milestone >= 14) {
    emoji = '⭐️';
    streakText = 'GREAT STREAK!';
  } else if (milestone >= 7) {
    emoji = '✨';
    streakText = 'SUPER STREAK!';
  } else {
    emoji = '🎉';
    streakText = 'STREAK BUILDING!';
  }
  
  message.innerHTML = `
    <div class="celebration-icon">${emoji}</div>
    <div class="celebration-text">
      <div class="milestone-count">${milestone} DAYS</div>
      <div class="milestone-text">${streakText}</div>
    </div>
  `;
  
  // Add to the document
  document.body.appendChild(message);
  
  // Add animation class
  setTimeout(() => {
    message.classList.add('show');
    
    // Try to play a celebration animation if available
    try {
      if (typeof celebratePulse === 'function') {
        const streakElement = elements.streakCount.parentElement;
        celebratePulse(streakElement);
      }
      
      if (typeof createConfetti === 'function') {
        createConfetti();
      }
    } catch (error) {
      console.warn('Animation functions not available:', error);
    }
  }, 100);
  
  // Remove after display duration
  setTimeout(() => {
    message.classList.remove('show');
    setTimeout(() => {
      message.remove();
    }, 500);
  }, 5000);
}

// ... rest of the code remains the same ...

/**
 * Load streak data from localStorage
 * Should be called early in the initialization process
 */
function loadStreakData() {
  try {
    const storedStreak = localStorage.getItem('questBoardStreak');
    if (storedStreak) {
      const streakInfo = JSON.parse(storedStreak);
      appState.streak.count = streakInfo.count || 0;
      appState.streak.lastActive = streakInfo.lastActive || null;
      console.log('Loaded streak data:', appState.streak);
      
      // Update UI immediately if elements are available
      if (elements.streakCount && elements.streakBar) {
        updateStreakUI(appState.streak.count);
      }
    } else {
      console.log('No saved streak data found');
    }
  } catch (error) {
    console.error('Error loading streak data from localStorage:', error);
  }
}

/**
 * Render tasks grouped by their next class day
 * @param {Object} taskGroups - Tasks grouped by their next class day
 * @param {string} todayFormatted - Today's date in Finnish format for comparison
 */
function renderTasksByNextClassGroups(taskGroups, todayFormatted) {
  // Clear container first
  elements.questContainer.innerHTML = '';
  
  // Get all keys and sort them
  const groupKeys = Object.keys(taskGroups);
  
  // Custom sort function to prioritize 'today', then 'tomorrow', then dates chronologically
  groupKeys.sort((a, b) => {
    if (a === 'today') return -1;
    if (b === 'today') return 1;
    if (a === 'tomorrow') return -1;
    if (b === 'tomorrow') return 1;
    return a.localeCompare(b); // Sorts dates in ascending order
  });
  
  // Process each group
  groupKeys.forEach(groupKey => {
    const tasks = taskGroups[groupKey];
    if (!tasks || tasks.length === 0) return;
    
    // Create a container for this day's tasks
    const dayContainer = document.createElement('div');
    dayContainer.className = 'quest-day';
    
    // Determine the display date and add appropriate class
    let displayDate = '';
    let urgencyClass = '';
    
    if (groupKey === 'today') {
      displayDate = 'Today';
      urgencyClass = 'urgent';
      dayContainer.classList.add('today-tasks');
    } else if (groupKey === 'tomorrow') {
      displayDate = 'Tomorrow';
      urgencyClass = 'upcoming';
      dayContainer.classList.add('tomorrow-tasks');
    } else if (groupKey.startsWith('due-')) {
      // Extract date from the key
      const dateParts = groupKey.replace('due-', '').split('-');
      const dueDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      
      // Check how far in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 2) {
        urgencyClass = 'upcoming';
      } else if (diffDays <= 5) {
        urgencyClass = 'planned';
      } else {
        urgencyClass = 'future';
      }
      
      // Format the date for display
      displayDate = dueDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric'
      });
      
      dayContainer.classList.add('due-date-tasks');
    } else {
      // Regular future date
      const dateParts = groupKey.split('-');
      const classDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      
      // Format the date for display
      displayDate = classDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric'
      });
      
      // Check how far in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = classDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 2) {
        urgencyClass = 'upcoming';
      } else if (diffDays <= 5) {
        urgencyClass = 'planned';
      } else {
        urgencyClass = 'future';
      }
      
      dayContainer.classList.add('future-class-tasks');
    }
    
    // Create the day header
    const dayHeader = document.createElement('div');
    dayHeader.className = `day-header ${urgencyClass}`;
    dayHeader.innerHTML = `
      <div class="day-date">${displayDate}</div>
      <div class="day-count">${tasks.length} quest${tasks.length > 1 ? 's' : ''}</div>
    `;
    dayContainer.appendChild(dayHeader);
    
    // Create container for the quests
    const questList = document.createElement('div');
    questList.className = 'quest-list';
    
    // Add each quest
    tasks.forEach(task => {
      const questCard = document.createElement('div');
      questCard.className = `quest-card ${task.type}-quest ${urgencyClass}`;
      questCard.dataset.id = task.id;
      
      // Format the subject name
      const subjectDisplay = task.subject.charAt(0).toUpperCase() + task.subject.slice(1);
      
      // Create visual cue based on subject
      const subjectInitial = task.subject.charAt(0).toUpperCase();
      const bgColor = getSubjectColor(task.subject);
      
      questCard.innerHTML = `
        <div class="quest-header">
          <div class="subject-badge" style="background-color: ${bgColor}">
            ${subjectInitial}
          </div>
          <div class="quest-subject">${subjectDisplay}</div>
          <div class="quest-points">${task.points} pts</div>
        </div>
        <div class="quest-description">${task.description}</div>
        <div class="quest-footer">
          <div class="quest-date">${task.date}</div>
          <button class="complete-btn" aria-label="Complete task">
            <i class="ri-check-line"></i>
          </button>
        </div>
      `;
      
      // Add event listener to the complete button
      const completeButton = questCard.querySelector('.complete-btn');
      completeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        completeTask(task.id);
      });
      
      questList.appendChild(questCard);
    });
    
    dayContainer.appendChild(questList);
    elements.questContainer.appendChild(dayContainer);
  });
}

/**
 * Get a consistent color for a subject
 * @param {string} subject - The subject name
 * @returns {string} - A hex color code
 */
function getSubjectColor(subject) {
  // Define colors for specific subjects
  const subjectColors = {
    'math': '#4361ee',
    'finnish': '#4cc9f0',
    'english': '#f72585',
    'history': '#7209b7',
    'civics': '#3a0ca3',
    'ethics': '#4895ef',
    'pe': '#560bad',
    'music': '#b5179e',
    'art': '#f15bb5',
    'crafts': '#fee440',
    'eco': '#06d6a0',
    'digi': '#118ab2'
  };
  
  // Normalize the subject name (lowercase)
  const normalizedSubject = subject.toLowerCase();
  
  // Return the predefined color or generate one based on the subject string
  if (subjectColors[normalizedSubject]) {
    return subjectColors[normalizedSubject];
  } else {
    // Simple hash function to generate a consistent color from a string
    let hash = 0;
    for (let i = 0; i < normalizedSubject.length; i++) {
      hash = normalizedSubject.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to a hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  }
}

// ... rest of the code remains the same ...
