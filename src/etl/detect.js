/**
 * Version: 2.7.5
 * Description: Automated PHI / PII / quasi-identifier detection for spreadsheet columns.
 *              Returns per-column detections (type, confidence, evidence) and compiles
 *              them into a Thresh rule set the cleaning engine can run with.
 *
 *              Confidence model:
 *                - header hint matched and >50% of sampled values match -> 0.95+
 *                - value regex matched on >90% of sampled non-empty values -> 0.9
 *                - header hint matched only -> 0.6 (or 0.7 with weak value match)
 *                - value regex matched on >50% only -> 0.65–0.75
 *                - headerOnly pattern matched -> 0.92 (e.g., Name)
 *
 *              When multiple patterns match a column, the highest-confidence one wins.
 *              Patterns flagged `headerRequired: true` will only match when the header
 *              hint matches — this disambiguates ambiguous values (e.g., "12345" could
 *              be a postcode, an age, an MRN, or a customer ID; without a header we
 *              don't pretend to know).
 *
 *              No machine learning — every detection is a rule the user can audit.
 *
 * Author: Ali Kahwaji
 */

const SAMPLE_SIZE = 25;

// ---------- date helper ----------

const SLASH_DATE = /^(?:\d{1,2}[/-]){2}\d{2,4}$/;

function looksLikeDate(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;

  // Trust an explicit ISO shape even when Date.parse would refuse it, but apply
  // the year filter so historical dates like "1500-01-01" don't sneak through.
  const isoMatch = value.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    return y > 1900 && y < 2100;
  }
  // V8 rejects EU-formatted slash dates like "15/01/1990"; trust the shape.
  if (SLASH_DATE.test(value)) {
    const parts = value.split(/[/-]/);
    const yearStr = parts[parts.length - 1];
    if (yearStr.length === 4) {
      const y = Number(yearStr);
      return y > 1900 && y < 2100;
    }
    return true; // 2-digit year is intentionally permissive
  }

  // Other strings: defer to Date.parse but reject anything outside the window.
  const parsed = new Date(value);
  if (isNaN(parsed)) return false;
  const year = parsed.getFullYear();
  return year > 1900 && year < 2100 && /\d{4}/.test(value);
}

// ---------- pattern library ----------
//
// Order matters: when two patterns match a column with the same confidence, the
// one declared earlier wins. SSN is placed before phone because SSN-formatted
// values also match the (deliberately loose) phone regex.

