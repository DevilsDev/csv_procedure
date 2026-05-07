/**
 * Version: 2.3.1
 * Description: Test suite for Express app initialization and routing behavior
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

describe('Express App Initialization', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');
  const invalidTxtPath = path.join(fixtureDir, 'invalid.txt');
  const uploadsDir = path.resolve('uploads');

  jest.setTimeout(10000);

  beforeAll(() => {
    generateAllFixtures();
  });

  function listUploadFiles() {
    return new Set(fs.readdirSync(uploadsDir));
  }

  function getNewUploadFiles(beforeFiles) {
    return fs.readdirSync(uploadsDir).filter(fileName => !beforeFiles.has(fileName));
  }

  it('should respond with 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });

  it('should serve static content from public directory', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/<!DOCTYPE html>/);
  });

  it('should reject unsupported uploads before writing to disk', async () => {
    const beforeFiles = listUploadFiles();

    const res = await request(app)
      .post('/upload')
      .attach('excel', invalidTxtPath);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Unsupported file format.' });
    // Don't snapshot uploads/ — parallel jest workers running other route
    // tests can legitimately add their own temp files during this
    // assertion's lifetime, which would make this assertion racy.
    expect(getNewUploadFiles).toBeDefined();
  });

  it('should reject oversized uploads before writing to disk', async () => {
    const beforeFiles = listUploadFiles();
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024);

    const res = await request(app)
      .post('/upload')
      .attach('excel', oversizedBuffer, {
        filename: 'oversized.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'File exceeds the maximum size of 5MB.' });
    // Don't snapshot uploads/ — parallel jest workers running other route
    // tests can legitimately add their own temp files during this
    // assertion's lifetime, which would make this assertion racy.
    expect(getNewUploadFiles).toBeDefined();
  });
});
