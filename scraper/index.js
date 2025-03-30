// scraper/index.js - Main entry point
require('dotenv').config();
const schoolPortal = require('./school-portal');
const taskProcessor = require('./task-processor');
const firestoreSync = require('./firestore-sync');

async function runScraper() {
  try {
    console.log('Starting Wilma scraper...');
    
    // 1. Login and access school portal
    console.log('Logging into school portal...');
    const browser = await schoolPortal.login();
    
    // 2. Extract data for each subject
    console.log('Extracting data from all subjects...');
    const extractedData = await schoolPortal.extractAllSubjectData(browser);
    
    // 3. Process and normalize data with schedule
    console.log('Processing extracted data...');
    const processedTasks = taskProcessor.processExtractedData(extractedData);
    console.log(`Processed ${processedTasks.length} tasks`);
    
    // 4. Sync with firestore
    console.log('Syncing tasks with Firestore...');
    await firestoreSync.syncTasks(processedTasks);
    
    console.log('Scraper completed successfully');
  } catch (error) {
    console.error('Scraper failed:', error);
  }
}

// Run the scraper
runScraper().catch(console.error);

/*
To run this:
node index.js
*/