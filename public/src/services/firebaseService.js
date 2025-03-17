/**
 * firebaseService.js - Firebase integration for Quest Board
 * Centralizes Firebase initialization and provides Firebase modules
 */

import { registerInitStep } from '../bootstrap.js';
import { getState, setState, dispatch } from '../state/appState.js';

// Firebase module cache
let _firebaseModules = null;
let _db = null;
let _initialized = false;
let _initPromise = null;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkWib8nvqf4l__I9cu63_ykzbL2UEQLwo",
  authDomain: "questboard-17337.firebaseapp.com",
  projectId: "questboard-17337", 
  storageBucket: "questboard-17337.appspot.com",
  messagingSenderId: "427884628874",
  appId: "1:427884628874:web:d2e7a64b45c9edce9d5673"
};

/**
 * Initialize Firebase services
 * Returns Firebase modules and Firestore instance
 * @returns {Promise<Object>} Firebase and Firestore instances
 */
async function initializeFirebase() {
  // Log start of initialization
  console.log('Initializing Firebase...');
  
  // If Firebase is already initialized, return the instances
  if (_initialized && _db && _firebaseModules) {
    console.log('Firebase already initialized and available');
    return { db: _db, modules: _firebaseModules };
  }
  
  try {
    // Check if Firebase SDK is available
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }
    
    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    _db = firebase.firestore();
    
    // Create firebaseModules with proper wrappers
    _firebaseModules = {
      collection: (db, path) => db.collection(path),
      doc: (collection, id) => collection.doc(id),
      getDocs: (collection) => collection.get(),
      getDoc: (docRef) => docRef.get(),
      updateDoc: (docRef, data) => docRef.update(data),
      setDoc: (docRef, data) => docRef.set(data),
      where: firebase.firestore.where,
      query: firebase.firestore.query,
      limit: firebase.firestore.limit,
      orderBy: firebase.firestore.orderBy,
      startAfter: firebase.firestore.startAfter,
      endBefore: firebase.firestore.endBefore,
      Timestamp: firebase.firestore.Timestamp
    };
    
    _initialized = true;
    
    // Make Firebase available globally for backward compatibility
    window.db = _db;
    window.firebaseModules = _firebaseModules;
    
    // Update the app state with Firebase initialization status
    setState({ 
      firebase: { 
        initialized: true,
        timestamp: Date.now()
      }
    }, 'firebaseInitialized');
    
    // Dispatch both types of events for compatibility
    const firebaseReadyEvent = new CustomEvent('firebase-ready', {
      detail: { db: _db, modules: _firebaseModules }
    });
    window.dispatchEvent(firebaseReadyEvent);
    
    const bootstrapEvent = new CustomEvent('firebase:ready', {
      detail: { db: _db, modules: _firebaseModules }
    });
    window.dispatchEvent(bootstrapEvent);
    
    // Dispatch through state management
    dispatch('firebase-ready', { db: _db, modules: _firebaseModules });
    
    console.log('Firebase initialization completed successfully');
    return { db: _db, modules: _firebaseModules };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    
    // Update state with error
    setState({ 
      firebase: { 
        initialized: false, 
        error: error.message,
        timestamp: Date.now()
      }
    }, 'firebaseInitFailed');
    
    throw error;
  }
}

/**
 * Wait for Firebase to be initialized
 * @returns {Promise} Resolves when Firebase is ready
 */
export function waitForFirebase() {
  // Return existing promise if already initializing
  if (_initPromise) {
    return _initPromise;
  }
  
  _initPromise = new Promise((resolve, reject) => {
    // Check if Firebase is already available
    if (_initialized && _db && _firebaseModules) {
      console.log('Firebase already initialized and available');
      resolve({ db: _db, modules: _firebaseModules });
      return;
    }
    
    // If window.db is already set up by index.html
    if (window.db && window.firebaseModules) {
      console.log('Firebase already initialized by index.html');
      _db = window.db;
      _firebaseModules = window.firebaseModules;
      _initialized = true;
      
      // Update state
      setState({ 
        firebase: { 
          initialized: true,
          timestamp: Date.now()
        }
      }, 'firebaseInitialized');
      
      resolve({ db: _db, modules: _firebaseModules });
      return;
    }
    
    // If we get here, we need to initialize Firebase ourselves
    initializeFirebase()
      .then(result => {
        resolve(result);
      })
      .catch(error => {
        console.error('Failed to initialize Firebase:', error);
        reject(error);
      });
  });
  
  return _initPromise;
}

