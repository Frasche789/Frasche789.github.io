/**
 * ArchiveTasksContainer
 * 
 * Responsible for displaying completed tasks regardless of due date or subject.
 * Acts as a historical record of accomplishments that preserves task context.
 * 
 * Core responsibilities:
 * - Renders completed tasks in chronological order (newest first)
 * - Provides visibility toggle (show/hide archive)
 * - Applies visual de-emphasis to indicate completed status
 * - Supports task "unarchive" capability by reversing completed status
 * 
 * Data filtering criteria:
 * - task.completed === true
 * 
 * Information presentation characteristics:
 * - Lowest information density (minimal essential information)
 * - Reference-only content with de-emphasized styling
 * - Reduced opacity (60%), grayscale subject colors, reduced spacing
 * 
 * Visual treatment:
 * - Lowest vertical space allocation in container hierarchy
 * - Reduced opacity to indicate secondary importance
 * - Maintains subject color coding for continuity
 * - Shows completion status via checkbox state and text styling
 * 
 * Implementation notes:
 * - Uses collapsible UI pattern to conserve screen space
 * - Maintains completion timestamp for sorting
 * - Pagination for performance later (low priority)
 */

import React, { useState } from 'react';
import TaskList from '../tasks/TaskList';
import ContainerToggle from './ContainerToggle';
import { useTaskData } from '../../hooks/useTaskData';
import { useSubjects } from '../../hooks/useSubjects';
import '../../styles.css';

function ArchiveTasksContainer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completedTasks } = useTaskData();
  const { getSubjectColor } = useSubjects();

  // Sort completed tasks by completedDate (newest first)
  const sortedCompletedTasks = [...completedTasks].sort((a, b) => {
    const dateA = a.completedDate ? new Date(a.completedDate) : new Date(0);
    const dateB = b.completedDate ? new Date(b.completedDate) : new Date(0);
    return dateB - dateA; // Newest first
  });

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Function to "unarchive" a task by marking it incomplete
  const handleUncomplete = (taskId) => {
    // This will use the completeTask function with opposite behavior
    // In a real implementation, we would need a dedicated "uncompleteTask" function
    console.log(`Task ${taskId} would be marked as incomplete`);
  };

  return (
    <div className="archive-tasks-container">
      <ContainerToggle 
        onToggle={handleToggle}
        title="Completed Tasks"
        description={`${completedTasks.length} tasks completed`}
        isExpanded={isExpanded}
      />
      
      {isExpanded && (
        <div className="archive-content">
          <TaskList
            title="Your Accomplishments"
            tasks={sortedCompletedTasks}
            onComplete={handleUncomplete}
            emptyMessage="No completed tasks yet. Complete a task to see it here!"
            getSubjectColor={getSubjectColor}
            containerType="archive"
          />
        </div>
      )}
    </div>
  );
}

export default ArchiveTasksContainer;