// migrateDueDates.js - One-time script to calculate due dates for all existing quests
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc 
} = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to calculate due date based on subject and schedule
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
    const scheduleConfigRef = doc(db, "scheduleConfig", subject);
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

// Main migration function
async function migrateExistingQuests() {
  try {
    console.log('Starting migration to add due dates to existing quests...');
    
    // Get all quests from Firestore
    const questsSnapshot = await getDocs(collection(db, "quests"));
    
    if (questsSnapshot.empty) {
      console.log('No quests found in database. Migration complete.');
      return;
    }
    
    console.log(`Found ${questsSnapshot.size} quests to process.`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each quest
    for (const docSnapshot of questsSnapshot.docs) {
      try {
        const questData = docSnapshot.data();
        const questId = docSnapshot.id;
        
        // Skip quests that already have a due date
        if (questData.dueDate) {
          console.log(`Quest ${questId} already has a due date: ${questData.dueDate}. Skipping.`);
          skippedCount++;
          continue;
        }
        
        console.log(`Processing quest: ${questId} - ${questData.subject}: ${questData.description}`);
        
        // Calculate due date based on subject and creation date
        const dueDate = await calculateDueDate(questData.subject, questData.date);
        
        // Update the quest with the calculated due date
        await updateDoc(doc(db, "quests", questId), {
          dueDate: dueDate,
          dueDateCalculationMethod: "schedule"
        });
        
        console.log(`Updated quest ${questId} with due date: ${dueDate}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`Error processing quest ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\nMigration summary:');
    console.log(`Total quests: ${questsSnapshot.size}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (already had due date): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('Migration complete!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateExistingQuests()
  .then(() => {
    console.log('Due date migration finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
