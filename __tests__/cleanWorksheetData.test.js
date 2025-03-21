/**
 * Version: 1.1.0
 * Description: Unit tests for cleanWorksheetData utility including sensitive data scrubbing.
 * Author: Ali Kahwaji
 */

const cleanWorksheetData = require('../src/utils/cleanWorksheetData');

describe('cleanWorksheetData', () => {
  it('removes empty rows', () => {
    const input = [
      ['Name', 'Age'],
      ['John', 30],
      ['', ''],
      ['Jane', 28]
    ];

    const result = cleanWorksheetData(input);

    expect(result.length).toBe(3); // One empty row removed
  });

  it('trims whitespace in string cells', () => {
    const input = [
      [' Name ', ' Age '],
      [' John ', ' 30 ']
    ];

    const result = cleanWorksheetData(input);

    expect(result[0][0]).toBe('Name');
    expect(result[1][0]).toBe('John');
  });

  it('removes duplicate header rows', () => {
    const input = [
      ['Name', 'Age'],
      ['Name', 'Age'],
      ['Jane', 22]
    ];

    const result = cleanWorksheetData(input);

    expect(result.length).toBe(2);
    expect(result[1][0]).toBe('Jane');
  });

  it('returns empty array if input is not valid', () => {
    expect(cleanWorksheetData(null)).toEqual([]);
    expect(cleanWorksheetData({})).toEqual([]);
  });

  it('removes sensitive data based on headers', () => {
    const input = [
      ['Name', 'Age', 'Email', 'Phone'],
      ['John Doe', 32, 'john@example.com', '123-456-7890'],
      ['Jane Smith', 27, 'jane@example.com', '098-765-4321']
    ];

    const result = cleanWorksheetData(input);

    expect(result[1][0]).toBe(''); // Name removed
    expect(result[1][2]).toBe(''); // Email removed
    expect(result[1][3]).toBe(''); // Phone removed
  });

  it('removes sensitive date of birth in various formats', () => {
    const input = [
      ['Name', 'DOB', 'Age'],
      ['John', '01/01/1990', 30],
      ['Jane', '1995-05-12', 28],
      ['Mike', 'May 5, 1985', 39]
    ];

    const result = cleanWorksheetData(input);

    expect(result[1][1]).toBe('');
    expect(result[2][1]).toBe('');
    expect(result[3][1]).toBe('');
  });

  it('removes inferred date cells not labeled as DOB but containing dates', () => {
    const input = [
      ['Patient', 'Birth Date'],
      ['Ali', '12-12-1990'],
      ['Zara', '1990/01/01']
    ];

    const result = cleanWorksheetData(input);
    expect(result[1][1]).toBe('');
    expect(result[2][1]).toBe('');
  });

  it('does not remove non-sensitive cells', () => {
    const input = [
      ['PatientID', 'Age', 'Condition'],
      ['P001', 45, 'Diabetes'],
      ['P002', 50, 'Hypertension']
    ];

    const result = cleanWorksheetData(input);

    expect(result[1][0]).toBe('P001');
    expect(result[2][2]).toBe('Hypertension');
  });
});
