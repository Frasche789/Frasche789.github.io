/**
 * subjectUtils.js - Subject handling utilities for Quest Board
 * Contains functions for subject colors, translations, and schedule mappings
 */

import { getTodayFinDate, parseFinDate, getDateRelativeToToday, getDayName } from './dateUtils.js';

/**
 * Default subject schedule mapping for different days of the week
 * Keys are subject names, values are arrays of day numbers (1-based, 1=Monday)
 */
export const DEFAULT_SCHEDULE = {
  main: {
    "Math": [1, 2, 3, 4], // Monday, Tuesday, Wednesday, Thursday
    "Eco": [1, 4], // Monday, Thursday
    "Crafts": [1], // Monday
    "PE": [1, 2, 3], // Monday, Tuesday, Wednesday
    "Finnish": [2, 3, 4, 5], // Tuesday, Wednesday, Thursday, Friday
    "History": [2], // Tuesday
    "Music": [2], // Tuesday
    "English": [3, 4], // Wednesday, Thursday
    "Ethics": [3], // Wednesday
    "Art": [5], // Friday
    "Civics": [5], // Friday
    "Digi": [5]  // Friday
  },
  alternative: {} // Can be expanded for a second child's schedule
};

/**
 * Color mapping for subjects to ensure consistent visual representation
 */
export const SUBJECT_COLORS = {
  'math': '#4361ee',
  'finnish': '#4cc9f0',
  'english': '#f72585',
  'history': '#7209b7',
  'civics': '#3a0ca3',
  'ethics': '#4895ef',
  'pe': '#560bad',
  'music': '#b5179e',
  'art': '#f15bb5',
  'crafts': '#fee440',
  'eco': '#06d6a0',
  'digi': '#118ab2'
};

/**
 * Get a consistent color for a subject
 * @param {string} subject - The subject name
 * @returns {string} - A hex color code
 */
