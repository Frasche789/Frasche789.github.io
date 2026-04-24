// scraper/index.js - Main entry point
require('dotenv').config();
const wilmaApi = require('./wilma-api');
const taskProcessor = require('./task-processor');
const firestoreSync = require('./firestore-sync');

async function runScraper() {
  console.log('Starting Wilma scraper...');

  // 1. Authenticate with Wilma API
  const jar = await wilmaApi.login();

  // 2. Fetch overview (all groups, homework, exams in one call)
  const overview = await wilmaApi.fetchOverview(jar);

  // 3. Process into task objects
  const tasks = taskProcessor.processOverviewData(overview);
  console.log(`Processed ${tasks.length} tasks`);

  // 4. Sync with Firestore
  const newCount = await firestoreSync.syncTasks(tasks);
  console.log(`Done: ${newCount} new tasks added`);

  return { processed: tasks.length, added: newCount };
}

// Run directly when executed as a script
if (require.main === module) {
  runScraper().catch(err => {
    console.error('Scraper failed:', err.message);
    process.exit(1);
  });
}

module.exports = { runScraper };