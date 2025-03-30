/**
 * dateUtils.js - Date handling utilities for Quest Board
 * Contains functions for date parsing, formatting, and comparison
 * Focused on Finnish date format (DD.MM.YYYY)
 */
// Date Formats

const FORMATS = {
  FINNISH: 'DD.MM.YYYY',
  ISO: 'YYYY-MM-DD',
};

// Convert between date formats
function convertDateFormat(dateString, fromFormat, toFormat) {
  // Handle empty or invalid dates
  if (!dateString || typeof dateString !== 'string') {
    console.warn('Invalid date string provided:', dateString);
    return null;
  }

  try {
    // Parse according to the fromFormat
    let dateObj;
    
    if (fromFormat === FORMATS.FINNISH) {
      dateObj = convertDateFormat(dateString, FORMATS.FINNISH, FORMATS.ISO);
    } else if (fromFormat === FORMATS.ISO) {
      const [year, month, day] = dateString.split('-').map(part => parseInt(part, 10));
      dateObj = new Date(year, month - 1, day);
    } else {
      console.warn('Unsupported fromFormat:', fromFormat);
      return null;
    }
    
    if (!dateObj) {
      return null;
    }
    
    // Format according to the toFormat
    if (toFormat === FORMATS.FINNISH) {
      return `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()}`;
    } else if (toFormat === FORMATS.ISO) {
      return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    } else {
      console.warn('Unsupported toFormat:', toFormat);
      return null;
    }
  } catch (error) {
    console.warn('Error converting date format:', error, { dateString, fromFormat, toFormat });
    return null;
  }
}

export { convertDateFormat, FORMATS };

/**
 * Get today's date in Finnish format (DD.MM.YYYY)
 * @returns {string} Today's date in Finnish format
 */
export function getTodayFinDate() {
  const today = new Date();
  return convertDateFormat(today, FORMATS.ISO, FORMATS.FINNISH);
}


/**
 * Format a Finnish date (DD.MM.YYYY) to a more readable format (e.g., "March 16")
 * @param {string} finDate - Date in Finnish format
 * @param {Object} [options] - Formatting options to pass to toLocaleDateString
 * @returns {string} Formatted date string
 */
