const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Optional static frontend
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ChronosHR backend is running',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV
  });
});

// Serve index.html for the root path
app.get('/', (req, res) => {
  res.send('ChronosHR backend is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 