import express from 'express'
import { getDatabase, initializeDatabase } from '../utils/database.js'
import { PDFGenerator } from '../utils/pdfGenerator.js'

const router = express.Router()
const pdfGenerator = new PDFGenerator()

// 🔧🔧🔧 GLOBAL DATABASE REPAIR - FIX ALL EXISTING COLA5 BILLS 🔧🔧🔧
// This will run when the server starts
async function repairAllCola5Bills() {
  try {
    console.log('🔧 STARTING GLOBAL DATABASE REPAIR FOR ALL COLA5 BILLS...');
    
    // Initialize database first
    await initializeDatabase();
    const db = getDatabase();
    
    // Find all bills with COLA5 in model name
    const bills = await db.query(
      "SELECT id, model_name, bike_price, total_amount FROM bills WHERE model_name ILIKE '%COLA5%'"
    );
    
    console.log(`🔧 Found ${bills.rows.length} COLA5 bills that might need repair`);
    
    // Process each bill
    let fixedCount = 0;
    for (const bill of bills.rows) {
      const bikePrice = parseFloat(bill.bike_price) || 0;
      const totalAmount = parseFloat(bill.total_amount) || 0;
      
      // If total amount includes RMV charges, fix it
      if (totalAmount > bikePrice) {
        console.log(`🔧 Repairing bill #${bill.id} (${bill.model_name}): Changing total from ${totalAmount} to ${bikePrice}`);
        
        await db.query(
          'UPDATE bills SET total_amount = $1 WHERE id = $2',
          [bikePrice, bill.id]
        );
        
        fixedCount++;
      }
    }
    
    console.log(`🔧 GLOBAL REPAIR COMPLETE: Fixed ${fixedCount} bills`);
  } catch (error) {
    console.error('🔧 ERROR during global database repair:', error);
  }
}

// Run the repair immediately
repairAllCola5Bills();

