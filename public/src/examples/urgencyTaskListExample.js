/**
 * Urgency Task List Example - Implementation example for the UrgencyTaskList component
 * 
 * This example shows how to use the UrgencyTaskList component with the new
 * groupTasksByUrgency function to create a mobile-optimized, ADHD-friendly
 * task visualization that prioritizes tasks based on urgency.
 */

import { getState } from '../state/appState.js';
import { groupTasksByUrgency } from '../services/taskService.js';
import { 
  createImmediateTasksContainer, 
  createLaterTasksContainer 
} from '../components/UrgencyTaskList.js';

/**
 * Render tasks grouped by urgency
 * @param {HTMLElement} container - The container element to render tasks into
 */
export function renderUrgencyBasedTasks(container) {
  // Clear container
  container.innerHTML = '';

  // Get tasks from state
  const { tasks } = getState();
  
  if (!tasks || tasks.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-state-container';
    emptyMessage.innerHTML = `
      <div class="empty-state-content">
        <i class="ri-emotion-happy-line"></i>
        <h3>No tasks found</h3>
        <p>All caught up! Add tasks to get started.</p>
      </div>
    `;
    container.appendChild(emptyMessage);
    return;
  }
  
  // Group tasks by urgency
  const groupedTasks = groupTasksByUrgency(tasks);
  
  // Create the main tasks container
  const tasksContainer = document.createElement('div');
  tasksContainer.className = 'task-days-container';
  
  // Create immediate tasks container (today and tomorrow)
  const immediateContainer = createImmediateTasksContainer(
    groupedTasks.immediate, 
    (taskId) => {
      console.log(`Task completed: ${taskId}`);
      // You could add specific behavior here, 
      // like showing a celebration animation
    }
  );
  tasksContainer.appendChild(immediateContainer);
  
  // Create later tasks container
  const laterContainer = createLaterTasksContainer(
    groupedTasks.later,
    (taskId) => {
      console.log(`Task completed: ${taskId}`);
    }
  );
  tasksContainer.appendChild(laterContainer);
  
  // Add to main container
  container.appendChild(tasksContainer);
}

/**
 * Initialize the urgency-based task visualization
 * This would typically be called from your main app initialization
 */
export function initUrgencyTaskView() {
  const mainContainer = document.getElementById('task-board');
  if (!mainContainer) return;
  
  // Initial render
  renderUrgencyBasedTasks(mainContainer);
  
  // Listen for task updates and re-render
  document.addEventListener('tasks-loaded', () => {
    renderUrgencyBasedTasks(mainContainer);
  });
  
  document.addEventListener('task-completed', () => {
    renderUrgencyBasedTasks(mainContainer);
  });
  
  document.addEventListener('task-added', () => {
    renderUrgencyBasedTasks(mainContainer);
  });
}
