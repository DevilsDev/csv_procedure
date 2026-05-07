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

  // ===== Detection (mirror of src/etl/detect.js) =====

  const DETECT_SAMPLE_SIZE = 25;
  const ISO_DATE = /^(?:\d{4}-\d{2}-\d{2})(?:[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/;
  const SLASH_DATE = /^(?:\d{1,2}[/-]){2}\d{2,4}$/;

  function looksLikeDate(value) {
    if (typeof value !== 'string' || value.trim() === '') return false;
    const isoMatch = value.match(/^(\d{4})-\d{2}-\d{2}/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      return y > 1900 && y < 2100;
    }
    if (SLASH_DATE.test(value)) {
      const parts = value.split(/[/-]/);
      const yearStr = parts[parts.length - 1];
      if (yearStr.length === 4) {
        const y = Number(yearStr);
        return y > 1900 && y < 2100;
      }
      return true;
    }
    const parsed = new Date(value);
    if (isNaN(parsed)) return false;
    const year = parsed.getFullYear();
    return year > 1900 && year < 2100 && /\d{4}/.test(value);
  }

  // Order matters: SSN before phone (SSN-shaped values also match the loose phone regex).
  const PATTERNS = [
    { type: 'email',      severity: 'direct', headerHints: ['email','e-mail','mail'], valueRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, suggested: { action: 'redact', replaceWith: '<email>' } },
    { type: 'ssn',        severity: 'direct', headerHints: ['ssn','social security','social_security','tin'], valueRegex: /^\d{3}-?\d{2}-?\d{4}$/, suggested: { action: 'redact', replaceWith: '<ssn>' } },
    { type: 'creditcard', severity: 'direct', headerHints: ['credit_card','creditcard','card_number','cardnumber','cc_number'], valueRegex: /^(?:\d[ -]?){13,19}$/, headerRequired: true, suggested: { action: 'redact', replaceWith: '<cc>' } },
    { type: 'phone',      severity: 'direct', headerHints: ['phone','mobile','cell','tel','telephone','contact'], valueRegex: /^[+]?[\d][\d\s\-().]{6,}$/, headerRequired: true, suggested: { action: 'redact', replaceWith: '<phone>' } },
    { type: 'nhi',        severity: 'direct', headerHints: ['nhi','national health'], valueRegex: /^[A-Za-z]{3}\d{4}$/, suggested: { action: 'anonymize', outputName: 'ID' } },
    { type: 'mrn',        severity: 'direct', headerHints: ['mrn','medical record','patient_id','patientid','patient id','patient code','patient_code'], valueRegex: /^(?=.*\d)[A-Z0-9-]{4,20}$/i, headerRequired: true, suggested: { action: 'anonymize', outputName: 'PatientID' } },
    { type: 'ip',         severity: 'direct', headerHints: ['ip','ip_address','ipaddress','client_ip'], valueRegex: /^(?:\d{1,3}\.){3}\d{1,3}$/, suggested: { action: 'redact', replaceWith: '<ip>' } },
    { type: 'dob',        severity: 'direct', headerHints: ['dob','date of birth','birth_date','birthdate','birth date'], valueIsDate: true, headerRequired: true, suggested: { action: 'ageFromDate', outputName: 'Age' } },
    { type: 'name',       severity: 'direct', headerHints: ['name','full name','first name','firstname','last name','lastname','surname','given name','family name','middle name'], headerOnly: true, suggested: { action: 'redact', replaceWith: '<name>' } },
    { type: 'address',    severity: 'direct', headerHints: ['address','street','addr','home_address','mailing_address'], headerOnly: true, suggested: { action: 'drop' } },
    { type: 'postcode',   severity: 'quasi',  headerHints: ['postcode','postal_code','postal code','zip','zipcode','zip_code'], valueRegex: /^[A-Z0-9][A-Z0-9 -]{2,9}$/i, headerRequired: true, suggested: null },
    { type: 'age',        severity: 'quasi',  headerHints: ['age'], valuePredicate: function (v) { const n = Number(v); return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 130; }, headerRequired: true, suggested: null },
    { type: 'gender',     severity: 'quasi',  headerHints: ['gender','sex'], valuePredicate: function (v) { if (typeof v !== 'string') return false; const lower = v.trim().toLowerCase(); return ['m','f','male','female','x','other','nonbinary','non-binary','nb','unknown','prefer not to say'].indexOf(lower) !== -1; }, headerRequired: true, suggested: null },
    { type: 'date',       severity: 'quasi',  valueIsDate: true, suggested: null, weight: 0.85 },
  ];

  function headerMatches(pattern, header) {
    if (!pattern.headerHints || pattern.headerHints.length === 0) return false;
    return pattern.headerHints.some(function (hint) { return header === hint || header.indexOf(hint) !== -1; });
  }

  function sampleNonEmpty(rows, columnIndex, n) {
    const out = [];
    for (let i = 1; i < rows.length && out.length < n; i++) {
      const cell = rows[i] && rows[i][columnIndex];
      if (cell !== null && cell !== undefined && cell !== '') out.push(cell);
    }
    return out;
  }

  function valueMatchRate(pattern, samples) {
    if (samples.length === 0) return 0;
    let hits = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      if (pattern.valueRegex && typeof v === 'string' && pattern.valueRegex.test(v)) { hits++; continue; }
      if (pattern.valuePredicate && pattern.valuePredicate(v)) { hits++; continue; }
      if (pattern.valueIsDate && looksLikeDate(typeof v === 'string' ? v : String(v))) { hits++; continue; }
    }
    return hits / samples.length;
  }

  function patternHasValueCheck(pattern) { return Boolean(pattern.valueRegex || pattern.valuePredicate || pattern.valueIsDate); }

  function detectColumn(header, samples) {
    const norm = normalizeHeader(header);
    const candidates = [];
    for (let p = 0; p < PATTERNS.length; p++) {
      const pattern = PATTERNS[p];
      const headerHit = headerMatches(pattern, norm);
      const valueRate = patternHasValueCheck(pattern) ? valueMatchRate(pattern, samples) : 0;
      if (pattern.headerOnly) {
        if (headerHit) candidates.push({ pattern: pattern, confidence: 0.92, evidence: { headerHit: headerHit, valueRate: null } });
        continue;
      }
      if (pattern.headerRequired && !headerHit) continue;
      let confidence = 0;
      if (headerHit && valueRate >= 0.5) confidence = 0.95 + Math.min(0.04, valueRate - 0.5);
      else if (valueRate >= 0.9)        confidence = 0.9;
      else if (headerHit)               confidence = 0.6 + (valueRate >= 0.25 ? 0.1 : 0);
      else if (valueRate >= 0.5)        confidence = 0.65 + Math.min(0.1, valueRate - 0.5);
      if (confidence > 0) {
        candidates.push({ pattern: pattern, confidence: Math.min(0.99, confidence * (pattern.weight || 1)), evidence: { headerHit: headerHit, valueRate: valueRate } });
      }
    }
    candidates.sort(function (a, b) { return b.confidence - a.confidence; });
    return { best: candidates[0] || null, candidates: candidates };
  }

  function detectSheets(sheets) {
    const columns = [];
    const suggestedRules = [];
    const seenHeaders = new Set();
    let direct = 0;
    let quasi = 0;
    for (let s = 0; s < sheets.length; s++) {
      const sheet = sheets[s];
      if (!sheet.rows || sheet.rows.length === 0) continue;
      const header = sheet.rows[0] || [];
      for (let c = 0; c < header.length; c++) {
        const headerCell = header[c];
        const samples = sampleNonEmpty(sheet.rows, c, DETECT_SAMPLE_SIZE);
        const det = detectColumn(headerCell, samples);
        const best = det.best;
        columns.push({
          sheetName: sheet.name,
          header: headerCell,
          sampleSize: samples.length,
          sampleValues: samples.slice(0, 3).map(function (v) { return String(v); }),
          detections: det.candidates.slice(0, 3).map(function (c2) {
            return { type: c2.pattern.type, severity: c2.pattern.severity, confidence: Number(c2.confidence.toFixed(2)), evidence: c2.evidence };
          }),
          bestType: best ? best.pattern.type : null,
          bestSeverity: best ? best.pattern.severity : null,
          bestConfidence: best ? Number(best.confidence.toFixed(2)) : null,
          suggested: best && best.pattern.suggested ? best.pattern.suggested : null,
        });
        if (best && best.pattern.severity === 'direct') direct++;
        if (best && best.pattern.severity === 'quasi') quasi++;
        if (best && best.pattern.suggested && !seenHeaders.has(normalizeHeader(headerCell))) {
          seenHeaders.add(normalizeHeader(headerCell));
          suggestedRules.push(Object.assign({ match: { equals: String(headerCell) } }, best.pattern.suggested));
        }
      }
    }
    suggestedRules.push({ match: { empty: true },          action: 'drop' });
    suggestedRules.push({ match: { startsWith: 'column' }, action: 'drop' });
    return {
      columns: columns,
      suggestedRuleSet: { version: '1', rules: suggestedRules },
      summary: { directIdentifiers: direct, quasiIdentifiers: quasi },
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
    detectColumn: detectColumn,
    detectSheets: detectSheets,
    PATTERNS: PATTERNS,
  };

})(typeof window !== 'undefined' ? window : globalThis);
