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
  chorePointsInput: document.getElementById('chorePoints')
};

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
    
    // Set up an interval to check for Firebase
    const maxAttempts = 20;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      
      if (window.db && window.firebaseModules) {
        clearInterval(interval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error('Firebase initialization timed out'));
      }
    }, 250);
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
      
      // Toggle the recent filter if the recent button is clicked
      if (filter === 'recent') {
        toggleRecentFilter();
        return;
      }
      
      // Update active filter
      appState.activeFilter = filter;
      
      // Update UI
      elements.filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      
      // Render tasks with the new filter
      renderTasks();
    });
  });
  
  // Modal controls
  elements.addChoreBtn.addEventListener('click', () => {
    elements.choreModal.classList.add('show');
  });
  
  elements.closeModalBtn.addEventListener('click', () => {
    elements.choreModal.classList.remove('show');
  });
  
  elements.addChoreSubmitBtn.addEventListener('click', addChore);
  
  // Close modal when clicking outside
  elements.choreModal.addEventListener('click', (event) => {
    if (event.target === elements.choreModal) {
      elements.choreModal.classList.remove('show');
    }
  });
}

// Toggle recent filter
function toggleRecentFilter() {
  appState.showRecentOnly = !appState.showRecentOnly;
  elements.recentFilterText.textContent = `Recent: ${appState.showRecentOnly ? 'On' : 'Off'}`;
  
  // Toggle active class
  const recentBtn = document.querySelector('[data-filter="recent"]');
  recentBtn.classList.toggle('active', appState.showRecentOnly);
  
  // Render tasks with the updated filter
  renderTasks();
}

