// scraper.js - Run this with Node.js
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, query, where } = require('firebase/firestore');

// CONFIGURATION
const WILMA_USERNAME = process.env.WILMA_USERNAME;
const WILMA_PASSWORD = process.env.WILMA_PASSWORD;

// File paths
const DATA_DIR = path.join(__dirname, 'data');
const COOKIES_FILE = path.join(DATA_DIR, 'cookies.json');

// Request delay to prevent rate limiting (ms)
const REQUEST_DELAY = 2000;

// Make sure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function for controlled delays
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to load existing data from Firestore
async function loadExistingData() {
  try {
    // Default data structure
    let data = { students: [{ id: 1, name: 'Nuno', points: 0 }], tasks: [] };
    
    // Get students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    if (!studentsSnapshot.empty) {
      data.students = studentsSnapshot.docs.map(doc => ({
        id: parseInt(doc.id, 10) || doc.id,
        ...doc.data()
      }));
    }
    
    // Get tasks
    const tasksSnapshot = await getDocs(collection(db, 'quests'));
    if (!tasksSnapshot.empty) {
      data.tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    console.log(`Loaded ${data.students.length} students and ${data.tasks.length} tasks from Firestore`);
    return data;
  } catch (error) {
    console.error('Error reading existing data from Firestore:', error);
    return { students: [{ id: 1, name: 'Nuno', points: 0 }], tasks: [] };
  }
}

// Function to save data to Firestore
async function saveData(data) {
  try {
    // Save students
    for (const student of data.students) {
      await setDoc(doc(db, 'students', student.id.toString()), {
        name: student.name,
        points: student.points
      });
    }
    
    // Save tasks
    for (const task of data.tasks) {
      // Check if this task already exists in Firestore
      // We only need to check tasks that were newly added during this run
      if (!task.firestore_id) {
        // Check if task with same properties already exists
        const q = query(
          collection(db, 'quests'), 
          where('date', '==', task.date),
          where('subject', '==', task.subject),
          where('description', '==', task.description)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // Task doesn't exist yet, add it
          const docRef = await addDoc(collection(db, 'quests'), {
            date: task.date,
            description: task.description,
            subject: task.subject,
            type: task.type,
            status: task.status,
            student_id: task.student_id,
            points: task.points,
            completed: false
          });
          console.log(`Added new task to Firestore with ID: ${docRef.id}`);
        } else {
          console.log(`Task already exists in Firestore, skipping: ${task.description}`);
        }
      }
    }
    console.log('Data saved successfully to Firestore');
  } catch (error) {
    console.error('Error saving data to Firestore:', error);
    // Fallback to local JSON file if Firestore fails
    try {
      const DATA_FILE = path.join(DATA_DIR, 'quests.json');
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log('Data saved to local JSON file as fallback');
    } catch (fallbackError) {
      console.error('Error saving fallback data to JSON:', fallbackError);
    }
  }
}

// Helper function to load existing cookies
async function loadCookies(page) {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      const cookiesString = fs.readFileSync(COOKIES_FILE);
      const cookies = JSON.parse(cookiesString);
      console.log(`Loading ${cookies.length} cookies from file`);
      
      if (cookies.length > 0) {
        await page.setCookie(...cookies);
        return true;
      }
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
  }
  return false;
}

// Helper function to save cookies
async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log(`Saved ${cookies.length} cookies to ${COOKIES_FILE}`);
}

