/**
 * domUtils.js - Centralized DOM element management
 * Provides a single source of truth for DOM references
 */

// DOM element cache - single source of truth for all components
const elements = {
    // Task containers
    currentTasks: null,
    futureTasks: null,
    archiveTasks: null,
    
    // Empty states
    emptyCurrentTasks: null,
    emptyFutureTasks: null,
    emptyArchive: null,
    
    // Navigation elements
    archiveToggle: null,
    
    // Header elements
    studentNameEl: null,
    currentDateEl: null,
    
    // Modal elements
    taskModal: null,
    closeModalBtn: null,
    addTaskBtn: null,
    addTaskSubmitBtn: null,
    taskDescriptionInput: null,
    taskPointsInput: null,
  };
  
  /**
   * Initialize DOM element references by querying the document
   * @returns {Object} Object containing all DOM references
   */
  export function initializeDomReferences() {
    // Task containers
    elements.currentTasks = document.getElementById('currentTasks');
    elements.futureTasks = document.getElementById('futureTasks');
    elements.archiveTasks = document.getElementById('archiveTasks');
    
    // Empty states
    elements.emptyCurrentTasks = document.getElementById('emptyCurrentTasks');
    elements.emptyFutureTasks = document.getElementById('emptyFutureTasks');
    elements.emptyArchive = document.getElementById('emptyArchive');
    
    // Navigation
    elements.archiveToggle = document.getElementById('archiveToggle');
    elements.archiveContainer = document.getElementById('archiveContainer');
    
    // Header
    elements.studentNameEl = document.getElementById('studentName');
    elements.currentDateEl = document.getElementById('currentDate');
    
    // Alias mappings for compatibility with existing code
    // This allows components to reference elements in different ways
    elements.todayTasks = elements.currentTasks;
    elements.todayEmptyState = elements.emptyCurrentTasks;
    elements.taskContainer = elements.currentTasks;
    
    return elements;
  }
  
  /**
   * Get the DOM elements object
   * @returns {Object} DOM elements object
   */
  export function getElements() {
    return elements;
  }
  
  /**
   * Get a specific DOM element by name
   * @param {string} name - Element name/key
   * @returns {HTMLElement|null} The requested DOM element or null
   */
  export function getElement(name) {
    return elements[name] || null;
  }
  
  /**
   * Check if all required elements are available
   * @param {Array<string>} requiredElements - List of required element keys
   * @returns {boolean} True if all required elements exist
   */
  export function validateElements(requiredElements) {
    return requiredElements.every(name => !!elements[name]);
  }
  
  /**
   * Log element initialization status to console
   */
  export function logElementStatus() {
    console.log('DOM Element Status:', Object.entries(elements).reduce((status, [key, value]) => {
      status[key] = !!value;
      return status;
    }, {}));
  }