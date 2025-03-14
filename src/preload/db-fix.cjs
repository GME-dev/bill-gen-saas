/**
 * This file is a preload fix for the pg module to handle SSL certificate issues
 * and ensure proper connection to Supabase.
 */

'use strict';

console.log('DB-FIX: Loading database connection fix');

// Force IPv4 for DNS resolution
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
  console.log('DB-FIX: Forced IPv4 DNS resolution');
}

// Disable SSL verification by monkey patching process.env
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.log('DB-FIX: Disabled SSL certificate validation for development');

// Monkey patch pg module when it's loaded
let pgPatched = false;

// Create a custom require function that intercepts pg module
const originalRequire = module.require;
module.require = function(moduleName) {
  const loadedModule = originalRequire.apply(this, arguments);
  
  // Patch pg module when it's loaded
  if (moduleName === 'pg' && !pgPatched) {
    console.log('DB-FIX: Patching pg module');
    
    // Store original Pool constructor
    const originalPool = loadedModule.Pool;
    
    // Replace Pool constructor with our own version
    loadedModule.Pool = function(config) {
      console.log('DB-FIX: Creating Pool with custom config');
      
      // Make sure we have a configuration object
      config = config || {};
      
      // If there's a connection string, log it (masked)
      if (config.connectionString) {
        const maskedString = config.connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
        console.log(`DB-FIX: Connection string: ${maskedString}`);
      }
      
      // Ensure SSL is properly configured
      config.ssl = {
        rejectUnauthorized: false
      };
      console.log('DB-FIX: SSL verification disabled');
      
      // Increase timeout for better reliability
      config.connectionTimeoutMillis = 30000;
      config.idleTimeoutMillis = 30000;
      console.log('DB-FIX: Connection timeout increased to 30 seconds');
      
      // Call original constructor with modified config
      return new originalPool(config);
    };
    
    pgPatched = true;
    console.log('DB-FIX: pg module successfully patched');
  }
  
  return loadedModule;
};

console.log('DB-FIX: Database connection fix applied'); 