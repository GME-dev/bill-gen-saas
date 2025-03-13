import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { fontManager } from './fontManager.js'
import { COMPANY_INFO, PDF_SETTINGS, BRANDING_CONFIG } from '../config/constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class PDFGenerator {
    constructor() {
        this.fontManager = fontManager
        this.pageWidth = 595.28;  // A4 width in points
        this.pageHeight = 841.89;  // A4 height in points
        this.margin = 50;
        this.logoPath = path.join(__dirname, '../assets/logo.png')
    }

    drawTableRow(page, x, y, columns, font, fontSize = 12, bold = false) {
        const colWidths = [200, 200];  // Adjust column widths as needed
        const padding = 10;
        const rowHeight = 25;

        // Draw cell borders and background
        page.drawRectangle({
            x,
            y: y - rowHeight,
            width: colWidths[0] + colWidths[1],
            height: rowHeight,
            borderWidth: 1,
            borderColor: rgb(0.8, 0.8, 0.8),
            color: bold ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1),
        });

        // Draw vertical line between columns
        page.drawLine({
            start: { x: x + colWidths[0], y },
            end: { x: x + colWidths[0], y: y - rowHeight },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        // Draw text in cells
        columns.forEach((text, index) => {
            page.drawText(text, {
                x: x + (index === 0 ? padding : colWidths[0] + padding),
                y: y - rowHeight + padding,
                size: fontSize,
                font,
            });
        });

        return y - rowHeight;
    }

    async generateBill(bill) {
        try {
            const pdfDoc = await PDFDocument.create()
            const page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
            const { width, height } = page.getSize()
            
            // Get the standard font
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
            
            // Bill details (right aligned)
            const billNoText = `Bill No: ${bill.id}`
            const billNoWidth = font.widthOfTextAtSize(billNoText, 12)
            page.drawText(billNoText, {
                x: width - this.margin - billNoWidth,
                y: height - this.margin,
                size: 12,
                font: boldFont,
            })

            const dateText = `Date: ${new Date(bill.bill_date).toLocaleDateString()}`
            const dateWidth = font.widthOfTextAtSize(dateText, 12)
            page.drawText(dateText, {
                x: width - this.margin - dateWidth,
                y: height - this.margin - 20,
                size: 12,
                font,
            })
            
            try {
                // Load and embed the logo image from local file
                const logoImageBytes = await fs.promises.readFile(this.logoPath)
                const logoImage = await pdfDoc.embedPng(logoImageBytes)
                
                // Calculate logo dimensions (maintain aspect ratio)
                const logoWidth = 70
                const logoHeight = logoWidth
                
                // Draw logo at left side with adjusted position
                page.drawImage(logoImage, {
                    x: this.margin,
                    y: height - this.margin - logoHeight + 25,  // Adjusted position
                    width: logoWidth,
                    height: logoHeight,
                })
            } catch (error) {
                console.error('Error embedding logo:', error)
            }

            // Draw company name with adjusted position and size
            page.drawText('TMR TRADING LANKA (PVT) LTD', {
                x: this.margin + 85,  // Adjusted position
                y: height - this.margin - 20,  // Aligned with bill number
                size: 18,  // Increased size
                font: boldFont,
            })

            // Dealer information with adjusted spacing
            page.drawText('GUNAWARDANA MOTORS, EMBILIPITIYA', {
                x: this.margin,
                y: height - this.margin - 60,  // Adjusted spacing
                size: 14,
                font: boldFont,
            })

            page.drawText('AUTHORIZED DEALER - EMBILIPITIYA', {
                x: this.margin,
                y: height - this.margin - 80,  // Adjusted spacing
                size: 12,
                font: boldFont,
            })

            // Customer Information with adjusted spacing
            const customerY = height - this.margin - 130  // Increased gap after header
            page.drawText('Customer Details:', {
                x: this.margin,
                y: customerY,
                size: 14,
                font: boldFont,
            })

            const customerDetails = [
                `Name: ${bill.customer_name}`,
                `NIC: ${bill.customer_nic}`,
                `Address: ${bill.customer_address}`,
            ]

            customerDetails.forEach((line, index) => {
                page.drawText(line, {
                    x: this.margin,
                    y: customerY - 25 - (index * 20),
                    size: 12,
                    font,
                })
            })

            // Vehicle Information
            const vehicleY = customerY - 120
            page.drawText('Vehicle Details:', {
                x: this.margin,
                y: vehicleY,
                size: 14,
                font: boldFont,
            })

            const vehicleDetails = [
                `Model: ${bill.model_name}`,
                `Motor Number: ${bill.motor_number}`,
                `Chassis Number: ${bill.chassis_number}`,
            ]

            vehicleDetails.forEach((line, index) => {
                page.drawText(line, {
                    x: this.margin,
                    y: vehicleY - 25 - (index * 20),
                    size: 12,
                    font,
                })
            })

            // Payment Information
            const paymentY = vehicleY - 120
            page.drawText('Payment Details:', {
                x: this.margin,
                y: paymentY,
                size: 14,
                font: boldFont,
            })

            // Draw payment details table
            let tableY = paymentY - 30
            
            // Table header
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Description', 'Amount (Rs.)'],
                boldFont,
                12,
                true
            )

            // Table rows
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Bike Price', `${parseInt(bill.bike_price).toLocaleString()}/=`],
                font
            )

            // RMV section
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['RMV Charge', bill.bill_type === 'cash' ? '13,000/=' : 'CPZ'],
                font
            )

            if (bill.bill_type === 'leasing') {
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Down Payment', `${parseInt(bill.down_payment).toLocaleString()}/=`],
                    font
                )
            }

            // Calculate total amount
            const totalAmount = bill.bill_type === 'leasing' 
                ? parseInt(bill.down_payment)
                : parseInt(bill.bike_price) + 13000;

            // Total row with (D/P) for leasing
            this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Total Amount', bill.bill_type === 'leasing' ? 
                    `${parseInt(bill.down_payment).toLocaleString()}/= (D/P)` : 
                    `${totalAmount.toLocaleString()}/=`],
                boldFont,
                12,
                true
            )

            // Terms and Conditions
            const termsY = tableY - 80
            page.drawText('Terms and Conditions:', {
                x: this.margin,
                y: termsY,
                size: 12,
                font: boldFont,
            })

            const terms = [
                '1. All prices are inclusive of taxes.',
                '2. Warranty is subject to terms and conditions.',
                '3. This is a computer-generated bill.',
                bill.bill_type === 'leasing' ? 
                    '4. Balance amount will be settled by the leasing company.' :
                    '4. RMV registration will be completed within 30 days.'
            ]

            terms.forEach((line, index) => {
                page.drawText(line, {
                    x: this.margin,
                    y: termsY - 20 - (index * 15),
                    size: 10,
                    font,
                    color: rgb(0.3, 0.3, 0.3),
                })
            })

            // Footer
            page.drawText('Thank you for your business!', {
                x: width / 2 - 70,
                y: this.margin + 15,
                size: 12,
                font: boldFont,
            })

            // Signatures
            const signatureY = this.margin + 60
            
            // Dealer signature
            page.drawLine({
                start: { x: this.margin, y: signatureY },
                end: { x: this.margin + 150, y: signatureY },
                thickness: 1,
                color: rgb(0, 0, 0),
            })
            
            page.drawText('Dealer Signature', {
                x: this.margin,
                y: signatureY - 15,
                size: 10,
                font,
            })

            // Rubber stamp line
            page.drawLine({
                start: { x: width - this.margin - 150, y: signatureY },
                end: { x: width - this.margin, y: signatureY },
                thickness: 1,
                color: rgb(0, 0, 0),
            })
            
            page.drawText('Rubber Stamp', {
                x: width - this.margin - 150,
                y: signatureY - 15,
                size: 10,
                font,
            })

            // Generate PDF
            return await pdfDoc.save()
        } catch (error) {
            console.error('Error generating PDF:', error)
            throw new Error(`Failed to generate PDF: ${error.message}`)
        }
    }
}

export default PDFGenerator 