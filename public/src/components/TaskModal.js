/**
 * TaskModal.js - Task Modal Component
 * Controls the modal for adding new tasks
 */

import { addTask, addHomework } from '../services/taskService.js';
import { getState, setState, dispatch } from '../state/appState.js';

// DOM elements cache
let taskModal = null;
let closeModalBtn = null;
let addTaskBtn = null;
let addTaskSubmitBtn = null;
let taskDescriptionInput = null;
let taskPointsInput = null;

/**
 * Initialize the Task Modal component
 * @param {Object} elements - DOM elements object
 */
export function initTaskModal(elements) {
  taskModal = elements.taskModal;
  closeModalBtn = elements.closeModalBtn;
  addTaskBtn = elements.addTaskBtn;
  addTaskSubmitBtn = elements.addTaskSubmitBtn;
  taskDescriptionInput = elements.taskDescriptionInput;
  taskPointsInput = elements.taskPointsInput;
  
  if (!taskModal || !closeModalBtn || !addTaskBtn || 
      !addTaskSubmitBtn || !taskDescriptionInput || !taskPointsInput) {
    console.error('Task modal elements not found');
    return;
  }
  
  // Add event listeners
  addEventListeners();
}

/**
 * Add event listeners for the task modal
 */
function addEventListeners() {
  // Show modal when add task button is clicked
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', showModal);
  }
  
  // Close modal when close button is clicked
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
  }
  
  // Submit form when add button is clicked
  if (addTaskSubmitBtn) {
    addTaskSubmitBtn.addEventListener('click', handleSubmit);
  }
  
  // Close modal when clicking outside
  if (taskModal) {
    taskModal.addEventListener('click', (e) => {
      // Only close if the click was directly on the modal background
      if (e.target === taskModal) {
        hideModal();
      }
    });
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Close modal on Escape key
    if (e.key === 'Escape' && isModalVisible()) {
      hideModal();
    }
    
    // Submit on Enter key when description input is focused
    if (e.key === 'Enter' && document.activeElement === taskDescriptionInput) {
      handleSubmit();
    }
  });
}

/**
 * Show the task modal
 */
export function showModal() {
  if (!taskModal) return;
  
  // Show the modal
  taskModal.style.display = 'flex';
  
  // Focus the description input for immediate typing
  if (taskDescriptionInput) {
    taskDescriptionInput.focus();
    
    // Clear any previous input
    taskDescriptionInput.value = '';
  }
  
  // Disable scrolling on the body when modal is open
  document.body.style.overflow = 'hidden';
  
  // Update state to reflect modal is open
  setState({ modalOpen: true }, 'taskModal');
}

/**
 * Hide the task modal
 */
export function hideModal() {
  if (!taskModal) return;
  
  // Hide the modal
  taskModal.style.display = 'none';
  
  // Re-enable scrolling on the body
  document.body.style.overflow = '';
  
  // Update state to reflect modal is closed
  setState({ modalOpen: false }, 'taskModal');
}

/**
 * Check if the modal is currently visible
 * @returns {boolean} Whether the modal is visible
 */
export function isModalVisible() {
  return taskModal && taskModal.style.display === 'flex';
}

/**
 * Handle task form submission
 */
async function handleSubmit() {
  if (!taskDescriptionInput) return;
  
  // Get input values
  const description = taskDescriptionInput.value.trim();
  
  // Validate inputs
  if (!description) {
    // Flash the input to indicate error
    taskDescriptionInput.classList.add('error');
    setTimeout(() => taskDescriptionInput.classList.remove('error'), 800);
    return;
  }
  
  // Disable submit button and show loading state
  if (addTaskSubmitBtn) {
    addTaskSubmitBtn.disabled = true;
    addTaskSubmitBtn.innerHTML = '<i class="ri-loader-4-line rotating"></i> Adding...';
  }
  
  try {
    // Add the task using the task service
    await addTask({
      description,
    });
    
    // Hide the modal
    hideModal();
    
    // Show success notification via state
    setState({
      notification: {
        message: 'Task added successfully!',
        type: 'success',
        timestamp: Date.now()
      }
    }, 'taskAdded');
    
  } catch (error) {
    console.error('Error adding task:', error);
    
    // Show error notification via state
    setState({
      notification: {
        message: 'Failed to add task. Please try again.',
        type: 'error',
        timestamp: Date.now()
      }
    }, 'taskAddFailed');
  } finally {
    // Re-enable submit button
    if (addTaskSubmitBtn) {
      addTaskSubmitBtn.disabled = false;
      addTaskSubmitBtn.innerHTML = 'Add Task';
    }
  }
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - Type of notification ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
  // Use state management to display notification
  setState({
    notification: {
      message,
      type,
      timestamp: Date.now()
    }
  }, 'notification');
}
