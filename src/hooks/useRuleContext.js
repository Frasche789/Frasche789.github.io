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

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSubjects } from './useSubjects';
import { TIME_OF_DAY } from '../rules/containerRules';

// Create a performance monitoring utility for hook calls
const createPerformanceMonitor = (namespace) => {
  const callCounts = new Map();
  const logThreshold = 5; // Only log issues after this many calls
  
  return {
    trackCall: (name) => {
      if (process.env.NODE_ENV !== 'development') return;
      
      const count = (callCounts.get(name) || 0) + 1;
      callCounts.set(name, count);
      
      if (count === logThreshold) {
        console.warn(`[${namespace}] Performance warning: ${name} called ${count} times`);
      }
    },
    reset: () => {
      callCounts.clear();
    }
  };
};

const rulePerformance = createPerformanceMonitor('RuleContext');

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
  // For debugging - track how often this hook is called
  rulePerformance.trackCall('useRuleContext');
  
  // Track time transitions to minimize unnecessary updates
  const lastTimeOfDay = useRef(null);
  
  // Get subject data from useSubjects hook
  const { 
    todaySubjects, 
    tomorrowSubjects, 
    isLoading: subjectsLoading, 
    error: subjectsError 
  } = useSubjects();
  
  // State to store and update current time
  const [currentTime, setCurrentTime] = useState(() => new Date());
  
  // Determine time of day (morning or afternoon) based on current hour
  const timeOfDay = useMemo(() => {
    const hour = currentTime.getHours();
    const newTimeOfDay = hour < 12 ? TIME_OF_DAY.MORNING : TIME_OF_DAY.AFTERNOON;
    
    // Log time transitions but only when they actually happen
    if (lastTimeOfDay.current !== null && lastTimeOfDay.current !== newTimeOfDay) {
      console.log(`Time transition: Switching from ${lastTimeOfDay.current} to ${newTimeOfDay} mode`);
    }
    
    // Update ref to track last time of day
    lastTimeOfDay.current = newTimeOfDay;
    
    return newTimeOfDay;
  }, [currentTime]);
  
  // Update time every hour to ensure accurate time-of-day tracking
  // Changed from 10 minutes to 1 hour to reduce unnecessary updates
  useEffect(() => {
    // Skip immediate update if we already have a valid time
    const now = new Date();
    if (Math.abs(now - currentTime) < 1000) {
      // Current time is recent enough, no need to update
    } else {
      setCurrentTime(now);
    }
    
    // Set up interval for updates - hourly instead of every 10 minutes
    const intervalId = setInterval(() => {
      const newTime = new Date();
      
      // Check if this update would change the time of day
      const currentHour = currentTime.getHours();
      const newHour = newTime.getHours();
      const wouldChangeTimeOfDay = (currentHour < 12 && newHour >= 12) || 
                                  (currentHour >= 12 && newHour < 12);
      
      // Only update state if needed to avoid unnecessary renders
      if (wouldChangeTimeOfDay) {
        setCurrentTime(newTime);
        console.log('Time update triggered time-of-day change');
      }
    }, 60 * 60 * 1000); // 60 minutes
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [currentTime]);
  
  // Reset performance tracking on mount
  useEffect(() => {
    rulePerformance.reset();
    return () => {};
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
