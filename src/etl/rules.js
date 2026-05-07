/**
 * Version: 2.7.4
 * Description: Configurable rule engine that drives src/etl/transform.js. A rule set is
 *              an ordered list of { match, action } pairs; the first matching rule for a
 *              given header wins, and headers that match no rule are kept as-is.
 *
 *              Rule schema (JSON-friendly):
 *                {
 *                  version: '1',
 *                  rules: [
 *                    { match: { empty: true },           action: 'drop' },
 *                    { match: { startsWith: 'column' },  action: 'drop' },
 *                    { match: { equals: 'nhi' },         action: 'anonymize',   outputName: 'ID' },
 *                    { match: { equals: 'dob' },         action: 'ageFromDate', outputName: 'Age' },
 *                    { match: { equals: 'contact' },     action: 'drop' },
 *                    { match: { equals: 'address' },     action: 'drop' },
 *                  ]
 *                }
 *
 *              Match clauses (exactly one key per rule):
 *                empty:      true     — header is empty / whitespace
 *                equals:     string   — case-insensitive exact match after trim
 *                startsWith: string   — case-insensitive prefix
 *                contains:   string   — case-insensitive substring
 *                regex:      string   — case-insensitive regex (string form, not literal)
 *
 *              Actions:
 *                drop                    — column removed entirely
 *                keep                    — column passes through (implicit default)
 *                rename       outputName — column renamed, values unchanged
 *                redact       replaceWith— every value replaced with a fixed string
 *                anonymize    outputName — sequential ID via the per-request idMapper
 *                ageFromDate  outputName — value parsed as date, replaced with whole-year age
 *
 * Author: Ali Kahwaji
 */

const fs = require('fs');

const VALID_ACTIONS = new Set(['drop', 'keep', 'rename', 'redact', 'anonymize', 'ageFromDate']);
const VALID_MATCH_KEYS = new Set(['empty', 'equals', 'startsWith', 'contains', 'regex']);

const DEFAULT_RULE_SET = Object.freeze({
  version: '1',
  rules: Object.freeze([
    Object.freeze({ match: Object.freeze({ empty: true }),           action: 'drop' }),
    Object.freeze({ match: Object.freeze({ startsWith: 'column' }),  action: 'drop' }),
    Object.freeze({ match: Object.freeze({ equals: 'nhi' }),         action: 'anonymize',   outputName: 'ID' }),
    Object.freeze({ match: Object.freeze({ equals: 'dob' }),         action: 'ageFromDate', outputName: 'Age' }),
    Object.freeze({ match: Object.freeze({ equals: 'contact' }),     action: 'drop' }),
    Object.freeze({ match: Object.freeze({ equals: 'address' }),     action: 'drop' }),
  ]),
});

function isString(v) { return typeof v === 'string'; }

function normalizeHeader(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function validateRuleSet(rs) {
  if (!rs || typeof rs !== 'object') {
    throw new Error('Rule set must be an object.');
  }
  if (!Array.isArray(rs.rules)) {
    throw new Error('Rule set must have a "rules" array.');
  }

  if (rs.kAnonymity != null) {
    if (typeof rs.kAnonymity !== 'object') {
      throw new Error('"kAnonymity" must be an object when provided.');
    }
    if (rs.kAnonymity.quasiIdentifiers != null && !Array.isArray(rs.kAnonymity.quasiIdentifiers)) {
      throw new Error('"kAnonymity.quasiIdentifiers" must be an array of column names.');
    }
    if (rs.kAnonymity.minK != null) {
      const minK = rs.kAnonymity.minK;
      if (typeof minK !== 'number' || !Number.isInteger(minK) || minK < 1) {
        throw new Error('"kAnonymity.minK" must be a positive integer.');
      }
    }
  }

  rs.rules.forEach(function (rule, idx) {
    if (!rule || typeof rule !== 'object') {
      throw new Error('rules[' + idx + '] must be an object.');
    }
    if (!rule.match || typeof rule.match !== 'object') {
      throw new Error('rules[' + idx + '] missing "match".');
    }
    const matchKeys = Object.keys(rule.match);
    if (matchKeys.length !== 1 || !VALID_MATCH_KEYS.has(matchKeys[0])) {
      throw new Error(
        'rules[' + idx + '] match must have exactly one of: ' +
        Array.from(VALID_MATCH_KEYS).join(', ')
      );
    }
    if (!VALID_ACTIONS.has(rule.action)) {
      throw new Error(
        'rules[' + idx + '] action must be one of: ' + Array.from(VALID_ACTIONS).join(', ')
      );
    }

    if ((rule.action === 'anonymize' || rule.action === 'ageFromDate' || rule.action === 'rename')
        && !isString(rule.outputName)) {
      throw new Error('rules[' + idx + '] action "' + rule.action + '" requires "outputName" string.');
    }
    if (rule.action === 'redact' && !isString(rule.replaceWith)) {
      throw new Error('rules[' + idx + '] action "redact" requires "replaceWith" string.');
    }

    if (matchKeys[0] === 'regex') {
      try { new RegExp(rule.match.regex, 'i'); }
      catch (err) { throw new Error('rules[' + idx + '] regex is invalid: ' + err.message); }
    }
  });
  return rs;
}

function buildMatcher(match) {
  if ('empty' in match) {
    return match.empty ? function (h) { return h === ''; } : function () { return false; };
  }
  if ('equals' in match) {
    const target = normalizeHeader(match.equals);
    return function (h) { return h === target; };
  }
  if ('startsWith' in match) {
    const target = String(match.startsWith).toLowerCase();
    return function (h) { return h.startsWith(target); };
  }
  if ('contains' in match) {
    const target = String(match.contains).toLowerCase();
    return function (h) { return h.indexOf(target) !== -1; };
  }
  if ('regex' in match) {
    const re = new RegExp(match.regex, 'i');
    return function (h) { return re.test(h); };
  }
  return function () { return false; };
}

/**
 * Compile a rule set into a fast lookup function.
 *
 * @param {object} ruleSet
 * @returns {(rawHeader: any) => { action: string, outputName?: string, replaceWith?: string }}
 */
function compileRuleSet(ruleSet) {
  validateRuleSet(ruleSet);
  const compiled = ruleSet.rules.map(function (rule) {
    return { matcher: buildMatcher(rule.match), rule: rule };
  });
  return function lookup(rawHeader) {
    const norm = normalizeHeader(rawHeader);
    for (let i = 0; i < compiled.length; i++) {
      if (compiled[i].matcher(norm)) return compiled[i].rule;
    }
    return { action: 'keep' };
  };
}

function loadRuleSetFromPath(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) { throw new Error('Failed to parse rule set JSON at ' + filePath + ': ' + err.message); }
  return validateRuleSet(parsed);
}

module.exports = {
  DEFAULT_RULE_SET,
  VALID_ACTIONS: Array.from(VALID_ACTIONS),
  VALID_MATCH_KEYS: Array.from(VALID_MATCH_KEYS),
  validateRuleSet,
  compileRuleSet,
  loadRuleSetFromPath,
  normalizeHeader,
};
