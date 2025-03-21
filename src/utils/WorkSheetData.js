/**
 * Version: 1.1.0
 * Description: Cleans raw Excel worksheet data by removing empty rows,
 * trimming cells, deduplicating headers, and stripping sensitive patient data.
 * Author: Ali Kahwaji
 */

const moment = require('moment');

/**
 * Remove sensitive data like name, email, phone, and DOB
 * @param {Array[]} data
 * @returns {Array[]}
 */
function removeSensitiveData(data) {
  if (!data || data.length === 0) return data;

  const headers = data[0];
  const sensitiveKeywords = ['name', 'dob', 'birth', 'email', 'phone', 'contact', 'ssn', 'id'];
  
  // Find indexes of columns to blank out
  const sensitiveIndexes = headers.reduce((acc, header, i) => {
    const normalized = header.toString().toLowerCase();
    if (sensitiveKeywords.some(keyword => normalized.includes(keyword))) {
      acc.push(i);
    }
    return acc;
  }, []);

  // Remove sensitive values from those columns
  return data.map((row, rowIndex) => {
    if (rowIndex === 0) return row; // Keep headers
    return row.map((cell, colIndex) => {
      if (sensitiveIndexes.includes(colIndex)) {
        return ''; // Strip sensitive content
      }

      // Also remove date of birth if formatted as a date
      if (typeof cell === 'string' || typeof cell === 'number') {
        const cellValue = cell.toString().trim();

        // Attempt to detect date values in different formats
        if (
          moment(cellValue, ['MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'MMM D, YYYY'], true).isValid()
        ) {
          return ''; // Consider as date and remove
        }
      }

      return cell;
    });
  });
}

/**
 * Cleans worksheet data: removes empty rows, trims cells, deduplicates headers, and sanitizes sensitive data.
 * @param {Array[]} data - Raw 2D array from worksheet
 * @returns {Array[]} - Cleaned and anonymized data
 */
function cleanWorksheetData(data) {
  if (!Array.isArray(data)) return [];

  // Step 1: Remove empty rows
  const nonEmptyRows = data.filter(row => row.some(cell => cell !== ''));

  // Step 2: Trim whitespace
  const trimmedRows = nonEmptyRows.map(row =>
    row.map(cell => (typeof cell === 'string' ? cell.trim() : cell))
  );

  if (trimmedRows.length === 0) return [];

  const [headerRow, ...dataRows] = trimmedRows;

  // Step 3: Remove repeated header rows
  const filteredRows = dataRows.filter(row => {
    return JSON.stringify(row).toLowerCase() !== JSON.stringify(headerRow).toLowerCase();
  });

  const cleaned = [headerRow, ...filteredRows];

  // Step 4: Remove sensitive data
  const anonymized = removeSensitiveData(cleaned);

  return anonymized;
}

module.exports = cleanWorksheetData;
