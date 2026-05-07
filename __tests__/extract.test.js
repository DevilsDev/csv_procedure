/**
 * Version: 2.5.0
 * Description: Unit tests for extractSheets() function in extract.js
 * Author: Ali Kahwaji
 */

const { extractSheets } = require('../src/etl/extract');

describe('extractSheets()', () => {
  it('should return an array of worksheet data from a valid workbook object', () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1', 'Sheet2'],
      Sheets: {
        Sheet1: [['Name', 'Age'], ['Ali', '30']],
        Sheet2: [['City', 'Country'], ['Paris', 'France']]
      }
    };

    const xlsx = require('xlsx');
    jest.spyOn(xlsx, 'readFile').mockReturnValue(mockWorkbook);
    jest.spyOn(xlsx.utils, 'sheet_to_json').mockImplementation(() => [['Header1'], ['Value1']]);

    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = extractSheets('dummy/path.xlsx');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('should return an empty array if no sheets exist', () => {
    const mockWorkbook = {
      SheetNames: [],
      Sheets: {}
    };

    const xlsx = require('xlsx');
    jest.spyOn(xlsx, 'readFile').mockReturnValue(mockWorkbook);

    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = extractSheets('dummy/path.xlsx');

    expect(result).toEqual([]);
  });
});
