// src/components/tasks/TaskCard.jsx - Individual task display component
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../context/ThemeContext';

/**
 * Component for displaying an individual task card
 * Applies semantic styling based on container context and information hierarchy
 * 
 * Information hierarchy (highest to lowest priority):
 * 1. EXISTENCE - Task description and completion status
 * 2. CATEGORICAL - Subject and task type indicators
 * 3. TEMPORAL - Due dates and time information
 * 4. STATUS - Current state and metadata
 * 
 * @param {Object} props - Component props
 * @param {Object} props.task - Task data object
 * @param {Function} props.onComplete - Callback function when task is marked complete
 * @param {string} props.containerType - The type of container (current, future, archive)
 */
function TaskCard({ task, onComplete, containerType = 'current' }) {
  const {
    id,
    subject,
    description,
    date_added,
    due_date,
    type,
    completed,
    completedDate
  } = task;

  // Access theme context for semantic styling
  const { 
    getEmphasisStyles, 
    getContainerEmphasis, 
    getSubjectColor,
    EMPHASIS_LEVELS,
    INFORMATION_HIERARCHY
  } = useTheme();

  // Get the emphasis level based on container type
  const emphasisLevel = getContainerEmphasis(containerType);
  const emphasisStyles = getEmphasisStyles(emphasisLevel);
  const emphasisClass = emphasisStyles.getClass();
  
  // Get subject color with container-appropriate emphasis
  const subjectColor = getSubjectColor(subject, containerType);

  // Dynamic styles based on container type and emphasis level
  const cardStyle = {
    '--card-subject-color': subjectColor,
    '--card-opacity': emphasisStyles.opacity,
    '--card-emphasis': emphasisLevel,
  };

  // Handle completion button click
  const handleCompleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onComplete && !completed) {
      onComplete(id);
    }
  };

  // Format date for display based on temporal information hierarchy
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`task-card ${emphasisClass}`} style={cardStyle} data-container={containerType}>
      <div className="task-card-inner">
        {/* EXISTENCE Level: Completion Status (highest priority) */}
        <button 
          className="complete-btn" 
          onClick={handleCompleteClick}
          disabled={completed}
          aria-label={completed ? "Task completed" : "Mark as complete"}
        >
          {completed ? '✓' : ''}
        </button>
        
        <div className="task-card-content">
          {/* CATEGORICAL Level: Subject and Type */}
          <div className="task-card-header">
            <span className={`task-subject subject-badge ${subject.toLowerCase()}`} 
                  style={{ backgroundColor: `var(--subject-${subject.toLowerCase()}-bg, #f0f0f0)` }}>
              {subject}
            </span>
            
            <span className={`task-type ${type === 'exam' ? 'exam-badge' : 'task-badge'}`}>
              {type}
            </span>
          </div>
          
          {/* EXISTENCE Level: Task Description (highest priority) */}
          <div className="task-description">
            {description}
          </div>
          
          {/* TEMPORAL Level: Dates */}
          <div className="task-meta">
            {due_date && (
              <span className="due-date">
                Due: {formatDate(due_date)}
              </span>
            )}
            <span className="added-date">
              Added: {formatDate(date_added)}
            </span>
          </div>
          
          {/* STATUS Level: Completion status (lowest priority) */}
          {completed && (
            <div className="completed-stamp">
              Completed {completedDate ? formatDate(completedDate) : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

TaskCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    subject: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    date_added: PropTypes.string.isRequired,
    due_date: PropTypes.string,
    type: PropTypes.string.isRequired,
    completed: PropTypes.bool.isRequired,
    completedDate: PropTypes.string
  }).isRequired,
  onComplete: PropTypes.func.isRequired,
  containerType: PropTypes.oneOf(['current', 'future', 'archive']),
};

export default TaskCard;