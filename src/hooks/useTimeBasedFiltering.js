/**
 * useTimeBasedFiltering
 * 
 * A custom hook that provides time-based filtering for tasks:
 * - Before noon: Tasks for today's classes or due today
 * - After noon: Tasks for tomorrow's classes
 * 
 * Features:
 * - Dynamically determines which tasks to display based on current time
 * - Refreshes periodically to update content without page reload
 * - Provides appropriate title and empty state messages based on time of day
 * 
 * @returns {Object} - Contains current task set, display title, and empty message
 */

import { useState, useEffect } from 'react';
import { useTaskData } from './useTaskData';

export function useTimeBasedFiltering() {
  // Get task data from the task hook
  const { todayTasks, todayClassTasks, tomorrowTasks, completeTask, isLoading, error } = useTaskData();
  
  // State to store current time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Determine if it's before noon
  const isBeforeNoon = currentTime.getHours() < 12;
  
  // Set appropriate tasks, title and empty message based on time
  // In the morning: Show today's class tasks AND any tasks due today
  // In the evening: Show tomorrow's tasks
  const activeTasks = isBeforeNoon 
    ? (Array.isArray(todayClassTasks) ? todayClassTasks : []).concat(
        Array.isArray(todayTasks) ? todayTasks : []
      ).filter((task, index, self) => 
        // Remove duplicates by checking for first occurrence of task.id
        index === self.findIndex(t => t.id === task.id)
      )
    : (Array.isArray(tomorrowTasks) ? tomorrowTasks : []);
  
  const title = isBeforeNoon 
    ? "Today's Tasks" 
    : "Tasks for Tomorrow's Classes";
    
  const emptyMessage = isBeforeNoon
    ? "All tasks for today's classes done!"
    : "All tasks for tomorrow's classes done!";
  
  // Update time every 10 minutes to refresh content automatically
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);
  
  // Debug log to help diagnose time-based issues
  useEffect(() => {
    console.log(`TimeBasedFiltering: ${isBeforeNoon ? 'Before noon' : 'After noon'}`);
    console.log(`Today tasks: ${todayTasks?.length || 0}, Today class tasks: ${todayClassTasks?.length || 0}, Tomorrow tasks: ${tomorrowTasks?.length || 0}`);
  }, [isBeforeNoon, todayTasks, todayClassTasks, tomorrowTasks]);
  
  return {
    activeTasks,
    title,
    emptyMessage,
    isBeforeNoon,
    isLoading,
    error,
    completeTask
  };
}

export default useTimeBasedFiltering;