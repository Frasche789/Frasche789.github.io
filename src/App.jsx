// App.jsx - Main application component
import React, { useState, useCallback } from 'react';
import TaskList from './components/tasks/TaskList';

// Import CSS to apply existing styling
import './/styles.css';

/**
 * Main App component that serves as the entry point for the Task Board application
 * 
 * @returns {JSX.Element} The rendered App component
 */
function App() {
  // Sample task data - would be replaced with real data from Firebase in the future
  const [tasks, setTasks] = useState([
    {
      id: '1',
      description: 'Complete math homework',
      subject: 'math',
      type: 'homework',
      dueDate: 'Today',
      completed: false
    },
    {
      id: '2',
      description: 'Study for English exam',
      subject: 'english',
      type: 'exam',
      dueDate: 'Tomorrow',
      completed: false
    },
    {
      id: '3',
      description: 'Prepare history presentation',
      subject: 'history',
      type: 'task',
      dueDate: 'Next week',
      completed: true
    }
  ]);

  /**
   * Toggle the completion status of a task
   * @param {string} taskId - ID of the task to toggle
   */
  const toggleTaskCompletion = useCallback((taskId) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed } 
          : task
      )
    );
  }, []);

  // Group tasks by completion status
  const todayTasks = tasks.filter(task => 
    task.dueDate === 'Today' && !task.completed
  );
  
  const otherTasks = tasks.filter(task => 
    task.dueDate !== 'Today' && !task.completed
  );
  
  const completedTasks = tasks.filter(task => 
    task.completed
  );

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
          onComplete={toggleTaskCompletion}
          emptyMessage="No tasks for today - enjoy your free time!" 
        />
        
        {/* Upcoming tasks section */}
        <TaskList 
          title="Coming up" 
          tasks={otherTasks} 
          onComplete={toggleTaskCompletion} 
          emptyMessage="No upcoming tasks" 
        />
        
        {/* Completed tasks section */}
        <TaskList 
          title="Completed" 
          tasks={completedTasks} 
          onComplete={toggleTaskCompletion}
          emptyMessage="Nothing completed yet" 
        />
      </div>
    </div>
  );
}

export default App;