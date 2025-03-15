/**
 * StreakTracker.js - Streak Tracking Component
 * Manages streak visualization and celebration effects for engagement
 */

import { createConfetti, celebratePulse } from '../utils/animationUtils.js';
import { getState, setState, subscribe } from '../state/appState.js';

// DOM elements cache
let streakCountEl = null;
let streakBarEl = null;

/**
 * Initialize the Streak Tracker component
 * @param {Object} elements - DOM elements object
 */
export function initStreakTracker(elements) {
  streakCountEl = elements.streakCount;
  streakBarEl = elements.streakBar;
  
  if (!streakCountEl || !streakBarEl) {
    console.error('Streak tracker elements not found');
    return;
  }
  
  // Subscribe to streak changes
  subscribe(handleStreakChange, { path: 'streak' });
}

/**
 * Update the streak UI elements
 * @param {number} streakCount - Current streak count
 * @param {number} target - Target for streak completion
 */
export function updateStreakUI(streakData) {
  if (!streakCountEl || !streakBarEl) {
    console.error('Streak tracker elements not initialized. Call initStreakTracker first.');
    return;
  }
  
  const { count, target } = streakData;
  
  // Update streak count text
  streakCountEl.textContent = count || '0';
  
  // Update progress bar width
  const percentage = Math.min(100, Math.floor((count / target) * 100));
  streakBarEl.style.width = `${percentage}%`;
  
  // Add color classes based on progress
  streakBarEl.className = 'streak-bar'; // Reset classes
  
  if (percentage >= 100) {
    streakBarEl.classList.add('streak-complete');
  } else if (percentage >= 75) {
    streakBarEl.classList.add('streak-near-complete');
  } else if (percentage >= 50) {
    streakBarEl.classList.add('streak-halfway');
  } else if (percentage >= 25) {
    streakBarEl.classList.add('streak-starting');
  }
}

/**
 * Load streak data from localStorage
 * @returns {Object} The loaded streak data
 */
export function loadStreakData() {
  try {
    const savedStreak = localStorage.getItem('streak');
    
    if (savedStreak) {
      const streakData = JSON.parse(savedStreak);
      
      // Update state with loaded streak data
      setState({ streak: streakData }, 'streakTracker.loadStreakData');
      
      return streakData;
    }
  } catch (error) {
    console.error('Error loading streak data from localStorage:', error);
  }
  
  // Return default streak object if nothing was loaded
  return getState().streak;
}

/**
 * Save streak data to localStorage
 * @param {Object} streakData - The streak data to save
 */
export function saveStreakData(streakData) {
  try {
    localStorage.setItem('streak', JSON.stringify(streakData));
  } catch (error) {
    console.error('Error saving streak data to localStorage:', error);
  }
}

/**
 * Update streak information
 * Handles streak counting, local storage persistence, and visual feedback
 */
export function updateStreak() {
  // Get current streak data
  const { streak } = getState();
  let { count, target, lastActive } = streak;
  
  // Get today's date
  const today = new Date();
  const todayStr = today.toDateString();
  
  // Initialize streak if this is the first time
  if (!lastActive) {
    const newStreak = {
      count: 1,
      target: target || 7,
      lastActive: todayStr
    };
    
    // Update state
    setState({ streak: newStreak }, 'streakTracker.updateStreak');
    
    // Save to localStorage
    saveStreakData(newStreak);
    
    return newStreak;
  }
  
  // If user already used the app today, don't change the streak
  if (lastActive === todayStr) {
    return streak;
  }
  
  // Convert lastActive to a Date object
  const lastActiveDate = new Date(lastActive);
  
  // Calculate the difference in days
  const diffTime = Math.abs(today - lastActiveDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Check if the streak is still active (used yesterday or today)
  let newCount = count;
  
  if (diffDays <= 1) {
    // Streak continues
    newCount = count + 1;
    
    // Check for milestones
    if (newCount % target === 0) {
      // Target reached
      celebrateStreakMilestone(newCount);
    } else if (newCount === 3) {
      // Small celebration at 3 days
      celebrateStreakMilestone(3, 'small');
    }
  } else {
    // Streak broken
    newCount = 1;
    
    // Optional: Show a motivational message
    console.log('Starting a new streak!');
  }
  
  // Update streak data
  const newStreak = {
    count: newCount,
    target: target || 7,
    lastActive: todayStr
  };
  
  // Update state
  setState({ streak: newStreak }, 'streakTracker.updateStreak');
  
  // Save to localStorage
  saveStreakData(newStreak);
  
  return newStreak;
}

/**
 * Celebrate reaching a streak milestone
 * @param {number} milestone - The milestone reached
 * @param {string} [size='normal'] - Size of celebration ('small', 'normal', 'large')
 */
export function celebrateStreakMilestone(milestone, size = 'normal') {
  // Create a visual celebration
  createConfetti();
  
  // Find elements to animate
  const header = document.querySelector('.streak-tracker');
  const streakCount = document.getElementById('streakCount');
  
  if (header) {
    celebratePulse(header);
  }
  
  if (streakCount) {
    celebratePulse(streakCount);
  }
  
  // Create a temporary celebration element for larger milestones
  if (size !== 'small' && milestone >= 7) {
    const celebration = document.createElement('div');
    celebration.className = 'streak-celebration';
    
    let message = '';
    
    // Different messages based on milestone
    if (milestone >= 30) {
      message = `Amazing! ${milestone} day streak!`;
    } else if (milestone >= 14) {
      message = `Fantastic! ${milestone} day streak!`;
    } else {
      message = `${milestone} day streak! Keep it up!`;
    }
    
    celebration.innerHTML = `
      <div class="streak-message">
        <i class="ri-award-fill"></i>
        <h3>${message}</h3>
        <p>You're building a great habit!</p>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(celebration);
    
    // Force reflow
    void celebration.offsetWidth;
    
    // Add visible class to trigger animation
    celebration.classList.add('visible');
    
    // Remove after animation completes
    setTimeout(() => {
      celebration.classList.remove('visible');
      setTimeout(() => celebration.remove(), 500);
    }, 4000);
  }
}

/**
 * Handle streak changes from state updates
 * @param {Object} streakData - Updated streak data
 */
function handleStreakChange(streakData) {
  // Update UI with new streak data
  updateStreakUI(streakData);
}
