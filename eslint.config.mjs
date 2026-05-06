/**
 * Version: 2.1.0
 * Description: ESLint 9+ flat config for csv_procedure with CommonJS + browser globals support.
 * Author: Ali Kahwaji
 */

import js from '@eslint/js';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script', // allow require/module.exports
      globals: {
        require: true,
        module: true,
        __dirname: true,
        process: true,
        alert: true,
        fetch: true,
        FormData: true
      }
    },
    plugins: {
      js
    },
    rules: {
      ...js.configs.recommended.rules,
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'no-unused-vars': ['warn'],
      'no-console': 'off',
      'no-undef': 'off' // optional: suppress undefined globals in hybrid mode
    }
  }
];
