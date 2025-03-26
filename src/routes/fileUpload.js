/**
 * Version: 2.3.0
 * Description: Handles file upload, runs ETL pipeline, and returns cleaned CSV(s).
 * Author: Ali Kahwaji
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
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
    if (!file) return res.status(400).send('No file uploaded.');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      fs.unlinkSync(file.path);
      return res.status(400).send('Unsupported file format.');
    }

    if (file.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(file.path);
      return res.status(400).send('File is too large. Max 5MB allowed.');
    }

    // Reset shared NHI → ID map before starting
    resetIdMap();

    // ETL Flow
    const baseName = path.parse(file.originalname).name;
    const sheets = extract.extractSheets(file.path);
    const outputFiles = [];

    for (const sheet of sheets) {
      const cleaned = transformSheet(sheet.rows);
      const outPath = writeCsvOutput(baseName, sheet.name, cleaned);
      outputFiles.push(outPath);
    }

    res.status(200).json({
      message: 'Upload and transformation successful.',
      outputs: outputFiles.map(fp => path.basename(fp))
    });

  } catch (err) {
    console.error('❌ Error during ETL process:', err.message);
    res.status(500).send('Server error while processing the Excel file.');
  }
});

module.exports = router;
