import { jest } from '@jest/globals'
import { generatePDF } from '../utils/pdfGenerator.js'
import { signatureManager } from '../utils/signatureManager.js'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import request from 'supertest'
import express from 'express'
import multer from 'multer'
import path from 'path'
import pdfGeneratorRouter from '../routes/pdfGenerator'

// Mock dependencies
jest.mock('../utils/signatureManager')
jest.mock('pdf-lib')
jest.mock('fs')
jest.mock('../utils/pdfGenerator')
jest.mock('multer')

describe('PDF Generator', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  describe('generatePDF', () => {
    const mockData = {
      billNumber: 'BILL-001',
      date: '2024-03-20',
      dueDate: '2024-04-20',
      customer: {
        name: 'Test Customer',
        address: '123 Test St',
        email: 'test@example.com'
      },
      items: [
        {
          description: 'Test Item 1',
          quantity: 2,
          unitPrice: 100,
          amount: 200
        }
      ],
      total: 200,
      notes: 'Test notes'
    }

    it('should generate a PDF successfully', async () => {
      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          createSignature: jest.fn().mockReturnValue({
            setAppearance: jest.fn()
          })
        }),
        save: jest.fn().mockResolvedValue(Buffer.from('test pdf'))
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      // Mock fs.promises.readFile for fonts
      fs.promises.readFile.mockResolvedValue(Buffer.from('font data'))

      const pdfBytes = await generatePDF(mockData)

      expect(pdfBytes).toBeDefined()
      expect(PDFDocument.load).toHaveBeenCalled()
      expect(mockPdfDoc.save).toHaveBeenCalled()
    })

    it('should handle signature options correctly', async () => {
      const options = {
        signature: {
          enabled: true,
          certificateId: 'test.p12',
          appearance: {
            text: 'Test Signature',
            fontSize: 12,
            color: '#000000'
          }
        }
      }

      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          createSignature: jest.fn().mockReturnValue({
            setAppearance: jest.fn()
          })
        }),
        save: jest.fn().mockResolvedValue(Buffer.from('test pdf'))
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      // Mock signatureManager
      signatureManager.signPDF.mockResolvedValue(Buffer.from('signed pdf'))

      // Mock fs.promises.readFile for fonts
      fs.promises.readFile.mockResolvedValue(Buffer.from('font data'))

      const pdfBytes = await generatePDF(mockData, options)

      expect(pdfBytes).toBeDefined()
      expect(signatureManager.signPDF).toHaveBeenCalled()
      expect(mockPdfDoc.getForm().createSignature).toHaveBeenCalled()
    })

    it('should handle font loading errors gracefully', async () => {
      // Mock fs.promises.readFile to throw error
      fs.promises.readFile.mockRejectedValue(new Error('Font not found'))

      await expect(generatePDF(mockData))
        .rejects
        .toThrow('Failed to load fonts')
    })

    it('should handle signature errors gracefully', async () => {
      const options = {
        signature: {
          enabled: true,
          certificateId: 'test.p12'
        }
      }

      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          createSignature: jest.fn().mockReturnValue({
            setAppearance: jest.fn()
          })
        }),
        save: jest.fn().mockResolvedValue(Buffer.from('test pdf'))
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      // Mock signatureManager to throw error
      signatureManager.signPDF.mockRejectedValue(new Error('Signature failed'))

      // Mock fs.promises.readFile for fonts
      fs.promises.readFile.mockResolvedValue(Buffer.from('font data'))

      await expect(generatePDF(mockData, options))
        .rejects
        .toThrow('Failed to apply signature')
    })

    it('should handle multiple pages correctly', async () => {
      const largeData = {
        ...mockData,
        items: Array(50).fill({
          description: 'Test Item',
          quantity: 1,
          unitPrice: 100,
          amount: 100
        })
      }

      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          createSignature: jest.fn().mockReturnValue({
            setAppearance: jest.fn()
          })
        }),
        save: jest.fn().mockResolvedValue(Buffer.from('test pdf'))
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      // Mock fs.promises.readFile for fonts
      fs.promises.readFile.mockResolvedValue(Buffer.from('font data'))

      const pdfBytes = await generatePDF(largeData)

      expect(pdfBytes).toBeDefined()
      expect(mockPdfDoc.save).toHaveBeenCalled()
    })
  })
})

