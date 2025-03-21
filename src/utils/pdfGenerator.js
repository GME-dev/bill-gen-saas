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
            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();
            
            // Embed fonts
            const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            // Add a page
            const page = pdfDoc.addPage([612, 792]);
            
            // Add company header
            this.drawHeader(page, boldFont);
            
            // Draw bill details
            const billDetailsEndY = this.drawBillDetails(page, bill, regularFont, boldFont);
            
            // Draw customer information
            const customerInfoEndY = this.drawCustomerInfo(page, bill, regularFont, boldFont);
            
            // Draw vehicle information
            const vehicleInfoEndY = this.drawVehicleInfo(page, bill, regularFont, boldFont);
            
            // Draw price details
            const priceDetailsEndY = this.drawPriceDetails(page, bill, regularFont, boldFont);
            
            // Draw footer
            this.drawFooter(page, regularFont);
            
            // Save the PDF
            const pdfBytes = await pdfDoc.save();
            
            return Buffer.from(pdfBytes);
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        }
    }

    drawVehicleInfo(page, bill, font, boldFont) {
        const startY = 300;
        let y = startY;
        
        page.drawText('Vehicle Information', {
            x: this.margin,
            y,
            size: 14,
            font: boldFont
        });
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Model', bill.model_name],
            font
        );
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Type', bill.is_ebicycle ? 'E-bicycle' : 'E-bike'],
            font
        );
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Motor Number', bill.motor_number],
            font
        );
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Chassis Number', bill.chassis_number],
            font
        );
        
        return y - 30; // Return next Y position
    }

    drawHeader(page, boldFont) {
        const { width, height } = page.getSize();
        
        // Draw bill title
        page.drawText('INVOICE', {
            x: width / 2 - 50,
            y: height - 50,
            size: 24,
            font: boldFont
        });
        
        // Draw company name
        page.drawText('TMR TRADING LANKA (PVT) LTD', {
            x: this.margin,
            y: height - 100,
            size: 16,
            font: boldFont
        });
        
        // Draw company address
        page.drawText('GUNAWARDANA MOTORS, EMBILIPITIYA', {
            x: this.margin,
            y: height - 120,
            size: 12,
            font: boldFont
        });
        
        // Draw authorized dealer
        page.drawText('AUTHORIZED DEALER - EMBILIPITIYA', {
            x: this.margin,
            y: height - 140,
            size: 12,
            font: boldFont
        });
        
        return height - 160;
    }

    drawBillDetails(page, bill, regularFont, boldFont) {
        const { width, height } = page.getSize();
        
        // Draw bill number
        page.drawText(`Bill No: ${bill.bill_number || bill._id}`, {
            x: width - 200,
            y: height - 100,
            size: 12,
            font: boldFont
        });
        
        // Format date safely
        const billDate = bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : 'N/A';
        page.drawText(`Date: ${billDate}`, {
            x: width - 200,
            y: height - 120,
            size: 12,
            font: regularFont
        });
        
        // Draw bill type
        const billTypeText = bill.bill_type?.toUpperCase() === 'LEASING' ? 'LEASING BILL' : 'CASH BILL';
        page.drawText(billTypeText, {
            x: width / 2 - 50,
            y: height - 80,
            size: 14,
            font: boldFont
        });
        
        return height - 160;
    }

    drawCustomerInfo(page, bill, regularFont, boldFont) {
        const startY = 600;
        let y = startY;
        
        page.drawText('Customer Information', {
            x: this.margin,
            y,
            size: 14,
            font: boldFont
        });
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Name', bill.customer_name || 'N/A'],
            regularFont
        );
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['NIC', bill.customer_nic || 'N/A'],
            regularFont
        );
        
        y -= 30;
        
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Address', bill.customer_address || 'N/A'],
            regularFont
        );
        
        return y - 30;
    }

    drawPriceDetails(page, bill, regularFont, boldFont) {
        const startY = 400;
        let y = startY;
        
        page.drawText('Payment Details', {
            x: this.margin,
            y,
            size: 14,
            font: boldFont
        });
        
        y -= 30;
        
        // Draw table header
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Description', 'Amount'],
            boldFont,
            12,
            true
        );
        
        y -= 30;
        
        // Draw bike price
        const bikePrice = bill.bike_price ? `Rs. ${parseInt(bill.bike_price).toLocaleString()}` : 'Rs. 0';
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Bike Price', bikePrice],
            regularFont
        );
        
        y -= 30;
        
        // Add RMV charge based on type and model
        if (!bill.is_ebicycle) {
            if (bill.bill_type?.toUpperCase() === 'CASH') {
                this.drawTableRow(
                    page,
                    this.margin,
                    y,
                    ['RMV Charge', 'Rs. 13,000'],
                    regularFont
                );
                y -= 30;
            } else if (bill.bill_type?.toUpperCase() === 'LEASING') {
                this.drawTableRow(
                    page,
                    this.margin,
                    y,
                    ['RMV Charge', 'CPZ'],
                    regularFont
                );
                y -= 30;
            }
        }
        
        // Handle down payment for lease
        if (bill.bill_type?.toUpperCase() === 'LEASING') {
            const downPayment = bill.down_payment ? `Rs. ${parseInt(bill.down_payment).toLocaleString()}` : 'Rs. 0';
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Down Payment', downPayment],
                regularFont
            );
            y -= 30;
        }
        
        // Handle advance payment
        if (bill.is_advance_payment) {
            const advanceAmount = bill.advance_amount ? `Rs. ${parseInt(bill.advance_amount).toLocaleString()}` : 'Rs. 0';
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Advance Amount', advanceAmount],
                regularFont
            );
            y -= 30;
            
            if (bill.balance_amount) {
                const balanceAmount = `Rs. ${parseInt(bill.balance_amount).toLocaleString()}`;
                this.drawTableRow(
                    page,
                    this.margin,
                    y,
                    ['Balance Amount', balanceAmount],
                    regularFont
                );
                y -= 30;
            }
        }
        
        // Draw total amount
        const totalAmount = bill.total_amount ? `Rs. ${parseInt(bill.total_amount).toLocaleString()}` : 'Rs. 0';
        this.drawTableRow(
            page,
            this.margin,
            y,
            ['Total Amount', totalAmount],
            boldFont
        );
        
        return y - 30;
    }

    drawFooter(page, regularFont) {
        const { width, height } = page.getSize();
        
        // Terms and conditions
        page.drawText('Terms and Conditions:', {
            x: this.margin,
            y: 200,
            size: 12,
            font: regularFont
        });
        
        const terms = [
            '1. All prices are in Sri Lankan Rupees.',
            '2. This invoice is valid for 30 days from the issue date.',
            '3. This is a computer-generated document and does not require a signature.',
            '4. Please retain this invoice for future reference.'
        ];
        
        terms.forEach((term, index) => {
            page.drawText(term, {
                x: this.margin,
                y: 180 - (index * 15),
                size: 10,
                font: regularFont
            });
        });
        
        // Signatures
        page.drawLine({
            start: { x: this.margin, y: 80 },
            end: { x: this.margin + 150, y: 80 },
            thickness: 1
        });
        
        page.drawText('Authorized Signature', {
            x: this.margin + 30,
            y: 65,
            size: 10,
            font: regularFont
        });
        
        page.drawLine({
            start: { x: width - this.margin - 150, y: 80 },
            end: { x: width - this.margin, y: 80 },
            thickness: 1
        });
        
        page.drawText('Customer Signature', {
            x: width - this.margin - 120,
            y: 65,
            size: 10,
            font: regularFont
        });
        
        // Thank you message
        page.drawText('Thank you for your business!', {
            x: width / 2 - 80,
            y: 30,
            size: 12,
            font: regularFont
        });
        
        return 0;
    }
}

export default PDFGenerator 