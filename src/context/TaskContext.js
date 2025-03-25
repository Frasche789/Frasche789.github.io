import React, { useState, useEffect, createContext, useContext } from 'react';

// Creates a central source of truth for tasks
export const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load tasks from Firebase
  useEffect(() => {
    // Fetch tasks and update state
  }, []);
  
  // Functions to filter tasks
  const getTodayTasks = () => tasks.filter(task => isToday(task.dueDate));
  const getTomorrowTasks = () => tasks.filter(task => isTomorrow(task.dueDate));
  const getFutureTasks = () => tasks.filter(task => isFuture(task.dueDate));
  const getArchiveTasks = () => tasks.filter(task => task.completed);
  
  // Functions to modify tasks
  const completeTask = (taskId) => {
    // Update task in state AND in Firebase
  };
  
  return (
    <TaskContext.Provider value={{
      tasks,
      loading,
      getTodayTasks,
      getTomorrowTasks,
      getFutureTasks,
      getArchiveTasks,
      completeTask
    }}>
      {children}
    </TaskContext.Provider>
  );
}