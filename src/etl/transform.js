/**
 * Version: 2.4.0
 * Description: Applies anonymization and data cleaning rules to a spreadsheet sheet, including NHI→ID mapping and DOB→Age transformation.
 * Author: Ali Kahwaji
 */

const { getAnonymizedId } = require('./idMapper');

/**
 * Transforms raw worksheet data by sanitizing headers, anonymizing sensitive fields,
 * converting DOB to age, and removing duplicate or irrelevant rows.
 *
 * @param {Array<Array<any>>} rows - Raw worksheet rows extracted using xlsx
 * @returns {Array<Array<any>>} Cleaned and transformed 2D array
 */
function transformSheet(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const rawHeader = rows[0];
  const cleaned = [];
  const columnMap = [];

  // Step 1: Normalize headers
  for (let i = 0; i < rawHeader.length; i++) {
    const rawCol = String(rawHeader[i] || '').trim().toLowerCase();

    if (!rawCol || rawCol.startsWith('column')) {
      columnMap.push(null); // Unnamed/empty column
    } else if (rawCol === 'nhi') {
      columnMap.push('ID');
    } else if (rawCol === 'dob') {
      columnMap.push('Age');
    } else if (['contact', 'address'].some(s => rawCol.includes(s))) {
      columnMap.push(null); // Sensitive fields removed
    } else {
      columnMap.push(rawHeader[i]); // Keep original label
    }
  }

  cleaned.push(columnMap.filter(Boolean)); // Final header

  const seen = new Set();

  // Step 2: Clean and transform rows
  for (let i = 1; i < rows.length; i++) {
    const rawRow = rows[i];
    if (!Array.isArray(rawRow) || rawRow.every(cell => !cell)) continue;

    const cleanedRow = [];

    for (let j = 0; j < columnMap.length; j++) {
      const label = columnMap[j];
      if (!label) continue;

      const cellValue = rawRow[j];

      if (label === 'ID') {
        cleanedRow.push(getAnonymizedId(String(cellValue)));
      } else if (label === 'Age') {
        cleanedRow.push(calculateAgeFromDOB(cellValue));
      } else {
        cleanedRow.push(cellValue);
      }
    }

    // Deduplicate by content
    const key = cleanedRow.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(cleanedRow);
    }
  }

  return cleaned;
}

/**
 * Converts a DOB input into age in years. Returns an empty string on failure or out-of-bound values.
 *
 * @param {*} dobRaw - Raw date input
 * @returns {number|string} - Calculated age, or empty string if invalid
 */
function calculateAgeFromDOB(dobRaw) {
  try {
    const dob = new Date(dobRaw);
    if (isNaN(dob)) return '';

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();

    // Adjust if birthday hasn't occurred yet this year
    const hasHadBirthday = (now.getMonth() > dob.getMonth()) ||
      (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!hasHadBirthday) age--;

    return age >= 0 && age < 130 ? age : '';
  } catch {
    return '';
  }
}

module.exports = { transformSheet };
