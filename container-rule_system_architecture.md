# Container-Rule System Architecture

## Overview

This document outlines the architectural foundation for visual task management applications, starting with TaskBoard and scaling to support more complex systems like GrowFlow. The architecture follows a container-based rule system that separates task data modeling, filtering logic, and UI rendering.

## Core Principles

1. **Separation of Concerns**
   - Task data management is separate from filtering logic
   - Filtering logic is separate from container rendering
   - Visual presentation is separate from business rules

2. **Declarative Rule Definition**
   - Rules defined as composable predicates
   - Container membership determined by rule evaluation
   - Rules adapt to contextual data (time, user state, etc.)

3. **Progressive Complexity**
   - Core architecture supports simple to complex implementations
   - Basic projects use a subset of the full architecture
   - Advanced projects extend the same foundation

## System Components

### 1. Task Data Model

Tasks are represented as objects with standardized attributes:

```javascript
// Basic task model (TaskBoard)
{
  id: "task-123",
  description: "Complete physics homework",
  createdAt: "2025-03-27T14:30:00Z",
  dueDate: "2025-03-30T23:59:59Z",
  completed: false,
  subject: "Physics"
}

// Extended task model (GrowFlow)
{
  id: "task-456",
  description: "Redesign personal website",
  createdAt: "2025-03-27T16:45:00Z",
  dueDate: "2025-04-15T23:59:59Z",
  completed: false,
  subject: "Design",
  
  // Extended attributes
  priority: "medium",
  effort: "high",
  impact: "medium",
  formationState: "rain",
  homeSection: "garden"
}
```

These models represent a progression from simple to complex task representations while maintaining backward compatibility.

### 2. Predicate System

Predicates are pure functions that evaluate to true or false when applied to a task:

```javascript
// Simple predicates
const isDueToday = task => isToday(task.dueDate);
const isCompleted = task => Boolean(task.completed);

// Complex predicates
const isUrgentHighImpact = task => 
  isUrgent(task) && task.impact === "high";
```

Predicates can be combined using logical operators:

```javascript
// Logical operations
const matchesAll = (...conditions) => task => 
  conditions.every(condition => condition(task));

const matchesAny = (...conditions) => task => 
  conditions.some(condition => condition(task));

const not = (condition) => task => 
  !condition(task);
```

### 3. Container Rule System

Container rules define which tasks belong in which container:

```javascript
// Container rule definitions
const containerRules = {
  // Current container rule
  current: (context) => task => {
    const { timeOfDay, todaySubjects } = context;
    
    if (timeOfDay === "morning") {
      return matchesAll(
        not(isCompleted),
        matchesAny(
          isDueToday,
          isForTodayClasses(todaySubjects)
        )
      )(task);
    } else {
      return matchesAll(
        not(isCompleted),
        isDueTomorrow
      )(task);
    }
  },
  
  // Future container rule
  future: (context) => task => {
    return matchesAll(
      not(isCompleted),
      not(containerRules.current(context)),
      hasDueDate
    )(task);
  },
  
  // Archive container rule
  archive: () => isCompleted
};
```

### 4. Rule Context

Context provides environmental data for rule evaluation:

```javascript
// Rule context example
{
  timeOfDay: "morning", // or "afternoon"
  currentTime: new Date(),
  todaySubjects: [{ id: "math", name: "Math" }, ...],
  tomorrowSubjects: [{ id: "physics", name: "Physics" }, ...],
  userPreferences: { ... }
}
```

### 5. Container Component Structure

Container components consume filtered tasks:

```jsx
function TaskContainer({ containerType }) {
  // Get filtered tasks for this container
  const { tasks, isLoading, error } = useContainerTasks(containerType);
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return (
    <div className={`${containerType}-container`}>
      <h2>{getContainerTitle(containerType)}</h2>
      <TaskList 
        tasks={tasks}
        emptyMessage={getEmptyMessage(containerType)}
      />
    </div>
  );
}
```

## Data Flow Architecture

```
[Firebase] → [Firebase.js] → [TaskContext] → [Rule Evaluation] → [Container Components]
```

1. **Data Source Layer**
   - Firebase stores tasks and subjects
   - Firebase.js handles data fetching and updates
   - TaskContext provides access to raw data

2. **Rule Evaluation Layer**
   - useRuleContext provides environmental data
   - containerRules define container membership
   - predicates evaluate individual task properties

3. **Presentation Layer**
   - useContainerTasks filters tasks for specific containers
   - TaskContainer renders container UI
   - TaskList renders filtered task lists
   - TaskCard renders individual tasks

## Container Types

### TaskBoard Containers

1. **Current Container**
   - Shows tasks relevant now (today/tomorrow)
   - Adapts based on time of day
   - Highest visual emphasis

2. **Future Container**
   - Shows tasks due after tomorrow
   - Medium visual emphasis
   - Chronologically ordered

3. **Archive Container**
   - Shows completed tasks
   - Lowest visual emphasis
   - Most recent completions first

### GrowFlow Extensions

1. **Formation Containers**
   - Clouds (left, middle, right)
   - Represent task formation stages
   - Tasks move as they gain definition

2. **Section Containers**
   - Garden (growth-oriented tasks)
   - Shed (necessary but challenging tasks)
   - Meadow (aspirational, low-pressure tasks)
   - Pond (completed tasks)

3. **Focus Container**
   - Sun (temporarily highlighted tasks)
   - Borrows tasks from other containers
   - Limited capacity (3-5 tasks)

## Implementation Guidelines

1. **Start with Core Components**
   - Implement predicate system
   - Define basic container rules
   - Create container-based hooks

2. **Refactor Existing Components**
   - Update TaskContext to remove filtering
   - Modify useTaskData to use container rules
   - Adapt TaskContainer to use useContainerTasks

3. **Add Extension Points**
   - Make rule system extensible
   - Document predicate composition patterns
   - Create test cases for rule combinations

4. **Prepare for Extended Attributes**
   - Define task type interface/validation
   - Ensure data model can handle optional fields
   - Document attribute relationships

## Scaling to GrowFlow

The architecture is designed to scale from TaskBoard to GrowFlow by:

1. **Extending the Task Model**
   - Add GrowFlow-specific attributes
   - Maintain backward compatibility
   - Implement validation for extended fields

2. **Adding Complex Container Rules**
   - Define natural formation flow rules
   - Implement section-based container rules
   - Create focus container borrowing logic

3. **Enhancing the Rule Context**
   - Add user energy state tracking
   - Implement GrowFlow-specific context
   - Track task formation progress

4. **Developing Advanced Visualization**
   - Implement natural metaphor components
   - Create task progression animations
   - Design adaptive container layouts