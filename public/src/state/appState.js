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
  lastScrollPosition: 0,
  showArchive: false,
  streak: {
    count: 0,
    target: 7, // Target for a complete streak (e.g., 7 days)
    lastActive: null
  }
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
 * Load state from localStorage
 */
export function loadStateFromStorage() {
  try {
    const savedState = localStorage.getItem('questBoardState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setState(parsedState, 'localStorage');
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
  }
}

/**
 * Save current state to localStorage
 * @param {Array} keys - Specific state keys to save (defaults to all)
 */
export function saveStateToStorage(keys = null) {
  try {
    let stateToSave = { ..._state };
    
    // If specific keys provided, only save those
    if (keys && Array.isArray(keys) && keys.length > 0) {
      stateToSave = keys.reduce((acc, key) => {
        if (_state[key] !== undefined) {
          acc[key] = _state[key];
        }
        return acc;
      }, {});
    }
    
    localStorage.setItem('questBoardState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
}

// Helper functions

/**
 * Find changed paths between two state objects
 * @param {Object} prevState - Previous state
 * @param {Object} newState - New state
 * @returns {Array} Array of dot-notation paths that changed
 */
function findChangedPaths(prevState, newState, path = '', result = []) {
  // If types are different, the entire path changed
  if (typeof prevState !== typeof newState) {
    result.push(path);
    return result;
  }
  
  // If not objects or arrays, check equality
  if (typeof prevState !== 'object' || prevState === null || newState === null) {
    if (prevState !== newState) {
      result.push(path);
    }
    return result;
  }
  
  // Handle arrays
  if (Array.isArray(prevState) && Array.isArray(newState)) {
    if (prevState.length !== newState.length) {
      result.push(path);
      return result;
    }
    
    // For arrays, we simplify and consider any change a change to the whole array
    for (let i = 0; i < prevState.length; i++) {
      if (JSON.stringify(prevState[i]) !== JSON.stringify(newState[i])) {
        result.push(path);
        return result;
      }
    }
    
    return result;
  }
  
  // For objects, recursively check each property
  const allKeys = new Set([...Object.keys(prevState), ...Object.keys(newState)]);
  
  allKeys.forEach(key => {
    const childPath = path ? `${path}.${key}` : key;
    
    if (!(key in prevState)) {
      // New property added
      result.push(childPath);
    } else if (!(key in newState)) {
      // Property removed
      result.push(childPath);
    } else {
      // Property exists in both, check recursively
      findChangedPaths(prevState[key], newState[key], childPath, result);
    }
  });
  
  return result;
}

/**
 * Notify subscribers of state changes
 * @param {Object} prevState - Previous state
 * @param {Object} newState - New state
 * @param {Array} changedPaths - Array of changed dot-notation paths
 * @param {string} source - Source of the state change
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
  
  // Notify path-specific subscribers
  if (changedPaths.length > 0) {
    Object.keys(subscribers.paths).forEach(path => {
      // Check if this path or any of its parents changed
      const pathMatches = changedPaths.some(changedPath => {
        return changedPath === path || 
               changedPath.startsWith(`${path}.`) || 
               path.startsWith(`${changedPath}.`);
      });
      
      if (pathMatches) {
        const pathValue = getStateSlice(path);
        const prevPathValue = path.split('.').reduce((obj, prop) => {
          return obj && obj[prop] !== undefined ? obj[prop] : undefined;
        }, prevState);
        
        subscribers.paths[path].forEach(callback => {
          try {
            callback(pathValue, prevPathValue, { path, source });
          } catch (error) {
            console.error(`Error in path subscriber for ${path}:`, error);
          }
        });
      }
    });
  }
}
