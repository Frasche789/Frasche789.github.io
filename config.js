/**
 * config.js - Environment variable configuration for Quest Board
 * Loads Firebase configuration from environment variables
 */

// Function to load environment variables from .env file
async function loadEnvVariables() {
  try {
    const response = await fetch('/.env');
    const text = await response.text();
    
    // Parse .env file content
    const envVars = {};
    text.split('\n').forEach(line => {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      // Parse key-value pairs
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error);
    return null;
  }
}

// Fallback Firebase configuration for production environment
const fallbackConfig = {
  apiKey: "AIzaSyDYrcJmNxJCeRuCuMNu0VYXrO5RbMLxnzM",
  authDomain: "quest-board-app.firebaseapp.com",
  projectId: "quest-board-app",
  storageBucket: "quest-board-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl"
};

// Get Firebase configuration from environment variables
export async function getFirebaseConfig() {
  const envVars = await loadEnvVariables();
  
  if (!envVars) {
    console.log('Using fallback Firebase configuration for production.');
    return fallbackConfig;
  }
  
  // Create Firebase config object from environment variables
  const firebaseConfig = {
    apiKey: envVars.FIREBASE_API_KEY,
    authDomain: envVars.FIREBASE_AUTH_DOMAIN,
    projectId: envVars.FIREBASE_PROJECT_ID,
    storageBucket: envVars.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.FIREBASE_APP_ID
  };
  
  // Validate that all required config values are present
  const missingKeys = Object.keys(firebaseConfig).filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration values:', missingKeys.join(', '));
    console.log('Using fallback Firebase configuration.');
    return fallbackConfig;
  }
  
  return firebaseConfig;
}
