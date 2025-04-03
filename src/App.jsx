import React from 'react';
import TaskContainer from './components/tasks/TaskContainer';
import TodaySubjects from './components/subjects/TodaySubjects';
import TomorrowSubjects from './components/subjects/TomorrowSubjects';
import AppHeader from './components/layout/AppHeader';
import { SubjectProvider } from './context/SubjectContext';
import { TaskProvider } from './context/TaskContext';
import { CONTAINER_TYPE } from './hooks/useContainerTasks';

/**
 * Main application component that orchestrates the layout and provides context
 * to all child components.
 */
function App() {
  return (
    <TaskProvider>
      <SubjectProvider>
        <div className="app">
          {/* App Header - Always at top */}
          <AppHeader />
          
          {/* Archive Container - Collapsed by default */}
          <TaskContainer containerType={CONTAINER_TYPE.ARCHIVE} />
          
          {/* Current and Tomorrow containers in a responsive grid layout */}
          <div className="container-row desktop-grid">
            <TaskContainer containerType={CONTAINER_TYPE.CURRENT}>
              <TodaySubjects />
            </TaskContainer>
            <TaskContainer containerType={CONTAINER_TYPE.TOMORROW}>
              <TomorrowSubjects />
            </TaskContainer>
          </div>
          
          {/* Future container spans full width */}
          <TaskContainer containerType={CONTAINER_TYPE.FUTURE} />
        </div>
      </SubjectProvider>
    </TaskProvider>
  );
}

export default App;