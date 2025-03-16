/**
 * bootstrap.js - Dependency-aware initialization sequence for Quest Board
 * Implements explicit dependency graph for application components
 */

// Store for initialization steps
const initializationSteps = new Map();

// Initialization status tracking
const stepStatus = new Map();

// Initialization promises tracking
const stepPromises = new Map();

// Event emitter for initialization events
const eventBus = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  },
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
};

/**
 * Available dependency step statuses
 */
export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Register an initialization step with its dependencies
 * @param {Object} options - Step configuration
 * @param {string} options.id - Unique identifier for this step
 * @param {string} options.name - Human-readable name for this step
 * @param {Function} options.initFn - Async function to execute for initialization (deprecated, use options.run)
 * @param {Function} options.run - Async function to execute for initialization
 * @param {Array<string>} [options.dependencies=[]] - Array of step IDs this step depends on
 * @param {boolean} [options.required=true] - Whether this step is required for application startup
 * @param {boolean} [options.critical=false] - Whether failure of this step should halt the entire bootstrap process
 */
export function registerInitStep({
  id,
  name,
  initFn,
  run,
  dependencies = [],
  required = true,
  critical = false
}) {
  if (!id || typeof id !== 'string') {
    throw new Error('Step ID is required');
  }
  
  if (!name || typeof name !== 'string') {
    throw new Error('Step name is required');
  }
  
  // Support both initFn (old) and run (new) properties for backward compatibility
  const initFunction = run || initFn;
  
  if (!initFunction || typeof initFunction !== 'function') {
    throw new Error('Initialization function is required');
  }
  
  // Check for existing step with same ID
  if (initializationSteps.has(id)) {
    throw new Error(`Initialization step with ID "${id}" already registered`);
  }
  
  // Register the step
  initializationSteps.set(id, {
    id,
    name,
    initFn: initFunction,
    dependencies,
    required,
    critical
  });
  
  // Initialize step status
  stepStatus.set(id, StepStatus.PENDING);
  
  // Log for debugging
  console.log(`Registered initialization step: ${name} (${id})`);
  
  // Emit registration event
  eventBus.emit('step:registered', { id, name, dependencies });
}

/**
 * Get the status of an initialization step
 * @param {string} stepId - ID of the step to check
 * @returns {string} Status from StepStatus enum
 */
export function getStepStatus(stepId) {
  return stepStatus.get(stepId) || StepStatus.PENDING;
}

/**
 * Get a list of all registered initialization steps
 * @returns {Array<Object>} Array of step configurations with their current status
 */
export function getInitializationSteps() {
  return Array.from(initializationSteps.entries()).map(([id, step]) => ({
    ...step,
    status: stepStatus.get(id)
  }));
}

/**
 * Execute an initialization step and all its dependencies
 * @param {string} stepId - ID of the step to initialize
 * @returns {Promise<any>} Result of the initialization
 */
export async function initializeStep(stepId) {
  // Check if step exists
  if (!initializationSteps.has(stepId)) {
    throw new Error(`Initialization step "${stepId}" not found`);
  }
  
  // If step is already running or completed, return its promise
  if (stepPromises.has(stepId)) {
    return stepPromises.get(stepId);
  }
  
  // Get step configuration
  const step = initializationSteps.get(stepId);
  const { name, initFn, dependencies, critical } = step;
  
  // Create a promise for this step
  const stepPromise = (async () => {
    try {
      // Update status to running
      stepStatus.set(stepId, StepStatus.RUNNING);
      eventBus.emit('step:started', { id: stepId, name });
      
      console.log(`Starting initialization step: ${name} (${stepId})`);
      
      // Initialize dependencies first
      if (dependencies.length > 0) {
        console.log(`Initializing dependencies for ${name}: ${dependencies.join(', ')}`);
        
        const dependencyPromises = dependencies.map(depId => initializeStep(depId));
        
        try {
          await Promise.all(dependencyPromises);
        } catch (error) {
          throw new Error(`Failed to initialize dependencies for step "${name}": ${error.message}`);
        }
      }
      
      // Execute the initialization function
      const result = await initFn();
      
      // Update status to completed
      stepStatus.set(stepId, StepStatus.COMPLETED);
      eventBus.emit('step:completed', { id: stepId, name });
      
      console.log(`Completed initialization step: ${name} (${stepId})`);
      
      return result;
      
    } catch (error) {
      // Update status to failed
      stepStatus.set(stepId, StepStatus.FAILED);
      eventBus.emit('step:failed', { id: stepId, name, error });
      
      console.error(`Failed initialization step: ${name} (${stepId})`, error);
      
      // If this is a critical step, rethrow to halt the bootstrap process
      if (critical) {
        throw new Error(`Critical initialization step "${name}" failed: ${error.message}`);
      }
      
      // Otherwise, log and continue
      console.warn(`Non-critical initialization step "${name}" failed: ${error.message}`);
      
      // Return null to indicate failure but allow continuation
      return null;
    }
  })();
  
  // Store the promise
  stepPromises.set(stepId, stepPromise);
  
  return stepPromise;
}

/**
 * Initialize the application with all registered steps
 * @returns {Promise<Object>} Results of all initialization steps
 */
