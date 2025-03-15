/**
 * index.js - Main entry point
 * Exports all modules for easy access
 */

// Re-export utilities
export * from './utils/dateUtils.js';
export * from './utils/subjectUtils.js';
export * from './utils/animationUtils.js';

// Re-export state management
export * from './state/appState.js';

// Re-export services
export * from './services/firebaseService.js';
export * from './services/taskService.js';

// Re-export components
export * from './components/TaskCard.js';
export * from './components/TaskList.js';
export * from './components/TodayTasks.js';
export * from './components/StreakTracker.js';
export * from './components/ChoreModal.js';

// Re-export main app
export * from './app.js';

// Import the app to initialize it
import { initializeApp } from './app.js';

// Initialize app when DOM is fully loaded if not already handled
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded, initialize immediately
  initializeApp();
}
