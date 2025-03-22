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
                is_ebicycle: bill.is_ebicycle || false,
                down_payment: parseFloat(bill.down_payment) || 0,
                advance_amount: parseFloat(bill.advance_amount) || 0,
                estimated_delivery_date: bill.estimated_delivery_date || null
            };

            // Create PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
            const { width, height } = page.getSize();
            
            // Embed fonts
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            // Document metadata
            pdfDoc.setTitle(`Invoice - ${normalizedBill.bill_number}`);
            pdfDoc.setAuthor('TMR TRADING LANKA (PVT) LIMITED');
            pdfDoc.setSubject(`Bill #${normalizedBill.bill_number}`);
            
            // Draw header
            await this.drawHeader(pdfDoc, page, width, height, normalizedBill, font, boldFont);
            
            // Draw customer details
            const customerY = height - this.margin - 130;
            this.drawCustomerDetails(page, width, customerY, normalizedBill, font, boldFont);
            
            // Draw vehicle details
            const vehicleY = customerY - 120;
            this.drawVehicleDetails(page, width, vehicleY, normalizedBill, font, boldFont);
            
            // Draw payment details
            const paymentY = vehicleY - 120;
            this.drawPaymentDetails(page, width, paymentY, normalizedBill, font, boldFont);
            
            // Draw terms and conditions
            const termsY = paymentY - 150;
            this.drawTermsAndConditions(page, width, termsY, normalizedBill, font, boldFont);
            
            // Draw footer and signatures
            this.drawFooterAndSignatures(page, width, normalizedBill, font, boldFont);
            
            return await pdfDoc.save();
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    async drawHeader(pdfDoc, page, width, height, bill, font, boldFont) {
        try {
            // Bill details (right aligned)
            const billNoText = `Bill No: ${bill.bill_number}`;
            const billNoWidth = font.widthOfTextAtSize(billNoText, 12);
            page.drawText(billNoText, {
                x: width - this.margin - billNoWidth,
                y: height - this.margin,
                size: 12,
                font: boldFont,
                color: COLOR_BLACK
            });

            const dateText = `Date: ${this.formatDate(bill.bill_date)}`;
            const dateWidth = font.widthOfTextAtSize(dateText, 12);
            page.drawText(dateText, {
                x: width - this.margin - dateWidth,
                y: height - this.margin - 20,
                size: 12,
                font,
                color: COLOR_BLACK
            });
            
            // Logo and company name
            try {
                // Extract the base64 data
                const base64Data = INLINE_LOGO_BASE64.trim().split(',')[1];
                const logoBytes = Buffer.from(base64Data, 'base64');
                
                // Embed the logo
                const logoImage = await pdfDoc.embedPng(logoBytes);
                
                // Draw the logo
                const logoWidth = 70;
                const logoHeight = logoWidth;
                
                page.drawImage(logoImage, {
                    x: this.margin,
                    y: height - this.margin - logoHeight + 25,
                    width: logoWidth,
                    height: logoHeight,
                });
                
                // Company name next to logo
                page.drawText('TMR TRADING LANKA (PVT) LIMITED', {
                    x: this.margin + 85,
                    y: height - this.margin - 20,
                    size: 18,
                    font: boldFont,
                    color: COLOR_BLACK
                });
            } catch (logoError) {
                console.error("Error embedding logo:", logoError);
                // Fallback to text-only header
                page.drawText('TMR TRADING LANKA (PVT) LIMITED', {
                    x: this.margin,
                    y: height - this.margin - 20,
                    size: 18,
                    font: boldFont,
                    color: COLOR_BLACK
                });
            }
            
            // Dealer information
            page.drawText('GUNAWARDANA MOTORS, EMBILIPITIYA', {
                x: this.margin,
                y: height - this.margin - 60,
                size: 14,
                font: boldFont,
                color: COLOR_BLACK
            });
            
            page.drawText('AUTHORIZED DEALER - EMBILIPITIYA', {
                x: this.margin,
                y: height - this.margin - 80,
                size: 12,
                font: boldFont,
                color: COLOR_BLACK
            });
            
            // Draw a separator line
            page.drawLine({
                start: { x: this.margin, y: height - this.margin - 100 },
                end: { x: width - this.margin, y: height - this.margin - 100 },
                thickness: 1,
                color: COLOR_BLACK,
            });
            
            // Draw bill type header
            const billTypeText = this.getBillTypeText(bill.bill_type);
            const billTypeWidth = boldFont.widthOfTextAtSize(billTypeText, 14);
            page.drawText(billTypeText, {
                x: (width - billTypeWidth) / 2,
                y: height - this.margin - 115,
                size: 14,
                font: boldFont,
                color: COLOR_BLACK
            });
            
        } catch (error) {
            console.error('Error drawing header:', error);
        }
    }

    drawCustomerDetails(page, width, startY, bill, font, boldFont) {
        page.drawText('Customer Details:', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
            color: COLOR_BLACK
        });

        const customerDetails = [
            [`Name: ${bill.customer_name}`],
            [`NIC: ${bill.customer_nic}`],
            [`Address: ${bill.customer_address}`],
        ];

        customerDetails.forEach((line, index) => {
            page.drawText(line, {
                x: this.margin,
                y: startY - 25 - (index * 20),
                size: 12,
                font,
                color: COLOR_BLACK
            });
        });
    }

    drawVehicleDetails(page, width, startY, bill, font, boldFont) {
        page.drawText('Vehicle Details:', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
            color: COLOR_BLACK
        });

        const vehicleDetails = [
            [`Model: ${bill.model_name}`],
            [`Type: ${bill.is_ebicycle ? 'E-bicycle' : 'E-bike'}`],
            [`Motor Number: ${bill.motor_number}`],
            [`Chassis Number: ${bill.chassis_number}`],
        ];

        vehicleDetails.forEach((line, index) => {
            page.drawText(line, {
                x: this.margin,
                y: startY - 25 - (index * 20),
                size: 12,
                font,
                color: COLOR_BLACK
            });
        });
    }

    drawPaymentDetails(page, width, startY, bill, font, boldFont) {
        page.drawText('Payment Details:', {
            x: this.margin,
            y: startY,
            size: 14,
            font: boldFont,
            color: COLOR_BLACK
        });

        // Draw payment details table
        let tableY = startY - 30;
        
        // Table header
        tableY = this.drawTableRow(
            page,
            this.margin,
            tableY,
            ['Description', 'Amount (Rs.)'],
            boldFont,
            12,
            true
        );

        // Calculate values
        const bikePrice = bill.bike_price;
        const rmvCharge = bill.is_ebicycle ? 0 : 13000;
        const totalAmount = bikePrice + rmvCharge;
        
        // Table rows
        tableY = this.drawTableRow(
            page,
            this.margin,
            tableY,
            ['Bike Price', this.formatAmount(bikePrice)],
            font
        );

        // RMV charge row (if applicable)
        if (!bill.is_ebicycle) {
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['RMV Charge', this.formatAmount(rmvCharge)],
                font
            );
        }

        // Additional rows based on bill type
        if (bill.bill_type === 'LEASING') {
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Down Payment', this.formatAmount(bill.down_payment)],
                font
            );
            
            // Total row for leasing (down payment)
            this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Total Amount', `${this.formatAmount(bill.down_payment)} (D/P)`],
                boldFont,
                12,
                true
            );
        }
        else if (bill.bill_type === 'ADVANCE') {
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Advance Amount', this.formatAmount(bill.advance_amount)],
                font
            );
            
            const balance = totalAmount - bill.advance_amount;
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Balance Amount', this.formatAmount(balance)],
                font
            );
            
            // Total row for advance payment
            this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Total Amount', this.formatAmount(totalAmount)],
                boldFont,
                12,
                true
            );
        }
        else {
            // Total row for cash bill
            this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Total Amount', this.formatAmount(totalAmount)],
                boldFont,
                12,
                true
            );
        }
    }
    
    drawTermsAndConditions(page, width, startY, bill, font, boldFont) {
        page.drawText('Terms and Conditions:', {
            x: this.margin,
            y: startY,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK
        });

        const terms = [
            '1. All prices are inclusive of taxes.',
            '2. Warranty is subject to terms and conditions.',
            '3. This is a computer-generated bill.',
        ];

        // Add bill-specific terms
        if (bill.bill_type === 'LEASING') {
            terms.push('4. Balance amount will be settled by the leasing company.');
        } else if (bill.bill_type === 'ADVANCE' && bill.estimated_delivery_date) {
            terms.push(`4. Estimated delivery date: ${this.formatDate(bill.estimated_delivery_date)}`);
        } else {
            terms.push('4. RMV registration will be completed within 30 days.');
        }

        terms.forEach((line, index) => {
            page.drawText(line, {
                x: this.margin,
                y: startY - 20 - (index * 15),
                size: 10,
                font,
                color: rgb(0.3, 0.3, 0.3),
            });
        });
    }
    
    drawFooterAndSignatures(page, width, bill, font, boldFont) {
        const signatureY = 140; // Fixed position from bottom
        
        // Thank you message
        page.drawText('Thank you for your business!', {
            x: width / 2 - 70,
            y: signatureY + 60,
            size: 12,
            font: boldFont,
            color: COLOR_BLACK
        });
        
        // Dealer signature
        page.drawLine({
            start: { x: this.margin, y: signatureY },
            end: { x: this.margin + 150, y: signatureY },
            thickness: 1,
            color: COLOR_BLACK,
        });
        
        page.drawText('Dealer Signature', {
            x: this.margin,
            y: signatureY - 15,
            size: 10,
            font,
            color: COLOR_BLACK
        });

        // Customer signature
        page.drawLine({
            start: { x: width - this.margin - 150, y: signatureY },
            end: { x: width - this.margin, y: signatureY },
            thickness: 1,
            color: COLOR_BLACK,
        });
        
        page.drawText('Customer Signature', {
            x: width - this.margin - 150,
            y: signatureY - 15,
            size: 10,
            font,
            color: COLOR_BLACK
        });
    }

    drawTableRow(page, x, y, columns, font, fontSize = 12, isHeader = false) {
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
            borderColor: COLOR_GRAY,
            color: isHeader ? COLOR_GRAY_LIGHT : COLOR_WHITE,
        });

        // Draw vertical line between columns
        page.drawLine({
            start: { x: x + colWidths[0], y },
            end: { x: x + colWidths[0], y: y - rowHeight },
            thickness: 1,
            color: COLOR_GRAY,
        });

        // Draw text in cells
        columns.forEach((text, index) => {
            // Center text vertically in the cell
            const textY = y - rowHeight / 2 - fontSize / 3;
            
            page.drawText(text || '', {
                x: x + (index === 0 ? padding : colWidths[0] + padding),
                y: textY,
                size: fontSize,
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
            return '0.00';
        }
        return `${amount.toLocaleString()}.00`;
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