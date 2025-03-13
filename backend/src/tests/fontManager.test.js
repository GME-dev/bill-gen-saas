import { jest } from '@jest/globals'
import { fontManager } from '../utils/fontManager.js'
import fs from 'fs'
import path from 'path'
import request from 'supertest'
import express from 'express'
import multer from 'multer'
import fontManagerRouter from '../routes/fontManager'

// Mock dependencies
jest.mock('fs')
jest.mock('../utils/fontSubsetter')
jest.mock('../utils/fontManager')
jest.mock('multer')

describe('Font Manager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Reset the font cache
    fontManager.fontCache.clear()
  })

  describe('loadFont', () => {
    const mockFontPath = '/path/to/font.ttf'
    const mockFontBytes = Buffer.from('font data')

    it('should load a font successfully', async () => {
      // Mock fs.promises.readFile
      fs.promises.readFile.mockResolvedValue(mockFontBytes)

      const font = await fontManager.loadFont(mockFontPath)

      expect(font).toBeDefined()
      expect(font.bytes).toBe(mockFontBytes)
      expect(fontManager.fontCache.has(mockFontPath)).toBe(true)
      expect(fs.promises.readFile).toHaveBeenCalledWith(mockFontPath)
    })

    it('should return cached font if available', async () => {
      // Add font to cache
      fontManager.fontCache.set(mockFontPath, {
        bytes: mockFontBytes,
        lastModified: new Date()
      })

      const font = await fontManager.loadFont(mockFontPath)

      expect(font).toBeDefined()
      expect(font.bytes).toBe(mockFontBytes)
      expect(fs.promises.readFile).not.toHaveBeenCalled()
    })

    it('should handle file reading errors gracefully', async () => {
      // Mock fs.promises.readFile to throw error
      fs.promises.readFile.mockRejectedValue(new Error('File not found'))

      await expect(fontManager.loadFont(mockFontPath))
        .rejects
        .toThrow('Failed to load font')
    })
  })

  describe('getFontSubset', () => {
    const mockFontPath = '/path/to/font.ttf'
    const mockText = 'Test text'
    const mockSubset = {
      bytes: Buffer.from('subset data'),
      glyphs: new Set(['T', 'e', 's', 't'])
    }

    it('should get a font subset successfully', async () => {
      // Mock font loading
      const mockFontBytes = Buffer.from('font data')
      fontManager.fontCache.set(mockFontPath, {
        bytes: mockFontBytes,
        lastModified: new Date()
      })

      // Mock fontSubsetter
      const { FontSubsetter } = require('../utils/fontSubsetter')
      const mockSubsetter = {
        createSubset: jest.fn().mockResolvedValue(mockSubset)
      }
      FontSubsetter.mockImplementation(() => mockSubsetter)

      const subset = await fontManager.getFontSubset(mockFontPath, mockText)

      expect(subset).toBeDefined()
      expect(subset.bytes).toBe(mockSubset.bytes)
      expect(subset.glyphs).toBe(mockSubset.glyphs)
      expect(mockSubsetter.createSubset).toHaveBeenCalledWith(mockFontBytes, mockText)
    })

    it('should handle font loading errors gracefully', async () => {
      // Mock fontSubsetter
      const { FontSubsetter } = require('../utils/fontSubsetter')
      const mockSubsetter = {
        createSubset: jest.fn().mockRejectedValue(new Error('Subset creation failed'))
      }
      FontSubsetter.mockImplementation(() => mockSubsetter)

      await expect(fontManager.getFontSubset(mockFontPath, mockText))
        .rejects
        .toThrow('Failed to create font subset')
    })
  })

  describe('clearCache', () => {
    it('should clear the font cache', () => {
      // Add some mock data to the cache
      fontManager.fontCache.set('/path/to/font1.ttf', {
        bytes: Buffer.from('font1'),
        lastModified: new Date()
      })
      fontManager.fontCache.set('/path/to/font2.ttf', {
        bytes: Buffer.from('font2'),
        lastModified: new Date()
      })

      fontManager.clearCache()

      expect(fontManager.fontCache.size).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return correct cache statistics', () => {
      // Add some mock data to the cache
      fontManager.fontCache.set('/path/to/font1.ttf', {
        bytes: Buffer.from('font1'),
        lastModified: new Date()
      })
      fontManager.fontCache.set('/path/to/font2.ttf', {
        bytes: Buffer.from('font2'),
        lastModified: new Date()
      })

      const stats = fontManager.getCacheStats()

      expect(stats).toBeDefined()
      expect(stats.totalFonts).toBe(2)
      expect(stats.totalBytes).toBe(10) // Total bytes of all fonts
    })
  })

  describe('validateFont', () => {
    it('should validate font file extension', () => {
      const validPath = '/path/to/font.ttf'
      const invalidPath = '/path/to/font.txt'

      expect(fontManager.validateFont(validPath)).toBe(true)
      expect(fontManager.validateFont(invalidPath)).toBe(false)
    })

    it('should validate font file existence', async () => {
      const existingPath = '/path/to/font.ttf'
      const nonExistingPath = '/path/to/nonexistent.ttf'

      // Mock fs.promises.access
      fs.promises.access.mockImplementation((path) => {
        if (path === existingPath) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('File not found'))
      })

      expect(await fontManager.validateFont(existingPath)).toBe(true)
      expect(await fontManager.validateFont(nonExistingPath)).toBe(false)
    })
  })
})

