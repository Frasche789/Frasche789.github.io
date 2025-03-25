import React from 'react';
import CurrentTasksContainer from './components/tasks/CurrentTasksContainer';
import TomorrowClasses from './components/subjects/TomorrowClasses';
import './styles.css'; // If you have styles

function App() {
  return (
    <div className="app">
      <TomorrowClasses />
      <CurrentTasksContainer />
    </div>
  );
}

export default App;