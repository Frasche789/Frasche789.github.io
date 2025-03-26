import React from 'react';
import CurrentTasksContainer from './components/tasks/CurrentTasksContainer';
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
          <CurrentTasksContainer />
        </div>
      </SubjectProvider>
    </TaskProvider>
  );
}

export default App;