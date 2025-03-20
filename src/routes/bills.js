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
    const result = await db.query('SELECT * FROM bills ORDER BY bill_date DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching bills:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get a single bill
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = getDatabase()
    const result = await db.query('SELECT * FROM bills WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching bill:', error)
    res.status(500).json({ error: 'Internal server error' })
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
      down_payment = 0
    } = req.body

    const total_amount = bill_type === 'leasing' ? down_payment : bike_price + 15000
    const rmv_charge = bill_type === 'CASH' ? 13000 : 0

    const db = getDatabase()
    const result = await db.query(
      `INSERT INTO bills (
        bill_type, customer_name, customer_nic, customer_address,
        model_name, motor_number, chassis_number, bike_price,
        down_payment, total_amount, rmv_charge
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [bill_type, customer_name, customer_nic, customer_address,
       model_name, motor_number, chassis_number, bike_price,
       down_payment, total_amount, rmv_charge]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating bill:', error)
    res.status(500).json({ error: 'Internal server error' })
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
    const { id } = req.params;
    const { preview, formData } = req.query;

    let bill;
    if (preview === 'true' && formData) {
      // Use the current form data for preview
      const parsedFormData = JSON.parse(formData);
      // Ensure bill_type is uppercase and matches our enum
      const billType = parsedFormData.bill_type?.toUpperCase() || 'CASH';
      
      // Get bike model info for proper RMV charge calculation
      const db = getDatabase();
      const modelResult = await db.query(
        'SELECT is_ebicycle, can_be_leased FROM bike_models WHERE name = $1',
        [parsedFormData.model_name]
      );
      const bikeModel = modelResult.rows[0] || { is_ebicycle: false, can_be_leased: true };

      bill = {
        id: 'PREVIEW',
        ...parsedFormData,
        bill_type: billType,
        is_ebicycle: bikeModel.is_ebicycle,
        can_be_leased: bikeModel.can_be_leased,
        bill_date: new Date().toISOString()
      };
    } else {
      // Get bill from database
      const db = getDatabase();
      const result = await db.query(`
        SELECT b.*, bm.is_ebicycle, bm.can_be_leased 
        FROM bills b 
        JOIN bike_models bm ON b.model_name = bm.name 
        WHERE b.id = $1
      `, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bill not found' });
      }
      bill = result.rows[0];
    }

    const pdfBuffer = await pdfGenerator.generateBill(bill);
    
    // Set response headers for proper PDF handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', preview === 'true' ? 'inline' : `attachment; filename="bill-${bill.id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer directly
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
})

// Generate preview PDF with current branding
router.get('/preview', async (req, res) => {
  try {
    // Create a sample bill for preview
    const sampleBill = {
      id: 'PREVIEW',
      bill_type: 'CASH',
      customer_name: 'John Doe',
      customer_nic: '123456789V',
      customer_address: '123 Sample Street, City',
      model_name: 'TMR-G18',
      motor_number: 'MT123456',
      chassis_number: 'CH789012',
      bike_price: 499500.00,
      rmv_charge: 13000,
      down_payment: 0,
      total_amount: 514500.00,
      bill_date: new Date().toISOString(),
      is_ebicycle: false,
      can_be_leased: true
    }
    
    const pdfBytes = await pdfGenerator.generateBill(sampleBill)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename=preview.pdf')
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error('Error generating preview PDF:', error)
    res.status(500).json({ error: 'Failed to generate preview PDF' })
  }
})

// Preview PDF with form data
router.get('/preview/pdf', async (req, res) => {
  try {
    const { formData } = req.query;
    if (!formData) {
      return res.status(400).json({ error: 'Form data is required' });
    }

    const parsedFormData = JSON.parse(formData);
    // Ensure bill_type is uppercase and matches our enum
    const billType = parsedFormData.bill_type?.toUpperCase() || 'CASH';
    
    // Get bike model info for proper RMV charge calculation
    const db = getDatabase();
    const modelResult = await db.query(
      'SELECT is_ebicycle, can_be_leased FROM bike_models WHERE name = $1',
      [parsedFormData.model_name]
    );
    const bikeModel = modelResult.rows[0] || { is_ebicycle: false, can_be_leased: true };

    const bill = {
      id: 'PREVIEW',
      ...parsedFormData,
      bill_type: billType,
      is_ebicycle: bikeModel.is_ebicycle,
      can_be_leased: bikeModel.can_be_leased,
      bill_date: new Date().toISOString()
    };

    const pdfBuffer = await pdfGenerator.generateBill(bill);
    
    // Set response headers for proper PDF handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer directly
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error generating preview PDF:', error);
    res.status(500).json({ error: 'Failed to generate preview PDF' });
  }
});

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
    const { status } = req.body;
    const db = getDatabase();
    const result = await db.query(
      'UPDATE bills SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
})

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    await db.query('DELETE FROM bills WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
})

export default router 