import request from 'supertest'
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { signatureManager } from '../utils/signatureManager.js'
import certificatesRouter from '../routes/certificates'

// Mock dependencies
jest.mock('../utils/signatureManager')
jest.mock('multer')
jest.mock('fs')

describe('Certificate Routes', () => {
  let app
  let upload

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Create Express app
    app = express()
    app.use(express.json())

    // Mock multer upload
    upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'uploads/')
        },
        filename: (req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname}`)
        }
      }),
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        if (ext === '.p12' || ext === '.pfx') {
          cb(null, true)
        } else {
          cb(new Error('Invalid file type'))
        }
      }
    })

    // Use the router
    app.use('/api/certificates', certificatesRouter)
  })

  describe('GET /', () => {
    it('should return all certificates', async () => {
      const mockCertificates = [
        {
          id: '1',
          name: 'Test Certificate 1',
          issuer: 'Test Issuer',
          validFrom: '2024-01-01',
          validTo: '2024-12-31'
        },
        {
          id: '2',
          name: 'Test Certificate 2',
          issuer: 'Test Issuer',
          validFrom: '2024-01-01',
          validTo: '2024-12-31'
        }
      ]

      signatureManager.listCertificates.mockResolvedValue(mockCertificates)

      const response = await request(app)
        .get('/api/certificates')
        .expect(200)

      expect(response.body).toEqual(mockCertificates)
      expect(signatureManager.listCertificates).toHaveBeenCalled()
    })

    it('should handle errors when listing certificates', async () => {
      signatureManager.listCertificates.mockRejectedValue(new Error('Failed to list certificates'))

      const response = await request(app)
        .get('/api/certificates')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to list certificates' })
    })
  })

  describe('POST /', () => {
    it('should upload a certificate successfully', async () => {
      const mockFile = {
        fieldname: 'certificate',
        originalname: 'test.p12',
        encoding: '7bit',
        mimetype: 'application/x-pkcs12',
        buffer: Buffer.from('test'),
        size: 4
      }

      const mockCertificate = {
        id: '1',
        name: 'Test Certificate',
        issuer: 'Test Issuer',
        validFrom: '2024-01-01',
        validTo: '2024-12-31'
      }

      signatureManager.uploadCertificate.mockResolvedValue(mockCertificate)

      const response = await request(app)
        .post('/api/certificates')
        .attach('certificate', mockFile.buffer, {
          filename: mockFile.originalname,
          contentType: mockFile.mimetype
        })
        .field('password', 'test123')
        .expect(201)

      expect(response.body).toEqual(mockCertificate)
      expect(signatureManager.uploadCertificate).toHaveBeenCalled()
    })

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/certificates')
        .field('password', 'test123')
        .expect(400)

      expect(response.body).toEqual({ error: 'No certificate file provided' })
    })

    it('should handle missing password', async () => {
      const mockFile = {
        fieldname: 'certificate',
        originalname: 'test.p12',
        encoding: '7bit',
        mimetype: 'application/x-pkcs12',
        buffer: Buffer.from('test'),
        size: 4
      }

      const response = await request(app)
        .post('/api/certificates')
        .attach('certificate', mockFile.buffer, {
          filename: mockFile.originalname,
          contentType: mockFile.mimetype
        })
        .expect(400)

      expect(response.body).toEqual({ error: 'Password is required' })
    })

    it('should handle upload errors', async () => {
      const mockFile = {
        fieldname: 'certificate',
        originalname: 'test.p12',
        encoding: '7bit',
        mimetype: 'application/x-pkcs12',
        buffer: Buffer.from('test'),
        size: 4
      }

      signatureManager.uploadCertificate.mockRejectedValue(new Error('Upload failed'))

      const response = await request(app)
        .post('/api/certificates')
        .attach('certificate', mockFile.buffer, {
          filename: mockFile.originalname,
          contentType: mockFile.mimetype
        })
        .field('password', 'test123')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to upload certificate' })
    })
  })

  describe('POST /generate', () => {
    it('should generate a new certificate successfully', async () => {
      const certificateDetails = {
        commonName: 'Test Certificate',
        organization: 'Test Org',
        country: 'US',
        validityDays: 365,
        password: 'test123'
      }

      const mockCertificate = {
        id: '1',
        name: 'Test Certificate',
        issuer: 'Test Issuer',
        validFrom: '2024-01-01',
        validTo: '2024-12-31'
      }

      signatureManager.generateCertificate.mockResolvedValue(mockCertificate)

      const response = await request(app)
        .post('/api/certificates/generate')
        .send(certificateDetails)
        .expect(201)

      expect(response.body).toEqual(mockCertificate)
      expect(signatureManager.generateCertificate).toHaveBeenCalledWith(certificateDetails)
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/certificates/generate')
        .send({})
        .expect(400)

      expect(response.body).toEqual({ error: 'Missing required fields' })
    })

    it('should handle generation errors', async () => {
      const certificateDetails = {
        commonName: 'Test Certificate',
        organization: 'Test Org',
        country: 'US',
        validityDays: 365,
        password: 'test123'
      }

      signatureManager.generateCertificate.mockRejectedValue(new Error('Generation failed'))

      const response = await request(app)
        .post('/api/certificates/generate')
        .send(certificateDetails)
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to generate certificate' })
    })
  })

  describe('POST /verify', () => {
    it('should verify a signature successfully', async () => {
      const mockPdfData = Buffer.from('test pdf')
      const mockVerificationResult = {
        isValid: true,
        details: {
          reason: 'Test reason',
          location: 'Test location',
          date: '2024-03-20'
        }
      }

      signatureManager.verifySignature.mockResolvedValue(mockVerificationResult)

      const response = await request(app)
        .post('/api/certificates/verify')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .expect(200)

      expect(response.body).toEqual(mockVerificationResult)
      expect(signatureManager.verifySignature).toHaveBeenCalled()
    })

    it('should handle missing PDF file', async () => {
      const response = await request(app)
        .post('/api/certificates/verify')
        .expect(400)

      expect(response.body).toEqual({ error: 'No PDF file provided' })
    })

    it('should handle verification errors', async () => {
      const mockPdfData = Buffer.from('test pdf')

      signatureManager.verifySignature.mockRejectedValue(new Error('Verification failed'))

      const response = await request(app)
        .post('/api/certificates/verify')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to verify signature' })
    })
  })

  describe('DELETE /:id', () => {
    it('should delete a certificate successfully', async () => {
      signatureManager.deleteCertificate.mockResolvedValue(true)

      const response = await request(app)
        .delete('/api/certificates/1')
        .expect(200)

      expect(response.body).toEqual({ message: 'Certificate deleted successfully' })
      expect(signatureManager.deleteCertificate).toHaveBeenCalledWith('1')
    })

    it('should handle deletion errors', async () => {
      signatureManager.deleteCertificate.mockRejectedValue(new Error('Deletion failed'))

      const response = await request(app)
        .delete('/api/certificates/1')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to delete certificate' })
    })
  })
}) 