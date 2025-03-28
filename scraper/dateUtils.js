// dateUtils.js - Utility functions for date handling in scraper
// Self-contained version for Node.js compatibility

// Date Formats
const FORMATS = {
  FINNISH: 'DD.MM.YYYY',
  ISO: 'YYYY-MM-DD',
};

/**
 * Convert between date formats
 * @param {string|Date} dateInput - Date string or Date object to convert
 * @param {string} fromFormat - Source format
 * @param {string} toFormat - Target format
 * @returns {string|null} - Converted date string or null if invalid
 */
function convertDateFormat(dateInput, fromFormat, toFormat) {
  // Handle empty or invalid dates
  if (!dateInput) {
    return null;
  }

  try {
    // If input is Date object, convert accordingly
    if (dateInput instanceof Date) {
      if (toFormat === FORMATS.FINNISH) {
        return `${dateInput.getDate().toString().padStart(2, '0')}.${(dateInput.getMonth() + 1).toString().padStart(2, '0')}.${dateInput.getFullYear()}`;
      } else if (toFormat === FORMATS.ISO) {
        return `${dateInput.getFullYear()}-${(dateInput.getMonth() + 1).toString().padStart(2, '0')}-${dateInput.getDate().toString().padStart(2, '0')}`;
      }
      return null;
    }

    // Parse according to the fromFormat
    let dateObj;
    
    if (fromFormat === FORMATS.FINNISH) {
      const parts = dateInput.split('.');
      if (parts.length !== 3) return null;
      dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else if (fromFormat === FORMATS.ISO) {
      const [year, month, day] = dateInput.split('-').map(part => parseInt(part, 10));
      dateObj = new Date(year, month - 1, day);
    } else {
      return null;
    }
    
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    // Format according to the toFormat
    if (toFormat === FORMATS.FINNISH) {
      return `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()}`;
    } else if (toFormat === FORMATS.ISO) {
      return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    } else {
      return null;
    }
  } catch (error) {
    console.warn('Error converting date format:', error, { dateInput, fromFormat, toFormat });
    return null;
  }
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns {string} Today's date in ISO format
 */
function getTodayIsoDate() {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * Convert ISO date to Date object
 * @param {string} isoDate - Date in ISO format
 * @returns {Date} Date object
 */
function isoToDate(isoDate) {
  if (!isoDate) return new Date();
  try {
    return new Date(isoDate);
  } catch (e) {
    console.warn('Invalid ISO date:', isoDate);
    return new Date();
  }
}

/**
 * Find the next occurrence of a subject's class from a given date
 * @param {string} subject - The subject name (e.g., 'Math', 'History')
 * @param {Date|string} fromDate - Starting date (Date object or ISO string)
 * @param {Object} [weeklySchedule] - Optional weekly schedule override
 * @returns {Date} Date object representing the next class occurrence
 */
function findNextClassOccurrence(subject, fromDate = new Date(), weeklySchedule = null) {
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

// Export the functions using CommonJS module.exports
module.exports = {
  FORMATS,
  convertDateFormat,
  getTodayIsoDate,
  isoToDate,
  findNextClassOccurrence
};
