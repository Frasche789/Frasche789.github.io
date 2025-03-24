/**
 * firebaseService.js - Firebase integration for Quest Board
 * Single source of truth for Firebase access
 */

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
    // Check if Firebase SDK is available
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded. Make sure the script is included in index.html');
    }
    
    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
      console.log('Initializing new Firebase app instance');
      firebase.initializeApp(firebaseConfig);
    } else {
      console.log('Using existing Firebase app instance');
    }
    
    // Get Firestore instance
    _db = firebase.firestore();
    _initialized = true;
    
    console.log('Firebase initialization completed successfully');
    return _db;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

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
  const db = await waitForFirebase();
  
  try {
    const querySnapshot = await db.collection(collectionName).get();
    
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
