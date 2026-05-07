/**
 * Version: 2.5.9
 * Description: One-shot generator for the demo workbook served at /samples/case-mix-sample.xlsx.
 *              The dataset is intentionally fictitious and crafted to exercise every cleaning
 *              rule: a duplicate row, an invalid DOB, a missing NHI, a row with numeric 0,
 *              and a column ('Column 4') that should be dropped as unnamed.
 *
 *              Run with: node scripts/generate-public-sample.js
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const OUTPUT = path.resolve(__dirname, '..', 'public', 'samples', 'case-mix-sample.xlsx');

const SHEETS = [
  {
    name: 'PreOp',
    rows: [
      ['Name', 'NHI', 'DOB', 'Address', 'Contact', 'Weight', 'Height', 'Column 4'],
      ['Anna Singh', 'NHI-1001', '1968-03-15', '12 Queen St', '021-555-0101', 78, 165, 'x'],
      ['Brian Tan', 'NHI-1002', '1992-07-22', '34 King Rd', '021-555-0102', 85, 178, 'x'],
      ['Carla Mendes', 'NHI-1003', '1981-11-30', '56 Park Ln', '021-555-0103', 62, 160, 'x'],
      // exact duplicate of the Anna row -> should collapse, duplicatesRemoved += 1
      ['Anna Singh', 'NHI-1001', '1968-03-15', '12 Queen St', '021-555-0101', 78, 165, 'x'],
      ['David O\'Brien', 'NHI-1004', '1975-09-08', '78 Hill Ave', '021-555-0104', 92, 182, 'x'],
      ['Eva Wong', 'NHI-1005', '1989-04-12', '90 River Rd', '021-555-0105', 55, 158, 'x'],
    ],
  },
  {
    name: 'Surgery',
    rows: [
      ['NHI', 'DOB', 'Procedure', 'Duration_minutes', 'Surgeon', 'Address', 'Contact'],
      ['NHI-1001', '1968-03-15', 'Knee replacement', 95, 'Dr. Lee', '12 Queen St', '021-555-0101'],
      ['NHI-1002', '1992-07-22', 'Appendectomy', 42, 'Dr. Patel', '34 King Rd', '021-555-0102'],
      ['NHI-1003', '1981-11-30', 'Cholecystectomy', 68, 'Dr. Lee', '56 Park Ln', '021-555-0103'],
      // Missing NHI -> missingNhiCount += 1, ID cell becomes empty
      ['', '1975-09-08', 'Hernia repair', 51, 'Dr. Patel', '78 Hill Ave', '021-555-0104'],
      // Invalid DOB -> invalidDobCount += 1, Age cell becomes empty
      ['NHI-1005', 'unknown', 'Tonsillectomy', 35, 'Dr. Kim', '90 River Rd', '021-555-0105'],
    ],
  },
  {
    name: 'Recovery',
    rows: [
      ['NHI', 'DOB', 'Day_post_op', 'Pain_score', 'Mobility_score', 'Notes'],
      ['NHI-1001', '1968-03-15', 1, 6, 2, 'Stable'],
      ['NHI-1001', '1968-03-15', 2, 4, 4, 'Improving'],
      ['NHI-1002', '1992-07-22', 1, 3, 6, 'Discharged'],
      ['NHI-1003', '1981-11-30', 1, 5, 3, 'Stable'],
      // Numeric 0 in Pain_score should be preserved (not treated as a blank row)
      ['NHI-1003', '1981-11-30', 2, 0, 7, 'Discharged'],
    ],
  },
];

function build() {
  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const workbook = xlsx.utils.book_new();
  for (const sheet of SHEETS) {
    const worksheet = xlsx.utils.aoa_to_sheet(sheet.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  xlsx.writeFile(workbook, OUTPUT);
  console.log(`wrote ${path.relative(process.cwd(), OUTPUT)}`);
}

build();