export async function bootstrap() {
  console.log('Starting application bootstrap process...');
  console.log(`Registered steps: ${Array.from(initializationSteps.keys()).join(', ')}`);
  
  try {
    // Get all required steps
    const requiredSteps = Array.from(initializationSteps.values())
      .filter(step => step.required)
      .map(step => step.id);
    
    // Show loading indicator
    updateLoadingIndicator(true, 'Initializing application...');
    
    // Initialize all required steps in parallel
    // Dependencies will be respected by the initializeStep function
    const results = {};
    await Promise.all(
      requiredSteps.map(async stepId => {
        const result = await initializeStep(stepId);
        results[stepId] = result;
      })
    );
    
    // Hide loading indicator
    updateLoadingIndicator(false);
    
    // Log success
    console.log('Application bootstrap completed successfully');
    eventBus.emit('bootstrap:completed', { success: true, results });
    
    // Explicitly trigger renderTasks after bootstrap completion
    window.dispatchEvent(new CustomEvent('ui:render-tasks'));
    
    return { success: true, results };
    
  } catch (error) {
    // Show error in loading indicator
    updateLoadingIndicator(true, `Bootstrap failed: ${error.message}`, true);
    
    // Log error
    console.error('Application bootstrap failed:', error);
    eventBus.emit('bootstrap:failed', { error });
    
    return { success: false, error };
  }
}

/**
 * Check if any initialization steps have failed
 * @returns {boolean} True if any steps have failed
 */
export function hasFailedSteps() {
  return Array.from(stepStatus.values()).includes(StepStatus.FAILED);
}

/**
 * Subscribe to bootstrap events
 * @param {string} event - Event name to listen for
 * @param {Function} callback - Callback function to execute
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBootstrap(event, callback) {
  return eventBus.on(event, callback);
}

/**
 * Update the loading indicator
 * @param {boolean} show - Whether to show the loading indicator
 * @param {string} [message] - Optional message to display
 * @param {boolean} [isError] - Whether this is an error message
 */
function updateLoadingIndicator(show, message = 'Loading...', isError = false) {
  const loadingEl = document.getElementById('loading-indicator');
  if (!loadingEl) return;
  
  if (show) {
    loadingEl.style.display = 'flex';
    
    // Add message if provided
    if (message) {
      loadingEl.innerHTML = isError 
        ? `
          <div class="error-message">
            <p>${message}</p>
            <button onclick="location.reload()" class="primary-btn">Retry</button>          </div>
        `
        : `
          <div class="spinner"></div>
          <p>${message}</p>
        `;
    }
  } else {
    loadingEl.style.display = 'none';
  }
}

/**
 * Get a dependency graph of all registered steps
 * @returns {Object} Dependency graph object
 */
export function getDependencyGraph() {
  const graph = {};
  
  // Build the graph
  for (const [id, step] of initializationSteps.entries()) {
    graph[id] = {
      name: step.name,
      dependencies: [...step.dependencies],
      dependents: [],
      status: stepStatus.get(id)
    };
  }
  
  // Add dependents
  for (const [id, step] of initializationSteps.entries()) {
    for (const depId of step.dependencies) {
      if (graph[depId]) {
        graph[depId].dependents.push(id);
      }
    }
  }
  
  return graph;
}

/**
 * Register a rendering component with the bootstrap system
 * @param {Object} options - Component configuration
 * @param {string} options.id - Unique identifier for this component
 * @param {string} options.name - Human-readable name for this component
 * @param {Function} options.render - Function to execute for rendering
 * @param {Array<string>} [options.dependencies=[]] - Array of component IDs this component depends on
 * @param {Array<string>} [options.dataDependencies=[]] - Array of data sources this component depends on
 * @param {boolean} [options.autoRender=true] - Whether this component should auto-render on data changes
 */
export function registerRenderComponent({
  id,
  name,
  render,
  dependencies = [],
  dataDependencies = [],
  autoRender = true
}) {
  if (!id || typeof id !== 'string') {
    throw new Error('Component ID is required');
  }
  
  if (!name || typeof name !== 'string') {
    throw new Error('Component name is required');
  }
  
  if (!render || typeof render !== 'function') {
    throw new Error('Render function is required');
  }
  
  // Register as a regular initialization step
  registerInitStep({
    id: `render:${id}`,
    name: `Render ${name}`,
    run: async () => {
      // Return the render function and configuration for later use
      return {
        id,
        name,
        render,
        dependencies,
        dataDependencies,
        autoRender
      };
    },
    dependencies: dependencies.map(dep => `render:${dep}`),
    required: false,
    critical: false
  });
  
  // Log for debugging
  console.log(`Registered render component: ${name} (${id})`);
  
  // Emit registration event
  eventBus.emit('component:registered', { id, name, dependencies, dataDependencies });
  
  // Return an unregister function
  return () => {
    // TODO: Implement component unregistration if needed
  };
}

/**
 * Render a specific component and its dependencies
 * @param {string} componentId - ID of the component to render
 * @param {Object} [data] - Data to pass to the render function
 * @returns {Promise<any>} Result of the render operation
 */
export async function renderComponent(componentId, data = {}) {
  const stepId = `render:${componentId}`;
  
  try {
    // Initialize the component if not already done
    const component = await initializeStep(stepId);
    
    if (!component) {
      throw new Error(`Component "${componentId}" not found or failed to initialize`);
    }
    
    // Execute the render function
    return await component.render(data);
  } catch (error) {
    console.error(`Failed to render component "${componentId}":`, error);
    throw error;
  }
}

/**
 * Get all registered render components
 * @returns {Array<Object>} Array of registered render components
 */
export function getRegisteredComponents() {
  return getInitializationSteps()
    .filter(step => step.id.startsWith('render:'))
    .map(step => ({
      id: step.id.replace('render:', ''),
      name: step.name.replace('Render ', ''),
      status: step.status,
      dependencies: step.dependencies.map(dep => dep.replace('render:', ''))
    }));
}

// Export the event bus for modules that need to listen to bootstrap events
export const bootstrapEvents = {
  on: eventBus.on.bind(eventBus),
  off: eventBus.off.bind(eventBus)
};