/**
 * Get the initialized Firestore database instance
 * @returns {Object} Firestore database instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirestore() {
  if (!_initialized || !_db) {
    throw new Error('Firebase not initialized. Call waitForFirebase() first.');
  }
  return _db;
}

/**
 * Get Firebase modules for direct use
 * @returns {Object} Firebase modules (collection, getDocs, etc.)
 * @throws {Error} If Firebase is not initialized
 */
export function getFirebaseModules() {
  if (!_initialized || !_firebaseModules) {
    throw new Error('Firebase not initialized. Call waitForFirebase() first.');
  }
  return _firebaseModules;
}

// Export a function to check Firebase initialization status
export function isFirebaseInitialized() {
  return _initialized;
}

/**
 * Clear the query cache or a specific cached query
 * @param {string} [cacheKey] - Optional specific cache key to clear
 */
export function clearCache(cacheKey = null) {
  if (cacheKey) {
    // Clear specific cache key from state
    setState(state => {
      const appCache = state.cache || {};
      const newCache = { ...appCache };
      delete newCache[cacheKey];
      return { cache: newCache };
    }, `clearCache:${cacheKey}`);
  } else {
    // Clear all cache
    setState({ cache: {} }, 'clearAllCache');
  }
}

/**
 * Generate a cache key for a collection and optional query parameters
 * @param {string} collectionName - Name of the collection
 * @param {Object} [queryParams] - Optional query parameters
 * @returns {string} Cache key
 */
function generateCacheKey(collectionName, queryParams = null) {
  return queryParams 
    ? `${collectionName}:${JSON.stringify(queryParams)}`
    : collectionName;
}

/**
 * Fetch all documents from a collection with optional caching
 * @param {string} collectionName - Name of the collection to fetch
 * @param {Object} options - Options for the fetch operation
 * @param {boolean} [options.useCache=true] - Whether to use cache for this query
 * @param {number} [options.cacheTTL=60000] - Cache time-to-live in milliseconds (default: 1 minute)
 * @returns {Promise<Array>} Array of documents with their IDs
 */
export async function fetchCollection(collectionName, options = {}) {
  await waitForFirebase();
  
  const { useCache = true, cacheTTL = 60000 } = options;
  const cacheKey = generateCacheKey(collectionName);
  
  // Check state cache first if enabled
  if (useCache) {
    const state = getState();
    const appCache = state.cache || {};
    const cachedItem = appCache[cacheKey];
    
    if (cachedItem && cachedItem.expiry > Date.now()) {
      return [...cachedItem.data]; // Return a copy to prevent mutation
    }
  }
  
  try {
    // Use the Firestore API directly for compatibility
    const querySnapshot = await _db.collection(collectionName).get();
    
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cache the result in state if caching is enabled
    if (useCache) {
      setState(state => {
        const appCache = state.cache || {};
        return { 
          cache: {
            ...appCache,
            [cacheKey]: {
              data: documents,
              expiry: Date.now() + cacheTTL
            }
          }
        };
      }, `cacheFetch:${cacheKey}`);
    }
    
    return documents;
    
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    
    // Update state with the error
    setState({
      errors: {
        type: 'fetchCollection',
        collection: collectionName,
        message: error.message,
        timestamp: Date.now()
      }
    }, 'fetchCollectionError');
    
    throw error;
  }
}

/**
 * Fetch a document by ID
 * @param {string} collectionName - Name of the collection
 * @param {string} documentId - ID of the document to fetch
 * @param {Object} options - Options for the fetch operation
 * @param {boolean} [options.useCache=true] - Whether to use cache for this query
 * @param {number} [options.cacheTTL=60000] - Cache time-to-live in milliseconds (default: 1 minute)
 * @returns {Promise<Object>} Document data including ID
 */
