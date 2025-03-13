import express from 'express'
import { getDatabase } from '../utils/database.js'
import { generateBill } from '../utils/billGenerator.js'
import { generatePDF } from '../utils/pdfGenerator.js'

const router = express.Router()
const db = getDatabase()

// Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await db.all(`
      SELECT b.*, GROUP_CONCAT(bi.product_name) as products
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `)
    res.json(bills)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get a single bill
router.get('/:id', async (req, res) => {
  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    const items = await db.all('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id])
    bill.items = items
    
    res.json(bill)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create a new bill
router.post('/', async (req, res) => {
  const { customer_name, customer_nic, customer_address, bill_date, due_date, items } = req.body
  
  try {
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    
    const result = await db.run(`
      INSERT INTO bills (
        customer_name, customer_nic, customer_address,
        bill_date, due_date, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [customer_name, customer_nic, customer_address, bill_date, due_date, total_amount])
    
    const bill_id = result.lastID
    
    // Insert bill items
    for (const item of items) {
      await db.run(`
        INSERT INTO bill_items (
          bill_id, product_name, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?)
      `, [bill_id, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price])
    }
    
    res.status(201).json({ id: bill_id, message: 'Bill created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate bill document (DOCX)
router.get('/:id/generate', async (req, res) => {
  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    const items = await db.all('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id])
    bill.items = items
    
    const docxBuffer = await generateBill(bill)
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.id}.docx`)
    res.send(docxBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate bill document (PDF)
router.get('/:id/generate-pdf', async (req, res) => {
  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    const items = await db.all('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id])
    bill.items = items
    
    const pdfBuffer = await generatePDF(bill)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.id}.pdf`)
    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate preview PDF with current branding
router.get('/preview', async (req, res) => {
  try {
    // Create a sample bill for preview
    const sampleBill = {
      id: 'PREVIEW',
      customer_name: 'John Doe',
      customer_nic: '123456789V',
      customer_address: '123 Sample Street, City, Country',
      bill_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      total_amount: 1500.00,
      items: [
        {
          product_name: 'Sample Product 1',
          quantity: 2,
          unit_price: 500.00,
          total_price: 1000.00
        },
        {
          product_name: 'Sample Product 2',
          quantity: 1,
          unit_price: 500.00,
          total_price: 500.00
        }
      ]
    }
    
    const pdfBuffer = await generatePDF(sampleBill)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename=preview.pdf')
    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router 