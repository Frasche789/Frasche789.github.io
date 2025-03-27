import React from 'react';
import TaskContainer from './components/tasks/TaskContainer';
import TimeAwareSubjects from './components/subjects/TimeAwareSubjects';
import AppHeader from './components/layout/AppHeader';
import { SubjectProvider } from './context/SubjectContext';
import { TaskProvider } from './context/TaskContext';
import './styles.css';


function App() {
  return (
    <TaskProvider>
      <SubjectProvider>
        <div className="app">
          <AppHeader />
          <TimeAwareSubjects />
          <TaskContainer containerType="archive" />
          <TaskContainer containerType="current" />
          <TaskContainer containerType="future" />
        </div>
      </SubjectProvider>
    </TaskProvider>
  );
}

export default App;