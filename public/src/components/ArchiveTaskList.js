/**
 * ArchiveTaskList.js - Archive Task List Component
 * Component for displaying archived tasks with distinct visual design
 */

import { createTaskCard } from './TaskCard.js';
import { dispatch } from '../state/appState.js';

// DOM element cache
let archiveContainerEl = null;
let archiveToggleEl = null;
let archiveEmptyStateEl = null;

/**
 * Initialize the Archive Task List component
 * @param {Object} elements - DOM elements object
 */
export function initArchiveTaskList(elements) {
  archiveContainerEl = elements.archiveContainer;
  archiveToggleEl = elements.archiveToggle;
  archiveEmptyStateEl = elements.archiveEmptyState;
  
  if (!archiveContainerEl) {
    console.error('Archive container element not found');
    return;
  }
  
  // Set up toggle functionality if toggle element exists
  if (archiveToggleEl) {
    archiveToggleEl.addEventListener('click', toggleArchiveVisibility);
  }
}

/**
 * Toggle archive container visibility
 */
function toggleArchiveVisibility() {
  if (!archiveContainerEl || !archiveToggleEl) return;
  
  const isVisible = archiveContainerEl.style.display !== 'none';
  archiveContainerEl.style.display = isVisible ? 'none' : 'block';
  
  // Update toggle button text
  archiveToggleEl.textContent = isVisible 
    ? 'Show Archive' 
    : 'Hide Archive';
    
  // Update toggle button class
  archiveToggleEl.classList.toggle('archive-visible', !isVisible);
  
  // Dispatch event for state tracking
  dispatch('archive-toggled', { visible: !isVisible });
}

/**
 * Render archived tasks
 * @param {Array} archivedTasks - Array of archived tasks
 * @param {boolean} showArchive - Whether to show the archive section
 */
export function renderArchiveTasks(archivedTasks, showArchive = false) {
  if (!archiveContainerEl) {
    console.error('Archive container not initialized. Call initArchiveTaskList first.');
    return;
  }
  
  // Set initial visibility
  archiveContainerEl.style.display = showArchive ? 'block' : 'none';
  
  // Update toggle button text if it exists
  if (archiveToggleEl) {
    archiveToggleEl.textContent = showArchive 
      ? 'Hide Archive' 
      : 'Show Archive';
    archiveToggleEl.classList.toggle('archive-visible', showArchive);
  }
  
  // Clear previous content
  archiveContainerEl.innerHTML = '';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'archive-header';
  header.innerHTML = `
    <h2 class="archive-title">Archive</h2>
    <div class="archive-description">Tasks that are completed or older than 14 days</div>
  `;
  archiveContainerEl.appendChild(header);
  
  // Create task list container
  const taskListContainer = document.createElement('div');
  taskListContainer.className = 'archive-task-list';
  
  // Check if there are any archived tasks
  if (!archivedTasks || archivedTasks.length === 0) {
    if (archiveEmptyStateEl) {
      archiveEmptyStateEl.style.display = 'flex';
      taskListContainer.appendChild(archiveEmptyStateEl);
    } else {
      // Create empty state message
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state-container';
      emptyState.innerHTML = `
        <div class="empty-state-content">
          <i class="ri-archive-line"></i>
          <h3>Archive Empty</h3>
          <p>No archived tasks found</p>
        </div>
      `;
      taskListContainer.appendChild(emptyState);
    }
  } else {
    // Add archived tasks to the list with distinct styling
    archivedTasks.forEach(task => {
      const taskCard = createTaskCard(task, (taskId) => {
        // If a task in archive is uncompleted, it should be recategorized
        if (!task.completed) {
          dispatch('task-uncompleted', { taskId, task });
        }
      }, 'archive');
      
      // Add additional archive-specific styling
      taskCard.classList.add('archive-task-card');
      
      taskListContainer.appendChild(taskCard);
    });
  }
  
  archiveContainerEl.appendChild(taskListContainer);
}
