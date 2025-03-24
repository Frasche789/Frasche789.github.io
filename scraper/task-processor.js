// task-processor.js - Module for processing and normalizing task data

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

// Process raw extracted data
function processExtractedData(subjectsData) {
  const processedTasks = [];
  const today = new Date().toLocaleDateString('fi-FI').replace(/\//g, '.'); // Today's date

  // Process each subject
  for (const subjectInfo of subjectsData) {
    const { subject, data } = subjectInfo;
    
    if (!data) continue;
    
    // Process homework
    for (const homework of data.homework || []) {
      const normalizedDueDate = normalizeDate(homework.due_date);
      const cleanDescription = homework.description ? 
        homework.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
        '';
        
      if (!cleanDescription) {
        continue; // Skip entries with empty descriptions
      }
      
      // Create a task object
      processedTasks.push({
        id: generateUniqueId(subject, normalizedDueDate, 'homework'),
        date: today, // Creation date
        due_date: normalizedDueDate,
        subject: subject,
        description: cleanDescription,
        type: 'homework',
        status: 'open',
        student_id: 1,
      });
    }
    
    // Process future exams
    for (const exam of data.futureExams || []) {
      const normalizedDueDate = normalizeDate(exam.due_date);
      
      const cleanDescription = exam.description ? 
        exam.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
        '';
        
      const cleanTopic = exam.topic ?
        exam.topic.trim().replace(/\s+/g, ' ').substring(0, 200) :
        '';
      
      if (!cleanTopic && !cleanDescription) {
        continue; // Skip entries with empty descriptions and topics
      }
      
      // Create a task object
      processedTasks.push({
        id: generateUniqueId(subject, normalizedDueDate, 'exam'),
        date: today, // Creation date
        due_date: normalizedDueDate,
        subject: subject,
        description: cleanDescription,
        topic: cleanTopic,
        type: 'exam',
        status: 'open',
        student_id: 1,
      });
    }
    
    // Process past exams
    for (const exam of data.pastExams || []) {
      const normalizedDueDate = normalizeDate(exam.due_date);
      
      const cleanDescription = exam.description ? 
        exam.description.trim().replace(/\s+/g, ' ').substring(0, 1000) : 
        '';
        
      const cleanTopic = exam.topic ?
        exam.topic.trim().replace(/\s+/g, ' ').substring(0, 200) :
        '';
      
      if (!cleanTopic && !cleanDescription) {
        continue; // Skip entries with empty descriptions and topics
      }
      
      // Create a task object
      processedTasks.push({
        id: generateUniqueId(subject, normalizedDueDate, 'past_exam'),
        date: today, // Creation date
        due_date: normalizedDueDate,
        subject: subject,
        description: cleanDescription,
        topic: cleanTopic,
        type: 'exam',
        status: 'completed', // Past exams are marked as completed
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
  generateUniqueId
};
