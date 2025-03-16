/**
 * appState.js - Core state management for Quest Board
 * Defines the application state structure and default values
 */

// Initial application state
export const initialState = {
  students: [],
  tasks: [],
  activeFilter: 'all', 
  filteredLists: {},
  showRecentOnly: false, 
  showArchive: false
};

// Create subscribers collections
const subscribers = {
  // Global subscribers (all state changes)
  global: [],
  
  // Path-specific subscribers
  paths: {},
  
  // Event-based subscribers
  events: {}
};

// The current state (private)
let _state = { ...initialState };

/**
 * Get the current state (immutable copy)
 * @returns {Object} A copy of the current state
 */
export function getState() {
  return { ..._state };
}

/**
 * Get a specific slice of the state
 * @param {string} path - Dot-notation path to the state property
 * @returns {any} The state value at the specified path
 */
export function getStateSlice(path) {
  if (!path) return getState();
  
  return path.split('.').reduce((obj, prop) => {
    return obj && obj[prop] !== undefined ? obj[prop] : undefined;
  }, _state);
}

/**
 * Update the state with a partial state object or function
 * @param {Object|Function} update - Partial state object or function that receives current state and returns updates
 * @param {string} [source] - Optional source identifier for debugging/tracking
 * @returns {Object} The new state
 */
export function setState(update, source = 'unknown') {
  const prevState = { ..._state };
  
  // Handle function or object updates
  if (typeof update === 'function') {
    _state = { ..._state, ...update(_state) };
  } else {
    _state = { ..._state, ...update };
  }
  
  // Find changed paths
  const changedPaths = findChangedPaths(prevState, _state);
  
  // Notify subscribers
  notifySubscribers(prevState, _state, changedPaths, source);
  
  return { ..._state };
}

/**
 * Subscribe to state changes
 * @param {Function} callback - Function to call on state change
 * @param {Object} options - Subscription options
 * @param {string} [options.path] - Dot-notation path to listen for changes
 * @param {string} [options.event] - Event name to listen for
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback, options = {}) {
  if (!callback || typeof callback !== 'function') {
    console.error('Invalid subscriber callback');
    return () => {};
  }
  
  const { path, event } = options;
  
  // Subscribe to a specific path
  if (path) {
    if (!subscribers.paths[path]) {
      subscribers.paths[path] = [];
    }
    subscribers.paths[path].push(callback);
    
    return () => {
      subscribers.paths[path] = subscribers.paths[path].filter(cb => cb !== callback);
    };
  }
  
  // Subscribe to a specific event
  if (event) {
    if (!subscribers.events[event]) {
      subscribers.events[event] = [];
    }
    subscribers.events[event].push(callback);
    
    return () => {
      subscribers.events[event] = subscribers.events[event].filter(cb => cb !== callback);
    };
  }
  
  // Global subscription (all state changes)
  subscribers.global.push(callback);
  
  return () => {
    subscribers.global = subscribers.global.filter(cb => cb !== callback);
  };
}

/**
 * Dispatch an event to subscribers
 * @param {string} eventName - Name of the event
 * @param {any} payload - Event payload
 */
export function dispatch(eventName, payload) {
  if (!eventName) {
    console.error('Event name is required');
    return;
  }
  
  // Notify event subscribers
  if (subscribers.events[eventName]) {
    subscribers.events[eventName].forEach(callback => {
      try {
        callback(payload, eventName);
      } catch (error) {
        console.error(`Error in event subscriber for ${eventName}:`, error);
      }
    });
  }
}

/**
 * Reset the state to initial values
 */
export function resetState() {
  setState(initialState, 'reset');
}

/**
 * Find changed paths between two state objects
 * @param {Object} prevState - Previous state
 * @param {Object} newState - New state
 * @param {string} basePath - Base path for recursion
 * @param {Array} results - Accumulator for results
 * @returns {Array} Array of dot-notation paths that changed
 */
function findChangedPaths(prevState, newState, basePath = '', results = []) {
  // Different types means the entire path changed
  if (typeof prevState !== typeof newState) {
    results.push(basePath);
    return results;
  }
  
  // Handle non-objects (primitives)
  if (typeof prevState !== 'object' || prevState === null || newState === null) {
    if (prevState !== newState) {
      results.push(basePath);
    }
    return results;
  }
  
  // Handle arrays (simple check for now, just look at length)
  if (Array.isArray(prevState) && Array.isArray(newState)) {
    if (prevState.length !== newState.length) {
      results.push(basePath);
      return results;
    }
    
    // Deep compare items (simple JSON comparison for now)
    // This is not the most efficient but works for this use case
    for (let i = 0; i < prevState.length; i++) {
      if (JSON.stringify(prevState[i]) !== JSON.stringify(newState[i])) {
        results.push(basePath);
        return results;
      }
    }
    
    return results;
  }
  
  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(prevState),
    ...Object.keys(newState)
  ]);
  
  // Check each key for changes
  allKeys.forEach(key => {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    
    if (key in prevState && key in newState) {
      // Both objects have the key, check for changes recursively
      findChangedPaths(prevState[key], newState[key], currentPath, results);
    } else {
      // One object is missing the key, definite change
      results.push(currentPath);
    }
  });
  
  return results;
}

/**
 * Notify subscribers of state changes
 * @param {Object} prevState - Previous state object
 * @param {Object} newState - New state object
 * @param {Array} changedPaths - Array of changed paths
 * @param {string} source - Source of change
 */
function notifySubscribers(prevState, newState, changedPaths, source) {
  // Notify global subscribers
  subscribers.global.forEach(callback => {
    try {
      callback(newState, prevState, { changedPaths, source });
    } catch (error) {
      console.error('Error in global state subscriber:', error);
    }
  });
  
  // If there are changed paths, notify path subscribers
  if (changedPaths.length > 0) {
    // For each registered path subscription
    Object.keys(subscribers.paths).forEach(path => {
      // Check if any changed path matches or contains this subscription path
      if (changedPaths.some(changedPath => 
        changedPath === path || 
        changedPath.startsWith(`${path}.`) || 
        path.startsWith(`${changedPath}.`)
      )) {
        // Get the current value at this path
        const currentValue = getStateSlice(path);
        // Get the previous value at this path
        const previousValue = path.split('.').reduce((obj, prop) => {
          return obj && obj[prop] !== undefined ? obj[prop] : undefined;
        }, prevState);
        
        // Notify all subscribers to this path
        subscribers.paths[path].forEach(callback => {
          try {
            callback(currentValue, previousValue, { 
              path, 
              source 
            });
          } catch (error) {
            console.error(`Error in path subscriber for ${path}:`, error);
          }
        });
      }
    });
  }
}
