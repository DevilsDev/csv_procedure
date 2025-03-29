/**
 * Version: 2.4.0
 * Description: Unit tests for transformSheet() to verify anonymization and cleaning logic.
 * Author: Ali Kahwaji
 */

const { transformSheet } = require('../src/etl/transform');
const { resetIdMap } = require('../src/etl/idMapper');

describe('transformSheet()', () => {
  beforeEach(() => {
    resetIdMap(); // Ensure IDs are fresh for each test
  });

  it('should convert NHI to anonymized ID and DOB to Age, and strip sensitive fields', () => {
    const input = [
      ['NHI', 'DOB', 'Contact', 'Weight'],
      ['AB123', '1990-01-01', '123456', 72],
      ['AB123', '1990-01-01', '123456', 72], // duplicate
      ['CD456', '1985-06-15', '789012', 68]
    ];

    const result = transformSheet(input);

    expect(result[0]).toEqual(['ID', 'Age', 'Weight']); // Cleaned header
    expect(result.length).toBe(3); // 1 header + 2 rows
    expect(result[1][0]).toBe('ID-001');
    expect(result[2][0]).toBe('ID-002');
    expect(typeof result[1][1]).toBe('number'); // Age
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

    expect(result[0]).toEqual(['ID', 'Age']); // Skipped unnamed and sensitive columns
    expect(result.length).toBe(2); // 1 header + 1 valid row
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
});
