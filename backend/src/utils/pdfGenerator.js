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
                `Motor Number: ${bill.motor_number || 'N/A'}`,
                `Chassis Number: ${bill.chassis_number || 'N/A'}`,
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

            // Ensure all numbers are properly parsed and handle NaN
            const bikePrice = parseFloat(bill.bike_price) || 0;
            const downPayment = parseFloat(bill.down_payment) || 0;
            
            // Check if it's an e-bicycle model - be more specific with model detection
            const isEbicycle = bill.model_name && (
                /cola/i.test(bill.model_name) ||  // Any model with "cola" in name
                /x01/i.test(bill.model_name) ||   // Any model with "x01" in name
                /x-?0?1/i.test(bill.model_name) || // Handle variations like X1, X-01, etc.
                /e-/i.test(bill.model_name) ||    // Any e-bicycle model
                // Specific model checks
                bill.model_name.toUpperCase() === 'TMR-COLA5' ||
                bill.model_name.toUpperCase() === 'TMR-X01'
            );
            
            // For debugging
            console.log(`PDF Generation - Model: ${bill.model_name}, Detected as e-bicycle: ${isEbicycle}`);
            
            // For leasing bills, total amount should be just the down payment
            // For cash bills with RMV, total amount should be bike price + 13000 (if not e-bicycle)
            // For advancement bills, use the stored total_amount
            let totalAmount;
            if (bill.bill_type === 'leasing') {
                totalAmount = downPayment;
            } else if (bill.bill_type === 'cash') {
                totalAmount = isEbicycle ? bikePrice : (bikePrice + 13000);
            } else {
                // For advancement bills, use the stored total_amount
                totalAmount = parseFloat(bill.total_amount) || bikePrice;
            }
            
            // Calculate balance safely - only use when bill type is advance/advancement
            const balanceAmount = (bill.bill_type === 'advance' || bill.bill_type === 'advancement') ? 
                (totalAmount - downPayment) : 0;

            // Table rows - always show bike price
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Bike Price', `${bikePrice.toLocaleString()}/=`],
                font
            )

            // Different rows based on bill type
            if (bill.bill_type === 'advance' || bill.bill_type === 'advancement') {
                // Advancement bill type
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Advancement Amount', `${downPayment.toLocaleString()}/=`],
                    font
                )
                
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Balance Amount', `${balanceAmount.toLocaleString()}/=`],
                    font
                )
                
                if (bill.estimated_delivery_date) {
                    tableY = this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['Estimated Delivery Date', new Date(bill.estimated_delivery_date).toLocaleDateString()],
                        font
                    )
                }
                
                // Total row shows total price
                this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Total Amount', `${totalAmount.toLocaleString()}/=`],
                    boldFont,
                    12,
                    true
                )
            } else if (bill.bill_type === 'leasing') {
                // Leasing bill type
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Down Payment', `${downPayment.toLocaleString()}/=`],
                    font
                )
                
                // Only add RMV charges for non-e-bicycles
                if (!isEbicycle) {
                    tableY = this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['RMV Charge', 'CPZ'],
                        font
                    )
                }
                
                // For leasing bills, the total is JUST the down payment
                // Do NOT add any extra charges to the displayed total
                this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Total Amount', `${downPayment.toLocaleString()}/= (D/P)`],
                    boldFont,
                    12,
                    true
                )
            } else {
                // Cash bill type - special handling for e-bicycles
                
                // Only add RMV charges for non-e-bicycles
                if (!isEbicycle) {
                    tableY = this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['RMV Charge', '13,000/='],
                        font
                    )
                    
                    // For cash bills with RMV, add the RMV charge to the bike price
                    const cashTotalAmount = bikePrice + 13000;
                    
                    // Total row for cash with RMV
                    this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['Total Amount', `${cashTotalAmount.toLocaleString()}/=`],
                        boldFont,
                        12,
                        true
                    )
                } else {
                    // For e-bicycles (cash), total is just the bike price
                    // NO RMV charges should be shown
                    this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['Total Amount', `${bikePrice.toLocaleString()}/=`],
                        boldFont,
                        12,
                        true
                    )
                }
            }

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
            ]
            
            // Add special condition based on bill type
            if (bill.bill_type === 'leasing') {
                terms.push('4. Balance amount will be settled by the leasing company.');
            } else if (bill.bill_type === 'advance' || bill.bill_type === 'advancement') {
                terms.push('4. Balance amount must be paid upon delivery of the vehicle.');
                terms.push(`5. Estimated delivery date: ${bill.estimated_delivery_date ? new Date(bill.estimated_delivery_date).toLocaleDateString() : 'To be confirmed'}`);
            } else {
                // Only add RMV note for non-e-bicycles
                if (!isEbicycle) {
                    terms.push('4. RMV registration will be completed within 30 days.');
                }
            }

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