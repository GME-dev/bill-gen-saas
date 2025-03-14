/**
 * This file is a preload fix for pg module to use IPv4 instead of IPv6
 * It's loaded before the application starts using the --require flag
 * 
 * Uses CommonJS syntax (.cjs) to be compatible with --require flag
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

console.log('PG IPv4 fix applied (CommonJS version)');