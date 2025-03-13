import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePDF, signPDF, verifySignature } from '../controllers/pdfController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Generate PDF
router.post('/generate', async (req, res) => {
    try {
        const { content } = req.body;
        const pdfBuffer = await generatePDF(content);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=generated.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Sign PDF
router.post('/sign', upload.single('pdf'), async (req, res) => {
    try {
        const { certificateId, password } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file provided' });
        }
        const signedPdfBuffer = await signPDF(req.file.path, certificateId, password);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=signed.pdf');
        res.send(signedPdfBuffer);
    } catch (error) {
        console.error('PDF Signing Error:', error);
        res.status(500).json({ error: 'Failed to sign PDF' });
    }
});

// Verify signature
router.post('/verify', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file provided' });
        }
        const verificationResult = await verifySignature(req.file.path);
        res.json(verificationResult);
    } catch (error) {
        console.error('Signature Verification Error:', error);
        res.status(500).json({ error: 'Failed to verify signature' });
    }
});

export default router; 