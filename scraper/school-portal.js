// school-portal.js - Module for interacting with the school portal (Wilma)
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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

// Define subject URLs for scraping
const subjects = [
  { name: 'History', url: 'https://opetustampere.inschool.fi/!0466066/groups/137349' },
  { name: 'Math', url: 'https://opetustampere.inschool.fi/!0466066/groups/137353' },
  { name: 'Finnish', url: 'https://opetustampere.inschool.fi/!0466066/groups/137358' },
  { name: 'English', url: 'https://opetustampere.inschool.fi/!0466066/groups/137348' },
  { name: 'Ethics', url: 'https://opetustampere.inschool.fi/!0466066/groups/137338' },
  { name: 'Civics', url: 'https://opetustampere.inschool.fi/!0466066/groups/137356' },
  { name: 'Eco', url: 'https://opetustampere.inschool.fi/!0466066/groups/137357' }
];

// Helper function for controlled delays
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    
    // Check for elements that would only be present after login
    const userInfo = await page.$('div.user-info');
    const logoutButton = await page.$('form[action*="logout"]');
    const wilmaLogo = await page.$('img.wilma-logo');
    
    // Check URL (might redirect to dashboard after login)
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('login');
    
    // Evaluate overall login status
    const isLoggedInStatus = (userInfo || logoutButton || wilmaLogo) && !isLoginPage;
    
    if (isLoggedInStatus) {
      console.log('Found authenticated user session');
    } else {
      console.log('No signs of authenticated session');
    }
    
    return isLoggedInStatus;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

// Function to handle the login process
async function performLogin(page) {
  try {
    // Wait for login elements
    console.log('Waiting for login form...');
    const usernameInput = await page.waitForSelector('input[name="Login"]', { timeout: 10000 });
    const passwordInput = await page.waitForSelector('input[name="Password"]', { timeout: 5000 });
    
    // Clear any pre-filled inputs
    await usernameInput.click({ clickCount: 3 });
    await usernameInput.press('Backspace');
    
    // Enter credentials
    console.log('Entering credentials...');
    await usernameInput.type(WILMA_USERNAME, { delay: 50 });
    await passwordInput.type(WILMA_PASSWORD, { delay: 50 });
    
    // Click login and wait for navigation
    console.log('Submitting login...');
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })
    ]);
    
    // Add delay to allow for potential redirects
    await delay(REQUEST_DELAY);
    
    // Check if we're logged in
    return await isLoggedIn(page);
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

