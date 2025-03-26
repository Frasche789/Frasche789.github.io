import React from 'react';
import CurrentTasksContainer from './components/layout/CurrentTasksContainer';
import FutureTaskContainer from './components/layout/FutureTaskContainer';
import ArchiveTasksContainer from './components/layout/ArchiveTasksContainer';
import TomorrowClasses from './components/subjects/TomorrowClasses';
import { SubjectProvider } from './context/SubjectContext';
import { TaskProvider } from './context/TaskContext';
import './styles.css';

function App() {
  return (
    <TaskProvider>
      <SubjectProvider>
        <div className="app">
          <TomorrowClasses />
          <ArchiveTasksContainer />
          <CurrentTasksContainer />
          <FutureTaskContainer />
        </div>
      </SubjectProvider>
    </TaskProvider>
  );
}

export default App;