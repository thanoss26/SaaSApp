const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting ChronosHR server...');
console.log('📱 Node.js version:', process.version);
console.log('🔧 PORT:', port);
console.log('🌐 NODE_ENV:', process.env.NODE_ENV);

// Serve static files from the public directory
app.use(express.static('public'));dasdas

// Health check endpointdsadsad
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
  res.sendFile(__dirname + '/public/index.html');
});

// Catch-all route to serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
  console.log(`✅ ChronosHR server running on port ${port}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📁 Serving static files from: ${__dirname}/public`);
}); 