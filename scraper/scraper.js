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
  { name: 'Math', url: 'https://opetustampere.inschool.fi/!0466066/groups/137353' },
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
    let data = { students: [{ id: 1, name: 'Nuno'}], tasks: [] };
    
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
    return { students: [{ id: 1, name: 'Nuno'}], tasks: [] };
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
  const standardSubjects = subjects.map(s => s.name.toLowerCase());
  if (standardSubjects.includes(lowerName)) {
    // Return the properly capitalized version from our subjects array
    for (const subject of subjects) {
      if (subject.name.toLowerCase() === lowerName) {
        return subject.name;
      }
    }
    return finnishName;
  }
  
  // Check the predefined subjects array for URLs
  for (const subject of subjects) {
    if (finnishName.includes(subject.url)) {
      return subject.name;
    }
  }
  
  console.log(`Unknown subject: ${finnishName}`);
  return finnishName;
}

// Normalize date format
function normalizeDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  
  // Add year if missing (DD.MM -> DD.MM.YYYY)
  if (/^\d{1,2}\.\d{1,2}$/.test(dateString)) {
    return `${dateString}.${new Date().getFullYear()}`;
  }
  
  // Convert DD.MM.YY to DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(dateString)) {
    const parts = dateString.split('.');
    if (parts.length === 3) {
      const year = parseInt(parts[2], 10);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return `${parts[0]}.${parts[1]}.${fullYear}`;
    }
  }
  
  return dateString;
}

