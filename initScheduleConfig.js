// initScheduleConfig.js - Script to initialize the schedule configuration in Firestore

// Import required modules
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, deleteDoc, getDocs } = require('firebase/firestore');
const { defaultScheduleConfig } = require('./scheduleConfig');

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
 * Parse the schedule.txt file to extract class schedule information
 * @returns {Promise<Object>} Map of subjects to their schedule configuration
 */
async function parseScheduleFile() {
  try {
    // Read the schedule.txt file
    const scheduleFilePath = path.join(__dirname, 'schedule.txt');
    const scheduleContent = await fs.promises.readFile(scheduleFilePath, 'utf8');
    
    // Parse the content to extract schedule information
    const scheduleLines = scheduleContent.split('\n').filter(line => line.trim() !== '');
    
    // Use the defaultScheduleConfig as a base
    const scheduleConfig = { ...defaultScheduleConfig };
    
    // Process each line of the schedule
    for (const line of scheduleLines) {
      // Example format: "Monday: Math, Eco, PE, Crafts"
      const [day, subjectsStr] = line.split(':').map(part => part.trim());
      
      if (!day || !subjectsStr) continue;
      
      const subjects = subjectsStr.split(',').map(subject => subject.trim());
      
      // Update the schedule config for each subject on this day
      for (const subject of subjects) {
        // Normalize subject name
        const normalizedSubject = normalizeSubjectName(subject);
        
        // Initialize the config object if it doesn't exist
        if (!scheduleConfig[normalizedSubject]) {
          scheduleConfig[normalizedSubject] = {
            classDays: [],
            defaultDueInterval: 7
          };
        }
        
        // Add the day if it's not already in the class days
        if (!scheduleConfig[normalizedSubject].classDays.includes(day)) {
          scheduleConfig[normalizedSubject].classDays.push(day);
        }
      }
    }
    
    console.log('Parsed schedule configuration:', scheduleConfig);
    return scheduleConfig;
  } catch (error) {
    console.error('Error parsing schedule file:', error);
    // Fall back to default schedule config
    return defaultScheduleConfig;
  }
}

/**
 * Normalize subject names (convert Finnish names to English equivalents)
 * @param {string} subject - Original subject name
 * @returns {string} - Normalized subject name
 */
function normalizeSubjectName(subject) {
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
}

/**
 * Initialize the schedule configuration in Firestore
 */
async function setupScheduleConfig() {
  try {
    console.log('Setting up schedule configuration in Firestore...');
    
    // Parse schedule file or use default config
    const scheduleConfigs = await parseScheduleFile();
    
    // Clear existing schedule configurations
    const scheduleConfigCollectionRef = collection(db, 'scheduleConfig');
    const existingConfigsSnapshot = await getDocs(scheduleConfigCollectionRef);
    
    console.log(`Clearing ${existingConfigsSnapshot.size} existing schedule configurations...`);
    
    for (const docSnapshot of existingConfigsSnapshot.docs) {
      await deleteDoc(doc(db, 'scheduleConfig', docSnapshot.id));
    }
    
    // Add new schedule configurations
    console.log('Adding new schedule configurations...');
    
    for (const [subject, config] of Object.entries(scheduleConfigs)) {
      await setDoc(doc(db, 'scheduleConfig', subject), config);
      console.log(`Added schedule config for subject: ${subject}`);
    }
    
    console.log('Schedule configuration setup complete.');
  } catch (error) {
    console.error('Error setting up schedule configuration:', error);
  }
}

// Run the setup
setupScheduleConfig()
  .then(() => console.log('Schedule configuration initialization complete.'))
  .catch(error => console.error('Initialization failed:', error));
