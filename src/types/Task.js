/**
 * Task.js
 * 
 * Standardized type definitions for task objects throughout the Quest Board application.
 * This file serves as the single source of truth for task data structure, ensuring
 * consistency across components and facilitating future extensions.
 * 
 * @module types/Task
 */

/**
 * @typedef {Object} Task
 * @description Represents a task in the Quest Board application.
 * 
 * @property {string} id - Unique identifier for the task (typically a Firestore doc ID)
 * @property {string} description - Detailed description of what the task entails
 * @property {string} subject - Subject or category the task belongs to (e.g., "Math", "Physics")
 * @property {string} date_added - ISO 8601 timestamp when the task was created (e.g., "2025-03-27T14:30:00Z")
 * @property {string} [due_date] - ISO 8601 timestamp when the task is due (optional, but recommended)
 * @property {boolean} completed - Whether the task has been completed
 * @property {string} [completedDate] - ISO 8601 timestamp when the task was marked complete (only present on completed tasks)
 * @property {string} [type] - Task type qualifier (e.g., "exam", "assignment", "reading")
 * 
 * @property {string} [priority] - [GrowFlow] Task priority level ("low", "medium", "high")
 * @property {string} [effort] - [GrowFlow] Estimated effort required ("low", "medium", "high")
 * @property {string} [impact] - [GrowFlow] Expected impact of completing the task ("low", "medium", "high")
 * @property {string} [formationState] - [GrowFlow] Current formation state in the growth model ("seed", "sprout", "bloom", etc.)
 * @property {string} [homeSection] - [GrowFlow] The section where this task naturally belongs ("garden", "lab", "library", etc.)
 */

/**
 * @typedef {Object} TaskCreationInput
 * @description Input data structure for creating a new task. Omits system-managed fields.
 * 
 * @property {string} description - Detailed description of what the task entails
 * @property {string} subject - Subject or category the task belongs to
 * @property {string} [due_date] - ISO 8601 timestamp when the task is due
 * @property {string} [type] - Task type qualifier
 */

/**
 * @typedef {Object} TaskUpdateInput
 * @description Input data structure for updating an existing task.
 * 
 * @property {string} [description] - Updated task description
 * @property {string} [subject] - Updated subject/category
 * @property {string} [due_date] - Updated due date
 * @property {string} [type] - Updated task type
 * @property {boolean} [completed] - Updated completion status
 */

/**
 * Constants for task type values
 * @enum {string}
 */
export const TASK_TYPE = {
  EXAM: 'exam',
  ASSIGNMENT: 'assignment',
  READING: 'reading',
  PRACTICE: 'practice',
  PROJECT: 'project',
  OTHER: 'other'
};

/**
 * Constants for GrowFlow priority levels
 * @enum {string}
 */
export const PRIORITY_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Constants for GrowFlow effort levels
 * @enum {string}
 */
export const EFFORT_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Constants for GrowFlow impact levels
 * @enum {string}
 */
export const IMPACT_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Constants for GrowFlow formation states
 * @enum {string}
 */
export const FORMATION_STATE = {
  SEED: 'seed',
  SPROUT: 'sprout',
  GROWTH: 'growth',
  BLOOM: 'bloom',
  FRUIT: 'fruit'
};

/**
 * Constants for GrowFlow home sections
 * @enum {string}
 */
export const HOME_SECTION = {
  GARDEN: 'garden',
  LAB: 'lab',
  LIBRARY: 'library',
  STUDIO: 'studio',
  WORKSHOP: 'workshop'
};

/**
 * Example usage:
 * 
 * // Importing the Task type for JSDoc annotations
 * // @param {import('../types/Task').Task} task - Task to process
 * 
 * // Creating a new task (with TaskCreationInput shape)
 * const newTask = {
 *   description: "Complete physics homework",
 *   subject: "Physics",
 *   due_date: "2025-03-30T23:59:59Z",
 *   type: TASK_TYPE.ASSIGNMENT
 * };
 * 
 * // Working with an existing task
 * function processTask(task) {
 *   const { id, description, completed, due_date } = task;
 *   // Process task data...
 * }
 * 
 * // Using type constants
 * if (task.type === TASK_TYPE.EXAM) {
 *   // Handle exam-specific logic
 * }
 */

export default {};