describe('PDF Generator Routes', () => {
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
        if (ext === '.pdf') {
          cb(null, true)
        } else {
          cb(new Error('Invalid file type'))
        }
      }
    })

    // Use the router
    app.use('/api/pdf', pdfGeneratorRouter)
  })

  describe('POST /generate', () => {
    const mockBillData = {
      billNumber: 'BILL-001',
      date: '2024-03-20',
      dueDate: '2024-04-20',
      customer: {
        name: 'Test Customer',
        address: '123 Test St',
        email: 'test@example.com'
      },
      items: [
        {
          description: 'Test Item 1',
          quantity: 2,
          unitPrice: 100,
          amount: 200
        }
      ],
      total: 200,
      notes: 'Test notes'
    }

    it('should generate a PDF successfully', async () => {
      const mockPdfBytes = Buffer.from('test pdf')
      generatePDF.mockResolvedValue(mockPdfBytes)

      const response = await request(app)
        .post('/api/pdf/generate')
        .send(mockBillData)
        .expect(200)

      expect(response.body).toEqual({
        pdf: mockPdfBytes.toString('base64'),
        filename: 'BILL-001.pdf'
      })
      expect(generatePDF).toHaveBeenCalledWith(mockBillData)
    })

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/pdf/generate')
        .send({})
        .expect(400)

      expect(response.body).toEqual({ error: 'Missing required fields' })
    })

    it('should handle generation errors', async () => {
      generatePDF.mockRejectedValue(new Error('Generation failed'))

      const response = await request(app)
        .post('/api/pdf/generate')
        .send(mockBillData)
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to generate PDF' })
    })
  })

  describe('POST /sign', () => {
    const mockPdfData = Buffer.from('test pdf')
    const mockSignatureOptions = {
      certificateId: 'test.p12',
      password: 'test123',
      appearance: {
        text: 'Test Signature',
        fontSize: 12,
        color: '#000000'
      }
    }

    it('should sign a PDF successfully', async () => {
      const mockSignedPdfBytes = Buffer.from('signed pdf')
      generatePDF.mockResolvedValue(mockSignedPdfBytes)

      const response = await request(app)
        .post('/api/pdf/sign')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('certificateId', mockSignatureOptions.certificateId)
        .field('password', mockSignatureOptions.password)
        .field('appearance', JSON.stringify(mockSignatureOptions.appearance))
        .expect(200)

      expect(response.body).toEqual({
        pdf: mockSignedPdfBytes.toString('base64'),
        filename: 'signed_test.pdf'
      })
      expect(generatePDF).toHaveBeenCalled()
    })

    it('should handle missing PDF file', async () => {
      const response = await request(app)
        .post('/api/pdf/sign')
        .field('certificateId', mockSignatureOptions.certificateId)
        .field('password', mockSignatureOptions.password)
        .expect(400)

      expect(response.body).toEqual({ error: 'No PDF file provided' })
    })

    it('should handle missing certificate ID', async () => {
      const response = await request(app)
        .post('/api/pdf/sign')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('password', mockSignatureOptions.password)
        .expect(400)

      expect(response.body).toEqual({ error: 'Certificate ID is required' })
    })

    it('should handle missing password', async () => {
      const response = await request(app)
        .post('/api/pdf/sign')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('certificateId', mockSignatureOptions.certificateId)
        .expect(400)

      expect(response.body).toEqual({ error: 'Password is required' })
    })

    it('should handle signing errors', async () => {
      generatePDF.mockRejectedValue(new Error('Signing failed'))

      const response = await request(app)
        .post('/api/pdf/sign')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('certificateId', mockSignatureOptions.certificateId)
        .field('password', mockSignatureOptions.password)
        .field('appearance', JSON.stringify(mockSignatureOptions.appearance))
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to sign PDF' })
    })
  })

  describe('POST /verify', () => {
    const mockPdfData = Buffer.from('test pdf')

    it('should verify a PDF signature successfully', async () => {
      const mockVerificationResult = {
        isValid: true,
        details: {
          reason: 'Test reason',
          location: 'Test location',
          date: '2024-03-20'
        }
      }

      generatePDF.mockResolvedValue(mockVerificationResult)

      const response = await request(app)
        .post('/api/pdf/verify')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .expect(200)

      expect(response.body).toEqual(mockVerificationResult)
      expect(generatePDF).toHaveBeenCalled()
    })

    it('should handle missing PDF file', async () => {
      const response = await request(app)
        .post('/api/pdf/verify')
        .expect(400)

      expect(response.body).toEqual({ error: 'No PDF file provided' })
    })

    it('should handle verification errors', async () => {
      generatePDF.mockRejectedValue(new Error('Verification failed'))

      const response = await request(app)
        .post('/api/pdf/verify')
        .attach('pdf', mockPdfData, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to verify PDF signature' })
    })
  })
}) 