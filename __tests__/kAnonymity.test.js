/**
 * Version: 2.7.6
 * Description: Tests for src/etl/kAnonymity.js — algorithm correctness, edge cases,
 *              and a browser-mirror parity test.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { computeKAnonymity } = require('../src/etl/kAnonymity');

function loadBrowserEtl() {
  const code = fs.readFileSync(path.resolve(__dirname, '../docs/static/tool/etl.js'), 'utf8');
  const sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'etl.js' });
  return sandbox.window.ClinisyncETL;
}

describe('computeKAnonymity', () => {
  const rows = [
    ['Age', 'Postcode', 'Gender', 'Diagnosis'],
    [40, '1010', 'M', 'flu'],
    [40, '1010', 'M', 'cold'],     // duplicate QI tuple — same group
    [40, '1010', 'M', 'covid'],    // duplicate QI tuple — same group (group size 3)
    [50, '2050', 'F', 'flu'],
    [50, '2050', 'F', 'asthma'],   // group size 2
    [60, '3000', 'X', 'pneumonia'],// group size 1 (singleton)
  ];

  it('returns k=1 when there is at least one singleton', () => {
    const r = computeKAnonymity(rows, ['Age', 'Postcode', 'Gender']);
    expect(r.applicable).toBe(true);
    expect(r.k).toBe(1);
    expect(r.totalRows).toBe(6);
    expect(r.uniqueGroups).toBe(3);
    expect(r.singletonRows).toBe(1);
  });

  it('histogram lists group sizes ascending with their counts', () => {
    const r = computeKAnonymity(rows, ['Age', 'Postcode', 'Gender']);
    expect(r.histogram).toEqual([
      { k: 1, groupCount: 1 },
      { k: 2, groupCount: 1 },
      { k: 3, groupCount: 1 },
    ]);
  });

  it('matches QI names case-insensitively against header', () => {
    const r = computeKAnonymity(rows, ['age', 'POSTCODE', '  Gender  ']);
    expect(r.applicable).toBe(true);
    expect(r.k).toBe(1);
    expect(r.quasiIdentifiers).toEqual(['Age', 'Postcode', 'Gender']);
  });

  it('silently skips QIs that are not in the header', () => {
    const r = computeKAnonymity(rows, ['Age', 'NotPresent']);
    expect(r.applicable).toBe(true);
    expect(r.quasiIdentifiers).toEqual(['Age']);
  });

  it('returns applicable=false when no QIs resolve to header columns', () => {
    const r = computeKAnonymity(rows, ['NotPresent']);
    expect(r.applicable).toBe(false);
    expect(r.reason).toMatch(/not present/);
  });

  it('returns applicable=false when no QIs are configured', () => {
    const r = computeKAnonymity(rows, []);
    expect(r.applicable).toBe(false);
  });

  it('returns applicable=false when there are no data rows', () => {
    const r = computeKAnonymity([['Age', 'Postcode']], ['Age']);
    expect(r.applicable).toBe(false);
    expect(r.reason).toMatch(/no data rows/);
  });

  it('reports satisfiesMinK true when k >= minK', () => {
    const equalK = [
      ['Age', 'Postcode'],
      [40, '1010'],
      [40, '1010'],
      [50, '2050'],
      [50, '2050'],
    ];
    const r = computeKAnonymity(equalK, ['Age', 'Postcode'], { minK: 2 });
    expect(r.k).toBe(2);
    expect(r.satisfiesMinK).toBe(true);
    expect(r.minK).toBe(2);
  });

  it('reports satisfiesMinK false when k < minK', () => {
    const r = computeKAnonymity(rows, ['Age', 'Postcode', 'Gender'], { minK: 5 });
    expect(r.satisfiesMinK).toBe(false);
  });

  it('treats null and undefined cells as empty strings in the QI tuple', () => {
    const sparse = [
      ['Age', 'Postcode'],
      [40, null],
      [40, ''],
      [40, undefined],
    ];
    const r = computeKAnonymity(sparse, ['Age', 'Postcode']);
    // All three rows have the same effective tuple (40, "")
    expect(r.k).toBe(3);
    expect(r.uniqueGroups).toBe(1);
  });

  it('handles a single QI column', () => {
    const r = computeKAnonymity(rows, ['Age']);
    // Group sizes: 40 -> 3, 50 -> 2, 60 -> 1
    expect(r.k).toBe(1);
    expect(r.uniqueGroups).toBe(3);
  });
});

describe('browser mirror parity', () => {
  it('produces an identical report on the same input', () => {
    const browserEtl = loadBrowserEtl();
    const rows = [
      ['Age', 'Postcode', 'Gender'],
      [40, '1010', 'M'],
      [40, '1010', 'M'],
      [50, '2050', 'F'],
      [60, '3000', 'X'],
    ];
    const server = computeKAnonymity(rows, ['Age', 'Postcode', 'Gender'], { minK: 3 });
    const browser = browserEtl.computeKAnonymity(rows, ['Age', 'Postcode', 'Gender'], { minK: 3 });
    expect(browser).toEqual(server);
  });
});

describe('rule set schema accepts kAnonymity block', () => {
  const { validateRuleSet } = require('../src/etl/rules');

  it('accepts a rule set with kAnonymity', () => {
    expect(() => validateRuleSet({
      version: '1',
      rules: [{ match: { equals: 'foo' }, action: 'drop' }],
      kAnonymity: { quasiIdentifiers: ['Age', 'Postcode'], minK: 5 },
    })).not.toThrow();
  });

  it('rejects non-array quasiIdentifiers', () => {
    expect(() => validateRuleSet({
      rules: [],
      kAnonymity: { quasiIdentifiers: 'Age' },
    })).toThrow(/array/);
  });

  it('rejects non-positive-integer minK', () => {
    expect(() => validateRuleSet({
      rules: [],
      kAnonymity: { minK: 0 },
    })).toThrow(/positive integer/);
    expect(() => validateRuleSet({
      rules: [],
      kAnonymity: { minK: 'five' },
    })).toThrow(/positive integer/);
  });
});

describe('detection populates kAnonymity in suggested rule set', () => {
  const { detectSheets } = require('../src/etl/detect');

  it('adds quasi-identifier columns and a default minK', () => {
    const sheets = [{
      name: 'mix',
      rows: [
        ['NHI', 'DOB', 'Postcode', 'Gender', 'Age'],
        ['ABC1234', '1990-01-15', '1010', 'M', 30],
        ['XYZ9876', '1985-06-30', '2050', 'F', 40],
      ],
    }];
    const report = detectSheets(sheets);
    expect(report.suggestedRuleSet.kAnonymity).toEqual(expect.objectContaining({
      quasiIdentifiers: expect.arrayContaining(['Postcode', 'Gender', 'Age']),
      minK: expect.any(Number),
    }));
  });

  it('omits kAnonymity when no quasi-identifiers are detected', () => {
    const sheets = [{
      name: 'plain',
      rows: [
        ['NHI', 'Email'],
        ['ABC1234', 'a@b.co'],
      ],
    }];
    const report = detectSheets(sheets);
    expect(report.suggestedRuleSet.kAnonymity).toBeUndefined();
  });
});
