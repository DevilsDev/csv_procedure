/**
 * Version: 2.7.4
 * Description: Dry-run preview endpoint. Runs the same ETL pipeline as /upload but writes
 *              nothing to disk — useful for inspecting what a workbook will turn into
 *              (especially after editing the configurable rule set) before committing to
 *              the production cleaning run.
 *
 *              Response shape mirrors /upload but:
 *                - no `files` / no `manifest` filenames, since nothing is persisted
 *                - each sheet entry includes `previewRows` (capped at PREVIEW_LIMIT) so
 *                  the caller can render the cleaned data inline
 * Author: Ali Kahwaji
 */

const express = require('express');
const fs = require('fs');
const extract = require('../etl/extract');
const { transformSheetWithStats } = require('../etl/transform');
const { createIdMapper } = require('../etl/idMapper');
const { DEFAULT_RULE_SET, loadRuleSetFromPath } = require('../etl/rules');

const router = express.Router();

const PREVIEW_LIMIT = 25; // header + 24 data rows

let cachedRuleSet = null;
function getRuleSet() {
  if (cachedRuleSet) return cachedRuleSet;
  const customPath = process.env.CLINISYNC_RULES_PATH;
  if (customPath) {
    try { cachedRuleSet = loadRuleSetFromPath(customPath); }
    catch { cachedRuleSet = DEFAULT_RULE_SET; }
  } else {
    cachedRuleSet = DEFAULT_RULE_SET;
  }
  return cachedRuleSet;
}

function emptySummary() {
  return {
    sheetsProcessed: 0,
    rowsProcessed: 0,
    duplicatesRemoved: 0,
    invalidDobCount: 0,
    missingNhiCount: 0,
    redactedCellCount: 0,
  };
}

function removeUploadedFile(filePath) {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); }
  catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[preview] failed to remove uploaded temp:', err.message);
    }
  }
}

router.post('/', async (req, res) => {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ruleSet = getRuleSet();
    const idMapper = createIdMapper();

    const sheets = extract.extractSheets(file.path);
    const sheetOutputs = [];
    const summary = emptySummary();

    for (const sheet of sheets) {
      const result = transformSheetWithStats(sheet.rows, idMapper, { ruleSet });

      // Cap the rows we ship back so a 5 MB workbook doesn't produce a 5 MB JSON response.
      const cappedRows = result.rows.slice(0, PREVIEW_LIMIT);
      const totalDataRows = Math.max(0, result.rows.length - 1);
      const previewedDataRows = Math.max(0, cappedRows.length - 1);

      sheetOutputs.push({
        sheetName: sheet.name,
        ...result.stats,
        previewRows: cappedRows,
        previewMeta: {
          totalDataRows,
          previewedDataRows,
          truncated: previewedDataRows < totalDataRows,
        },
      });
      summary.sheetsProcessed += 1;
      summary.rowsProcessed += result.stats.rowsProcessed;
      summary.duplicatesRemoved += result.stats.duplicatesRemoved;
      summary.invalidDobCount += result.stats.invalidDobCount;
      summary.missingNhiCount += result.stats.missingNhiCount;
      summary.redactedCellCount += result.stats.redactedCellCount;
    }

    return res.status(200).json({
      message: 'Preview generated. No files were written.',
      sourceFileName: file.originalname,
      generatedAt: new Date().toISOString(),
      sheets: sheetOutputs,
      ...summary,
      previewLimit: PREVIEW_LIMIT,
      dryRun: true,
    });
  } catch (error) {
    console.error('[preview] ETL error:', error.message);
    return res.status(500).json({ error: 'An internal server error occurred while previewing the workbook.' });
  } finally {
    removeUploadedFile(file && file.path);
  }
});

router._resetRuleSetCacheForTests = function () { cachedRuleSet = null; };

module.exports = router;
