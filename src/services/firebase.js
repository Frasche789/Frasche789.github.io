// src/firebase.js - Firebase configuration and initialization WITHOUT fallbacks
// Supports module imports

// Firebase module imports 
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration hardcoded for development - critical for direct deployment
const firebaseConfig = {
  apiKey: "AIzaSyAkWib8nvqf4l__I9cu63_ykzbL2UEQLwo",
  authDomain: "questboard-17337.firebaseapp.com",
  projectId: "questboard-17337",
  storageBucket: "questboard-17337.appspot.com",
  messagingSenderId: "427884628874",
  appId: "1:427884628874:web:d2e7a64b45c9edce9d5673"
};

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