import express from 'express'
import { FontManager } from '../utils/fontManager.js'

const router = express.Router()
const fontManager = new FontManager()

// Try to import multer, but create a fallback if it fails
let multer, upload;
try {
  multer = await import('multer');
  // Configure multer for file uploads
  const storage = multer.default.memoryStorage();
  upload = multer.default({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });
} catch (err) {
  console.error('Failed to load multer package:', err);
  // Create a simple fallback middleware
  const fallbackMiddleware = (req, res, next) => {
    console.error('File uploads are disabled: multer package is missing');
    return res.status(503).json({ 
      error: 'File upload service unavailable', 
      message: 'The file upload feature is temporarily disabled'
    });
  };
  upload = {
    single: () => fallbackMiddleware
  };
}

// Get current branding configuration
router.get('/', async (req, res) => {
  try {
    const config = await fontManager.loadBrandingConfig()
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update branding colors
router.put('/colors', async (req, res) => {
  try {
    const { primary, secondary, text, background } = req.body
    const config = await fontManager.loadBrandingConfig()
    
    config.colors = {
      primary,
      secondary,
      text,
      background
    }
    
    await fontManager.saveBrandingConfig(config)
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Upload primary font
router.post('/fonts/primary', upload.single('font'), async (req, res) => {
  try {
    const { style = 'regular' } = req.query
    const fileName = await fontManager.uploadFont(req.file, {
      type: 'primary',
      style
    })
    res.json({ fileName })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Upload secondary font
router.post('/fonts/secondary', upload.single('font'), async (req, res) => {
  try {
    const { style = 'regular' } = req.query
    const fileName = await fontManager.uploadFont(req.file, {
      type: 'secondary',
      style
    })
    res.json({ fileName })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Upload logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    const fileName = await fontManager.uploadLogo(req.file)
    res.json({ fileName })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get available fonts
router.get('/fonts', async (req, res) => {
  try {
    const fonts = await fontManager.getFonts()
    res.json(fonts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get logo
router.get('/logo', async (req, res) => {
  try {
    const logoPath = await fontManager.getLogo()
    if (logoPath) {
      res.sendFile(logoPath)
    } else {
      res.status(404).json({ error: 'Logo not found' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router 