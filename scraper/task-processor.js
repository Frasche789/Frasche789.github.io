// task-processor.js - Module for processing and normalizing task data

// Import from local dateUtils.js (not from src/utils)
const { findNextClassOccurrence, getTodayIsoDate } = require('./dateUtils');

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
  const standardSubjects = ['History', 'Math', 'Finnish', 'English', 'Ethics', 'Civics', 'Eco'];
  const standardSubjectsLower = standardSubjects.map(s => s.toLowerCase());
  
  if (standardSubjectsLower.includes(lowerName)) {
    // Return the properly capitalized version from our subjects array
    for (const subject of standardSubjects) {
      if (subject.toLowerCase() === lowerName) {
        return subject;
      }
    }
    return finnishName;
  }
  
  console.log(`Unknown subject: ${finnishName}`);
  return finnishName;
}

// Normalize date format
function normalizeDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  
  try {
    // Convert Finnish format (DD.MM.YYYY or DD.MM or DD.MM.YY) to ISO
    let parts;
    
    // Handle DD.MM format
    if (/^\d{1,2}\.\d{1,2}$/.test(dateString)) {
      parts = dateString.split('.');
      return `${new Date().getFullYear()}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Handle DD.MM.YY format
    if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(dateString)) {
      parts = dateString.split('.');
      const year = parseInt(parts[2], 10);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return `${fullYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Handle DD.MM.YYYY format
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateString)) {
      parts = dateString.split('.');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // If it's already ISO format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If we can't recognize the format, return empty string
    return '';
  } catch (error) {
    console.error('Error normalizing date:', error, dateString);
    return '';
  }
}

// Generate a unique ID for a task
function generateUniqueId(subject, date, type) {
  // Clean up the inputs to make them suitable for ID generation
  const cleanSubject = (subject || '').toString()
    .replace(/[^\w]/g, '')
    .substring(0, 10);
    
  const cleanDate = (date || '').toString()
    .replace(/[^\d]/g, '')
    .substring(0, 8);
    
  const cleanType = (type || '').toString()
    .replace(/[^\w]/g, '')
    .substring(0, 5);
  
  // Base for the ID is concatenation of cleaned parts
  let baseId = `${cleanSubject}-${cleanDate}-${cleanType}`;
  
  // Additional entropy to reduce collision risk
  const timestamp = Date.now().toString(36);
  const randomPart = Math.floor(Math.random() * 10000).toString(36);
  
  // Return the combined ID
  return `${baseId}-${timestamp}-${randomPart}`;
}

/**
 * Calculate due date for a homework task based on:
 * - Date added
 * - Subject (to find next class occurrence)
 * @param {string} subject - The subject of the homework
 * @param {string} dateAdded - ISO format date when homework was added
 * @returns {string} ISO format due date
 */
function calculateHomeworkDueDate(subject, dateAdded) {
  if (!dateAdded) {
    // If no date_added, use today
    dateAdded = getTodayIsoDate();
  }
  
  try {
    // Translate subject name for correct mapping
    const normalizedSubject = translateSubjectName(subject);
    
    // Find the next class occurrence for this subject
    const nextClassDate = findNextClassOccurrence(normalizedSubject, dateAdded);
    
    // Convert to ISO string format (YYYY-MM-DD)
    return `${nextClassDate.getFullYear()}-${(nextClassDate.getMonth() + 1).toString().padStart(2, '0')}-${nextClassDate.getDate().toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating homework due date:', error);
    
    // Fallback: return date that's 3 days after the date_added
    try {
      const addedDate = new Date(dateAdded);
      const dueDate = new Date(addedDate);
      dueDate.setDate(dueDate.getDate() + 3);
      return `${dueDate.getFullYear()}-${(dueDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDate.getDate().toString().padStart(2, '0')}`;
    } catch {
      // If all else fails, fallback to a week from today
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7);
      return `${dueDate.getFullYear()}-${(dueDate.getMonth() + 1).toString().padStart(2, '0')}-${dueDate.getDate().toString().padStart(2, '0')}`;
    }
  }
}

// Process raw extracted data
function processExtractedData(subjectsData) {
  const processedTasks = [];

  // Process each subject
  for (const subjectInfo of subjectsData) {
    const { subject, data } = subjectInfo;
    
    if (!data) continue;
    
    // Process homework
    for (const homework of data.homework || []) {
      // For homework, we store the date added (when it was posted) in the date field
      const dateAdded = normalizeDate(homework.date_added);
      // Clean up the description by removing extra whitespace and limiting length to 1000 characters
      const cleanDescription = homework.description ? 
        homework.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
        '';
        
      if (!cleanDescription) {
        continue; // Skip entries with empty descriptions
      }
      
      // Calculate due date for homework based on subject and date added
      const dueDate = calculateHomeworkDueDate(subject, dateAdded);
      
      // Create a task object - now using ISO dates and including calculated due_date
      processedTasks.push({
        id: generateUniqueId(subject, dateAdded, 'homework'),
        date_added: dateAdded, // Date the homework was posted (in ISO format)
        due_date: dueDate,     // Calculated due date for the homework
        subject: subject,
        description: cleanDescription,
        topic: homework.topic,
        type: 'homework',
        status: 'open',
        student_id: 1,
      });
    }
    
    // Process exams - for exams, the due_date is the exam date
    for (const exam of data.futureExams || []) {
      const examDate = normalizeDate(exam.due_date);
      // Clean up the description by removing extra whitespace and limiting length to 1000 characters
      const cleanDescription = exam.description ? 
        exam.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
        '';
        
      if (!cleanDescription) {
        continue; // Skip entries with empty descriptions
      }
      
      // Create a task object - now using ISO dates
      processedTasks.push({
        id: generateUniqueId(subject, examDate, 'exam'),
        due_date: examDate, // Exam date (in ISO format)
        subject: subject,
        description: cleanDescription,
        topic: exam.topic,
        type: 'exam',
        status: 'open',
        student_id: 1,
      });
    }
  }
  
  return processedTasks;
}

// Export the module functions
module.exports = {
  processExtractedData,
  translateSubjectName,
  normalizeDate,
  generateUniqueId,
  calculateHomeworkDueDate
};
