/**
 * TaskCard.js - Task Card Component
 * Encapsulates the creation and event handling of individual task cards
 */

import { playCompletionAnimation } from '../utils/animationUtils.js';
import { getSubjectColor } from '../utils/subjectUtils.js';
import { completeTask } from '../services/taskService.js';
import { getState, setState, dispatch } from '../state/appState.js';
import { getTodayFinDate } from '../utils/dateUtils.js';

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
  
  // Add exam-specific class if it's an exam type
  if (task.type === 'exam') {
    taskCard.classList.add('exam-task');
    
    // Check if the exam is due today or tomorrow
    const todayFormatted = getTodayFinDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = `${String(tomorrow.getDate()).padStart(2, '0')}.${String(tomorrow.getMonth() + 1).padStart(2, '0')}.${tomorrow.getFullYear()}`;
    
    const dueDate = task.dueDate || task.due_date;
    
    if (dueDate === todayFormatted) {
      taskCard.classList.add('exam-due-today');
    } else if (dueDate === tomorrowFormatted) {
      taskCard.classList.add('exam-due-tomorrow');
    }
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
          // Update state to reflect task is being completed
          setState(state => {
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? { ...t, completing: true } : t
            );
            return { tasks: updatedTasks };
          }, 'taskCompletionStarted');
          
          // Complete the task in the backend
          await completeTask(task.id);
          
          // Play completion animation
          await playCompletionAnimation(taskCard);
          
          // Update state to reflect task is completed
          setState(state => {
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? { ...t, completed: true, completing: false, completedDate: new Date().toLocaleDateString() } : t
            );
            return { tasks: updatedTasks };
          }, 'taskCompleted');
          
          // Dispatch event for other components
          dispatch('task-completed', { taskId: task.id, task });
          
          // Callback to notify task completion if provided
          if (onCompleted && typeof onCompleted === 'function') {
            onCompleted(task.id);
          }
        } catch (error) {
          console.error('Error completing task:', error);
          
          // Update state to reflect completion failed
          setState(state => {
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? { ...t, completing: false } : t
            );
            return { 
              tasks: updatedTasks,
              notification: {
                message: 'Failed to complete task. Please try again.',
                type: 'error',
                timestamp: Date.now()
              }
            };
          }, 'taskCompletionFailed');
          
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
  
  // Format due date display
  const dueDateText = task.dueDate ? 
    `<div class="task-due-date">Due: ${task.dueDate}</div>` : '';
  
  // Format creation date display
  const creationDateText = task.date ? 
    `<div class="task-creation-date">Created: ${task.date}</div>` : '';
  
  // Check if exam is due today or tomorrow
  let examBadgeText = 'EXAM';
  if (task.type === 'exam') {
    const todayFormatted = getTodayFinDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = `${String(tomorrow.getDate()).padStart(2, '0')}.${String(tomorrow.getMonth() + 1).padStart(2, '0')}.${tomorrow.getFullYear()}`;
    
    const dueDate = task.dueDate || task.due_date;
    
    if (dueDate === todayFormatted) {
      examBadgeText = 'EXAM TODAY';
    } else if (dueDate === tomorrowFormatted) {
      examBadgeText = 'EXAM TOMORROW';
    }
  }
  
  // Create the card content
  return `
    <div class="task-card-inner" style="${cardStyle}">
      <div class="task-card-content">
        <div class="task-card-header">
          ${task.subject ? `<div class="task-subject" style="background-color: ${color};">${task.subject}</div>` : ''}
          ${task.type === 'chore' ? '<div class="task-type task-badge">Task</div>' : ''}
          ${task.type === 'exam' ? `<div class="task-type exam-badge">${examBadgeText}</div>` : ''}
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
        <button class="complete-btn" aria-label="Complete task" ${task.completing ? 'disabled' : ''}>
          ${task.completing ? '<i class="ri-loader-4-line rotating"></i>' : '<i class="ri-check-line"></i>'}
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
          // Update state to reflect task is being completed
          setState(state => {
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? { ...t, completing: true } : t
            );
            return { tasks: updatedTasks };
          }, 'taskCompletionStarted');
          
          // Complete the task in the backend
          await completeTask(task.id);
          
          // Play completion animation
          await playCompletionAnimation(taskCard);
          
          // Update state to reflect task is completed
          setState(state => {
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? { ...t, completed: true, completing: false, completedDate: new Date().toLocaleDateString() } : t
            );
            return { tasks: updatedTasks };
          }, 'taskCompleted');
          
          // Dispatch event for other components
          dispatch('task-completed', { taskId: task.id, task });
          
          // Callback to notify task completion if provided
          if (onCompleted && typeof onCompleted === 'function') {
            onCompleted(task.id);
          }
        } catch (error) {
          console.error('Error completing task:', error);
          
          // Update state to reflect completion failed
          setState(state => {
            const updatedTasks = state.tasks.map(t => 
              t.id === task.id ? { ...t, completing: false } : t
            );
            return { 
              tasks: updatedTasks,
              notification: {
                message: 'Failed to complete task. Please try again.',
                type: 'error',
                timestamp: Date.now()
              }
            };
          }, 'taskCompletionFailed');
          
          // Re-enable button if completion failed
          completeBtn.disabled = false;
        }
      });
    }
  }
}