export function formatFinDate(finDate, options = { month: 'long', day: 'numeric' }) {
  const date = convertDateFormat(finDate, FORMATS.FINNISH, FORMATS.ISO);
  if (!date) return 'Invalid date';
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date string for display
 * Serve as an alias to formatFinDate for compatibility with existing code
 * @param {string} date - Date string in Finnish format (DD.MM.YYYY)
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export function formatDate(date, options = { month: 'long', day: 'numeric' }) {
  return formatFinDate(date, options);
}

/**
 * Compare two dates and determine their relation
 * @param {string} date1 - First date in Finnish format
 * @param {string} date2 - Second date in Finnish format
 * @returns {number} -1 if date1 is before date2, 0 if equal, 1 if date1 is after date2, 
 *                    2 if date1 is invalid, 3 if date2 is invalid, 4 if both are invalid
 */
export function compareDates(date1, date2) {
  const d1 = convertDateFormat(date1, FORMATS.FINNISH, FORMATS.ISO);
  const d2 = convertDateFormat(date2, FORMATS.FINNISH, FORMATS.ISO);
  
  // Handle null values (invalid dates)
  if (!d1 && !d2) return 4; // Both dates invalid
  if (!d1) return 2; // First date invalid
  if (!d2) return 3; // Second date invalid
  
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
 * @param {string} [todayDate] - Today's date in Finnish format (optional)
 * @returns {string} Human-readable relative date
 */
export function getRelativeDateText(finDate, todayDate = getTodayFinDate()) {
  // Handle missing or invalid dates
  if (!finDate || finDate === 'No Due Date') {
    return 'No due date';
  }
  
  const comparison = compareDates(finDate, todayDate);
  
  // Handle comparison special cases
  if (comparison >= 2) {
    return 'Invalid date';
  }
  
  if (comparison === 0) return 'Today';
  
  const date = convertDateFormat(finDate, FORMATS.FINNISH, FORMATS.ISO);
  const today = convertDateFormat(todayDate, FORMATS.FINNISH, FORMATS.ISO);
  
  // Safety check
  if (!date || !today) {
    return 'Invalid date';
  }
  
  // Calculate difference in days
  const diffTime = Math.abs(date - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (comparison === -1) {
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  } else {
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }
}

/**
 * Format a date as a relative timeframe directly from ISO format
 * @param {string} isoDate - Date in ISO format (YYYY-MM-DD) or Date object
 * @returns {string} Human-readable relative date
 */
export function getRelativeTextFromISODate(isoDate) {
  // Handle missing dates
  if (!isoDate) {
    return 'No date';
  }

  // Parse the date - handle both string dates and Date objects
  let dateObj;
  try {
    dateObj = isoDate instanceof Date ? isoDate : new Date(isoDate);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
  } catch (error) {
    console.warn('Error parsing ISO date:', error);
    return 'Invalid date';
  }

  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Set time to midnight for accurate day comparison
  dateObj.setHours(0, 0, 0, 0);
  
  // Check if date is today
  if (dateObj.getTime() === today.getTime()) {
    return 'Today';
  }
  
  // Calculate difference in days
  const diffTime = dateObj.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  } else {
    if (diffDays === -1) return 'Yesterday';
    return `${Math.abs(diffDays)} days ago`;
  }
}

/**
 * Check if a date is today - works with ISO format dates
 * @param {string} dateString - Date in ISO format or Finnish format
 * @returns {boolean} True if the date is today
 */
export function isToday(dateString) {
  // Handle missing or invalid dates
  if (!dateString || dateString === 'No Due Date') {
    return false;
  }
  
  try {
    // Try to parse as ISO date first
    const dateObj = new Date(dateString);
    
    // If valid ISO date
    if (!isNaN(dateObj.getTime())) {
      const today = new Date();
      return (
        dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear()
      );
    }
    
    // Fall back to Finnish format check
    const todayFormatted = getTodayFinDate();
    const comparison = compareDates(dateString, todayFormatted);
    return comparison === 0;
  } catch (error) {
    console.warn('Error checking if date is today:', error);
    return false;
  }
}

/**
 * Check if a date is tomorrow
 * @param {string} finDate - Date in Finnish format
 * @returns {boolean} True if the date is tomorrow
 */
export function isTomorrow(finDate) {
  const today = convertDateFormat(getTodayFinDate(), FORMATS.FINNISH, FORMATS.ISO);
  if (!today) return false;
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tomorrowFin = `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;
  
  return compareDates(finDate, tomorrowFin) === 0;
}

/**
 * Calculate a date a specified number of days from today
 * @param {number} days - Number of days from today (negative for past, positive for future)
 * @returns {string} Date in Finnish format
 */
export function getDateRelativeToToday(days) {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + days);
  
  return convertDateFormat(targetDate, FORMATS.ISO, FORMATS.FINNISH);
}

/**
 * Create tomorrow's date in Finnish format
 * @returns {string} Tomorrow's date in Finnish format
 */
export function getTomorrowFinDate() {
  return getDateRelativeToToday(1);
}

/**
 * Get the number of days between two Finnish format dates
 * @param {string} date1 - First date in Finnish format
 * @param {string} date2 - Second date in Finnish format
 * @returns {number|null} Number of days between dates or null if dates are invalid
 */
export function getDaysBetweenDates(date1, date2) {
  const d1 = convertDateFormat(date1, FORMATS.FINNISH, FORMATS.ISO);
  const d2 = convertDateFormat(date2, FORMATS.FINNISH, FORMATS.ISO);
  
  if (!d1 || !d2) return null;
  
  // Reset time parts for accurate date comparison
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get day name from a date
 * @param {Date} date - Date object
 * @returns {string} Day name (Monday, Tuesday, etc.)
 */
export function getDayName(date = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if a date is older than the specified number of days
 * @param {string} dateString - Date in Finnish format
 * @param {number} days - Number of days threshold
 * @returns {boolean} True if the date is older than the specified days
 */
export function isDateOlderThan(dateString, days = 14) {
  if (!dateString) return false;
  
  const date = convertDateFormat(dateString, FORMATS.FINNISH, FORMATS.ISO);
  if (!date) return false;
  
  const today = new Date();
  
  // Reset time parts for accurate date comparison
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = today - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > days;
}

/**
 * Find the next occurrence of a subject's class from a given date
 * @param {string} subject - The subject name (e.g., 'Math', 'History')
 * @param {Date|string} fromDate - Starting date (Date object or ISO string)
 * @param {Object} [weeklySchedule] - Optional weekly schedule override
 * @returns {Date} Date object representing the next class occurrence
 */
export function findNextClassOccurrence(subject, fromDate = new Date(), weeklySchedule = null) {
  // Convert fromDate to Date object if it's a string
  const startDate = fromDate instanceof Date ? new Date(fromDate) : new Date(fromDate);
  
  // Reset hours to ensure consistent date comparison
  startDate.setHours(0, 0, 0, 0);
  
  // Default weekly schedule - subjects and their weekdays (0 = Sunday, 1 = Monday, etc.)
  // This can be overridden by passing a different schedule
  const schedule = weeklySchedule || {
    'Math': [1, 3, 5],       // Monday, Wednesday, Friday
    'Finnish': [1, 2, 4],    // Monday, Tuesday, Thursday
    'English': [2, 4],       // Tuesday, Thursday
    'History': [3, 5],       // Wednesday, Friday
    'Civics': [2, 4],        // Tuesday, Thursday
    'Ethics': [3],           // Wednesday
    'Eco': [1, 5]            // Monday, Friday
  };
  
  // Get the subject's schedule (case insensitive match)
  const subjectLower = subject.toLowerCase();
  const subjectWeekdays = Object.keys(schedule).find(
    key => key.toLowerCase() === subjectLower
  ) ? schedule[Object.keys(schedule).find(
    key => key.toLowerCase() === subjectLower
  )] : [];
  
  // If subject not found in schedule, return the next day as fallback
  if (!subjectWeekdays || subjectWeekdays.length === 0) {
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }
  
  // Find the next occurrence
  let nextDate = new Date(startDate);
  let daysChecked = 0;
  const MAX_DAYS = 14; // Safety limit to prevent infinite loops
  
  while (daysChecked < MAX_DAYS) {
    // Move to the next day
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Check if this day matches one of the subject's weekdays
    const weekday = nextDate.getDay(); // 0-6
    if (subjectWeekdays.includes(weekday)) {
      return nextDate; // Found the next occurrence
    }
    
    daysChecked++;
  }
  
  // Fallback: if no match found within reasonable time, return next day
  const fallbackDate = new Date(startDate);
  fallbackDate.setDate(fallbackDate.getDate() + 1);
  return fallbackDate;
}

// Convert ISO date to Date object
function isoToDate(isoDate) {
  if (!isoDate) return new Date();
  try {
    return new Date(isoDate);
  } catch (e) {
    console.warn('Invalid ISO date:', isoDate);
    return new Date();
  }
}

export { isoToDate };
