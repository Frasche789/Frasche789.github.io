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
  
  // Create a colored border based on subject or default
  const cardStyle = task.subject ? 
    `border-left: 4px solid ${color};` : 
    '';
  
  // Format the points display
  const pointsText = task.points ? `${task.points} pts` : '';
  
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
          ${pointsText ? `<div class="task-points">${pointsText}</div>` : ''}
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
 * @param {HTMLElement} cardElement - The existing card element
 * @param {Object} updatedTask - Updated task data 
 */
export function updateTaskCard(cardElement, updatedTask) {
  if (!cardElement || !updatedTask) return;
  
  // Update content
  cardElement.innerHTML = createTaskCardContent(updatedTask);
  
  // Update class for completed state
  if (updatedTask.completed) {
    cardElement.classList.add('completed-task');
  } else {
    cardElement.classList.remove('completed-task');
  }
  
  // Re-add event listeners if needed
  if (!updatedTask.completed) {
    const completeBtn = cardElement.querySelector('.complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Disable button to prevent multiple clicks
        completeBtn.disabled = true;
        
        try {
          // Complete the task in the backend
          await completeTask(updatedTask.id);
          
          // Play completion animation
          await playCompletionAnimation(cardElement);
          
          // Reload tasks or update UI
          document.dispatchEvent(new CustomEvent('task-completed', { 
            detail: { taskId: updatedTask.id } 
          }));
        } catch (error) {
          console.error('Error completing task:', error);
          // Re-enable button if completion failed
          completeBtn.disabled = false;
        }
      });
    }
  }
}
