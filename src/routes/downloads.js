/**
 * Version: 2.5.9
 * Description: Serves cleaned CSV outputs and per-upload manifests from the csvs/ directory.
 *              Gated on the same apiKey middleware as /upload (symmetric trust). Strict
 *              filename validation against the generated naming pattern prevents path
 *              traversal: only files named "converted-...csv" or "manifest-....json"
 *              produced by src/etl/load.js are downloadable.
 * Author: Ali Kahwaji
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const CSVS_DIR = path.resolve(__dirname, '../../csvs');

// Filenames produced by load.js: <suffix>-<safeBase>-<timestamp>-<counter>[-<safeSheet>].<ext>
// safeBase / safeSheet are sanitized to [a-z0-9_], so this whitelist is conservative.
const SAFE_FILENAME = /^(converted|manifest)-[a-z0-9_]+-\d+-\d+(-[a-z0-9_]+)?\.(csv|json)$/;

const CONTENT_TYPES = {
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

router.get('/:filename', (req, res) => {
  const { filename } = req.params;

  if (!SAFE_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  // Defense-in-depth even though the regex already excludes it: ensure resolved path
  // really is inside CSVS_DIR. Anything else means the request slipped past validation.
  const requested = path.resolve(CSVS_DIR, filename);
  if (path.dirname(requested) !== CSVS_DIR) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  if (!fs.existsSync(requested)) {
    return res.status(404).json({ error: 'File not found or already swept.' });
  }

  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');

  return res.sendFile(requested, (err) => {
    if (err && !res.headersSent) {
      console.error('[downloads] sendFile error:', err.message);
      res.status(500).json({ error: 'Failed to read file.' });
    }
  });
});

module.exports = router;
