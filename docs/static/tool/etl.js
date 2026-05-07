/**
 * Version: 2.7.4
 * Description: Browser-side ETL pipeline. Mirrors src/etl/transform.js, src/etl/idMapper.js,
 *              and src/etl/rules.js so the cleaning rules behave identically to the server.
 *              When you change the server-side rules, mirror the change here.
 *
 *              Self-contained: depends only on the xlsx library being loaded first
 *              (window.XLSX from xlsx.full.min.js). Exposes window.ClinisyncETL.
 *
 *              No data leaves the browser. Workbooks are parsed via XLSX.read on an
 *              in-memory ArrayBuffer; cleaned CSVs are produced as strings and handed
 *              to upload.js to wrap as Blobs for download.
 * Author: Ali Kahwaji
 */

(function (global) {
  'use strict';

  // ===== Default rule set (mirror of src/etl/rules.js) =====

  const DEFAULT_RULE_SET = {
    version: '1',
    rules: [
      { match: { empty: true },           action: 'drop' },
      { match: { startsWith: 'column' },  action: 'drop' },
      { match: { equals: 'nhi' },         action: 'anonymize',   outputName: 'ID' },
      { match: { equals: 'dob' },         action: 'ageFromDate', outputName: 'Age' },
      { match: { equals: 'contact' },     action: 'drop' },
      { match: { equals: 'address' },     action: 'drop' },
    ],
  };

  const VALID_ACTIONS = new Set(['drop', 'keep', 'rename', 'redact', 'anonymize', 'ageFromDate']);
  const VALID_MATCH_KEYS = new Set(['empty', 'equals', 'startsWith', 'contains', 'regex']);

  function isString(v) { return typeof v === 'string'; }

  function normalizeHeader(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function validateRuleSet(rs) {
    if (!rs || typeof rs !== 'object') throw new Error('Rule set must be an object.');
    if (!Array.isArray(rs.rules)) throw new Error('Rule set must have a "rules" array.');
    rs.rules.forEach(function (rule, idx) {
      if (!rule || typeof rule !== 'object') throw new Error('rules[' + idx + '] must be an object.');
      if (!rule.match || typeof rule.match !== 'object') throw new Error('rules[' + idx + '] missing "match".');
      const matchKeys = Object.keys(rule.match);
      if (matchKeys.length !== 1 || !VALID_MATCH_KEYS.has(matchKeys[0])) {
        throw new Error('rules[' + idx + '] match must have exactly one of: ' + Array.from(VALID_MATCH_KEYS).join(', '));
      }
      if (!VALID_ACTIONS.has(rule.action)) {
        throw new Error('rules[' + idx + '] action must be one of: ' + Array.from(VALID_ACTIONS).join(', '));
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

  // ===== Helpers shared with server transform.js =====

  function isMissingNhi(value) { return typeof value !== 'string' || value.trim() === ''; }
  function isBlankCell(value)  { return value === null || value === undefined || value === ''; }

  function getEmptyStats() {
    return {
      rowsProcessed: 0,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
      redactedCellCount: 0,
    };
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
    } catch (e) {
      return '';
    }
  }

  // ===== idMapper (mirror of server) =====

  function createIdMapper() {
    const map = new Map();
    let counter = 1;
    return {
      getAnonymizedId: function (nhi) {
        if (typeof nhi !== 'string' || nhi.trim() === '') return '';
        const key = nhi.trim();
        if (!map.has(key)) {
          map.set(key, 'ID-' + String(counter++).padStart(3, '0'));
        }
        return map.get(key);
      },
      reset: function () { map.clear(); counter = 1; },
    };
  }

  // ===== transform (mirror of server) =====

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
        outputName: matched.outputName != null ? matched.outputName : rawHeader[i],
        replaceWith: matched.replaceWith,
      });
    }
    return plan;
  }

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

  // ===== Browser-only helpers =====

  function extractSheets(arrayBuffer) {
    if (!global.XLSX) throw new Error('xlsx library not loaded');
    const workbook = global.XLSX.read(arrayBuffer, { type: 'array' });
    const extracted = [];
    for (let i = 0; i < workbook.SheetNames.length; i++) {
      const name = workbook.SheetNames[i];
      const rawRows = global.XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
      if (Array.isArray(rawRows) && rawRows.length > 0) extracted.push({ name: name, rows: rawRows });
    }
    return extracted;
  }

  function csvFromRows(rows) {
    if (!global.XLSX) throw new Error('xlsx library not loaded');
    const sheet = global.XLSX.utils.aoa_to_sheet(rows);
    return global.XLSX.utils.sheet_to_csv(sheet);
  }

  function sanitizeName(value, fallback) {
    return String(value || '')
      .trim().toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_') || fallback;
  }

  function makeFilename(sourceBase, sheetName, counter, timestamp) {
    return 'converted-' + sanitizeName(sourceBase, 'workbook') + '-' + timestamp + '-' + counter + '-' + sanitizeName(sheetName, 'sheet') + '.csv';
  }

  function manifestFilename(sourceBase, counter, timestamp) {
    return 'manifest-' + sanitizeName(sourceBase, 'workbook') + '-' + timestamp + '-' + counter + '.json';
  }

  function processWorkbook(arrayBuffer, sourceFileName, options) {
    options = options || {};
    const idMapper = createIdMapper();
    const sheets = extractSheets(arrayBuffer);
    const sourceBase = String(sourceFileName || 'workbook').replace(/\.[^.]+$/, '');
    const timestamp = Date.now();

    const summary = {
      sheetsProcessed: 0,
      rowsProcessed: 0,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
      redactedCellCount: 0,
    };

    const sheetOutputs = [];
    let counter = 0;

    for (let i = 0; i < sheets.length; i++) {
      counter += 1;
      const sheet = sheets[i];
      const result = transformSheetWithStats(sheet.rows, idMapper, { ruleSet: options.ruleSet });
      const csv = csvFromRows(result.rows);
      const fileName = makeFilename(sourceBase, sheet.name, counter, timestamp);

      sheetOutputs.push({
        sheetName: sheet.name,
        fileName: fileName,
        csv: csv,
        rows: result.rows,
        rowsProcessed: result.stats.rowsProcessed,
        duplicatesRemoved: result.stats.duplicatesRemoved,
        invalidDobCount: result.stats.invalidDobCount,
        missingNhiCount: result.stats.missingNhiCount,
        redactedCellCount: result.stats.redactedCellCount,
      });

      summary.sheetsProcessed += 1;
      summary.rowsProcessed += result.stats.rowsProcessed;
      summary.duplicatesRemoved += result.stats.duplicatesRemoved;
      summary.invalidDobCount += result.stats.invalidDobCount;
      summary.missingNhiCount += result.stats.missingNhiCount;
      summary.redactedCellCount += result.stats.redactedCellCount;
    }

    counter += 1;
    const manifestName = manifestFilename(sourceBase, counter, timestamp);
    const manifest = Object.assign({
      sourceFileName: sourceFileName,
      generatedAt: new Date().toISOString(),
    }, summary, {
      files: sheetOutputs.map(function (s) { return s.fileName; }),
      sheets: sheetOutputs.map(function (s) {
        return {
          sheetName: s.sheetName,
          fileName: s.fileName,
          rowsProcessed: s.rowsProcessed,
          duplicatesRemoved: s.duplicatesRemoved,
          invalidDobCount: s.invalidDobCount,
          missingNhiCount: s.missingNhiCount,
          redactedCellCount: s.redactedCellCount,
        };
      }),
    });

    return {
      message: 'Cleaning completed successfully.',
      sheets: sheetOutputs,
      manifest: { name: manifestName, json: manifest },
      summary: summary,
    };
  }

  global.ClinisyncETL = {
    DEFAULT_RULE_SET: DEFAULT_RULE_SET,
    validateRuleSet: validateRuleSet,
    compileRuleSet: compileRuleSet,
    createIdMapper: createIdMapper,
    transformSheetWithStats: transformSheetWithStats,
    extractSheets: extractSheets,
    csvFromRows: csvFromRows,
    processWorkbook: processWorkbook,
    sanitizeName: sanitizeName,
    normalizeHeader: normalizeHeader,
  };

})(typeof window !== 'undefined' ? window : globalThis);
