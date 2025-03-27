/**
 * EmptyState
 * 
 * A friendly, visually distinct component for displaying empty state messages.
 * Designed to be easily scannable and provide clear feedback to users with ADHD/autism.
 * 
 * Features:
 * - High contrast for better visibility
 * - Emoji for visual reinforcement (optional)
 * - Consistent padding and spacing
 * - Accessible text sizing
 */

import React from 'react';

// EmptyState component with optional emoji
export function EmptyState({ message, emoji = '✓' }) {
  return (
    <div className="empty-state">
      {emoji && <span className="empty-state-emoji" aria-hidden="true">{emoji}</span>}
      <p className="empty-state-message">{message}</p>
    </div>
  );
}

// Default export for backward compatibility
export default EmptyState;