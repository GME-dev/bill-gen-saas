// Import all route modules
import express from 'express';
import billsRoutes from './bills.js';
import bikeModelsRoutes from './bikeModels.js';
import healthRoutes from './health.js';

const router = express.Router();

// Register routes
router.use('/bills', billsRoutes);
router.use('/bike-models', bikeModelsRoutes);
router.use('/health', healthRoutes);

// Add direct support for PDF routes that might be handled incorrectly
router.get('/bills/:id/pdf', (req, res) => {
  // Forward to the bills router
  billsRoutes.handle(req, res);
});

router.get('/bills/preview/pdf', (req, res) => {
  // Forward to the bills router
  billsRoutes.handle(req, res);
});

export default router; 