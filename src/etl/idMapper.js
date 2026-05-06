/**
 * Version: 2.5.4
 * Description: Per-request NHI-to-ID anonymization. Use createIdMapper() for an isolated session;
 *              singleton getAnonymizedId/resetIdMap kept for backward compatibility.
 * Author: Ali Kahwaji
 */

/**
 * Creates an isolated NHI→ID mapper. Each instance owns its own counter and map,
 * so concurrent ETL runs cannot collide.
 */
function createIdMapper() {
  const map = new Map();
  let counter = 1;

  return {
    getAnonymizedId(nhi) {
      if (typeof nhi !== 'string' || nhi.trim() === '') return '';
      const key = nhi.trim();
      if (!map.has(key)) {
        map.set(key, `ID-${String(counter++).padStart(3, '0')}`);
      }
      return map.get(key);
    },
    reset() {
      map.clear();
      counter = 1;
    },
  };
}

const _singleton = createIdMapper();

/**
 * Singleton NHI→ID lookup. Prefer createIdMapper() in new code.
 */
function getAnonymizedId(nhi) {
  return _singleton.getAnonymizedId(nhi);
}

function resetIdMap() {
  _singleton.reset();
}

module.exports = {
  createIdMapper,
  getAnonymizedId,
  resetIdMap,
};
