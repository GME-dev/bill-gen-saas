import { PDFDocument } from 'pdf-lib';
import { signatureManager } from '../utils/signatureManager.js';

export async function generatePDF(content) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        page.drawText(content, {
            x: 50,
            y: height - 50,
            size: 12
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

export async function signPDF(pdfPath, certificateId, password) {
    try {
        return await signatureManager.signPDF(pdfPath, certificateId, password);
    } catch (error) {
        console.error('Error signing PDF:', error);
        throw error;
    }
}

export async function verifySignature(pdfPath) {
    try {
        return await signatureManager.verifySignature(pdfPath);
    } catch (error) {
        console.error('Error verifying signature:', error);
        throw error;
    }
} 