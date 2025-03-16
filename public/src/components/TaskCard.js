/**
 * TaskCard.js - Task Card Component
 * Encapsulates the creation and event handling of individual task cards
 */

import { playCompletionAnimation } from '../utils/animationUtils.js';
import { getSubjectColor } from '../utils/subjectUtils.js';
import { completeTask } from '../services/taskService.js';

/**
 * Create a task card element
 * @param {Object} task - Task data
 * @param {Function} onCompleted - Callback when task is completed
 * @returns {HTMLElement} The task card DOM element
 */
export function createTaskCard(task, onCompleted) {
  const taskCard = document.createElement('div');
  taskCard.className = `task-card ${task.completed ? 'completed-task' : ''}`;
  taskCard.dataset.id = task.id;
  taskCard.dataset.type = task.type || 'unknown';
  
  // Add container class if available
  if (task.container) {
    taskCard.dataset.container = task.container;
  }
  
  // Add urgency class if available
  if (task.urgencyClass) {
    taskCard.classList.add(`urgency-${task.urgencyClass}-task`);
  }
  
  // Add container-specific class if available
  if (task.containerClass) {
    taskCard.classList.add(`container-${task.containerClass}-task`);
  }
  
  // Create and append content
  taskCard.innerHTML = createTaskCardContent(task);
  
  // Add event listeners
  if (!task.completed) {
    const completeBtn = taskCard.querySelector('.complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Disable button to prevent multiple clicks
        completeBtn.disabled = true;
        
        try {
          // Complete the task in the backend
          await completeTask(task.id);
          
          // Play completion animation
          await playCompletionAnimation(taskCard);
          
          // Callback to notify task completion
          if (onCompleted && typeof onCompleted === 'function') {
            onCompleted(task.id);
          }
        } catch (error) {
          console.error('Error completing task:', error);
          // Re-enable button if completion failed
          completeBtn.disabled = false;
        }
      });
    }
  }
  
  return taskCard;
}

/**
 * Generate the HTML content for a task card
 * @param {Object} task - Task data
 * @returns {string} HTML content
 */
function createTaskCardContent(task) {
  // Get subject color for styling
  const color = task.subject ? getSubjectColor(task.subject) : '#6c757d';
  
  // Create a colored border based on subject or container
  let cardStyle = '';
  
  // Prioritize container styling if available
  if (task.containerClass) {
    // Container colors are applied via CSS classes instead
    cardStyle = ''; // Let CSS handle container-specific styling
  } else if (task.subject) {
    cardStyle = `border-left: 4px solid ${color};`;
  }
  
  // Format the points display
  const pointsText = task.points ? `${task.points} pts` : '';
  
  // Format due date display
  const dueDateText = task.dueDate ? 
    `<div class="task-due-date">Due: ${task.dueDate}</div>` : 
    (task.calculatedDueDate ? `<div class="task-due-date calculated">Due: ${task.calculatedDueDate}</div>` : '');
  
  // Format creation date display
  const creationDateText = task.date ? 
    `<div class="task-creation-date">Created: ${task.date}</div>` : '';
  
  // Create the card content
  return `
    <div class="task-card-inner" style="${cardStyle}">
      <div class="task-card-content">
        <div class="task-card-header">
          ${task.subject ? `<div class="task-subject" style="background-color: ${color};">${task.subject}</div>` : ''}
          ${task.type === 'chore' ? '<div class="task-type">Chore</div>' : ''}
          ${task.completed ? '<div class="completed-stamp">DONE</div>' : ''}
        </div>
        <div class="task-description">${task.description}</div>
        <div class="task-meta">
          ${dueDateText}
          ${creationDateText}
          ${task.completed && task.completedDate ? 
            `<div class="task-completed-date">Completed: ${task.completedDate}</div>` : ''}
        </div>
      </div>
      ${!task.completed ? `
        <button class="complete-btn" aria-label="Complete task">
          <i class="ri-check-line"></i>
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Update an existing task card with new data
 * @param {HTMLElement} taskCard - Existing task card element
 * @param {Object} task - Updated task data
 * @param {Function} onCompleted - Callback when task is completed
 */
export function updateTaskCard(taskCard, task, onCompleted) {
  if (!taskCard) return;
  
  // Update classes
  if (task.completed) {
    taskCard.classList.add('completed-task');
  } else {
    taskCard.classList.remove('completed-task');
  }
  
  // Update container class if available
  if (task.container) {
    taskCard.dataset.container = task.container;
    
    // Remove old container classes
    const containerClasses = ['container-archive-task', 'container-current-task', 'container-future-task'];
    containerClasses.forEach(cls => taskCard.classList.remove(cls));
    
    // Add new container class
    taskCard.classList.add(`container-${task.container}-task`);
  }
  
  // Update urgency class if available
  if (task.urgencyClass) {
    // Remove old urgency classes
    const urgencyClasses = ['urgency-urgent-task', 'urgency-upcoming-task', 'urgency-later-task'];
    urgencyClasses.forEach(cls => taskCard.classList.remove(cls));
    
    // Add new urgency class
    taskCard.classList.add(`urgency-${task.urgencyClass}-task`);
  }
  
  // Update content
  taskCard.innerHTML = createTaskCardContent(task);
  
  // Re-add event listeners
  if (!task.completed) {
    const completeBtn = taskCard.querySelector('.complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Disable button to prevent multiple clicks
        completeBtn.disabled = true;
        
        try {
          // Complete the task in the backend
          await completeTask(task.id);
          
          // Play completion animation
          await playCompletionAnimation(taskCard);
          
          // Callback to notify task completion
          if (onCompleted && typeof onCompleted === 'function') {
            onCompleted(task.id);
          }
        } catch (error) {
          console.error('Error completing task:', error);
          // Re-enable button if completion failed
          completeBtn.disabled = false;
        }
      });
    }
  }
}
