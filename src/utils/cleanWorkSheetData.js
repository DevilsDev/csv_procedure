/**
 * Version: 2.0.0
 * Description: Cleans and normalizes Excel worksheet data based on specific file types (Case-mix, Fare-up, Holistic, Outpatient).
 * Author: Ali Kahwaji
 */

const moment = require('moment');

// Store a global map of patient NHIs to assigned anonymized IDs
const idMap = new Map();
let currentId = 1;

/**
 * Generate or retrieve a consistent patient ID from an NHI value
 * @param {string} nhi - The patient's NHI identifier
 * @returns {string} - A unique anonymized ID (e.g., ID-001)
 */
function generatePatientId(nhi) {
  if (!nhi || idMap.has(nhi)) return idMap.get(nhi);
  const newId = `ID-${String(currentId).padStart(3, '0')}`;
  idMap.set(nhi, newId);
  currentId++;
  return newId;
}

/**
 * Clean and normalize the worksheet data by applying general and file-specific rules
 * @param {Array[]} data - Raw worksheet content as a 2D array
 * @param {string} fileIdentifier - The name or type of the file (used to apply custom logic)
 * @returns {Array[]} - Cleaned worksheet data
 */
function cleanWorksheetData(data, fileIdentifier) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const cleaned = data
    .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
    .map(row => row.map(cell => (typeof cell === 'string' ? cell.trim() : cell)));

  if (cleaned.length === 0) return [];

  const [headers, ...rows] = cleaned;

  // Remove unnamed columns (e.g., "Column1", empty headers)
  const validIndexes = headers.reduce((acc, header, i) => {
    const name = (header || '').toString().toLowerCase();
    if (!name.includes('column') && name.trim() !== '') acc.push(i);
    return acc;
  }, []);

  const filteredData = [headers, ...rows].map(row => validIndexes.map(i => row[i]));

  // Remove duplicate columns
  const seenHeaders = new Map();
  const uniqueIndexes = [];
  filteredData[0].forEach((header, i) => {
    const key = header.toString().toLowerCase();
    if (!seenHeaders.has(key)) {
      seenHeaders.set(key, true);
      uniqueIndexes.push(i);
    }
  });

  const dedupedData = filteredData.map(row => uniqueIndexes.map(i => row[i]));

  // Remove duplicate rows
  const seenRows = new Set();
  const uniqueRows = [];
  for (const row of dedupedData.slice(1)) {
    const rowKey = JSON.stringify(row);
    if (!seenRows.has(rowKey)) {
      uniqueRows.push(row);
      seenRows.add(rowKey);
    }
  }

  const normalizedData = [dedupedData[0], ...uniqueRows];
  return cleanByFileIdentifier(normalizedData, fileIdentifier);
}

/**
 * Apply file-specific transformations like DOB → Age and NHI → ID
 * @param {Array[]} data - Partially cleaned data
 * @param {string} fileIdentifier - Identifies the source file for custom logic
 * @returns {Array[]} - Final cleaned and normalized data
 */
function cleanByFileIdentifier(data, fileIdentifier) {
  const headers = data[0].map(h => h.toString().trim());
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const rows = data.slice(1);

  const findColumnIndex = (label) => lowerHeaders.findIndex(h => h.includes(label));

  const addressIdx = findColumnIndex('address');
  const contactIdx = findColumnIndex('contact');
  const nhiIdx = findColumnIndex('nhi');
  const dobIdx = findColumnIndex('dob');

  const newHeaders = [...headers];
  if (nhiIdx !== -1) newHeaders.splice(nhiIdx, 1, 'ID');
  if (dobIdx !== -1) newHeaders.splice(dobIdx, 1, 'Age');

  const cleanedRows = rows.map(row => {
    const newRow = [...row];

    // Replace NHI with consistent anonymized ID
    if (nhiIdx !== -1) {
      const nhi = row[nhiIdx];
      const id = generatePatientId(nhi);
      newRow.splice(nhiIdx, 1, id);
    }

    // Convert DOB to age in years (if valid)
    if (dobIdx !== -1) {
      const dobRaw = row[dobIdx];
      let age = '';
      if (dobRaw) {
        const dob = moment(dobRaw, [
          'YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY', 'D MMM YYYY', 'MMM D, YYYY'
        ], true);
        if (dob.isValid()) {
          age = moment().diff(dob, 'years');
        }
      }
      newRow.splice(dobIdx, 1, age);
    }

    // Remove sensitive data
    if (addressIdx !== -1) newRow[addressIdx] = '';
    if (contactIdx !== -1) newRow[contactIdx] = '';

    return newRow;
  });

  return [newHeaders, ...cleanedRows];
}

module.exports = cleanWorksheetData;
