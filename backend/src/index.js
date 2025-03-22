// Simplified fallback JavaScript version
const express = require('express')
const cors = require('cors')

console.log("Using JavaScript fallback version of index.js")

const app = express()
const port = process.env.PORT || 8080

// Simple middleware
app.use(cors())
app.use(express.json())

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'System is healthy (JS fallback)' });
});

// Basic API route
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'API is running in fallback mode' });
});

// Add a root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to TMR Bill Generator API',
    status: 'Running in fallback mode',
    version: '1.0.0',
    endpoints: [
      { path: '/health', description: 'Health check endpoint' },
      { path: '/api', description: 'Basic API information' }
    ]
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running in fallback mode on port ${port}`)
})