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
        
        // Draw bill number - handle MongoDB _id properly
        const billId = bill._id || bill.id || 'PREVIEW';
        page.drawText(`Bill No: ${billId}`, {
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
        const startY = 150;
        let y = startY;
        
        page.drawText('Price Details', {
            x: this.margin,
            y,
            size: 14,
            font: boldFont
        });
        
        y -= 30;
        
        // Ensure numeric values and handle decimal values properly
        const formatAmount = (amount) => {
            if (amount === undefined || amount === null) return 'Rs. 0.00';
            // Parse the amount to ensure it's a number and handle decimals correctly
            const numericAmount = parseFloat(amount);
            return isNaN(numericAmount) ? 'Rs. 0.00' : `Rs. ${numericAmount.toFixed(2)}`;
        };
        
        // For leasing bills, show down payment
        if (bill.bill_type?.toUpperCase() === 'LEASING') {
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Bike Price', formatAmount(bill.bike_price)],
                regularFont
            );
            
            y -= 30;
            
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Down Payment', formatAmount(bill.down_payment)],
                regularFont
            );
        } else {
            // For cash bills, show bike price and RMV charge
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Bike Price', formatAmount(bill.bike_price)],
                regularFont
            );
            
            y -= 30;
            
            if (!bill.is_ebicycle) {
                this.drawTableRow(
                    page,
                    this.margin,
                    y,
                    ['RMV Charge', formatAmount(bill.rmv_charge || 13000)],
                    regularFont
                );
                
                y -= 30;
            }
        }
        
        // If it's an advance payment, show advance amount
        if (bill.is_advance_payment) {
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Advance Amount', formatAmount(bill.advance_amount)],
                regularFont
            );
            
            y -= 30;
            
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Balance Amount', formatAmount(bill.balance_amount)],
                regularFont
            );
        } else {
            // Show total amount for all bill types
            this.drawTableRow(
                page,
                this.margin,
                y,
                ['Total Amount', formatAmount(bill.total_amount)],
                regularFont,
                12,
                true
            );
        }
        
        return y - 30; // Return next Y position
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