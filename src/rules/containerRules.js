/**
 * containerRules.js
 * 
 * A system of container rules that define which tasks belong in which container.
 * These rules are designed to be context-aware, adapting based on:
 * - Subject schedules (today's classes vs. tomorrow's classes)
 * - Task status (completed vs. not completed)
 * - Due dates (today, tomorrow, future)
 * 
 * Each rule function produces a predicate function that can be used to filter tasks.
 * Rules compose predicates from the predicate system (predicates.js).
 */

import * as P from './predicates';

/**
 * Time of day constants
 * @type {Object}
 */
export const TIME_OF_DAY = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon'
};

/**
 * Determines the time of day based on the current hour
 * @param {Date} [date=new Date()] - The date to check
 * @returns {string} Time of day (MORNING or AFTERNOON)
 */
export function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? TIME_OF_DAY.MORNING : TIME_OF_DAY.AFTERNOON;
}

/**
 * Rule for the current container tasks
 * 
 * Shows tasks due today AND tasks for today's classes, AND tasks due tomorrow
 * This is optimized for ADHD/autism users by providing advance visibility to reduce anxiety
 * and improve planning.
 * 
 * @param {Object} context - Context for rule evaluation
 * @param {string} context.timeOfDay - Current time of day (not used in updated implementation)
 * @param {Array<Object>} context.todaySubjects - Subjects scheduled for today
 * @returns {function} A predicate function to filter tasks for the current container
 */
export function currentContainerRule({ todaySubjects = [] }) {
  // Current container shows today's tasks and tasks due tomorrow for better planning
  return P.matchesAny([
    // Tasks due today (non-completed)
    P.matchesAll([P.isDueToday, P.isNotCompleted]),
    
    // NEW: Tasks due tomorrow (non-completed)
    P.matchesAll([P.isDueTomorrow, P.isNotCompleted]),
    
    // Tasks for today's classes (not completed, not overdue, not an exam)
    P.matchesAll([
      P.forTodaysClasses(todaySubjects),
      P.isNotCompleted,
      P.not(P.isOverdue),
      P.isNotExam
    ])
  ]);
}

/**
 * Rule for the tomorrow container tasks
 * 
 * Shows tasks due tomorrow AND tasks for tomorrow's classes
 * 
 * @param {Object} context - Context for rule evaluation
 * @param {Array<Object>} context.tomorrowSubjects - Subjects scheduled for tomorrow
 * @returns {function} A predicate function to filter tasks for the tomorrow container
 */
export function tomorrowContainerRule({ tomorrowSubjects = [] }) {
  return P.matchesAny([
    // Tasks due tomorrow (non-completed)
    P.matchesAll([P.isDueTomorrow, P.isNotCompleted]),
    
    // Tasks for tomorrow's classes (not completed, not overdue, not an exam)
    P.matchesAll([
      P.forTomorrowsClasses(tomorrowSubjects),
      P.isNotCompleted,
      P.not(P.isOverdue),
      P.isNotExam
    ])
  ]);
}

/**
 * Rule for the future container tasks
 * Shows tasks that:
 * - Are not completed
 * - Are not due today or tomorrow
 * - Have due dates after tomorrow or no due date
 * 
 * @returns {function} A predicate function to filter tasks for the future container
 */
export function futureContainerRule() {
  return P.matchesAll([
    // Not completed tasks
    P.isNotCompleted,
    
    // Not due today or tomorrow
    P.not(P.isDueToday),
    P.not(P.isDueTomorrow),
    
    // Either due in the future or has no due date
    P.matchesAny([
      P.isDueFuture,
      P.hasNoDueDate
    ])
  ]);
}

/**
 * Rule for the archive container tasks
 * Shows tasks that:
 * - Are completed OR
 * - Are overdue and not completed
 * 
 * @returns {function} A predicate function to filter tasks for the archive container
 */
export function archiveContainerRule() {
  return P.matchesAny([
    // Completed tasks
    P.isCompleted,
    
    // Overdue tasks that are not completed
    P.matchesAll([P.isOverdue, P.isNotCompleted])
  ]);
}

/**
 * Rule for the exam container tasks
 * Shows tasks that:
 * - Are exams AND
 * - Are not completed AND
 * - Are not overdue
 * 
 * @returns {function} A predicate function to filter tasks for the exam container
 */
export function examContainerRule() {
  return P.matchesAll([
    P.isExam,
    P.isNotCompleted,
    P.not(P.isOverdue)
  ]);
}

/**
 * Get appropriate display title for the current container
 * @returns {string} Display title
 */
export function getCurrentContainerTitle() {
  return "Today's Tasks";
}

/**
 * Get appropriate empty state message for the current container
 * @returns {string} Empty state message
 */
export function getCurrentContainerEmptyMessage() {
  return "No tasks due today";
}

/**
 * Apply a rule to filter tasks
 * @param {Array<Object>} tasks - Array of task objects to filter
 * @param {function} rule - The rule (predicate function) to apply
 * @returns {Array<Object>} Filtered array of tasks
 */
export function applyRule(tasks, rule) {
  if (!Array.isArray(tasks) || !rule) {
    return [];
  }
  
  return tasks.filter(rule);
}
