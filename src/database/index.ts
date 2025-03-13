import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger';

const db = new sqlite3.Database('./bills.db');

export const setupDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create bills table
      db.run(`
        CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_nic TEXT NOT NULL,
          customer_address TEXT NOT NULL,
          total_amount REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create bill_items table
      db.run(`
        CREATE TABLE IF NOT EXISTS bill_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bill_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          FOREIGN KEY (bill_id) REFERENCES bills (id)
        )
      `);

      // Create products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          model TEXT,
          unit_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    db.get('SELECT 1', (err) => {
      if (err) {
        logger.error('Database setup failed:', err);
        reject(err);
      } else {
        logger.info('Database setup completed successfully');
        resolve();
      }
    });
  });
};

export default db; 