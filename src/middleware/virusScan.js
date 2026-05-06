/**
 * Version: 2.5.7
 * Description: Virus-scan middleware for uploaded files. Runs after multer (so the file is on
 *              disk) and after auth (so we don't burn scanner cycles on unauthenticated trash).
 *
 *              Scanner contract:
 *                  scanFile(absolutePath) -> Promise<{ clean: boolean, viruses?: string[] }>
 *
 *              The default scanner is a no-op that emits a one-time startup warning. For real
 *              protection, set CLAMAV_TCP_HOST (and optionally CLAMAV_TCP_PORT) and install the
 *              `clamscan` package — see ./clamavScanner.js.
 * Author: Ali Kahwaji
 */

const fs = require('fs');

function createNoopScanner() {
  let warned = false;
  return {
    name: 'noop',
    async scanFile() {
      if (!warned) {
        console.warn('[security] virus scanner not configured — uploads are NOT being scanned. Set CLAMAV_TCP_HOST for production.');
        warned = true;
      }
      return { clean: true };
    },
  };
}

function createDefaultScanner() {
  if (!process.env.CLAMAV_TCP_HOST) {
    return createNoopScanner();
  }
  try {
    const { createClamavScanner } = require('./clamavScanner');
    const scanner = createClamavScanner({
      host: process.env.CLAMAV_TCP_HOST,
      port: Number(process.env.CLAMAV_TCP_PORT) || 3310,
    });
    console.log('[virusScan] using ClamAV scanner at', `${process.env.CLAMAV_TCP_HOST}:${process.env.CLAMAV_TCP_PORT || 3310}`);
    return scanner;
  } catch (err) {
    console.warn('[virusScan] failed to init ClamAV, falling back to no scanning:', err.message);
    return createNoopScanner();
  }
}

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[virusScan] failed to remove ${filePath}:`, err.message);
    }
  }
}

function virusScan(scanner) {
  const active = scanner || createDefaultScanner();

  return async function virusScanMiddleware(req, res, next) {
    const filePath = req.file && req.file.path;
    if (!filePath) return next();

    let result;
    try {
      result = await active.scanFile(filePath);
    } catch (err) {
      console.error('[virusScan] scan error:', err.message);
      safeUnlink(filePath);
      return res.status(503).json({ error: 'Unable to scan upload. Please retry shortly.' });
    }

    if (!result.clean) {
      console.warn('[virusScan] rejected infected upload', {
        filename: req.file && req.file.originalname,
        viruses: result.viruses || [],
      });
      safeUnlink(filePath);
      return res.status(422).json({ error: 'Upload rejected: malware detected.' });
    }

    return next();
  };
}

module.exports = virusScan;
module.exports.createNoopScanner = createNoopScanner;
module.exports.createDefaultScanner = createDefaultScanner;
