# Nuno's Task Board: Technical Documentation

## Overview

Nuno's Task Board is a specialized task management system designed for a 12-year-old student with ADHD to track homework, exams, and other academic responsibilities. The system provides a reliable "source of truth" with clear temporal organization to address the fundamental challenge of understanding WHAT needs to be done by WHEN.

This documentation covers the architectural principles, implementation standards, and design guidelines for the system's MVP (v1).

## 1. System Architecture

### 1.1 Component Structure

```
Nuno's Task Board
│
├── Frontend Application (HTML/CSS/JS)
│   ├── UI Components
│   │   ├── Header
│   │   ├── Container Sections (Archive/Current/Future)
│   │   ├── Task Cards
│   │   └── Action Controls
│   │
│   ├── Data Management
│   │   ├── Firestore Queries
│   │   ├── Data Transformations
│   │   └── State Management
│   │
│   └── Event Handlers
│       ├── Task Completion
│       ├── Archive Toggle
│       └── Container Refresh
│
├── Firestore Database
│   └── Tasks Collection
│
└── Data Scraper (Puppeteer)
    ├── School Portal Access
    ├── Data Extraction
    └── Firestore Upload
```

### 1.2 Data Flow

1. **Scraper → Database**:
   - Scraper extracts homework and exam data from school portal
   - Transforms extracted data to match system data model
   - Writes new entries to Firestore database

2. **Database → Frontend**:
   - Frontend application queries Firestore for task data
   - Applies filtering and sorting based on temporal containers
   - Renders task cards in appropriate containers

3. **User → Frontend → Database**:
   - User toggles task completion status
   - Frontend updates Firestore record
   - UI refreshes to reflect updated state

## 2. Data Model

### 2.1 Core Entity: Task

All items in the system are represented as tasks with the following structure:

```javascript
{
  id: "string",                // Firestore auto-generated ID
  type: "homework" | "exam",   // Task type
  completed: boolean,          // Completion status
  dateAdded: Timestamp,        // When added to our system
  dateAddedHomework: Timestamp,// When added to school system (homework only)
  dueDate: Timestamp,          // Deadline for completion
  description: "string",       // Task description
  subject: "string",           // Academic subject
  topic: "string",             // Optional - specific focus area
  studentId: number,           // Student identifier
  completedAt: Timestamp       // Optional - when task was marked complete
}
```

### 2.2 Field Requirements by Type

| Field | Homework | Exam | Notes |
|-------|----------|------|-------|
| type | Required | Required | Determines processing rules |
| completed | Required | Required | Default: false |
| dateAdded | Required | Required | System timestamp |
| dateAddedHomework | Required | N/A | For archive filtering |
| dueDate | Required | Required | For sorting and urgency |
| description | Required | Required | Main visible content |
| subject | Required | Required | For filtering and display |
| topic | Optional | Optional | Primarily for exams |
| studentId | Required | Required | For multi-student support |
| completedAt | Optional | Optional | When available |

### 2.3 Temporal Container Logic

Tasks are organized into three containers based on the following rules:

1. **Archive**:
   ```javascript
   task.completed === true ||
   (task.type === 'homework' && task.dateAddedHomework < (now - 7 days)) ||
   (task.type === 'exam' && task.dueDate < now)
   ```

2. **Current**:
   ```javascript
   task.dueDate === today || task.dueDate === tomorrow
   ```

3. **Future**:
   ```javascript
   // All tasks that don't match Archive or Current criteria
   // Sorted by dueDate (ascending)
   ```

## 3. Frontend Implementation

### 3.1 Structure and Organization

The frontend application follows a modular structure:

- **HTML**: Semantic markup with clear container separation
- **CSS**: Modular styling with mobile-first approach
- **JavaScript**: Separation of concerns between:
  - Data operations (Firestore queries, transformations)
  - DOM manipulation (rendering, updates)
  - Event handling (user interactions)

### 3.2 Coding Standards

#### HTML

- Use semantic HTML5 elements (`<header>`, `<main>`, `<section>`, etc.)
- Maintain clear hierarchy and structural relationships
- Include appropriate ARIA attributes when necessary
- Optimize for mobile display

#### CSS

- Use clear, descriptive class names
- Organize styles by component/section
- Implement mobile-first responsive design
- Maintain consistent color schemes and spacing

#### JavaScript

- Use ES6+ features when appropriate
- Maintain clear function and variable naming
- Document complex logic with inline comments
- Separate concerns between data, logic, and presentation
- Implement error handling for all asynchronous operations

### 3.3 User Interface Components

1. **Header**:
   - Title display
   - Current date
   - Archive toggle control

2. **Container Sections**:
   - Clear visual separation between temporal categories
   - Appropriate headings and context information
   - Empty state handling

3. **Task Cards**:
   - Consistent structure across task types
   - Visual indicators for subject, urgency, and status
   - Completion toggle control
   - Due date display with appropriate formatting

### 3.4 Interaction Patterns

1. **Task Completion**:
   - Checkbox toggle → Update Firestore → UI refresh
   - Visual feedback for completion status
   - Proper error handling for failed updates

2. **Archive Toggle**:
   - Button control → Show/hide archived tasks
   - State persistence during session
   - Clear visual indication of current view state

## 4. Firebase Integration

### 4.1 Firestore Data Structure

