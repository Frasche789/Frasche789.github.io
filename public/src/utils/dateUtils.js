/**
 * dateUtils.js - Date handling utilities for Quest Board
 * Contains functions for date parsing, formatting, and comparison
 */

/**
 * Get today's date in Finnish format (DD.MM.YYYY)
 * @returns {string} Today's date in Finnish format
 */
export function getTodayFinDate() {
  const today = new Date();
  return `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
}

/**
 * Parse a Finnish format date string (DD.MM.YYYY) into a JavaScript Date object
 * @param {string} finDate - Date string in Finnish format (DD.MM.YYYY)
 * @returns {Date} JavaScript Date object
 */
export function parseFinDate(finDate) {
  // Handle invalid input
  if (!finDate || typeof finDate !== 'string') {
    console.error('Invalid date format received:', finDate);
    return new Date(); // Return today as fallback
  }
  
  try {
    // Basic validation for Finnish date format DD.MM.YYYY
    if (!/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(finDate)) {
      console.warn('Date format does not match DD.MM.YYYY:', finDate);
      // Try to be flexible and do our best to parse it anyway
    }
    
    // Split the date into components
    const [day, month, year] = finDate.split('.').map(part => parseInt(part, 10));
    
    // Validate day, month, and year values
    const isValidDay = day >= 1 && day <= 31;
    const isValidMonth = month >= 1 && month <= 12;
    const isValidYear = year >= 1000 && year <= 9999;
    
    if (!isValidDay || !isValidMonth || !isValidYear) {
      console.error('Invalid date components:', { day, month, year });
      return new Date(); // Return today as fallback
    }
    
    // Create a new Date (months are 0-indexed in JS Date)
    const dateObj = new Date(year, month - 1, day);
    
    // Check if date is valid (for example, 31.04.2023 would become 01.05.2023)
    if (dateObj.getDate() !== day) {
      console.warn('Date was adjusted by browser:', { 
        original: finDate, 
        adjusted: `${dateObj.getDate()}.${dateObj.getMonth() + 1}.${dateObj.getFullYear()}`
      });
    }
    
    return dateObj;
  } catch (error) {
    console.error('Error parsing date:', error, finDate);
    return new Date(); // Return today as fallback
  }
}

/**
 * Compare two dates and determine their relation
 * @param {string} date1 - First date in Finnish format
 * @param {string} date2 - Second date in Finnish format
 * @returns {number} -1 if date1 is before date2, 0 if equal, 1 if date1 is after date2
 */
export function compareDates(date1, date2) {
  const d1 = parseFinDate(date1);
  const d2 = parseFinDate(date2);
  
  // Reset time parts for accurate date comparison
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Format a date as a relative timeframe (Today, Tomorrow, n days)
 * @param {string} finDate - Date in Finnish format
 * @param {string} todayDate - Today's date in Finnish format (optional)
 * @returns {string} Human-readable relative date
 */
export function getRelativeDateText(finDate, todayDate = getTodayFinDate()) {
  const comparison = compareDates(finDate, todayDate);
  
  if (comparison === 0) return 'Today';
  
  const date = parseFinDate(finDate);
  const today = parseFinDate(todayDate);
  
  // Calculate difference in days
  const diffTime = Math.abs(date - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (comparison === 1) {
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return finDate; // Just return the date for dates far in the future
  } else {
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return finDate; // Just return the date for dates far in the past
  }
}

/**
 * Check if a date is today
 * @param {string} finDate - Date in Finnish format
 * @returns {boolean} True if the date is today
 */
export function isToday(finDate) {
  return compareDates(finDate, getTodayFinDate()) === 0;
}

/**
 * Check if a date is tomorrow
 * @param {string} finDate - Date in Finnish format
 * @returns {boolean} True if the date is tomorrow
 */
export function isTomorrow(finDate) {
  const today = parseFinDate(getTodayFinDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tomorrowFin = `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;
  
  return compareDates(finDate, tomorrowFin) === 0;
}
