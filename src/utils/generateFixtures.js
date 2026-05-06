/**
 * Version: 2.5.4
 * Description: Generates deterministic test fixtures (xlsx + invalid.txt) under __tests__/fixtures/.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const FIXTURE_DIR = path.resolve(__dirname, '../../__tests__/fixtures');

const VALID_SHEETS = [
  {
    name: 'Sheet1',
    rows: [
      ['NHI', 'DOB', 'Weight'],
      ['AB123', '1990-01-01', 72],
      ['CD456', '1985-06-15', 68],
    ],
  },
  {
    name: 'Sheet2',
    rows: [
      ['NHI', 'DOB', 'Height'],
      ['EF789', '1978-03-22', 172],
      ['GH012', '2000-11-09', 165],
    ],
  },
];

function ensureFixtureDir() {
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }
}

function writeValidWorkbook() {
  const workbook = xlsx.utils.book_new();
  for (const sheet of VALID_SHEETS) {
    const worksheet = xlsx.utils.aoa_to_sheet(sheet.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  const outputPath = path.join(FIXTURE_DIR, 'case-mix-sample.xlsx');
  xlsx.writeFile(workbook, outputPath);
  return outputPath;
}

function writeInvalidFile() {
  const outputPath = path.join(FIXTURE_DIR, 'invalid.txt');
  fs.writeFileSync(outputPath, 'This is not a spreadsheet.\n');
  return outputPath;
}

function generateAllFixtures() {
  ensureFixtureDir();
  const xlsxPath = writeValidWorkbook();
  const txtPath = writeInvalidFile();
  return { xlsxPath, txtPath };
}

if (require.main === module) {
  const { xlsxPath, txtPath } = generateAllFixtures();
  console.log(`fixture: ${path.relative(process.cwd(), xlsxPath)}`);
  console.log(`fixture: ${path.relative(process.cwd(), txtPath)}`);
}

module.exports = { generateAllFixtures };
