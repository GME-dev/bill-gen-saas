import { Router } from 'express';
import { z } from 'zod';
import db from '../database';

const router = Router();

// Validation schemas
const createProductSchema = z.object({
  name: z.string(),
  model: z.string().optional(),
  unit_price: z.number().positive(),
});

// Create a new product
router.post('/', async (req, res) => {
  try {
    const productData = createProductSchema.parse(req.body);
    
    db.run(
      `INSERT INTO products (name, model, unit_price)
       VALUES (?, ?, ?)`,
      [productData.name, productData.model, productData.unit_price],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Product with this name already exists' });
          }
          return res.status(500).json({ error: 'Failed to create product' });
        }
        res.status(201).json({
          message: 'Product created successfully',
          product_id: this.lastID
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

// Get all products
router.get('/', (req, res) => {
  db.all('SELECT * FROM products ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    res.json(rows);
  });
});

// Get product by ID
router.get('/:id', (req, res) => {
  const productId = req.params.id;
  
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = createProductSchema.parse(req.body);
    
    db.run(
      `UPDATE products 
       SET name = ?, model = ?, unit_price = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [productData.name, productData.model, productData.unit_price, productId],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Product with this name already exists' });
          }
          return res.status(500).json({ error: 'Failed to update product' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully' });
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

// Delete product
router.delete('/:id', (req, res) => {
  const productId = req.params.id;
  
  db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  });
});

export const productRoutes = router; 