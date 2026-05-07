/**
 * Version: 1.0.0
 * Description: Edge case tests for cleanWorksheetData logic
 * Author: Ali Kahwaji
 */

const cleanWorksheetData = require('../../src/utils/cleanWorkSheetData');

describe('cleanWorksheetData() - edge cases', () => {

  it('should return empty array if all rows are blank', () => {
    const input = [['NHI', 'DOB'], [], [], []];
    const result = cleanWorksheetData(input);
    expect(result.length).toBe(1); // only header row
  });

  it('should handle missing columns gracefully', () => {
    const input = [['Column1', 'Column2'], ['a', 'b'], ['c', 'd']];
    const result = cleanWorksheetData(input);
    expect(result).toEqual([[], []]); // header + row
  });

  it('should ignore non-array input', () => {
    expect(cleanWorksheetData(null)).toEqual([]);
    expect(cleanWorksheetData(undefined)).toEqual([]);
    expect(cleanWorksheetData({})).toEqual([]);
  });

  it('should sanitize mixed-type header fields', () => {
    const rows = [[null, 'DOB', 123, 'NHI'], ['val1', '1990-01-01', 'test', 'ZZ001']];
    const result = cleanWorksheetData(rows);
    expect(result[0]).toEqual(['Age', 123, 'ID']); // matches how raw header is passed through
  });

  it('should reset anonymized IDs between separate calls', () => {
    const firstResult = cleanWorksheetData([
      ['NHI'],
      ['AAA111']
    ]);
    const secondResult = cleanWorksheetData([
      ['NHI'],
      ['BBB222']
    ]);

    expect(firstResult[1][0]).toBe('ID-001');
    expect(secondResult[1][0]).toBe('ID-001');
  });
});
