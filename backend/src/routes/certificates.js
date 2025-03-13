const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const signatureManager = require('../utils/signatureManager')

// Configure multer for certificate upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../assets/certificates'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.p12', '.pfx']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only .p12 and .pfx files are allowed.'))
    }
  }
})

// Get all certificates
router.get('/', async (req, res) => {
  try {
    const certificates = await signatureManager.listCertificates()
    res.json({ certificates })
  } catch (error) {
    console.error('Error listing certificates:', error)
    res.status(500).json({ message: 'Failed to list certificates' })
  }
})

// Upload a certificate
router.post('/', upload.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No certificate file provided' })
    }

    const { password } = req.body
    if (!password) {
      return res.status(400).json({ message: 'Certificate password is required' })
    }

    const certificate = await signatureManager.uploadCertificate(
      req.file.path,
      password
    )

    res.json({ message: 'Certificate uploaded successfully', certificate })
  } catch (error) {
    console.error('Error uploading certificate:', error)
    res.status(500).json({ message: error.message || 'Failed to upload certificate' })
  }
})

// Generate a new certificate
router.post('/generate', async (req, res) => {
  try {
    const { commonName, organization, country, validityDays, password } = req.body

    if (!commonName || !organization || !country || !validityDays || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const certificate = await signatureManager.generateCertificate({
      commonName,
      organization,
      country,
      validityDays: parseInt(validityDays),
      password
    })

    res.json({ message: 'Certificate generated successfully', certificate })
  } catch (error) {
    console.error('Error generating certificate:', error)
    res.status(500).json({ message: error.message || 'Failed to generate certificate' })
  }
})

// Verify a PDF signature
router.post('/verify', async (req, res) => {
  try {
    const { pdf } = req.body
    if (!pdf) {
      return res.status(400).json({ message: 'PDF data is required' })
    }

    const verificationResult = await signatureManager.verifySignature(pdf)
    res.json(verificationResult)
  } catch (error) {
    console.error('Error verifying signature:', error)
    res.status(500).json({ message: error.message || 'Failed to verify signature' })
  }
})

// Delete a certificate
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await signatureManager.deleteCertificate(id)
    res.json({ message: 'Certificate deleted successfully' })
  } catch (error) {
    console.error('Error deleting certificate:', error)
    res.status(500).json({ message: error.message || 'Failed to delete certificate' })
  }
})

module.exports = router 