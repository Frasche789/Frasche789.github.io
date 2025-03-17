/**
 * taskCategorization.js - Centralized Task Categorization Service
 * Implements precise business rules for categorizing tasks into Archive, Current, and Future
 */

import { parseFinDate, getDaysBetweenDates, getTodayFinDate } from '../utils/dateUtils.js';
import { hasClassTodayOrTomorrow } from '../utils/subjectUtils.js';

/**
 * Categorize tasks according to strict business rules:
 * - Archive: Tasks created >14 days ago OR completed tasks (regardless of age)
 * - Current: 
 *   - Homework/Subject tasks: Incomplete, recent (<14 days old) with subjects having class today/tomorrow
 *   - Chores/Exams: Incomplete, recent tasks that are due today
 * - Future: 
 *   - Homework/Subject tasks: Incomplete, recent with subjects NOT having class today/tomorrow
 *   - Chores/Exams: Incomplete, recent tasks due in the future
 * 
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Tasks organized by category {archive: [], current: [], future: []}
 */
export function categorizeTasksByBusinessRules(tasks) {
  if (!tasks || !Array.isArray(tasks)) {
    console.error("Tasks must be a valid array");
    return { archive: [], current: [], future: [] };
  }

  const now = new Date();
  const todayFormatted = getTodayFinDate();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const result = {
    archive: [],
    current: [],
    future: []
  };

  tasks.forEach(task => {
    // Parse task creation date
    const taskDate = parseFinDate(task.date);
    
    // RULE 1: Archive rule - >14 days old OR completed
    if ((taskDate && taskDate < twoWeeksAgo) || task.completed) {
      result.archive.push(task);
      return;
    }
    
    // For remaining tasks (recent and not completed)
    
    // RULE 2: Handle different task types appropriately
    if (task.type === 'chore' || task.type === 'exam') {
      // For chores and exams, check the due date
      const dueDate = task.dueDate || task.due_date;
      
      if (dueDate === todayFormatted) {
        // Due today - put in Current
        result.current.push(task);
      } else {
        // Due in the future - put in Future
        result.future.push(task);
      }
    } else {
      // For homework/subject tasks or any other type, use the subject's class schedule
      const hasClassSoon = hasClassTodayOrTomorrow(task.subject);
      
      if (hasClassSoon) {
        result.current.push(task);
      } else {
        result.future.push(task);
      }
    }
  });

  return result;
}

/**
 * Categorize a single task according to business rules
 * 
 * @param {Object} task - Task object to categorize
 * @returns {string} Category name: 'archive', 'current', or 'future'
 */
export function categorizeTask(task) {
  if (!task) {
    console.error("Task must be a valid object");
    return 'future'; // Default to future if no task provided
  }

  const now = new Date();
  const todayFormatted = getTodayFinDate();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Parse task creation date
  const taskDate = parseFinDate(task.date);
  
  // RULE 1: Archive rule - >14 days old OR completed
  if ((taskDate && taskDate < twoWeeksAgo) || task.completed) {
    return 'archive';
  }
  
  // RULE 2: Handle different task types appropriately
  if (task.type === 'chore' || task.type === 'exam') {
    // For chores and exams, check the due date
    const dueDate = task.dueDate || task.due_date;
    return dueDate === todayFormatted ? 'current' : 'future';
  } else {
    // For homework/subject tasks or any other type, use the subject's class schedule
    const hasClassSoon = hasClassTodayOrTomorrow(task.subject);
    return hasClassSoon ? 'current' : 'future';
  }
}

/**
 * Get statistics about task categorization
 * 
 * @param {Object} categorizedTasks - Object containing categorized tasks
 * @returns {Object} Statistics about task counts in each category
 */
export function getTaskCategoryStats(categorizedTasks) {
  return {
    archiveCount: categorizedTasks.archive.length,
    currentCount: categorizedTasks.current.length,
    futureCount: categorizedTasks.future.length,
    totalCount: categorizedTasks.archive.length + 
                categorizedTasks.current.length + 
                categorizedTasks.future.length
  };
}