import React from 'react';
import { getDayName, formatFinDate, getTodayFinDate } from '../../utils/dateUtils';

/**
 * AppHeader component - Displays the app title and current date
 * Optimized for ADHD/autism users with clear visual hierarchy
 */
const AppHeader = () => {
  // Get current date information
  const today = getTodayFinDate();
  const dayName = getDayName();
  const formattedDate = formatFinDate(today);
  const dateDisplay = `${dayName}, ${formattedDate}`;

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">Nuno's Task Board</h1>
        <p className="current-date">{dateDisplay}</p>
      </div>
    </header>
  );
};

export default AppHeader;