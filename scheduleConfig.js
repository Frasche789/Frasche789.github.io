// scheduleConfig.js
// This script initializes the scheduleConfig collection in Firestore

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, setDoc, doc } = require('firebase/firestore');

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

// Schedule data from schedule.txt
const scheduleData = {
  "Math": {
    classDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    defaultDueInterval: 2
  },
  "Ympäristöoppi": {
    classDays: ["Monday", "Thursday"],
    defaultDueInterval: 3
  },
  "Käsityö": {
    classDays: ["Monday"],
    defaultDueInterval: 7
  },
  "Liikunta": {
    classDays: ["Monday", "Tuesday", "Wednesday"],
    defaultDueInterval: 2
  },
  "Äidinkieli": {
    classDays: ["Tuesday", "Wednesday", "Thursday", "Friday"],
    defaultDueInterval: 2
  },
  "History": {
    classDays: ["Tuesday"],
    defaultDueInterval: 7
  },
  "Musiikki": {
    classDays: ["Tuesday"],
    defaultDueInterval: 7
  },
  "English": {
    classDays: ["Wednesday", "Thursday"],
    defaultDueInterval: 3
  },
  "Ethics": {
    classDays: ["Wednesday"],
    defaultDueInterval: 7
  },
  "Kuvataide": {
    classDays: ["Friday"],
    defaultDueInterval: 7
  },
  "Yhteiskuntaoppi": {
    classDays: ["Friday"],
    defaultDueInterval: 7
  },
  "Digitaidot": {
    classDays: ["Friday"],
    defaultDueInterval: 7
  }
};

// Main function to populate scheduleConfig collection
async function populateScheduleConfig() {
  try {
    console.log('Starting to populate scheduleConfig collection...');
    
    for (const [subject, config] of Object.entries(scheduleData)) {
      await setDoc(doc(db, 'scheduleConfig', subject), {
        subjectId: subject,
        classDays: config.classDays,
        defaultDueInterval: config.defaultDueInterval
      });
      console.log(`Added schedule config for ${subject}`);
    }
    
    console.log('Schedule configuration successfully populated!');
  } catch (error) {
    console.error('Error populating schedule configuration:', error);
  }
}

// Run the population script
populateScheduleConfig().then(() => {
  console.log('Schedule configuration setup completed.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
