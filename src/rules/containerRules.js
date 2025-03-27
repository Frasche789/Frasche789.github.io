/**
 * containerRules.js
 * 
 * A system of container rules that define which tasks belong in which container.
 * These rules are designed to be context-aware, adapting based on:
 * - Time of day (morning vs. afternoon)
 * - Subject schedules (today's classes vs. tomorrow's classes)
 * - Task status (completed vs. not completed)
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
 * Morning: Shows tasks due today AND tasks for today's classes
 * Afternoon: Shows tasks due tomorrow AND tasks for tomorrow's classes
 * 
 * @param {Object} context - Context for rule evaluation
 * @param {string} context.timeOfDay - Current time of day (MORNING or AFTERNOON)
 * @param {Array<Object>} context.todaySubjects - Subjects scheduled for today
 * @param {Array<Object>} context.tomorrowSubjects - Subjects scheduled for tomorrow
 * @returns {function} A predicate function to filter tasks for the current container
 */
export function currentContainerRule({ timeOfDay, todaySubjects = [], tomorrowSubjects = [] }) {
  // Use time of day to determine which tasks to show
  if (timeOfDay === TIME_OF_DAY.MORNING) {
    // Morning rule: Show today's tasks AND tasks for today's classes
    return P.matchesAny([
      // Tasks due today (non-completed)
      P.matchesAll([P.isDueToday, P.isNotCompleted]),
      
      // Tasks for today's classes (not completed, not overdue, not an exam)
      P.matchesAll([
        P.forTodaysClasses(todaySubjects),
        P.isNotCompleted,
        P.not(P.isOverdue),
        P.isNotExam
      ])
    ]);
  } else {
    // Afternoon rule: Show tasks due tomorrow AND tasks for tomorrow's classes
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
}

/**
 * Rule for the future container tasks
 * Shows tasks that:
 * - Are not completed
 * - Are not in the current container
 * - Have due dates after tomorrow or no due date
 * 
 * @param {Object} context - Context for rule evaluation
 * @param {string} context.timeOfDay - Current time of day (MORNING or AFTERNOON)
 * @param {Array<Object>} context.todaySubjects - Subjects scheduled for today
 * @param {Array<Object>} context.tomorrowSubjects - Subjects scheduled for tomorrow
 * @returns {function} A predicate function to filter tasks for the future container
 */
export function futureContainerRule({ timeOfDay, todaySubjects = [], tomorrowSubjects = [] }) {
  // Get the current container rule for exclusion
  const currentContainer = currentContainerRule({ timeOfDay, todaySubjects, tomorrowSubjects });
  
  return P.matchesAll([
    // Not completed tasks
    P.isNotCompleted,
    
    // Not in current container
    P.not(currentContainer),
    
    // Due in the future OR has no due date (but not an exam)
    P.matchesAny([
      P.isDueFuture,
      P.matchesAll([P.hasNoDueDate, P.isNotExam])
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
 * Get appropriate display title for the current container based on time of day
 * @param {string} timeOfDay - Current time of day
 * @returns {string} Display title
 */
export function getCurrentContainerTitle(timeOfDay) {
  return timeOfDay === TIME_OF_DAY.MORNING
    ? "Today's Tasks"
    : "Tasks for Tomorrow's Classes";
}

/**
 * Get appropriate empty state message for the current container based on time of day
 * @param {string} timeOfDay - Current time of day
 * @returns {string} Empty state message
 */
export function getCurrentContainerEmptyMessage(timeOfDay) {
  return timeOfDay === TIME_OF_DAY.MORNING
    ? "All tasks for today's classes done!"
    : "All tasks for tomorrow's classes done!";
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
