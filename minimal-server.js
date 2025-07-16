const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting minimal server...');
console.log('📱 Node.js version:', process.version);
console.log('🔧 PORT:', PORT);
console.log('🌐 NODE_ENV:', process.env.NODE_ENV);

// Optional static frontend
app.use(express.static('public'));

// API route
app.get('/', (req, res) => {
  res.send('ChronosHR backend is running');
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Health check passed',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

 