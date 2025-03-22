import express from 'express'
import { getDatabase, initializeDatabase } from '../utils/database.js'
import { PDFGenerator } from '../utils/pdfGenerator.js'
import { ObjectId } from 'mongodb'

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
    
    // Find all bills with COLA5 in model name using MongoDB query
    const bills = await db.collection('bills').find({
      model_name: { $regex: 'COLA5', $options: 'i' }
    }).toArray();
    
    console.log(`🔧 Found ${bills.length} COLA5 bills that might need repair`);
    
    // Process each bill
    let fixedCount = 0;
    for (const bill of bills) {
      const bikePrice = parseFloat(bill.bike_price) || 0;
      const totalAmount = parseFloat(bill.total_amount) || 0;
      
      // If total amount includes RMV charges, fix it
      if (totalAmount > bikePrice) {
        console.log(`🔧 Repairing bill #${bill._id} (${bill.model_name}): Changing total from ${totalAmount} to ${bikePrice}`);
        
        await db.collection('bills').updateOne(
          { _id: bill._id },
          { $set: { total_amount: bikePrice } }
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
    const db = getDatabase();
    
    // Check if we actually have a valid database connection
    if (!db) {
      console.error('Database connection not available');
      return res.status(503).json({ 
        error: 'Database unavailable',
        details: 'Unable to establish database connection'
      });
    }
    
    // Check database connectivity with a ping
    try {
      const pingResult = await db.command({ ping: 1 });
      if (!pingResult || pingResult.ok !== 1) {
        throw new Error('Database ping failed');
      }
    } catch (pingError) {
      console.error('Database ping failed:', pingError);
      return res.status(503).json({ 
        error: 'Database unavailable',
        details: 'Failed to verify database connectivity'
      });
    }
    
    // Database is connected and ready
    next();
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(503).json({ 
      error: 'Database unavailable',
      details: error.message
    });
  }
}

// Validate MongoDB ObjectId middleware
function validateObjectId(idParam = 'id') {
  return (req, res, next) => {
    const id = req.params[idParam];
    
    if (!id) {
      return next(); // No ID to validate, continue
    }
    
    // Special case for preview and test routes
    if (id === 'preview' || id === 'test') {
      return next();
    }
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: 'Invalid ID format',
        details: 'The provided ID is not a valid MongoDB ObjectId'
      });
    }
    
    // ID is valid, continue
    next();
  };
}

// Apply database middleware to all routes
router.use(ensureDatabase);

