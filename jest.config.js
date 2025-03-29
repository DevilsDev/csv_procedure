/**
 * Version: 1.2.1
 * Description: Central Jest configuration for csv_procedure with global setup
 * Author: Ali Kahwaji
 */

module.exports = {
  testEnvironment: 'node',
  rootDir: './',
  globalSetup: '<rootDir>/jest.globalSetup.js', // ✅ Use <rootDir> prefix
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/uploads/',
    '/csvs/',
    '__tests__/fixtures/',
  ],
  clearMocks: true,
  resetMocks: true,
};
