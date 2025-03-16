/**
 * index.js - Main entry point for Quest Board application
 * Implements ES module architecture with direct browser loading
 */

// Import the app initialization function
import { initializeApp } from './app.js';

// Initialize the application when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded, initialize immediately
  initializeApp();
}

// Note: We're not re-exporting all modules here as was done previously
// This follows a more direct import approach where modules
// import exactly what they need from other modules