export async function fetchDocument(collectionName, documentId, options = {}) {
  await waitForFirebase();
  
  const { useCache = true, cacheTTL = 60000 } = options;
  const cacheKey = `${collectionName}:${documentId}`;
  
  // Check state cache first if enabled
  if (useCache) {
    const state = getState();
    const appCache = state.cache || {};
    const cachedItem = appCache[cacheKey];
    
    if (cachedItem && cachedItem.expiry > Date.now()) {
      return { ...cachedItem.data }; // Return a copy to prevent mutation
    }
  }
  
  try {
    // Use the Firestore API directly
    const docRef = _db.collection(collectionName).doc(documentId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      // Document doesn't exist, clean up cache if it exists
      if (useCache) {
        clearCache(cacheKey);
      }
      return null;
    }
    
    const document = {
      id: docSnapshot.id,
      ...docSnapshot.data()
    };
    
    // Cache the result in state if caching is enabled
    if (useCache) {
      setState(state => {
        const appCache = state.cache || {};
        return { 
          cache: {
            ...appCache,
            [cacheKey]: {
              data: document,
              expiry: Date.now() + cacheTTL
            }
          }
        };
      }, `cacheDoc:${cacheKey}`);
    }
    
    return document;
    
  } catch (error) {
    console.error(`Error fetching document ${collectionName}/${documentId}:`, error);
    
    // Update state with the error
    setState({
      errors: {
        type: 'fetchDocument',
        collection: collectionName,
        document: documentId,
        message: error.message,
        timestamp: Date.now()
      }
    }, 'fetchDocumentError');
    
    throw error;
  }
}

/**
 * Update a document in a collection
 * @param {string} collectionName - Name of the collection
 * @param {string} documentId - ID of the document to update
 * @param {Object} data - Data to update in the document
 * @returns {Promise<void>}
 */
export async function updateDocument(collectionName, documentId, data) {
  await waitForFirebase();
  
  try {
    // Update the document
    const docRef = _db.collection(collectionName).doc(documentId);
    await docRef.update({
      ...data,
      lastUpdated: new Date().toISOString()
    });
    
    // Clear any cache for this document and collection
    clearCache(`${collectionName}:${documentId}`);
    clearCache(collectionName);
    
    // Update state to indicate this document was updated
    setState({
      lastOperation: {
        type: 'updateDocument',
        collection: collectionName,
        documentId,
        timestamp: Date.now()
      }
    }, 'documentUpdated');
    
    // Dispatch document updated event
    dispatch('document-updated', { collectionName, documentId, data });
    
  } catch (error) {
    console.error(`Error updating document ${collectionName}/${documentId}:`, error);
    
    // Update state with the error
    setState({
      errors: {
        type: 'updateDocument',
        collection: collectionName,
        document: documentId,
        message: error.message,
        timestamp: Date.now()
      }
    }, 'updateDocumentError');
    
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
  await waitForFirebase();
  
  try {
    // Set the document
    const docRef = _db.collection(collectionName).doc(documentId);
    await docRef.set({
      ...data,
      lastUpdated: new Date().toISOString()
    });
    
    // Clear any cache for this document and collection
    clearCache(`${collectionName}:${documentId}`);
    clearCache(collectionName);
    
    // Update state to indicate this document was set
    setState({
      lastOperation: {
        type: 'setDocument',
        collection: collectionName,
        documentId,
        timestamp: Date.now()
      }
    }, 'documentSet');
    
    // Dispatch document created/updated event
    dispatch('document-set', { collectionName, documentId, data });
    
  } catch (error) {
    console.error(`Error setting document ${collectionName}/${documentId}:`, error);
    
    // Update state with the error
    setState({
      errors: {
        type: 'setDocument',
        collection: collectionName,
        document: documentId,
        message: error.message,
        timestamp: Date.now()
      }
    }, 'setDocumentError');
    
    throw error;
  }
}

// Register with bootstrap system
registerInitStep({
  id: 'firebase',
  name: 'Firebase Initialization',
  run: async () => {
    try {
      const { db, modules } = await waitForFirebase();
      return { db, modules };
    } catch (error) {
      console.error('Bootstrap: Firebase initialization failed:', error);
      throw error;
    }
  },
  dependencies: [], // No dependencies for Firebase
  required: true
});
