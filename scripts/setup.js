/**
 * Version: 2.5.4
 * Description: Idempotent project bootstrap. Ensures runtime folders exist and regenerates test fixtures.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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

function ensurePublicSample() {
  const samplePath = path.join(ROOT, 'public', 'samples', 'case-mix-sample.xlsx');
  if (fs.existsSync(samplePath)) {
    console.log('exists   public/samples/case-mix-sample.xlsx');
    return;
  }
  execFileSync(process.execPath, [path.join(__dirname, 'generate-public-sample.js')], { stdio: 'inherit' });
}

function main() {
  RUNTIME_DIRS.forEach(ensureDir);
  generateAllFixtures();
  ensurePublicSample();
  console.log('setup complete');
}

main();
