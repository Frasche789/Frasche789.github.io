// src/App.jsx - Main application component
import React from 'react';
import TaskList from './components/tasks/TaskList';
import { TaskProvider, useTaskContext } from './context/TaskContext';

// Import CSS
import './/styles.css';

// Main App content component
function AppContent() {
  const { 
    todayTasks, 
    upcomingTasks, 
    completedTasks, 
    loading, 
    error, 
    completeTask 
  } = useTaskContext();

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="card">
        <h1>Task Board</h1>
        <p>ADHD-Optimized Task Tracking</p>
      </header>

      <div className="container">
        {/* Today's tasks section - highest visual priority */}
        <TaskList 
          title="What's up today" 
          tasks={todayTasks} 
          onTaskComplete={completeTask}
          emptyMessage="No tasks for today - enjoy your free time!" 
        />
        
        {/* Upcoming tasks section */}
        <TaskList 
          title="Coming up" 
          tasks={upcomingTasks} 
          onTaskComplete={completeTask} 
          emptyMessage="No upcoming tasks" 
        />
        
        {/* Completed tasks section */}
        <TaskList 
          title="Completed" 
          tasks={completedTasks} 
          onTaskComplete={completeTask}
          emptyMessage="Nothing completed yet" 
        />
      </div>
    </div>
  );
}

// Main App component with Context Provider
function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}

export default App;