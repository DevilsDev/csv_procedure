/**
 * Version: 1.0.0
 * Description: Shared NHI → ID mapper for consistent anonymization across all sheets within a file.
 * Author: Ali Kahwaji
 */

const nhiToIdMap = new Map();
let idCounter = 1;

/**
 * Returns a consistent anonymized ID for a given NHI value.
 * Ensures the same patient gets the same anonymized ID across all sheets.
 *
 * @param {string} nhi - The original NHI or patient identifier
 * @returns {string} - An anonymized ID (e.g., "ID-001")
 */
function getAnonymizedId(nhi) {
  if (!nhi || typeof nhi !== 'string') return '';
  if (!nhiToIdMap.has(nhi)) {
    const newId = `ID-${String(idCounter++).padStart(3, '0')}`;
    nhiToIdMap.set(nhi, newId);
  }
  return nhiToIdMap.get(nhi);
}

/**
 * Resets the internal ID map and counter.
 * This should be called before processing a new file upload.
 */
function resetIdMap() {
  nhiToIdMap.clear();
  idCounter = 1;
}

module.exports = {
  getAnonymizedId,
  resetIdMap
};
