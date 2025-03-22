// Simplified fallback JavaScript version
import express from 'express'
import cors from 'cors'

console.log("Using JavaScript fallback version of index.js")

const app = express()
const port = process.env.PORT || 3000

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

// Start server
app.listen(port, () => {
  console.log(`Server is running in fallback mode on port ${port}`)
})