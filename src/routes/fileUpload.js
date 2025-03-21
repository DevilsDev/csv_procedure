/**
 * Version: 1.0.0
 * Description: Handles Excel file processing, cleaning, and conversion to CSV.
 * Author: Ali Kahwaji
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const cleanWorksheetData = require('../utils/cleanWorksheetData');

const router = express.Router();

router.post('/', (req, res) => {
  if (!req.file) {
    return res.status(400).send('⚠️ Excel file is required.');
  }

  const uploadedFilePath = req.file.path;

  try {
    // Parse the Excel file and extract the first sheet
    const workbook = XLSX.readFile(uploadedFilePath, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert worksheet to raw 2D array
    const rawWorksheetData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      header: 1
    });

    // Clean and format the worksheet data
    const tidyData = cleanWorksheetData(rawWorksheetData);

    // Convert cleaned data to CSV format
    const csvContent = tidyData.map(row => row.join(',')).join('\n');

    // Save CSV to local output directory
    const outputFilename = `${Date.now()}-converted.csv`;
    const outputPath = path.join(__dirname, '../../csvs', outputFilename);
    fs.writeFileSync(outputPath, csvContent);

    return res.status(200).send(`✅ CSV successfully saved at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error during file processing:', error);
    return res.status(500).send('An error occurred while processing the file.');
  }
});

module.exports = router;
