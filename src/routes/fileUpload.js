/**
 * Version: 2.2.2
 * Description: Handles file upload, cleaning, and CSV response.
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

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      fs.unlinkSync(file.path);
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

    await logUpload({
      original: file.originalname,
      size: file.size,
      savedAs: filename,
      uploadedAt: moment().toISOString()
    });

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

async function logUpload(entry) {
  const logPath = path.join(__dirname, '../../uploadLog.json');
  let log = [];

  try {
    const data = await fsPromises.readFile(logPath, 'utf-8');
    log = JSON.parse(data);
  } catch {
    console.warn('Log file not found, creating new one.');
  }

  log.push(entry);
  await fsPromises.writeFile(logPath, JSON.stringify(log, null, 2));
}

function extractFileIdentifier(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('case-mix')) return 'Case-mix';
  if (lower.includes('fare-up')) return 'Fare-up';
  if (lower.includes('holistic')) return 'Holistic';
  if (lower.includes('outpatient')) return 'Outpatient';
  return 'unknown';
}

module.exports = router;
