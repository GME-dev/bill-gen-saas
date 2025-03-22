import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase, Bill } from '../database/index.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET all bills
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await connectToDatabase();
    const bills = await db.collection('bills').find().sort({ date: -1 }).toArray();
    
    // Transform _id to id for frontend compatibility
    const formattedBills = bills.map(bill => {
      const { _id, ...rest } = bill;
      return { id: _id.toString(), ...rest };
    });
    
    res.status(200).json(formattedBills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// GET a single bill by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }
    
    const db = await connectToDatabase();
    const bill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const { _id, ...rest } = bill;
    res.status(200).json({ id: _id.toString(), ...rest });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// POST a new bill
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerName, bikeModel, amount, status = 'pending' } = req.body;
    
    // Validate required fields
    if (!customerName || !bikeModel || !amount) {
      return res.status(400).json({ error: 'CustomerName, bikeModel, and amount are required fields' });
    }
    
    const newBill: Bill = {
      customerName,
      bikeModel,
      date: new Date().toISOString(),
      amount: Number(amount),
      status
    };
    
    const db = await connectToDatabase();
    
    // Verify that the bike model exists
    const bikeModelExists = await db.collection('bikeModels').findOne({ name: bikeModel });
    if (!bikeModelExists) {
      return res.status(400).json({ error: 'Specified bike model does not exist' });
    }
    
    const result = await db.collection('bills').insertOne(newBill);
    
    res.status(201).json({
      id: result.insertedId.toString(),
      ...newBill
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// PUT (update) a bill
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, bikeModel, amount, status } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }
    
    // Validate required fields
    if (!customerName || !bikeModel || !amount || !status) {
      return res.status(400).json({ error: 'CustomerName, bikeModel, amount, and status are required fields' });
    }
    
    const db = await connectToDatabase();
    
    // Check if bill exists
    const existingBill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    // Verify that the bike model exists
    const bikeModelExists = await db.collection('bikeModels').findOne({ name: bikeModel });
    if (!bikeModelExists) {
      return res.status(400).json({ error: 'Specified bike model does not exist' });
    }
    
    const updatedBill: Partial<Bill> = {
      customerName,
      bikeModel,
      amount: Number(amount),
      status
    };
    
    await db.collection('bills').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedBill }
    );
    
    res.status(200).json({
      id,
      ...existingBill,
      ...updatedBill
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// DELETE a bill
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }
    
    const db = await connectToDatabase();
    
    // Check if bill exists
    const existingBill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    await db.collection('bills').deleteOne({ _id: new ObjectId(id) });
    
    res.status(200).json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Generate PDF for a bill
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }
    
    const db = await connectToDatabase();
    const bill = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Try to load a custom font, fall back to standard font if not available
    let font;
    try {
      const fontPath = path.join(__dirname, '../../assets/fonts/Roboto-Regular.ttf');
      const fontBytes = await fs.readFile(fontPath);
      font = await pdfDoc.embedFont(fontBytes);
    } catch (error) {
      console.error('Error loading custom font, using standard font:', error);
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
    
    // Add a page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Draw bill content
    page.drawText('TMR MOTORCYCLE BILL', {
      x: 50,
      y: height - 50,
      size: 20,
      font
    });
    
    page.drawText(`Invoice #: ${id}`, {
      x: 50,
      y: height - 100,
      size: 12,
      font
    });
    
    page.drawText(`Date: ${new Date(bill.date).toLocaleDateString()}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font
    });
    
    page.drawText(`Customer: ${bill.customerName}`, {
      x: 50,
      y: height - 160,
      size: 12,
      font
    });
    
    page.drawText(`Bike Model: ${bill.bikeModel}`, {
      x: 50,
      y: height - 180,
      size: 12,
      font
    });
    
    page.drawText(`Amount: $${bill.amount.toFixed(2)}`, {
      x: 50,
      y: height - 200,
      size: 12,
      font
    });
    
    page.drawText(`Status: ${bill.status}`, {
      x: 50,
      y: height - 220,
      size: 12,
      font
    });
    
    // Draw a horizontal line
    page.drawLine({
      start: { x: 50, y: height - 240 },
      end: { x: width - 50, y: height - 240 },
      thickness: 1
    });
    
    // Footer
    page.drawText('Thank you for your business!', {
      x: 50,
      y: 50,
      size: 12,
      font
    });
    
    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    
    // Set response headers and send the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bill-${id}.pdf"`);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router; 