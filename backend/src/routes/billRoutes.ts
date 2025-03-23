import express, { Request, Response } from 'express';
import Bill from '../models/Bill.js';
import { generatePDF } from '../services/pdfService.js';

const router = express.Router();

// Get all bills
router.get('/', async (req: Request, res: Response) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get bill by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create new bill
router.post('/', async (req: Request, res: Response) => {
  try {
    // Calculate or validate totals
    const { items, tax } = req.body;
    
    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    
    // Calculate total
    const total = subtotal + Number(tax || 0);
    
    // Create bill with calculated values
    const billData = {
      ...req.body,
      subtotal,
      total
    };
    
    const newBill = new Bill(billData);
    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Update bill
router.put('/:id', async (req: Request, res: Response) => {
  try {
    // Calculate or validate totals if items are updated
    let updateData = req.body;
    
    if (req.body.items) {
      const subtotal = req.body.items.reduce(
        (sum: number, item: any) => sum + Number(item.amount),
        0
      );
      const total = subtotal + Number(req.body.tax || 0);
      
      updateData = {
        ...updateData,
        subtotal,
        total
      };
    }
    
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.status(200).json(updatedBill);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Delete bill
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.status(200).json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate PDF for a bill
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const pdfBuffer = await generatePDF(bill);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=TMR_Bill_${bill.billNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Mark bill as paid
router.patch('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }
    
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        isPaid: true, 
        paymentMethod 
      },
      { new: true }
    );
    
    if (!updatedBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.status(200).json(updatedBill);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router; 