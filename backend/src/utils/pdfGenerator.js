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
const COLOR_GRAY_DARK = rgb(0.4, 0.4, 0.4);
const COLOR_ACCENT = rgb(0.0, 0.3, 0.6); // Deep blue for accent elements

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
            lineHeight: 15,           // Standard line height
            paragraphSpace: 10,       // Space between paragraphs
            sectionSpace: 30,         // Space between sections
            tableRowHeight: 25,       // Height of table rows
            columnPadding: 8,         // Padding inside table columns
            tableBorderWidth: 0.75,   // Width of table borders
        };
    }

    async generateBill(bill) {
        try {
            // Create a normalized bill object with defaults for missing values
            const normalizedBill = {
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
                down_payment: parseFloat(bill.down_payment) || 0,
                advance_amount: parseFloat(bill.advance_amount) || 0,
                estimated_delivery_date: bill.estimated_delivery_date || null
            };

            // Determine if this is an e-bicycle based on model name if not provided
            if (bill.is_ebicycle === undefined) {
                normalizedBill.is_ebicycle = await this.getModelIsEbicycle(normalizedBill.model_name);
            } else {
                normalizedBill.is_ebicycle = bill.is_ebicycle;
            }

            // Create PDF document
            const pdfDoc = await PDFDocument.create();
            
            // Set document metadata
            pdfDoc.setTitle(`TMR Invoice ${normalizedBill.bill_number}`);
            pdfDoc.setAuthor('TMR TRADING LANKA (PVT) LIMITED');
            pdfDoc.setSubject(`Invoice #${normalizedBill.bill_number}`);
            pdfDoc.setKeywords(['invoice', 'bill', 'tmr', 'motorcycle', 'ebike']);
            
            // Add page
            const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
            const { width, height } = page.getSize();
            
            // Embed fonts
            const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            // Start drawing from the top
            let yPosition = height - this.margin;
            
            // Draw header with logo, company info, and bill details
            yPosition = await this.drawHeader(pdfDoc, page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Draw title and horizontal separator
            yPosition = this.drawTitleAndSeparator(page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Draw customer details section
            yPosition = this.drawCustomerDetails(page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Draw vehicle details section
            yPosition = this.drawVehicleDetails(page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Draw payment details section with table
            yPosition = this.drawPaymentDetails(page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Draw terms and conditions
            yPosition = this.drawTermsAndConditions(page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            // Draw signatures and thank you message
            this.drawSignaturesAndFooter(page, width, yPosition, normalizedBill, regularFont, boldFont);
            
            return await pdfDoc.save();
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }
    
    async drawHeader(pdfDoc, page, width, startY, bill, regularFont, boldFont) {
        try {
            // Company logo on the left
            try {
                // Extract the base64 data from inline logo
                const base64Data = INLINE_LOGO_BASE64.trim().split(',')[1];
                const logoBytes = Buffer.from(base64Data, 'base64');
                
                // Embed the logo
                const logoImage = await pdfDoc.embedPng(logoBytes);
                
                // Draw the logo (scaled properly)
                const logoWidth = 60;
                const logoHeight = 60;
                const logoX = this.margin;
                const logoY = startY - logoHeight;
                
                page.drawImage(logoImage, {
                    x: logoX,
                    y: logoY,
                    width: logoWidth,
                    height: logoHeight,
                });
                
                // Company name and details (next to logo)
                const companyNameX = logoX + logoWidth + 15;
                const companyNameY = startY - 20;
                
                // Company name in large bold text
                page.drawText('TMR TRADING LANKA (PVT) LIMITED', {
                    x: companyNameX,
                    y: companyNameY,
                    size: 16,
                    font: boldFont,
                    color: COLOR_BLACK,
                });
                
                // Authorized dealer text
                page.drawText('GUNAWARDANA MOTORS, EMBILIPITIYA', {
                    x: companyNameX,
                    y: companyNameY - 20,
                    size: 10,
                    font: regularFont,
                    color: COLOR_BLACK,
                });
                
                page.drawText('AUTHORIZED DEALER - EMBILIPITIYA', {
                    x: companyNameX,
                    y: companyNameY - 35,
                    size: 10,
                    font: regularFont,
                    color: COLOR_GRAY_DARK,
                });
                
            } catch (logoError) {
                console.error("Error embedding logo:", logoError);
                // Fallback to text-only header if logo fails
                page.drawText('TMR TRADING LANKA (PVT) LIMITED', {
                    x: this.margin,
                    y: startY - 20,
                    size: 18,
                    font: boldFont,
                    color: COLOR_BLACK,
                });
                
                page.drawText('GUNAWARDANA MOTORS, EMBILIPITIYA', {
                    x: this.margin,
                    y: startY - 40,
                    size: 12,
                    font: boldFont,
                    color: COLOR_BLACK,
                });
            }
            
            // Invoice details (right aligned)
            const invoiceDetailsX = width - this.margin - 150;
            const invoiceDetailsY = startY - 20;
            
            page.drawText('INVOICE', {
                x: invoiceDetailsX,
                y: invoiceDetailsY,
                size: 14,
                font: boldFont,
                color: COLOR_ACCENT,
            });
            
            page.drawText(`Bill No: ${bill.bill_number}`, {
                x: invoiceDetailsX,
                y: invoiceDetailsY - 20,
                size: 10,
                font: regularFont,
                color: COLOR_BLACK,
            });
            
            page.drawText(`Date: ${this.formatDate(bill.bill_date)}`, {
                x: invoiceDetailsX,
                y: invoiceDetailsY - 35,
                size: 10,
                font: regularFont,
                color: COLOR_BLACK,
            });
            
            // Return the updated Y position (bottom of the header)
            return startY - 75;
            
        } catch (error) {
            console.error('Error drawing header:', error);
            return startY - 75; // Return a fallback position
        }
    }
    
    drawTitleAndSeparator(page, width, startY, bill, regularFont, boldFont) {
        // Add some spacing
        const yPosition = startY - 15;
        
        // Draw horizontal separator line
        page.drawLine({
            start: { x: this.margin, y: yPosition },
            end: { x: width - this.margin, y: yPosition },
            thickness: 1,
            color: COLOR_GRAY,
        });
        
        // Draw bill type as title
        const billTypeText = this.getBillTypeText(bill.bill_type);
        const billTypeWidth = boldFont.widthOfTextAtSize(billTypeText, 14);
        
        page.drawText(billTypeText, {
            x: (width - billTypeWidth) / 2,
            y: yPosition - 25,
            size: 14,
            font: boldFont,
            color: COLOR_ACCENT,
        });
        
        // Return the updated Y position
        return yPosition - 45;
    }
    
    drawCustomerDetails(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Customer Details', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        // Section divider line
        const dividerY = startY - 10;
        page.drawLine({
            start: { x: this.margin, y: dividerY },
            end: { x: this.margin + 150, y: dividerY },
            thickness: 0.75,
            color: COLOR_GRAY_LIGHT,
        });
        
        // Customer information
        let currentY = startY - 25;
        
        // Name
        page.drawText('Name:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.customer_name, {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // NIC
        currentY -= this.spacing.lineHeight;
        page.drawText('NIC:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.customer_nic, {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Address
        currentY -= this.spacing.lineHeight;
        page.drawText('Address:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.customer_address, {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Return position for next section
        return currentY - this.spacing.sectionSpace;
    }
    
    drawVehicleDetails(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Vehicle Details', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        // Section divider line
        const dividerY = startY - 10;
        page.drawLine({
            start: { x: this.margin, y: dividerY },
            end: { x: this.margin + 150, y: dividerY },
            thickness: 0.75,
            color: COLOR_GRAY_LIGHT,
        });
        
        // Vehicle information
        let currentY = startY - 25;
        
        // Model
        page.drawText('Model:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.model_name, {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Type
        currentY -= this.spacing.lineHeight;
        page.drawText('Type:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.is_ebicycle ? 'E-bicycle' : 'E-bike', {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Motor Number
        currentY -= this.spacing.lineHeight;
        page.drawText('Motor No:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.motor_number, {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Chassis Number
        currentY -= this.spacing.lineHeight;
        page.drawText('Chassis No:', {
            x: this.margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        page.drawText(bill.chassis_number, {
            x: this.margin + 70,
            y: currentY,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Return position for next section
        return currentY - this.spacing.sectionSpace;
    }
    
    drawPaymentDetails(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Payment Details', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        // Section divider line
        const dividerY = startY - 10;
        page.drawLine({
            start: { x: this.margin, y: dividerY },
            end: { x: this.margin + 150, y: dividerY },
            thickness: 0.75,
            color: COLOR_GRAY_LIGHT,
        });
        
        // Calculate values
        const bikePrice = bill.bike_price;
        const rmvCharge = bill.is_ebicycle ? 0 : 13000;
        const totalAmount = bill.bill_type === 'LEASING' ? bill.down_payment : 
                            (bikePrice + (bill.is_ebicycle ? 0 : 13000));
        
        // Table dimensions
        const tableStartY = startY - 30;
        const colWidth1 = 250;  // Description column
        const colWidth2 = 150;  // Amount column
        const tableWidth = colWidth1 + colWidth2;
        const rowHeight = this.spacing.tableRowHeight;
        
        // Draw table header
        this.drawTableRow(
            page,
            this.margin,
            tableStartY,
            [{ text: 'Description', align: 'left' }, { text: 'Amount', align: 'right' }],
            boldFont,
            10,
            true // is header
        );
        
        // Start drawing rows after header
        let currentY = tableStartY - rowHeight;
        
        // Bike Price Row
        this.drawTableRow(
            page,
            this.margin,
            currentY,
            [{ text: 'Bike Price', align: 'left' }, { text: this.formatAmount(bikePrice), align: 'right' }],
            regularFont,
            10
        );
        currentY -= rowHeight;
        
        // RMV charge (only for non-e-bicycles)
        if (!bill.is_ebicycle) {
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'RMV Charge', align: 'left' }, { text: this.formatAmount(rmvCharge), align: 'right' }],
                regularFont,
                10
            );
            currentY -= rowHeight;
        }
        
        // Bill type specific rows
        if (bill.bill_type === 'LEASING') {
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'Down Payment', align: 'left' }, { text: this.formatAmount(bill.down_payment), align: 'right' }],
                regularFont,
                10
            );
            currentY -= rowHeight;
            
            // Total row (highlighted)
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'Total Amount (Down Payment)', align: 'left' }, { text: this.formatAmount(bill.down_payment), align: 'right' }],
                boldFont,
                10,
                true
            );
        } 
        else if (bill.bill_type === 'ADVANCE') {
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'Advance Amount', align: 'left' }, { text: this.formatAmount(bill.advance_amount), align: 'right' }],
                regularFont,
                10
            );
            currentY -= rowHeight;
            
            const balanceAmount = totalAmount - bill.advance_amount;
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'Balance Amount', align: 'left' }, { text: this.formatAmount(balanceAmount), align: 'right' }],
                regularFont,
                10
            );
            currentY -= rowHeight;
            
            // Total row (highlighted)
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'Total Amount', align: 'left' }, { text: this.formatAmount(totalAmount), align: 'right' }],
                boldFont,
                10,
                true
            );
        }
        else {
            // Total row for cash bill (highlighted)
            this.drawTableRow(
                page,
                this.margin,
                currentY,
                [{ text: 'Total Amount', align: 'left' }, { text: this.formatAmount(totalAmount), align: 'right' }],
                boldFont,
                10,
                true
            );
        }
        
        // Return position for next section (considering variable table height)
        return currentY - this.spacing.sectionSpace;
    }
    
    drawTableRow(page, x, y, cells, font, fontSize, isHeader = false) {
        const colWidth1 = 250;  // Description column
        const colWidth2 = 150;  // Amount column
        const rowHeight = this.spacing.tableRowHeight;
        const padding = this.spacing.columnPadding;
        
        // Draw row background
        page.drawRectangle({
            x,
            y: y - rowHeight,
            width: colWidth1 + colWidth2,
            height: rowHeight,
            color: isHeader ? COLOR_GRAY_LIGHT : COLOR_WHITE,
            borderWidth: this.spacing.tableBorderWidth,
            borderColor: COLOR_GRAY,
        });
        
        // Draw separating line between columns
        page.drawLine({
            start: { x: x + colWidth1, y },
            end: { x: x + colWidth1, y: y - rowHeight },
            thickness: this.spacing.tableBorderWidth,
            color: COLOR_GRAY,
        });
        
        // Draw cell text
        cells.forEach((cell, index) => {
            const { text, align } = cell;
            const columnWidth = index === 0 ? colWidth1 : colWidth2;
            const textX = index === 0 ? x + padding : x + colWidth1 + padding;
            
            // For right-aligned text (like amounts)
            if (align === 'right') {
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const rightAlignedX = x + colWidth1 + colWidth2 - padding - textWidth;
                
                page.drawText(text, {
                    x: rightAlignedX,
                    y: y - (rowHeight / 2) - (fontSize / 2),
                    size: fontSize,
                    font,
                    color: COLOR_BLACK,
                });
            } else {
                // Left-aligned text
                page.drawText(text, {
                    x: textX,
                    y: y - (rowHeight / 2) - (fontSize / 2),
                    size: fontSize,
                    font,
                    color: COLOR_BLACK,
                });
            }
        });
    }
    
    drawTermsAndConditions(page, width, startY, bill, regularFont, boldFont) {
        // Section title
        page.drawText('Terms and Conditions', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK,
        });
        
        // Section divider line
        const dividerY = startY - 10;
        page.drawLine({
            start: { x: this.margin, y: dividerY },
            end: { x: this.margin + 180, y: dividerY },
            thickness: 0.75,
            color: COLOR_GRAY_LIGHT,
        });
        
        // Terms and conditions
        const terms = [
            '1. All prices are inclusive of taxes.',
            '2. Warranty is subject to terms and conditions.',
            '3. This is a computer-generated document and does not require a signature.'
        ];
        
        // Add bill-specific terms
        if (bill.bill_type === 'LEASING') {
            terms.push('4. Balance amount will be settled by the leasing company.');
        } else if (bill.bill_type === 'ADVANCE' && bill.estimated_delivery_date) {
            terms.push(`4. Estimated delivery date: ${this.formatDate(bill.estimated_delivery_date)}`);
        } else {
            terms.push('4. RMV registration will be completed within 30 days.');
        }
        
        // Draw terms
        let currentY = startY - 25;
        terms.forEach(term => {
            page.drawText(term, {
                x: this.margin,
                y: currentY,
                size: 9,
                font: regularFont,
                color: COLOR_GRAY_DARK,
            });
            currentY -= this.spacing.lineHeight;
        });
        
        // Return position for next section
        return currentY - this.spacing.sectionSpace;
    }
    
    drawSignaturesAndFooter(page, width, startY, bill, regularFont, boldFont) {
        // Ensure enough space from the bottom
        const signatureY = Math.min(startY - 20, 140);
        
        // Thank you message (centered)
        const thankYouText = 'Thank you for your business!';
        const thankYouWidth = boldFont.widthOfTextAtSize(thankYouText, 12);
        
        page.drawText(thankYouText, {
            x: (width - thankYouWidth) / 2,
            y: signatureY + 40,
            size: 12,
            font: boldFont,
            color: COLOR_ACCENT,
        });
        
        // Signature lines
        // Dealer signature (left)
        page.drawLine({
            start: { x: this.margin, y: signatureY },
            end: { x: this.margin + 150, y: signatureY },
            thickness: 1,
            color: COLOR_BLACK,
        });
        
        page.drawText('Dealer Signature', {
            x: this.margin + 30,
            y: signatureY - 15,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Customer signature (right)
        page.drawLine({
            start: { x: width - this.margin - 150, y: signatureY },
            end: { x: width - this.margin, y: signatureY },
            thickness: 1,
            color: COLOR_BLACK,
        });
        
        page.drawText('Customer Signature', {
            x: width - this.margin - 120,
            y: signatureY - 15,
            size: 10,
            font: regularFont,
            color: COLOR_BLACK,
        });
        
        // Footer
        const footerY = 50;
        const footerText = 'TMR TRADING LANKA (PVT) LIMITED - Your trusted partner in electric mobility';
        const footerWidth = regularFont.widthOfTextAtSize(footerText, 8);
        
        page.drawText(footerText, {
            x: (width - footerWidth) / 2,
            y: footerY,
            size: 8,
            font: regularFont,
            color: COLOR_GRAY_DARK,
        });
    }
    
    getBillTypeText(billType) {
        switch (billType) {
            case 'LEASING':
                return 'LEASING BILL';
            case 'ADVANCE':
                return 'ADVANCE PAYMENT BILL';
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
                month: 'long',
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