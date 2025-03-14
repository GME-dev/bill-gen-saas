/**
 * This file is a preload fix for the pg module to ensure it uses the connection string directly
 * without any modifications. It patches the Pool constructor to prevent any hostname replacement.
 */

'use strict';

// Force IPv4 for PostgreSQL connections
const dns = require('dns');
const { isIP } = require('net');

// Store the original lookup function
const originalLookup = dns.lookup;

// Override the lookup function to prioritize IPv4
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  options = options || {};
  
  // Force IPv4
  options.family = 4;
  
  // If it's already an IP, just return it
  if (isIP(hostname)) {
    const ip = hostname;
    const family = isIP(ip);
    process.nextTick(() => {
      callback(null, ip, family);
    });
    return;
  }

  return originalLookup(hostname, options, callback);
};

// Patch the pg module to prevent connection string modifications
try {
  // This will run before any other code, so we need to wait for the pg module to be loaded
  process.on('beforeExit', () => {
    try {
      // Try to get the pg module
      const pg = require('pg');
      const originalPool = pg.Pool;
      
      // Patch the Pool constructor to log and use the connection string directly
      pg.Pool = function(config) {
        console.log('DB-FIX: Intercepted Pool constructor');
        
        // If there's a connectionString, make sure it's used directly
        if (config && config.connectionString) {
          const maskedString = config.connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
          console.log(`DB-FIX: Using connection string directly: ${maskedString}`);
          
          // Ensure SSL is properly configured
          if (!config.ssl) {
            config.ssl = { rejectUnauthorized: false };
            console.log('DB-FIX: Added SSL configuration');
          }
          
          // Increase timeout for better reliability
          if (!config.connectionTimeoutMillis || config.connectionTimeoutMillis < 30000) {
            config.connectionTimeoutMillis = 30000;
            console.log('DB-FIX: Increased connection timeout to 30 seconds');
          }
        }
        
        // Call the original constructor
        return new originalPool(config);
      };
      
      console.log('DB-FIX: Successfully patched pg.Pool constructor');
    } catch (err) {
      console.error('DB-FIX: Failed to patch pg module:', err);
    }
  });
  
  console.log('DB-FIX: Preload script registered');
} catch (err) {
  console.error('DB-FIX: Error in preload script:', err);
}

console.log('DB-FIX: Database connection fix applied'); 