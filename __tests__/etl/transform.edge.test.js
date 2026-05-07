/**
 * Version: 1.0.0
 * Description: Edge case tests for transformSheet logic in transform.js
 * Author: Ali Kahwaji
 */

const { transformSheet } = require('../../src/etl/transform');
const { resetIdMap } = require('../../src/etl/idMapper');

describe('transformSheet() - edge cases', () => {
  beforeEach(() => resetIdMap());

  it('should return empty array if all rows are blank', () => {
    const input = [['NHI', 'DOB'], [], [], []];
    const result = transformSheet(input);
    expect(result.length).toBe(1); // only header row
  });

  it('should handle missing columns gracefully', () => {
    const input = [['Column1', 'Column2'], ['a', 'b'], ['c', 'd']];
    const result = transformSheet(input);
    expect(result).toEqual([[], []]); // empty header + 1 row that gets processed
  });

  it('should ignore non-array input', () => {
    expect(transformSheet(null)).toEqual([]);
    expect(transformSheet(undefined)).toEqual([]);
    expect(transformSheet({})).toEqual([]);
  });

  it('should sanitize mixed-type header fields', () => {
    const rows = [[null, 'DOB', 123, 'NHI'], ['val1', '1990-01-01', 'test', 'ZZ001']];
    const result = transformSheet(rows);
    expect(result[0]).toEqual(['Age', 123, 'ID']); // matches raw header values that passed validation
  });
});
