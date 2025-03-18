/**
 * taskCategorization.js - Centralized Task Categorization Service
 * Implements precise business rules for categorizing tasks into Archive, Current, and Future
 */

import { parseFinDate, getDaysBetweenDates, getTodayFinDate, isDateOlderThan } from '../utils/dateUtils.js';
import { hasClassTodayOrTomorrow } from '../utils/subjectUtils.js';
import { appConfig } from '../app.js';

/**
 * Categorize a single task according to business rules
 * 
 * @param {Object} task - Task object to categorize
 * @returns {string} Category name: 'archive', 'current', or 'future'
 */
export function categorizeTask(task) {
  console.log(`Categorizing task: ${task?.class}`);
  if (!task) {
    console.error("Task must be a valid object");
    return 'future'; // Default to future if no task provided
  }

  const now = new Date();
  const todayFormatted = getTodayFinDate();
  
  // Calculate tomorrow's date in the same Finnish date format (DD.MM.YYYY)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = `${String(tomorrow.getDate()).padStart(2, '0')}.${String(tomorrow.getMonth() + 1).padStart(2, '0')}.${tomorrow.getFullYear()}`;
  
  // Use the configurable archiveThresholdDays from appConfig
  const archiveThresholdDays = appConfig?.tasks?.archiveThresholdDays || 14; // Default to 14 if not configured
  
  // RULE 1: Archive rule - older than threshold days OR completed
  if (isDateOlderThan(task.date, archiveThresholdDays) || task.completed) {
    return 'archive';
  }
  
  // RULE 2: Handle different task types appropriately
  if (task.type === 'task' || task.type === 'exam') {
    // For tasks and exams, check the due date
    const dueDate = task.dueDate || task.due_date;
    // Current if due today OR tomorrow, otherwise Future
    return (dueDate === todayFormatted || dueDate === tomorrowFormatted) ? 'current' : 'future';
  } else {
    // For homework/subject tasks or any other type, use the subject's class schedule
    const hasClassSoon = hasClassTodayOrTomorrow(task.subject);
    console.log(`Task ${task.id} categorized as: ${hasClassSoon ? 'current' : 'future'}`);
    return hasClassSoon ? 'current' : 'future';
  }
  
}



/**
 * Group tasks by container (Archive, Current, Future)
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Tasks grouped by container
 */
export function categorizeTaskByContainer(tasks) {
  const containerGroups = {
    archive: [],
    current: [],
    future: []
  };
  
  if (!tasks || !Array.isArray(tasks)) {
    console.warn('Invalid tasks array provided to categorizeTaskByContainer');
    return containerGroups;
  }
  
  tasks.forEach(task => {
    // Skip tasks with invalid data
    if (!task) return;
    
    // Use categorizeTask to decide which container the task belongs to
    const container = categorizeTask(task);
    
    // Add task to the appropriate container group
    if (container === 'archive' && containerGroups.archive) {
      containerGroups.archive.push({
        ...task,
        container,
      });
    } else if (container === 'current' && containerGroups.current) {
      containerGroups.current.push({
        ...task,
        container,
      });
    } else if (container === 'future' && containerGroups.future) {
      containerGroups.future.push({
        ...task,
        container,
      });
    }
  });
  
  return containerGroups;
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