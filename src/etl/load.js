/**
 * Version: 2.4.0
 * Description: Persists cleaned sheet data into timestamped CSV files for each worksheet.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

let writeCounter = 0;

function sanitizeName(value, fallback) {
  const sanitized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return sanitized || fallback;
}

function nextOutputToken(baseName, suffix) {
  const safeBase = sanitizeName(baseName, 'workbook');
  const timestamp = Date.now();
  writeCounter += 1;

  return {
    safeBase,
    timestamp,
    counter: writeCounter,
    filename: `${suffix}-${safeBase}-${timestamp}-${writeCounter}`,
  };
}

/**
 * Writes structured worksheet data into a CSV file.
 *
 * @param {string} baseName - Base name derived from the original uploaded file
 * @param {string} sheetName - The name of the individual sheet being processed
 * @param {Array<Array<any>>} data - Two-dimensional array of cleaned sheet data
 * @returns {string} Absolute path to the saved CSV file
 * @throws {Error} If data is missing or improperly formatted
 */
function writeCsvOutput(baseName, sheetName, data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`? No data provided for sheet: "${sheetName}"`);
  }

  const safeSheet = sanitizeName(sheetName, 'sheet');
  const token = nextOutputToken(baseName, 'converted');
  const filename = `${token.filename}-${safeSheet}.csv`;
  const outputPath = path.join(__dirname, '../../csvs', filename);

  try {
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Cleaned');
    xlsx.writeFile(workbook, outputPath, { bookType: 'csv' });
  } catch (err) {
    throw new Error(`? Failed to write CSV file: ${err.message}`);
  }

  return outputPath;
}

function writeManifestOutput(baseName, manifestData) {
  const token = nextOutputToken(baseName, 'manifest');
  const filename = `${token.filename}.json`;
  const outputPath = path.join(__dirname, '../../csvs', filename);

  try {
    fs.writeFileSync(outputPath, JSON.stringify(manifestData, null, 2));
  } catch (err) {
    throw new Error(`? Failed to write manifest file: ${err.message}`);
  }

  return outputPath;
}

module.exports = { writeCsvOutput, writeManifestOutput };
