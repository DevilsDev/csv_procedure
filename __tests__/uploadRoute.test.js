/**
 * Version: 2.7.1
 * Description: Full upload route integration test with fixture regeneration and corrected response expectations
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fileUploadRoute = require('../src/routes/fileUpload');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use('/upload', upload.single('excel'), fileUploadRoute);

describe('POST /upload', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');
  const validExcelPath = path.join(fixtureDir, 'case-mix-sample.xlsx');
  const invalidTxtPath = path.join(fixtureDir, 'invalid.txt');

  beforeAll(() => {
    generateAllFixtures();

    console.log('📁 Checking fixture path:', fixtureDir);
    console.log('📄 Valid Excel Exists:', fs.existsSync(validExcelPath));
    console.log('📄 Invalid TXT Exists:', fs.existsSync(invalidTxtPath));

    if (!fs.existsSync(validExcelPath)) {
      throw new Error('❌ Valid fixture missing: case-mix-sample.xlsx');
    }
    if (!fs.existsSync(invalidTxtPath)) {
      throw new Error('❌ Invalid fixture missing: invalid.txt');
    }
  });

  it('should return JSON with output CSV files for valid Excel upload', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('excel', validExcelPath);

    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');

    // ✅ Updated to match actual response key
    expect(res.body).toHaveProperty('files');
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBeGreaterThan(0);
  });

  it('should reject unsupported file types (e.g., .txt)', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('excel', invalidTxtPath);

    expect(res.statusCode).toBe(400);
    expect(res.text.toLowerCase()).toMatch(/unsupported file format/);
  });

  it('should reject missing file upload', async () => {
    const res = await request(app).post('/upload');
    expect(res.statusCode).toBe(400);
    expect(res.text.toLowerCase()).toMatch(/no file uploaded/);
  });

  it('should reject oversized file (> 5MB)', async () => {
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const res = await request(app)
      .post('/upload')
      .attach('excel', oversizedBuffer, {
        filename: 'oversized.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(res.statusCode).toBe(400);
    const errorMsg = res.text || JSON.stringify(res.body);

    // ✅ Match updated error wording
    expect(errorMsg.toLowerCase()).toMatch(/file exceeds the maximum size/i);
  });
});
