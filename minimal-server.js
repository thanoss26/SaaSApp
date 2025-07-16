const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting minimal server...');
console.log('📱 Node.js version:', process.version);
console.log('🔧 PORT:', PORT);
console.log('🌐 NODE_ENV:', process.env.NODE_ENV);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Minimal server is working!',
    timestamp: new Date().toISOString(),
    port: PORT,
    nodeEnv: process.env.NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Health check passed',
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for debugging
app.get('*', (req, res) => {
  res.json({ 
    message: 'Catch-all route hit',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    port: PORT,
    nodeEnv: process.env.NODE_ENV
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Server should be accessible at: http://0.0.0.0:${PORT}`);
}).on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 