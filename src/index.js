import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';  // Updated import path with explicit extension
import './styles/main.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);