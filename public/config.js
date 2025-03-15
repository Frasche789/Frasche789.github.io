/**
 * config.js - Firebase configuration for Quest Board
 * When deployed to Firebase Hosting, the SDK automatically uses the correct project configuration
 */

// Get Firebase configuration
export async function getFirebaseConfig() {
  // When deployed to Firebase Hosting, the Firebase SDK automatically uses the 
  // configuration of the connected Firebase project.
  //
  // If running locally, you must set up Firebase hosting emulator or 
  // use Firebase console to add authorized domains.
  //
  // The Firebase configuration is injected at build time by Firebase Hosting,
  // so we don't need (and shouldn't have) any API keys in the client code.
  
  console.log('Using Firebase SDK auto-initialization');
  
  // Return an empty object - Firebase SDK will handle configuration
  // based on the current environment (production/emulator)
  return {};
}
