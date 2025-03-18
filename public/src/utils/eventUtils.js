/**
 * eventUtils.js - Unified event handling system
 * Centralizes DOM event listeners and UI interactions
 */

import { getElements } from './domUtils.js';
import { getState, setState } from '../state/appState.js';
import { requestRender } from '../rendering/taskRenderer.js';

// Collection of active event listeners for cleanup
const listeners = [];

/**
 * Initialize all UI event listeners
 * @returns {Function} Cleanup function to remove event listeners
 */
export function initializeEventListeners() {
  const elements = getElements();
  
  // Archive toggle
  if (elements.archiveToggle) {
    const handler = () => {
      const state = getState();
      setState({ showArchive: !state.showArchive }, 'archiveToggle');
      
      // Update button text
      const textSpan = elements.archiveToggle.querySelector('span:first-of-type');
      if (textSpan) {
        textSpan.textContent = !state.showArchive ? 'Hide Archive' : 'Show Archive';
      }
    };
    
    elements.archiveToggle.addEventListener('click', handler);
    listeners.push({ element: elements.archiveToggle, type: 'click', handler });
  }
  
  // Add Task button (if it exists)
  if (elements.addTaskBtn && elements.taskModal) {
    const handler = () => {
      elements.taskModal.style.display = 'flex';
      if (elements.taskDescriptionInput) {
        elements.taskDescriptionInput.focus();
      }
    };
    
    elements.addTaskBtn.addEventListener('click', handler);
    listeners.push({ element: elements.addTaskBtn, type: 'click', handler });
  }
  
  // Close modal button
  if (elements.closeModalBtn && elements.taskModal) {
    const handler = () => {
      elements.taskModal.style.display = 'none';
    };
    
    elements.closeModalBtn.addEventListener('click', handler);
    listeners.push({ element: elements.closeModalBtn, type: 'click', handler });
  }
  
  // Global keyboard events
  const keyboardHandler = (e) => {
    // Close modal on Escape
    if (e.key === 'Escape' && elements.taskModal && 
        elements.taskModal.style.display === 'flex') {
      elements.taskModal.style.display = 'none';
    }
  };
  
  document.addEventListener('keydown', keyboardHandler);
  listeners.push({ element: document, type: 'keydown', handler: keyboardHandler });
  
  // Return cleanup function
  return () => {
    listeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    listeners.length = 0;
  };
}