// Get all bills
router.get('/', async (req, res) => {
  try {
    const db = getDatabase()
    const bills = await db.collection('bills').find({}).sort({ bill_date: -1 }).toArray()
    res.json(bills)
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
      estimated_delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      bill_date: new Date(),
      status: 'pending'
    };
    
    const db = getDatabase();
    
    const result = await db.collection('bills').insertOne(testBill);

    console.log('Test bill created successfully:', { ...testBill, _id: result.insertedId });
    res.status(201).json({ ...testBill, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating test bill:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get a single bill
router.get('/:id', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params
    
    const db = getDatabase()
    const bill = await db.collection('bills').findOne({ _id: new ObjectId(id) })
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    res.json(bill)
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
      bike_price,
      estimated_delivery_date
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
      const bikeModel = await db.collection('bike_models').findOne({
        model_name: { $regex: modelString, $options: 'i' }
      });
      
      if (bikeModel) {
        const dbIsEbicycle = bikeModel.is_ebicycle;
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
    const today = new Date();
    const status = is_advancement ? 'pending' : 'completed';
    
    console.log('Executing query with:', {
      normalized_bill_type, customer_name, customer_nic, customer_address,
      model_name, motor_number, chassis_number, safe_bike_price,
      down_payment, today, total_amount, balance_amount, 
      estimated_delivery_date, status
    });
    
    const newBill = {
      bill_type: normalized_bill_type,
      customer_name,
      customer_nic,
      customer_address,
      model_name,
      motor_number: motor_number || 'N/A',
      chassis_number: chassis_number || 'N/A',
      bike_price: safe_bike_price,
      down_payment,
      bill_date: today,
      total_amount,
      balance_amount,
      estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date) : null,
      status
    };
    
    const result = await db.collection('bills').insertOne(newBill);
    
    const createdBill = {
      ...newBill,
      _id: result.insertedId
    };
    
    console.log('Bill created successfully:', createdBill);
    return res.status(201).json(createdBill);
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
router.post('/:id/convert', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params
    const { bill_type, down_payment, total_amount } = req.body
    
    // Validate the new bill type
    if (!bill_type || (bill_type !== 'cash' && bill_type !== 'leasing')) {
      return res.status(400).json({ error: 'Invalid bill type for conversion. Must be cash or leasing.' })
    }
    
    const db = getDatabase()
    
    // Get the original bill
    const originalBill = await db.collection('bills').findOne({ _id: new ObjectId(id) })
    
    if (!originalBill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    // Check if it's an advancement bill and not already converted
    // Note: Support both 'advancement' and 'advance' for the bill_type
    if ((originalBill.bill_type !== 'advance' && originalBill.bill_type !== 'advancement') || originalBill.status === 'converted') {
      return res.status(400).json({ error: 'Only pending advancement bills can be converted' })
    }
    
    const today = new Date();
    
    // Create a new bill based on the original
    const newBill = {
      bill_type,
      customer_name: originalBill.customer_name,
      customer_nic: originalBill.customer_nic,
      customer_address: originalBill.customer_address,
      model_name: originalBill.model_name,
      motor_number: originalBill.motor_number,
      chassis_number: originalBill.chassis_number,
      bike_price: originalBill.bike_price,
      down_payment: down_payment || originalBill.down_payment,
      bill_date: today,
      total_amount: total_amount || originalBill.total_amount,
      original_bill_id: originalBill._id.toString(),
      status: 'completed'
    };
    
    const result = await db.collection('bills').insertOne(newBill);
    
    // Update the original bill status to converted
    await db.collection('bills').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'converted' } }
    );
    
    const createdBill = {
      ...newBill,
      _id: result.insertedId
    };
    
    res.status(201).json(createdBill);
  } catch (error) {
    console.error('Error converting bill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Generate bill document (DOCX)
router.get('/:id/generate', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDatabase();
    const bill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const items = await db.collection('bill_items').find({ bill_id: id }).toArray();
    bill.items = items;
    
    // Use the PDFGenerator to generate the document
    const docxBuffer = await pdfGenerator.generateBill(bill, 'docx');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill._id}.docx`);
    res.send(docxBuffer);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF for a bill
router.get('/:id/pdf', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    const { preview, formData } = req.query;

    // 🚨 EMERGENCY DIRECT HANDLING FOR SPECIFIC BILL IDs
    // Note: Special handling for legacy IDs 77 and 78
    if (id === '77' || id === '78' || id === 77 || id === 78) {
      console.log(`🚨 EMERGENCY: Direct handling for Bill #${id}`);
      const db = getDatabase();
      
      // Get bill from database - try legacy ID first
      let emergencyBill;
      
      try {
        // First try with the original numeric ID for backward compatibility
        emergencyBill = await db.collection('bills').findOne({ legacy_id: parseInt(id) });
        
        // If not found with legacy_id, try with ObjectId if it's valid
        if (!emergencyBill && ObjectId.isValid(id)) {
          emergencyBill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
        }
        
        if (!emergencyBill) {
          return res.status(404).json({ error: 'Emergency bill not found' });
        }
      } catch (findError) {
        console.error(`Error finding emergency bill #${id}:`, findError);
        return res.status(500).json({ error: 'Error retrieving emergency bill' });
      }
      
      // FORCE the correct values for this bill
      emergencyBill.is_ebicycle = true;
      emergencyBill.model_name = emergencyBill.model_name || "TMR-COLA5"; // Preserve original model name if possible
      emergencyBill.bike_price = parseFloat(emergencyBill.bike_price) || 249500;
      emergencyBill.total_amount = emergencyBill.bike_price; // Force total = bike price
      
      // Try to update the database record as well
      try {
        await db.collection('bills').updateOne(
          { _id: emergencyBill._id },
          { $set: { 
            total_amount: emergencyBill.bike_price,
            is_ebicycle: true,
            updated_at: new Date()
          }}
        );
        console.log(`🚨 Successfully updated Bill #${id} in database to have total_amount = ${emergencyBill.bike_price}`);
      } catch (error) {
        console.error(`🚨 Failed to update bill #${id} in database:`, error);
      }
      
      // Generate the PDF with our forced values
      try {
        const pdfBuffer = await pdfGenerator.createEmergencyPdfForCola(emergencyBill);
        
        // Set response headers for proper PDF handling
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition', preview === 'true' ? 'inline' : `attachment; filename="bill-${emergencyBill._id}.pdf"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Send the PDF buffer directly
        return res.end(pdfBuffer);
      } catch (pdfError) {
        console.error(`Error generating emergency PDF for bill #${id}:`, pdfError);
        return res.status(500).json({ error: 'Failed to generate emergency PDF' });
      }
    }

    let bill;
    if (preview === 'true' && formData) {
      // Use the current form data for preview
      const parsedFormData = JSON.parse(formData);
      bill = {
        _id: 'PREVIEW',
        ...parsedFormData,
        bill_date: new Date().toISOString()
      };
    } else {
      // Get the bill from the database
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }
      
      const db = getDatabase();
      bill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
      
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }
    }

    const pdfBuffer = await pdfGenerator.generateBill(bill);
    
    // Set response headers for proper PDF handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', preview === 'true' ? 'inline' : `attachment; filename="bill-${bill._id}.pdf"`);
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
      _id: 'PREVIEW',
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
      bill_date: new Date()
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
      _id: 'PREVIEW',
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
router.put('/:id', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDatabase();
    const result = await db.collection('bills').updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const updatedBill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    res.json(updatedBill);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a bill's status
router.patch('/:id', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const db = getDatabase();
    const result = await db.collection('bills').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updated_at: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const updatedBill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    res.json(updatedBill);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Delete bill
router.delete('/:id', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDatabase();
    const result = await db.collection('bills').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

export default router 