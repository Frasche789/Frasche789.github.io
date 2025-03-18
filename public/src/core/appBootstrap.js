/**
 * appBootstrap.js - Simplified application bootstrap
 * Handles initialization in a clear sequence without excessive dependency management
 */

import { getState, setState } from '../state/appState.js';
import { initializeDomReferences } from '../utils/domUtils.js';
import { waitForFirebase } from '../services/firebaseService.js';
import { loadTasks, loadStudents } from '../services/taskService.js';
import { initializeRenderer, requestRender } from '../rendering/taskRenderer.js';
import { initializeEventListeners } from '../utils/eventUtils.js';

// Track initialization status
let initialized = false;

/**
 * Initialize the application in a controlled sequence
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeApp() {
  if (initialized) {
    console.log('App already initialized');
    return { success: true, initialized: true };
  }
  
  try {
    console.log('Starting application initialization...');
    
    // Step 1: Initialize DOM references
    console.log('Step 1: Initializing DOM references');
    const elements = initializeDomReferences();
    
    // Step 2: Initialize Firebase
    console.log('Step 2: Initializing Firebase');
    const firebase = await waitForFirebase();
    
    // Step 3: Load application data
    console.log('Step 3: Loading application data');
    const tasks = await loadTasks();
    const students = await loadStudents();
    
    // Step 4: Initialize rendering system
    console.log('Step 4: Initializing rendering system');
    const cleanupRenderer = initializeRenderer();
    
    // Step 5: Set up event listeners
    console.log('Step 5: Setting up event listeners');
    const cleanupEvents = initializeEventListeners();
    
    // Step 6: Initialize UI with loaded data
    console.log('Step 6: Initializing UI');
    if (elements.currentDateEl) {
      const today = new Date();
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      elements.currentDateEl.textContent = today.toLocaleDateString('en-US', options);
    }
    
    // Set student name if available
    const state = getState();
    if (elements.studentNameEl && state.students && state.students.length > 0) {
      elements.studentNameEl.textContent = 
        `${state.students[0].name}'s Task Board` || 'Task Board';
    }
    
    // Step 7: Initial render
    console.log('Step 7: Performing initial render');
    requestRender();
    
    // Mark as initialized and store cleanup functions
    initialized = true;
    setState({ 
      initialized: true, 
      cleanupFunctions: [cleanupRenderer, cleanupEvents],
      initTimestamp: Date.now()
    }, 'appInitialized');
    
    console.log('Application initialized successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error initializing application:', error);
    return { success: false, error };
  }
}

/**
 * Clean up application resources
 */
export function cleanupApp() {
  if (!initialized) return;
  
  try {
    const state = getState();
    if (state.cleanupFunctions && Array.isArray(state.cleanupFunctions)) {
      state.cleanupFunctions.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    }
    
    initialized = false;
    console.log('Application cleanup completed');
  } catch (error) {
    console.error('Error during application cleanup:', error);
  }
}