import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import path from 'path'
import { FontSubsetter } from './fontSubsetter.js'
import { BRANDING_CONFIG } from '../config/constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Font cache to store embedded fonts
const fontCache = new Map()

export class FontManager {
  constructor() {
    this.fontsDir = join(__dirname, '../../assets/fonts')
    this.logosDir = join(__dirname, '../../assets/logos')
    this.fontSubsetter = new FontSubsetter()
    this.ensureDirectories()
    this.fontCache = new Map()
    this.typographySettings = BRANDING_CONFIG.typography
  }

  ensureDirectories() {
    if (!fs.existsSync(this.fontsDir)) {
      fs.mkdirSync(this.fontsDir, { recursive: true })
    }
    if (!fs.existsSync(this.logosDir)) {
      fs.mkdirSync(this.logosDir, { recursive: true })
    }
  }

  async validateFontFile(filePath) {
    try {
      const buffer = await fs.promises.readFile(filePath)
      const pdfDoc = await PDFDocument.create()
      await pdfDoc.embedFont(buffer)
      return true
    } catch (error) {
      throw new Error(`Invalid font file: ${error.message}`)
    }
  }

  async embedFont(pdfDoc, fontPath, options = {}) {
    const { text = '', elementType = 'body' } = options
    const cacheKey = `${fontPath}-${elementType}`
    
    if (fontCache.has(cacheKey)) {
      return fontCache.get(cacheKey)
    }

    try {
      // Register fontkit with the PDFDocument instance
      pdfDoc.registerFontkit(fontkit)
      
      // Get typography settings for the element
      const typographySettings = this.getTypographySettings(elementType)
      
      // Construct the full font path
      const fullFontPath = path.join(this.fontsDir, fontPath)
      console.log('Loading font from:', fullFontPath)
      
      // Read and embed the full font without subsetting
      const fontBuffer = await fs.promises.readFile(fullFontPath)
      const font = await pdfDoc.embedFont(fontBuffer)

      fontCache.set(cacheKey, font)
      return font
    } catch (error) {
      console.error('Font embedding error:', error)
      throw new Error(`Failed to embed font: ${error.message}`)
    }
  }

  async loadBrandingConfig() {
    return BRANDING_CONFIG
  }

  async saveBrandingConfig(config) {
    const configPath = join(__dirname, '../../config/branding.json')
    try {
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2))
      return true
    } catch (error) {
      throw new Error(`Failed to save branding config: ${error.message}`)
    }
  }

  async uploadFont(file, options = {}) {
    const { originalname, buffer } = file
    const ext = path.extname(originalname).toLowerCase()
    
    if (!['.ttf', '.otf'].includes(ext)) {
      throw new Error('Invalid font file format. Only TTF and OTF files are supported.')
    }

    const fileName = `${Date.now()}-${originalname}`
    const filePath = join(this.fontsDir, fileName)

    try {
      // Validate font before saving
      await this.validateFontFile(buffer)
      
      // Save font file
      await fs.promises.writeFile(filePath, buffer)
      
      // Update branding config
      const config = await this.loadBrandingConfig()
      if (options.type === 'primary') {
        config.fonts.primary[options.style || 'regular'] = fileName
      } else if (options.type === 'secondary') {
        config.fonts.secondary[options.style || 'regular'] = fileName
      }
      
      await this.saveBrandingConfig(config)
      return fileName
    } catch (error) {
      throw new Error(`Failed to upload font: ${error.message}`)
    }
  }

  async uploadLogo(file) {
    const { originalname, buffer } = file
    const ext = path.extname(originalname).toLowerCase()
    
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      throw new Error('Invalid logo file format. Only PNG and JPG files are supported.')
    }

    const fileName = `logo${ext}`
    const filePath = join(this.logosDir, fileName)

    try {
      await fs.promises.writeFile(filePath, buffer)
      
      // Update branding config
      const config = await this.loadBrandingConfig()
      config.logo = fileName
      await this.saveBrandingConfig(config)
      
      return fileName
    } catch (error) {
      throw new Error(`Failed to upload logo: ${error.message}`)
    }
  }

  async getFonts() {
    try {
      // Return font filenames only
      return {
        primary: {
          regular: 'Roboto-Regular.ttf',
          bold: 'Roboto-Bold.ttf'
        },
        secondary: {
          regular: 'OpenSans-Regular.ttf',
          bold: 'OpenSans-Bold.ttf'
        }
      }
    } catch (error) {
      console.error('Error loading fonts:', error)
      throw new Error(`Failed to load fonts: ${error.message}`)
    }
  }

  async loadFont(fontPath) {
    if (this.fontCache.has(fontPath)) {
      return this.fontCache.get(fontPath)
    }

    const fontBytes = await fs.promises.readFile(fontPath)
    this.fontCache.set(fontPath, fontBytes)
    return fontBytes
  }

  async getLogo() {
    const logoPath = path.join(process.cwd(), 'assets', 'images', 'logo.jpg')
    return fs.existsSync(logoPath) ? logoPath : null
  }

  hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 }
  }

  // Get typography settings for a specific element
  getTypographySettings(elementType) {
    return this.typographySettings[elementType] || this.typographySettings.body
  }

  // Clear font cache
  clearCache() {
    fontCache.clear()
    this.fontSubsetter.clearCache()
  }

  // Get font statistics
  getFontStats() {
    return {
      totalFonts: this.fontCache.size,
      subsetStats: this.fontSubsetter.getStats()
    }
  }
}

// Export a singleton instance
export const fontManager = new FontManager() 