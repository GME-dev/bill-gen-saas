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