// src/context/TaskContext.js
import React, { createContext, useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load tasks once on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchTasks() {
      try {
        setLoading(true);
        const tasksRef = collection(db, 'tasks');
        const snapshot = await getDocs(tasksRef);
        
        if (!isMounted) return;

        const fetchedTasks = [];
        snapshot.forEach(doc => {
          fetchedTasks.push({ 
            id: doc.id, 
            ...doc.data() 
          });
        });
        
        console.log(`Loaded ${fetchedTasks.length} tasks from Firestore`);
        setTasks(fetchedTasks);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching tasks:", err);
        setError("Failed to load tasks: " + err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchTasks();

    // Cleanup to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Handle task completion
  async function completeTask(taskId) {
    try {
      // Update in Firestore
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        completed: true,
        completedDate: new Date().toISOString()
      });
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: true, completedDate: new Date().toISOString() } : task
        )
      );
      
      console.log(`Task ${taskId} marked as complete`);
      return true;
    } catch (err) {
      console.error("Error completing task:", err);
      setError("Failed to complete task: " + err.message);
      return false;
    }
  }
  
  return (
    <TaskContext.Provider value={{
      tasks,
      loading,
      error,
      completeTask
    }}>
      {children}
    </TaskContext.Provider>
  );
}