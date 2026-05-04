/**
 * Version: 2.7.1
 * Description: Full upload route integration test with fixture regeneration and response expectations.
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
  const uploadsDir = path.resolve('uploads');
  const csvDir = path.resolve('csvs');

  function listUploadFiles() {
    return new Set(fs.readdirSync(uploadsDir));
  }

  function getNewUploadFiles(beforeFiles) {
    return fs.readdirSync(uploadsDir).filter(fileName => !beforeFiles.has(fileName));
  }

  function listCsvFiles() {
    return new Set(fs.readdirSync(csvDir));
  }

  function getNewCsvFiles(beforeFiles) {
    return fs.readdirSync(csvDir).filter(fileName => !beforeFiles.has(fileName));
  }

  beforeAll(() => {
    generateAllFixtures();

    if (!fs.existsSync(validExcelPath)) {
      throw new Error('Valid fixture missing: case-mix-sample.xlsx');
    }

    if (!fs.existsSync(invalidTxtPath)) {
      throw new Error('Invalid fixture missing: invalid.txt');
    }
  });

  it('should return JSON with output CSV files for valid Excel upload', async () => {
    const beforeFiles = listUploadFiles();
    const beforeCsvFiles = listCsvFiles();

    const res = await request(app)
      .post('/upload')
      .attach('excel', validExcelPath);

    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body).toHaveProperty('files');
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBeGreaterThan(0);
    expect(res.body).toMatchObject({
      sheetsProcessed: 2,
      rowsProcessed: 4,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
    });
    expect(res.body.manifest).toMatch(/^manifest-case_mix_sample-\d+-\d+\.json$/);
    expect(getNewUploadFiles(beforeFiles)).toEqual([]);

    const newCsvFiles = getNewCsvFiles(beforeCsvFiles);
    expect(newCsvFiles).toEqual(expect.arrayContaining([...res.body.files, res.body.manifest]));

    const manifestPath = path.join(csvDir, res.body.manifest);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest).toMatchObject({
      sourceFileName: 'case-mix-sample.xlsx',
      sheetsProcessed: 2,
      rowsProcessed: 4,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
      files: res.body.files,
    });
    expect(manifest.sheets).toEqual([
      expect.objectContaining({
        sheetName: 'Sheet1',
        fileName: res.body.files[0],
        rowsProcessed: 2,
      }),
      expect.objectContaining({
        sheetName: 'Sheet2',
        fileName: res.body.files[1],
        rowsProcessed: 2,
      }),
    ]);
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
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024);
    const res = await request(app)
      .post('/upload')
      .attach('excel', oversizedBuffer, {
        filename: 'oversized.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(res.statusCode).toBe(400);
    const errorMsg = res.text || JSON.stringify(res.body);
    expect(errorMsg.toLowerCase()).toMatch(/file exceeds the maximum size/i);
  });
});
