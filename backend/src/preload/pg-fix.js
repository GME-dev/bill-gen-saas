/**
 * This file is a preload fix for pg module to use IPv4 instead of IPv6
 * It's loaded before the application starts using the --require flag
 */

// Force IPv4 DNS resolution
require('dns').setDefaultResultOrder('ipv4first');

// Monkey patch Socket to force IPv4
const net = require('net');
const originalConnect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function() {
  // Force IPv4 family when connecting to PostgreSQL
  if (arguments[0] && typeof arguments[0] === 'object' && arguments[0].port === 5432) {
    console.log('FORCING IPV4 FOR POSTGRESQL CONNECTION');
    arguments[0].family = 4;
  }
  return originalConnect.apply(this, arguments);
};

console.log('PG IPv4 fix applied');