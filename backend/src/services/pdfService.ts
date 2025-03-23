import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * Generate a PDF for a bill
 * @param bill The bill object
 * @returns Promise with PDF buffer
 */
export const generatePDF = async (bill: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      // Set up streams to capture PDF data
      const buffers: Buffer[] = [];
      const readable = new Readable();
      
      // Handle document stream events
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Start adding content to the PDF
      generateHeader(doc);
      generateCustomerInformation(doc, bill);
      generateBillTable(doc, bill);
      generateFooter(doc);
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate the header section of the invoice
 */
const generateHeader = (doc: PDFKit.PDFDocument): void => {
  doc
    .fontSize(20)
    .text('TMR MOTORCYCLE SERVICES', 50, 45, { align: 'center' })
    .fontSize(10)
    .text('TMR Motorcycle Services', 50, 80, { align: 'center' })
    .text('123 Main Street, Chennai, Tamil Nadu', 50, 95, { align: 'center' })
    .text('Phone: +91 98765 43210', 50, 110, { align: 'center' })
    .text('Email: contact@tmrmotorcycle.com', 50, 125, { align: 'center' })
    .moveDown();
};

/**
 * Generate customer information section
 */
const generateCustomerInformation = (doc: PDFKit.PDFDocument, bill: any): void => {
  const today = new Date().toLocaleDateString();
  
  doc
    .fillColor('#444444')
    .fontSize(20)
    .text('Bill / Invoice', 50, 160);
  
  generateHr(doc, 185);
  
  // Left side info
  doc
    .fontSize(10)
    .text('Bill Number:', 50, 200)
    .font('Helvetica-Bold')
    .text(bill.billNumber, 150, 200)
    .font('Helvetica')
    .text('Bill Date:', 50, 215)
    .text(new Date(bill.serviceDate).toLocaleDateString(), 150, 215)
    .text('Payment Status:', 50, 230)
    .text(bill.isPaid ? 'Paid' : 'Pending', 150, 230)
    .text('Payment Method:', 50, 245)
    .text(bill.isPaid ? bill.paymentMethod : 'N/A', 150, 245);
  
  // Right side customer info
  doc
    .fontSize(10)
    .text('Customer:', 350, 200)
    .font('Helvetica-Bold')
    .text(bill.customerName, 420, 200)
    .font('Helvetica')
    .text('Phone:', 350, 215)
    .text(bill.customerPhone, 420, 215);
  
  // Bike information
  doc
    .text('Bike Details:', 350, 245)
    .text(`${bill.bikeInfo.make} ${bill.bikeInfo.model} (${bill.bikeInfo.regNumber})`, 420, 245);
  
  generateHr(doc, 270);
};

/**
 * Generate the bill table with line items
 */
const generateBillTable = (doc: PDFKit.PDFDocument, bill: any): void => {
  let i;
  const invoiceTableTop = 330;
  
  // Table headers
  doc
    .fontSize(10)
    .text('Description', 50, invoiceTableTop)
    .text('Quantity', 280, invoiceTableTop, { width: 90, align: 'right' })
    .text('Rate', 370, invoiceTableTop, { width: 90, align: 'right' })
    .text('Amount', 0, invoiceTableTop, { align: 'right' });
  
  generateHr(doc, invoiceTableTop + 20);
  
  // Table rows
  let position = invoiceTableTop + 30;
  
  for (i = 0; i < bill.items.length; i++) {
    const item = bill.items[i];
    position = generateTableRow(
      doc,
      position,
      item.description,
      item.quantity,
      item.rate,
      item.amount
    );
    
    generateHr(doc, position + 20);
  }
  
  // Totals
  const subtotalPosition = position + 30;
  
  doc
    .fontSize(10)
    .text('Subtotal:', 280, subtotalPosition, { width: 90, align: 'right' })
    .text(formatCurrency(bill.subtotal), 0, subtotalPosition, { align: 'right' });
  
  const taxPosition = subtotalPosition + 20;
  
  doc
    .fontSize(10)
    .text('Tax:', 280, taxPosition, { width: 90, align: 'right' })
    .text(formatCurrency(bill.tax), 0, taxPosition, { align: 'right' });
  
  const totalPosition = taxPosition + 25;
  
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL:', 280, totalPosition, { width: 90, align: 'right' })
    .text(formatCurrency(bill.total), 0, totalPosition, { align: 'right' })
    .font('Helvetica');
  
  // Add notes if available
  if (bill.notes) {
    doc
      .fontSize(10)
      .text('Notes:', 50, totalPosition + 50)
      .font('Helvetica-Oblique')
      .text(bill.notes, 50, totalPosition + 70, { width: 500 })
      .font('Helvetica');
  }
};

/**
 * Generate footer section
 */
const generateFooter = (doc: PDFKit.PDFDocument): void => {
  doc
    .fontSize(10)
    .text(
      'Thank you for your business. Please contact us for any queries regarding this bill.',
      50,
      700,
      { align: 'center', width: 500 }
    );
};

/**
 * Generate a horizontal line
 */
const generateHr = (doc: PDFKit.PDFDocument, y: number): void => {
  doc
    .strokeColor('#aaaaaa')
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
};

/**
 * Generate a table row
 */
const generateTableRow = (
  doc: PDFKit.PDFDocument,
  y: number,
  description: string,
  quantity: number,
  rate: number,
  amount: number
): number => {
  doc
    .fontSize(10)
    .text(description, 50, y)
    .text(quantity.toString(), 280, y, { width: 90, align: 'right' })
    .text(formatCurrency(rate), 370, y, { width: 90, align: 'right' })
    .text(formatCurrency(amount), 0, y, { align: 'right' });
  
  return y + 20;
};

/**
 * Format currency
 */
const formatCurrency = (value: number): string => {
  return '₹' + value.toFixed(2);
}; 