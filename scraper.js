// scraper.js - Run this with Node.js
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// CONFIGURATION
const WILMA_USERNAME = process.env.WILMA_USERNAME;
const WILMA_PASSWORD = process.env.WILMA_PASSWORD;

// File paths
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'quests.json');
const COOKIES_FILE = path.join(DATA_DIR, 'cookies.json');

// Request delay to prevent rate limiting (ms)
const REQUEST_DELAY = 2000;

// Make sure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Helper function for controlled delays
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to load existing data
function loadExistingData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading existing data file:', error);
      return { students: [{ id: 1, name: 'Nuno', points: 0 }], tasks: [] };
    }
  } else {
    return { students: [{ id: 1, name: 'Nuno', points: 0 }], tasks: [] };
  }
}

// Function to save data
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Function to save cookies
async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log(`Saved ${cookies.length} cookies to ${COOKIES_FILE}`);
}

// Function to load cookies
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
    const data = loadExistingData();
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
          
          // Look for tables with date-like content in first column
          for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            if (rows.length <= 1) continue; // Skip tables with only headers
            
            const results = [];
            
            // Check for tables with date-like content
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td');
              if (cells.length >= 2) {
                const date = cells[0].textContent.trim();
                const homework = cells[1].textContent.trim();
                
                // Check if this looks like a date
                if (date && homework && /\d+\.\d+/.test(date)) {
                  results.push({ date, homework });
                }
              }
            }
            
            if (results.length > 0) {
              return results;
            }
          }
          
          return [];
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
    saveData(data);
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
2. Run: npm install puppeteer dotenv
3. Update your WILMA_USERNAME and WILMA_PASSWORD in .env file
4. Run: node scraper.js
*/