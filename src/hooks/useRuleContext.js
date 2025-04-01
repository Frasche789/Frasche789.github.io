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

import { useMemo } from 'react';
import { useSubjects } from './useSubjects';

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
  
  // Get subject data from useSubjects hook
  const { 
    todaySubjects, 
    tomorrowSubjects, 
    isLoading: subjectsLoading, 
    error: subjectsError 
  } = useSubjects();
  
  // Memoize the full context object to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return {
      todaySubjects: todaySubjects || [],
      tomorrowSubjects: tomorrowSubjects || [],
      isLoading: subjectsLoading,
      error: subjectsError
    };
  }, [todaySubjects, tomorrowSubjects, subjectsLoading, subjectsError]);
  
  return contextValue;
}

export default useRuleContext;
