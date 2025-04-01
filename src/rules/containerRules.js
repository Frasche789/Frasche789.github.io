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
 * Rule for the current container tasks
 * 
 * Shows homework type tasks due tomorrow and other type tasks (eg exams) due TODAY
 * 
 * @param {Object} context - Context for rule evaluation
 * @param {Array<Object>} context.todaySubjects - Subjects scheduled for today
 * @returns {function} A predicate function to filter tasks for the current container
 */
export function currentContainerRule({ todaySubjects = [] }) {
  return P.matchesAll([
    P.isNotCompleted, // Only show incomplete tasks
    P.matchesAny([
      // Homework tasks due tomorrow
      P.matchesAll([
        P.isDueTomorrow,
        P.isHomework
      ]),
      
      // Any other tasks (like exams) due today
      P.matchesAll([
        P.isDueToday,
        P.matchesAny([
          P.isExam,
          // Tasks for today's classes
          P.forTodaysClasses(todaySubjects)
        ])
      ])
    ])
  ]);
}

/**
 * Rule for the tomorrow container tasks
 * 
 * Shows homework type tasks due the day after tomorrow and other type tasks (eg exams) due TOMORROW
 * 
 * @returns {function} A predicate function to filter tasks for the tomorrow container
 */
export function tomorrowContainerRule() {
  return P.matchesAll([
    P.isNotCompleted, // Only show incomplete tasks
    P.matchesAny([
      // Homework tasks due the day after tomorrow
      P.matchesAll([
        P.isDueDayAfterTomorrow,
        P.isHomework
      ]),
      
      // Any other tasks (like exams) due tomorrow
      P.matchesAll([
        P.isDueTomorrow,
        P.isNotHomework
      ])
    ])
  ]);
}

/**
 * Rule for the future container tasks
 * Shows tasks that:
 * - Are not completed
 * - Are not already shown in current or tomorrow containers
 * - Have due dates after the day after tomorrow or no due date
 * 
 * @returns {function} A predicate function to filter tasks for the future container
 */
export function futureContainerRule() {
  return P.matchesAll([
    // Not completed tasks
    P.isNotCompleted,
    
    // Not already shown in current or tomorrow containers
    P.not(P.matchesAny([
      // Not homework due tomorrow
      P.matchesAll([P.isDueTomorrow, P.isHomework]),
      
      // Not any task due today
      P.isDueToday,
      
      // Not homework due day after tomorrow
      P.matchesAll([P.isDueDayAfterTomorrow, P.isNotExam]),
      
      // Not exams due tomorrow
      P.matchesAll([P.isDueTomorrow, P.isExam])
    ])),
    
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
  return "No tasks for today";
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
