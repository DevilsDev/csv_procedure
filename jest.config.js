/**
 * Version: 1.2.1
 * Description: Central Jest configuration for csv_procedure with global setup
 * Author: Ali Kahwaji
 */

const path = require('path');

module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  globalSetup: path.resolve(__dirname, 'scripts/jest.globalSetup.js'), // ✅ fixed path
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/uploads/',
    '/csvs/',
    '__tests__/fixtures/',
  ],
  clearMocks: true,
  resetMocks: true,
  verbose: true,
};
