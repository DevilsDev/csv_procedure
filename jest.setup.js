/**
 * Version: 1.0.0
 * Description: Global setup for Jest environment (polyfills, mocks)
 * Author: Ali Kahwaji
 */

// Polyfill for Node < 18 (used by jsdom)
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
  }
  if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
  }
  
  // Prevent crashes on alert calls in jsdom
  global.alert = jest.fn();
  