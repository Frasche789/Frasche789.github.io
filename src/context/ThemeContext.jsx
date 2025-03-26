/**
 * ThemeContext
 * 
 * Provides semantic styling constants and functions to establish a clear
 * information hierarchy optimized for users with ADHD/autism.
 * 
 * Key features:
 * - Defines semantic constants for information hierarchy (EXISTENCE, CATEGORICAL, TEMPORAL, STATUS)
 * - Defines container emphasis levels (PRIMARY, SECONDARY, TERTIARY)
 * - Provides helper functions for accessing styles based on semantic meaning
 * - Ensures consistent visual representation of information importance
 * - Abstracts implementation details from components
 */

import React, { createContext, useContext, useMemo } from 'react';

// Define information hierarchy constants for organizing visual priorities
const INFORMATION_HIERARCHY = {
  EXISTENCE: 'existence',   // Most important - task existence/core identity (description, completion)
  CATEGORICAL: 'categorical', // Second priority - categorical information (subject, type)
  TEMPORAL: 'temporal',     // Third priority - time-related information (due date, added date)
  STATUS: 'status',         // Fourth priority - current state information (progress, completion date)
};

// Define semantic emphasis levels for container types
const EMPHASIS_LEVELS = {
  PRIMARY: 'primary',    // Highest emphasis - for current tasks
  SECONDARY: 'secondary', // Moderate emphasis - for future tasks
  TERTIARY: 'tertiary',  // Lowest emphasis - for archive tasks
};

// Container types mapped to their semantic emphasis level
const CONTAINER_EMPHASIS = {
  current: EMPHASIS_LEVELS.PRIMARY,
  future: EMPHASIS_LEVELS.SECONDARY,
  archive: EMPHASIS_LEVELS.TERTIARY,
};

// Define the Theme Context
const ThemeContext = createContext();

/**
 * ThemeProvider component that wraps the application and provides
 * semantic styling constants and functions
 */
export function ThemeProvider({ children }) {
  // Define style properties based on semantic emphasis levels
  const emphasisStyles = useMemo(() => ({
    [EMPHASIS_LEVELS.PRIMARY]: {
      opacity: 1,
      spacing: 'var(--space-lg)',
      shadow: 'var(--shadow-lg)',
      borderWidth: '5px',
      getClass: () => 'emphasis-primary',
    },
    [EMPHASIS_LEVELS.SECONDARY]: {
      opacity: 0.9,
      spacing: 'var(--space-md)',
      shadow: 'var(--shadow)',
      borderWidth: '4px',
      getClass: () => 'emphasis-secondary',
    },
    [EMPHASIS_LEVELS.TERTIARY]: {
      opacity: 0.6,
      spacing: 'var(--space-sm)',
      shadow: 'var(--shadow-sm)',
      borderWidth: '3px',
      getClass: () => 'emphasis-tertiary',
    },
  }), []);

  // Helper functions for accessing semantic styles
  const getContainerEmphasis = (containerType) => {
    return CONTAINER_EMPHASIS[containerType] || EMPHASIS_LEVELS.TERTIARY;
  };

  const getContainerStyles = (containerType) => {
    const emphasisLevel = getContainerEmphasis(containerType);
    return emphasisStyles[emphasisLevel];
  };

  const getEmphasisStyles = (emphasisLevel) => {
    return emphasisStyles[emphasisLevel] || emphasisStyles[EMPHASIS_LEVELS.TERTIARY];
  };

  // Helper function to get subject colors with appropriate emphasis
  const getSubjectColor = (subjectCode, containerType) => {
    const emphasisLevel = getContainerEmphasis(containerType);
    const opacity = emphasisStyles[emphasisLevel].opacity;
    
    // Return the color with appropriate opacity based on container type
    return `var(--subject-${subjectCode.toLowerCase()}-color, var(--fallback-subject-color))`;
  };

  // CSS properties for specific UI elements
  const uiProperties = useMemo(() => ({
    touchTarget: 'var(--touch-target)',
    borderRadius: 'var(--border-radius)',
    transition: 'var(--transition-speed) var(--transition-function)',
    buttonSizes: {
      small: '32px',
      medium: '48px',
      large: '64px'
    }
  }), []);

  // Combine all theme values and functions
  const themeValue = useMemo(() => ({
    INFORMATION_HIERARCHY,
    EMPHASIS_LEVELS,
    CONTAINER_EMPHASIS,
    emphasisStyles,
    getContainerEmphasis,
    getContainerStyles,
    getEmphasisStyles,
    getSubjectColor,
    uiProperties,
  }), [emphasisStyles, uiProperties]);

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Custom hook for accessing theme context
 * Usage: const { getContainerStyles } = useTheme();
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
