/**
 * index.js - Main entry point for Quest Board application
 * Implements bootstrap sequence with explicit dependency graph
 */

// Import the bootstrap module and service initializers
import { bootstrap, subscribeToBootstrap, StepStatus } from './bootstrap.js';

// Import initializer modules to register their steps
// (The imports themselves register the steps via side effects)
import './services/firebaseService.js';
import './services/taskInit.js';
import './ui/uiInit.js';
import './ui/renderInit.js';
import './app.js'; // Import app.js to register its initialization steps

// Initialize the application when the DOM is fully loaded
function initializeApplication() {
  // Subscribe to bootstrap events for debugging
  subscribeToBootstrap('bootstrap:completed', ({ success, results }) => {
    console.log('Application bootstrap completed successfully:', results);
  });
  
  subscribeToBootstrap('bootstrap:failed', ({ error }) => {
    console.error('Application bootstrap failed:', error);
  });
  
  subscribeToBootstrap('step:failed', ({ id, name, error }) => {
    console.error(`Initialization step ${name} (${id}) failed:`, error);
  });
  
  // Start the bootstrap process
  bootstrap()
    .then(({ success, results }) => {
      if (success) {
        console.log('All initialization steps completed successfully');
      } else {
        console.error('Some initialization steps failed');
      }
    })
    .catch(error => {
      console.error('Critical error during bootstrap:', error);
    });
}

// Initialize the application when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  // DOM already loaded, initialize immediately
  initializeApplication();
}
