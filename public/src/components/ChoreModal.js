/**
 * ChoreModal.js - Chore Modal Component
 * Controls the modal for adding new chores
 */

import { addChore } from '../services/taskService.js';
import { getState, setState, dispatch } from '../state/appState.js';

// DOM elements cache
let choreModal = null;
let closeModalBtn = null;
let addChoreBtn = null;
let addChoreSubmitBtn = null;
let choreDescriptionInput = null;
let chorePointsInput = null;

/**
 * Initialize the Chore Modal component
 * @param {Object} elements - DOM elements object
 */
export function initChoreModal(elements) {
  choreModal = elements.choreModal;
  closeModalBtn = elements.closeModalBtn;
  addChoreBtn = elements.addChoreBtn;
  addChoreSubmitBtn = elements.addChoreSubmitBtn;
  choreDescriptionInput = elements.choreDescriptionInput;
  chorePointsInput = elements.chorePointsInput;
  
  if (!choreModal || !closeModalBtn || !addChoreBtn || 
      !addChoreSubmitBtn || !choreDescriptionInput || !chorePointsInput) {
    console.error('Chore modal elements not found');
    return;
  }
  
  // Add event listeners
  addEventListeners();
}

/**
 * Add event listeners for the chore modal
 */
function addEventListeners() {
  // Show modal when add chore button is clicked
  if (addChoreBtn) {
    addChoreBtn.addEventListener('click', showModal);
  }
  
  // Close modal when close button is clicked
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
  }
  
  // Submit form when add button is clicked
  if (addChoreSubmitBtn) {
    addChoreSubmitBtn.addEventListener('click', handleSubmit);
  }
  
  // Close modal when clicking outside
  if (choreModal) {
    choreModal.addEventListener('click', (e) => {
      // Only close if the click was directly on the modal background
      if (e.target === choreModal) {
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
    if (e.key === 'Enter' && document.activeElement === choreDescriptionInput) {
      handleSubmit();
    }
  });
}

/**
 * Show the chore modal
 */
export function showModal() {
  if (!choreModal) return;
  
  // Show the modal
  choreModal.style.display = 'flex';
  
  // Focus the description input for immediate typing
  if (choreDescriptionInput) {
    choreDescriptionInput.focus();
    
    // Clear any previous input
    choreDescriptionInput.value = '';
  }
  
  // Reset points to default value
  if (chorePointsInput) {
    chorePointsInput.value = '5';
  }
  
  // Disable scrolling on the body when modal is open
  document.body.style.overflow = 'hidden';
  
  // Update state to reflect modal is open
  setState({ modalOpen: true }, 'choreModal');
}

/**
 * Hide the chore modal
 */
export function hideModal() {
  if (!choreModal) return;
  
  // Hide the modal
  choreModal.style.display = 'none';
  
  // Re-enable scrolling on the body
  document.body.style.overflow = '';
  
  // Update state to reflect modal is closed
  setState({ modalOpen: false }, 'choreModal');
}

/**
 * Check if the modal is currently visible
 * @returns {boolean} Whether the modal is visible
 */
export function isModalVisible() {
  return choreModal && choreModal.style.display === 'flex';
}

/**
 * Handle chore form submission
 */
async function handleSubmit() {
  if (!choreDescriptionInput || !chorePointsInput) return;
  
  // Get input values
  const description = choreDescriptionInput.value.trim();
  const points = parseInt(chorePointsInput.value, 10);
  
  // Validate inputs
  if (!description) {
    // Flash the input to indicate error
    choreDescriptionInput.classList.add('error');
    setTimeout(() => choreDescriptionInput.classList.remove('error'), 800);
    return;
  }
  
  if (isNaN(points) || points < 1) {
    // Set a default value if invalid
    chorePointsInput.value = '5';
  }
  
  // Disable submit button and show loading state
  if (addChoreSubmitBtn) {
    addChoreSubmitBtn.disabled = true;
    addChoreSubmitBtn.innerHTML = '<i class="ri-loader-4-line rotating"></i> Adding...';
  }
  
  try {
    // Add the chore using the task service
    await addChore({
      description,
      points: points || 5
    });
    
    // Hide the modal
    hideModal();
    
    // Show success notification via state
    setState({
      notification: {
        message: 'Chore added successfully!',
        type: 'success',
        timestamp: Date.now()
      }
    }, 'choreAdded');
    
  } catch (error) {
    console.error('Error adding chore:', error);
    
    // Show error notification via state
    setState({
      notification: {
        message: 'Failed to add chore. Please try again.',
        type: 'error',
        timestamp: Date.now()
      }
    }, 'choreAddFailed');
  } finally {
    // Re-enable submit button
    if (addChoreSubmitBtn) {
      addChoreSubmitBtn.disabled = false;
      addChoreSubmitBtn.innerHTML = 'Add Chore';
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
