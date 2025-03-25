// populate-subjects.js - Script to populate Firestore with subject data
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAkWib8nvqf4l__I9cu63_ykzbL2UEQLwo",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "questboard-17337.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "questboard-17337",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "questboard-17337.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "427884628874",
  appId: process.env.FIREBASE_APP_ID || "1:427884628874:web:d2e7a64b45c9edce9d5673"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Parse schedule.txt data
const scheduleData = `Monday: Math, Eco, Crafts, PE  
Tuesday: Math, Finnish, History, Music, PE  
Wednesday: Finnish, Math, English, Ethics, PE  
Thursday: English, Math, Eco, Finnish  
Friday: Art, Civics, Finnish, Digi`;

// Transform schedule data into subject objects
function parseScheduleData(scheduleText) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const lines = scheduleText.split('\n');
  
  // First, collect all unique subjects
  const allSubjects = new Set();
  
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length < 2) return;
    
    const subjects = parts[1].split(',').map(s => s.trim());
    subjects.forEach(subject => allSubjects.add(subject));
  });
  
  // Create a map to standardize subject names and assign colors
  const subjectMap = {
    'Math': { id: 'math', color: 'var(--subject-math)' },
    'Finnish': { id: 'finnish', color: 'var(--subject-finnish)' },
    'English': { id: 'english', color: 'var(--subject-english)' },
    'History': { id: 'history', color: 'var(--subject-history)' },
    'Civics': { id: 'civics', color: 'var(--subject-civics)' },
    'Ethics': { id: 'ethics', color: 'var(--subject-ethics)' },
    'PE': { id: 'pe', color: 'var(--subject-pe)' },
    'Music': { id: 'music', color: 'var(--subject-music)' },
    'Art': { id: 'art', color: 'var(--subject-art)' },
    'Crafts': { id: 'crafts', color: 'var(--subject-crafts)' },
    'Eco': { id: 'eco', color: 'var(--subject-eco)' },
    'Digi': { id: 'digi', color: 'var(--subject-digi)' }
  };
  
  // Initialize subject objects with empty schedules
  const subjects = {};
  allSubjects.forEach(subjectName => {
    const info = subjectMap[subjectName] || { 
      id: subjectName.toLowerCase().replace(/\s+/g, '-'),
      color: 'var(--subject-other)'
    };
    
    subjects[subjectName] = {
      id: info.id,
      name: subjectName,
      color: info.color,
      schedule: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      }
    };
  });
  
  // Fill in schedule information
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length < 2) return;
    
    const day = parts[0].trim().toLowerCase();
    const dayIndex = days.indexOf(day.toLowerCase());
    
    if (dayIndex === -1) return;
    
    const dayKey = days[dayIndex];
    const subjectsForDay = parts[1].split(',').map(s => s.trim());
    
    subjectsForDay.forEach(subject => {
      if (subjects[subject]) {
        subjects[subject].schedule[dayKey] = true;
      }
    });
  });
  
  return Object.values(subjects);
}

// Populate Firestore with subject data
async function populateSubjects() {
  try {
    console.log('Parsing schedule data...');
    const subjects = parseScheduleData(scheduleData);
    
    console.log(`Parsed ${subjects.length} subjects from schedule data`);
    
    // Optional: Clear existing subjects collection
    const shouldClearCollection = true;
    if (shouldClearCollection) {
      console.log('Clearing existing subjects collection...');
      const existingDocs = await getDocs(collection(db, 'subjects'));
      
      const deletePromises = [];
      existingDocs.forEach(document => {
        deletePromises.push(deleteDoc(doc(db, 'subjects', document.id)));
      });
      
      await Promise.all(deletePromises);
      console.log(`Deleted ${deletePromises.length} existing subject documents`);
    }
    
    // Add new subject documents
    console.log('Adding new subject documents...');
    const addPromises = subjects.map(subject => 
      setDoc(doc(db, 'subjects', subject.id), {
        name: subject.name,
        color: subject.color,
        schedule: subject.schedule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
    
    await Promise.all(addPromises);
    console.log(`Successfully added ${subjects.length} subjects to Firestore`);
    
    // Print sample data for verification
    console.log('\nSample subject data:');
    subjects.slice(0, 3).forEach(subject => {
      console.log(`- ${subject.name} (${subject.id}): Classes on`, 
        Object.entries(subject.schedule)
          .filter(([_, hasClass]) => hasClass)
          .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
          .join(', ')
      );
    });
    
  } catch (error) {
    console.error('Error populating subjects:', error);
  }
}

// Run the population script
populateSubjects()
  .then(() => {
    console.log('Subject population completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });