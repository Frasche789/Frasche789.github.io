// renderer.js
function renderApp() {
    const state = getState();
    const { tasks, showArchive } = state;
    
    // 1. Categorize tasks
    const categorizedTasks = categorizeTaskByContainer(tasks);
    
    // 2. Render each container
    renderCurrentTasks(categorizedTasks.current);
    renderFutureTasks(categorizedTasks.future);
    renderArchive(categorizedTasks.archive, showArchive);
  }
  
  // Subscribe to state changes
  subscribe((state, oldState, changes) => {
    if (changes.includes('tasks') || changes.includes('showArchive')) {
      renderApp();
    }
  });