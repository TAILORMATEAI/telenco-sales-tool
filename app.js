/**
 * Production entry point for GoDaddy cPanel "Setup Node.js App".
 * 
 * cPanel expects a plain .js file as the "Application startup file".
 * This file simply uses tsx to run the TypeScript server.
 */
process.env.NODE_ENV = 'production';

// Use tsx register to enable TypeScript execution
import('tsx/esm/api').then(({ register }) => {
  register();
  import('./server.ts');
}).catch(() => {
  // Fallback: try running directly (if tsx is globally available)
  import('./server.ts');
});
