/**
 * Version: 2.5.4
 * Description: Idempotent project bootstrap. Ensures runtime folders exist and regenerates test fixtures.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIRS = ['uploads', 'csvs', '__tests__/fixtures'];

function ensureDir(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`created  ${relPath}`);
  } else {
    console.log(`exists   ${relPath}`);
  }
}

function main() {
  RUNTIME_DIRS.forEach(ensureDir);
  generateAllFixtures();
  console.log('setup complete');
}

main();
