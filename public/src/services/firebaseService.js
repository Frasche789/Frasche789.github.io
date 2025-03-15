/**
 * firebaseService.js - Firebase integration for Quest Board
 * Centralizes Firebase initialization and provides Firebase modules
 */

// Firebase module cache
let _firebaseModules = null;
let _db = null;
let _initialized = false;
let _initPromise = null;

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
        
        // Attempt to reinitialize Firebase
        try {
          document.getElementById('loading-indicator').innerHTML = `
            <div class="error-message">
              <p>Connection to database timed out. Please check your internet connection.</p>
              <button onclick="location.reload()" class="primary-btn">Retry</button>
            </div>
          `;
        } catch (e) {
          console.error('Could not update loading indicator:', e);
        }
        
        reject(new Error('Firebase initialization timed out'));
      }
    }, 8000);
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
  await waitForFirebase();
  
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
  await waitForFirebase();
  
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
      return null;
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
  await waitForFirebase();
  
  try {
    const { doc, updateDoc } = _firebaseModules;
    await updateDoc(doc(_db, collectionName, documentId), data);
    
    // Clear relevant cache entries
    clearCache(generateCacheKey(collectionName));
    clearCache(generateCacheKey(`${collectionName}/${documentId}`));
    
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
  await waitForFirebase();
  
  try {
    const { doc, setDoc } = _firebaseModules;
    await setDoc(doc(_db, collectionName, documentId), data);
    
    // Clear relevant cache entries
    clearCache(generateCacheKey(collectionName));
    clearCache(generateCacheKey(`${collectionName}/${documentId}`));
    
  } catch (error) {
    console.error(`Error setting document ${collectionName}/${documentId}:`, error);
    throw error;
  }
}
