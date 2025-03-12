// dueDate.js - Due date calculation utilities

// Import Firebase modules
const { doc, getDoc, setDoc, collection } = require('firebase/firestore');
const { defaultScheduleConfig, getSubjectConfig } = require('./scheduleConfig');

// Due date calculation system
const dueDateUtil = {
  /**
   * Calculate due date based on subject and class schedule
   * @param {string} subject - The subject of the quest/homework
   * @param {Date|string} creationDate - The creation date of the quest
   * @returns {Promise<string>} - Promise resolving to ISO date string (YYYY-MM-DD)
   */
  async calculateDueDate(db, subject, creationDate) {
    try {
      // Default to 7 days if calculation fails
      let defaultDueInterval = 7;
      
      // Convert creation date to a Date object if it's a string
      const createDate = typeof creationDate === 'string' 
        ? new Date(creationDate) 
        : creationDate;
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const creationDayNum = createDate.getDay();
      // Convert to day name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const creationDay = dayNames[creationDayNum];
      
      console.log(`Calculating due date for ${subject} created on ${creationDay}`);
      
      // Normalize subject name (convert to English equivalent if needed)
      const normalizedSubject = this.normalizeSubjectName(subject);
      
      // Get schedule configuration - first try Firestore, then fall back to local config
      let scheduleConfig;
      
      try {
        // Try to get from Firestore first
        const scheduleConfigRef = doc(db, "scheduleConfig", normalizedSubject);
        const scheduleConfigSnap = await getDoc(scheduleConfigRef);
        
        if (scheduleConfigSnap.exists()) {
          scheduleConfig = scheduleConfigSnap.data();
        } else {
          // Fall back to local config
          scheduleConfig = getSubjectConfig(normalizedSubject);
        }
      } catch (error) {
        console.warn(`Error fetching schedule from Firestore: ${error.message}`);
        // Fall back to local config
        scheduleConfig = getSubjectConfig(normalizedSubject);
      }
      
      const classDays = scheduleConfig.classDays || [];
      defaultDueInterval = scheduleConfig.defaultDueInterval || 7;
      
      console.log(`Class days for ${normalizedSubject}: ${classDays.join(', ')}`);
      
      if (classDays.length > 0) {
        // Find all upcoming class days from the creation date
        const upcomingClassDays = [];
        
        // Check up to 14 days forward to find class days
        for (let daysToAdd = 1; daysToAdd <= 14; daysToAdd++) {
          // Calculate the next day
          const nextDate = new Date(createDate);
          nextDate.setDate(createDate.getDate() + daysToAdd);
          const nextDayNum = nextDate.getDay();
          const nextDayName = dayNames[nextDayNum];
          
          // Check if this is a class day for the subject
          if (classDays.includes(nextDayName)) {
            upcomingClassDays.push({
              date: nextDate,
              dayName: nextDayName,
              daysFromCreation: daysToAdd
            });
          }
        }
        
        // Sort by days from creation (closest first)
        upcomingClassDays.sort((a, b) => a.daysFromCreation - b.daysFromCreation);
        
        // If there's at least one upcoming class, use the closest one as due date
        if (upcomingClassDays.length > 0) {
          const nextClassDay = upcomingClassDays[0];
          console.log(`Next ${normalizedSubject} class is on ${nextClassDay.dayName} (${nextClassDay.date.toDateString()}), ${nextClassDay.daysFromCreation} days after creation`);
          
          // Format the date in ISO format
          return { 
            dueDate: nextClassDay.date.toISOString().split('T')[0],
            calculationMethod: 'schedule',
            nextClassInfo: `${nextClassDay.dayName}, ${nextClassDay.daysFromCreation} days after assignment`
          };
        }
      }
      
      // Fallback: use default due interval from config
      console.log(`No upcoming class days found for ${normalizedSubject}, using default interval of ${defaultDueInterval} days`);
      const dueDate = new Date(createDate);
      dueDate.setDate(createDate.getDate() + defaultDueInterval);
      return { 
        dueDate: dueDate.toISOString().split('T')[0],
        calculationMethod: 'default',
        nextClassInfo: `Default ${defaultDueInterval} day interval`
      };
    } catch (error) {
      console.error('Error calculating due date:', error);
      // Fallback to one week from creation
      const dueDate = new Date(creationDate);
      dueDate.setDate(dueDate.getDate() + 7);
      return { 
        dueDate: dueDate.toISOString().split('T')[0],
        calculationMethod: 'error',
        nextClassInfo: 'Error occurred, used 7-day default'
      };
    }
  },
  
  /**
   * Normalize subject names (convert Finnish names to English equivalents)
   * @param {string} subject - Original subject name
   * @returns {string} - Normalized subject name
   */
  normalizeSubjectName(subject) {
    // Convert to lowercase for case-insensitive matching
    const subjectLower = typeof subject === 'string' ? subject.toLowerCase() : '';
    
    // Map of Finnish subject names to English equivalents
    const subjectMapping = {
      'äidinkieli': 'Finnish',
      'matematiikka': 'Math',
      'englanti': 'English',
      'historia': 'History',
      'ympäristöoppi': 'Eco',
      'yhteiskuntaoppi': 'Civics',
      'käsityö': 'Crafts',
      'kuvataide': 'Art',
      'liikunta': 'PE',
      'musiikki': 'Music',
      'etiikka': 'Ethics',
      'digitaidot': 'Digi'
    };
    
    // Check if we have a mapping for this subject
    if (subjectMapping[subjectLower]) {
      return subjectMapping[subjectLower];
    }
    
    // For subjects that are already in English, pass through
    const englishSubjects = ['math', 'english', 'history', 'eco', 'civics', 'crafts', 
                          'art', 'pe', 'music', 'ethics', 'digi', 'finnish'];
    
    if (englishSubjects.includes(subjectLower)) {
      // Capitalize first letter for consistency
      return subjectLower.charAt(0).toUpperCase() + subjectLower.slice(1);
    }
    
    // If no mapping found, return original
    return subject;
  },
  
  /**
   * Format a due date for display
   * @param {string} dateString - ISO format date string
   * @returns {string} - Formatted date string
   */
  formatDueDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  },
  
  /**
   * Check if a due date is overdue
   * @param {string} dueDateString - ISO format date string
   * @returns {boolean} - True if overdue
   */
  isOverdue(dueDateString, status = 'open') {
    if (!dueDateString || status === 'completed') return false;
    
    const dueDate = new Date(dueDateString);
    const today = new Date();
    
    // Reset time component for date comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }
};

module.exports = dueDateUtil;