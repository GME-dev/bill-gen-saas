import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

interface BillItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Bill {
  customer_name: string;
  customer_nic: string;
  customer_address: string;
  total_amount: number;
  items: BillItem[];
  created_at: string;
}

export class BillGenerator {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../../templates/bill-template.docx');
  }

  async generateDocx(bill: Bill): Promise<Buffer> {
    try {
      // Read the template
      const content = fs.readFileSync(this.templatePath, 'binary');
      const zip = new PizZip(content);

      // Create a Docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Format date
      const date = new Date(bill.created_at).toLocaleDateString();

      // Prepare data for template
      const templateData = {
        customer_name: bill.customer_name,
        customer_nic: bill.customer_nic,
        customer_address: bill.customer_address,
        date: date,
        items: bill.items.map(item => ({
          ...item,
          total_price: item.total_price.toFixed(2)
        })),
        total_amount: bill.total_amount.toFixed(2)
      };

      // Render the document
      doc.render(templateData);

      // Generate output
      const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return buf;
    } catch (error) {
      logger.error('Error generating DOCX:', error);
      throw new Error('Failed to generate DOCX file');
    }
  }

  async convertToPdf(docxBuffer: Buffer): Promise<Buffer> {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();

      // Add content to PDF (this is a simplified version)
      // In a real implementation, you would need to parse the DOCX content
      // and properly format it in the PDF
      const { width, height } = page.getSize();
      page.drawText('Bill Generated', {
        x: 50,
        y: height - 50,
        size: 20,
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      logger.error('Error converting to PDF:', error);
      throw new Error('Failed to convert to PDF');
    }
  }
} 