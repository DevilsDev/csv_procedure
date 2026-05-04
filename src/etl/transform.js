/**
 * Version: 2.4.0
 * Description: Applies anonymization and data cleaning rules to a spreadsheet sheet, including NHI?ID mapping and DOB?Age transformation.
 * Author: Ali Kahwaji
 */

const { getAnonymizedId } = require('./idMapper');

function getEmptyStats() {
  return {
    rowsProcessed: 0,
    duplicatesRemoved: 0,
    invalidDobCount: 0,
    missingNhiCount: 0,
  };
}

function isMissingNhi(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function isBlankCell(value) {
  return value === null || value === undefined || value === '';
}

/**
 * Transforms raw worksheet data by sanitizing headers, anonymizing sensitive fields,
 * converting DOB to age, and removing duplicate or irrelevant rows.
 *
 * @param {Array<Array<any>>} rows - Raw worksheet rows extracted using xlsx
 * @returns {{ rows: Array<Array<any>>, stats: { rowsProcessed: number, duplicatesRemoved: number, invalidDobCount: number, missingNhiCount: number } }}
 */
function transformSheetWithStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: [], stats: getEmptyStats() };
  }

  const rawHeader = rows[0];
  const cleaned = [];
  const columnMap = [];
  const stats = getEmptyStats();

  for (let i = 0; i < rawHeader.length; i++) {
    const rawCol = String(rawHeader[i] || '').trim().toLowerCase();

    if (!rawCol || rawCol.startsWith('column')) {
      columnMap.push(null);
    } else if (rawCol === 'nhi') {
      columnMap.push('ID');
    } else if (rawCol === 'dob') {
      columnMap.push('Age');
    } else if (['contact', 'address'].some(s => rawCol.includes(s))) {
      columnMap.push(null);
    } else {
      columnMap.push(rawHeader[i]);
    }
  }

  cleaned.push(columnMap.filter(Boolean));

  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const rawRow = rows[i];
    if (!Array.isArray(rawRow) || rawRow.every(cell => !cell)) continue;

    stats.rowsProcessed += 1;
    const cleanedRow = [];

    for (let j = 0; j < columnMap.length; j++) {
      const label = columnMap[j];
      if (!label) continue;

      const cellValue = rawRow[j];

      if (label === 'ID') {
        if (isMissingNhi(cellValue)) {
          stats.missingNhiCount += 1;
          cleanedRow.push('');
        } else {
          cleanedRow.push(getAnonymizedId(cellValue));
        }
      } else if (label === 'Age') {
        const age = calculateAgeFromDOB(cellValue);
        if (age === '' && !isBlankCell(cellValue)) {
          stats.invalidDobCount += 1;
        }
        cleanedRow.push(age);
      } else {
        cleanedRow.push(cellValue);
      }
    }

    const key = cleanedRow.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(cleanedRow);
    } else {
      stats.duplicatesRemoved += 1;
    }
  }

  return { rows: cleaned, stats };
}

/**
 * @param {Array<Array<any>>} rows
 * @returns {Array<Array<any>>}
 */
function transformSheet(rows) {
  return transformSheetWithStats(rows).rows;
}

function calculateAgeFromDOB(dobRaw) {
  try {
    const dob = new Date(dobRaw);
    if (isNaN(dob)) return '';

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();

    const hasHadBirthday = (now.getMonth() > dob.getMonth()) ||
      (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!hasHadBirthday) age--;

    return age >= 0 && age < 130 ? age : '';
  } catch {
    return '';
  }
}

module.exports = { transformSheet, transformSheetWithStats };
