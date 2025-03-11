// server.js - Simple Express server to serve the Quest Board app
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001; // Changed from 3000

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the index.html file for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server with error handling for port conflicts
const server = app.listen(PORT, () => {
  console.log(`Quest Board server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port.`);
    // Try another port automatically
    const newPort = PORT + 1;
    console.log(`Attempting to use port ${newPort}...`);
    app.listen(newPort, () => {
      console.log(`Quest Board server running at http://localhost:${newPort}`);
      console.log('Press Ctrl+C to stop the server');
    });
  } else {
    console.error('Server error:', err);
  }
});