const PATTERNS = [
  // ---------- Direct identifiers (strong value patterns) ----------
  {
    type: 'email',
    severity: 'direct',
    headerHints: ['email', 'e-mail', 'mail'],
    valueRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    suggested: { action: 'redact', replaceWith: '<email>' },
  },
  {
    type: 'ssn',
    severity: 'direct',
    headerHints: ['ssn', 'social security', 'social_security', 'tin'],
    valueRegex: /^\d{3}-?\d{2}-?\d{4}$/,
    suggested: { action: 'redact', replaceWith: '<ssn>' },
  },
  {
    type: 'creditcard',
    severity: 'direct',
    headerHints: ['credit_card', 'creditcard', 'card_number', 'cardnumber', 'cc_number'],
    valueRegex: /^(?:\d[ -]?){13,19}$/,
    headerRequired: true, // long-digit strings can be many things
    suggested: { action: 'redact', replaceWith: '<cc>' },
  },
  {
    type: 'phone',
    severity: 'direct',
    headerHints: ['phone', 'mobile', 'cell', 'tel', 'telephone', 'contact'],
    valueRegex: /^[+]?[\d][\d\s\-().]{6,}$/,
    headerRequired: true, // the regex also matches dates and other digit-heavy strings
    suggested: { action: 'redact', replaceWith: '<phone>' },
  },
  {
    type: 'nhi',
    severity: 'direct',
    headerHints: ['nhi', 'national health'],
    valueRegex: /^[A-Za-z]{3}\d{4}$/,
    suggested: { action: 'anonymize', outputName: 'ID' },
  },
  {
    type: 'mrn',
    severity: 'direct',
    headerHints: ['mrn', 'medical record', 'patient_id', 'patientid', 'patient id', 'patient code', 'patient_code'],
    // Real MRNs are alphanumeric with at least one digit; the value regex below
    // also matches ISO date strings, so we require the header to confirm.
    valueRegex: /^(?=.*\d)[A-Z0-9-]{4,20}$/i,
    headerRequired: true,
    suggested: { action: 'anonymize', outputName: 'PatientID' },
  },
  {
    type: 'ip',
    severity: 'direct',
    headerHints: ['ip', 'ip_address', 'ipaddress', 'client_ip'],
    valueRegex: /^(?:\d{1,3}\.){3}\d{1,3}$/,
    suggested: { action: 'redact', replaceWith: '<ip>' },
  },

  // ---------- Direct identifiers (header-driven) ----------
  {
    type: 'dob',
    severity: 'direct',
    headerHints: ['dob', 'date of birth', 'birth_date', 'birthdate', 'birth date'],
    valueIsDate: true,
    headerRequired: true, // generic dates default to the 'date' quasi-identifier
    suggested: { action: 'ageFromDate', outputName: 'Age' },
  },
  {
    type: 'name',
    severity: 'direct',
    headerHints: ['name', 'full name', 'first name', 'firstname', 'last name', 'lastname', 'surname', 'given name', 'family name', 'middle name'],
    headerOnly: true,
    suggested: { action: 'redact', replaceWith: '<name>' },
  },
  {
    type: 'address',
    severity: 'direct',
    headerHints: ['address', 'street', 'addr', 'home_address', 'mailing_address'],
    headerOnly: true,
    suggested: { action: 'drop' },
  },

  // ---------- Quasi-identifiers (header-required to avoid false positives) ----------
  {
    type: 'postcode',
    severity: 'quasi',
    headerHints: ['postcode', 'postal_code', 'postal code', 'zip', 'zipcode', 'zip_code'],
    valueRegex: /^[A-Z0-9][A-Z0-9 -]{2,9}$/i,
    headerRequired: true,
    suggested: null,
  },
  {
    type: 'age',
    severity: 'quasi',
    headerHints: ['age'],
    valuePredicate: function (v) {
      const n = Number(v);
      return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 130;
    },
    headerRequired: true,
    suggested: null,
  },
  {
    type: 'gender',
    severity: 'quasi',
    headerHints: ['gender', 'sex'],
    valuePredicate: function (v) {
      if (typeof v !== 'string') return false;
      const lower = v.trim().toLowerCase();
      return ['m', 'f', 'male', 'female', 'x', 'other', 'nonbinary', 'non-binary', 'nb', 'unknown', 'prefer not to say'].includes(lower);
    },
    headerRequired: true,
    suggested: null,
  },
  {
    // Generic dates that aren't DOB — admission, surgery, encounter, etc. They
    // don't trigger a cleaning suggestion but k-anonymity treats them as QIs.
    type: 'date',
    severity: 'quasi',
    valueIsDate: true,
    suggested: null,
    weight: 0.85,
  },
];

// ---------- helpers ----------

