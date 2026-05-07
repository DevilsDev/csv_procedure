/**
 * Version: 2.7.5
 * Description: Tests for src/etl/detect.js — pattern matching, confidence scoring,
 *              suggested rule-set construction. Plus a parity test that asserts the
 *              browser mirror in docs/static/tool/etl.js produces the same detection
 *              report on the same input.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { detectColumn, detectSheets, looksLikeDate, PATTERNS } = require('../src/etl/detect');

function loadBrowserEtl() {
  const code = fs.readFileSync(path.resolve(__dirname, '../docs/static/tool/etl.js'), 'utf8');
  const sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'etl.js' });
  return sandbox.window.ClinisyncETL;
}

describe('detect.looksLikeDate', () => {
  it.each([
    ['1990-01-15',          true],
    ['2020-12-31T08:00:00', true],
    ['15/01/1990',          true],
    ['1/1/00',              true],
    ['nope',                false],
    ['',                    false],
    ['1500-01-01',          false], // too old, year filter
  ])('looksLikeDate(%j) === %s', (input, expected) => {
    expect(looksLikeDate(input)).toBe(expected);
  });
});

describe('detect.detectColumn', () => {
  it('high-confidence on email by header + value', () => {
    const { best } = detectColumn('Email', ['alice@example.com', 'bob@acme.org', 'c@d.co']);
    expect(best.pattern.type).toBe('email');
    expect(best.confidence).toBeGreaterThan(0.9);
  });

  it('detects email by value alone', () => {
    const { best } = detectColumn('Communication', ['alice@example.com', 'bob@acme.org', 'c@d.co']);
    expect(best.pattern.type).toBe('email');
    expect(best.confidence).toBeGreaterThan(0.65);
  });

  it('detects DOB by header + dates', () => {
    const { best } = detectColumn('DOB', ['1990-01-15', '1985-06-30', '2001-12-12']);
    expect(best.pattern.type).toBe('dob');
    expect(best.suggested).toBeUndefined(); // suggested lives on pattern
    expect(best.pattern.suggested).toEqual({ action: 'ageFromDate', outputName: 'Age' });
  });

  it('falls back to generic date for non-DOB date columns', () => {
    const { best } = detectColumn('AdmissionDate', ['2024-01-05', '2024-02-10']);
    expect(best.pattern.type).toBe('date');
    expect(best.pattern.severity).toBe('quasi');
  });

  it('detects NHI by both header and value', () => {
    const { best } = detectColumn('NHI', ['ABC1234', 'XYZ9876']);
    expect(best.pattern.type).toBe('nhi');
    expect(best.confidence).toBeGreaterThan(0.9);
  });

  it('detects MRN by header alone (no fixed value pattern)', () => {
    const { best } = detectColumn('Patient_ID', ['MRN-12345', 'MRN-99999']);
    expect(best.pattern.type).toBe('mrn');
  });

  it('flags name columns by header only (header-only pattern)', () => {
    const { best } = detectColumn('Full Name', ['Alice Smith', 'Bob Jones']);
    expect(best.pattern.type).toBe('name');
    expect(best.pattern.headerOnly).toBe(true);
  });

  it('flags address by header only', () => {
    const { best } = detectColumn('Home Address', ['12 Queen St', '34 King Rd']);
    expect(best.pattern.type).toBe('address');
    expect(best.pattern.suggested).toEqual({ action: 'drop' });
  });

  it('flags postcode as quasi-identifier, no cleaning suggestion', () => {
    const { best } = detectColumn('Postcode', ['1010', '2050', '3000']);
    expect(best.pattern.type).toBe('postcode');
    expect(best.pattern.severity).toBe('quasi');
    expect(best.pattern.suggested).toBeNull();
  });

  it('flags age as quasi-identifier when values are 0..130 integers', () => {
    const { best } = detectColumn('Age', [25, 47, 12]);
    expect(best.pattern.type).toBe('age');
    expect(best.pattern.severity).toBe('quasi');
  });

  it('flags gender by allowlist values', () => {
    const { best } = detectColumn('Sex', ['M', 'F', 'M', 'X']);
    expect(best.pattern.type).toBe('gender');
  });

  it('returns no detection for genuinely unrelated columns', () => {
    const { best } = detectColumn('Weight', [72, 85, 60]);
    expect(best).toBeNull();
  });

  it('detects SSN by value pattern', () => {
    const { best } = detectColumn('SocialSec', ['123-45-6789', '987-65-4321']);
    expect(best.pattern.type).toBe('ssn');
  });

  it('detects credit-card-shaped values', () => {
    const { best } = detectColumn('CardNumber', ['4242424242424242', '5555 5555 5555 4444']);
    expect(best.pattern.type).toBe('creditcard');
  });
});

describe('detect.detectSheets', () => {
  const sheets = [
    {
      name: 'Patients',
      rows: [
        ['Name', 'Email', 'NHI', 'DOB', 'Postcode', 'Notes'],
        ['Alice', 'alice@example.com', 'ABC1234', '1990-01-15', '1010', 'fine'],
        ['Bob',   'bob@acme.org',      'XYZ9876', '1985-06-30', '2050', 'ok'],
      ],
    },
    {
      name: 'Outcomes',
      rows: [
        ['NHI', 'AdmissionDate', 'Score'],
        ['ABC1234', '2024-01-05', 7],
        ['XYZ9876', '2024-02-10', 5],
      ],
    },
  ];

  let report;
  beforeAll(() => { report = detectSheets(sheets); });

  it('returns one column report per (sheet, column)', () => {
    expect(report.columns.length).toBe(6 + 3);
  });

  it('counts direct vs quasi identifiers correctly', () => {
    expect(report.summary.directIdentifiers).toBeGreaterThanOrEqual(4); // Name, Email, NHI x2, DOB
    expect(report.summary.quasiIdentifiers).toBeGreaterThanOrEqual(2);  // Postcode, AdmissionDate
  });

  it('compiles a runnable rule set', () => {
    const { validateRuleSet, compileRuleSet } = require('../src/etl/rules');
    expect(() => validateRuleSet(report.suggestedRuleSet)).not.toThrow();
    const lookup = compileRuleSet(report.suggestedRuleSet);
    expect(lookup('NHI')).toMatchObject({ action: 'anonymize', outputName: 'ID' });
    expect(lookup('Email')).toMatchObject({ action: 'redact' });
    expect(lookup('Name')).toMatchObject({ action: 'redact' });
    expect(lookup('DOB')).toMatchObject({ action: 'ageFromDate' });
  });

  it('emits each header only once even when sheets share columns', () => {
    const nhiRules = report.suggestedRuleSet.rules.filter(function (r) {
      return r.match.equals && r.match.equals.toLowerCase() === 'nhi';
    });
    expect(nhiRules.length).toBe(1);
  });

  it('always appends the universal hygiene rules at the end', () => {
    const tail = report.suggestedRuleSet.rules.slice(-2);
    expect(tail[0].match).toEqual({ empty: true });
    expect(tail[1].match).toEqual({ startsWith: 'column' });
  });

  it('includes severity, confidence, and evidence on each detection', () => {
    const emailReport = report.columns.find(function (c) { return c.header === 'Email'; });
    expect(emailReport.bestType).toBe('email');
    expect(emailReport.bestSeverity).toBe('direct');
    expect(emailReport.bestConfidence).toBeGreaterThan(0.9);
    expect(emailReport.detections[0].evidence).toEqual(expect.objectContaining({
      headerHit: true,
      valueRate: expect.any(Number),
    }));
  });
});

describe('browser detection parity', () => {
  it('produces an identical column report and suggested rule set as the server', () => {
    const browserEtl = loadBrowserEtl();
    const sheets = [{
      name: 'Mixed',
      rows: [
        ['NHI', 'DOB', 'Email', 'Postcode', 'Age', 'Notes'],
        ['ABC1234', '1990-01-15', 'a@b.co', '1010', 30, 'foo'],
        ['XYZ9876', '1985-06-30', 'c@d.co', '2050', 40, 'bar'],
      ],
    }];
    const serverReport = detectSheets(sheets);
    const browserReport = browserEtl.detectSheets(sheets);
    expect(browserReport.summary).toEqual(serverReport.summary);
    expect(browserReport.suggestedRuleSet).toEqual(serverReport.suggestedRuleSet);
    expect(browserReport.columns.length).toEqual(serverReport.columns.length);
    for (let i = 0; i < serverReport.columns.length; i++) {
      expect(browserReport.columns[i].bestType).toBe(serverReport.columns[i].bestType);
      expect(browserReport.columns[i].bestSeverity).toBe(serverReport.columns[i].bestSeverity);
      // Confidence might differ by 0.01 due to floating-point rounding through JSON.
      expect(Math.abs(
        (browserReport.columns[i].bestConfidence || 0) - (serverReport.columns[i].bestConfidence || 0)
      )).toBeLessThan(0.02);
    }
  });
});

describe('PATTERNS library', () => {
  it('every pattern declares severity and either headerHints, value check, or both', () => {
    for (const p of PATTERNS) {
      expect(['direct', 'quasi']).toContain(p.severity);
      const hasHeader = Array.isArray(p.headerHints) && p.headerHints.length > 0;
      const hasValue = Boolean(p.valueRegex || p.valuePredicate || p.valueIsDate);
      expect(hasHeader || hasValue).toBe(true);
    }
  });
});
