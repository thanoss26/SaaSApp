console.log('🔍 Starting diagnostic server...');

// Check if we can require Express
try {
  console.log('📦 Loading Express...');
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  const app = express();
  const port = process.env.PORT || 3000;
  
  console.log('🔧 Environment check:');
  console.log('  - PORT:', port);
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - __dirname:', __dirname);
  
  // Basic route
  app.get('/', (req, res) => {
    console.log('📡 Root route hit');
    res.send('Diagnostic server is working!');
  });
  
  app.get('/api/health', (req, res) => {
    console.log('📡 Health route hit');
    res.json({ 
      status: 'OK',
      message: 'Diagnostic server health check',
      timestamp: new Date().toISOString()
    });
  });
  
  // Try to start the server
  console.log('🚀 Attempting to start server...');
  app.listen(port, () => {
    console.log(`✅ Server started successfully on port ${port}`);
    console.log(`🌐 Server should be accessible`);
  }).on('error', (error) => {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Failed to load Express:', error.message);
  console.error('❌ Error stack:', error.stack);
  process.exit(1);
}

// Handle process errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('❌ Error stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 