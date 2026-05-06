/**
 * Version: 2.4.0
 * Description: Cleans raw Excel worksheet data into anonymized, deduplicated, and secure format with standardized headers.
 * Author: Ali Kahwaji
 */

const { transformSheet } = require('../etl/transform');

/**
 * Transforms and sanitizes raw worksheet rows.
 * Handles sensitive data removal, anonymization (ID from NHI), and DOB conversion to Age.
 * Each call uses an isolated id mapper, so concurrent invocations cannot collide.
 *
 * @param {Array<Array<any>>} data - Raw 2D array from Excel sheet
 * @returns {Array<Array<any>>} Cleaned, deduplicated 2D array with transformed headers and rows
 */
function cleanWorksheetData(data) {
  return transformSheet(data);
}

module.exports = cleanWorksheetData;