// Add a new chore
async function addChore() {
  const description = elements.choreDescriptionInput.value.trim();
  const points = parseInt(elements.chorePointsInput.value, 10);
  
  if (!description) {
    alert('Please enter a description for the chore.');
    return;
  }
  
  if (isNaN(points) || points < 1 || points > 20) {
    alert('Points must be a number between 1 and 20.');
    return;
  }
  
  try {
    showLoading(true);
    
    // Get current date in Finnish format (DD.MM.YYYY)
    const today = new Date();
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    
    // Create new chore object
    const newChore = {
      date: date,
      description: description,
      points: points,
      status: 'open',
      subject: 'Chore',
      type: 'chore',
      student_id: appState.students[0].id // Assign to the first student
    };
    
    // Get Firebase modules
    const { collection, doc, setDoc } = window.firebaseModules;
    
    // Add to Firestore
    const newChoreRef = doc(collection(window.db, "quests"));
    await setDoc(newChoreRef, newChore);
    
    // Add to local state with the generated ID
    newChore.id = newChoreRef.id;
    appState.tasks.push(newChore);
    
    // Clear form and close modal
    elements.choreDescriptionInput.value = '';
    elements.choreModal.classList.remove('show');
    
    // Render tasks to show the new chore
    renderTasks();
    
    console.log('Chore added successfully:', newChore);
    
  } catch (error) {
    console.error('Error adding chore:', error);
    alert('Could not add the chore. Please try again.');
  } finally {
    showLoading(false);
  }
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
  
  // Check if there are any tasks
  if (filteredTasks.length === 0) {
    elements.noQuestsMessage.style.display = 'flex';
    elements.questContainer.innerHTML = '';
  } else {
    elements.noQuestsMessage.style.display = 'none';
    
    // For completed tasks, use the existing sort logic
    if (appState.activeFilter === 'completed') {
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
    } else {
      // For active tasks, sort and group by next class occurrence
      
      // Calculate next class information for each task
      filteredTasks.forEach(task => {
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
      filteredTasks.sort((a, b) => {
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
      filteredTasks.forEach(task => {
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
  }
  
  // Render today's tasks separately in the fixed header
  renderTodayTasks(todayFormatted);
}

// Render tasks grouped by next class day
function renderTasksByNextClassGroups(taskGroups, todayFormatted) {
  elements.questContainer.innerHTML = '';
  
  // Sort the group keys for proper display order
  const sortedGroupKeys = Object.keys(taskGroups).sort((a, b) => {
    // Special handling for 'today' and 'tomorrow'
    if (a === 'today') return -1;
    if (b === 'today') return 1;
    if (a === 'tomorrow') return -1;
    if (b === 'tomorrow') return 1;
    
    // For other keys, sort normally
    return a.localeCompare(b);
  });
  
  // Render each group
  sortedGroupKeys.forEach(groupKey => {
    const tasks = taskGroups[groupKey];
    
    // Create appropriate label for each group
    let groupLabel;
    if (groupKey === 'today') {
      groupLabel = 'Today\'s Classes';
    } else if (groupKey === 'tomorrow') {
      groupLabel = 'Tomorrow\'s Classes';
    } else if (groupKey.startsWith('due-')) {
      // Tasks grouped by due date (no scheduled class)
      const dateString = groupKey.substring(4); // Remove 'due-' prefix
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Format the date (use existing formatDate function with a Finnish format date)
      const finDate = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
      groupLabel = `Due ${formatDate(finDate)}`;
    } else {
      // Regular next class date
      const [year, month, day] = groupKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Get day name and format date
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      
      // Format the date (use existing formatDate function with a Finnish format date)
      const finDate = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
      groupLabel = `${dayName}'s Classes (${formatDate(finDate)})`;
    }
    
    // Add day separator
    const daySeparator = document.createElement('div');
    daySeparator.className = 'day-separator';
    
    // Add appropriate class for today and tomorrow for styling
    if (groupKey === 'today') {
      daySeparator.classList.add('class-today');
    } else if (groupKey === 'tomorrow') {
      daySeparator.classList.add('class-tomorrow');
    }
    
    daySeparator.innerHTML = `
      <div class="day-line"></div>
      <div class="day-label">${groupLabel}</div>
    `;
    elements.questContainer.appendChild(daySeparator);
    
    // Create quest list for this group
    const questList = document.createElement('div');
    questList.className = 'quest-list';
    
    // Add tasks for this group
    tasks.forEach(task => {
      const isToday = task.date === todayFormatted;
      const taskElement = createTaskElement(task, isToday);
      questList.appendChild(taskElement);
    });
    
    elements.questContainer.appendChild(questList);
  });
}

// Render tasks grouped by date (for completed tasks)
function renderTasksByDateGroups(tasksByDate, todayFormatted) {
  elements.questContainer.innerHTML = '';
  
  Object.keys(tasksByDate).forEach(date => {
    const tasks = tasksByDate[date];
    const dateObj = parseFinDate(date);
    
    // Add day separator
    const daySeparator = document.createElement('div');
    daySeparator.className = 'day-separator';
    daySeparator.innerHTML = `
      <div class="day-line"></div>
      <div class="day-label">${formatDate(date)}</div>
    `;
    elements.questContainer.appendChild(daySeparator);
    
    // Create quest list for this day
    const questList = document.createElement('div');
    questList.className = 'quest-list';
    
    // Add tasks for this day
    tasks.forEach(task => {
      const taskElement = createTaskElement(task, date === todayFormatted);
      questList.appendChild(taskElement);
    });
    
    elements.questContainer.appendChild(questList);
  });
}

// Render today's tasks in the fixed header
function renderTodayTasks(todayFormatted) {
  const todayTasks = appState.tasks.filter(task => 
    task.date === todayFormatted && task.status !== 'completed'
  );
  
  if (todayTasks.length > 0) {
    elements.todayEmptyState.style.display = 'none';
    elements.todayQuests.innerHTML = '';
    
    todayTasks.forEach(task => {
      const taskElement = createTaskElement(task, true);
      elements.todayQuests.appendChild(taskElement);
    });
  } else {
    elements.todayQuests.innerHTML = '';
    elements.todayEmptyState.style.display = 'flex';
  }
}

// Create task element
function createTaskElement(task, isToday) {
  const taskElement = document.createElement('div');
  taskElement.className = `quest-card subject-${task.subject.toLowerCase()} ${task.status === 'completed' ? 'completed-quest' : ''}`;
  taskElement.dataset.taskId = task.id;
  
  // Add next-class indicators if task isn't completed and has next class info
  if (task.status !== 'completed' && task.nextClassInfo) {
    if (task.nextClassInfo.hasClassToday) {
      taskElement.classList.add('next-class-today');
    } else if (task.nextClassInfo.hasClassTomorrow) {
      taskElement.classList.add('next-class-tomorrow');
    }
  }
  
  // Determine time indicator
  let timeIndicator = '';
  let nextClassIndicator = '';
  
  if (task.status !== 'completed') {
    // Due date indicator
    const taskDate = parseFinDate(task.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (taskDate < today) {
      timeIndicator = '<span class="time-indicator overdue">Overdue</span>';
    } else if (taskDate.getTime() === today.getTime()) {
      timeIndicator = '<span class="time-indicator due-today">Due Today</span>';
    } else if (taskDate.getTime() === tomorrow.getTime()) {
      timeIndicator = '<span class="time-indicator due-tomorrow">Due Tomorrow</span>';
    } else {
      timeIndicator = '<span class="time-indicator due-later">Coming Up</span>';
    }
    
    // Next class indicator
    if (task.nextClassInfo) {
      if (task.nextClassInfo.hasClassToday) {
        nextClassIndicator = '<span class="class-indicator class-today">Class Today</span>';
      } else if (task.nextClassInfo.hasClassTomorrow) {
        nextClassIndicator = '<span class="class-indicator class-tomorrow">Class Tomorrow</span>';
      } else if (task.nextClassInfo.daysUntilNextClass !== null) {
        // For classes later in the week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const nextClassDay = task.nextClassInfo.nextClassDate.getDay();
        nextClassIndicator = `<span class="class-indicator class-upcoming">Class ${dayNames[nextClassDay]}</span>`;
      }
    }
  }
  
  // Create the task HTML
  taskElement.innerHTML = `
    <div class="quest-header">
      <div>
        <div class="quest-subject">${getQuestTitle(task)}${timeIndicator}</div>
        <h3 class="quest-title">${task.description}</h3>
      </div>
      <div class="quest-points">${task.points}</div>
    </div>
    
    <div class="quest-footer">
      <div class="quest-date">
        ${task.status === 'completed' 
          ? `Completed on ${formatCompletedDate(task.completedDate || task.date)}` 
          : `Due: ${formatDate(task.date)}${nextClassIndicator ? ' • ' + nextClassIndicator : ''}`}
      </div>
    </div>
    
    ${task.status !== 'completed' ? `
      <div class="quest-actions">
        <button class="complete-btn" data-task-id="${task.id}">
          <i class="ri-check-line"></i> Complete Quest
        </button>
      </div>
    ` : ''}
    
    ${task.status === 'completed' ? '<div class="completed-stamp">DONE</div>' : ''}
  `;
  
  // Add event listener for completion button
  if (task.status !== 'completed') {
    const completeBtn = taskElement.querySelector('.complete-btn');
    completeBtn.addEventListener('click', () => completeTask(task.id));
  }
  
  return taskElement;
}

// Update streak information
function updateStreak() {
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if we have stored the last active date
  let lastActive = localStorage.getItem('lastActiveDate');
  if (!lastActive) {
    // First time using the app, set today as the last active date
    lastActive = today.toISOString();
    localStorage.setItem('lastActiveDate', lastActive);
  }
  
  const lastActiveDate = new Date(lastActive);
  lastActiveDate.setHours(0, 0, 0, 0);
  
  // Get current streak from localStorage
  let streak = parseInt(localStorage.getItem('streak') || '0', 10);
  
  // Check if the user was active yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (lastActiveDate.getTime() === yesterday.getTime()) {
    // User was active yesterday, increment streak
    streak++;
  } else if (lastActiveDate.getTime() < yesterday.getTime()) {
    // User missed a day, reset streak
    streak = 1;
  } else if (lastActiveDate.getTime() < today.getTime()) {
    // User is active today but wasn't yesterday, start new streak
    streak = 1;
  }
  // If lastActiveDate is today, keep the current streak
  
  // Update localStorage
  localStorage.setItem('streak', streak.toString());
  localStorage.setItem('lastActiveDate', today.toISOString());
  
  // Update UI
  elements.streakCount.textContent = streak;
  
  // Calculate progress percentage (capped at 100%)
  const progressPercentage = Math.min((streak / 7) * 100, 100);
  elements.streakBar.style.width = `${progressPercentage}%`;
  
  // Update state
  appState.streak = {
    count: streak,
    target: 7,
    lastActive: today
  };
}

// Function to calculate days until next class for a subject
function calculateNextClassDay(subject) {
  // Get current day of the week (1-7, where 1 is Monday)
  const today = new Date();
  const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Convert Sunday (0) to 7
  
  // Default to the main schedule
  const schedule = appState.schedule.main;
  
  // If subject is not in schedule, return null (no scheduled class)
  if (!schedule[subject]) {
    return {
      daysUntilNextClass: null,
      nextClassDate: null,
      hasClassToday: false,
      hasClassTomorrow: false
    };
  }
  
  // Find the next occurrence of this subject
  const classDays = schedule[subject];
  
  // Check if subject has class today
  const hasClassToday = classDays.includes(currentDayOfWeek);
  
  // Check if subject has class tomorrow
  const tomorrowDayOfWeek = currentDayOfWeek === 7 ? 1 : currentDayOfWeek + 1;
  const hasClassTomorrow = classDays.includes(tomorrowDayOfWeek);
  
  // Find the next class day
  let nextClassDay = null;
  let daysUntil = Infinity;
  
  for (const classDay of classDays) {
    // Calculate days until this class day
    let daysDiff = classDay - currentDayOfWeek;
    
    // If it's negative, it means the class is next week
    if (daysDiff <= 0) {
      daysDiff += 7;
    }
    
    // If this class day is sooner than what we've found so far, update
    if (daysDiff < daysUntil) {
      daysUntil = daysDiff;
      nextClassDay = classDay;
    }
  }
  
  // Calculate the actual date of the next class
  const nextClassDate = new Date(today);
  nextClassDate.setDate(today.getDate() + daysUntil);
  
  return {
    daysUntilNextClass: daysUntil,
    nextClassDate,
    hasClassToday,
    hasClassTomorrow
  };
}

// Show or hide loading indicator
function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Save scroll position before leaving the page
function saveScrollPosition() {
  const scrollPosition = window.scrollY || document.documentElement.scrollTop;
  localStorage.setItem('scrollPosition', scrollPosition.toString());
  appState.lastScrollPosition = scrollPosition;
}

// Restore scroll position
function restoreScrollPosition() {
  const scrollPosition = localStorage.getItem('scrollPosition');
  if (scrollPosition) {
    // Use setTimeout to ensure the DOM is fully loaded
    setTimeout(() => {
      window.scrollTo(0, parseInt(scrollPosition, 10));
    }, 100);
  }
}

// Check if date is within the last 2 weeks
function isWithinTwoWeeks(dateString) {
  const now = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const taskDate = parseFinDate(dateString);
  return taskDate >= twoWeeksAgo;
}

// Format date for display
function formatDate(dateString) {
  const date = parseFinDate(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  
  if (date.getTime() === now.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', dateOptions);
  }
}

// Format completed date for display
function formatCompletedDate(dateString) {
  const date = parseFinDate(dateString);
  const dateOptions = { day: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-US', dateOptions);
}

// Parse Finnish format date (DD.MM.YYYY) to Date object
function parseFinDate(dateString) {
  if (!dateString) return new Date();
  
  const parts = dateString.split('.');
  if (parts.length !== 3) return new Date();
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const year = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

// Get quest title based on task type and subject
function getQuestTitle(task) {
  if (task.type === 'chore') {
    return 'Chore';
  } else {
    return task.subject || 'Quest';
  }
}

// Export functions for use in other modules
export {
  appState,
  loadData,
  renderTasks,
  completeTask,
  addChore,
  calculateNextClassDay
};
