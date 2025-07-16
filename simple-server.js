const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Optional static frontend
app.use(express.static('public'));

// API route
app.get('/', (req, res) => {
  res.send('ChronosHR backend is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 