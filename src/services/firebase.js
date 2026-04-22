// src/firebase.js - Firebase configuration and initialization
// Supports module imports

// Firebase module imports 
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables (CRA)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(`Missing Firebase config values: ${missingFirebaseConfig.join(', ')}`);
}

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);

// Firestore instance
const db = getFirestore(app);

export { db };

export function updateTask(taskId, taskData) {
  return db.collection('tasks').doc(taskId).update(taskData);
}

export function addTask(taskData) {
  return db.collection('tasks').add(taskData);
}

export function completeTask(taskId) {
  return db.collection('tasks').doc(taskId).update({
    completed: true,
    completedDate: new Date().toLocaleDateString('fi-FI').replace(/\//g, '.')
  });
}