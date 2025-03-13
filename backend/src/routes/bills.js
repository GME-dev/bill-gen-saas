import express from 'express'
import { getDatabase } from '../utils/database.js'
import { generateBill } from '../utils/billGenerator.js'
import { PDFGenerator } from '../utils/pdfGenerator.js'

const router = express.Router()
const pdfGenerator = new PDFGenerator()

// Get all bills
router.get('/', async (req, res) => {
  try {
    const db = getDatabase()
    const bills = await db.all('SELECT * FROM bills ORDER BY bill_date DESC')
    res.json(bills)
  } catch (error) {
    console.error('Error fetching bills:', error)
    res.status(500).json({ error: 'Failed to fetch bills' })
  }
})

// Get a single bill
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase()
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    const items = await db.all('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id])
    bill.items = items
    
    res.json(bill)
  } catch (error) {
    console.error('Error fetching bill:', error)
    res.status(500).json({ error: 'Failed to fetch bill' })
  }
})

// Create a new bill
router.post('/', async (req, res) => {
  try {
    const {
      bill_type,
      customer_name,
      customer_nic,
      customer_address,
      model_name,
      motor_number,
      chassis_number,
      bike_price,
      down_payment
    } = req.body

    // Calculate total amount based on bill type
    const total_amount = bill_type === 'leasing' ? 
      down_payment : // For leasing, total is same as down payment
      bike_price + 13000; // For cash, add RMV charge

    const db = getDatabase()
    const result = await db.run(
      `INSERT INTO bills (
        bill_type,
        customer_name,
        customer_nic,
        customer_address,
        model_name,
        motor_number,
        chassis_number,
        bike_price,
        down_payment,
        total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill_type,
        customer_name,
        customer_nic,
        customer_address,
        model_name,
        motor_number,
        chassis_number,
        bike_price,
        down_payment,
        total_amount
      ]
    )

    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [result.lastID])
    res.status(201).json(bill)
  } catch (error) {
    console.error('Error creating bill:', error)
    res.status(500).json({ error: 'Failed to create bill' })
  }
})

// Generate bill document (DOCX)
router.get('/:id/generate', async (req, res) => {
  try {
    const db = getDatabase()
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

// Generate PDF for a bill
router.get('/:id/pdf', async (req, res) => {
  try {
    const db = getDatabase()
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    const pdfBytes = await pdfGenerator.generateBill(bill)
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.preview ? 'inline' : 'attachment'}; filename=bill-${bill.id}.pdf`)
    
    // Send PDF
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error('Error generating PDF:', error)
    res.status(500).json({ error: 'Failed to generate PDF' })
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
    
    const pdfBuffer = await pdfGenerator.generateBill(sampleBill)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename=preview.pdf')
    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update bill
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase()
    res.json({ message: 'Update bill endpoint' });
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update a bill's status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body
    const db = getDatabase()
    await db.run(
      'UPDATE bills SET status = ? WHERE id = ?',
      [status, req.params.id]
    )
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    res.json(bill)
  } catch (error) {
    console.error('Error updating bill:', error)
    res.status(500).json({ error: 'Failed to update bill' })
  }
})

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase()
    await db.run('DELETE FROM bills WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting bill:', error)
    res.status(500).json({ error: 'Failed to delete bill' })
  }
})

export default router 