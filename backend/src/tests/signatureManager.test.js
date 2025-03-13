import { jest } from '@jest/globals'
import { signatureManager } from '../utils/signatureManager.js'
import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

// Mock dependencies
jest.mock('fs')
jest.mock('pdf-lib')
jest.mock('axios')

describe('SignatureManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Reset the certificates map
    signatureManager.certificates.clear()
    signatureManager.revokedCertificates.clear()
  })

  describe('generateCertificate', () => {
    it('should generate a new certificate successfully', async () => {
      const options = {
        commonName: 'Test Certificate',
        organization: 'Test Org',
        country: 'US',
        validityDays: 365,
        password: 'test123'
      }

      // Mock exec to simulate OpenSSL commands
      const mockExec = jest.fn()
      mockExec.mockResolvedValue({ stdout: '', stderr: '' })
      require('child_process').exec = mockExec

      // Mock fs.promises.stat
      fs.promises.stat.mockResolvedValue({
        mtime: new Date(),
        size: 1024
      })

      const certificate = await signatureManager.generateCertificate(options)

      expect(certificate).toBeDefined()
      expect(certificate.name).toContain('.p12')
      expect(signatureManager.certificates.has(certificate.name)).toBe(true)
      expect(mockExec).toHaveBeenCalledTimes(4) // Four OpenSSL commands
    })

    it('should throw error if certificate generation fails', async () => {
      const options = {
        commonName: 'Test Certificate',
        organization: 'Test Org',
        country: 'US',
        validityDays: 365,
        password: 'test123'
      }

      // Mock exec to simulate OpenSSL command failure
      const mockExec = jest.fn()
      mockExec.mockRejectedValue(new Error('OpenSSL error'))
      require('child_process').exec = mockExec

      await expect(signatureManager.generateCertificate(options))
        .rejects
        .toThrow('Failed to generate certificate')
    })
  })

  describe('uploadCertificate', () => {
    it('should upload a certificate successfully', async () => {
      const filePath = '/path/to/cert.p12'
      const password = 'test123'

      // Mock fs.promises.stat
      fs.promises.stat.mockResolvedValue({
        mtime: new Date(),
        size: 1024
      })

      const certificate = await signatureManager.uploadCertificate(filePath, password)

      expect(certificate).toBeDefined()
      expect(certificate.name).toBe('cert.p12')
      expect(signatureManager.certificates.has(certificate.name)).toBe(true)
    })

    it('should throw error if certificate upload fails', async () => {
      const filePath = '/path/to/cert.p12'
      const password = 'test123'

      // Mock fs.promises.stat to throw error
      fs.promises.stat.mockRejectedValue(new Error('File not found'))

      await expect(signatureManager.uploadCertificate(filePath, password))
        .rejects
        .toThrow('Failed to upload certificate')
    })
  })

  describe('signPDF', () => {
    it('should sign a PDF successfully', async () => {
      const pdfBytes = Buffer.from('test pdf')
      const certificateId = 'test.p12'
      const options = {
        password: 'test123',
        reason: 'Test signing',
        location: 'Test location'
      }

      // Mock certificate
      signatureManager.certificates.set(certificateId, {
        name: certificateId,
        path: '/path/to/cert.p12'
      })

      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          createSignature: jest.fn().mockReturnValue({
            setAppearance: jest.fn(),
            sign: jest.fn().mockResolvedValue({})
          })
        }),
        save: jest.fn().mockResolvedValue(pdfBytes)
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      // Mock fs.promises.readFile
      fs.promises.readFile.mockResolvedValue(Buffer.from('cert data'))

      const signedPdf = await signatureManager.signPDF(pdfBytes, certificateId, options)

      expect(signedPdf).toBeDefined()
      expect(PDFDocument.load).toHaveBeenCalledWith(pdfBytes)
      expect(mockPdfDoc.save).toHaveBeenCalled()
    })

    it('should throw error if certificate not found', async () => {
      const pdfBytes = Buffer.from('test pdf')
      const certificateId = 'nonexistent.p12'

      await expect(signatureManager.signPDF(pdfBytes, certificateId))
        .rejects
        .toThrow('Certificate not found')
    })
  })

  describe('verifySignature', () => {
    it('should verify a signature successfully', async () => {
      const pdfBytes = Buffer.from('test pdf')

      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          getSignature: jest.fn().mockReturnValue({
            verify: jest.fn().mockResolvedValue({
              isValid: true,
              reason: 'Test reason',
              location: 'Test location',
              date: new Date(),
              contactInfo: 'Test contact'
            }),
            getCertificate: jest.fn().mockResolvedValue({
              name: 'test.p12'
            }),
            getTimestamp: jest.fn().mockResolvedValue(Buffer.from('timestamp'))
          })
        })
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      const result = await signatureManager.verifySignature(pdfBytes)

      expect(result).toBeDefined()
      expect(result.isValid).toBe(true)
      expect(result.details).toBeDefined()
    })

    it('should return invalid if no signature found', async () => {
      const pdfBytes = Buffer.from('test pdf')

      // Mock PDFDocument
      const mockPdfDoc = {
        getForm: jest.fn().mockReturnValue({
          getSignature: jest.fn().mockReturnValue(null)
        })
      }
      PDFDocument.load.mockResolvedValue(mockPdfDoc)

      const result = await signatureManager.verifySignature(pdfBytes)

      expect(result).toBeDefined()
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('No signature found in the document')
    })
  })

  describe('checkCertificateRevocation', () => {
    it('should check certificate revocation status', async () => {
      const certificate = {
        name: 'test.p12',
        serialNumber: '123456'
      }

      // Mock axios for CRL check
      const axios = require('axios')
      axios.get.mockResolvedValue({
        data: 'CRL data containing 123456'
      })

      const result = await signatureManager.checkCertificateRevocation(certificate)

      expect(result).toBeDefined()
      expect(result.isRevoked).toBe(true)
      expect(result.reason).toBe('Certificate found in CRL')
    })

    it('should handle CRL check errors gracefully', async () => {
      const certificate = {
        name: 'test.p12',
        serialNumber: '123456'
      }

      // Mock axios to throw error
      const axios = require('axios')
      axios.get.mockRejectedValue(new Error('Network error'))

      const result = await signatureManager.checkCertificateRevocation(certificate)

      expect(result).toBeDefined()
      expect(result.isRevoked).toBe(false)
      expect(result.error).toBe('Failed to check revocation status')
    })
  })
}) 