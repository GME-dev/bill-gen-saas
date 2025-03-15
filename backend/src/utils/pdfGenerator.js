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

    async getModelIsEbicycle(modelName) {
        try {
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
            console.log(`
            ##########################################################################
            # GENERATING PDF FOR BILL #${bill.id}
            # Model: ${bill.model_name}
            # Customer: ${bill.customer_name}
            ##########################################################################
            `);
            
            // 1. FIRST CHECK DATABASE FOR DEFINITIVE ANSWER ON E-BICYCLE STATUS
            const dbIsEbicycle = await this.getModelIsEbicycle(bill.model_name);
            
            // Only if database lookup fails, fall back to string matching
            let isEbicycle = false;
            
            if (dbIsEbicycle !== null) {
                // Use database value if available
                isEbicycle = dbIsEbicycle;
                console.log(`[DB SUCCESS] Using database is_ebicycle value: ${isEbicycle}`);
            } else {
                // Fall back to string matching
                const modelName = (bill.model_name || '').toString().trim().toUpperCase();
                isEbicycle = modelName.includes('COLA') || 
                             modelName.includes('X01') || 
                             modelName.includes('E-');
                console.log(`[STRING MATCHING] Determined is_ebicycle = ${isEbicycle} for model ${modelName}`);
            }
            
            console.log(`[FINAL DECISION] Model ${bill.model_name} is_ebicycle = ${isEbicycle}`);
            
            // 2. FOR COLA MODELS, ALWAYS SKIP RMV CHARGES
            if (isEbicycle) {
                console.log(`[E-BICYCLE DETECTED] Processing bill #${bill.id} as an e-bicycle - NO RMV CHARGES WILL BE ADDED`);
            }
            
            // Normal PDF generation (but using our definitive is_ebicycle flag)
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

            // ===============================================================
            // PAYMENT DETAILS - USING DATABASE IS_EBICYCLE FLAG
            // ===============================================================
            
            // Parse basic numbers
            const bikePrice = parseFloat(bill.bike_price) || 0;
            const downPayment = parseFloat(bill.down_payment) || 0;
            
            // Always show bike price row first
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Bike Price', `${bikePrice.toLocaleString()}/=`],
                font
            );
            
            // Determine bill type
            const billType = (bill.bill_type || '').toLowerCase().trim();
            const isAdvancement = billType === 'advance' || billType === 'advancement';
            const isLeasing = billType === 'leasing';
            
            // For ADVANCEMENT bills
            if (isAdvancement && downPayment > 0) {
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Advancement Amount', `${downPayment.toLocaleString()}/=`],
                    font
                );
                
                const balanceAmount = bikePrice - downPayment;
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Balance Amount', `${balanceAmount.toLocaleString()}/=`],
                    font
                );
                
                if (bill.estimated_delivery_date) {
                    tableY = this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['Estimated Delivery Date', new Date(bill.estimated_delivery_date).toLocaleDateString()],
                        font
                    );
                }
                
                this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Total Amount', `${bikePrice.toLocaleString()}/=`],
                    boldFont,
                    12,
                    true
                );
            }
            // For LEASING bills
            else if (isLeasing) {
                tableY = this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Down Payment', `${downPayment.toLocaleString()}/=`],
                    font
                );
                
                // Only add RMV for non-e-bicycles
                if (!isEbicycle) {
                    tableY = this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['RMV Charge', 'CPZ'],
                        font
                    );
                }
                
                this.drawTableRow(
                    page,
                    this.margin,
                    tableY,
                    ['Total Amount', `${downPayment.toLocaleString()}/= (D/P)`],
                    boldFont,
                    12,
                    true
                );
            }
            // For CASH bills and default
            else {
                // CRUCIAL CHECK - Only add RMV for non-e-bicycles
                if (isEbicycle) {
                    console.log(`[E-BICYCLE DETECTED] Skipping RMV charge for bill #${bill.id}, model ${bill.model_name}`);
                    
                    // For e-bicycles, total is just the bike price with NO RMV
                    this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['Total Amount', `${bikePrice.toLocaleString()}/=`],
                        boldFont,
                        12,
                        true
                    );
                } else {
                    // Regular bike - add RMV charge
                    tableY = this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['RMV Charge', '13,000/='],
                        font
                    );
                    
                    const totalWithRMV = bikePrice + 13000;
                    this.drawTableRow(
                        page,
                        this.margin,
                        tableY,
                        ['Total Amount', `${totalWithRMV.toLocaleString()}/=`],
                        boldFont,
                        12,
                        true
                    );
                }
            }
            
            // ===============================================================
            // TERMS AND CONDITIONS - BASED ON REAL IS_EBICYCLE FLAG
            // ===============================================================
            
            // Terms and Conditions
            const termsY = tableY - 80;
            page.drawText('Terms and Conditions:', {
                x: this.margin,
                y: termsY,
                size: 12,
                font: boldFont,
            });

            const terms = [
                '1. All prices are inclusive of taxes.',
                '2. Warranty is subject to terms and conditions.',
                '3. This is a computer-generated bill.',
            ];
            
            // Add bill-type specific terms
            if (isLeasing) {
                terms.push('4. Balance amount will be settled by the leasing company.');
            } else if (isAdvancement) {
                terms.push('4. Balance amount must be paid upon delivery of the vehicle.');
                terms.push(`5. Estimated delivery date: ${bill.estimated_delivery_date ? new Date(bill.estimated_delivery_date).toLocaleDateString() : 'To be confirmed'}`);
            } 
            // Only add RMV registration term for non-e-bicycles
            else if (!isEbicycle) {
                terms.push('4. RMV registration will be completed within 30 days.');
            }

            terms.forEach((line, index) => {
                page.drawText(line, {
                    x: this.margin,
                    y: termsY - 20 - (index * 15),
                    size: 10,
                    font,
                    color: rgb(0.3, 0.3, 0.3),
                });
            });

            // Footer and signatures - keep as is
            page.drawText('Thank you for your business!', {
                x: width / 2 - 70,
                y: this.margin + 15,
                size: 12,
                font: boldFont,
            });

            // Signatures
            const signatureY = this.margin + 60;
            
            // Dealer signature
            page.drawLine({
                start: { x: this.margin, y: signatureY },
                end: { x: this.margin + 150, y: signatureY },
                thickness: 1,
                color: rgb(0, 0, 0),
            });
            
            page.drawText('Dealer Signature', {
                x: this.margin,
                y: signatureY - 15,
                size: 10,
                font,
            });

            // Rubber stamp line
            page.drawLine({
                start: { x: width - this.margin - 150, y: signatureY },
                end: { x: width - this.margin, y: signatureY },
                thickness: 1,
                color: rgb(0, 0, 0),
            });
            
            page.drawText('Rubber Stamp', {
                x: width - this.margin - 150,
                y: signatureY - 15,
                size: 10,
                font,
            });

            // Generate PDF
            return await pdfDoc.save();
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }
    
    // EMERGENCY METHOD: Creates a PDF for COLA models with NO RMV charges
    async createEmergencyPdfForCola(bill) {
        console.log("CREATING EMERGENCY PDF WITH ABSOLUTELY NO RMV CHARGES");
        
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        const { width, height } = page.getSize();
        
        // Get fonts
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // ===== TOP SECTION: HEADER AND COMPANY INFO =====
        // Bill number (right aligned)
        const billNoText = `Bill No: ${bill.id}`;
        const billNoWidth = font.widthOfTextAtSize(billNoText, 12);
        page.drawText(billNoText, {
            x: width - this.margin - billNoWidth,
            y: height - this.margin,
            size: 12,
            font: boldFont,
        });

        // Date (right aligned)
        const dateText = `Date: ${new Date(bill.bill_date).toLocaleDateString()}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 12);
        page.drawText(dateText, {
            x: width - this.margin - dateWidth,
            y: height - this.margin - 20,
            size: 12,
            font,
        });
        
        try {
            // Logo
            const logoImageBytes = await fs.promises.readFile(this.logoPath);
            const logoImage = await pdfDoc.embedPng(logoImageBytes);
            const logoWidth = 70;
            const logoHeight = logoWidth;
            
            page.drawImage(logoImage, {
                x: this.margin,
                y: height - this.margin - logoHeight + 25,
                width: logoWidth,
                height: logoHeight,
            });
        } catch (error) {
            console.error('Error embedding logo:', error);
        }

        // Company and dealer info
        page.drawText('TMR TRADING LANKA (PVT) LTD', {
            x: this.margin + 85,
            y: height - this.margin - 20,
            size: 18,
            font: boldFont,
        });

        page.drawText('GUNAWARDANA MOTORS, EMBILIPITIYA', {
            x: this.margin,
            y: height - this.margin - 60,
            size: 14,
            font: boldFont,
        });

        page.drawText('AUTHORIZED DEALER - EMBILIPITIYA', {
            x: this.margin,
            y: height - this.margin - 80,
            size: 12,
            font: boldFont,
        });

        // ===== CUSTOMER DETAILS =====
        const customerY = height - this.margin - 130;
        page.drawText('Customer Details:', {
            x: this.margin,
            y: customerY,
            size: 14,
            font: boldFont,
        });

        const customerDetails = [
            `Name: ${bill.customer_name}`,
            `NIC: ${bill.customer_nic}`,
            `Address: ${bill.customer_address}`,
        ];

        customerDetails.forEach((line, index) => {
            page.drawText(line, {
                x: this.margin,
                y: customerY - 25 - (index * 20),
                size: 12,
                font,
            });
        });

        // ===== VEHICLE DETAILS =====
        const vehicleY = customerY - 120;
        page.drawText('Vehicle Details:', {
            x: this.margin,
            y: vehicleY,
            size: 14,
            font: boldFont,
        });

        const vehicleDetails = [
            `Model: ${bill.model_name}`,
            `Motor Number: ${bill.motor_number || 'N/A'}`,
            `Chassis Number: ${bill.chassis_number || 'N/A'}`,
        ];

        vehicleDetails.forEach((line, index) => {
            page.drawText(line, {
                x: this.margin,
                y: vehicleY - 25 - (index * 20),
                size: 12,
                font,
            });
        });

        // ===== PAYMENT DETAILS - COLA E-BICYCLE VERSION =====
        const paymentY = vehicleY - 120;
        page.drawText('Payment Details:', {
            x: this.margin,
            y: paymentY,
            size: 14,
            font: boldFont,
        });

        // Draw table
        let tableY = paymentY - 30;
        
        // Header row
        tableY = this.drawTableRow(
            page,
            this.margin,
            tableY,
            ['Description', 'Amount (Rs.)'],
            boldFont,
            12,
            true
        );
        
        // Get bike price (with safety)
        const bikePrice = parseFloat(bill.bike_price) || 0;
        const downPayment = parseFloat(bill.down_payment) || 0;
        const billType = (bill.bill_type || '').toLowerCase().trim();
        
        // Bike price row - always shown
        tableY = this.drawTableRow(
            page,
            this.margin,
            tableY,
            ['Bike Price', `${bikePrice.toLocaleString()}/=`],
            font
        );

        // For advancement bills, show additional details
        if ((billType === 'advance' || billType === 'advancement') && downPayment > 0) {
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Advancement Amount', `${downPayment.toLocaleString()}/=`],
                font
            );
            
            const balanceAmount = bikePrice - downPayment;
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Balance Amount', `${balanceAmount.toLocaleString()}/=`],
                font
            );
        }
        // For leasing, show down payment
        else if (billType === 'leasing') {
            tableY = this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Down Payment', `${downPayment.toLocaleString()}/=`],
                font
            );
            
            this.drawTableRow(
                page,
                this.margin,
                tableY,
                ['Total Amount', `${downPayment.toLocaleString()}/= (D/P)`],
                boldFont,
                12,
                true
            );
            
            // Return early for leasing bills
            return this.finishEmergencyPdf(pdfDoc, page, tableY, width, height, billType, bill, font, boldFont);
        }
        
        // For cash bills and advancement, total = bike price (NEVER show RMV)
        this.drawTableRow(
            page,
            this.margin,
            tableY,
            ['Total Amount', `${bikePrice.toLocaleString()}/=`],
            boldFont,
            12,
            true
        );
        
        // Finish PDF with terms and signatures
        return this.finishEmergencyPdf(pdfDoc, page, tableY, width, height, billType, bill, font, boldFont);
    }
    
    // Helper to finish the emergency PDF
    async finishEmergencyPdf(pdfDoc, page, tableY, width, height, billType, bill, font, boldFont) {
        // Terms and Conditions
        const termsY = tableY - 80;
        page.drawText('Terms and Conditions:', {
            x: this.margin,
            y: termsY,
            size: 12,
            font: boldFont,
        });

        const terms = [
            '1. All prices are inclusive of taxes.',
            '2. Warranty is subject to terms and conditions.',
            '3. This is a computer-generated bill.',
        ];
        
        // Add bill-type specific terms
        if (billType === 'leasing') {
            terms.push('4. Balance amount will be settled by the leasing company.');
        } else if (billType === 'advance' || billType === 'advancement') {
            terms.push('4. Balance amount must be paid upon delivery of the vehicle.');
            terms.push(`5. Estimated delivery date: ${bill.estimated_delivery_date ? new Date(bill.estimated_delivery_date).toLocaleDateString() : 'To be confirmed'}`);
        }
        // For cash bills of e-bicycles - NO RMV mention

        terms.forEach((line, index) => {
            page.drawText(line, {
                x: this.margin,
                y: termsY - 20 - (index * 15),
                size: 10,
                font,
                color: rgb(0.3, 0.3, 0.3),
            });
        });

        // Footer
        page.drawText('Thank you for your business!', {
            x: width / 2 - 70,
            y: this.margin + 15,
            size: 12,
            font: boldFont,
        });

        // Signatures
        const signatureY = this.margin + 60;
        
        // Dealer signature
        page.drawLine({
            start: { x: this.margin, y: signatureY },
            end: { x: this.margin + 150, y: signatureY },
            thickness: 1,
            color: rgb(0, 0, 0),
        });
        
        page.drawText('Dealer Signature', {
            x: this.margin,
            y: signatureY - 15,
            size: 10,
            font,
        });

        // Rubber stamp line
        page.drawLine({
            start: { x: width - this.margin - 150, y: signatureY },
            end: { x: width - this.margin, y: signatureY },
            thickness: 1,
            color: rgb(0, 0, 0),
        });
        
        page.drawText('Rubber Stamp', {
            x: width - this.margin - 150,
            y: signatureY - 15,
            size: 10,
            font,
        });

        // Return the finished PDF
        return await pdfDoc.save();
    }
}

export default PDFGenerator 