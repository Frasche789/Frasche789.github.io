// firestore-sync.js - Module for synchronizing with Firestore
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { translateSubjectName, normalizeDate } = require('./task-processor');

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where 
} = require('firebase/firestore');

// File paths
const DATA_DIR = path.join(__dirname, 'data');

// Make sure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

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

// Helper function to load existing data from Firestore
async function loadExistingData() {
  try {
    // Default data structure
    let data = { students: [{ id: 1, name: 'Nuno'}], tasks: [] };
    
    try {
      // Get students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      if (!studentsSnapshot.empty) {
        data.students = studentsSnapshot.docs.map(doc => ({
          id: parseInt(doc.id, 10) || doc.id,
          ...doc.data()
        }));
      }
      
      // Get tasks
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      if (!tasksSnapshot.empty) {
        data.tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      console.log(`Loaded ${data.students.length} students and ${data.tasks.length} tasks from Firestore`);
    } catch (firestoreError) {
      console.error('Firestore connection error. Using default data:', firestoreError);
      // Continue with default data structure already defined
    }
    
    return data;
  } catch (error) {
    console.error('Error reading existing data from Firestore:', error);
    return { students: [{ id: 1, name: 'Nuno'}], tasks: [] };
  }
}

// Function to save data to Firestore
async function saveNewTasks(tasks) {
  try {
    let successCount = 0;
    
    for (const task of tasks) {
      // Translate subject name for consistency
      let normalizedSubject = translateSubjectName(task.subject);
      
      // Ensure date is in correct format
      let normalizedDate = normalizeDate(task.date);
      let normalizedDueDate = normalizeDate(task.due_date || task.date);
      
      try {
        // Prepare data with sanitized values
        const taskData = {
          date: normalizedDate || '',
          due_date: normalizedDueDate || '',
          description: task.description || '',
          subject: normalizedSubject || 'Unknown',
          type: task.type || 'homework',
          status: task.status || 'open',
          student_id: Number(task.student_id) || 1,
          completed: Boolean(task.completed) || false
        };
        
        // Add topic field if it exists (for exams)
        if (task.topic) {
          taskData.topic = task.topic;
        }
        
        // Check if similar task already exists
        const q = query(
          collection(db, 'tasks'), 
          where('subject', '==', taskData.subject),
          where('description', '==', taskData.description)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // Task doesn't exist yet, add it
          const docRef = await addDoc(collection(db, 'tasks'), taskData);
          console.log(`Added new ${task.type} task with ID: ${docRef.id}`);
          successCount++;
        } else {
          console.log(`Task already exists in Firestore, skipping: ${task.description?.substring(0, 30)}...`);
        }
      } catch (error) {
        console.error('Error adding specific task to Firestore:', error);
        console.error('Problematic task data:', { 
          date: normalizedDate, 
          subject: normalizedSubject,
          description: task.description?.substring(0, 50) || 'undefined'
        });
      }
    }
    
    console.log(`Data saved successfully to Firestore. Added ${successCount} new tasks.`);
    return successCount;
  } catch (error) {
    console.error('Error saving data to Firestore:', error);
    // Fallback to local JSON file if Firestore fails
    try {
      const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
      fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks }, null, 2), 'utf8');
      console.log('Data saved to local JSON file as fallback');
      return 0;
    } catch (fallbackError) {
      console.error('Error saving fallback data to JSON:', fallbackError);
      return 0;
    }
  }
}

// Function to sync the processed tasks with existing Firestore data
async function syncTasks(newTasks) {
  try {
    console.log(`Preparing to sync ${newTasks.length} tasks with Firestore`);
    
    // Load existing data
    const existingData = await loadExistingData();
    let newTasksFound = 0;
    
    // Filter out tasks that already exist in the database
    const tasksToAdd = newTasks.filter(newTask => {
      const exists = existingData.tasks.some(existingTask => 
        existingTask.due_date === newTask.due_date && 
        existingTask.subject === newTask.subject && 
        ((existingTask.topic === newTask.topic && newTask.topic) || 
         (existingTask.description === newTask.description && newTask.description)) && 
        existingTask.type === newTask.type && 
        existingTask.student_id === newTask.student_id
      );
      
      return !exists;
    });
    
    console.log(`Found ${tasksToAdd.length} new tasks to add out of ${newTasks.length} total tasks`);
    
    // Save the new tasks
    if (tasksToAdd.length > 0) {
      newTasksFound = await saveNewTasks(tasksToAdd);
    } else {
      console.log('No new tasks to add.');
    }
    
    // Print summary statistics
    console.log(`\n===== SYNC SUMMARY =====`);
    console.log(`Found ${newTasksFound} new tasks in total`);
    console.log('Sync completed successfully');
    
    return newTasksFound;
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

// Export the module functions
module.exports = {
  loadExistingData,
  saveNewTasks,
  syncTasks
};