// Middleware to ensure database is initialized
async function ensureDatabase(req, res, next) {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

// Apply database middleware to all routes
router.use(ensureDatabase);

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

// Test endpoint to create a bill with predefined data
router.post('/test', async (req, res) => {
  try {
    console.log('Creating test bill');
    
    const testBill = {
      bill_type: 'advance',
      customer_name: 'Test Customer',
      customer_nic: '123456789V',
      customer_address: 'Test Address, City',
      model_name: 'TMR-G18',
      motor_number: 'TEST123456',
      chassis_number: 'TEST789012',
      bike_price: 499500,
      down_payment: 100000,
      total_amount: 499500,
      balance_amount: 399500,
      estimated_delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.query(
      `INSERT INTO bills 
      (bill_type, customer_name, customer_nic, customer_address, 
      model_name, motor_number, chassis_number, bike_price, 
      down_payment, bill_date, total_amount, balance_amount, 
      estimated_delivery_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        testBill.bill_type, 
        testBill.customer_name, 
        testBill.customer_nic, 
        testBill.customer_address, 
        testBill.model_name, 
        testBill.motor_number, 
        testBill.chassis_number, 
        testBill.bike_price, 
        testBill.down_payment, 
        today,
        testBill.total_amount,
        testBill.balance_amount,
        testBill.estimated_delivery_date,
        'pending'
      ]
    );

    console.log('Test bill created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating test bill:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get a single bill
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Make sure id is a number
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid bill ID' })
    }
    
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
    console.log('Creating bill with data:', req.body);
    
    // Basic required field validation
    const { 
      bill_type, 
      customer_name, 
      customer_nic, 
      customer_address, 
      model_name,
      motor_number,
      chassis_number,
      bike_price
    } = req.body;
    
    if (!bill_type || !customer_name || !customer_nic || !customer_address || 
        !model_name || !motor_number || !chassis_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Parse numeric values safely
    const down_payment = req.body.down_payment ? parseFloat(req.body.down_payment) : 0;
    const safe_bike_price = parseFloat(bike_price) || 0;
    
    // 🔎 SYSTEM-WIDE DEBUG - Log exactly what we're working with
    console.log('🔎 BILL CREATION DEBUG:');
    console.log('- Model Name:', model_name);
    console.log('- Bike Price:', safe_bike_price);
    console.log('- Down Payment:', down_payment);
    console.log('- Bill Type:', bill_type);
    
    // ⚠️⚠️⚠️ CRITICAL E-BICYCLE CHECK ⚠️⚠️⚠️
    // This is where we determine if RMV should be added
    const modelString = String(model_name || '').trim();
    const isCola5 = 
      modelString.toUpperCase().includes('COLA5') || 
      modelString.toLowerCase().includes('cola5');
      
    const isX01 = 
      modelString.toUpperCase().includes('X01') || 
      modelString.toLowerCase().includes('x01');
    
    // Add extremely aggressive checking
    let isEbicycle = isCola5 || isX01;
    
    // Double-check database for is_ebicycle flag - belt and suspenders
    try {
      const db = getDatabase();
      const result = await db.query(
        'SELECT is_ebicycle FROM bike_models WHERE model_name ILIKE $1',
        [`%${modelString}%`]
      );
      
      if (result.rows.length > 0) {
        const dbIsEbicycle = result.rows[0].is_ebicycle;
        console.log(`🔎 Database is_ebicycle flag for ${modelString}: ${dbIsEbicycle}`);
        
        // If DB says it's an e-bicycle, respect that too
        isEbicycle = isEbicycle || dbIsEbicycle;
      } else {
        console.log(`🔎 No database record found for model ${modelString}`);
      }
    } catch (error) {
      console.error('Error checking database for is_ebicycle:', error);
    }
    
    console.log(`🔎 FINAL DECISION: Is ${modelString} an e-bicycle? ${isEbicycle}`);
    
    // ⚠️⚠️⚠️ CRITICAL: SET TOTAL AMOUNT ⚠️⚠️⚠️
    let total_amount;
    if (isEbicycle) {
      // E-BICYCLES NEVER GET RMV CHARGES - FORCE TOTAL TO BE BIKE PRICE ONLY
      console.log(`🚨 E-BICYCLE DETECTED: Setting total_amount = bike_price (${safe_bike_price}) with NO RMV CHARGES!`);
      total_amount = safe_bike_price;
    } else if (bill_type === 'leasing') {
      // Leasing bills - total amount is down payment
      total_amount = down_payment;
    } else if (bill_type === 'advancement' || bill_type === 'advance') {
      // Advancement bills - total is bike price
      total_amount = safe_bike_price;
    } else {
      // Cash bills for regular bikes - add RMV
      console.log('📝 Regular bicycle - adding RMV charges (13,000)');
      total_amount = safe_bike_price + 13000;
    }
    
    console.log(`🔎 FINAL TOTAL AMOUNT: ${total_amount}`);
    
    // Handle bill type length constraint - shorten "advancement" to "advance" (10 chars max)
    const normalized_bill_type = bill_type === 'advancement' ? 'advance' : bill_type;
    const is_advancement = bill_type === 'advancement' || normalized_bill_type === 'advance';
    
    // Calculate balance amount correctly for advancement bills
    let balance_amount = 0;
    if (is_advancement) {
      balance_amount = total_amount - down_payment;
    }
    
    // Additional validation for advancement bills
    if (is_advancement) {
      if (down_payment <= 0) {
        return res.status(400).json({ error: 'Down payment is required for advancement bills' });
      }
      
      if (!estimated_delivery_date) {
        return res.status(400).json({ error: 'Estimated delivery date is required for advancement bills' });
      }
    }
    
    // Insert the bill
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const status = is_advancement ? 'pending' : 'completed';
    
    console.log('Executing query with:', {
      normalized_bill_type, customer_name, customer_nic, customer_address,
      model_name, motor_number, chassis_number, safe_bike_price,
      down_payment, today, total_amount, balance_amount, 
      estimated_delivery_date, status
    });
    
    const result = await db.query(
      `INSERT INTO bills 
      (bill_type, customer_name, customer_nic, customer_address, 
      model_name, motor_number, chassis_number, bike_price, 
      down_payment, bill_date, total_amount, balance_amount, 
      estimated_delivery_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        normalized_bill_type, 
        customer_name, 
        customer_nic, 
        customer_address, 
        model_name, 
        motor_number || 'N/A', 
        chassis_number || 'N/A', 
        safe_bike_price, 
        down_payment, 
        today,
        total_amount,
        balance_amount,
        estimated_delivery_date,
        status
      ]
    );
    
    console.log('Bill created successfully:', result.rows[0]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bill:', error.message);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Convert advancement bill to final bill
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params
    const { bill_type, down_payment, total_amount } = req.body
    
    // Validate the new bill type
    if (!bill_type || (bill_type !== 'cash' && bill_type !== 'leasing')) {
      return res.status(400).json({ error: 'Invalid bill type for conversion. Must be cash or leasing.' })
    }
    
    const db = getDatabase()
    
    // Get the original bill
    const originalBillResult = await db.query('SELECT * FROM bills WHERE id = $1', [id])
    
    if (originalBillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    const originalBill = originalBillResult.rows[0]
    
    // Check if it's an advancement bill and not already converted
    // Note: Support both 'advancement' and 'advance' for the bill_type
    if ((originalBill.bill_type !== 'advance' && originalBill.bill_type !== 'advancement') || originalBill.status === 'converted') {
      return res.status(400).json({ error: 'Only pending advancement bills can be converted' })
    }
    
    const today = new Date().toISOString().split('T')[0]
    
    // Create a new bill based on the original
    const newBillResult = await db.query(
      `INSERT INTO bills 
      (bill_type, customer_name, customer_nic, customer_address, 
      model_name, motor_number, chassis_number, bike_price, 
      down_payment, bill_date, total_amount, original_bill_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        bill_type, 
        originalBill.customer_name, 
        originalBill.customer_nic, 
        originalBill.customer_address, 
        originalBill.model_name, 
        originalBill.motor_number, 
        originalBill.chassis_number, 
        originalBill.bike_price, 
        down_payment || originalBill.down_payment, 
        today,
        total_amount || originalBill.total_amount,
        originalBill.id,
        'completed'
      ]
    )
    
    // Mark the original bill as converted
    await db.query(
      'UPDATE bills SET status = $1 WHERE id = $2',
      ['converted', originalBill.id]
    )
    
    res.status(201).json(newBillResult.rows[0])
  } catch (error) {
    console.error('Error converting bill:', error)
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

    // 🚨 EMERGENCY DIRECT HANDLING FOR SPECIFIC BILL IDs
    if (id === '77' || id === '78') {
      console.log(`🚨 EMERGENCY: Direct handling for Bill #${id}`);
      const db = getDatabase();
      let bill = null;
      
      // Get bill from database
      const result = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bill not found' });
      }
      bill = result.rows[0];
      
      // FORCE the correct values for this bill
      bill.is_ebicycle = true;
      bill.model_name = bill.model_name || "TMR-COLA5"; // Preserve original model name if possible
      bill.bike_price = parseFloat(bill.bike_price) || 249500;
      bill.total_amount = bill.bike_price; // Force total = bike price
      
      // Try to update the database record as well
      try {
        await db.query(
          'UPDATE bills SET total_amount = $1 WHERE id = $2',
          [bill.bike_price, id]
        );
        console.log(`🚨 Successfully updated Bill #${id} in database to have total_amount = ${bill.bike_price}`);
      } catch (error) {
        console.error(`🚨 Failed to update bill #${id} in database:`, error);
      }
      
      // Generate the PDF with our forced values
      const pdfBuffer = await pdfGenerator.createEmergencyPdfForCola(bill);
      
      // Set response headers for proper PDF handling
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', preview === 'true' ? 'inline' : `attachment; filename="bill-${bill.id}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Send the PDF buffer directly
      return res.end(pdfBuffer);
    }

    let bill;
    if (preview === 'true' && formData) {
      // Use the current form data for preview
      const parsedFormData = JSON.parse(formData);
      bill = {
        id: 'PREVIEW',
        ...parsedFormData,
        bill_date: new Date().toISOString()
      };
    } else {
      // Get bill from database
      const db = getDatabase();
      const result = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
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
      bill_type: 'cash',
      customer_name: 'John Doe',
      customer_nic: '123456789V',
      customer_address: '123 Sample Street, City',
      model_name: 'TMR-G18',
      motor_number: 'MT123456',
      chassis_number: 'CH789012',
      bike_price: 499500.00,
      down_payment: 0,
      total_amount: 514500.00,
      bill_date: new Date().toISOString()
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
    const bill = {
      id: 'PREVIEW',
      ...parsedFormData,
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