// Function to check if login was successful
async function isLoggedIn(page) {
  try {
    // Check if login form is still present (indicating failed login)
    const loginForm = await page.$('form#loginForm');
    if (loginForm) {
      console.log('Login form is still present - login failed');
      return false;
    }
    
    // Check for elements that should only be visible when logged in
    // Look for specific Wilma elements that are present after login
    const loggedInElements = await page.$('.welcome') || 
                            await page.$('img.logo') ||
                            await page.$('ul.menu') ||
                            await page.$('a[href*="logout"]');
    
    if (loggedInElements) {
      console.log('Found elements indicating successful login');
      return true;
    }
    
    // Check for specific page title or URL pattern that indicates logged in state
    const pageTitle = await page.title();
    if (pageTitle && !pageTitle.toLowerCase().includes('login')) {
      console.log(`Page title "${pageTitle}" suggests we are logged in`);
      return true;
    }
    
    console.log('Could not determine login status with certainty');
    return false;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

// Main scraping function
async function scrapeWilma() {
  console.log('Starting Wilma scraper...');
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-web-security'],
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Disable non-essential resource types to reduce requests
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block non-essential resource types
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Minimal console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error')) {
        console.log('BROWSER ERROR:', text);
      }
    });

    // Go to login page
    console.log('Loading initial page...');
    await page.goto('https://opetustampere.inschool.fi/', { waitUntil: 'domcontentloaded' });
    await delay(REQUEST_DELAY);
    
    let loggedIn = false;
    
    // Try to use existing cookies first
    let cookiesLoaded = await loadCookies(page);
    if (cookiesLoaded) {
      console.log('Cookies loaded, checking if already logged in...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await delay(REQUEST_DELAY);
      
      loggedIn = await isLoggedIn(page);
      if (loggedIn) {
        console.log('Already logged in using saved cookies');
      } else {
        console.log('Cookies did not provide valid login, will log in manually');
        loggedIn = await performLogin(page);
      }
    } else {
      console.log('No saved cookies found, performing manual login');
      loggedIn = await performLogin(page);
    }
    
    // If still not logged in, we can't continue
    if (!loggedIn) {
      console.error('Failed to log in after attempts');
      await page.screenshot({ path: 'login_failed.png' });
      throw new Error('Failed to log in after attempts');
    }
    
    console.log('Successfully logged in. Waiting before continuing...');
    await delay(REQUEST_DELAY * 2);
    
    // Save the cookies for future use
    await saveCookies(page);
    
    // 3. Process each subject page
    const subjects = [
      { name: 'History', url: 'https://opetustampere.inschool.fi/!0466066/groups/137349' },
      { name: 'Math', url: 'https://opetustampere.inschool.fi/!0466066/groups/137359' },
      { name: 'Äidinkieli', url: 'https://opetustampere.inschool.fi/!0466066/groups/137358' },
      { name: 'English', url: 'https://opetustampere.inschool.fi/!0466066/groups/137348' },
      { name: 'Ethics', url: 'https://opetustampere.inschool.fi/!0466066/groups/137338' },
      { name: 'Yhteiskuntaoppi', url: 'https://opetustampere.inschool.fi/!0466066/groups/137356' },
      { name: 'Ympäristöoppi', url: 'https://opetustampere.inschool.fi/!0466066/groups/137357' }
    ];
    
    // Load existing data
    const data = await loadExistingData();
    let newTasksFound = 0;
    
    // Process all subjects
    console.log(`Will process all ${subjects.length} subjects`);
    
    for (const subject of subjects) {
      console.log(`\n==== Processing ${subject.name} ====`);
      
      try {
        // Navigate with a longer timeout and more patient loading strategy
        console.log(`Navigating to: ${subject.url}`);
        await page.goto(subject.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        // Add delay between page loads to avoid triggering rate limiting
        await delay(REQUEST_DELAY);
        
        // Take a screenshot for each subject page
        await page.screenshot({ path: `${subject.name}_page.png` });
        
        // Check if we need to re-login
        const currentUrl = page.url();
        if (currentUrl.includes('login')) {
          console.log('Redirected to login page, attempting to re-login');
          const reloginSuccess = await performLogin(page);
          if (!reloginSuccess) {
            throw new Error('Failed to re-login');
          }
          await page.goto(subject.url, { waitUntil: 'domcontentloaded' });
          await delay(REQUEST_DELAY);
        }
        
        // 4. Extract homework with simpler approach
        const homeworkData = await page.evaluate(() => {
          console.log('Searching for homework section...');
          
          // Find all tables on the page
          const tables = document.querySelectorAll('table');
          console.log(`Found ${tables.length} tables on page`);
          
          let allResults = [];
          let isKotitehtavatSection = false;
          
          // First, try to find the dedicated "Kotitehtävät" section
          const kotitehtavatSections = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && 
            (el.textContent.includes('Kotitehtävät') || el.textContent.includes('Homework'))
          );
          
          // Process homework from dedicated sections first
          for (const section of kotitehtavatSections) {
            console.log('Found Kotitehtävät section');
            isKotitehtavatSection = true;
            
            // Look for nearby tables or lists within a reasonable ancestor distance
            let container = section;
            // Try to find parent container
            for (let i = 0; i < 3; i++) {
              if (!container.parentElement) break;
              container = container.parentElement;
              
              // Check tables within this container
              const sectionTables = container.querySelectorAll('table');
              for (const table of sectionTables) {
                const rows = table.querySelectorAll('tr');
                if (rows.length <= 1) continue;
                
                const tableResults = [];
                // Process each row
                for (let i = 1; i < rows.length; i++) {
                  const cells = rows[i].querySelectorAll('td');
                  // Try different column patterns
                  if (cells.length >= 2) {
                    // Check if first column contains a date
                    let date = cells[0].textContent.trim();
                    let homework = cells[1].textContent.trim();
                    
                    // If first column doesn't look like a date, try other columns
                    if (!(/\d+\.\d+/.test(date)) && cells.length >= 3) {
                      // Try second column as date
                      const possibleDate = cells[1].textContent.trim();
                      if (/\d+\.\d+/.test(possibleDate)) {
                        date = possibleDate;
                        homework = cells[2].textContent.trim();
                      }
                    }
                    
                    // Only accept entries with reasonable homework descriptions (more than just a number)
                    if (date && homework && 
                        /\d+\.\d+/.test(date) && 
                        !/^\d+$/.test(homework) && // Exclude entries that are just numbers
                        homework.length > 1) {     // Must be more than a single character
                      tableResults.push({ date, homework });
                    }
                  }
                }
                
                if (tableResults.length > 0) {
                  console.log(`Found ${tableResults.length} homework items in Kotitehtävät section`);
                  allResults = allResults.concat(tableResults);
                }
              }
            }
          }
          
          // If we didn't find anything in the dedicated homework sections, fall back to table scanning
          // but be more strict about what we consider valid homework
          if (allResults.length === 0 && !isKotitehtavatSection) {
            // Look for tables with date-like content in first column
            for (const table of tables) {
              const rows = table.querySelectorAll('tr');
              if (rows.length <= 1) continue; // Skip tables with only headers
              
              // Check the table headers to see if it looks like a homework table
              const headerRow = rows[0];
              const headerCells = headerRow.querySelectorAll('th, td');
              let isHomeworkTable = false;
              
              // Check if any header contains homework-related text
              for (const cell of headerCells) {
                const headerText = cell.textContent.trim().toLowerCase();
                if (headerText.includes('kotitehtävä') || 
                    headerText.includes('homework') || 
                    headerText.includes('tehtävä') ||
                    headerText.includes('assignment')) {
                  isHomeworkTable = true;
                  break;
                }
              }
              
              // If not clearly a homework table, apply stricter filtering
              const tableResults = [];
              
              // Check for tables with date-like content
              for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                if (cells.length >= 2) {
                  const date = cells[0].textContent.trim();
                  const homework = cells[1].textContent.trim();
                  
                  // Apply stricter criteria for non-homework tables
                  if (date && homework && 
                      /\d+\.\d+/.test(date) && 
                      !/^\d+$/.test(homework) &&  // Not just a number
                      homework.length > 3 &&      // Must have some substance
                      (isHomeworkTable || 
                       /teht|koti|läksy|harjoit|homework/i.test(homework))) { // Must contain homework-related words
                    tableResults.push({ date, homework });
                  }
                }
              }
              
              if (tableResults.length > 0) {
                console.log(`Found ${tableResults.length} homework items in table`);
                allResults = allResults.concat(tableResults);
              }
            }
          }
          
          console.log(`Total homework items collected: ${allResults.length}`);
          return allResults;
        });
        
        console.log(`Found ${homeworkData.length} homework items for ${subject.name}`);
        
        // 5. Add new homework to data
        for (const hw of homeworkData) {
          // Check if this homework already exists in the data
          const exists = data.tasks.some(task => 
            task.date === hw.date && 
            task.subject === subject.name && 
            task.description === hw.homework && 
            task.student_id === 1
          );
          
          if (!exists) {
            // Add new task
            const newTask = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              date: hw.date,
              subject: subject.name,
              description: hw.homework,
              type: 'homework',
              status: 'open',
              student_id: 1,
              points: 5
            };
            
            data.tasks.push(newTask);
            newTasksFound++;
            console.log(`Added new homework for ${subject.name}: ${hw.homework}`);
          }
        }
        
        // Wait between subject processing to avoid overloading the server
        await delay(REQUEST_DELAY * 2);
        
      } catch (error) {
        console.error(`Error processing ${subject.name}:`, error);
        await page.screenshot({ path: `${subject.name}_error.png` });
      }
    }
    
    console.log(`\nFound ${newTasksFound} new homework tasks`);
    
    // Save updated data
    await saveData(data);
    console.log('Scraping completed successfully');
  } catch (error) {
    console.error('Scraping error:', error);
    // Take a screenshot of the error state
    try {
      const page = (await browser.pages())[0];
      await page.screenshot({ path: 'error_state.png' });
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
  } finally {
    console.log('Closing browser...');
    await browser.close().catch(err => console.error('Error closing browser:', err));
  }
}

