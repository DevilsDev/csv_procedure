/**
 * Version: 2.0.0
 * Description: Handles Excel file uploads and routes them through cleaning logic based on file identity.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const express = require('express');
const cleanWorksheetData = require('../utils/cleanWorksheetData');

const router = express.Router();

/**
 * POST /upload
 * Accepts a file upload, processes the Excel content, and saves a cleaned CSV version.
 */
router.post('/', (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const fileIdentifier = extractFileIdentifier(req.file.originalname);
    const cleanedData = cleanWorksheetData(rawSheet, fileIdentifier);

    const outputFilename = `converted-${Date.now()}.csv`;
    const outputPath = path.join(__dirname, '../../csvs', outputFilename);

    const cleanedSheet = XLSX.utils.aoa_to_sheet(cleanedData);
    const csv = XLSX.utils.sheet_to_csv(cleanedSheet);

    fs.writeFileSync(outputPath, csv);

    res.status(200).send(`CSV saved at: ${outputPath}`);
  } catch (error) {
    console.error('❌ File processing error:', error);
    res.status(500).send('An error occurred while processing the file.');
  }
});

/**
 * Determines the file identity based on filename keywords
 * @param {string} filename - Original uploaded filename
 * @returns {string} - Cleaned identifier for routing
 */
function extractFileIdentifier(filename) {
  const name = filename.toLowerCase();
  if (name.includes('case-mix')) return 'Case-mix';
  if (name.includes('fare-up')) return 'Fare-up';
  if (name.includes('holistic')) return 'Holistic';
  if (name.includes('outpatient')) return 'Outpatient';
  return 'Generic';
}

module.exports = router;
