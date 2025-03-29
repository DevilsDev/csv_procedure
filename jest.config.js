/**
 * Version: 1.1.0
 * Description: Central Jest configuration for csv_procedure project with environment setup
 * Author: Ali Kahwaji
 */

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
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
};
