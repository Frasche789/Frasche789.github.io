// src/firebase.js - Firebase configuration and initialization
// Supports module imports

// Firebase module imports 
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../config/firebaseConfig';

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