/**
 * Version: 2.2.1
 * Description: Cleans raw Excel data into standardized, secure output.
 * Author: Ali Kahwaji
 */

const moment = require('moment');

function cleanWorksheetData(data) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const header = data[0];
  const cleanedRows = [];

  // Create ID map for consistent anonymization
  const idMap = new Map();
  let idCounter = 1;

  const columnMap = header.map((col) => {
    const lower = (col || '').toLowerCase().trim();

    if (!col || lower.includes('column')) return null;
    if (lower === 'nhi') return 'ID';
    if (lower === 'dob') return 'Age';
    if (['contact', 'address'].includes(lower)) return col;
    return col;
  });

  cleanedRows.push(columnMap.filter(Boolean));

  const seenRows = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell)) continue;

    const newRow = [];

    for (let j = 0; j < columnMap.length; j++) {
      const colName = columnMap[j];
      if (!colName) continue;

      const raw = row[j];

      if (colName === 'ID') {
        const nhi = row[j];
        if (!idMap.has(nhi)) {
          idMap.set(nhi, `ID-${String(idCounter).padStart(3, '0')}`);
          idCounter++;
        }
        newRow.push(idMap.get(nhi));
      } else if (colName === 'Age') {
        const dob = moment(new Date(row[j]));
        newRow.push(dob.isValid() ? moment().diff(dob, 'years') : '');
      } else if (['Contact', 'Address'].includes(colName)) {
        newRow.push('');
      } else {
        newRow.push(raw);
      }
    }

    const key = newRow.join('|');
    if (!seenRows.has(key)) {
      cleanedRows.push(newRow);
      seenRows.add(key);
    }
  }

  return cleanedRows;
}

module.exports = cleanWorksheetData;
