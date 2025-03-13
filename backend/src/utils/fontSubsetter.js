import { Font } from 'fontkit'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

export class FontSubsetter {
  constructor() {
    this.subsetCache = new Map()
  }

  async createSubset(fontBytes, text) {
    const cacheKey = this.getCacheKey(fontBytes, text)
    if (this.subsetCache.has(cacheKey)) {
      return this.subsetCache.get(cacheKey)
    }

    // Create a font object from the bytes
    const font = Font.create(fontBytes)
    
    // Get unique characters from the text
    const chars = [...new Set(text)].join('')
    
    // Create a subset of the font containing only the required characters
    const subset = font.createSubset()
    
    // Add characters to the subset
    for (const char of chars) {
      const glyph = font.getGlyph(char)
      if (glyph) {
        subset.includeGlyph(glyph)
      }
    }
    
    // Generate the subset font bytes
    const subsetBytes = await promisify(subset.encode.bind(subset))()
    
    // Cache the result
    this.subsetCache.set(cacheKey, subsetBytes)
    
    return subsetBytes
  }

  getCacheKey(fontBytes, text) {
    // Create a hash of the font bytes and text
    const fontHash = this.hashBytes(fontBytes)
    const textHash = this.hashString(text)
    return `${fontHash}-${textHash}`
  }

  hashBytes(bytes) {
    let hash = 0
    for (let i = 0; i < bytes.length; i++) {
      const char = bytes[i]
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  clearCache() {
    this.subsetCache.clear()
  }

  getStats() {
    return {
      totalSubsets: this.subsetCache.size,
      totalBytes: Array.from(this.subsetCache.values())
        .reduce((sum, bytes) => sum + bytes.length, 0)
    }
  }
} 