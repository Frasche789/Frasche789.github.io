/**
 * predicates.js
 * 
 * A collection of pure predicate functions for task filtering.
 * These functions are designed to be composable and can be combined using
 * the provided combinators (matchesAll, matchesAny, not).
 * 
 * Each predicate function takes a task object and returns a boolean value
 * indicating whether the task matches the predicate's criteria.
 * 
 * This design supports a declarative approach to building complex filters
 * while keeping the filtering logic separate from data fetching and rendering.
 */

import { isToday, isTomorrow } from '../utils/dateUtils';

// ==========================================
// TIME-BASED PREDICATES
// ==========================================

/**
 * Checks if a task is due today.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is due today
 */
export function isDueToday(task) {
  if (!task || !task.due_date) return false;
  
  return isToday(task.due_date);
}

/**
 * Checks if a task is due tomorrow.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is due tomorrow
 */
export function isDueTomorrow(task) {
  if (!task || !task.due_date) return false;
  
  return isTomorrow(task.due_date);
}

/**
 * Checks if a task is overdue (due date is in the past).
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is overdue
 */
export function isOverdue(task) {
  if (!task || !task.due_date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(task.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate.getTime() < today.getTime();
}

/**
 * Checks if a task is due in the future (after tomorrow).
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is due after tomorrow
 */
export function isDueFuture(task) {
  if (!task || !task.due_date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  const dueDate = new Date(task.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate.getTime() >= dayAfterTomorrow.getTime();
}

/**
 * Checks if a task is due the day after tomorrow.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is due the day after tomorrow
 */
export function isDueDayAfterTomorrow(task) {
  if (!task || !task.due_date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  const dueDate = new Date(task.due_date);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate.getTime() === dayAfterTomorrow.getTime();
}

/**
 * Checks if a task has no due date.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task has no due date
 */
export function hasNoDueDate(task) {
  return !task || !task.due_date;
}

// ==========================================
// STATUS-BASED PREDICATES
// ==========================================

/**
 * Checks if a task is marked as completed.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is completed
 */
export function isCompleted(task) {
  return Boolean(task?.completed);
}

/**
 * Checks if a task is not marked as completed.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is not completed
 */
export function isNotCompleted(task) {
  return !isCompleted(task);
}

// ==========================================
// TYPE-BASED PREDICATES
// ==========================================

/**
 * Checks if a task is an exam or exam-related.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is exam-related
 */
export function isExam(task) {
  if (!task) return false;
  
  // Check if task type is exam or title/description contains exam-related keywords
  return task.type === 'exam' || 
         (task.title && task.title.toLowerCase().includes('exam'));
}

/**
 * Checks if a task is not an exam.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is not exam-related
 */
export function isNotExam(task) {
  return !isExam(task);
}

/**
 * Checks if a task is a homework or homework-related.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is homework-related
 */
export function isHomework(task) {
  if (!task) return false;
  
  // Check if task type is homework or title/description contains homework-related keywords
  return task.type === 'homework' || 
         (task.title && task.title.toLowerCase().includes('homework'));
}

/**
 * Checks if a task is not a homework.
 * @param {Object} task - The task object to check
 * @returns {boolean} True if the task is not homework-related
 */
export function isNotHomework(task) {
  return !isHomework(task);
}

// ==========================================
// SUBJECT-BASED PREDICATES
// ==========================================

/**
 * Checks if a task belongs to a specific subject.
 * @param {string} subjectId - The subject ID to check against
 * @returns {function} A predicate function that checks if a task belongs to the specified subject
 */
export function hasSubject(subjectId) {
  return (task) => {
    if (!task || !task.subject) return false;
    
    return task.subject === subjectId;
  };
}

/**
 * Checks if a task is for any of the specified subject IDs.
 * @param {Array<string>} subjectIds - Array of subject IDs to check against
 * @returns {function} A predicate function that checks if a task belongs to any of the specified subjects
 */
export function hasSubjectIn(subjectIds) {
  return (task) => {
    if (!task || !task.subject || !subjectIds || subjectIds.length === 0) return false;
    
    return subjectIds.includes(task.subject);
  };
}

/**
 * Checks if a task's subject name matches or contains the given name.
 * @param {string} subjectName - The subject name to check against
 * @returns {function} A predicate function that checks if a task's subject matches the name
 */
export function hasSubjectName(subjectName) {
  return (task) => {
    if (!task || !task.subject || !subjectName) return false;
    
    const taskSubject = String(task.subject).toLowerCase();
    const nameToMatch = subjectName.toLowerCase();
    
    return taskSubject.includes(nameToMatch) || nameToMatch.includes(taskSubject);
  };
}

/**
 * Checks if a task's subject name matches or contains any of the given names.
 * @param {Array<string>} subjectNames - Array of subject names to check against
 * @returns {function} A predicate function that checks if a task's subject matches any of the names
 */
export function hasSubjectNameIn(subjectNames) {
  return (task) => {
    if (!task || !task.subject || !subjectNames || subjectNames.length === 0) return false;
    
    const taskSubject = String(task.subject).toLowerCase();
    
    return subjectNames.some(name => {
      const nameToMatch = name.toLowerCase();
      return taskSubject.includes(nameToMatch) || nameToMatch.includes(taskSubject);
    });
  };
}

/**
 * Checks if a task belongs to any of today's classes.
 * @param {Array<Object>} todaySubjects - Array of today's subjects
 * @returns {function} A predicate function that checks if a task is for any of today's classes
 */
export function forTodaysClasses(todaySubjects) {
  return (task) => {
    if (!task || !task.subject || !todaySubjects || todaySubjects.length === 0) return false;
    
    // Get subject IDs and names for today
    const todaySubjectIds = todaySubjects.map(subject => subject.id);
    const todaySubjectNames = todaySubjects
      .map(subject => subject.name?.toLowerCase())
      .filter(Boolean);
    
    // Convert task subject to lowercase string for comparison
    const taskSubject = String(task.subject).toLowerCase();
    
    // Check if matches by ID
    const matchesById = todaySubjectIds.includes(task.subject);
    
    // Check if matches by name
    const matchesByName = todaySubjectNames.some(name => 
      taskSubject.includes(name) || name.includes(taskSubject)
    );
    
    return matchesById || matchesByName;
  };
}

/**
 * Checks if a task belongs to any of tomorrow's classes.
 * @param {Array<Object>} tomorrowSubjects - Array of tomorrow's subjects
 * @returns {function} A predicate function that checks if a task is for any of tomorrow's classes
 */
export function forTomorrowsClasses(tomorrowSubjects) {
  return (task) => {
    if (!task || !task.subject || !tomorrowSubjects || tomorrowSubjects.length === 0) return false;
    
    // Get subject IDs and names for tomorrow
    const tomorrowSubjectIds = tomorrowSubjects.map(subject => subject.id);
    const tomorrowSubjectNames = tomorrowSubjects
      .map(subject => subject.name?.toLowerCase())
      .filter(Boolean);
    
    // Convert task subject to lowercase string for comparison
    const taskSubject = String(task.subject).toLowerCase();
    
    // Check if matches by ID
    const matchesById = tomorrowSubjectIds.includes(task.subject);
    
    // Check if matches by name
    const matchesByName = tomorrowSubjectNames.some(name => 
      taskSubject.includes(name) || name.includes(taskSubject)
    );
    
    return matchesById || matchesByName;
  };
}

// ==========================================
// LOGICAL COMBINATORS
// ==========================================

/**
 * Creates a predicate that checks if a task matches ALL of the given predicates.
 * @param {Array<function>} predicates - Array of predicate functions to check
 * @returns {function} A predicate function that returns true only if all predicates return true
 */
export function matchesAll(predicates) {
  return (task) => {
    if (!predicates || predicates.length === 0) return true;
    
    return predicates.every(predicate => predicate(task));
  };
}

/**
 * Creates a predicate that checks if a task matches ANY of the given predicates.
 * @param {Array<function>} predicates - Array of predicate functions to check
 * @returns {function} A predicate function that returns true if any predicate returns true
 */
export function matchesAny(predicates) {
  return (task) => {
    if (!predicates || predicates.length === 0) return false;
    
    return predicates.some(predicate => predicate(task));
  };
}

/**
 * Creates a predicate that inverts the result of the given predicate.
 * @param {function} predicate - The predicate function to invert
 * @returns {function} A predicate function that returns the opposite of the given predicate
 */
export function not(predicate) {
  return (task) => {
    return !predicate(task);
  };
}

// ==========================================
// EXAMPLE COMPOUND PREDICATES
// ==========================================

/**
 * Checks if a task is relevant for display on the Today tab.
 * This includes tasks due today and tasks for today's classes that are not completed.
 * @param {Array<Object>} todaySubjects - Array of today's subjects
 * @returns {function} A compound predicate for Today tab filtering
 */
export function relevantForToday(todaySubjects) {
  return matchesAny([
    // Due today and not completed
    matchesAll([isDueToday, isNotCompleted]),
    
    // For today's classes, not completed, not an exam, and not overdue
    matchesAll([
      forTodaysClasses(todaySubjects),
      isNotCompleted,
      isNotExam,
      not(isOverdue)
    ])
  ]);
}

/**
 * Checks if a task is relevant for display on the Tomorrow tab.
 * This includes tasks due tomorrow and tasks for tomorrow's classes that are not completed.
 * @param {Array<Object>} tomorrowSubjects - Array of tomorrow's subjects
 * @returns {function} A compound predicate for Tomorrow tab filtering
 */
export function relevantForTomorrow(tomorrowSubjects) {
  return matchesAny([
    // Due tomorrow and not completed
    matchesAll([isDueTomorrow, isNotCompleted]),
    
    // For tomorrow's classes, not completed, not an exam, and not overdue
    matchesAll([
      forTomorrowsClasses(tomorrowSubjects),
      isNotCompleted,
      isNotExam,
      not(isOverdue)
    ])
  ]);
}