describe('Font Manager Routes', () => {
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
        if (ext === '.ttf' || ext === '.otf') {
          cb(null, true)
        } else {
          cb(new Error('Invalid file type'))
        }
      }
    })

    // Use the router
    app.use('/api/fonts', fontManagerRouter)
  })

  describe('GET /', () => {
    it('should return all fonts', async () => {
      const mockFonts = [
        {
          id: '1',
          name: 'Test Font 1',
          family: 'Test Family',
          style: 'Regular',
          path: '/path/to/font1.ttf'
        },
        {
          id: '2',
          name: 'Test Font 2',
          family: 'Test Family',
          style: 'Bold',
          path: '/path/to/font2.ttf'
        }
      ]

      fontManager.listFonts.mockResolvedValue(mockFonts)

      const response = await request(app)
        .get('/api/fonts')
        .expect(200)

      expect(response.body).toEqual(mockFonts)
      expect(fontManager.listFonts).toHaveBeenCalled()
    })

    it('should handle errors when listing fonts', async () => {
      fontManager.listFonts.mockRejectedValue(new Error('Failed to list fonts'))

      const response = await request(app)
        .get('/api/fonts')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to list fonts' })
    })
  })

  describe('POST /', () => {
    it('should upload a font successfully', async () => {
      const mockFile = {
        fieldname: 'font',
        originalname: 'test.ttf',
        encoding: '7bit',
        mimetype: 'font/ttf',
        buffer: Buffer.from('test'),
        size: 4
      }

      const mockFont = {
        id: '1',
        name: 'Test Font',
        family: 'Test Family',
        style: 'Regular',
        path: '/path/to/font.ttf'
      }

      fontManager.uploadFont.mockResolvedValue(mockFont)

      const response = await request(app)
        .post('/api/fonts')
        .attach('font', mockFile.buffer, {
          filename: mockFile.originalname,
          contentType: mockFile.mimetype
        })
        .expect(201)

      expect(response.body).toEqual(mockFont)
      expect(fontManager.uploadFont).toHaveBeenCalled()
    })

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/fonts')
        .expect(400)

      expect(response.body).toEqual({ error: 'No font file provided' })
    })

    it('should handle upload errors', async () => {
      const mockFile = {
        fieldname: 'font',
        originalname: 'test.ttf',
        encoding: '7bit',
        mimetype: 'font/ttf',
        buffer: Buffer.from('test'),
        size: 4
      }

      fontManager.uploadFont.mockRejectedValue(new Error('Upload failed'))

      const response = await request(app)
        .post('/api/fonts')
        .attach('font', mockFile.buffer, {
          filename: mockFile.originalname,
          contentType: mockFile.mimetype
        })
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to upload font' })
    })
  })

  describe('GET /:id/subset', () => {
    it('should generate a font subset successfully', async () => {
      const mockSubset = {
        bytes: Buffer.from('subset data'),
        glyphs: new Set(['T', 'e', 's', 't'])
      }

      fontManager.getFontSubset.mockResolvedValue(mockSubset)

      const response = await request(app)
        .get('/api/fonts/1/subset')
        .query({ text: 'Test text' })
        .expect(200)

      expect(response.body).toEqual({
        subset: mockSubset.bytes.toString('base64'),
        glyphs: Array.from(mockSubset.glyphs)
      })
      expect(fontManager.getFontSubset).toHaveBeenCalledWith('1', 'Test text')
    })

    it('should handle missing text parameter', async () => {
      const response = await request(app)
        .get('/api/fonts/1/subset')
        .expect(400)

      expect(response.body).toEqual({ error: 'Text parameter is required' })
    })

    it('should handle subset generation errors', async () => {
      fontManager.getFontSubset.mockRejectedValue(new Error('Subset generation failed'))

      const response = await request(app)
        .get('/api/fonts/1/subset')
        .query({ text: 'Test text' })
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to generate font subset' })
    })
  })

  describe('GET /stats', () => {
    it('should return font cache statistics', async () => {
      const mockStats = {
        totalFonts: 2,
        totalBytes: 1024,
        totalSubsets: 5,
        totalSubsetBytes: 512
      }

      fontManager.getCacheStats.mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/fonts/stats')
        .expect(200)

      expect(response.body).toEqual(mockStats)
      expect(fontManager.getCacheStats).toHaveBeenCalled()
    })

    it('should handle statistics retrieval errors', async () => {
      fontManager.getCacheStats.mockRejectedValue(new Error('Failed to get statistics'))

      const response = await request(app)
        .get('/api/fonts/stats')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to get font statistics' })
    })
  })

  describe('DELETE /:id', () => {
    it('should delete a font successfully', async () => {
      fontManager.deleteFont.mockResolvedValue(true)

      const response = await request(app)
        .delete('/api/fonts/1')
        .expect(200)

      expect(response.body).toEqual({ message: 'Font deleted successfully' })
      expect(fontManager.deleteFont).toHaveBeenCalledWith('1')
    })

    it('should handle deletion errors', async () => {
      fontManager.deleteFont.mockRejectedValue(new Error('Deletion failed'))

      const response = await request(app)
        .delete('/api/fonts/1')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to delete font' })
    })
  })

  describe('POST /clear-cache', () => {
    it('should clear the font cache successfully', async () => {
      fontManager.clearCache.mockResolvedValue(true)

      const response = await request(app)
        .post('/api/fonts/clear-cache')
        .expect(200)

      expect(response.body).toEqual({ message: 'Font cache cleared successfully' })
      expect(fontManager.clearCache).toHaveBeenCalled()
    })

    it('should handle cache clearing errors', async () => {
      fontManager.clearCache.mockRejectedValue(new Error('Cache clearing failed'))

      const response = await request(app)
        .post('/api/fonts/clear-cache')
        .expect(500)

      expect(response.body).toEqual({ error: 'Failed to clear font cache' })
    })
  })
}) 