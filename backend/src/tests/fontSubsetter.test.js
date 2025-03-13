import { jest } from '@jest/globals'
import { FontSubsetter } from '../utils/fontSubsetter.js'
import fs from 'fs'
import path from 'path'
import Font from 'fontkit'

// Mock dependencies
jest.mock('fs')
jest.mock('fontkit')
jest.mock('crypto')

describe('FontSubsetter', () => {
  let subsetter

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Create a new instance for each test
    subsetter = new FontSubsetter()
  })

  describe('createSubset', () => {
    const mockFontBytes = Buffer.from('font data')
    const mockText = 'Test text'
    const mockUniqueChars = new Set(['T', 'e', 's', 't', ' '])

    it('should create a font subset successfully', async () => {
      // Mock fontkit.Font.open
      const mockFont = {
        getGlyph: jest.fn().mockReturnValue({
          path: {
            toSVG: jest.fn().mockReturnValue('svg data')
          }
        })
      }
      Font.open.mockResolvedValue(mockFont)

      // Mock fs.promises.writeFile
      fs.promises.writeFile.mockResolvedValue(undefined)

      const subset = await subsetter.createSubset(mockFontBytes, mockText)

      expect(subset).toBeDefined()
      expect(subset.bytes).toBeDefined()
      expect(subset.glyphs).toBeDefined()
      expect(subset.glyphs.size).toBe(mockUniqueChars.size)
      expect(Font.open).toHaveBeenCalledWith(mockFontBytes)
    })

    it('should handle font loading errors gracefully', async () => {
      // Mock fontkit.Font.open to throw error
      Font.open.mockRejectedValue(new Error('Font loading failed'))

      await expect(subsetter.createSubset(mockFontBytes, mockText))
        .rejects
        .toThrow('Failed to load font')
    })

    it('should handle glyph extraction errors gracefully', async () => {
      // Mock fontkit.Font.open
      const mockFont = {
        getGlyph: jest.fn().mockThrow(new Error('Glyph not found'))
      }
      Font.open.mockResolvedValue(mockFont)

      await expect(subsetter.createSubset(mockFontBytes, mockText))
        .rejects
        .toThrow('Failed to extract glyphs')
    })
  })

  describe('getCacheKey', () => {
    it('should generate a unique cache key', () => {
      const mockFontBytes = Buffer.from('font data')
      const mockText = 'Test text'

      // Mock crypto hash functions
      const mockHashBytes = jest.fn().mockReturnValue('font_hash')
      const mockHashString = jest.fn().mockReturnValue('text_hash')
      require('crypto').createHash = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('final_hash')
      })

      const cacheKey = subsetter.getCacheKey(mockFontBytes, mockText)

      expect(cacheKey).toBeDefined()
      expect(cacheKey).toBe('font_hash_text_hash')
    })
  })

  describe('clearCache', () => {
    it('should clear the subset cache', () => {
      // Add some mock data to the cache
      subsetter.subsetCache.set('test_key', {
        bytes: Buffer.from('test'),
        glyphs: new Set(['t'])
      })

      subsetter.clearCache()

      expect(subsetter.subsetCache.size).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return correct cache statistics', () => {
      // Add some mock data to the cache
      subsetter.subsetCache.set('key1', {
        bytes: Buffer.from('test1'),
        glyphs: new Set(['t', 'e'])
      })
      subsetter.subsetCache.set('key2', {
        bytes: Buffer.from('test2'),
        glyphs: new Set(['s', 't'])
      })

      const stats = subsetter.getCacheStats()

      expect(stats).toBeDefined()
      expect(stats.totalSubsets).toBe(2)
      expect(stats.totalGlyphs).toBe(3) // Unique glyphs across all subsets
      expect(stats.totalBytes).toBe(10) // Total bytes of all subsets
    })
  })

  describe('getUniqueCharacters', () => {
    it('should extract unique characters from text', () => {
      const text = 'Test text with spaces!'
      const uniqueChars = subsetter.getUniqueCharacters(text)

      expect(uniqueChars).toBeDefined()
      expect(uniqueChars.size).toBe(15) // Unique characters in the text
      expect(uniqueChars.has('T')).toBe(true)
      expect(uniqueChars.has(' ')).toBe(true)
      expect(uniqueChars.has('!')).toBe(true)
    })

    it('should handle empty text', () => {
      const text = ''
      const uniqueChars = subsetter.getUniqueCharacters(text)

      expect(uniqueChars).toBeDefined()
      expect(uniqueChars.size).toBe(0)
    })
  })
}) 