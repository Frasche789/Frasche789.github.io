/**
 * useRuleContext.js
 * 
 * A custom hook that provides contextual data needed for rule evaluation.
 * Centralizes time-of-day determination and subject scheduling information.
 * 
 * Features:
 * - Provides consistent time-of-day values across components
 * - Supplies subject lists for today and tomorrow
 * - Updates time periodically to ensure correct time transitions
 * - Handles loading and error states from multiple sources
 * 
 * @returns {Object} Context data for rule evaluation
 */

import { useState, useEffect, useMemo } from 'react';
import { useSubjects } from './useSubjects';
import { TIME_OF_DAY } from '../rules/containerRules';

/**
 * Hook that provides contextual data for rule evaluation
 * @returns {Object} Rule context object
 * @property {string} timeOfDay - Current time of day (MORNING or AFTERNOON)
 * @property {Date} currentTime - Current date/time
 * @property {Array} todaySubjects - Subjects scheduled for today
 * @property {Array} tomorrowSubjects - Subjects scheduled for tomorrow
 * @property {boolean} isLoading - True if any dependent data is loading
 * @property {string|null} error - Error message if any
 */
export function useRuleContext() {
  // Get subject data from useSubjects hook
  const { 
    todaySubjects, 
    tomorrowSubjects, 
    isLoading: subjectsLoading, 
    error: subjectsError 
  } = useSubjects();
  
  // State to store and update current time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Determine time of day (morning or afternoon) based on current hour
  const timeOfDay = useMemo(() => {
    const hour = currentTime.getHours();
    return hour < 12 ? TIME_OF_DAY.MORNING : TIME_OF_DAY.AFTERNOON;
  }, [currentTime]);
  
  // Update time every 10 minutes to ensure accurate time-of-day tracking
  useEffect(() => {
    // Update immediately to ensure correct initial state
    setCurrentTime(new Date());
    
    // Set up interval for updates
    const intervalId = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);
      
      // Log time transitions for debugging
      const newHour = newTime.getHours();
      if (newHour === 12 && newTime.getMinutes() < 10) {
        console.log('Time transition: Switching from morning to afternoon mode');
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);
  
  // Memoize the full context object to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return {
      timeOfDay,
      currentTime,
      todaySubjects: todaySubjects || [],
      tomorrowSubjects: tomorrowSubjects || [],
      isLoading: subjectsLoading,
      error: subjectsError
    };
  }, [
    timeOfDay,
    currentTime, 
    todaySubjects, 
    tomorrowSubjects, 
    subjectsLoading, 
    subjectsError
  ]);
  
  return contextValue;
}

export default useRuleContext;
