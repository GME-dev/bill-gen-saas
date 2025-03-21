import express from 'express'
import { getDatabase } from '../utils/database.js'
import { generateBill } from '../utils/billGenerator.js'
import { PDFGenerator } from '../utils/pdfGenerator.js'
import { ObjectId } from 'mongodb'

const router = express.Router()
const pdfGenerator = new PDFGenerator()

// Get all bills
router.get('/', async (req, res) => {
  try {
    const db = getDatabase()
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    const collection = db.collection('bills')
    const bills = await collection.find({}).sort({ bill_date: -1 }).toArray()
    res.json(bills)
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
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format: ${id}`)
      return res.status(400).json({ error: 'Invalid bill ID format' })
    }
    
    const collection = db.collection('bills')
    const bill = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }

    res.json(bill)
  } catch (error) {
    console.error('Error fetching bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Function to generate a properly formatted bill number
const generateBillNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BILL-${year}${month}${day}-${random}`;
};

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
      down_payment = 0,
      bill_date,
      is_advance_payment = false,
      advance_amount = 0,
      estimated_delivery_date = null,
      is_cpz = false,
      rmv_charge: requestedRmvCharge,
      total_amount: requestedTotalAmount,
      balance_amount: requestedBalanceAmount
    } = req.body

    // Get the database
    const db = getDatabase()
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    // Get the bike model to determine if it's an e-bicycle
    const bikeModelsCollection = db.collection('bike_models')
    const bikeModel = await bikeModelsCollection.findOne({ model_name: model_name })
    const isEbicycle = bikeModel?.is_ebicycle || req.body.is_ebicycle || false
    
    // Calculate correct values based on business rules
    let rmv_charge = 0
    let total_amount = 0
    let balance_amount = 0
    
    // Ensure bike_price is not zero
    const validBikePrice = parseFloat(bike_price) || (bikeModel ? parseFloat(bikeModel.price) : 0)
    
    if (bill_type.toLowerCase() === 'cash') {
      // For cash sales
      if (!isEbicycle) {
        rmv_charge = 13000 // Regular bikes have RMV charge
        total_amount = validBikePrice + rmv_charge
      } else {
        total_amount = validBikePrice // E-bicycles just have the bike price
      }
    } else {
      // For leasing
      rmv_charge = 13500 // CPZ value
      total_amount = parseFloat(down_payment)
    }
    
    // Calculate balance for advance payments
    if (is_advance_payment) {
      balance_amount = total_amount - parseFloat(advance_amount)
    }
    
    // Create the bill object with a proper bill number
    const collection = db.collection('bills')
    const newBill = {
      bill_number: generateBillNumber(),
      bill_type: bill_type.toUpperCase(),
      customer_name,
      customer_nic, 
      customer_address,
      model_name,
      motor_number, 
      chassis_number,
      bike_price: validBikePrice,
      down_payment: parseFloat(down_payment) || 0,
      total_amount,
      rmv_charge,
      is_ebicycle: isEbicycle,
      is_cpz: bill_type.toLowerCase() === 'leasing',
      payment_type: bill_type.toLowerCase(),
      is_advance_payment,
      advance_amount: parseFloat(advance_amount) || 0,
      bill_date: bill_date ? new Date(bill_date) : new Date(),
      estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date) : null,
      status: 'pending',
      balance_amount,
      created_at: new Date()
    }
    
    const result = await collection.insertOne(newBill)
    newBill._id = result.insertedId
    
    res.status(201).json(newBill)
  } catch (error) {
    console.error('Error creating bill:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Generate bill document (DOCX)
router.get('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params
    const db = getDatabase()
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format: ${id}`)
      return res.status(400).json({ error: 'Invalid bill ID format' })
    }
    
    const collection = db.collection('bills')
    const bill = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' })
    }
    
    const itemsCollection = db.collection('bill_items')
    const items = await itemsCollection.find({ bill_id: id }).toArray()
    bill.items = items
    
    const docxBuffer = await generateBill(bill)
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill._id}.docx`)
    res.send(docxBuffer)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate PDF for a bill
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { preview } = req.query;

    let bill;
    
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format for PDF generation: ${id}`)
      return res.status(400).json({ error: 'Invalid bill ID format' })
    }
    
    const billsCollection = db.collection('bills')
    const bikeModelsCollection = db.collection('bike_models')
    
    bill = await billsCollection.findOne({ _id: new ObjectId(id) })
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bikeModel = await bikeModelsCollection.findOne({ model_name: bill.model_name })
      || { is_ebicycle: false, can_be_leased: true };
    
    // Make sure the bill has the is_ebicycle flag set
    bill.is_ebicycle = bill.is_ebicycle || bikeModel.is_ebicycle || false;
    bill.can_be_leased = bikeModel.can_be_leased;

    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateBill(bill);
    
    // Set response headers for proper PDF handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', preview === 'true' ? 'inline' : `attachment; filename="bill-${bill._id || 'preview'}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer directly
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

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

// Preview PDF from form data
router.get('/preview/pdf', async (req, res) => {
  try {
    const { formData } = req.query;
    
    if (!formData) {
      return res.status(400).json({ error: 'Missing form data for preview' });
    }
    
    // Parse the form data
    const parsedFormData = JSON.parse(formData);
    
    // Get bike model info for proper RMV charge calculation
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    const bikeModelsCollection = db.collection('bike_models')
    const bikeModel = await bikeModelsCollection.findOne({ model_name: parsedFormData.model_name })
      || { is_ebicycle: false, can_be_leased: true };
    
    // Create a bill object from the form data
    const bill = {
      ...parsedFormData,
      is_ebicycle: parsedFormData.is_ebicycle || bikeModel.is_ebicycle || false,
      can_be_leased: bikeModel.can_be_leased,
      bill_date: parsedFormData.bill_date || new Date().toISOString()
    };
    
    // Generate the PDF using the pdfGenerator
    const pdfBuffer = await pdfGenerator.generateBill(bill);
    
    // Set response headers for proper PDF handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating preview PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview PDF', 
      details: error.message 
    });
  }
});

