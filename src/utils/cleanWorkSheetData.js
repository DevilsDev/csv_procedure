/**
 * Version: 2.4.0
 * Description: Cleans raw Excel worksheet data into anonymized, deduplicated, and secure format with standardized headers.
 * Author: Ali Kahwaji
 */

const moment = require('moment');

/**
 * Transforms and sanitizes raw worksheet rows.
 * Handles sensitive data removal, anonymization (ID from NHI), and DOB conversion to Age.
 *
 * @param {Array<Array<any>>} data - Raw 2D array from Excel sheet
 * @returns {Array<Array<any>>} Cleaned, deduplicated 2D array with transformed headers and rows
 */
function cleanWorksheetData(data) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const headerRow = data[0];
  const cleanedRows = [];

  const idMap = new Map();
  let idCounter = 1;
  const seenKeys = new Set();

  const columnMap = headerRow.map((header) => {
    const col = String(header || '').trim().toLowerCase();

    if (!col || col.startsWith('column')) return null;
    if (col === 'nhi') return 'ID';
    if (col === 'dob') return 'Age';
    if (['contact', 'address'].includes(col)) return null;

    return header;
  });

  cleanedRows.push(columnMap.filter(Boolean));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell || cell === '')) continue;

    const cleanedRow = [];

    for (let j = 0; j < columnMap.length; j++) {
      const label = columnMap[j];
      if (!label) continue;

      const value = row[j];

      if (label === 'ID') {
        const nhi = String(value).trim();
        if (!idMap.has(nhi)) {
          const newId = `ID-${String(idCounter++).padStart(3, '0')}`;
          idMap.set(nhi, newId);
        }
        cleanedRow.push(idMap.get(nhi));
      } else if (label === 'Age') {
        const dob = moment(new Date(value));
        const age = dob.isValid() ? moment().diff(dob, 'years') : '';
        cleanedRow.push(age);
      } else {
        cleanedRow.push(value);
      }
    }

    const rowKey = cleanedRow.join('|');
    if (!seenKeys.has(rowKey)) {
      cleanedRows.push(cleanedRow);
      seenKeys.add(rowKey);
    }
  }

  return cleanedRows;
}

module.exports = cleanWorksheetData;
