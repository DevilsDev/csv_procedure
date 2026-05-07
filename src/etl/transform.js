/**
 * Version: 2.7.4
 * Description: Applies anonymization and data cleaning rules to a spreadsheet sheet.
 *              The cleaning rules themselves are configurable via src/etl/rules.js;
 *              this module is the engine that applies a compiled rule set against rows.
 * Author: Ali Kahwaji
 */

const { createIdMapper } = require('./idMapper');
const { DEFAULT_RULE_SET, compileRuleSet } = require('./rules');

function getEmptyStats() {
  return {
    rowsProcessed: 0,
    duplicatesRemoved: 0,
    invalidDobCount: 0,
    missingNhiCount: 0,
    redactedCellCount: 0,
  };
}

function isMissingNhi(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function isBlankCell(value) {
  return value === null || value === undefined || value === '';
}

/**
 * Build a per-column action plan from the source headers + a compiled rule set.
 * Returns an array same-length as the headers; each entry is either null (drop) or
 * an object describing what to do with that column's values.
 */
function buildColumnPlan(rawHeader, lookup) {
  const plan = [];
  for (let i = 0; i < rawHeader.length; i++) {
    const matched = lookup(rawHeader[i]);
    if (matched.action === 'drop') {
      plan.push(null);
      continue;
    }
    plan.push({
      action: matched.action,
      // For actions that don't supply outputName, fall back to the source header so
      // the column survives with its original name.
      outputName: matched.outputName != null ? matched.outputName : rawHeader[i],
      replaceWith: matched.replaceWith,
    });
  }
  return plan;
}

/**
 * Transform raw worksheet data via the rule set.
 *
 * @param {Array<Array<any>>} rows
 * @param {{ getAnonymizedId: (nhi: string) => string }} [idMapper]
 * @param {{ ruleSet?: object }} [options] When omitted, the DEFAULT_RULE_SET is used.
 * @returns {{ rows: Array<Array<any>>, stats: object }}
 */
function transformSheetWithStats(rows, idMapper, options) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: [], stats: getEmptyStats() };
  }

  const opts = options || {};
  const ruleSet = opts.ruleSet || DEFAULT_RULE_SET;
  const lookup = compileRuleSet(ruleSet);
  const mapper = idMapper || createIdMapper();

  const rawHeader = rows[0];
  const columnPlan = buildColumnPlan(rawHeader, lookup);
  const cleaned = [];
  const stats = getEmptyStats();

  // Header row
  cleaned.push(columnPlan.filter(Boolean).map(function (p) { return p.outputName; }));

  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const rawRow = rows[i];
    if (!Array.isArray(rawRow) || rawRow.every(isBlankCell)) continue;

    stats.rowsProcessed += 1;
    const cleanedRow = [];

    for (let j = 0; j < columnPlan.length; j++) {
      const plan = columnPlan[j];
      if (!plan) continue;

      const cellValue = rawRow[j];

      switch (plan.action) {
      case 'anonymize':
        if (isMissingNhi(cellValue)) {
          stats.missingNhiCount += 1;
          cleanedRow.push('');
        } else {
          cleanedRow.push(mapper.getAnonymizedId(cellValue));
        }
        break;

      case 'ageFromDate': {
        const age = calculateAgeFromDOB(cellValue);
        if (age === '' && !isBlankCell(cellValue)) stats.invalidDobCount += 1;
        cleanedRow.push(age);
        break;
      }

      case 'redact':
        if (!isBlankCell(cellValue)) stats.redactedCellCount += 1;
        cleanedRow.push(plan.replaceWith);
        break;

      case 'rename':
      case 'keep':
      default:
        cleanedRow.push(cellValue);
        break;
      }
    }

    const key = JSON.stringify(cleanedRow);
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(cleanedRow);
    } else {
      stats.duplicatesRemoved += 1;
    }
  }

  return { rows: cleaned, stats: stats };
}

function transformSheet(rows, idMapper, options) {
  return transformSheetWithStats(rows, idMapper, options).rows;
}

function calculateAgeFromDOB(dobRaw) {
  try {
    const dob = new Date(dobRaw);
    if (isNaN(dob)) return '';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const hasHadBirthday =
      (now.getMonth() > dob.getMonth()) ||
      (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!hasHadBirthday) age--;
    return age >= 0 && age < 130 ? age : '';
  } catch {
    return '';
  }
}

module.exports = { transformSheet, transformSheetWithStats };
