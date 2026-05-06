#!/usr/bin/env node
/**
 * Version: 0.1.0
 * CLI entry point for Clinisync project
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');

const version = fs.readFileSync(path.resolve(__dirname, '../VERSION'), 'utf-8').trim();

console.log(`\nClinisync CLI v${version}\n`);
console.log('Usage: npm run dev OR POST /upload with Excel files');
console.log('More CLI commands coming soon...\n');
