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

// Predefined colors
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_GRAY_LIGHT = rgb(0.95, 0.95, 0.95);
const COLOR_GRAY = rgb(0.8, 0.8, 0.8);

// Inline logo as base64 (simple TMR logo)
const INLINE_LOGO_BASE64 = `
data:image/png;base64,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
`;

export class PDFGenerator {
    constructor() {
        this.fontManager = fontManager
        this.pageWidth = 595.28;  // A4 width in points
        this.pageHeight = 841.89;  // A4 height in points
        this.margin = 50;
        this.logoPath = path.join(__dirname, '../assets/logo.png')
        
        // Spacing configuration
        this.spacing = {
            lineHeight: 20,
            sectionGap: 40,
            rowGap: 5,
            tableRowHeight: 25,
            paragraphGap: 15,
            signatureSpace: 100
        }
    }

    async generateBill(bill) {
        try {
            // Normalize and validate bill data
            const normalizedBill = this.normalizeBillData(bill);
            
            // Create PDF document
            const pdfDoc = await PDFDocument.create();
            
            // Set document metadata
            pdfDoc.setTitle(`Invoice - ${normalizedBill.bill_number}`);
            pdfDoc.setAuthor(COMPANY_INFO.name);
            pdfDoc.setSubject(`Bill #${normalizedBill.bill_number}`);
            pdfDoc.setKeywords(['invoice', 'bill', 'motorcycle', 'TMR']);
            
            // Add page
            const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
            const { width, height } = page.getSize();
            
            // Embed fonts
            const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Draw content sections
            let yPosition = height - this.margin;
            
            // Header with logo and title
            yPosition = await this.drawHeader(pdfDoc, page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Customer information section
            yPosition = this.drawCustomerInformation(page, width, yPosition - this.spacing.sectionGap, normalizedBill, regularFont, boldFont);
            
            // Vehicle information section
            yPosition = this.drawVehicleInformation(page, width, yPosition - this.spacing.sectionGap, normalizedBill, regularFont, boldFont);
            
            // Price details
            yPosition = this.drawPriceDetails(page, width, yPosition - this.spacing.sectionGap, normalizedBill, regularFont, boldFont);
            
            // Terms and conditions
            yPosition = this.drawTermsAndConditions(page, width, yPosition - this.spacing.sectionGap, normalizedBill, regularFont, boldFont);
            
            // Signatures section
            this.drawSignatures(page, width, this.margin + this.spacing.signatureSpace, normalizedBill, regularFont, boldFont);
            
            return await pdfDoc.save();
        } catch (error) {
            console.error('Error generating bill PDF:', error);
            throw error;
        }
    }

    normalizeBillData(bill) {
        // Default values for all required fields
        return {
            ...bill,
            bill_number: bill.bill_number || bill._id || bill.id || 'PREVIEW',
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

    async drawHeader(pdfDoc, page, width, startY, bill, regularFont, boldFont) {
        try {
            // Center "INVOICE" title
            const titleText = 'INVOICE';
            const titleWidth = boldFont.widthOfTextAtSize(titleText, 18);
            page.drawText(titleText, {
                x: (width - titleWidth) / 2,
                y: startY,
                size: 18,
                font: boldFont,
                color: COLOR_BLACK
            });
            
            // Bill type (CASH/LEASING/ADVANCE)
            const billTypeText = this.getBillTypeText(bill.bill_type);
            const billTypeWidth = boldFont.widthOfTextAtSize(billTypeText, 14);
            page.drawText(billTypeText, {
                x: (width - billTypeWidth) / 2,
                y: startY - 25,
                size: 14,
                font: boldFont,
                color: COLOR_BLACK
            });
            
            // Company information (left side)
            const companyY = startY - 60;
            
            // Try to add logo from base64
            try {
                // Extract the base64 data (removing the data:image/png;base64, prefix)
                const base64Data = INLINE_LOGO_BASE64.trim().split(',')[1];
                const logoBytes = Buffer.from(base64Data, 'base64');
                
                // Embed the logo
                const logoImage = await pdfDoc.embedPng(logoBytes);
                
                // Draw the logo on the left
                page.drawImage(logoImage, {
                    x: this.margin,
                    y: companyY - 35,
                    width: 40,
                    height: 40,
                });
                
                // Company name next to logo
                page.drawText(COMPANY_INFO.name, {
                    x: this.margin + 50,
                    y: companyY,
                    size: 14,
                    font: boldFont,
                    color: COLOR_BLACK
                });
            } catch (logoError) {
                console.error("Error embedding logo:", logoError);
                // Fallback to text-only header
                page.drawText(COMPANY_INFO.name, {
                    x: this.margin,
                    y: companyY,
                    size: 14,
                    font: boldFont,
                    color: COLOR_BLACK
                });
            }
            
            // Company address and dealer info
            page.drawText(COMPANY_INFO.address, {
                x: this.margin,
                y: companyY - 20,
                size: 12,
                font: regularFont,
                color: COLOR_BLACK
            });
            
            page.drawText(COMPANY_INFO.dealer, {
                x: this.margin,
                y: companyY - 40,
                size: 12,
                font: regularFont,
                color: COLOR_BLACK
            });
            
            // Bill details (right side)
            const billNoText = `Bill No: ${bill.bill_number}`;
            const dateText = `Date: ${this.formatDate(bill.bill_date)}`;
            
            const billNoWidth = regularFont.widthOfTextAtSize(billNoText, 12);
            const dateWidth = regularFont.widthOfTextAtSize(dateText, 12);
            
            page.drawText(billNoText, {
                x: width - this.margin - billNoWidth,
                y: companyY,
                size: 12,
                font: regularFont,
                color: COLOR_BLACK
            });
            
            page.drawText(dateText, {
                x: width - this.margin - dateWidth,
                y: companyY - 20,
                size: 12,
                font: regularFont,
                color: COLOR_BLACK
            });
            
            return companyY - 60; // Return position for next section
        } catch (error) {
            console.error('Error drawing header:', error);
            return startY - 120; // Fallback position
        }
    }

    drawCustomerInformation(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Customer Information', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
            color: COLOR_BLACK
        });
        
        // Create customer info table
        const tableData = [
            {label: 'Name', value: bill.customer_name},
            {label: 'NIC', value: bill.customer_nic},
            {label: 'Address', value: bill.customer_address}
        ];
        
        let currentY = startY - 30;
        
        // Draw table rows
        tableData.forEach(({label, value}) => {
            currentY = this.drawTableRow(page, this.margin, currentY, [label, value], regularFont);
        });
        
        return currentY;
    }

    drawVehicleInformation(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Vehicle Information', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
            color: COLOR_BLACK
        });
        
