// Fallback Express Server for TMR Bill Generator
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

console.log('⚠️ RUNNING FALLBACK SERVER - JavaScript Version')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8080

// Enable middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Service is running (Fallback JS)',
    timestamp: new Date().toISOString()
  })
})

// Mock bike models endpoint
app.get('/api/bike-models', (req, res) => {
  const mockBikeModels = [
    { id: '1', name: 'Bike Model A', year: 2024, price: 15000 },
    { id: '2', name: 'Bike Model B', year: 2024, price: 18000 },
    { id: '3', name: 'Bike Model C', year: 2025, price: 22000 }
  ]
  res.status(200).json(mockBikeModels)
})

// Mock bills endpoint
app.get('/api/bills', (req, res) => {
  const mockBills = [
    { 
      id: '1', 
      customerName: 'John Doe', 
      bikeModel: 'Bike Model A',
      date: new Date().toISOString(),
      amount: 15000,
      status: 'paid'
    },
    { 
      id: '2', 
      customerName: 'Jane Smith', 
      bikeModel: 'Bike Model B',
      date: new Date().toISOString(),
      amount: 18000,
      status: 'pending'
    }
  ]
  res.status(200).json(mockBills)
})

// Create bill endpoint
app.post('/api/bills', (req, res) => {
  console.log('Received bill creation request:', req.body)
  const newBill = {
    id: Date.now().toString(),
    ...req.body,
    date: new Date().toISOString(),
    status: 'pending'
  }
  res.status(201).json(newBill)
})

// Root route with API documentation
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'TMR Bill Generator API',
    status: 'Running in fallback mode',
    version: '1.0.0',
    endpoints: [
      { path: '/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/bike-models', method: 'GET', description: 'Get bike models' },
      { path: '/api/bills', method: 'GET', description: 'Get all bills' },
      { path: '/api/bills', method: 'POST', description: 'Create a new bill' }
    ]
  })
})

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fallback server running on port ${PORT}`)
  console.log(`📝 API documentation: http://localhost:${PORT}/`)
})