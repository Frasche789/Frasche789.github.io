/**
 * app.js - Task Board ADHD-Optimized UI
 * Main entry point with simplified architecture
 */
// App configuration
export const appConfig = {
  tasks: {
    // Number of days after which tasks are automatically archived
    archiveThresholdDays: 7,
    
    // Task categorization settings
    categorization: {
      // Include tasks due tomorrow in current category
      includeTomorrowInCurrent: true
    }
  },
  ui: {
    // Animation settings
    animations: {
      enabled: true,
      reducedMotion: false
    }
  }
};

import { initializeDomReferences } from './utils/domUtils.js';
import { initializeRenderer } from '../../taskRenderer_legacy.js';
import { waitForFirebase } from './services/firebaseService.js';
import { loadTasks, loadStudents } from './services/taskService.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing app...');
  
  try {
    // Initialize DOM references first
    const elements = initializeDomReferences();
    
    // Initialize Firebase
    await waitForFirebase();
    
    // Initialize the renderer with DOM elements
    const cleanupRenderer = initializeRenderer(elements);
    
    // Load data after renderer is ready
    await loadTasks();
    await loadStudents();
    
    // Request initial render
    if (window.requestRender) {
      window.requestRender();
    }
    
    console.log('App initialization completed successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    
    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'Failed to initialize the application. Please reload the page.';
    errorMessage.style.position = 'fixed';
    errorMessage.style.top = '20px';
    errorMessage.style.left = '50%';
    errorMessage.style.transform = 'translateX(-50%)';
    errorMessage.style.padding = '10px 20px';
    errorMessage.style.backgroundColor = '#f44336';
    errorMessage.style.color = 'white';
    errorMessage.style.borderRadius = '4px';
    errorMessage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    errorMessage.style.zIndex = '1000';
    
    document.body.appendChild(errorMessage);
  }
  });

// Make the render request function globally available for event handlers
window.requestRender = requestRender;