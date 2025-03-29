/**
 * Version: 2.4.0
 * Description: Persists cleaned sheet data into timestamped CSV files for each worksheet.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

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
    throw new Error(`❌ No data provided for sheet: "${sheetName}"`);
  }

  const safeSheet = sheetName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const timestamp = Date.now();
  const filename = `converted-${timestamp}-${safeSheet}.csv`;
  const outputPath = path.join(__dirname, '../../csvs', filename);

  try {
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Cleaned');
    xlsx.writeFile(workbook, outputPath, { bookType: 'csv' });
  } catch (err) {
    throw new Error(`❌ Failed to write CSV file: ${err.message}`);
  }

  return outputPath;
}

module.exports = { writeCsvOutput };
