// PDFKit declarations
declare namespace PDFKit {
  interface PDFDocument {
    fontSize(size: number): PDFDocument;
    font(font: string): PDFDocument;
    text(text: string, x?: number, y?: number, options?: any): PDFDocument;
    fillColor(color: string): PDFDocument;
    moveDown(): PDFDocument;
    on(event: string, callback: Function): PDFDocument;
    end(): void;
    lineWidth(width: number): PDFDocument;
    moveTo(x: number, y: number): PDFDocument;
    lineTo(x: number, y: number): PDFDocument;
    stroke(): PDFDocument;
    strokeColor(color: string): PDFDocument;
  }
}

// Override the Error constructor to include captureStackTrace
interface ErrorConstructor {
  captureStackTrace(targetObject: Object, constructorOpt?: Function): void;
} 