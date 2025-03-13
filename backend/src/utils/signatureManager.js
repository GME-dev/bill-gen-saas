import { PDFDocument, PDFName, PDFDict, PDFHexString } from 'pdf-lib'
import { createHash, createSign, createVerify } from 'crypto'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { exec } from 'child_process'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class SignatureManager {
  constructor() {
    this.certificatesDir = path.join(__dirname, '../assets/certificates')
    this.certificates = new Map()
    this.revokedCertificates = new Set()
    this.timestampService = process.env.TIMESTAMP_SERVICE_URL || 'http://timestamp.digicert.com'
    this.crlUrls = new Set(process.env.CRL_URLS?.split(',') || [])
    this.initialize()
  }

  async initialize() {
    try {
      await fs.promises.mkdir(this.certificatesDir, { recursive: true })
      await this.loadCertificates()
    } catch (error) {
      console.error('Error initializing signature manager:', error)
    }
  }

  async loadCertificates() {
    try {
      const files = await fs.promises.readdir(this.certificatesDir)
      for (const file of files) {
        if (file.endsWith('.p12') || file.endsWith('.pfx')) {
          const filePath = path.join(this.certificatesDir, file)
          const stats = await fs.promises.stat(filePath)
          this.certificates.set(file, {
            name: file,
            path: filePath,
            uploadedAt: stats.mtime,
            size: stats.size
          })
        }
      }
    } catch (error) {
      console.error('Error loading certificates:', error)
    }
  }

  async listCertificates() {
    return Array.from(this.certificates.values())
  }

  async generateCertificate({ commonName, organization, country, validityDays, password }) {
    const keyFile = path.join(this.certificatesDir, `${commonName}.key`)
    const csrFile = path.join(this.certificatesDir, `${commonName}.csr`)
    const certFile = path.join(this.certificatesDir, `${commonName}.crt`)
    const p12File = path.join(this.certificatesDir, `${commonName}.p12`)

    try {
      // Generate private key
      await promisify(exec)(`openssl genrsa -out ${keyFile} 2048`)
      
      // Generate CSR
      const csrCommand = `openssl req -new -key ${keyFile} -out ${csrFile} -subj "/C=${country}/O=${organization}/CN=${commonName}"`
      await promisify(exec)(csrCommand)
      
      // Generate self-signed certificate
      const certCommand = `openssl x509 -req -days ${validityDays} -in ${csrFile} -signkey ${keyFile} -out ${certFile}`
      await promisify(exec)(certCommand)
      
      // Convert to PKCS#12 format
      const p12Command = `openssl pkcs12 -export -inkey ${keyFile} -in ${certFile} -out ${p12File} -passout pass:${password}`
      await promisify(exec)(p12Command)
      
      // Clean up temporary files
      await fs.promises.unlink(keyFile)
      await fs.promises.unlink(csrFile)
      await fs.promises.unlink(certFile)
      
      const stats = await fs.promises.stat(p12File)
      const certificate = {
        name: path.basename(p12File),
        path: p12File,
        uploadedAt: stats.mtime,
        size: stats.size
      }

      this.certificates.set(certificate.name, certificate)
      return certificate
    } catch (error) {
      console.error('Error generating certificate:', error)
      throw new Error('Failed to generate certificate')
    }
  }

  async uploadCertificate(filePath, password) {
    try {
      const fileName = path.basename(filePath)
      const stats = await fs.promises.stat(filePath)
      const certificate = {
        name: fileName,
        path: filePath,
        uploadedAt: stats.mtime,
        size: stats.size
      }

      this.certificates.set(fileName, certificate)
      return certificate
    } catch (error) {
      console.error('Error uploading certificate:', error)
      throw new Error('Failed to upload certificate')
    }
  }

  async deleteCertificate(id) {
    try {
      const certificate = this.certificates.get(id)
      if (!certificate) {
        throw new Error('Certificate not found')
      }

      await fs.promises.unlink(certificate.path)
      this.certificates.delete(id)
    } catch (error) {
      console.error('Error deleting certificate:', error)
      throw new Error('Failed to delete certificate')
    }
  }

  async checkCertificateRevocation(certificate) {
    try {
      // Check local revocation list
      if (this.revokedCertificates.has(certificate.name)) {
        return { isRevoked: true, reason: 'Certificate is in local revocation list' }
      }

      // Check CRL URLs
      for (const crlUrl of this.crlUrls) {
        const response = await axios.get(crlUrl)
        const crl = response.data
        
        // Parse CRL and check certificate serial number
        // This is a simplified check - in production, you'd use a proper CRL parser
        if (crl.includes(certificate.serialNumber)) {
          this.revokedCertificates.add(certificate.name)
          return { isRevoked: true, reason: 'Certificate found in CRL' }
        }
      }

      return { isRevoked: false }
    } catch (error) {
      console.error('Error checking certificate revocation:', error)
      return { isRevoked: false, error: 'Failed to check revocation status' }
    }
  }

  async getTimestampToken(hash) {
    try {
      const response = await axios.post(this.timestampService, {
        hash: hash.toString('base64'),
        hashAlgorithm: 'SHA256'
      })

      return Buffer.from(response.data.timestampToken, 'base64')
    } catch (error) {
      console.error('Error getting timestamp token:', error)
      throw new Error('Failed to get timestamp token')
    }
  }

  async signPDF(pdfBytes, certificateId, options = {}) {
    try {
      const certificate = this.certificates.get(certificateId)
      if (!certificate) {
        throw new Error('Certificate not found')
      }

      // Check certificate revocation
      const revocationStatus = await this.checkCertificateRevocation(certificate)
      if (revocationStatus.isRevoked) {
        throw new Error(`Certificate is revoked: ${revocationStatus.reason}`)
      }

      const pdfDoc = await PDFDocument.load(pdfBytes)
      const { password, timestamp = true } = options

      // Create signature field
      const form = pdfDoc.getForm()
      const signatureField = form.createSignature('signature')

      // Set signature appearance
      if (options.appearance) {
        signatureField.setAppearance(options.appearance)
      }

      // Generate document hash
      const hash = createHash('sha256')
      hash.update(pdfBytes)
      const documentHash = hash.digest()

      // Get timestamp token if requested
      let timestampToken = null
      if (timestamp) {
        timestampToken = await this.getTimestampToken(documentHash)
      }

      // Apply digital signature with timestamp
      const signature = await signatureField.sign({
        certificate: await fs.promises.readFile(certificate.path),
        password,
        reason: options.reason || 'Document signing',
        location: options.location || 'Unknown',
        contactInfo: options.contactInfo || '',
        date: options.date || new Date(),
        timestampToken
      })

      return await pdfDoc.save()
    } catch (error) {
      console.error('Error signing PDF:', error)
      throw new Error('Failed to sign PDF')
    }
  }

  async verifySignature(pdfBytes) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const form = pdfDoc.getForm()
      const signatureField = form.getSignature('signature')

      if (!signatureField) {
        return {
          isValid: false,
          message: 'No signature found in the document'
        }
      }

      const signature = await signatureField.verify()
      
      // Check certificate revocation
      const certificate = await signatureField.getCertificate()
      const revocationStatus = await this.checkCertificateRevocation(certificate)
      
      // Verify timestamp if present
      const timestamp = await signatureField.getTimestamp()
      const timestampValid = timestamp ? await this.verifyTimestamp(timestamp) : null

      return {
        isValid: signature.isValid && !revocationStatus.isRevoked,
        message: signature.isValid && !revocationStatus.isRevoked 
          ? 'Signature is valid' 
          : 'Signature is invalid',
        details: {
          reason: signature.reason,
          location: signature.location,
          date: signature.date,
          contactInfo: signature.contactInfo,
          revocationStatus,
          timestampValid
        }
      }
    } catch (error) {
      console.error('Error verifying signature:', error)
      throw new Error('Failed to verify signature')
    }
  }

  async verifyTimestamp(timestampToken) {
    try {
      // Verify timestamp token using the timestamp service
      const response = await axios.post(`${this.timestampService}/verify`, {
        timestampToken: timestampToken.toString('base64')
      })

      return response.data.valid
    } catch (error) {
      console.error('Error verifying timestamp:', error)
      return false
    }
  }

  createSignatureAppearance(options = {}) {
    const {
      text = 'Digitally signed by',
      fontSize = 12,
      color = { r: 0, g: 0, b: 0 },
      backgroundColor = { r: 0.95, g: 0.95, b: 0.95 },
      borderColor = { r: 0.5, g: 0.5, b: 0.5 },
      borderWidth = 1,
      borderRadius = 4,
      padding = 10,
      showDate = true,
      showLocation = true,
      showReason = true,
      customImage = null
    } = options

    return {
      text,
      fontSize,
      color,
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      padding,
      showDate,
      showLocation,
      showReason,
      customImage
    }
  }
}

// Export a singleton instance
export const signatureManager = new SignatureManager() 