// Initialize the scraper and login
async function login() {
  // Launch browser with optimized settings
  const browser = await puppeteer.launch({
    headless: false, // Change to false to see the browser window
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
    
    return { browser, page };
  } catch (error) {
    console.error('Login error:', error);
    await browser.close();
    throw error;
  }
}

// Extract data from a single subject
async function extractSubjectData(page, subject) {
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
    
    // Extract task data with a streamlined approach
    const pageData = await page.evaluate(() => {
      // Define section types we're looking for
      const sectionTypes = {
        'Tulevat kokeet': { type: 'exam', isPast: false },
        'Menneet kokeet': { type: 'exam', isPast: true },
        'Kotitehtävät': { type: 'homework', isPast: false },
        'Tuntipäiväkirja': { type: 'ignore', isPast: false }
      };
      
      // Find the main content container - more consistent approach
      const mainContent = document.querySelector('main#main-content');
      if (!mainContent) {
        console.log('Could not find main content area');
        return { homework: [], futureExams: [], pastExams: [] };
      }
      
      // Gather all section headers (h3 elements) and their content
      const sections = {};
      const headers = mainContent.querySelectorAll('h3');
      
      console.log(`Found ${headers.length} section headers in main content`);
      
      // Initialize result containers
      const homework = [];
      const futureExams = [];
      const pastExams = [];
      
      // Process each header
      headers.forEach(header => {
        const headerText = header.textContent.trim();
        console.log(`Processing header: "${headerText}"`);
        
        // Skip headers that don't match our known sections
        let sectionConfig = null;
        for (const [key, config] of Object.entries(sectionTypes)) {
          if (headerText.includes(key)) {
            sectionConfig = config;
            break;
          }
        }
        
        if (!sectionConfig) {
          console.log(`Skipping unknown section: "${headerText}"`);
          return;
        }
        
        if (sectionConfig.type === 'ignore') {
          console.log(`Ignoring section: "${headerText}" as requested`);
          return;
        }
        
        console.log(`Found ${sectionConfig.type} section: "${headerText}"`);
        
        // Find the table associated with this section
        let table = null;
        let currentNode = header.nextElementSibling;
        
        // Try to find the table in the next siblings
        while (currentNode && !table) {
          if (currentNode.tagName === 'TABLE') {
            table = currentNode;
          } else if (currentNode.querySelector('table')) {
            table = currentNode.querySelector('table');
          }
          
          if (!table) {
            currentNode = currentNode.nextElementSibling;
          }
        }
        
        if (!table) {
          console.log(`Could not find table for section: "${headerText}"`);
          return;
        }
        
        console.log(`Found table for section: "${headerText}"`);
        
        // Process the table based on section type
        if (sectionConfig.type === 'exam') {
          // Process exam table with more consistent column mapping
          const rows = table.querySelectorAll('tr');
          if (rows.length <= 1) {
            console.log('Table contains only headers, skipping');
            return;
          }
          
          // Extract column headers to map fields correctly
          const headerRow = rows[0];
          const headerCells = headerRow.querySelectorAll('th');
          const headerTexts = Array.from(headerCells).map(cell => 
            cell.textContent.trim().toLowerCase());
          
          console.log(`Exam table headers: ${headerTexts.join(' | ')}`);
          
          // Map column indices based on headers
          const columnIndices = {
            dueDate: headerTexts.findIndex(text => text.includes('pvm')),
            time: headerTexts.findIndex(text => text.includes('klo')),
            topic: headerTexts.findIndex(text => text.includes('aihe')),
            description: headerTexts.findIndex(text => text.includes('lisätiedot'))
          };
          
          // Process each row in the table (skipping the header)
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            
            // Skip rows with too few cells
            if (cells.length < 2) continue;
            
            // Extract data based on mapped column indices
            const exam = {
              due_date: columnIndices.dueDate >= 0 ? cells[columnIndices.dueDate].textContent.trim() : '',
              topic: columnIndices.topic >= 0 ? cells[columnIndices.topic].textContent.trim() : '',
              description: columnIndices.description >= 0 ? cells[columnIndices.description].textContent.trim() : ''
            };
            
            // Add time information if available
            if (columnIndices.time >= 0 && cells[columnIndices.time]) {
              const timeText = cells[columnIndices.time].textContent.trim();
              if (timeText) {
                exam.time = timeText;
              }
            }
            
            // Add exam to the appropriate list
            if (sectionConfig.isPast) {
              pastExams.push(exam);
            } else {
              futureExams.push(exam);
            }
          }
        } else if (sectionConfig.type === 'homework') {
          // Process homework table
          const rows = table.querySelectorAll('tr');
          if (rows.length <= 1) return; // Skip if only headers
          
          // Find column indices
          const headerRow = rows[0];
          const headerCells = headerRow.querySelectorAll('th');
          const headerTexts = Array.from(headerCells).map(cell => 
            cell.textContent.trim().toLowerCase());
          
          // Map columns
          const columnIndices = {
            dueDate: headerTexts.findIndex(text => text.includes('pvm')),
            description: headerTexts.findIndex(text => text.includes('kuvaus'))
          };
          
          // If we can't find the expected columns, try generic mapping
          if (columnIndices.dueDate < 0 || columnIndices.description < 0) {
            columnIndices.dueDate = 0;
            columnIndices.description = 1;
          }
          
          // Process homework rows
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            
            if (cells.length < 2) continue;
            
            const homeworkItem = {
              due_date: cells[columnIndices.dueDate].textContent.trim(),
              description: cells[columnIndices.description].textContent.trim()
            };
            
            homework.push(homeworkItem);
          }
        }
      });
      
      return { 
        homework, 
        futureExams, 
        pastExams
      };
    });
    
    return {
      subject: subject.name,
      data: pageData
    };
  } catch (error) {
    console.error(`Error processing ${subject.name}:`, error);
    return {
      subject: subject.name,
      data: { homework: [], futureExams: [], pastExams: [] },
      error: error.message
    };
  }
}

// Extract data from all subjects
async function extractAllSubjectData({ browser, page }) {
  const allData = [];
  
  try {
    for (const subject of subjects) {
      const subjectData = await extractSubjectData(page, subject);
      allData.push(subjectData);
      
      // Wait between subject processing to avoid overloading the server
      await delay(REQUEST_DELAY * 2);
    }
    
    return allData;
  } catch (error) {
    console.error('Error extracting subject data:', error);
    throw error;
  } finally {
    // Close the browser when done
    if (browser) {
      console.log('Closing browser...');
      await browser.close().catch(err => console.error('Error closing browser:', err));
    }
  }
}

// Export the module functions
module.exports = {
  login,
  extractSubjectData,
  extractAllSubjectData,
  subjects
};
