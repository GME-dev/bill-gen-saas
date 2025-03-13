import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fontManager } from './fontManager'
import { signatureManager } from './signatureManager'
import { COMPANY_INFO } from '../config/constants'

export async function generatePDF(bill, options = {}) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    
    // Load branding configuration
    const branding = await fontManager.loadBrandingConfig()
    
    // Load fonts with subsetting
    const fonts = await fontManager.getFonts()
    const primaryFont = await fontManager.embedFont(pdfDoc, fonts.primary.regular, {
      elementType: 'heading',
      text: COMPANY_INFO.name
    })
    const primaryBoldFont = await fontManager.embedFont(pdfDoc, fonts.primary.bold, {
      elementType: 'heading',
      text: 'BILL INFORMATION CUSTOMER INFORMATION BILL ITEMS PAYMENT TERMS'
    })
    const secondaryFont = await fontManager.embedFont(pdfDoc, fonts.secondary.regular, {
      elementType: 'body',
      text: `${COMPANY_INFO.address} ${COMPANY_INFO.phone} ${COMPANY_INFO.email} ${bill.customer_name} ${bill.customer_nic} ${bill.customer_address} ${COMPANY_INFO.payment_terms}`
    })
    const secondaryBoldFont = await fontManager.embedFont(pdfDoc, fonts.secondary.bold, {
      elementType: 'table',
      text: 'Product Name Quantity Unit Price Total Price'
    })
    
    // Convert brand colors to RGB
    const primaryColor = fontManager.hexToRGB(branding.colors.primary)
    const secondaryColor = fontManager.hexToRGB(branding.colors.secondary)
    const textColor = fontManager.hexToRGB(branding.colors.text)
    
    // Add a page
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    
    // Set margins
    const margin = 50
    const { width, height } = page.getSize()
    const contentWidth = width - 2 * margin
    const contentHeight = height - 2 * margin
    
    // Helper function for text positioning with typography settings
    let currentY = height - margin - 30
    
    // Load and draw logo if available
    const logoPath = await fontManager.getLogo()
    if (logoPath && fs.existsSync(logoPath)) {
      const logoImage = await pdfDoc.embedJpg(fs.readFileSync(logoPath))
      const logoDims = logoImage.scale(0.5) // Adjust scale as needed
      page.drawImage(logoImage, {
        x: margin,
        y: currentY - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      })
      currentY -= logoDims.height + 20
    }
    
    // Draw header with custom fonts and colors
    page.drawText(COMPANY_INFO.name, {
      x: margin,
      y: currentY,
      size: 24,
      font: primaryFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      lineHeight: fontManager.getTypographySettings('heading').lineHeight,
      letterSpacing: fontManager.getTypographySettings('heading').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('heading').wordSpacing,
    })
    
    currentY -= 20
    page.drawText(COMPANY_INFO.address, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`Phone: ${COMPANY_INFO.phone}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`Email: ${COMPANY_INFO.email}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    // Draw separator line with brand color
    currentY -= 20
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: width - margin, y: currentY },
      thickness: 1,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    })
    
    // Bill information with custom fonts and typography
    currentY -= 30
    page.drawText('BILL INFORMATION', {
      x: margin,
      y: currentY,
      size: 14,
      font: primaryBoldFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      lineHeight: fontManager.getTypographySettings('heading').lineHeight,
      letterSpacing: fontManager.getTypographySettings('heading').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('heading').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`Bill Number: ${bill.bill_number}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`Date: ${new Date(bill.date).toLocaleDateString()}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    // Customer information
    currentY -= 30
    page.drawText('CUSTOMER INFORMATION', {
      x: margin,
      y: currentY,
      size: 14,
      font: primaryBoldFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      lineHeight: fontManager.getTypographySettings('heading').lineHeight,
      letterSpacing: fontManager.getTypographySettings('heading').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('heading').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`Name: ${bill.customer_name}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`NIC: ${bill.customer_nic}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(`Address: ${bill.customer_address}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    // Bill items table
    currentY -= 30
    page.drawText('BILL ITEMS', {
      x: margin,
      y: currentY,
      size: 14,
      font: primaryBoldFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      lineHeight: fontManager.getTypographySettings('heading').lineHeight,
      letterSpacing: fontManager.getTypographySettings('heading').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('heading').wordSpacing,
    })
    
    // Table headers with custom styling and typography
    currentY -= 20
    const columnWidths = [250, 80, 100, 100]
    const headers = ['Product Name', 'Quantity', 'Unit Price', 'Total Price']
    
    headers.forEach((header, index) => {
      let x = margin
      for (let i = 0; i < index; i++) {
        x += columnWidths[i]
      }
      page.drawText(header, {
        x,
        y: currentY,
        size: 12,
        font: secondaryBoldFont,
        color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
        lineHeight: fontManager.getTypographySettings('table').lineHeight,
        letterSpacing: fontManager.getTypographySettings('table').letterSpacing,
        wordSpacing: fontManager.getTypographySettings('table').wordSpacing,
      })
    })
    
    // Table rows with custom styling and typography
    currentY -= 15
    bill.items.forEach(item => {
      if (currentY < margin + 100) {
        // Add new page if content exceeds page height
        page = pdfDoc.addPage([595.28, 841.89])
        currentY = height - margin - 30
      }
      
      let x = margin
      const values = [
        item.product_name,
        item.quantity.toString(),
        item.unit_price.toFixed(2),
        item.total_price.toFixed(2)
      ]
      
      values.forEach((value, index) => {
        page.drawText(value, {
          x,
          y: currentY,
          size: 12,
          font: secondaryFont,
          color: rgb(textColor.r, textColor.g, textColor.b),
          lineHeight: fontManager.getTypographySettings('table').lineHeight,
          letterSpacing: fontManager.getTypographySettings('table').letterSpacing,
          wordSpacing: fontManager.getTypographySettings('table').wordSpacing,
        })
        x += columnWidths[index]
      })
      
      currentY -= 15
    })
    
    // Total amount
    currentY -= 20
    const totalAmount = bill.items.reduce((sum, item) => sum + item.total_price, 0)
    page.drawText(`Total Amount: Rs. ${totalAmount.toFixed(2)}`, {
      x: margin + columnWidths[0] + columnWidths[1] + columnWidths[2],
      y: currentY,
      size: 14,
      font: secondaryBoldFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      lineHeight: fontManager.getTypographySettings('table').lineHeight,
      letterSpacing: fontManager.getTypographySettings('table').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('table').wordSpacing,
    })
    
    // Payment terms
    currentY -= 30
    page.drawText('PAYMENT TERMS', {
      x: margin,
      y: currentY,
      size: 14,
      font: primaryBoldFont,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
      lineHeight: fontManager.getTypographySettings('heading').lineHeight,
      letterSpacing: fontManager.getTypographySettings('heading').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('heading').wordSpacing,
    })
    
    currentY -= 15
    page.drawText(COMPANY_INFO.payment_terms, {
      x: margin,
      y: currentY,
      size: 12,
      font: secondaryFont,
      color: rgb(textColor.r, textColor.g, textColor.b),
      lineHeight: fontManager.getTypographySettings('body').lineHeight,
      letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
      wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
    })
    
    // Add signature field if requested
    if (options.signature) {
      currentY -= 30
      const signatureField = await signatureManager.createSignatureField(pdfDoc, {
        x: margin,
        y: currentY,
        width: 200,
        height: 50,
        pageIndex: page.getIndex(),
        visible: true,
        text: 'Digitally signed by',
        fontSize: 12,
        color: { r: 0, g: 0, b: 0 },
        border: true,
        background: { r: 1, g: 1, b: 1 }
      })
    }
    
    // Add page numbers
    const pages = pdfDoc.getPages()
    pages.forEach((page, index) => {
      const { width, height } = page.getSize()
      page.drawText(`Page ${index + 1} of ${pages.length}`, {
        x: width - margin - 50,
        y: margin,
        size: 10,
        font: secondaryFont,
        color: rgb(textColor.r, textColor.g, textColor.b),
        lineHeight: fontManager.getTypographySettings('body').lineHeight,
        letterSpacing: fontManager.getTypographySettings('body').letterSpacing,
        wordSpacing: fontManager.getTypographySettings('body').wordSpacing,
      })
    })
    
    // Save the PDF
    let pdfBytes = await pdfDoc.save()
    
    // Apply digital signature if requested
    if (options.signature) {
      pdfBytes = await signatureManager.signPDF(pdfBytes, {
        certificateName: options.signature.certificateName,
        password: options.signature.password,
        signatureType: options.signature.type || 'visible',
        appearance: options.signature.appearance,
        timestamp: options.signature.timestamp !== false
      })
    }
    
    return pdfBytes
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error.message}`)
  }
} 