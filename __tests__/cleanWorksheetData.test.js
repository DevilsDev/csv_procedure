/**
 * Version: 2.0.0
 * Description: Unit tests for cleanWorksheetData utility using mocked file types.
 * Author: Ali Kahwaji
 */

const cleanWorksheetData = require('../src/utils/cleanWorksheetData');

describe('cleanWorksheetData()', () => {
  it('should remove empty rows, duplicate columns, and unnamed columns', () => {
    const input = [
      ['NHI', 'Address', 'Contact', 'Column1', 'NHI'],
      ['A12345', '123 Street', '1234567890', '', 'A12345'],
      ['', '', '', '', ''],
      ['A12345', '123 Street', '1234567890', '', 'A12345'],
    ];

    const output = cleanWorksheetData(input, 'Case-mix');
    const headers = output[0];
    const data = output.slice(1);

    expect(headers).toContain('ID');
    expect(headers).not.toContain('Column1');
    expect(headers).not.toContain('Contact');
    expect(headers).not.toContain('Address');
    expect(data.length).toBe(1);
  });

  it('should convert DOB to Age if valid', () => {
    const input = [
      ['NHI', 'DOB'],
      ['B67890', '1990-01-01'],
      ['C54321', '01/01/1980'],
    ];

    const output = cleanWorksheetData(input, 'Fare-up');
    const headers = output[0];
    const rows = output.slice(1);

    expect(headers).toContain('ID');
    expect(headers).toContain('Age');
    expect(rows[0][1]).toMatch(/\d+/); // Age should be a number
    expect(rows[1][1]).toMatch(/\d+/);
  });

  it('should preserve custom columns for Holistic and remove NHI', () => {
    const input = [
      ['NHI', 'Dietician (12 months)', 'Fatigue (12 months)'],
      ['Z98765', 'Yes', 'No'],
    ];

    const output = cleanWorksheetData(input, 'Holistic');
    const headers = output[0];
    const row = output[1];

    expect(headers).toContain('ID');
    expect(headers).not.toContain('NHI');
    expect(row[0]).toMatch(/^ID-\d{3}$/);
  });

  it('should return empty array for invalid input', () => {
    const output = cleanWorksheetData([], 'Outpatient');
    expect(output).toEqual([]);
  });
});
