/**
 * Version: 1.1.0
 * Description: Central Jest configuration for csv_procedure project with environment setup
 * Author: Ali Kahwaji
 */

const path = require('path');

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  globalSetup: './jest.global-setup.js', 
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/uploads/',
    '/csvs/',
    '__tests__/fixtures/'
  ],
  clearMocks: true,
  resetMocks: true,
};