function normalizeHeader(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function headerMatches(pattern, header) {
  if (!pattern.headerHints || pattern.headerHints.length === 0) return false;
  return pattern.headerHints.some(function (hint) {
    return header === hint || header.indexOf(hint) !== -1;
  });
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
  for (const v of samples) {
    if (pattern.valueRegex && typeof v === 'string' && pattern.valueRegex.test(v)) { hits++; continue; }
    if (pattern.valuePredicate && pattern.valuePredicate(v)) { hits++; continue; }
    if (pattern.valueIsDate && looksLikeDate(typeof v === 'string' ? v : String(v))) { hits++; continue; }
  }
  return hits / samples.length;
}

function patternHasValueCheck(pattern) {
  return Boolean(pattern.valueRegex || pattern.valuePredicate || pattern.valueIsDate);
}

// ---------- per-column detection ----------

function detectColumn(header, samples) {
  const norm = normalizeHeader(header);
  const candidates = [];

  for (const pattern of PATTERNS) {
    const headerHit = headerMatches(pattern, norm);
    const valueRate = patternHasValueCheck(pattern) ? valueMatchRate(pattern, samples) : 0;

    if (pattern.headerOnly) {
      if (headerHit) {
        candidates.push({ pattern, confidence: 0.92, evidence: { headerHit, valueRate: null } });
      }
      continue;
    }

    if (pattern.headerRequired && !headerHit) continue;

    let confidence = 0;
    if (headerHit && valueRate >= 0.5) confidence = 0.95 + Math.min(0.04, valueRate - 0.5);
    else if (valueRate >= 0.9)        confidence = 0.9;
    else if (headerHit)               confidence = 0.6 + (valueRate >= 0.25 ? 0.1 : 0);
    else if (valueRate >= 0.5)        confidence = 0.65 + Math.min(0.1, valueRate - 0.5);

    if (confidence > 0) {
      candidates.push({
        pattern,
        confidence: Math.min(0.99, confidence * (pattern.weight || 1)),
        evidence: { headerHit, valueRate },
      });
    }
  }

  candidates.sort(function (a, b) { return b.confidence - a.confidence; });
  const best = candidates[0] || null;
  return { best, candidates };
}

// ---------- whole-sheet detection ----------

function detectSheets(sheets) {
  const columns = [];
  const suggestedRules = [];
  const seenHeaders = new Set();
  const quasiHeaders = [];
  const quasiSeen = new Set();
  let direct = 0;
  let quasi = 0;

  for (const sheet of sheets) {
    if (!sheet.rows || sheet.rows.length === 0) continue;
    const header = sheet.rows[0] || [];
    for (let c = 0; c < header.length; c++) {
      const headerCell = header[c];
      const samples = sampleNonEmpty(sheet.rows, c, SAMPLE_SIZE);
      const { best, candidates } = detectColumn(headerCell, samples);

      const report = {
        sheetName: sheet.name,
        header: headerCell,
        sampleSize: samples.length,
        sampleValues: samples.slice(0, 3).map(function (v) { return String(v); }),
        detections: candidates.slice(0, 3).map(function (c2) {
          return {
            type: c2.pattern.type,
            severity: c2.pattern.severity,
            confidence: Number(c2.confidence.toFixed(2)),
            evidence: c2.evidence,
          };
        }),
        bestType: best ? best.pattern.type : null,
        bestSeverity: best ? best.pattern.severity : null,
        bestConfidence: best ? Number(best.confidence.toFixed(2)) : null,
        suggested: best && best.pattern.suggested ? best.pattern.suggested : null,
      };
      columns.push(report);

      if (best && best.pattern.severity === 'direct') direct++;
      if (best && best.pattern.severity === 'quasi') {
        quasi++;
        const norm = normalizeHeader(headerCell);
        if (!quasiSeen.has(norm)) {
          quasiSeen.add(norm);
          quasiHeaders.push(String(headerCell));
        }
      }

      if (best && best.pattern.suggested && !seenHeaders.has(normalizeHeader(headerCell))) {
        seenHeaders.add(normalizeHeader(headerCell));
        suggestedRules.push(Object.assign(
          { match: { equals: String(headerCell) } },
          best.pattern.suggested
        ));
      }
    }
  }

  // Always include the universal hygienic rules at the end.
  suggestedRules.push({ match: { empty: true },          action: 'drop' });
  suggestedRules.push({ match: { startsWith: 'column' }, action: 'drop' });

  const suggestedRuleSet = { version: '1', rules: suggestedRules };
  if (quasiHeaders.length > 0) {
    // Default to k>=5 — a common threshold for "small-cell suppression" in
    // healthcare reporting. Users can lower or raise it on the rule set.
    suggestedRuleSet.kAnonymity = { quasiIdentifiers: quasiHeaders, minK: 5 };
  }

  return {
    columns,
    suggestedRuleSet,
    summary: { directIdentifiers: direct, quasiIdentifiers: quasi },
  };
}

module.exports = {
  PATTERNS,
  SAMPLE_SIZE,
  looksLikeDate,
  normalizeHeader,
  detectColumn,
  detectSheets,
};
