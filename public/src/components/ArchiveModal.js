/**
 * ArchiveModal.js - Archive Modal Component
 * Displays completed tasks and tasks older than 2 weeks in a modal popup
 */

import { createTaskCard } from './TaskCard.js';

// DOM elements cache
let modalElement = null;
let modalOverlayElement = null;
let modalContentElement = null;
let closeButtonElement = null;

/**
 * Initialize the archive modal
 */
export function initArchiveModal() {
  // Create modal elements if they don't exist
  if (!modalElement) {
    createModalElements();
  }
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Create modal DOM elements
 */
function createModalElements() {
  // Create modal overlay (background)
  modalOverlayElement = document.createElement('div');
  modalOverlayElement.className = 'modal-overlay hidden';
  
  // Create modal container
  modalElement = document.createElement('div');
  modalElement.className = 'archive-modal hidden';
  modalElement.setAttribute('role', 'dialog');
  modalElement.setAttribute('aria-modal', 'true');
  modalElement.setAttribute('aria-labelledby', 'archive-modal-title');
  
  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  
  const modalTitle = document.createElement('h2');
  modalTitle.id = 'archive-modal-title';
  modalTitle.textContent = 'Archive';
  
  closeButtonElement = document.createElement('button');
  closeButtonElement.className = 'modal-close-btn';
  closeButtonElement.setAttribute('aria-label', 'Close archive');
  closeButtonElement.innerHTML = '<i class="ri-close-line"></i>';
  
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButtonElement);
  
  // Create modal content container
  modalContentElement = document.createElement('div');
  modalContentElement.className = 'modal-content';
  
  // Assemble modal
  modalElement.appendChild(modalHeader);
  modalElement.appendChild(modalContentElement);
  
  // Add to DOM
  document.body.appendChild(modalOverlayElement);
  document.body.appendChild(modalElement);
}

/**
 * Set up event listeners for modal interaction
 */
function setupEventListeners() {
  // Close button click
  if (closeButtonElement) {
    closeButtonElement.addEventListener('click', closeArchiveModal);
  }
  
  // Background overlay click to close
  if (modalOverlayElement) {
    modalOverlayElement.addEventListener('click', closeArchiveModal);
  }
  
  // Escape key to close
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeArchiveModal();
    }
  });
  
  // Prevent clicks inside modal from closing it
  if (modalElement) {
    modalElement.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
}

/**
 * Open the archive modal and display archived tasks
 * @param {Array} archiveTasks - Array of archived tasks to display
 */
export function openArchiveModal(archiveTasks) {
  if (!modalElement || !modalContentElement || !modalOverlayElement) {
    console.error('Archive modal elements not initialized');
    initArchiveModal();
  }
  
  // Clear previous content
  modalContentElement.innerHTML = '';
  
  if (!archiveTasks || !Array.isArray(archiveTasks) || archiveTasks.length === 0) {
    // No tasks to display
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-icon">
        <i class="ri-archive-line"></i>
      </div>
      <div class="empty-message">No archived tasks found</div>
    `;
    modalContentElement.appendChild(emptyState);
  } else {
    // Create task list container
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'archive-tasks-container';
    
    // Add tasks
    archiveTasks.forEach(task => {
      const taskCard = createTaskCard(task, (taskId) => {
        // We could update archive display when task is completed, but it's usually already completed
        console.log(`Archive task action: ${taskId}`);
      });
      
      // Add to container
      tasksContainer.appendChild(taskCard);
    });
    
    modalContentElement.appendChild(tasksContainer);
  }
  
  // Show modal with animation
  modalOverlayElement.classList.remove('hidden');
  modalElement.classList.remove('hidden');
  
  // Add visible classes with slight delay for animation
  setTimeout(() => {
    modalOverlayElement.classList.add('visible');
    modalElement.classList.add('visible');
  }, 10);
  
  // Focus the modal for accessibility
  modalElement.focus();
}

/**
 * Close the archive modal
 */
export function closeArchiveModal() {
  if (!modalElement || !modalOverlayElement) return;
  
  // Remove visible class first (triggers transition)
  modalOverlayElement.classList.remove('visible');
  modalElement.classList.remove('visible');
  
  // Hide completely after transition
  setTimeout(() => {
    modalOverlayElement.classList.add('hidden');
    modalElement.classList.add('hidden');
  }, 300); // Match transition duration in CSS
}
