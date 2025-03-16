// scraper.js - Run this with Node.js
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, query, where } = require('firebase/firestore');

// Define subject URLs globally so they're accessible to all functions
const subjects = [
  { name: 'History', url: 'https://opetustampere.inschool.fi/!0466066/groups/137349' },
  { name: 'Math', url: 'https://opetustampere.inschool.fi/!0466066/groups/137359' },
  { name: 'Finnish', url: 'https://opetustampere.inschool.fi/!0466066/groups/137358' },
  { name: 'English', url: 'https://opetustampere.inschool.fi/!0466066/groups/137348' },
  { name: 'Ethics', url: 'https://opetustampere.inschool.fi/!0466066/groups/137338' },
  { name: 'Civics', url: 'https://opetustampere.inschool.fi/!0466066/groups/137356' },
  { name: 'Eco', url: 'https://opetustampere.inschool.fi/!0466066/groups/137357' }
];

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
    
    try {
      // Get students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      if (!studentsSnapshot.empty) {
        data.students = studentsSnapshot.docs.map(doc => ({
          id: parseInt(doc.id, 10) || doc.id,
          ...doc.data()
        }));
      }
      
      // Get tasks
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      if (!tasksSnapshot.empty) {
        data.tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      console.log(`Loaded ${data.students.length} students and ${data.tasks.length} tasks from Firestore`);
    } catch (firestoreError) {
      console.error('Firestore connection error. Using default data:', firestoreError);
      // Continue with default data structure already defined
    }
    
    return data;
  } catch (error) {
    console.error('Error reading existing data from Firestore:', error);
    return { students: [{ id: 1, name: 'Nuno', points: 0 }], tasks: [] };
  }
}

// Subject name translation mapping
const subjectTranslations = {
  // Direct matches (case insensitive)
  'historia': 'History',
  'matematiikka': 'Math',
  'äidinkieli': 'Finnish',
  'englanti': 'English',
  'elämänkatsomustieto': 'Ethics',
  'yhteiskuntaoppi': 'Civics',
  'ympäristöoppi': 'Eco',
  
  // Partial matches and variants
  'suomi': 'Finnish',
  'finska': 'Finnish',
  'suomen kieli': 'Finnish',
  'mat': 'Math',
  'eng': 'English',
  'et': 'Ethics',
  'yht': 'Civics',
  'ymp': 'Eco',
  'hist': 'History'
};

// Function to translate Finnish subject names to English
function translateSubjectName(finnishName) {
  if (!finnishName) return 'Unknown';
  
  // Check for direct match (case insensitive)
  const lowerName = finnishName.toLowerCase().trim();
  
  // First try direct match
  if (subjectTranslations[lowerName]) {
    return subjectTranslations[lowerName];
  }
  
  // Then try partial matches
  for (const [finnish, english] of Object.entries(subjectTranslations)) {
    if (lowerName.includes(finnish.toLowerCase())) {
      return english;
    }
  }
  
  // If no match found, check if it's already one of our standard English subject names
  // This prevents "Unknown subject: English" or "Unknown subject: Finnish" messages
  const standardSubjects = subjects.map(s => s.name.toLowerCase());
  if (standardSubjects.includes(lowerName)) {
    // Return the properly capitalized version from our subjects array
    for (const subject of subjects) {
      if (subject.name.toLowerCase() === lowerName) {
        return subject.name;
      }
    }
    // If we don't find it in our array (unlikely), return the original
    return finnishName;
  }
  
  // Check the predefined subjects array for URLs
  // This is a fallback if the site returns unexpected subject names
  for (const subject of subjects) {
    if (finnishName.includes(subject.url)) {
      return subject.name;
    }
  }
  
  // If all else fails, return as is but log it for debugging
  console.log(`Unknown subject: ${finnishName}`);
  return finnishName;
}

