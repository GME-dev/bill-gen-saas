import express from 'express';
import { basicHealth, detailedHealth } from '../controllers/healthController.js';

const router = express.Router();

// Basic health check
router.get('/', basicHealth);

// Detailed health check (protected route in production)
router.get('/details', detailedHealth);

export default router; 