// src/context/TaskContext.js - Provides task data and operations across components
import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, getFirestore } from '../firebase';

// Create context
const TaskContext = createContext();

// Custom hook to use the task context
export const useTaskContext = () => useContext(TaskContext);

// Provider component
export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks from Firestore
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const tasksCollection = collection(db, 'tasks');
        const taskSnapshot = await getDocs(tasksCollection);
        
        const taskList = taskSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Normalize task data structure
          description: doc.data().description || '',
          subject: doc.data().subject || 'other',
          type: doc.data().type || 'task',
          due_date: doc.data().due_date || 'No due date',
          completed: doc.data().status === 'completed' || false
        }));
        
        setTasks(taskList);
        setError(null);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Failed to load tasks. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Mark a task as complete
  const completeTask = async (taskId) => {
    try {
      // Update in Firestore
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'completed'
      });
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, completed: true, status: 'completed' } 
            : task
        )
      );
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to update task. Please try again.');
    }
  };

  // Group tasks by completion and date
  const getTodayTasks = () => tasks.filter(task => 
    !task.completed && 
    task.due_date && 
    (task.due_date === new Date().toLocaleDateString('fi-FI') || 
     task.due_date === new Date().toLocaleDateString('en-US'))
  );
  
  const getUpcomingTasks = () => tasks.filter(task => 
    !task.completed && 
    !getTodayTasks().includes(task)
  );
  
  const getCompletedTasks = () => tasks.filter(task => 
    task.completed || task.status === 'completed'
  );

  const value = {
    allTasks: tasks,
    todayTasks: getTodayTasks(),
    upcomingTasks: getUpcomingTasks(),
    completedTasks: getCompletedTasks(),
    loading,
    error,
    completeTask
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};