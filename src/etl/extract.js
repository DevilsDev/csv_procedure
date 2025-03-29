/**
 * Version: 2.4.0
 * Description: Extracts worksheet data from all sheets in an Excel file using row-based format.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * Extracts structured data from each sheet of an uploaded spreadsheet.
 *
 * @param {string} filePath - Absolute path to the uploaded Excel file
 * @returns {Array<{ name: string, rows: Array<Array<any>> }>}
 * @throws {Error} If the file path is invalid or unreadable
 */
function extractSheets(filePath) {
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
    throw new Error('❌ Invalid or missing file path provided to extractSheets().');
  }

  const workbook = xlsx.readFile(filePath);
  const sheets = workbook.SheetNames;
  const extracted = [];

  for (const name of sheets) {
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      defval: '', // fill empty cells with empty string
    });

    if (Array.isArray(rawRows) && rawRows.length > 0) {
      extracted.push({ name, rows: rawRows });
    }
  }

  return extracted;
}

module.exports = { extractSheets };
