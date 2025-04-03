/**
 * dateUtils.js - Date handling utilities for Quest Board
 * 
 * Contains functions for date parsing, formatting, and comparison.
 * Focused on working with ISO dates (YYYY-MM-DD) and providing user-friendly relative text.
 * Optimized for ADHD users with clear, consistent date representation.
 */

/**
 * Safely parse an ISO date string into a Date object
 * @param {string|Date} dateInput - The ISO date string (YYYY-MM-DD) or Date object
 * @returns {Date|null} The parsed Date object or null if invalid
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;
  
  try {
    // If it's already a Date object, return it
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    
    // If it's an ISO string (YYYY-MM-DD)
    if (typeof dateInput === 'string') {
      // Create a new date and set to midnight to avoid timezone issues
      const date = new Date(dateInput);
      date.setHours(0, 0, 0, 0);
      
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing date:', error, { dateInput });
    return null;
  }
}

/**
 * Check if a date is today
 * @param {string|Date} dateInput - The date to check
 * @returns {boolean} True if the date is today
 */
export function isToday(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date.getTime() === today.getTime();
}

/**
 * Check if a date is tomorrow
 * @param {string|Date} dateInput - The date to check
 * @returns {boolean} True if the date is tomorrow
 */
export function isTomorrow(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return false;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  return date.getTime() === tomorrow.getTime();
}

/**
 * Check if a date is in the past
 * @param {string|Date} dateInput - The date to check
 * @returns {boolean} True if the date is in the past
 */
export function isPast(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date < today;
}

/**
 * Get a user-friendly relative text representation of a date
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Human-readable relative date text (e.g., "today", "tomorrow", "2 days ago")
 */
export function getRelativeTextFromISODate(dateInput) {
  // Handle missing dates
  if (!dateInput) {
    return 'No date';
  }

  const date = parseDate(dateInput);
  if (!date) {
    console.warn('Invalid date string provided:', dateInput);
    return 'Invalid date';
  }

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is today
  if (date.getTime() === today.getTime()) {
    return 'today';
  }
  
  // Calculate difference in days
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    if (diffDays === -1) return 'yesterday';
    if (diffDays > -7) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > -30) return `${Math.floor(Math.abs(diffDays) / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get today's date as an ISO string (YYYY-MM-DD)
 * @returns {string} Today's date in ISO format
 */
export function getTodayISO() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date as an ISO string (YYYY-MM-DD)
 * @returns {string} Tomorrow's date in ISO format
 */
export function getTomorrowISO() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Get a date relative to today as an ISO string
 * @param {number} days - Number of days from today (negative for past, positive for future)
 * @returns {string} The calculated date in ISO format
 */
export function getDateRelativeToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get the day name from a date
 * @param {Date|string} dateInput - Date to get the day name for
 * @returns {string} Day name (Monday, Tuesday, etc.)
 */
export function getDayName(dateInput = new Date()) {
  const date = parseDate(dateInput) || new Date();
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Get the number of days between two dates
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number|null} Number of days between dates or null if dates are invalid
 */
export function getDaysBetween(date1, date2) {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return null;
  
  const diffTime = Math.abs(d2 - d1);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is older than a specified number of days
 * @param {string|Date} dateInput - The date to check
 * @param {number} days - Number of days threshold
 * @returns {boolean} True if the date is older than the specified days
 */
export function isOlderThan(dateInput, days = 14) {
  const date = parseDate(dateInput);
  if (!date) return false;
  
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  threshold.setHours(0, 0, 0, 0);
  
  return date < threshold;
}

/**
 * Format a date with a specific format
 * @param {string|Date} dateInput - The date to format
 * @param {Object} options - Formatting options for toLocaleDateString
 * @returns {string} Formatted date string
 */
export function formatDate(dateInput, options = { month: 'long', day: 'numeric' }) {
  const date = parseDate(dateInput);
  if (!date) return 'Invalid date';
  
  return date.toLocaleDateString('en-US', options);
}
