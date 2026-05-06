/**
 * Version: 2.5.5
 * Description: Handles Excel file upload, runs ETL pipeline, and returns cleaned CSV paths.
 * Author: Ali Kahwaji
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const extract = require('../etl/extract');
const { transformSheetWithStats } = require('../etl/transform');
const { writeCsvOutput, writeManifestOutput } = require('../etl/load');
const { createIdMapper } = require('../etl/idMapper');
const { sweepCsvDirectory } = require('../etl/retention');

const router = express.Router();

function removeUploadedFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Failed to remove uploaded file: ${filePath}`, error.message);
    }
  }
}

router.post('/', async (req, res) => {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    sweepCsvDirectory();

    const idMapper = createIdMapper();

    const baseName = path.parse(file.originalname).name;
    const sheets = extract.extractSheets(file.path);
    const outputFiles = [];
    const sheetOutputs = [];
    const summary = {
      sheetsProcessed: 0,
      rowsProcessed: 0,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
    };

    for (const sheet of sheets) {
      const result = transformSheetWithStats(sheet.rows, idMapper);
      const outputPath = await writeCsvOutput(baseName, sheet.name, result.rows);
      const fileName = path.basename(outputPath);
      outputFiles.push(fileName);
      sheetOutputs.push({
        sheetName: sheet.name,
        fileName,
        ...result.stats,
      });
      summary.sheetsProcessed += 1;
      summary.rowsProcessed += result.stats.rowsProcessed;
      summary.duplicatesRemoved += result.stats.duplicatesRemoved;
      summary.invalidDobCount += result.stats.invalidDobCount;
      summary.missingNhiCount += result.stats.missingNhiCount;
    }

    const manifestPath = await writeManifestOutput(baseName, {
      sourceFileName: file.originalname,
      generatedAt: new Date().toISOString(),
      ...summary,
      files: outputFiles,
      sheets: sheetOutputs,
    });
    const manifestFile = path.basename(manifestPath);

    return res.status(200).json({
      message: 'Upload and transformation completed successfully.',
      files: outputFiles,
      manifest: manifestFile,
      sheets: sheetOutputs,
      ...summary,
    });
  } catch (error) {
    console.error('ETL Error:', error.message);
    return res.status(500).json({ error: 'An internal server error occurred while processing the Excel file.' });
  } finally {
    removeUploadedFile(file?.path);
  }
});

module.exports = router;
