/**
 * jest.config.js
 * Version: 2.5.1
 * Description: Clean and strict Jest configuration with full coverage and edge-case handling
 * Author: Ali Kahwaji
 */

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'], // Optional: if you need global mocks or polyfills
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/fixtures/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/uploads/',
    '/csvs/',
    '__tests__/fixtures/'
  ],
  clearMocks: true,
  resetMocks: true
};