```
firestore/
└── tasks/
    ├── task1
    ├── task2
    └── ...
```

### 4.2 Query Patterns

Implement consistent query patterns:

```javascript
// Example: Get current tasks
const getCurrentTasks = async () => {
  const today = new Date();
  // Set to beginning of day
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  
  try {
    return await db.collection('tasks')
      .where('completed', '==', false)
      .where('dueDate', '>=', today)
      .where('dueDate', '<', dayAfterTomorrow)
      .orderBy('dueDate')
      .get();
  } catch (error) {
    console.error('Error fetching current tasks:', error);
    // Implement appropriate error handling
    return [];
  }
};
```

### 4.3 Error Handling

Implement robust error handling for all Firebase operations:

```javascript
// Example: Update task completion status
const updateTaskCompletion = async (taskId, isCompleted) => {
  try {
    const updateData = {
      completed: isCompleted,
      // Add completedAt timestamp if task is being marked complete
      ...(isCompleted ? { completedAt: firebase.firestore.FieldValue.serverTimestamp() } : {})
    };
    
    await db.collection('tasks').doc(taskId).update(updateData);
    return true;
  } catch (error) {
    console.error('Error updating task completion:', error);
    // Implement user-facing error notification
    return false;
  }
};
```

### 4.4 Efficiency Considerations

- Use appropriate indexing for frequent queries
- Implement batch operations for multiple updates
- Consider offline capabilities for mobile usage

## 5. Data Scraper

### 5.1 Implementation Principles

- Focus on reliability over frequency
- Implement proper error handling and logging
- Ensure proper mapping to system data model
- Avoid duplicate entries through proper matching

### 5.2 Key Functions

1. **Portal Access**: Authenticate and navigate to relevant pages
2. **Data Extraction**: Parse HTML to extract homework/exam information
3. **Data Transformation**: Map extracted data to system format
4. **Database Update**: Write new/updated records to Firestore

## 6. Development Guidelines

### 6.1 Code Documentation

All modules, functions, and complex logic should include:

- Clear purpose statement
- Parameter descriptions
- Return value specification
- Example usage when appropriate
- Known limitations or edge cases

Example:
```javascript
/**
 * Categorizes tasks into temporal containers
 * 
 * @param {Array} tasks - Array of task objects from Firestore
 * @returns {Object} Object with keys: 'archive', 'current', and 'future', each containing an array of tasks
 * 
 * Example:
 * const containers = categorizeTasks(taskArray);
 * const currentTasks = containers.current;
 * 
 * Note: This function assumes tasks have valid dueDate values.
 * Tasks with invalid dates will be placed in the future container.
 */
function categorizeTasks(tasks) {
  // Implementation...
}
```

### 6.2 Implementation Complexity Guidelines

1. **Prioritize reliability**: Implement straightforward solutions that work consistently rather than technically optimal but complex approaches.

2. **Document complexity tradeoffs**: When making implementation choices between multiple approaches, document the rationale, pros/cons, and potential future considerations.

3. **Limit abstraction layers**: Keep the codebase approachable by minimizing unnecessary abstraction. Each added layer of abstraction should provide clear benefits.

4. **Progressive enhancement**: Start with core functionality working perfectly before adding refinements.

### 6.3 Error Handling

Implement comprehensive error handling:

1. **Network operations**: Handle connection issues gracefully
2. **Database operations**: Provide fallbacks for query failures
3. **User feedback**: Display appropriate messages for system errors
4. **Logging**: Record errors for troubleshooting

### 6.4 Communication Guidelines

When implementing features or suggesting solutions:

1. **Document decision points**:
   - Present options when multiple implementation approaches exist
   - Explain the rationale for chosen approaches
   - Highlight implications for future development

2. **Provide context-rich comments**:
   - Document the "why" not just the "how"
   - Flag areas that might need future refactoring
   - Explain non-obvious technical choices

3. **Implementation considerations**:
   - Explicitly note performance implications
   - Document browser compatibility considerations
   - Highlight potential edge cases

## 7. Testing and Validation

### 7.1 Manual Testing Focus Areas

1. **Core Functionality**:
   - Task display in correct containers
   - Completion status updates
   - Archive visibility toggle

2. **Mobile Usability**:
   - Touch target sizing
   - Responsive layout behavior
   - Text readability

3. **Error Scenarios**:
   - Database connection loss
   - Invalid data handling
   - Recovery from unexpected states

### 7.2 Data Validation

Implement validation for:

1. **Date handling**: Ensure proper formatting and timezone management
2. **Required fields**: Validate presence of critical data
3. **Data types**: Ensure values match expected formats

## 8. Security Considerations

For the MVP implementation:

1. **URL Obscurity**: Rely on non-guessable URL for basic access control
2. **Data Validation**: Implement client-side validation for all operations
3. **Firebase Rules**: Configure basic security rules to prevent unauthorized access

## 9. Future Considerations

While implementing the MVP, maintain awareness of potential future extensions:

1. **Authentication**: Structure code to allow future authentication addition
2. **Additional Task Types**: Design data model to accommodate future task types
3. **Calendar Integration**: Plan for potential API integration points

These considerations should not impact current implementation but inform architectural decisions to minimize future refactoring.

---

This documentation should be updated as the project evolves to maintain its value as a reference for development.
