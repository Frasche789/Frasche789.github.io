import React, { useState, useEffect } from 'react';
import TaskList from './TaskList';  
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

function CurrentTasksContainer() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. Determine tomorrow's day of week (0 = Sunday, 1 = Monday, ...)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayOfWeek = tomorrow.getDay();
        
        // Convert to day name for Firestore query
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const tomorrowDay = dayNames[dayOfWeek];
        
        // 2. Fetch subjects scheduled for tomorrow
        const subjectsRef = collection(db, 'subjects');
        const subjectsSnapshot = await getDocs(subjectsRef);
        
        const filteredSubjects = [];
        subjectsSnapshot.forEach(doc => {
          const subject = { id: doc.id, ...doc.data() };
          if (subject.schedule && subject.schedule[tomorrowDay]) {
            filteredSubjects.push(subject);
          }
        });
        
        // 3. Fetch tasks that match tomorrow's subjects
        const tasksRef = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);
        
        const allTasks = [];
        tasksSnapshot.forEach(doc => {
          allTasks.push({ id: doc.id, ...doc.data() });
        });
        
        // 4. Filter tasks by subject and completion status
        const subjectIds = filteredSubjects.map(subject => subject.id);
        const filteredTasks = allTasks.filter(task => 
          !task.completed && 
          subjectIds.includes(task.subject.toLowerCase())
        );
        
        setTasks(filteredTasks);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Handler for task completion
  const handleTaskComplete = async (taskId) => {
    try {
      // Task completion logic will go here
      // For now, just update the UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: true } : task
        )
      );
    } catch (err) {
      console.error("Error completing task:", err);
      setError("Failed to complete task. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading tomorrow's tasks...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="current-tasks-container">
      <TaskList
        title="Tasks for Tomorrow's Classes"
        tasks={tasks}
        onComplete={handleTaskComplete}
        emptyMessage="No tasks due for tomorrow's classes"
      />
    </div>
  );
}

export default CurrentTasksContainer;