// Function to handle the login process
async function performLogin(page) {
  console.log('Attempting login...');
  
  try {
    // Make sure we're on the login page
    if (!page.url().includes('opetustampere.inschool.fi')) {
      await page.goto('https://opetustampere.inschool.fi/', { waitUntil: 'domcontentloaded' });
      await delay(REQUEST_DELAY);
    }
    
    // Wait for the login form to be available
    await page.waitForSelector('form#loginForm', { timeout: 10000 });
    console.log('Login form found');
    
    // Take a screenshot before login
    await page.screenshot({ path: 'before_login.png' });
    
    // Target the input fields directly
    const inputs = await page.$$('form#loginForm input[type="text"], form#loginForm input[type="password"]');
    console.log(`Found ${inputs.length} input fields`);
    
    if (inputs.length >= 2) {
      // Clear any existing values
      await inputs[0].click({ clickCount: 3 }); // Triple click to select all text
      await inputs[0].press('Backspace');
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].press('Backspace');
      
      // First input is username, second is password
      await inputs[0].type(WILMA_USERNAME, { delay: 100 });
      await inputs[1].type(WILMA_PASSWORD, { delay: 100 });
      console.log('Entered credentials');
      
      // Submit form by pressing Enter in the password field
      console.log('Submitting form by pressing Enter...');
      await Promise.all([
        inputs[1].press('Enter'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
      ]);
      
      console.log('Navigation completed after form submission');
      await delay(REQUEST_DELAY);
      
      // Take a screenshot after login attempt
      await page.screenshot({ path: 'after_login.png' });
      
      // Special handling for "last login" messages that might be misleading our login check
      const pageTitle = await page.title();
      const pageContent = await page.content();
      
      // If we get a page with login message but not a login form, consider it successful
      if (!await page.$('form#loginForm') && 
          (pageContent.includes('Kirjauduit') || pageTitle.includes('Wilma'))) {
        console.log('Login appears successful despite status message');
        return true;
      }
      
      // Check if login was successful
      const loginSuccess = await isLoggedIn(page);
      console.log(`Login ${loginSuccess ? 'succeeded' : 'failed'}`);
      
      return loginSuccess;
    } else {
      throw new Error(`Could not find login inputs (found ${inputs.length} inputs)`);
    }
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

// Run the scraper
scrapeWilma().catch(console.error);

/*
To run this:
1. Install Node.js if not already installed
2. Run: npm install puppeteer dotenv firebase
3. Update your WILMA_USERNAME and WILMA_PASSWORD in .env file
4. Run: node scraper.js
*/