// Legacy support for status updates from client-side code that may not use /status endpoint
// Status-only updates via the main update route
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if this is just a status update
    if (updateData && Object.keys(updateData).length === 1 && updateData.status) {
      // Redirect to the status update endpoint
      console.log(`Status-only update detected for bill ${id}, redirecting to status endpoint`);
      return router.handle({ 
        method: 'PUT', 
        url: `/${id}/status`, 
        body: { status: updateData.status },
        params: { id }
      }, res, () => {});
    }
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format for update: ${id}`);
      return res.status(400).json({ error: 'Invalid bill ID format' });
    }
    
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' });
    }
    
    // Format dates properly
    if (updateData.bill_date) {
      updateData.bill_date = new Date(updateData.bill_date);
    }
    
    if (updateData.estimated_delivery_date) {
      updateData.estimated_delivery_date = new Date(updateData.estimated_delivery_date);
    }
    
    // Add updated_at timestamp
    updateData.updated_at = new Date();
    
    const collection = db.collection('bills');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(result.value);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Update a bill's status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format: ${id}`)
      return res.status(400).json({ error: 'Invalid bill ID format' })
    }
    
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' })
    }
    
    const collection = db.collection('bills');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: status } },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(result.value);
  } catch (error) {
    console.error('Error updating bill status:', error);
    res.status(500).json({ error: 'Failed to update bill status' });
  }
});

// Ensure both PUT and PATCH routes exist for status updates
// Add PATCH version of the status update endpoint
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format for status update: ${id}`);
      return res.status(400).json({ error: 'Invalid bill ID format' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database connection not available' });
    }
    
    console.log(`Updating bill ${id} status to ${status}`);
    
    const collection = db.collection('bills');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { 
          status: status,
          updated_at: new Date()
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    console.log(`Status updated successfully: ${JSON.stringify(result.value)}`);
    res.json(result.value);
  } catch (error) {
    console.error('Error updating bill status:', error);
    res.status(500).json({ error: 'Failed to update bill status', details: error.message });
  }
});

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format for deletion: ${id}`);
      return res.status(400).json({ error: 'Invalid bill ID format' });
    }
    
    const db = getDatabase();
    if (!db) {
      console.error('Database connection not available for bill deletion');
      return res.status(503).json({ error: 'Database connection not available' });
    }
    
    console.log(`Attempting to delete bill with ID: ${id}`);
    
    try {
      const collection = db.collection('bills');
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        console.log(`Bill not found for deletion: ${id}`);
        return res.status(404).json({ error: 'Bill not found' });
      }
      
      console.log(`Successfully deleted bill with ID: ${id}`);
      return res.status(204).send();
    } catch (dbError) {
      console.error(`Database error when deleting bill ${id}:`, dbError);
      return res.status(500).json({ error: 'Database operation failed', details: dbError.message });
    }
  } catch (error) {
    console.error('Error deleting bill:', error);
    return res.status(500).json({ error: 'Failed to delete bill', details: error.message });
  }
});

export default router 