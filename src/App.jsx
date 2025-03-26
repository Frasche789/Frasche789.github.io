import React from 'react';
import CurrentTasksContainer from './components/layout/CurrentTasksContainer';
import FutureTaskContainer from './components/layout/FutureTaskContainer';
import ArchiveTasksContainer from './components/layout/ArchiveTasksContainer';
import TomorrowClasses from './components/subjects/TomorrowClasses';
import { SubjectProvider } from './context/SubjectContext';
import { TaskProvider } from './context/TaskContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles.css';

function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;