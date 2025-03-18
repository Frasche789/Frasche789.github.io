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
let archiveCountEl = null;

/**
 * Initialize the Archive Task List component
 * @param {Object} elements - DOM elements object
 */
export function initArchiveTaskList(elements) {
  archiveContainerEl = elements.archiveContainer;
  archiveToggleEl = elements.archiveToggle;
  archiveEmptyStateEl = elements.archiveEmptyState;
  
  // Find the archive count element
  if (archiveToggleEl) {
    archiveCountEl = archiveToggleEl.querySelector('#archiveCount');
  }
  
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
  
  const isVisible = archiveContainerEl.classList.contains('visible');
  
  // Toggle visibility class
  if (isVisible) {
    archiveContainerEl.classList.remove('visible');
    archiveContainerEl.classList.add('hidden');
  } else {
    archiveContainerEl.classList.remove('hidden');
    archiveContainerEl.classList.add('visible');
  }
  
  // Update toggle button text - find the span element and update its text
  const textSpan = archiveToggleEl.querySelector('span:first-of-type');
  if (textSpan) {
    textSpan.textContent = isVisible ? 'Show Archive' : 'Hide Archive';
  }
    
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
  
  // Update archive count display
  if (archiveCountEl && archivedTasks) {
    archiveCountEl.textContent = archivedTasks.length;
  }
  
  // Set initial visibility
  if (showArchive) {
    archiveContainerEl.classList.remove('hidden');
    archiveContainerEl.classList.add('visible');
  } else {
    archiveContainerEl.classList.remove('visible');
    archiveContainerEl.classList.add('hidden');
  }
  
  // Update toggle button text if it exists
  if (archiveToggleEl) {
    const textSpan = archiveToggleEl.querySelector('span:first-of-type');
    if (textSpan) {
      textSpan.textContent = showArchive ? 'Hide Archive' : 'Show Archive';
    }
    archiveToggleEl.classList.toggle('archive-visible', showArchive);
  }
  
  // Clear previous content
  const taskListContainer = archiveContainerEl.querySelector('#archiveTasks');
  if (taskListContainer) {
    taskListContainer.innerHTML = '';
  
    // Check if there are any archived tasks
    if (!archivedTasks || archivedTasks.length === 0) {
      if (archiveEmptyStateEl) {
        archiveEmptyStateEl.style.display = 'flex';
      } else {
        // The empty state message is already in the HTML, just make it visible
        const emptyState = archiveContainerEl.querySelector('#emptyArchive');
        if (emptyState) {
          emptyState.style.display = 'block';
        }
      }
    } else {
      // Hide empty state if we have tasks
      if (archiveEmptyStateEl) {
        archiveEmptyStateEl.style.display = 'none';
      }
      
      const emptyState = archiveContainerEl.querySelector('#emptyArchive');
      if (emptyState) {
        emptyState.style.display = 'none';
      }
      
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
  }
}
