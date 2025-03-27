/**
 * TaskContext.js
 * 
 * Provides task data management for the Quest Board application.
 * This context is responsible for:
 * - Fetching task data from Firebase
 * - Maintaining task state
 * - Providing operations to modify tasks (complete/uncomplete)
 * - Exposing loading and error states
 * 
 * This context has been refactored to focus ONLY on data management,
 * with all filtering logic moved to specialized hooks and rules.
 */
import React, { createContext, useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const TaskContext = createContext();

/**
 * Task Provider component that manages task data
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} TaskContext Provider
 */
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
  
  /**
   * Mark a task as completed
   * @param {string} taskId - ID of the task to complete
   * @returns {Promise<boolean>} Success indicator
   */
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
  
  /**
   * Mark a task as not completed
   * @param {string} taskId - ID of the task to uncomplete
   * @returns {Promise<boolean>} Success indicator
   */
  async function uncompleteTask(taskId) {
    try {
      // Update in Firestore
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        completed: false,
        completedDate: null
      });
      
      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, completed: false, completedDate: null } : task
        )
      );
      
      console.log(`Task ${taskId} marked as incomplete`);
      return true;
    } catch (err) {
      console.error("Error uncompleting task:", err);
      setError("Failed to uncomplete task: " + err.message);
      return false;
    }
  }
  
  return (
    <TaskContext.Provider value={{
      tasks,
      loading,
      error,
      completeTask,
      uncompleteTask
    }}>
      {children}
    </TaskContext.Provider>
  );
}