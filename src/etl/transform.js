/**
 * Version: 1.0.0
 * Description: Applies anonymization and cleaning rules to a single sheet.
 * Author: Ali Kahwaji
 */

const { getAnonymizedId } = require('./idMapper');

/**
 * Transforms a sheet's raw rows with built-in privacy and cleanup logic.
 * 
 * @param {Array<Array<any>>} rows - Raw rows extracted from a sheet
 * @returns {Array<Array<any>>} - Cleaned rows with header
 */
function transformSheet(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const header = rows[0];
  const cleaned = [];
  const columnMap = [];

  // Map each header to its clean role
  for (let i = 0; i < header.length; i++) {
    const col = String(header[i] || '').trim().toLowerCase();
    if (!col || col.startsWith('column')) {
      columnMap.push(null); // skip unnamed columns
    } else if (col === 'nhi') {
      columnMap.push('ID');
    } else if (col === 'dob') {
      columnMap.push('Age');
    } else if (['contact', 'address'].includes(col)) {
      columnMap.push(null); // remove sensitive columns
    } else {
      columnMap.push(header[i]); // preserve original name
    }
  }

  cleaned.push(columnMap.filter(Boolean)); // final header row

  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every(cell => !cell)) continue;

    const newRow = [];

    for (let j = 0; j < columnMap.length; j++) {
      const label = columnMap[j];
      if (!label) continue;

      const raw = row[j];

      if (label === 'ID') {
        newRow.push(getAnonymizedId(String(raw)));
      } else if (label === 'Age') {
        newRow.push(calculateAgeFromDOB(raw));
      } else {
        newRow.push(raw);
      }
    }

    const rowKey = newRow.join('|');
    if (!seen.has(rowKey)) {
      cleaned.push(newRow);
      seen.add(rowKey);
    }
  }

  return cleaned;
}

/**
 * Converts a DOB value into age (years).
 * 
 * @param {*} dobRaw - Any raw date input
 * @returns {string|number} - Age if valid, otherwise empty string
 */
function calculateAgeFromDOB(dobRaw) {
  try {
    const date = new Date(dobRaw);
    if (isNaN(date)) return '';
    const age = new Date().getFullYear() - date.getFullYear();
    return age >= 0 && age < 130 ? age : '';
  } catch {
    return '';
  }
}

module.exports = { transformSheet };
