// Type declarations for imported modules

declare module '*.js' {
  const content: any;
  export default content;
  export * from content;
}

// Add specific declarations for our modules
declare module './utils/database.js' {
  export function initializeDatabase(): Promise<any>;
  export function getDatabase(): any;
  export function closeDatabase(): Promise<void>;
}

declare module './routes/bills.js' {
  import { Router } from 'express';
  const router: Router & { handle: Function };
  export default router;
}

declare module './routes/bike-models.js' {
  import { Router } from 'express';
  const router: Router;
  export default router;
}

declare module './routes/health.js' {
  import { Router } from 'express';
  const router: Router;
  export default router;
}

// Type declarations for modules without type definitions

declare module 'morgan' {
  import { Handler } from 'express';
  
  /**
   * Morgan logger middleware function
   */
  function morgan(format: string | Function, options?: morgan.Options): Handler;
  
  namespace morgan {
    interface Options {
      immediate?: boolean;
      skip?: (req: any, res: any) => boolean;
      stream?: { write: (str: string) => void };
    }
  }
  
  export = morgan;
}

declare module '@pdf-lib/fontkit' {
  const fontkit: any;
  export default fontkit;
}

declare module 'docxtemplater' {
  class Docxtemplater {
    constructor(options?: any);
    loadZip(zip: any): void;
    setData(data: any): void;
    render(): void;
    getZip(): any;
  }
  export = Docxtemplater;
}

declare module 'pizzip' {
  class PizZip {
    constructor(data?: any, options?: any);
    file(path: string): any;
    generate(options?: any): any;
  }
  export = PizZip;
} 