/**
 * UrgencyTaskList.js - Urgency-based Task List Component
 * Renders tasks in immediate (today/tomorrow) and later containers
 * Optimized for users with ADHD/autism with clear visual prioritization
 */

import { createTaskCard } from './TaskCard.js';
import { dispatch } from '../state/appState.js';

/**
 * Create the immediate tasks container (today and tomorrow)
 * @param {Object} immediateTasks - Object containing today and tomorrow tasks
 * @param {Array} immediateTasks.today - Tasks due today or overdue
 * @param {Array} immediateTasks.tomorrow - Tasks due tomorrow
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 * @returns {HTMLElement} The immediate tasks container element
 */
export function createImmediateTasksContainer(immediateTasks, onTaskCompleted) {
  // Create main container for immediate tasks
  const container = document.createElement('div');
  container.className = 'immediate-tasks-container task-day';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'task-day-header';
  header.innerHTML = `
    <h3 class="task-day-title">Do it now</h3>
    <div class="task-day-subtitle">Tasks that need immediate attention</div>
  `;
  container.appendChild(header);
  
  // Check if we have any immediate tasks
  const hasTodayTasks = immediateTasks.today && immediateTasks.today.length > 0;
  const hasTomorrowTasks = immediateTasks.tomorrow && immediateTasks.tomorrow.length > 0;
  
  if (!hasTodayTasks && !hasTomorrowTasks) {
    // Show empty state if no immediate tasks
    const emptyState = createEmptyState('Nothing urgent to do right now!');
    container.appendChild(emptyState);
    return container;
  }
  
  // Create content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'urgency-content-wrapper';
  
  // Create today's tasks section if there are tasks due today
  if (hasTodayTasks) {
    const todaySection = createUrgencySection('Today', 'urgent', immediateTasks.today, onTaskCompleted);
    contentWrapper.appendChild(todaySection);
  }
  
  // Create tomorrow's tasks section if there are tasks due tomorrow
  if (hasTomorrowTasks) {
    const tomorrowSection = createUrgencySection('Tomorrow', 'upcoming', immediateTasks.tomorrow, onTaskCompleted);
    contentWrapper.appendChild(tomorrowSection);
  }
  
  container.appendChild(contentWrapper);
  return container;
}

/**
 * Create the later tasks container
 * @param {Array} laterTasks - Tasks due after tomorrow
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 * @returns {HTMLElement} The later tasks container element
 */
export function createLaterTasksContainer(laterTasks, onTaskCompleted) {
  // Create main container for later tasks
  const container = document.createElement('div');
  container.className = 'later-tasks-container task-day';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'task-day-header';
  header.innerHTML = `
    <h3 class="task-day-title">Coming up</h3>
    <div class="task-day-subtitle">Tasks you'll need to handle later</div>
  `;
  container.appendChild(header);
  
  // Check if we have any later tasks
  if (!laterTasks || laterTasks.length === 0) {
    // Show empty state if no later tasks
    const emptyState = createEmptyState('No upcoming tasks scheduled!');
    container.appendChild(emptyState);
    return container;
  }
  
  // Create later section
  const laterSection = createUrgencySection('Later', 'later', laterTasks, onTaskCompleted);
  container.appendChild(laterSection);
  
  return container;
}

/**
 * Create a section for a specific urgency level
 * @param {string} title - Section title (Today, Tomorrow, Later)
 * @param {string} urgencyClass - CSS class for styling
 * @param {Array} tasks - Tasks for this section
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 * @returns {HTMLElement} The section element
 */
function createUrgencySection(title, urgencyClass, tasks, onTaskCompleted) {
  const section = document.createElement('div');
  section.className = `urgency-section urgency-${urgencyClass}`;
  
  // Create section header
  const sectionHeader = document.createElement('div');
  sectionHeader.className = 'urgency-section-header';
  sectionHeader.innerHTML = `<h4 class="urgency-section-title">${title}</h4>`;
  
  // Add count badge if there are tasks
  if (tasks && tasks.length > 0) {
    const countBadge = document.createElement('span');
    countBadge.className = 'task-count-badge';
    countBadge.textContent = tasks.length;
    sectionHeader.appendChild(countBadge);
  }
  
  section.appendChild(sectionHeader);
  
  // Create task list
  const taskList = document.createElement('div');
  taskList.className = 'task-list';
  
  // Add tasks to the list
  tasks.forEach(task => {
    // Add urgency class to task for styling
    const taskWithUrgency = { 
      ...task, 
      urgencyClass 
    };
    
    const taskCard = createTaskCard(taskWithUrgency, (taskId) => {
      if (onTaskCompleted && typeof onTaskCompleted === 'function') {
        onTaskCompleted(taskId);
      }
      
      // Also dispatch a global event
      dispatch('task-completed', { taskId, task });
    });
    
    // Add urgency-specific class to the task card
    taskCard.classList.add(`urgency-${urgencyClass}-task`);
    
    // Add special class for overdue tasks
    if (task.urgencyCategory === 'overdue') {
      taskCard.classList.add('overdue-task');
    }
    
    taskList.appendChild(taskCard);
  });
  
  section.appendChild(taskList);
  return section;
}

/**
 * Create an empty state container when no tasks are available
 * @param {string} message - Message to display
 * @returns {HTMLElement} Empty state container
 */
function createEmptyState(message = 'No tasks found') {
  const container = document.createElement('div');
  container.className = 'empty-state-container';
  
  container.innerHTML = `
    <div class="empty-state-content">
      <i class="ri-emotion-happy-line"></i>
      <h3>All done!</h3>
      <p>${message}</p>
    </div>
  `;
  
  return container;
}

/**
 * Update tasks in an existing urgency container
 * @param {HTMLElement} container - The container element to update
 * @param {string} urgencyLevel - Urgency level to update ('today', 'tomorrow', or 'later')
 * @param {Array} updatedTasks - Updated tasks data
 * @param {Function} onTaskCompleted - Callback for when a task is completed
 */
export function updateUrgencyTaskList(container, urgencyLevel, updatedTasks, onTaskCompleted) {
  if (!container) return;
  
  // Find the urgency section to update
  let section;
  if (urgencyLevel === 'later') {
    section = container.querySelector('.urgency-later');
  } else {
    section = container.querySelector(`.urgency-${urgencyLevel === 'today' ? 'urgent' : 'upcoming'}`);
  }
  
  if (!section) return;
  
  // Clear existing tasks
  const taskList = section.querySelector('.task-list');
  if (!taskList) return;
  
  taskList.innerHTML = '';
  
  // Update task count badge
  const countBadge = section.querySelector('.task-count-badge');
  if (countBadge) {
    countBadge.textContent = updatedTasks.length;
  }
  
  // Add updated tasks
  updatedTasks.forEach(task => {
    // Add urgency class to task for styling
    const urgencyClass = urgencyLevel === 'today' ? 'urgent' : 
                          urgencyLevel === 'tomorrow' ? 'upcoming' : 'later';
    
    const taskWithUrgency = { 
      ...task, 
      urgencyClass 
    };
    
    const taskCard = createTaskCard(taskWithUrgency, (taskId) => {
      if (onTaskCompleted && typeof onTaskCompleted === 'function') {
        onTaskCompleted(taskId);
      }
      
      // Also dispatch a global event
      dispatch('task-completed', { taskId, task });
    });
    
    // Add urgency-specific class to the task card
    taskCard.classList.add(`urgency-${urgencyClass}-task`);
    
    // Add special class for overdue tasks
    if (task.urgencyCategory === 'overdue') {
      taskCard.classList.add('overdue-task');
    }
    
    taskList.appendChild(taskCard);
  });
}
