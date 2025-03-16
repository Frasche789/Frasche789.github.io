/**
 * firebaseInit.js - Firebase initialization module with bootstrap integration
 * Handles the initialization of Firebase as a dependency for other modules
 */

import { registerInitStep } from '../bootstrap.js';

// Firebase initialization status
let _db = null;
let _firebaseModules = null;
let _initialized = false;

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
  
  // Wait for Firebase initialization
  return new Promise((resolve, reject) => {
    // If window.db is already set up by index.html
    if (window.db && window.firebaseModules) {
      console.log('Firebase already initialized by index.html');
      _db = window.db;
      _firebaseModules = window.firebaseModules;
      _initialized = true;
      resolve({ db: _db, modules: _firebaseModules });
      return;
    }
    
    console.log('Waiting for Firebase to initialize...');
    
    // Create a listener that will clean itself up
    const firebaseReadyListener = () => {
      console.log('Firebase ready event received');
      if (window.db && window.firebaseModules) {
        _db = window.db;
        _firebaseModules = window.firebaseModules;
        _initialized = true;
        clearTimeout(timeoutId);
        resolve({ db: _db, modules: _firebaseModules });
      } else {
        console.error('Firebase ready event received but modules not available');
        clearTimeout(timeoutId);
        reject(new Error('Firebase initialized but modules not available'));
      }
    };
    
    // Add event listener
    window.addEventListener('firebase-ready', firebaseReadyListener, { once: true });
    
    // Set a timeout in case Firebase initialization fails
    const timeoutId = setTimeout(() => {
      // Remove event listener to avoid memory leaks
      window.removeEventListener('firebase-ready', firebaseReadyListener);
      
      if (!window.db || !window.firebaseModules) {
        console.error('Firebase initialization timed out after 8 seconds');
        reject(new Error('Firebase initialization timed out'));
      }
    }, 8000);  });
}

/**
 * Get the initialized Firestore database instance
 * @returns {Object} Firestore database instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirestore() {
  if (!_initialized || !_db) {
    throw new Error('Firebase not initialized. Wait for firebase:ready event first.');
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
    throw new Error('Firebase not initialized. Wait for firebase:ready event first.');
  }
  return _firebaseModules;
}

// Register with bootstrap system
registerInitStep({
  id: 'firebase',
  name: 'Firebase Initialization',
  initFn: async () => {
    try {
      const { db, modules } = await initializeFirebase();
      
      // Make these globally available
      window.firebaseInitialized = true;
      
      // Dispatch a custom event to notify that Firebase is ready
      const event = new CustomEvent('firebase:ready', {
        detail: { db, modules }
      });
      window.dispatchEvent(event);
      
      console.log('Firebase initialization completed successfully');
      return { db, modules };
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error; // Re-throw to indicate initialization failure
    }
  },
  dependencies: [], // No dependencies for Firebase
  required: true,
  critical: true // Firebase is critical - application can't work without it
});

// Export a function to check Firebase initialization status
export function isFirebaseInitialized() {
  return _initialized;
}

// Cache for query results
const _queryCache = new Map();

/**
 * Clear the query cache or a specific cached query
 * @param {string} [cacheKey] - Optional specific cache key to clear
 */
export function clearCache(cacheKey = null) {
  if (cacheKey) {
    _queryCache.delete(cacheKey);
  } else {
    _queryCache.clear();
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
  if (!_initialized) {
    throw new Error('Firebase not initialized. Wait for firebase:ready event first.');
  }
  
  const { useCache = true, cacheTTL = 60000 } = options;
  const cacheKey = generateCacheKey(collectionName);
  
  // Check cache first if enabled
  if (useCache && _queryCache.has(cacheKey)) {
    const cached = _queryCache.get(cacheKey);
    if (cached.expiry > Date.now()) {
      return [...cached.data]; // Return a copy to prevent mutation
    }
    // Cache expired, remove it
    _queryCache.delete(cacheKey);
  }
  
  try {
    const { collection, getDocs } = _firebaseModules;
    const querySnapshot = await getDocs(collection(_db, collectionName));
    
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cache the result if caching is enabled
    if (useCache) {
      _queryCache.set(cacheKey, {
        data: documents,
        expiry: Date.now() + cacheTTL
      });
    }
    
    return documents;
    
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
  if (!_initialized) {
    throw new Error('Firebase not initialized. Wait for firebase:ready event first.');
  }
  
  const { useCache = true, cacheTTL = 60000 } = options;
  const cacheKey = generateCacheKey(`${collectionName}/${documentId}`);
  
  // Check cache first if enabled
  if (useCache && _queryCache.has(cacheKey)) {
    const cached = _queryCache.get(cacheKey);
    if (cached.expiry > Date.now()) {
      return { ...cached.data }; // Return a copy to prevent mutation
    }
    // Cache expired, remove it
    _queryCache.delete(cacheKey);
  }
  
  try {
    const { doc, getDoc } = _firebaseModules;
    const docSnapshot = await getDoc(doc(_db, collectionName, documentId));
    
    if (!docSnapshot.exists()) {
      throw new Error(`Document not found: ${collectionName}/${documentId}`);
    }
    
    const document = {
      id: docSnapshot.id,
      ...docSnapshot.data()
    };
    
    // Cache the result if caching is enabled
    if (useCache) {
      _queryCache.set(cacheKey, {
        data: document,
        expiry: Date.now() + cacheTTL
      });
    }
    
    return document;
    
  } catch (error) {
    console.error(`Error fetching document ${collectionName}/${documentId}:`, error);
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
  if (!_initialized) {
    throw new Error('Firebase not initialized. Wait for firebase:ready event first.');
  }
  
  try {
    const { doc, updateDoc } = _firebaseModules;
    await updateDoc(doc(_db, collectionName, documentId), data);
    
    // Clear cache for this document
    clearCache(generateCacheKey(`${collectionName}/${documentId}`));
    
    // Clear collection cache as it's now outdated
    clearCache(generateCacheKey(collectionName));
    
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
  if (!_initialized) {
    throw new Error('Firebase not initialized. Wait for firebase:ready event first.');
  }
  
  try {
    const { doc, setDoc } = _firebaseModules;
    await setDoc(doc(_db, collectionName, documentId), data);
    
    // Clear cache for this document
    clearCache(generateCacheKey(`${collectionName}/${documentId}`));
    
    // Clear collection cache as it's now outdated
    clearCache(generateCacheKey(collectionName));
    
  } catch (error) {
    console.error(`Error setting document ${collectionName}/${documentId}:`, error);
    throw error;
  }
}
