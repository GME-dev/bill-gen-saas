import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for font uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../assets/fonts'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// List all fonts
router.get('/', (req, res) => {
    res.json({ message: 'Font listing endpoint' });
});

// Upload new font
router.post('/', upload.single('font'), (req, res) => {
    res.json({ message: 'Font upload endpoint' });
});

// Get font stats
router.get('/stats', (req, res) => {
    res.json({
        totalFonts: 0,
        cacheSize: 0
    });
});

export default router; 