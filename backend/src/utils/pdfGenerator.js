import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { fontManager } from './fontManager.js'
import { COMPANY_INFO, PDF_SETTINGS, BRANDING_CONFIG } from '../config/constants.js'
import { getDatabase } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class PDFGenerator {
    constructor() {
        this.fontManager = fontManager
        this.pageWidth = 595.28;  // A4 width in points
        this.pageHeight = 841.89;  // A4 height in points
        this.margin = 50;
        this.logoPath = path.join(__dirname, '../assets/logo.png')
        
        // Better spacing configuration
        this.spacing = {
            lineHeight: 20,        // Standard line height
            sectionGap: 40,        // Gap between major sections
            rowGap: 5,             // Gap between table rows
            paragraphGap: 15,      // Gap between paragraphs
            signatureSpace: 80     // Space for signatures
        }
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
            borderColor: rgb(0, 0, 0),  // Changed to black for more visible borders
            color: rgb(1, 1, 1),
        });

        // Draw vertical line between columns
        page.drawLine({
            start: { x: x + colWidths[0], y },
            end: { x: x + colWidths[0], y: y - rowHeight },
            thickness: 1,
            color: rgb(0, 0, 0),  // Changed to black
        });

        // Draw text in cells with proper vertical alignment
        columns.forEach((text, index) => {
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textX = x + (index === 0 ? padding : colWidths[0] + padding);
            
            // Position text with proper vertical center alignment
            const textY = y - rowHeight + (rowHeight - fontSize) / 2;
            
            page.drawText(text || '', {
                x: textX,
                y: textY,
                size: fontSize,
                font,
            });
        });

        return y - rowHeight;
    }

    async getModelIsEbicycle(modelName) {
        try {
            // 🔥🔥🔥 NUCLEAR OVERRIDE - ANY MODEL NAME CONTAINING COLA5 IS ALWAYS E-BICYCLE 🔥🔥🔥
            // This is the absolute highest priority override
            const modelString = String(modelName || '');
            if (
                modelString.toLowerCase().includes('cola5') || 
                modelString.toUpperCase().includes('COLA5') ||
                modelString.includes('COLA5') || 
                modelString.includes('cola5')
            ) {
                console.log(`[🔥 NUCLEAR OVERRIDE 🔥] Model ${modelName} contains 'COLA5' - FORCING e-bicycle=true`);
                console.log(`[🔥 NUCLEAR OVERRIDE 🔥] This will ALWAYS prevent RMV charges for this bill!`);
                return true;
            }
            
            // EMERGENCY OVERRIDE FOR COLA5
            const upperModelName = (modelName || '').toString().trim().toUpperCase();
            if (upperModelName.includes('COLA5') || upperModelName.includes('X01')) {
                console.log(`[EMERGENCY OVERRIDE] Forcing model ${modelName} to be an e-bicycle`);
                return true;
            }
            
            // Try to get the is_ebicycle flag from the database
            const db = getDatabase();
            const result = await db.query(
                'SELECT is_ebicycle FROM bike_models WHERE model_name = $1',
                [modelName]
            );
            
            if (result.rows.length > 0) {
                console.log(`[DB INFO] Model ${modelName} found in database: is_ebicycle = ${result.rows[0].is_ebicycle}`);
                return result.rows[0].is_ebicycle;
            }
            
            // If not found, try a LIKE query
            const likeResult = await db.query(
                "SELECT is_ebicycle FROM bike_models WHERE model_name ILIKE $1",
                [`%${modelName}%`]
            );
            
            if (likeResult.rows.length > 0) {
                console.log(`[DB INFO] Model similar to ${modelName} found in database: is_ebicycle = ${likeResult.rows[0].is_ebicycle}`);
                return likeResult.rows[0].is_ebicycle;
            }
            
            console.log(`[DB WARNING] Model ${modelName} not found in database, falling back to string matching`);
            return null;
        } catch (error) {
            console.error(`[DB ERROR] Error getting is_ebicycle for model ${modelName}:`, error);
            return null;
        }
    }

    async generateBill(bill) {
        try {
            // Validate and normalize bill data
            const normalizedBill = this.normalizeBillData(bill);
            
            // Generate PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
            const { width, height } = page.getSize();
            
            // Embed fonts
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            // Draw header section
            this.drawHeader(page, width, height, normalizedBill, font, boldFont);
            
            // Draw customer information
            let currentY = this.drawCustomerInfo(page, width, height - 150, normalizedBill, font, boldFont);
            
            // Draw vehicle information
            currentY = this.drawVehicleInfo(page, width, currentY - 40, normalizedBill, font, boldFont);
            
            // Draw price details
            currentY = this.drawPriceDetails(page, width, currentY - 40, normalizedBill, font, boldFont);
            
            // Draw terms and signature - pass the currentY so it knows where to start
            this.drawTermsAndSignature(page, width, currentY - 40, normalizedBill, font, boldFont);
            
            return await pdfDoc.save();
        } catch (error) {
            console.error('Error generating bill PDF:', error);
            throw error;
        }
    }

    normalizeBillData(bill) {
        // Ensure all required fields have default values
        return {
            ...bill,
            bill_number: bill.bill_number || bill.id || 'PREVIEW',
            bill_date: bill.bill_date || new Date(),
            customer_name: bill.customer_name || 'N/A',
            customer_nic: bill.customer_nic || 'N/A',
            customer_address: bill.customer_address || 'N/A',
            model_name: bill.model_name || 'N/A',
            motor_number: bill.motor_number || 'N/A',
            chassis_number: bill.chassis_number || 'N/A',
            bike_price: parseFloat(bill.bike_price) || 0,
            bill_type: (bill.bill_type || 'CASH').toUpperCase(),
            is_ebicycle: bill.is_ebicycle || false,
            down_payment: parseFloat(bill.down_payment) || 0,
            advance_amount: parseFloat(bill.advance_amount) || 0,
            estimated_delivery_date: bill.estimated_delivery_date || null
        };
    }

    drawHeader(page, width, height, bill, font, boldFont) {
        // Center "INVOICE" text
        const invoiceText = 'INVOICE';
        const invoiceWidth = boldFont.widthOfTextAtSize(invoiceText, 16);
        page.drawText(invoiceText, {
            x: (width - invoiceWidth) / 2,
            y: height - this.margin,
            size: 16,
            font: boldFont,
        });

        // Bill type under INVOICE
        const billTypeText = this.getBillTypeText(bill.bill_type);
        const billTypeWidth = boldFont.widthOfTextAtSize(billTypeText, 14);
        page.drawText(billTypeText, {
            x: (width - billTypeWidth) / 2,
            y: height - this.margin - 25,
            size: 14,
            font: boldFont,
        });

        // Company details (left side)
        const companyY = height - this.margin - 60;
        page.drawText(COMPANY_INFO.name, {
            x: this.margin,
            y: companyY,
            size: 14,
            font: boldFont,
        });

        page.drawText(COMPANY_INFO.address, {
            x: this.margin,
            y: companyY - 20,
            size: 12,
            font: font,
        });

        page.drawText(COMPANY_INFO.dealer, {
            x: this.margin,
            y: companyY - 35,
            size: 12,
            font: font,
        });

        // Bill details (right side)
        const billNoText = `Bill No: ${bill.bill_number}`;
        const dateText = `Date: ${this.formatDate(bill.bill_date)}`;
        
        const billNoWidth = font.widthOfTextAtSize(billNoText, 12);
        const dateWidth = font.widthOfTextAtSize(dateText, 12);
        
        page.drawText(billNoText, {
            x: width - this.margin - billNoWidth,
            y: companyY,
            size: 12,
            font: font,
        });

        page.drawText(dateText, {
            x: width - this.margin - dateWidth,
            y: companyY - 20,
            size: 12,
            font: font,
        });
    }

    drawCustomerInfo(page, width, startY, bill, font, boldFont) {
        // Section title
        page.drawText('Customer Information', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
        });

        // Customer details table
        let currentY = startY - 30;
        const customerDetails = [
            ['Name', bill.customer_name],
            ['NIC', bill.customer_nic],
            ['Address', bill.customer_address]
        ];

        customerDetails.forEach(([label, value]) => {
            currentY = this.drawTableBorderedRow(page, this.margin, currentY, [label, value], font);
        });

        return currentY;
    }

    drawVehicleInfo(page, width, startY, bill, font, boldFont) {
        // Section title
        page.drawText('Vehicle Information', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
        });

        // Vehicle details table
        let currentY = startY - 30;
        const vehicleDetails = [
            ['Model', bill.model_name],
            ['Type', bill.is_ebicycle ? 'E-bicycle' : 'E-bike'],
            ['Motor Number', bill.motor_number],
            ['Chassis Number', bill.chassis_number]
        ];

        vehicleDetails.forEach(([label, value]) => {
            currentY = this.drawTableBorderedRow(page, this.margin, currentY, [label, value], font);
        });

        return currentY;
    }

    drawPriceDetails(page, width, startY, bill, font, boldFont) {
        // Section title
        page.drawText('Price Details:', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
        });

        // Calculate amounts
        const bikePrice = bill.bike_price;
        const rmvCharge = bill.is_ebicycle ? 0 : 13000;
        const totalAmount = bikePrice + rmvCharge;

        // Price details table
        let currentY = startY - 30;
        
        // Bike price row
        currentY = this.drawTableBorderedRow(page, this.margin, currentY,
            ['Bike Price', this.formatAmount(bikePrice)], font);

        // RMV charge row (if applicable)
        if (!bill.is_ebicycle) {
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['RMV Charge', this.formatAmount(rmvCharge)], font);
        }

        // For leasing bills
        if (bill.bill_type === 'LEASING') {
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['Down Payment', this.formatAmount(bill.down_payment)], font);
            
            // Total is down payment for leasing
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['Total Amount', `${this.formatAmount(bill.down_payment)} (D/P)`], boldFont, true);
        }
        // For advance payment bills
        else if (bill.bill_type === 'ADVANCE') {
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['Advance Amount', this.formatAmount(bill.advance_amount)], font);
            
            const balance = totalAmount - bill.advance_amount;
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['Balance Amount', this.formatAmount(balance)], font);
            
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['Total Amount', this.formatAmount(totalAmount)], boldFont, true);
        }
        // For cash bills
        else {
            currentY = this.drawTableBorderedRow(page, this.margin, currentY,
                ['Total Amount', this.formatAmount(totalAmount)], boldFont, true);
        }

        return currentY;
    }

    drawTermsAndSignature(page, width, startY, bill, font, boldFont) {
        const { height } = page.getSize();
        
        // Add proper spacing between sections
        startY = startY - 40;
        
        // Terms and conditions
        page.drawText('Terms and Conditions:', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
        });

        const terms = [
            '1. All prices are in Sri Lankan Rupees.',
            '2. Chassis Number is valid for 30 days from the issue date.',
            '3. This is a computer-generated document and does not require a signature.',
            '4. Please retain this invoice for future reference.'
        ];

        if (bill.bill_type === 'LEASING') {
            terms.push('5. Balance amount will be settled by the leasing company.');
        } else if (bill.bill_type === 'ADVANCE' && bill.estimated_delivery_date) {
            terms.push(`5. Estimated delivery date: ${this.formatDate(bill.estimated_delivery_date)}`);
        }

        terms.forEach((term, index) => {
            page.drawText(term, {
                x: this.margin,
                y: startY - ((index + 1) * 20),
                size: 10,
                font: font,
            });
        });

        // FIXED SIGNATURE POSITION: Always 100 units from bottom of page
        const signatureY = 100;
        
        // Draw signature labels FIRST
        page.drawText('Authorized Signature', {
            x: this.margin + 10,
            y: signatureY - 15,
            size: 10,
            font: font,
        });

        page.drawText('Customer Signature', {
            x: width - this.margin - 110,
            y: signatureY - 15,
            size: 10,
            font: font,
        });
        
        // Then draw signature lines ABOVE the labels
        page.drawLine({
            start: { x: this.margin, y: signatureY },
            end: { x: this.margin + 150, y: signatureY },
            thickness: 1,
            color: rgb(0, 0, 0),
        });

        page.drawLine({
            start: { x: width - this.margin - 150, y: signatureY },
            end: { x: width - this.margin, y: signatureY },
            thickness: 1,
            color: rgb(0, 0, 0),
        });

        // Thank you message - properly spaced from signatures
        const thankYouText = 'Thank you for your business!';
        const thankYouWidth = font.widthOfTextAtSize(thankYouText, 12);
        page.drawText(thankYouText, {
            x: (width - thankYouWidth) / 2,
            y: signatureY - 40,
            size: 12,
            font: boldFont,
        });
    }

    getBillTypeText(billType) {
        switch (billType) {
            case 'LEASING':
                return 'LEASING BILL';
            case 'ADVANCE':
                return 'ADVANCE PAYMENT';
            default:
                return 'CASH BILL';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'N/A';
        }
    }

    formatAmount(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return 'Rs. 0.00';
        }
        return `Rs. ${amount.toLocaleString()}.00`;
    }

    // Helper method to draw table rows with borders - improved version
    drawTableBorderedRow(page, x, y, columns, font, isTotal = false) {
        const colWidths = [150, 250];
        const rowHeight = 25;
        const padding = 10;

        // Draw outer rectangle
        page.drawRectangle({
            x,
            y: y - rowHeight,
            width: colWidths[0] + colWidths[1],
            height: rowHeight,
            borderWidth: 1,
            borderColor: rgb(0, 0, 0),
            color: isTotal ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1),
        });

        // Draw vertical divider
        page.drawLine({
            start: { x: x + colWidths[0], y },
            end: { x: x + colWidths[0], y: y - rowHeight },
            thickness: 1,
            color: rgb(0, 0, 0),
        });

        // Draw text
        columns.forEach((text, index) => {
            const textX = x + (index === 0 ? padding : colWidths[0] + padding);
            const textY = y - rowHeight + (rowHeight - 12) / 2;
            
            page.drawText(text || '', {
                x: textX,
                y: textY,
                size: 12,
                font: font,
            });
        });

        return y - rowHeight;
    }
}

export default PDFGenerator 