        // Create vehicle info table
        const tableData = [
            {label: 'Model', value: bill.model_name},
            {label: 'Type', value: bill.is_ebicycle ? 'E-bicycle' : 'E-bike'},
            {label: 'Motor Number', value: bill.motor_number},
            {label: 'Chassis Number', value: bill.chassis_number}
        ];
        
        let currentY = startY - 30;
        
        // Draw table rows
        tableData.forEach(({label, value}) => {
            currentY = this.drawTableRow(page, this.margin, currentY, [label, value], regularFont);
        });
        
        return currentY;
    }

    drawPriceDetails(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Price Details:', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
            color: COLOR_BLACK
        });
        
        // Draw payment details table
        let currentY = startY - 30;
        
        // Draw price rows based on bill type and vehicle type
        const bikePrice = bill.bike_price;
        const rmvCharge = bill.is_ebicycle ? 0 : 13000;
        const totalAmount = bikePrice + rmvCharge;
        
        // Bike price row
        currentY = this.drawTableRow(page, this.margin, currentY, 
            ['Bike Price', this.formatAmount(bikePrice)], regularFont);
        
        // RMV charge row (if applicable)
        if (!bill.is_ebicycle) {
            currentY = this.drawTableRow(page, this.margin, currentY, 
                ['RMV Charge', this.formatAmount(rmvCharge)], regularFont);
        }
        
        // Additional rows based on bill type
        if (bill.bill_type === 'LEASING') {
            currentY = this.drawTableRow(page, this.margin, currentY,
                ['Down Payment', this.formatAmount(bill.down_payment)], regularFont);
                
            // Total row for leasing (down payment)
            currentY = this.drawTableRow(page, this.margin, currentY,
                ['Total Amount', `${this.formatAmount(bill.down_payment)} (D/P)`], boldFont, true);
        }
        else if (bill.bill_type === 'ADVANCE') {
            currentY = this.drawTableRow(page, this.margin, currentY,
                ['Advance Amount', this.formatAmount(bill.advance_amount)], regularFont);
                
            const balance = totalAmount - bill.advance_amount;
            currentY = this.drawTableRow(page, this.margin, currentY,
                ['Balance Amount', this.formatAmount(balance)], regularFont);
                
            // Total row for advance payment
            currentY = this.drawTableRow(page, this.margin, currentY,
                ['Total Amount', this.formatAmount(totalAmount)], boldFont, true);
        }
        else {
            // Total row for cash bill
            currentY = this.drawTableRow(page, this.margin, currentY,
                ['Total Amount', this.formatAmount(totalAmount)], boldFont, true);
        }
        
        return currentY;
    }

    drawTermsAndConditions(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Terms and Conditions:', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK
        });
        
        // Terms as bullet points
        const terms = [
            '1. All prices are in Sri Lankan Rupees.',
            '2. Chassis Number is valid for 30 days from the issue date.',
            '3. This is a computer-generated document and does not require a signature.',
            '4. Please retain this invoice for future reference.'
        ];
        
        // Add bill-specific terms
        if (bill.bill_type === 'LEASING') {
            terms.push('5. Balance amount will be settled by the leasing company.');
        } else if (bill.bill_type === 'ADVANCE' && bill.estimated_delivery_date) {
            terms.push(`5. Estimated delivery date: ${this.formatDate(bill.estimated_delivery_date)}`);
        }
        
        // Draw each term with proper spacing
        let currentY = startY - 20;
        terms.forEach(term => {
            page.drawText(term, {
                x: this.margin,
                y: currentY,
                size: 10,
                font: regularFont,
                color: COLOR_BLACK
            });
            currentY -= 20;
        });
        
        return currentY;
    }

    drawSignatures(page, width, startY, bill, regularFont, boldFont) {
        // Fixed position from bottom of page
        const signatureY = 120; // Fixed position from bottom
        
        // Left signature (Dealer)
        page.drawLine({
            start: { x: this.margin, y: signatureY },
            end: { x: this.margin + 150, y: signatureY },
            thickness: 1,
            color: COLOR_BLACK
        });
        
        page.drawText('Authorized Signature', {
            x: this.margin + 15,
            y: signatureY - 15,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK
        });
        
        // Right signature (Customer)
        page.drawLine({
            start: { x: width - this.margin - 150, y: signatureY },
            end: { x: width - this.margin, y: signatureY },
            thickness: 1,
            color: COLOR_BLACK
        });
        
        page.drawText('Customer Signature', {
            x: width - this.margin - 115,
            y: signatureY - 15,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK
        });
        
        // Thank you message (center aligned)
        const thankYouText = 'Thank you for your business!';
        const thankYouWidth = regularFont.widthOfTextAtSize(thankYouText, 12);
        
        page.drawText(thankYouText, {
            x: (width - thankYouWidth) / 2,
            y: signatureY - 40,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK
        });
    }

    drawTableRow(page, x, y, columns, font, isHighlighted = false) {
        const colWidths = [150, 250];
        const rowHeight = this.spacing.tableRowHeight;
        const padding = 10;
        
        // Background and borders
        page.drawRectangle({
            x,
            y: y - rowHeight,
            width: colWidths[0] + colWidths[1],
            height: rowHeight,
            borderWidth: 1,
            borderColor: COLOR_BLACK,
            color: isHighlighted ? COLOR_GRAY_LIGHT : COLOR_WHITE,
        });
        
        // Vertical divider
        page.drawLine({
            start: { x: x + colWidths[0], y },
            end: { x: x + colWidths[0], y: y - rowHeight },
            thickness: 1,
            color: COLOR_BLACK
        });
        
        // Column text
        columns.forEach((text, index) => {
            const textX = x + (index === 0 ? padding : colWidths[0] + padding);
            const textY = y - (rowHeight / 2) - 6; // Vertical centering
            
            page.drawText(text || '', {
                x: textX,
                y: textY,
                size: 12,
                font,
                color: COLOR_BLACK
            });
        });
        
        return y - rowHeight;
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

    async getModelIsEbicycle(modelName) {
        try {
            if (!modelName) return false;
            
            // Special case handling for e-bicycles
            const modelNameUpper = modelName.toUpperCase();
            if (modelNameUpper.includes('COLA5') || modelNameUpper.includes('X01')) {
                console.log(`Model ${modelName} identified as e-bicycle by name pattern`);
                return true;
            }
            
            // Database lookup
            try {
                const db = getDatabase();
                const result = await db.query(
                    'SELECT is_ebicycle FROM bike_models WHERE model_name = $1',
                    [modelName]
                );
                
                if (result.rows.length > 0) {
                    return result.rows[0].is_ebicycle;
                }
            } catch (dbError) {
                console.error('Database error checking model type:', dbError);
                // Continue with fallback
            }
            
            // Fallback to false
            return false;
        } catch (error) {
            console.error('Error determining if model is e-bicycle:', error);
            return false;
        }
    }
}

export default PDFGenerator 