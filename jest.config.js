/**
 * Script: setup.js
 * Purpose: Prepares test environment (fixtures, folders) before test or CI
 * Author: Ali Kahwaji
 * Version: 1.0.0
 */

const path = require('path');
const fs = require('fs');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

function ensureFoldersExist() {
  const requiredDirs = ['uploads', 'csvs'];

  requiredDirs.forEach((dir) => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created missing folder: ${fullPath}`);
    } else {
      console.log(`✅ Folder exists: ${fullPath}`);
    }
  });
}

function main() {
  console.log('⚙️  Running setup script...');

  ensureFoldersExist();
  generateAllFixtures();

  console.log('✅ Setup complete: directories ensured & fixtures generated.');
}

// Only run when executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
