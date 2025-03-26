/**
 * Version: 1.0.0
 * Description: Loads cleaned sheet data and writes it to timestamped CSV files.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * Saves cleaned rows into a CSV file named by sheet and timestamp.
 *
 * @param {string} baseName - Base name derived from original upload
 * @param {string} sheetName - Name of the current sheet
 * @param {Array<Array<any>>} data - Cleaned rows to write
 * @returns {string} full file path of the created CSV
 */
function writeCsvOutput(baseName, sheetName, data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No data to write for sheet: ${sheetName}`);
  }

  const safeSheet = sheetName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const timestamp = Date.now();
  const filename = `converted-${timestamp}-${safeSheet}.csv`;
  const outputPath = path.join(__dirname, '../../csvs', filename);

  const ws = xlsx.utils.aoa_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Cleaned');

  xlsx.writeFile(wb, outputPath, { bookType: 'csv' });
  return outputPath;
}

module.exports = { writeCsvOutput };
