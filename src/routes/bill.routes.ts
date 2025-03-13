import { Router } from 'express';
import { z } from 'zod';
import db from '../database';

const router = Router();

// Validation schemas
const billItemSchema = z.object({
  product_name: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});

const createBillSchema = z.object({
  customer_name: z.string(),
  customer_nic: z.string(),
  customer_address: z.string(),
  items: z.array(billItemSchema),
});

// Create a new bill
router.post('/', async (req, res) => {
  try {
    const billData = createBillSchema.parse(req.body);
    
    // Calculate total amount
    const totalAmount = billData.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // Insert bill
    db.run(
      `INSERT INTO bills (customer_name, customer_nic, customer_address, total_amount)
       VALUES (?, ?, ?, ?)`,
      [billData.customer_name, billData.customer_nic, billData.customer_address, totalAmount],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create bill' });
        }

        const billId = this.lastID;

        // Insert bill items
        const stmt = db.prepare(
          `INSERT INTO bill_items (bill_id, product_name, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?)`
        );

        billData.items.forEach(item => {
          stmt.run([
            billId,
            item.product_name,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price
          ]);
        });

        stmt.finalize();

        res.status(201).json({
          message: 'Bill created successfully',
          bill_id: billId
        });
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all bills
router.get('/', (req, res) => {
  db.all('SELECT * FROM bills ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch bills' });
    }
    res.json(rows);
  });
});

// Get bill by ID
router.get('/:id', (req, res) => {
  const billId = req.params.id;
  
  db.get('SELECT * FROM bills WHERE id = ?', [billId], (err, bill) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch bill' });
    }
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Get bill items
    db.all('SELECT * FROM bill_items WHERE bill_id = ?', [billId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch bill items' });
      }
      res.json({ ...bill, items });
    });
  });
});

export const billRoutes = router; 