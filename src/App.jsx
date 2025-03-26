import React from 'react';
import CurrentTasksContainer from './components/tasks/CurrentTasksContainer';
import TomorrowClasses from './components/subjects/TomorrowClasses';
import { SubjectProvider } from './context/SubjectContext';
import './styles.css';

function App() {
  return (
    <SubjectProvider>
      <div className="app">
        <TomorrowClasses />
        <CurrentTasksContainer />
      </div>
    </SubjectProvider>
  );
}

export default App;