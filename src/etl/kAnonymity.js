/**
 * Version: 2.7.6
 * Description: k-anonymity scorer. Given a cleaned 2-D table (header + rows) plus a
 *              list of column names that are treated as quasi-identifiers, returns:
 *                - k        : the smallest equivalence-class size in the data
 *                - totalRows: number of data rows scored
 *                - uniqueGroups: number of distinct quasi-identifier tuples
 *                - singletonRows: number of rows that share their tuple with no one else
 *                - histogram: [{ k: groupSize, groupCount: N }, ...] sorted ascending
 *                - quasiIdentifiers: the list of column names actually used (subset
 *                                    of the requested names that exist in the header)
 *
 *              No suppression / generalization is performed — this is a *measurement*
 *              tool. The cleaning engine handles the actual edits via the rule set.
 *
 *              This module is plain JavaScript with no Node-specific APIs; it's also
 *              embedded into the browser ETL bundle so the in-page tool can score
 *              the same way.
 *
 * Author: Ali Kahwaji
 */

const EMPTY_REPORT = Object.freeze({
  applicable: false,
  reason: 'no quasi-identifiers configured',
  k: null,
  totalRows: 0,
  uniqueGroups: 0,
  singletonRows: 0,
  histogram: [],
  quasiIdentifiers: [],
});

/**
 * @param {Array<Array<any>>} rows  Cleaned table; rows[0] is the header.
 * @param {string[]}           qiColumnNames  Column names to treat as quasi-identifiers.
 *                             Names are matched case-insensitively after trim. Names
 *                             not found in the header are silently skipped.
 * @param {{ minK?: number }=} options  Optional threshold; included on the report.
 * @returns {object} The k-anonymity report.
 */
function computeKAnonymity(rows, qiColumnNames, options) {
  const opts = options || {};

  if (!Array.isArray(rows) || rows.length < 2 || !Array.isArray(qiColumnNames) || qiColumnNames.length === 0) {
    return Object.assign({}, EMPTY_REPORT, {
      reason: !Array.isArray(qiColumnNames) || qiColumnNames.length === 0
        ? 'no quasi-identifiers configured'
        : 'no data rows',
      minK: opts.minK != null ? opts.minK : null,
    });
  }

  const header = rows[0];
  const headerNorm = header.map(function (h) { return String(h == null ? '' : h).trim().toLowerCase(); });

  // Resolve QI names to column indices in the cleaned header. Skip silently
  // when a requested QI doesn't exist in the output (the cleaning rules may
  // have dropped or renamed it; that's fine).
  const qiIndices = [];
  const qiHeaders = [];
  for (const name of qiColumnNames) {
    const wanted = String(name == null ? '' : name).trim().toLowerCase();
    if (wanted === '') continue;
    const idx = headerNorm.indexOf(wanted);
    if (idx !== -1) {
      qiIndices.push(idx);
      qiHeaders.push(header[idx]);
    }
  }

  if (qiIndices.length === 0) {
    return Object.assign({}, EMPTY_REPORT, {
      reason: 'requested quasi-identifiers not present in cleaned output',
      minK: opts.minK != null ? opts.minK : null,
    });
  }

  // Group rows by quasi-identifier tuple.
  const groupCounts = new Map();
  let dataRows = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const tuple = qiIndices.map(function (idx) {
      const v = row[idx];
      return v == null ? '' : String(v);
    });
    const key = JSON.stringify(tuple);
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
    dataRows += 1;
  }

  // Aggregate.
  let minK = Infinity;
  let singletonRows = 0;
  const histogramMap = new Map();
  for (const count of groupCounts.values()) {
    if (count < minK) minK = count;
    if (count === 1) singletonRows += 1;
    histogramMap.set(count, (histogramMap.get(count) || 0) + 1);
  }
  if (minK === Infinity) minK = null;

  const histogram = Array.from(histogramMap.entries())
    .sort(function (a, b) { return a[0] - b[0]; })
    .map(function (entry) { return { k: entry[0], groupCount: entry[1] }; });

  const report = {
    applicable: true,
    k: minK,
    totalRows: dataRows,
    uniqueGroups: groupCounts.size,
    singletonRows: singletonRows,
    histogram: histogram,
    quasiIdentifiers: qiHeaders,
  };
  if (opts.minK != null) {
    report.minK = opts.minK;
    report.satisfiesMinK = minK != null && minK >= opts.minK;
  }
  return report;
}

module.exports = {
  computeKAnonymity,
};
