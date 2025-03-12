// duedate.js - Schedule-based due date calculation system

/**
 * Calculate due date based on subject and class schedule
 * @param {string} subject - The subject of the quest/homework
 * @param {Date|string} creationDate - The creation date of the quest
 * @returns {Promise<string>} - Promise resolving to ISO date string (YYYY-MM-DD)
 */
async function calculateDueDate(subject, creationDate) {
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
    
    // Fetch schedule configuration from Firestore
    const { doc, getDoc } = window.firebaseModules;
    const scheduleConfigRef = doc(window.db, "scheduleConfig", subject);
    const scheduleConfigSnap = await getDoc(scheduleConfigRef);
    
    if (scheduleConfigSnap.exists()) {
      const scheduleConfig = scheduleConfigSnap.data();
      const classDays = scheduleConfig.classDays || [];
      defaultDueInterval = scheduleConfig.defaultDueInterval || 7;
      
      console.log(`Class days for ${subject}: ${classDays.join(', ')}`);
      
      if (classDays.length > 0) {
        // Find the next class day after the creation date
        let nextClassDay = null;
        let daysToAdd = 1;
        
        // Check up to 14 days forward to find the next class
        while (!nextClassDay && daysToAdd <= 14) {
          // Calculate the next day
          const nextDate = new Date(createDate);
          nextDate.setDate(createDate.getDate() + daysToAdd);
          const nextDayNum = nextDate.getDay();
          const nextDayName = dayNames[nextDayNum];
          
          // Check if this is a class day for the subject
          if (classDays.includes(nextDayName)) {
            nextClassDay = nextDate;
            break;
          }
          
          daysToAdd++;
        }
        
        if (nextClassDay) {
          console.log(`Next ${subject} class is on ${nextClassDay.toDateString()}`);
          // Format the date in ISO format
          return nextClassDay.toISOString().split('T')[0];
        }
      }
    } else {
      console.log(`No schedule configuration found for ${subject}, using default interval of ${defaultDueInterval} days`);
    }
    
    // Fallback: use default due interval from config or 7 days
    const dueDate = new Date(createDate);
    dueDate.setDate(createDate.getDate() + defaultDueInterval);
    return dueDate.toISOString().split('T')[0];
    
  } catch (error) {
    console.error('Error calculating due date:', error);
    // Fallback to one week from creation
    const dueDate = new Date(creationDate);
    dueDate.setDate(dueDate.getDate() + 7);
    return dueDate.toISOString().split('T')[0];
  }
}

/**
 * Add due date to a new quest being created
 * This function should be called when a new quest is created
 * @param {Object} questData - The quest data object
 * @returns {Promise<Object>} - Promise resolving to updated quest data with due date
 */
async function addDueDateToQuest(questData) {
  try {
    // Calculate due date based on subject and creation date
    const dueDate = await calculateDueDate(questData.subject, questData.date);
    
    // Add due date fields to questData
    return {
      ...questData,
      dueDate: dueDate,
      dueDateCalculationMethod: "schedule" // or "manual" if set manually
    };
  } catch (error) {
    console.error('Error adding due date to quest:', error);
    // Return original data if there's an error
    return questData;
  }
}

/**
 * Helper function to format a date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string (DD.MM.YYYY)
 */
function formatDueDate(dateString) {
  if (!dateString) return 'No due date';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Error formatting due date:', error);
    return 'Error formatting date';
  }
}

/**
 * Calculate due dates for all existing quests in the database
 * This function should be run once as a migration script
 * @returns {Promise<void>}
 */
async function calculateDueDatesForExistingQuests() {
  try {
    console.log('Starting due date calculation for existing quests...');
    
    const { collection, getDocs, doc, updateDoc } = window.firebaseModules;
    const questsSnapshot = await getDocs(collection(window.db, "quests"));
    
    if (questsSnapshot.empty) {
      console.log('No quests found in database');
      return;
    }
    
    let updatedCount = 0;
    
    // Process each quest
    for (const docSnapshot of questsSnapshot.docs) {
      const questData = docSnapshot.data();
      
      // Skip quests that already have a due date
      if (questData.dueDate) {
        console.log(`Quest ${docSnapshot.id} already has a due date: ${questData.dueDate}`);
        continue;
      }
      
      // Calculate due date
      const dueDate = await calculateDueDate(questData.subject, questData.date);
      
      // Update quest with due date
      await updateDoc(doc(window.db, "quests", docSnapshot.id), {
        dueDate: dueDate,
        dueDateCalculationMethod: "schedule"
      });
      
      updatedCount++;
      console.log(`Updated quest ${docSnapshot.id} with due date: ${dueDate}`);
    }
    
    console.log(`Successfully updated ${updatedCount} quests with due dates`);
  } catch (error) {
    console.error('Error calculating due dates for existing quests:', error);
  }
}

// Export the functions for use in other files
window.dueDate = {
  calculateDueDate,
  addDueDateToQuest,
  formatDueDate,
  calculateDueDatesForExistingQuests
};
