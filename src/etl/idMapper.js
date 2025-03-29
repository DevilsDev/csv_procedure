/**
 * Version: 2.4.0
 * Description: Centralized NHI-to-ID anonymization utility with resettable map and sequential ID generation.
 * Author: Ali Kahwaji
 */

const nhiToIdMap = new Map();
let idCounter = 1;

/**
 * Retrieves a consistent anonymized ID for a given NHI input.
 * Ensures each unique NHI is mapped to a deterministic anonymized ID during the session.
 *
 * @param {string} nhi - The original National Health Identifier (or equivalent patient code)
 * @returns {string} Anonymized ID (e.g., "ID-001"), or empty string for invalid input
 */
function getAnonymizedId(nhi) {
  if (typeof nhi !== 'string' || nhi.trim() === '') return '';

  const key = nhi.trim();
  if (!nhiToIdMap.has(key)) {
    const anonymizedId = `ID-${String(idCounter++).padStart(3, '0')}`;
    nhiToIdMap.set(key, anonymizedId);
  }

  return nhiToIdMap.get(key);
}

/**
 * Resets the internal mapping of NHI to anonymized ID and the counter.
 * Invoked before each new ETL process to ensure unique session mapping.
 */
function resetIdMap() {
  nhiToIdMap.clear();
  idCounter = 1;
}

module.exports = {
  getAnonymizedId,
  resetIdMap,
};
