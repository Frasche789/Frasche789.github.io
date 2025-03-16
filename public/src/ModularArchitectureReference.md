# Quest Board ES Module Architecture Reference

## Architecture Overview

The Quest Board application implements a modern ES Module architecture using browser-native module functionality without any build tooling or bundling. This approach provides code organization benefits while maintaining simplicity and direct browser compatibility.

## Directory Structure

```
public/
├── index.html            # Main HTML entry point
├── styles.css            # Global styles
├── src/
│   ├── index.js          # Application entry point
│   ├── app.js            # Main application orchestration
│   ├── components/       # UI components
│   │   ├── ChoreModal.js
│   │   ├── StreakTracker.js
│   │   ├── TaskCard.js
│   │   ├── TaskList.js
│   │   └── TodayTasks.js
│   ├── services/         # Data and business logic
│   │   ├── firebaseService.js
│   │   └── taskService.js
│   ├── state/            # Application state management
│   │   └── appState.js
│   └── utils/            # Utility functions
│       ├── animationUtils.js
│       ├── dateUtils.js
│       └── subjectUtils.js
```

## Module Integration Pattern

### Entry Point Configuration

The application entry point is `index.js`, which handles initialization and orchestrates module loading:

```javascript
// src/index.js
import { initializeApp } from './app.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
```

### Module Import/Export Pattern

All modules use explicit relative paths with `.js` extensions:

```javascript
// Component module example
import { getState, setState } from '../state/appState.js';
import { completeTask } from '../services/taskService.js';

export function createTaskCard(task) {
  // Implementation
}
```

## Critical Integration Points

### Firebase Initialization

Firebase initialization is handled in `src/services/firebaseService.js` which provides a centralized interface for all Firebase operations:

```javascript
// Wait for Firebase to be initialized
await waitForFirebase();

// Use Firebase services
const tasks = await loadTasks();
```

### State Management

Application state is centralized in `src/state/appState.js` which implements a simple pub/sub pattern:

```javascript
// Get current state
const state = getState();

// Update state
setState({ activeFilter: 'today' });

// Subscribe to state changes
subscribe((newState, oldState, info) => {
  if (info.changedPaths.includes('tasks')) {
    renderTasks();
  }
});
```

### Event Delegation

Event handling is organized by component:

```javascript
// Initialize event listeners for a component
function initializeEventListeners() {
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Handle event
    });
  });
}
```

## Performance Optimization

### Critical Path Loading

The application uses module preloading for critical path modules:

```html
<link rel="modulepreload" href="./src/app.js">
<link rel="modulepreload" href="./src/services/firebaseService.js">
```

### Lazy Loading

Non-critical modules are loaded on-demand:

```javascript
// Lazy load animations only when needed
import('./utils/animationUtils.js').then(module => {
  const { createConfetti } = module;
  createConfetti();
});
```

## Migration Strategy

1. Create modular structure mirroring existing functionality
2. Implement Firebase integration in modular pattern
3. Update HTML to reference module entry point
4. Verify all functionality through modular implementation
5. Remove legacy implementation

## Browser Compatibility

The application targets modern browsers with native ES module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

No transpilation or polyfills are required for these browsers.