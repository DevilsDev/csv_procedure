/**
 * Version: 2.7.5
 * Description: POST /detect — run column-level PHI / PII / quasi-identifier detection
 *              on an uploaded workbook. Returns the per-column report and a suggested
 *              rule set the caller can pass straight to /upload or /preview.
 *              No files are written.
 * Author: Ali Kahwaji
 */

const express = require('express');
const fs = require('fs');
const extract = require('../etl/extract');
const { detectSheets } = require('../etl/detect');

const router = express.Router();

function removeUploadedFile(filePath) {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); }
  catch (err) {
    if (err.code !== 'ENOENT') console.warn('[detect] failed to remove temp:', err.message);
  }
}

router.post('/', (req, res) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const sheets = extract.extractSheets(file.path);
    const report = detectSheets(sheets);

    return res.status(200).json({
      message: 'Detection complete. No files were written.',
      sourceFileName: file.originalname,
      generatedAt: new Date().toISOString(),
      sheetsScanned: sheets.length,
      columns: report.columns,
      suggestedRuleSet: report.suggestedRuleSet,
      summary: report.summary,
      dryRun: true,
    });
  } catch (error) {
    console.error('[detect] error:', error.message);
    return res.status(500).json({ error: 'Detection failed.' });
  } finally {
    removeUploadedFile(file && file.path);
  }
});

module.exports = router;
