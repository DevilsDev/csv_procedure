/**
 * Version: 2.1.0
 * Description: Handles Excel file upload, identifies type, cleans data, and returns downloadable CSV.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const xlsx = require('xlsx');
const moment = require('moment');
const express = require('express');
const router = express.Router();
const cleanWorksheetData = require('../utils/cleanWorksheetData');

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.ods'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

router.post('/', async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      fs.unlinkSync(file.path); // remove bad file
      return res.status(400).send('Unsupported file format.');
    }

    if (file.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(file.path);
      return res.status(400).send('File is too large. Max 5MB allowed.');
    }

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const fileIdentifier = extractFileIdentifier(file.originalname);

    const cleanedData = cleanWorksheetData(sheet, fileIdentifier);

    const newSheet = xlsx.utils.aoa_to_sheet(cleanedData);
    const newBook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newBook, newSheet, 'Cleaned');

    const timestamp = Date.now();
    const filename = `converted-${timestamp}.csv`;
    const outputPath = path.join(__dirname, '../../csvs', filename);

    xlsx.writeFile(newBook, outputPath, { bookType: 'csv' });

    // Log metadata
    await logUpload({
      original: file.originalname,
      size: file.size,
      savedAs: filename,
      uploadedAt: moment().toISOString()
    });

    // Send file as download
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('❌ Download failed:', err);
        res.status(500).send('Error delivering file.');
      }
    });

  } catch (err) {
    console.error('❌ Server error during file upload:', err);
    res.status(500).send('Server error.');
  }
});

// Util: basic audit log
async function logUpload(entry) {
  const logPath = path.join(__dirname, '../../uploadLog.json');
  let log = [];

  try {
    const data = await fsPromises.readFile(logPath, 'utf-8');
    log = JSON.parse(data);
  } catch {
    // file may not exist yet
  }

  log.push(entry);
  await fsPromises.writeFile(logPath, JSON.stringify(log, null, 2));
}

// Util: filename → identifier
function extractFileIdentifier(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('case-mix')) return 'Case-mix';
  if (lower.includes('fare-up')) return 'Fare-up';
  if (lower.includes('holistic')) return 'Holistic';
  if (lower.includes('outpatient')) return 'Outpatient';
  return 'unknown';
}

module.exports = router;
