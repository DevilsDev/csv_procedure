/**
 * Version: 2.4.0
 * Description: Unit tests for transformSheet() to verify anonymization and cleaning logic.
 * Author: Ali Kahwaji
 */

const { transformSheet, transformSheetWithStats } = require('../src/etl/transform');
const { resetIdMap } = require('../src/etl/idMapper');

describe('transformSheet()', () => {
  beforeEach(() => {
    resetIdMap();
  });

  it('should convert NHI to anonymized ID and DOB to Age, and strip sensitive fields', () => {
    const input = [
      ['NHI', 'DOB', 'Contact', 'Weight'],
      ['AB123', '1990-01-01', '123456', 72],
      ['AB123', '1990-01-01', '123456', 72],
      ['CD456', '1985-06-15', '789012', 68]
    ];

    const result = transformSheet(input);

    expect(result[0]).toEqual(['ID', 'Age', 'Weight']);
    expect(result.length).toBe(3);
    expect(result[1][0]).toBe('ID-001');
    expect(result[2][0]).toBe('ID-002');
    expect(typeof result[1][1]).toBe('number');
    expect(result[1][2]).toBe(72);
  });

  it('should skip completely empty rows and unnamed columns', () => {
    const input = [
      ['NHI', '', 'DOB', 'Contact', ''],
      ['XY999', '', '2000-12-31', '555555', ''],
      [],
      ['', '', '', '', '']
    ];

    const result = transformSheet(input);

    expect(result[0]).toEqual(['ID', 'Age']);
    expect(result.length).toBe(2);
    expect(result[1][0]).toBe('ID-001');
    expect(typeof result[1][1]).toBe('number');
  });

  it('should return empty array if input is not valid', () => {
    expect(transformSheet(null)).toEqual([]);
    expect(transformSheet(undefined)).toEqual([]);
    expect(transformSheet([])).toEqual([]);
  });

  it('should handle invalid DOB and return empty string for Age', () => {
    const input = [
      ['NHI', 'DOB'],
      ['AB123', 'not-a-date']
    ];

    const result = transformSheet(input);
    expect(result[0]).toEqual(['ID', 'Age']);
    expect(result[1][0]).toBe('ID-001');
    expect(result[1][1]).toBe('');
  });

  it('should preserve missing NHI values without consuming anonymized IDs', () => {
    const input = [
      ['NHI', 'DOB', 'Weight'],
      [undefined, '1990-01-01', 72],
      ['AB123', '1995-06-15', 68]
    ];

    const result = transformSheet(input);

    expect(result[0]).toEqual(['ID', 'Age', 'Weight']);
    expect(result[1][0]).toBe('');
    expect(result[2][0]).toBe('ID-001');
  });

  it('should report row-level summary stats', () => {
    const input = [
      ['NHI', 'DOB', 'Weight'],
      ['AB123', '1990-01-01', 72],
      ['AB123', '1990-01-01', 72],
      ['', 'not-a-date', 70],
      [undefined, '2001-02-03', 65],
      ['', '', ''],
    ];

    const result = transformSheetWithStats(input);

    expect(result.stats).toEqual({
      rowsProcessed: 4,
      duplicatesRemoved: 1,
      invalidDobCount: 1,
      missingNhiCount: 2,
      redactedCellCount: 0,
    });
    expect(result.rows.length).toBe(4);
  });
});