export function getSubjectColor(subject) {
  // Normalize the subject name (lowercase)
  const normalizedSubject = subject.toLowerCase();
  
  // Return the predefined color or generate one based on the subject string
  if (SUBJECT_COLORS[normalizedSubject]) {
    return SUBJECT_COLORS[normalizedSubject];
  } else {
    // Simple hash function to generate a consistent color from a string
    let hash = 0;
    for (let i = 0; i < normalizedSubject.length; i++) {
      hash = normalizedSubject.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to a hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  }
}

/**
 * Calculate the next class day for a given subject
 * @param {string} subject - The subject to check
 * @param {Object} scheduleConfig - The schedule configuration to use (optional)
 * @returns {Object} Information about the next class occurrence
 */
export function calculateNextClassDay(subject, scheduleConfig = DEFAULT_SCHEDULE) {
  // Get the current date and day of week
  const today = new Date();
  const currentDayNumber = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  
  // Convert to 1-based index where 1 is Monday (to match our schedule data)
  // Sunday (0) becomes 7 in our system
  const adjustedCurrentDay = currentDayNumber === 0 ? 7 : currentDayNumber;
  
  // Find which days this subject occurs on
  // Normalize to lowercase for case-insensitive lookup
  const subjectNormalized = subject.toLowerCase();
  
  // Access the main schedule by default, could be expanded to support multiple schedules
  const schedule = scheduleConfig.main;
  
  // Find the subject in schedule (case-insensitive)
  const subjectKey = Object.keys(schedule).find(key => 
    key.toLowerCase() === subjectNormalized
  );
  
  if (!subjectKey) {
    console.warn(`Subject ${subject} not found in the schedule`);
    return {
      found: false,
      daysUntil: null,
      nextDay: null,
      dayName: null
    };
  }
  
  const classDays = schedule[subjectKey];
  
  if (!classDays || !classDays.length) {
    console.warn(`No class days defined for subject ${subject}`);
    return {
      found: false,
      daysUntil: null,
      nextDay: null,
      dayName: null
    };
  }
  
  // Sort the days to ensure we process them in order
  const sortedClassDays = [...classDays].sort((a, b) => a - b);
  
  // Find the next occurrence
  let nextDayNumber = null;
  let daysUntil = Infinity;
  
  // First, check if there are any days remaining this week
  for (const dayNumber of sortedClassDays) {
    if (dayNumber > adjustedCurrentDay) {
      nextDayNumber = dayNumber;
      daysUntil = dayNumber - adjustedCurrentDay;
      break;
    }
  }
  
  // If no days found later this week, wrap around to next week
  if (nextDayNumber === null) {
    nextDayNumber = sortedClassDays[0];
    daysUntil = 7 - adjustedCurrentDay + nextDayNumber;
  }
  
  // Convert day number to name
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Convert from our 1-based (Monday is 1) to JS 0-based (Sunday is 0)
  const jsDayNumber = nextDayNumber === 7 ? 0 : nextDayNumber;
  const dayName = dayNames[jsDayNumber];
  
  return {
    found: true,
    daysUntil,
    nextDay: nextDayNumber,
    dayName
  };
}

/**
 * Get friendly text for when the next class occurs
 * @param {string} subject - The subject to check
 * @returns {string} - Human readable text like "Monday (in 3 days)" or "Not scheduled"
 */
export function getNextClassText(subject) {
  const nextClass = calculateNextClassDay(subject);
  
  if (!nextClass.found) {
    return "Not scheduled";
  }
  
  if (nextClass.daysUntil === 0) {
    return "Today";
  } else if (nextClass.daysUntil === 1) {
    return "Tomorrow";
  } else {
    return `${nextClass.dayName} (in ${nextClass.daysUntil} days)`;
  }
}

/**
 * Calculate the due date for a task based on its subject
 * @param {Object} task - The task object
 * @param {string} task.subject - The subject of the task
 * @param {number} extraDays - Additional days to add to the calculated due date (default: 0)
 * @returns {string} Calculated due date in Finnish format (DD.MM.YYYY)
 */
export function calculateDueDate(task, extraDays = 0) {
  // If the task doesn't have a subject (e.g., chores), return today's date
  if (!task || !task.subject) {
    return getTodayFinDate();
  }
  
  // Calculate the next class day for the subject
  const nextClass = calculateNextClassDay(task.subject);
  
  // If the subject is not in the schedule, default to today
  if (!nextClass.found) {
    console.warn(`Could not find next class for subject: ${task.subject}`);
    return getTodayFinDate();
  }
  
  // Calculate the due date based on the next class occurrence plus any extra days
  return getDateRelativeToToday(nextClass.daysUntil + extraDays);
}

/**
 * Update a task with calculated due date based on its subject
 * @param {Object} task - The task to update
 * @param {boolean} override - Whether to override an existing due date (default: false)
 * @returns {Object} The updated task with calculated due date
 */
export function updateTaskWithCalculatedDueDate(task, override = false) {
  if (!task) return task;
  
  // Don't recalculate if the task already has a manually set due date and override is false
  if (task.dueDate && task.manuallySetDueDate && !override) {
    return task;
  }
  
  // Calculate the due date based on the next class occurrence
  const calculatedDueDate = calculateDueDate(task);
  
  // Update the task
  return {
    ...task,
    calculatedDueDate,
    dueDate: task.manuallySetDueDate ? task.dueDate : calculatedDueDate
  };
}

/**
 * Get the appropriate due date to use for a task (manually set or calculated)
 * @param {Object} task - The task object
 * @returns {string} The due date to use in Finnish format (DD.MM.YYYY)
 */
export function getEffectiveDueDate(task) {
  // If there's a manually set due date, prioritize it
  if (task.manuallySetDueDate && task.dueDate) {
    return task.dueDate;
  }
  
  // Otherwise use calculated due date if available
  if (task.calculatedDueDate) {
    return task.calculatedDueDate;
  }
  
  // If no calculated due date, try calculating it now
  if (task.subject) {
    return calculateDueDate(task);
  }
  
  // Default to the task's dueDate field or today if none available
  return task.dueDate || getTodayFinDate();
}

