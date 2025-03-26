// archive-old-tasks.js - One-off script to mark old tasks as done
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where 
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

// Helper function to calculate date 14 days ago
function getDateTwoWeeksAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 14);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Main function
async function archiveOldTasks() {
  try {
    console.log('Starting to archive old tasks...');
    
    // Get the cutoff date (14 days ago)
    const cutoffDate = getDateTwoWeeksAgo();
    console.log(`Cutoff date: ${cutoffDate}`);
    
    // Get all tasks
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    let totalTasks = 0;
    let updatedTasks = 0;
    
    // Process each task
    for (const taskDoc of tasksSnapshot.docs) {
      totalTasks++;
      const task = taskDoc.data();
      const taskId = taskDoc.id;
      
      // Check if task is already completed
      if (task.completed) {
        continue;
      }
      
      // Check task dates
      let shouldComplete = false;
      
      // For homework tasks, check date_added
      if (task.type === 'homework' && task.date_added && task.date_added < cutoffDate) {
        shouldComplete = true;
      }
      
      // For exam tasks, check due_date
      if (task.type === 'exam' && task.due_date && task.due_date < cutoffDate) {
        shouldComplete = true;
      }
      
      // Update task if needed
      if (shouldComplete) {
        try {
          await updateDoc(doc(db, 'tasks', taskId), {
            completed: true,
            status: 'completed'
          });
          
          updatedTasks++;
          console.log(`Marked task as completed: ${taskId} (${task.subject} - ${task.type})`);
        } catch (updateError) {
          console.error(`Error updating task ${taskId}:`, updateError);
        }
      }
    }
    
    console.log(`\n===== ARCHIVE SUMMARY =====`);
    console.log(`Total tasks: ${totalTasks}`);
    console.log(`Tasks marked as completed: ${updatedTasks}`);
    console.log('Archive process completed');
    
  } catch (error) {
    console.error('Error archiving old tasks:', error);
  }
}

// Run the script
archiveOldTasks();
