// Test if environment variables are being loaded correctly
require('dotenv').config();

console.log('Testing environment variables:');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY);
console.log('FIREBASE_AUTH_DOMAIN:', process.env.FIREBASE_AUTH_DOMAIN);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET);
console.log('FIREBASE_MESSAGING_SENDER_ID:', process.env.FIREBASE_MESSAGING_SENDER_ID);
console.log('FIREBASE_APP_ID:', process.env.FIREBASE_APP_ID);

// Check if any of the variables are undefined or empty
const missingVars = [];
['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 
 'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'].forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('Missing or empty environment variables:', missingVars.join(', '));
} else {
  console.log('All Firebase environment variables are defined!');
}
