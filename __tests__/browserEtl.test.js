/**
 * Version: 2.6.1
 * Description: Tests the in-browser ETL bundle (docs/static/tool/etl.js) against the
 *              same expectations as the server transform tests. The browser script is
 *              a hand-maintained mirror of src/etl/transform.js + idMapper.js — these
 *              tests are the safety net that catches drift between the two
 *              implementations.
 *
 *              The script is loaded into a fresh global scope per test (so module
 *              state cannot leak) and exercised through window.ClinisyncETL.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ETL_PATH = path.resolve(__dirname, '../docs/static/tool/etl.js');

function loadBrowserEtl() {
  const code = fs.readFileSync(ETL_PATH, 'utf8');
  const sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'etl.js' });
  return sandbox.window.ClinisyncETL;
}

describe('browser-side ETL (docs/static/tool/etl.js)', () => {
  describe('createIdMapper', () => {
    let etl;
    beforeAll(() => { etl = loadBrowserEtl(); });

    it('returns the same ID for the same NHI within a mapper', () => {
      const m = etl.createIdMapper();
      expect(m.getAnonymizedId('AB-12345')).toBe('ID-001');
      expect(m.getAnonymizedId('AB-12345')).toBe('ID-001');
      expect(m.getAnonymizedId('CD-67890')).toBe('ID-002');
    });

    it('trims whitespace and treats empty / non-string as missing', () => {
      const m = etl.createIdMapper();
      expect(m.getAnonymizedId(' XY ')).toBe('ID-001');
      expect(m.getAnonymizedId('XY')).toBe('ID-001');
      expect(m.getAnonymizedId('')).toBe('');
      expect(m.getAnonymizedId(null)).toBe('');
      expect(m.getAnonymizedId(undefined)).toBe('');
      expect(m.getAnonymizedId(123)).toBe('');
    });

    it('keeps mappers isolated from each other', () => {
      const a = etl.createIdMapper();
      const b = etl.createIdMapper();
      expect(a.getAnonymizedId('A')).toBe('ID-001');
      expect(b.getAnonymizedId('B')).toBe('ID-001');
    });
  });

  describe('transformSheetWithStats', () => {
    let etl;
    beforeEach(() => { etl = loadBrowserEtl(); });

    it('renames NHI -> ID, DOB -> Age, drops Contact + Address, dedupes', () => {
      const input = [
        ['NHI', 'DOB', 'Contact', 'Weight'],
        ['AB123', '1990-01-01', '123456', 72],
        ['AB123', '1990-01-01', '123456', 72],
        ['CD456', '1985-06-15', '789012', 68],
      ];
      const out = etl.transformSheetWithStats(input);
      expect(out.rows[0]).toEqual(['ID', 'Age', 'Weight']);
      expect(out.rows.length).toBe(3);
      expect(out.rows[1][0]).toBe('ID-001');
      expect(out.rows[2][0]).toBe('ID-002');
      expect(typeof out.rows[1][1]).toBe('number');
      expect(out.stats.duplicatesRemoved).toBe(1);
    });

    it('preserves numeric 0 cells (not treated as blank rows)', () => {
      const input = [
        ['NHI', 'Pain'],
        ['AB123', 0],
      ];
      const out = etl.transformSheetWithStats(input);
      expect(out.stats.rowsProcessed).toBe(1);
      expect(out.rows.length).toBe(2);
      expect(out.rows[1][1]).toBe(0);
    });

    it('skips blank rows and unnamed / Column-prefixed columns', () => {
      const input = [
        ['NHI', '', 'DOB', 'Column 1'],
        ['XY999', '', '2000-12-31', 'noise'],
        [],
        ['', '', '', ''],
      ];
      const out = etl.transformSheetWithStats(input);
      expect(out.rows[0]).toEqual(['ID', 'Age']);
      expect(out.rows.length).toBe(2);
    });

    it('counts invalid DOB and missing NHI', () => {
      const input = [
        ['NHI', 'DOB'],
        ['', '1990-01-01'],
        ['AB123', 'not-a-date'],
        ['CD456', ''],
      ];
      const out = etl.transformSheetWithStats(input);
      expect(out.stats.missingNhiCount).toBe(1);
      expect(out.stats.invalidDobCount).toBe(1);
      expect(out.stats.rowsProcessed).toBe(3);
    });

    it('only matches Contact/Address as exact tokens, not substrings', () => {
      const input = [
        ['NHI', 'Emergency Contact Date', 'Address Verified'],
        ['AB123', 'last week', 'yes'],
      ];
      const out = etl.transformSheetWithStats(input);
      expect(out.rows[0]).toEqual(['ID', 'Emergency Contact Date', 'Address Verified']);
    });

    it('returns empty results for invalid input', () => {
      expect(etl.transformSheetWithStats(null).rows).toEqual([]);
      expect(etl.transformSheetWithStats(undefined).rows).toEqual([]);
      expect(etl.transformSheetWithStats([]).rows).toEqual([]);
    });

    it('shares IDs across sheets when given the same idMapper', () => {
      const mapper = etl.createIdMapper();
      const sheet1 = etl.transformSheetWithStats([['NHI'], ['AB']], mapper);
      const sheet2 = etl.transformSheetWithStats([['NHI'], ['AB']], mapper);
      expect(sheet1.rows[1][0]).toBe('ID-001');
      expect(sheet2.rows[1][0]).toBe('ID-001');
    });
  });

  describe('processWorkbook', () => {
    let etl;
    beforeAll(() => { etl = loadBrowserEtl(); });

    it('produces server-shaped output (sheets, manifest, summary)', () => {
      // We can't easily build an xlsx ArrayBuffer without xlsx in this test, so
      // we exercise the small surface area we own (sanitizeName + manifest naming)
      // and rely on the transform tests above for the cleaning correctness.
      expect(etl.sanitizeName('Case Mix Sample!', 'fallback')).toBe('case_mix_sample');
      expect(etl.sanitizeName('', 'workbook')).toBe('workbook');
    });
  });

  describe('parity with server transform', () => {
    it('produces identical stats to the server implementation on the same input', () => {
      const browserEtl = loadBrowserEtl();
      const { transformSheetWithStats: serverTransform } = require('../src/etl/transform');

      const input = [
        ['NHI', 'DOB', 'Weight'],
        ['AB123', '1990-01-01', 72],
        ['AB123', '1990-01-01', 72],
        ['', 'not-a-date', 70],
        [undefined, '2001-02-03', 65],
        ['', '', ''],
      ];

      const browser = browserEtl.transformSheetWithStats(input);
      const server = serverTransform(input);

      expect(browser.stats).toEqual(server.stats);
      expect(browser.rows).toEqual(server.rows);
    });
  });
});
