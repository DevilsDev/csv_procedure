/**
 * Version: 1.0.0
 * Description: Unit tests for transformSheet function in transform.js.
 * Author: Ali Kahwaji
 */

const { transformSheet } = require('../src/etl/transform');
const { resetIdMap } = require('../src/etl/idMapper');

describe('transformSheet()', () => {
  beforeEach(() => {
    resetIdMap();
  });

  it('should sanitize headers and transform NHI to ID, DOB to Age', () => {
    const rows = [
      ['NHI', 'DOB', 'Contact', 'Weight'],
      ['AB123', '1990-01-01', '123456', 72],
      ['AB123', '1990-01-01', '123456', 72], // duplicate row
      ['CD456', '1985-06-15', '789012', 68]
    ];

    const result = transformSheet(rows);
    expect(result[0]).toEqual(['ID', 'Age', 'Weight']);
    expect(result.length).toBe(3); // 1 header + 2 unique rows
    expect(result[1][0]).toBe('ID-001');
    expect(result[2][0]).toBe('ID-002');
    expect(typeof result[1][1]).toBe('number'); // age
  });

  it('should skip empty rows and unnamed columns', () => {
    const rows = [
      ['NHI', '', 'DOB', 'Contact', ''],
      ['XY999', '', '2000-12-31', '555555', ''],
      [],
      ['', '', '', '', '']
    ];
    const result = transformSheet(rows);
    expect(result[0]).toEqual(['ID', 'Age']);
    expect(result.length).toBe(2); // 1 header + 1 row
  });
});
