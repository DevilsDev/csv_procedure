/**
 * Version: 2.5.7
 * Description: Persists cleaned sheet data into timestamped CSV files for each worksheet.
 *              File I/O is async; CSV serialization is in-memory and bounded by the 5 MB upload cap.
 * Author: Ali Kahwaji
 */

const fsp = require('fs').promises;
const path = require('path');
const xlsx = require('xlsx');

const OUTPUT_DIR = path.resolve(__dirname, '../../csvs');

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
 * @returns {Promise<string>} Absolute path to the saved CSV file
 * @throws {Error} If data is missing or improperly formatted
 */
async function writeCsvOutput(baseName, sheetName, data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No data provided for sheet: "${sheetName}"`);
  }

  const safeSheet = sanitizeName(sheetName, 'sheet');
  const token = nextOutputToken(baseName, 'converted');
  const filename = `${token.filename}-${safeSheet}.csv`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  try {
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const csvText = xlsx.utils.sheet_to_csv(worksheet);
    await fsp.writeFile(outputPath, csvText, 'utf8');
  } catch (err) {
    throw new Error(`Failed to write CSV file: ${err.message}`);
  }

  return outputPath;
}

async function writeManifestOutput(baseName, manifestData) {
  const token = nextOutputToken(baseName, 'manifest');
  const filename = `${token.filename}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  try {
    await fsp.writeFile(outputPath, JSON.stringify(manifestData, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Failed to write manifest file: ${err.message}`);
  }

  return outputPath;
}

module.exports = { writeCsvOutput, writeManifestOutput };