// Function to save data to Firestore
async function saveData(data) {
  try {
    // Save students
    for (const student of data.students) {
      try {
        const studentData = {
          name: student.name || '',
          points: Number(student.points) || 0
        };
        
        await setDoc(doc(db, 'students', student.id.toString()), studentData);
      } catch (error) {
        console.error(`Error saving student ${student.id}:`, error);
      }
    }
    
    // Save tasks
    let successCount = 0;
    for (const task of data.tasks) {
      // Check if this task already exists in Firestore
      // We only need to check tasks that were newly added during this run
      if (!task.firestore_id) {
        // Translate subject name for consistency
        let normalizedSubject = translateSubjectName(task.subject);
        
        // Ensure date is in correct format (DD.MM.YYYY)
        let normalizedDate = task.date;
        if (normalizedDate && typeof normalizedDate === 'string') {
          // Add year if missing
          if (/^\d{1,2}\.\d{1,2}$/.test(normalizedDate)) {
            normalizedDate = `${normalizedDate}.${new Date().getFullYear()}`;
          }
          
          // Convert DD.MM.YY to DD.MM.YYYY
          if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(normalizedDate)) {
            const parts = normalizedDate.split('.');
            if (parts.length === 3) {
              const year = parseInt(parts[2], 10);
              const fullYear = year < 50 ? 2000 + year : 1900 + year;
              normalizedDate = `${parts[0]}.${parts[1]}.${fullYear}`;
            }
          }
        }
        
        try {
          // Prepare data with sanitized values - ensure no undefined or invalid values
          const taskData = {
            date: normalizedDate || '',
            due_date: '',
            description: task.description || '',
            subject: normalizedSubject || 'Unknown',
            type: task.type || 'homework',
            status: task.status || 'open',
            student_id: Number(task.student_id) || 1,
            completed: Boolean(task.completed) || false
          };
          
          // Check if task with same properties already exists - more restrictive query
          // Only query by subject and description to reduce complexity
          const q = query(
            collection(db, 'tasks'), 
            where('subject', '==', taskData.subject),
            where('description', '==', taskData.description)
          );
          
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            // Task doesn't exist yet, add it
            const docRef = await addDoc(collection(db, 'tasks'), taskData);
            console.log(`Added new task to Firestore with ID: ${docRef.id}`);
            successCount++;
          } else {
            console.log(`Task already exists in Firestore, skipping: ${task.description?.substring(0, 30)}...`);
          }
        } catch (error) {
          console.error('Error adding specific task to Firestore:', error);
          console.error('Problematic task data:', { 
            date: normalizedDate, 
            subject: normalizedSubject,
            description: task.description?.substring(0, 50) || 'undefined'
          });
        }
      }
    }
    console.log(`Data saved successfully to Firestore. Added ${successCount} new tasks.`);
  } catch (error) {
    console.error('Error saving data to Firestore:', error);
    // Fallback to local JSON file if Firestore fails
    try {
      const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
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
    // NOTE: subjects array is now defined globally at the top of the file
    
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
          let kotitehtavatSectionFound = false;
          
          // More precise targeting of the Kotitehtävät section
          // Look for section headers with exact text "Kotitehtävät"
          const kotitehtavatSections = Array.from(document.querySelectorAll('h3, h2, h4, div.otsikko, strong, span.otsikko'))
            .filter(el => {
              const text = el.textContent.trim();
              return text === 'Kotitehtävät' || 
                     text === 'Homework' || 
                     /^kotitehtävät$/i.test(text);
            });
          
          console.log(`Found ${kotitehtavatSections.length} Kotitehtävät section headers`);
          
          // Process homework from dedicated sections
          for (const section of kotitehtavatSections) {
            console.log(`Processing Kotitehtävät section: "${section.textContent.trim()}"`);
            kotitehtavatSectionFound = true;
            
            // Try multiple approaches to find the associated table
            
            // Approach 1: Look for the next sibling elements that contain tables
            let currentElement = section;
            let targetTable = null;
            
            // Check up to 5 next siblings to find a table
            for (let i = 0; i < 5; i++) {
              currentElement = currentElement.nextElementSibling;
              if (!currentElement) break;
              
              // Check if this element is a table or contains tables
              if (currentElement.tagName === 'TABLE') {
                targetTable = currentElement;
                break;
              } else if (currentElement.querySelector('table')) {
                targetTable = currentElement.querySelector('table');
                break;
              }
            }
            
            // Approach 2: If no table found, try parent containers
            if (!targetTable) {
              // Look for nearby tables within parent containers
              let container = section;
              // Try to find parent container
              for (let i = 0; i < 4; i++) {
                if (!container.parentElement) break;
                container = container.parentElement;
                
                // Check tables within this container
                const sectionTables = container.querySelectorAll('table');
                if (sectionTables.length > 0) {
                  targetTable = sectionTables[0]; // Use the first table found
                  break;
                }
              }
            }
            
            // Process the target table if found
            if (targetTable) {
              console.log('Found table for Kotitehtävät section');
              const rows = targetTable.querySelectorAll('tr');
              if (rows.length <= 1) continue; // Skip tables with only headers
              
              const tableResults = [];
              // Process each row
              for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                if (cells.length < 2) continue;
                
                // Check if first column contains a date
                let date = cells[0].textContent.trim();
                let homework = '';
                
                // Look for date and homework text
                if (/\d+\.\d+/.test(date)) {
                  // First column is date, second is homework
                  homework = cells[1].textContent.trim();
                } else if (cells.length >= 3 && /\d+\.\d+/.test(cells[1].textContent.trim())) {
                  // Second column is date
                  date = cells[1].textContent.trim();
                  homework = cells[2].textContent.trim();
                } else {
                  // No date found in expected columns
                  continue;
                }
                
                // Normalize date format to DD.MM.YYYY
                if (/^\d{1,2}\.\d{1,2}$/.test(date)) {
                  // Add current year if missing
                  date = `${date}.${new Date().getFullYear()}`;
                } else if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(date)) {
                  // Convert 2-digit year to 4-digit
                  const parts = date.split('.');
                  const year = parseInt(parts[2], 10);
                  const fullYear = year < 50 ? 2000 + year : 1900 + year;
                  date = `${parts[0]}.${parts[1]}.${fullYear}`;
                }
                
                // Only accept entries with reasonable homework descriptions
                if (date && homework && 
                    /\d+\.\d+/.test(date) && 
                    !/^\d+$/.test(homework) && // Exclude entries that are just numbers
                    homework.length > 1) {     // Must be more than a single character
                  tableResults.push({ date, homework });
                }
              }
              
              if (tableResults.length > 0) {
                console.log(`Found ${tableResults.length} homework items in Kotitehtävät section`);
                allResults = allResults.concat(tableResults);
              }
            } else {
              console.log('Could not find a table for this Kotitehtävät section');
            }
          }
          
          // If we didn't find anything in the dedicated homework sections, 
          // try specifically looking for tables with the Kotitehtävät header
          if (allResults.length === 0) {
            console.log('No results from section headers, trying table scanning...');
            
            for (const table of tables) {
              // First check if this table or any parent contains the word "Kotitehtävät"
              let isKotitehtavatTable = false;
              let currentEl = table;
              
              // Check the content of the table for Kotitehtävät
              if (table.textContent.toLowerCase().includes('kotitehtävät')) {
                isKotitehtavatTable = true;
              }
              
              // Check up to 3 parent elements for Kotitehtävät
              for (let i = 0; i < 3; i++) {
                if (!currentEl.parentElement) break;
                currentEl = currentEl.parentElement;
                if (currentEl.textContent.toLowerCase().includes('kotitehtävät')) {
                  isKotitehtavatTable = true;
                  break;
                }
              }
              
              if (isKotitehtavatTable) {
                console.log('Found table with Kotitehtävät in content or parent');
                const rows = table.querySelectorAll('tr');
                const tableResults = [];
                
                // Skip first row if it has headers
                const startRow = rows[0].querySelectorAll('th').length > 0 ? 1 : 0;
                
                for (let i = startRow; i < rows.length; i++) {
                  const cells = rows[i].querySelectorAll('td');
                  if (cells.length < 2) continue;
                  
                  let date = cells[0].textContent.trim();
                  let homework = cells[1].textContent.trim();
                  
                  // Look for date pattern
                  if (/\d+\.\d+/.test(date) && homework && homework.length > 1) {
                    tableResults.push({ date, homework });
                  }
                }
                
                if (tableResults.length > 0) {
                  console.log(`Found ${tableResults.length} homework items in Kotitehtävät table`);
                  allResults = allResults.concat(tableResults);
                  break; // Stop after finding one valid table
                }
              }
            }
          }
          
          console.log(`Total homework items collected: ${allResults.length}`);
          return allResults;
        });
        
        console.log(`Found ${homeworkData.length} homework items for ${subject.name}`);
        
        // 5. Add new homework to data
        for (const hw of homeworkData) {
          // Get the subject name from the current subject being processed
          // Use the translated/normalized English name from subjects array
          const normalizedSubject = subject.name;
          
          // Normalize date format
          let normalizedDate = hw.date;
          if (normalizedDate && typeof normalizedDate === 'string') {
            // Add year if missing
            if (/^\d{1,2}\.\d{1,2}$/.test(normalizedDate)) {
              normalizedDate = `${normalizedDate}.${new Date().getFullYear()}`;
            }
            
            // Convert DD.MM.YY to DD.MM.YYYY
            if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(normalizedDate)) {
              const parts = normalizedDate.split('.');
              if (parts.length === 3) {
                const year = parseInt(parts[2], 10);
                const fullYear = year < 50 ? 2000 + year : 1900 + year;
                normalizedDate = `${parts[0]}.${parts[1]}.${fullYear}`;
              }
            }
          }
          
          // Clean description - remove any problematic characters or content
          const cleanDescription = hw.homework ? 
            hw.homework.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
            '';
            
          if (!cleanDescription) {
            console.log('Skipping homework item with empty description');
            continue;
          }
          
          // Check if this homework already exists in the data
          const exists = data.tasks.some(task => 
            task.date === normalizedDate && 
            task.subject === normalizedSubject && 
            task.description === cleanDescription && 
            task.student_id === 1
          );
          
          if (!exists) {
            // Add new task with sanitized values
            const newTask = {
              id: (() => {
                // Parse the date (format: "DD.MM.YYYY")
                const dateParts = normalizedDate.split('.');
                // Create YYMMDD format
                const dateCode = dateParts[2].substring(2) + dateParts[1] + dateParts[0];
                // Get subject initials (first two letters uppercase)
                const subjectInitials = normalizedSubject.substring(0, 2).toUpperCase();
                // Create stylized ID: YYMMDD-XX
                return `${dateCode}-${subjectInitials}`;
              })(),
              date: normalizedDate,
              due_date: '',
              subject: normalizedSubject,
              description: cleanDescription,
              type: 'homework',
              status: 'open',
              student_id: 1,
            };
            
            data.tasks.push(newTask);
            newTasksFound++;
            console.log(`Added new homework for ${normalizedSubject}: ${cleanDescription.substring(0, 50)}${cleanDescription.length > 50 ? '...' : ''}`);
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
node scraper.js
*/