// Function to save data to Firestore
async function saveData(data) {
  try {
    // Save students
    for (const student of data.students) {
      try {
        const studentData = {
          name: student.name || '',
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
      if (!task.firestore_id) {
        // Translate subject name for consistency
        let normalizedSubject = translateSubjectName(task.subject);
        
        // Ensure date is in correct format
        let normalizedDate = normalizeDate(task.date);
        let normalizedDueDate = normalizeDate(task.due_date || task.date);
        
        try {
          // Prepare data with sanitized values
          const taskData = {
            date: normalizedDate || '',
            due_date: normalizedDueDate || '',
            description: task.description || '',
            subject: normalizedSubject || 'Unknown',
            type: task.type || 'homework',
            status: task.status || 'open',
            student_id: Number(task.student_id) || 1,
            completed: Boolean(task.completed) || false
          };
          
          // Add topic field if it exists (for exams)
          if (task.topic) {
            taskData.topic = task.topic;
          }
          
          // Check if similar task already exists
          const q = query(
            collection(db, 'tasks'), 
            where('subject', '==', taskData.subject),
            where('description', '==', taskData.description)
          );
          
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            // Task doesn't exist yet, add it
            const docRef = await addDoc(collection(db, 'tasks'), taskData);
            console.log(`Added new ${task.type} task with ID: ${docRef.id}`);
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

// Function to handle the login process
async function performLogin(page) {
  console.log('Performing login...');
  
  try {
    // Find login form inputs
    const inputs = await page.$$('input[type="text"], input[type="password"]');
    
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
      console.log('Submitting form...');
      await Promise.all([
        inputs[1].press('Enter'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
      ]);
      
      console.log('Navigation completed after form submission');
      await delay(REQUEST_DELAY);
      
      // Check if login was successful
      return await isLoggedIn(page);
    } else {
      console.error('Could not find login form inputs');
      return false;
    }
  } catch (error) {
    console.error('Error during login:', error);
    return false;
  }
}

// Generate a unique ID for a task
function generateUniqueId(subject, date, type) {
  try {
    // Parse the date (format: "DD.MM.YYYY")
    const dateParts = date.split('.');
    if (dateParts.length < 3) return Date.now() + Math.floor(Math.random() * 1000);
    
    // Create YYMMDD format
    const dateCode = dateParts[2].substring(2) + dateParts[1].padStart(2, '0') + dateParts[0].padStart(2, '0');
    
    // Get subject initials (first two letters uppercase)
    const subjectInitials = subject.substring(0, 2).toUpperCase();
    
    // Add type indicator
    const typeIndicator = type === 'exam' ? 'EX' : 'HW';
    
    // Create stylized ID: YYMMDD-XX-TT
    return `${dateCode}-${subjectInitials}-${typeIndicator}`;
  } catch (error) {
    console.error('Error generating ID:', error);
    return Date.now() + Math.floor(Math.random() * 1000);
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
        
        // Extract task data with a STREAMLINED APPROACH focusing on consistent navigation
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
              
              console.log(`Column mapping - Due Date: ${columnIndices.dueDate}, Topic: ${columnIndices.topic}, Description: ${columnIndices.description}`);
              
              // Process data rows
              const exams = [];
              for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                if (cells.length < 2) continue;
                
                const examData = {
                  due_date: columnIndices.dueDate >= 0 && cells[columnIndices.dueDate] 
                    ? cells[columnIndices.dueDate].textContent.trim() : '',
                  topic: columnIndices.topic >= 0 && cells[columnIndices.topic]
                    ? cells[columnIndices.topic].textContent.trim() : '',
                  description: columnIndices.description >= 0 && cells[columnIndices.description]
                    ? cells[columnIndices.description].textContent.trim() : '',
                  type: 'exam',
                  isPast: sectionConfig.isPast
                };
                
                // If we have a valid date and either topic or description, add the exam
                if (examData.due_date && /\d+\.\d+/.test(examData.due_date) && 
                   (examData.topic || examData.description)) {
                  console.log(`Found ${sectionConfig.isPast ? 'past' : 'future'} exam: ${examData.due_date} - ${examData.topic || examData.description}`);
                  exams.push(examData);
                }
              }
              
              // Add exams to the appropriate array
              if (sectionConfig.isPast) {
                if (!sections.pastExams) sections.pastExams = [];
                sections.pastExams.push(...exams);
              } else {
                if (!sections.futureExams) sections.futureExams = [];
                sections.futureExams.push(...exams);
              }
            } 
            else if (sectionConfig.type === 'homework') {
              // Process homework table
              const rows = table.querySelectorAll('tr');
              if (rows.length <= 1) {
                console.log('Table contains only headers, skipping');
                return;
              }
              
              // Process rows for homework
              const homeworkItems = [];
              for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                if (cells.length < 2) continue;
                
                // Homework typically has date and description
                const date = cells[0].textContent.trim();
                const homework = cells[1].textContent.trim();
                
                if (date && homework && /\d+\.\d+/.test(date)) {
                  console.log(`Found homework: ${date} - ${homework.substring(0, 30)}...`);
                  homeworkItems.push({ date, homework });
                }
              }
              
              if (!sections.homework) sections.homework = [];
              sections.homework.push(...homeworkItems);
            }
          });
          
          // Prepare return data with default empty arrays
          return {
            homework: sections.homework || [],
            futureExams: sections.futureExams || [],
            pastExams: sections.pastExams || []
          };
        });
        
        console.log(`Found ${pageData.homework.length} homework items for ${subject.name}`);
        console.log(`Found ${pageData.futureExams.length} future exam items for ${subject.name}`);
        console.log(`Found ${pageData.pastExams.length} past exam items for ${subject.name}`);
        
        // Process homework data
        for (const hw of pageData.homework) {
          const normalizedDate = normalizeDate(hw.date);
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
            task.subject === subject.name && 
            task.description === cleanDescription && 
            task.type === 'homework' &&
            task.student_id === 1
          );
          
          if (!exists) {
            // Add new task
            const newTask = {
              id: generateUniqueId(subject.name, normalizedDate, 'homework'),
              date: normalizedDate,
              due_date: normalizedDate,
              subject: subject.name,
              description: cleanDescription,
              type: 'homework',
              status: 'open',
              student_id: 1,
            };
            
            data.tasks.push(newTask);
            newTasksFound++;
            console.log(`[HOMEWORK] Added new homework for ${subject.name}: ${cleanDescription.substring(0, 50)}${cleanDescription.length > 50 ? '...' : ''}`);
          } else {
            console.log(`Task already exists, skipping homework for ${subject.name}: ${cleanDescription.substring(0, 30)}...`);
          }
        }
        
        // Process future exam data - IMPROVED to properly handle topic field
        for (const exam of pageData.futureExams) {
          const normalizedDueDate = normalizeDate(exam.due_date);
          const normalizedDate = new Date().toLocaleDateString('fi-FI').replace(/\//g, '.'); // Today's date for creation date
          
          const cleanDescription = exam.description ? 
            exam.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
            '';
            
          const cleanTopic = exam.topic ?
            exam.topic.trim().replace(/\s+/g, ' ').substring(0, 200) :
            '';
          
          if (!cleanTopic && !cleanDescription) {
            console.log('Skipping exam item with empty topic and description');
            continue;
          }
          
          // Check if this exam already exists in the data - now checking topic field
          const exists = data.tasks.some(task => 
            task.due_date === normalizedDueDate && 
            task.subject === subject.name && 
            (task.topic === cleanTopic || 
             (task.description === cleanDescription && cleanDescription)) && 
            task.type === 'exam' &&
            task.student_id === 1
          );
          
          if (!exists) {
            // Add new exam task with topic field
            const newTask = {
              id: generateUniqueId(subject.name, normalizedDueDate, 'exam'),
              date: normalizedDate, // Creation date
              due_date: normalizedDueDate, // The exam date
              subject: subject.name,
              description: cleanDescription,
              topic: cleanTopic, // Store topic in a separate field
              type: 'exam',
              status: 'open',
              student_id: 1,
            };
            
            data.tasks.push(newTask);
            newTasksFound++;
            
            const topicDisplay = cleanTopic ? `Topic: ${cleanTopic.substring(0, 30)}${cleanTopic.length > 30 ? '...' : ''}` : '';
            const descDisplay = cleanDescription ? `Description: ${cleanDescription.substring(0, 30)}${cleanDescription.length > 30 ? '...' : ''}` : '';
            console.log(`[FUTURE EXAM] Added new exam for ${subject.name}: ${topicDisplay}${topicDisplay && descDisplay ? ' | ' : ''}${descDisplay}`);
          } else {
            const topicDisplay = cleanTopic ? `Topic: ${cleanTopic.substring(0, 20)}${cleanTopic.length > 20 ? '...' : ''}` : '';
            const descDisplay = cleanDescription ? `Description: ${cleanDescription.substring(0, 20)}${cleanDescription.length > 20 ? '...' : ''}` : '';
            console.log(`Task already exists, skipping exam for ${subject.name}: ${topicDisplay}${topicDisplay && descDisplay ? ' | ' : ''}${descDisplay}`);
          }
        }
        
        // Process past exam data if needed - IMPROVED to properly handle topic field
        for (const exam of pageData.pastExams) {
            const normalizedDueDate = normalizeDate(exam.due_date);
            const normalizedDate = new Date().toLocaleDateString('fi-FI').replace(/\//g, '.'); // Today's date for creation date
            
            const cleanDescription = exam.description ? 
              exam.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
              '';
              
            const cleanTopic = exam.topic ?
              exam.topic.trim().replace(/\s+/g, ' ').substring(0, 200) :
              '';
            
            if (!cleanTopic && !cleanDescription) {
              console.log('Skipping past exam item with empty topic and description');
              continue;
            }
            
            // Check if this exam already exists in the data - now checking topic field
            const exists = data.tasks.some(task => 
              task.due_date === normalizedDueDate && 
              task.subject === subject.name && 
              (task.topic === cleanTopic || 
               (task.description === cleanDescription && cleanDescription)) && 
              task.type === 'exam' &&
              task.student_id === 1
            );
            
            if (!exists) {
              // Add new exam task with topic field
              const newTask = {
                id: generateUniqueId(subject.name, normalizedDueDate, 'past_exam'),
                date: normalizedDate, // Creation date
                due_date: normalizedDueDate, // The exam date
                subject: subject.name,
                description: cleanDescription,
                topic: cleanTopic, // Store topic in a separate field
                type: 'exam',
                status: 'completed',  // Past exams are marked as completed
                student_id: 1,
              };
              
              data.tasks.push(newTask);
              newTasksFound++;
              
              const topicDisplay = cleanTopic ? `Topic: ${cleanTopic.substring(0, 30)}${cleanTopic.length > 30 ? '...' : ''}` : '';
              const descDisplay = cleanDescription ? `Description: ${cleanDescription.substring(0, 30)}${cleanDescription.length > 30 ? '...' : ''}` : '';
              console.log(`[PAST EXAM] Added new past exam for ${subject.name}: ${topicDisplay}${topicDisplay && descDisplay ? ' | ' : ''}${descDisplay}`);
            } else {
              const topicDisplay = cleanTopic ? `Topic: ${cleanTopic.substring(0, 20)}${cleanTopic.length > 20 ? '...' : ''}` : '';
              const descDisplay = cleanDescription ? `Description: ${cleanDescription.substring(0, 20)}${cleanDescription.length > 20 ? '...' : ''}` : '';
              console.log(`Task already exists, skipping past exam for ${subject.name}: ${topicDisplay}${topicDisplay && descDisplay ? ' | ' : ''}${descDisplay}`);
            }
          }
          
          // Wait between subject processing to avoid overloading the server
          await delay(REQUEST_DELAY * 2);
          
        } catch (error) {
          console.error(`Error processing ${subject.name}:`, error);
          await page.screenshot({ path: `${subject.name}_error.png` });
        }
      }
      
      // Print summary statistics
      console.log(`\n===== SCRAPING SUMMARY =====`);
      console.log(`Found ${newTasksFound} new tasks in total`);
      
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
  
  // Run the scraper
  scrapeWilma().catch(console.error);
  
  /*
  To run this:
  node scraper_2.js
  */