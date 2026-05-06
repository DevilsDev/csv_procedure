/**
 * Version: 2.5.5
 * Description: API key authentication middleware. Uses CLINISYNC_API_KEY env var.
 *              When unset, requests are allowed through and a one-time warning is emitted —
 *              suitable for local development; production deployments must set the key.
 * Author: Ali Kahwaji
 */

const crypto = require('crypto');
const fs = require('fs');

let unauthenticatedWarningEmitted = false;

function cleanupUploadedFile(req) {
  const filePath = req.file && req.file.path;
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[apiKey] failed to remove rejected upload: ${filePath}`, err.message);
    }
  }
}

function readKey(req) {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  const headerKey = req.headers['x-api-key'];
  return typeof headerKey === 'string' ? headerKey.trim() : '';
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function apiKey() {
  return function apiKeyMiddleware(req, res, next) {
    const expected = process.env.CLINISYNC_API_KEY;

    if (!expected) {
      if (!unauthenticatedWarningEmitted) {
        console.warn('[security] CLINISYNC_API_KEY not set — /upload is unauthenticated. Do not run like this in production.');
        unauthenticatedWarningEmitted = true;
      }
      return next();
    }

    const provided = readKey(req);
    if (!provided || !safeEqual(provided, expected)) {
      cleanupUploadedFile(req);
      return res.status(401).json({ error: 'Invalid or missing API key.' });
    }

    return next();
  };
}

module.exports = apiKey;
