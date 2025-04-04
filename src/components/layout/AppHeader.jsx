import React from 'react';
import { getDayName } from '../../utils/dateUtils';

/**
 * AppHeader component - Displays the app title and current date
 * Optimized for ADHD/autism users with clear visual hierarchy
 */
function AppHeader() {
  // Get current date information
  const today = new Date();
  const dayName = getDayName();
  const formattedDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">Nuno's Task Board</h1>
        <p className="current-date">{dayName}, {formattedDate}</p>
      </div>
    </header>
  );
}

export default AppHeader;