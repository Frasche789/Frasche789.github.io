import React, { useState, useEffect } from 'react';
import TaskList from './TaskList';  
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSubjects } from '../../hooks/useSubjects';

function CurrentTasksContainer() {
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const { tomorrowSubjects, allSubjects, isLoading: subjectsLoading, error: subjectsError, getSubjectColor } = useSubjects();

  useEffect(() => {
    // Skip execution if subjects are still loading
    if (subjectsLoading) {
      return;
    }
    
    async function fetchTasks() {
      try {
        setTasksLoading(true);
        
        // If there are no subjects for tomorrow, we can set empty tasks and exit
        if (!tomorrowSubjects || tomorrowSubjects.length === 0) {
          setTasks([]);
          setTasksLoading(false);
          return;
        }
        
        // Fetch all tasks
        const tasksRef = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);
        
        const allTasks = [];
        tasksSnapshot.forEach(doc => {
          allTasks.push({ id: doc.id, ...doc.data() });
        });
        
        // Get subject IDs for tomorrow's classes
        const subjectIds = tomorrowSubjects.map(subject => subject.id);
        const subjectNames = tomorrowSubjects.map(subject => 
          subject.name?.toLowerCase()
        ).filter(Boolean);
        
        // Filter tasks by subject and completion status
        const filteredTasks = allTasks.filter(task => {
          // Skip completed tasks
          if (task.completed) return false;
          
          // If task has no subject, can't match
          if (!task.subject) return false;
          
          // Normalize the subject field for comparison
          const taskSubject = String(task.subject).toLowerCase();
          
          // Try multiple matching approaches
          const matchesById = subjectIds.includes(task.subject);
          const matchesByIdLowercase = subjectIds.includes(taskSubject);
          const matchesByName = subjectNames.some(name => taskSubject.includes(name));
          
          return matchesById || matchesByIdLowercase || matchesByName;
        });
        
        setTasks(filteredTasks);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError("Failed to load tasks: " + err.message);
      } finally {
        setTasksLoading(false);
      }
    }
    
    fetchTasks();
  }, [tomorrowSubjects, subjectsLoading]);

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
      setError("Failed to complete task: " + err.message);
    }
  };

  // Show loading if either subjects or tasks are still loading
  const isLoading = subjectsLoading || tasksLoading;

  // Display subject loading error if present
  if (subjectsError) {
    return <div className="error">Error loading subjects: {subjectsError}</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (isLoading) {
    return <div className="loading">Loading tomorrow's tasks...</div>;
  }

  return (
    <div className="current-tasks-container">
      <TaskList
        title="Tasks for Tomorrow's Classes"
        tasks={tasks}
        onComplete={handleTaskComplete}
        emptyMessage="No tasks due for tomorrow's classes"
        getSubjectColor={getSubjectColor}
      />
    </div>
  );
}

export default CurrentTasksContainer;