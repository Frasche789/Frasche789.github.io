/**
 * firebaseService.js - Firebase integration for Quest Board
 * Single source of truth for Firebase access
 */

// Import Firebase SDK v9 components
import { initializeApp } from 'firebase/app';
import { getFirestore as _getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Module-level variables for Firebase instances
let _db = null;
let _initialized = false;
let _initPromise = null;

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAkWib8nvqf4l__I9cu63_ykzbL2UEQLwo",
  authDomain: "questboard-17337.firebaseapp.com",
  projectId: "questboard-17337", 
  storageBucket: "questboard-17337.appspot.com",
  messagingSenderId: "427884628874",
  appId: "1:427884628874:web:d2e7a64b45c9edce9d5673"
};

/**
 * Initialize Firebase services
 * @returns {Promise<Object>} Firestore database instance
 */
async function initializeFirebase() {
  console.log('Initializing Firebase (firebaseService.js)...');
  
  // If Firebase is already initialized, return the instance
  if (_initialized && _db) {
    console.log('Firebase already initialized in this session');
    return _db;
  }
  
  try {
    // Initialize Firebase app with modern SDK
    const app = initializeApp(firebaseConfig);
    
    // Get Firestore instance
    _db = _getFirestore(app);
    _initialized = true;
    
    console.log('Firebase initialization completed successfully');
    return _db;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

// Initialize Firebase on module load
initializeFirebase().catch(err => console.error('Failed to initialize Firebase on load:', err));

/**
 * Wait for Firebase to be initialized
 * @returns {Promise<Object>} Firestore database instance
 */
export async function waitForFirebase() {
  // Return existing promise if already initializing
  if (_initPromise) {
    return _initPromise;
  }
  
  _initPromise = initializeFirebase();
  return _initPromise;
}

/**
 * Get Firestore database instance
 * @returns {Object} Firestore database instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirestore() {
  if (!_initialized || !_db) {
    throw new Error('Firebase not initialized. Call waitForFirebase() first.');
  }
  return _db;
}

// Export the database instance directly
export const db = _db;

/**
 * Check if Firebase is initialized
 * @returns {boolean} True if Firebase is initialized
 */
export function isFirebaseInitialized() {
  return _initialized;
}

/**
 * Fetch all documents from a collection
 * @param {string} collectionName - Name of the collection to fetch
 * @param {Object} options - Options for the fetch operation
 * @returns {Promise<Array>} Array of documents with their IDs
 */
export async function fetchCollection(collectionName, options = {}) {
  if (!_initialized) await waitForFirebase();
  
  try {
    const querySnapshot = await getDocs(collection(_db, collectionName));
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Fetch a document by ID
 * @param {string} collectionName - Name of the collection
 * @param {string} documentId - ID of the document to fetch
 * @returns {Promise<Object>} Document data including ID
 */
export async function getDocument(collectionName, documentId) {
  if (!_initialized) await waitForFirebase();
  
  try {
    const docRef = doc(_db, collectionName, documentId);
    const docSnapshot = await getDoc(docRef);
    
    if (!docSnapshot.exists()) {
      return null;
    }
    
    return {
      id: docSnapshot.id,
      ...docSnapshot.data()
    };
  } catch (error) {
    console.error(`Error fetching document ${collectionName}/${documentId}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 * @param {string} collectionName - Name of the collection to fetch
 * @returns {Promise<Array>} Array of documents with their IDs
 */
export async function getDocuments(collectionName) {
  return fetchCollection(collectionName);
}

/**
 * Update a document in a collection
 * @param {string} collectionName - Name of the collection
 * @param {string} documentId - ID of the document to update
 * @param {Object} data - Data to update in the document
 * @returns {Promise<void>}
 */
export async function updateDocument(collectionName, documentId, data) {
  if (!_initialized) await waitForFirebase();
  
  try {
    const docRef = doc(_db, collectionName, documentId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Error updating document ${collectionName}/${documentId}:`, error);
    throw error;
  }
}

/**
 * Set a document in a collection (creates or overwrites)
 * @param {string} collectionName - Name of the collection
 * @param {string} documentId - ID of the document to set
 * @param {Object} data - Data for the document
 * @returns {Promise<void>}
 */
export async function setDocument(collectionName, documentId, data) {
  if (!_initialized) await waitForFirebase();
  
  try {
    const docRef = doc(_db, collectionName, documentId);
    await setDoc(docRef, data);
  } catch (error) {
    console.error(`Error setting document ${collectionName}/${documentId}:`, error);
    throw error;
  }
}

/**
 * Delete a document from a collection
 * @param {string} collectionName - Name of the collection
 * @param {string} documentId - ID of the document to delete
 * @returns {Promise<void>}
 */
export async function deleteDocument(collectionName, documentId) {
  if (!_initialized) await waitForFirebase();
  
  try {
    const docRef = doc(_db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document ${collectionName}/${documentId}:`, error);
    throw error;
  }
}

