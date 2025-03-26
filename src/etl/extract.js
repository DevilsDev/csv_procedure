/**
 * Version: 1.0.0
 * Description: Extracts all sheets from a spreadsheet file and converts them to row-based arrays.
 * Author: Ali Kahwaji
 */

const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Extracts all sheets from the given Excel file.
 *
 * @param {string} filePath - Absolute path to the uploaded Excel file
 * @returns {Array<{ name: string, rows: Array<Array<any>> }>}
 */
function extractSheets(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Invalid file path provided to extractSheets().');
  }

  const workbook = xlsx.readFile(filePath);
  const extracted = [];

  for (const sheetName of workbook.SheetNames) {
    const raw = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, // Raw row-by-row format
      defval: '' // Fill undefined cells with empty string
    });

    if (Array.isArray(raw) && raw.length > 0) {
      extracted.push({ name: sheetName, rows: raw });
    }
  }

  return extracted;
}

module.exports = { extractSheets };
