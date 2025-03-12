// migrateDueDates.js - Script to update existing quests with calculated due dates

// Import required modules
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const dueDateUtil = require('./duedate');

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

/**
 * Migrate all quests to have calculated due dates
 */
async function migrateDueDates() {
  try {
    console.log('Starting migration of due dates for existing quests...');
    
    // Get all quests
    const questsRef = collection(db, 'quests');
    const questsSnapshot = await getDocs(questsRef);
    
    console.log(`Found ${questsSnapshot.size} quests to process`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each quest
    for (const questDoc of questsSnapshot.docs) {
      const quest = questDoc.data();
      const questId = questDoc.id;
      
      try {
        // Skip quests that already have a due date and calculationMethod
        if (quest.dueDate && quest.dueDateCalculationMethod) {
          console.log(`Skipping quest "${quest.title}" (${questId}) - already has due date calculation method: ${quest.dueDateCalculationMethod}`);
          skipped++;
          continue;
        }
        
        // Only calculate for quests with a subject
        if (!quest.subject) {
          console.log(`Skipping quest "${quest.title}" (${questId}) - no subject`);
          skipped++;
          continue;
        }
        
        // Calculate due date based on subject and creation date
        const creationDate = quest.createdAt ? new Date(quest.createdAt) : new Date();
        const { dueDate, calculationMethod, nextClassInfo } = 
          await dueDateUtil.calculateDueDate(db, quest.subject, creationDate);
        
        console.log(`Calculated due date for "${quest.title}" (${questId}): ${dueDate} (${calculationMethod})`);
        
        // Update the quest document
        const questRef = doc(db, 'quests', questId);
        await updateDoc(questRef, {
          dueDate,
          dueDateCalculationMethod: calculationMethod,
          nextClassInfo: nextClassInfo || ''
        });
        
        console.log(`Updated quest "${quest.title}" (${questId})`);
        updated++;
      } catch (error) {
        console.error(`Error processing quest ${questId}:`, error);
        errors++;
      }
    }
    
    console.log('Migration completed:');
    console.log(` - Updated: ${updated}`);
    console.log(` - Skipped: ${skipped}`);
    console.log(` - Errors: ${errors}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateDueDates()
  .then(() => console.log('Due date migration complete.'))
  .catch(error => console.error('Migration failed:', error));
