/**
 * Version: 1.1.0
 * Description: Central Jest configuration for csv_procedure project with environment setup
 * Author: Ali Kahwaji
 */

module.exports = {
  testEnvironment: 'jsdom', // Enables DOM APIs for frontend tests
  setupFiles: ['<rootDir>/jest.setup.js'], // Polyfills and global setup
  testMatch: ['**/__tests__/**/*.test.js'], // All test files
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/uploads/',
    '/csvs/',
  ],
  clearMocks: true,
  resetMocks: true,
  globals: {},
  transform: {},
};
