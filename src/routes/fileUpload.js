/**
 * Version: 2.4.0
 * Description: Handles Excel file upload, runs ETL pipeline, and returns cleaned CSV paths.
 * Author: Ali Kahwaji
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const extract = require('../etl/extract');
const { transformSheet } = require('../etl/transform');
const { writeCsvOutput } = require('../etl/load');
const { resetIdMap } = require('../etl/idMapper');

const router = express.Router();

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.ods'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

router.post('/', async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Unsupported file format.' });
    }

    if (file.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'File exceeds the maximum size of 5MB.' });
    }

    resetIdMap(); // Clear global state to ensure clean ID mapping

    const baseName = path.parse(file.originalname).name;
    const sheets = extract.extractSheets(file.path);
    const outputFiles = [];

    for (const sheet of sheets) {
      const cleaned = transformSheet(sheet.rows);
      const outputPath = writeCsvOutput(baseName, sheet.name, cleaned);
      outputFiles.push(path.basename(outputPath));
    }

    return res.status(200).json({
      message: 'Upload and transformation completed successfully.',
      files: outputFiles
    });

  } catch (error) {
    console.error('❌ ETL Error:', error.message);
    return res.status(500).json({ error: 'An internal server error occurred while processing the Excel file.' });
  }
});

module.exports = router;
