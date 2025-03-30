import React from 'react';
import TaskContainer from './components/tasks/TaskContainer';
import TimeAwareSubjects from './components/subjects/TimeAwareSubjects';
import AppHeader from './components/layout/AppHeader';
import { SubjectProvider } from './context/SubjectContext';
import { TaskProvider } from './context/TaskContext';
import { CONTAINER_TYPE } from './hooks/useContainerTasks';
import './styles.css';


function App() {
  return (
    <TaskProvider>
      <SubjectProvider>
        <div className="app">
          <AppHeader />
          <TimeAwareSubjects />
          <TaskContainer containerType={CONTAINER_TYPE.ARCHIVE} />
          {/* Today and Tomorrow containers in a responsive grid layout */}
          <div className="container-row desktop-grid">
            <TaskContainer containerType={CONTAINER_TYPE.CURRENT} />
            <TaskContainer containerType={CONTAINER_TYPE.TOMORROW} />
          </div>
          
          {/* Future and Archive containers remain vertical */}
          <TaskContainer containerType={CONTAINER_TYPE.FUTURE} />
        </div>
      </SubjectProvider>
    </TaskProvider>
  );
}

export default App;