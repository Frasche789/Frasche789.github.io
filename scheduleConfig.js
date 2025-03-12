// scheduleConfig.js - Default schedule configurations for subjects

// Default schedule configuration
const defaultScheduleConfig = {
  // English is on Wednesday and Thursday
  "English": {
    classDays: ["Wednesday", "Thursday"],
    defaultDueInterval: 7
  },
  // Math classes and due date configurations
  "Math": {
    classDays: ["Monday", "Friday"],
    defaultDueInterval: 7
  },
  // Finnish (native language) configuration
  "Finnish": {
    classDays: ["Tuesday", "Friday"],
    defaultDueInterval: 7
  },
  // History class configuration
  "History": {
    classDays: ["Tuesday"],
    defaultDueInterval: 7
  },
  // Science/Environmental studies
  "Eco": {
    classDays: ["Monday", "Thursday"],
    defaultDueInterval: 7
  },
  // Civics class configuration
  "Civics": {
    classDays: ["Tuesday"],
    defaultDueInterval: 7
  },
  // Arts and crafts
  "Crafts": {
    classDays: ["Monday"],
    defaultDueInterval: 14  // Typically longer projects
  },
  "Art": {
    classDays: ["Wednesday"],
    defaultDueInterval: 14  // Typically longer projects
  },
  // Physical education
  "PE": {
    classDays: ["Monday", "Friday"],
    defaultDueInterval: 7
  },
  // Music class
  "Music": {
    classDays: ["Thursday"],
    defaultDueInterval: 7
  },
  // Ethics/Religious studies
  "Ethics": {
    classDays: ["Thursday"],
    defaultDueInterval: 7
  },
  // Digital skills
  "Digi": {
    classDays: ["Friday"],
    defaultDueInterval: 7
  }
};

// Function to get schedule config for a subject
function getSubjectConfig(subject) {
  return defaultScheduleConfig[subject] || {
    classDays: [],
    defaultDueInterval: 7
  };
}

module.exports = {
  defaultScheduleConfig,
  getSubjectConfig
};