// Simplified fallback JavaScript version
import express from 'express'
import cors from 'cors'

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

// Mock bike models endpoint
app.get('/api/bike-models', (req, res) => {
  const mockBikeModels = [
    { id: '1', name: 'Model A', year: 2023, price: 15000 },
    { id: '2', name: 'Model B', year: 2024, price: 18000 },
    { id: '3', name: 'Model C', year: 2025, price: 22000 }
  ];
  res.status(200).json(mockBikeModels);
});

// Mock bills endpoint
app.get('/api/bills', (req, res) => {
  const mockBills = [
    { 
      id: '1', 
      customerName: 'John Doe', 
      bikeModel: 'Model A',
      date: new Date().toISOString(),
      amount: 15000,
      status: 'paid'
    },
    { 
      id: '2', 
      customerName: 'Jane Smith', 
      bikeModel: 'Model B',
      date: new Date().toISOString(),
      amount: 18000,
      status: 'pending'
    }
  ];
  res.status(200).json(mockBills);
});

// Add POST endpoint for bills
app.post('/api/bills', (req, res) => {
  console.log('Received bill creation request:', req.body);
  // Return a mock created bill
  const newBill = {
    id: Date.now().toString(),
    ...req.body,
    date: new Date().toISOString(),
    status: 'pending'
  };
  res.status(201).json(newBill);
});

// Add a root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to TMR Bill Generator API',
    status: 'Running in fallback mode',
    version: '1.0.0',
    endpoints: [
      { path: '/health', description: 'Health check endpoint' },
      { path: '/api', description: 'Basic API information' },
      { path: '/api/bike-models', description: 'Get bike models' },
      { path: '/api/bills', description: 'Get or create bills' }
    ]
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running in fallback mode on port ${port}`)
})