/**
 * Version: 2.4.0
 * Description: Unit tests for cleanWorksheetData() function to validate data anonymization and cleaning.
 * Author: Ali Kahwaji
 */

const cleanWorksheetData = require('../src/utils/cleanWorkSheetData');

describe('cleanWorksheetData()', () => {
  it('should return cleaned data with anonymized IDs and calculated ages', () => {
    const input = [
      ['Name', 'NHI', 'DOB', 'Contact', 'Address'],
      ['Ali', 'ABC1234', '1990-01-01', '021-1234567', '123 Main St'],
      ['Sara', 'XYZ5678', '1985-06-15', '021-9876543', '456 Elm St']
    ];

    const result = cleanWorksheetData(input);

    expect(result[0]).toEqual(['Name', 'ID', 'Age']); // Headers
    expect(result[1][0]).toBe('Ali');
    expect(result[1][1]).toMatch(/^ID-\d{3}$/);
    expect(typeof result[1][2]).toBe('number');
  });

  it('should remove unnamed columns and rows with all empty cells', () => {
    const input = [
      ['Column A', 'Name', '', 'NHI'],
      ['', '', '', ''],
      ['ColA data', 'Ali', '', 'NHI123']
    ];

    const result = cleanWorksheetData(input);
    expect(result[0]).toEqual(['Name', 'ID']);
    expect(result.length).toBe(2); // 1 header + 1 valid row
  });

  it('should return empty array for null or non-array input', () => {
    expect(cleanWorksheetData(null)).toEqual([]);
    expect(cleanWorksheetData(undefined)).toEqual([]);
    expect(cleanWorksheetData({})).toEqual([]);
  });

  it('should not duplicate identical rows after transformation', () => {
    const input = [
      ['Name', 'NHI', 'DOB'],
      ['Ali', 'ABC123', '1990-01-01'],
      ['Ali', 'ABC123', '1990-01-01']
    ];

    const result = cleanWorksheetData(input);
    expect(result.length).toBe(2); // 1 header + 1 unique row
  });

  it('should replace invalid DOB with empty Age', () => {
    const input = [
      ['Name', 'NHI', 'DOB'],
      ['Ali', 'ABC123', 'invalid-date']
    ];

    const result = cleanWorksheetData(input);
    expect(result[1][2]).toBe('');
  });
});
