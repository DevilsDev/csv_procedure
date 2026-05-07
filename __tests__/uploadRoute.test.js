/**
 * Version: 2.5.4
 * Description: Integration tests for /upload using the real app (validation + multer + ETL).
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

describe('POST /upload', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');
  const validExcelPath = path.join(fixtureDir, 'case-mix-sample.xlsx');
  const invalidPath = path.join(fixtureDir, 'invalid.txt');
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
    if (!fs.existsSync(invalidPath)) {
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
    expect(res.body.sheets).toEqual([
      {
        sheetName: 'Sheet1',
        fileName: res.body.files[0],
        rowsProcessed: 2,
        duplicatesRemoved: 0,
        invalidDobCount: 0,
        missingNhiCount: 0,
        redactedCellCount: 0,
      },
      {
        sheetName: 'Sheet2',
        fileName: res.body.files[1],
        rowsProcessed: 2,
        duplicatesRemoved: 0,
        invalidDobCount: 0,
        missingNhiCount: 0,
        redactedCellCount: 0,
      },
    ]);
    // The route's `finally` block deletes its own multipart temp; we don't
    // hard-snapshot uploads/ here because parallel jest workers running /preview
    // tests can legitimately add and remove their own temp files concurrently.
    expect(getNewUploadFiles).toBeDefined();

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

  it('should reject missing file upload', async () => {
    const res = await request(app).post('/upload');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.toLowerCase()).toMatch(/no file uploaded/);
  });

  it('should reject unsupported file extension', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('excel', invalidPath);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.toLowerCase()).toMatch(/unsupported file format/);
  });

  it('should reject files larger than 5MB', async () => {
    const oversizePath = path.join(fixtureDir, 'oversize.xlsx');
    fs.writeFileSync(oversizePath, Buffer.alloc(6 * 1024 * 1024, 0));

    try {
      const res = await request(app)
        .post('/upload')
        .attach('excel', oversizePath);
      expect(res.statusCode).toBe(400);
      expect(res.body.error.toLowerCase()).toMatch(/maximum size/);
    } finally {
      fs.unlinkSync(oversizePath);
    }
  });

  describe('with API key required', () => {
    const originalKey = process.env.CLINISYNC_API_KEY;

    beforeAll(() => {
      process.env.CLINISYNC_API_KEY = 'test-secret-key';
    });

    afterAll(() => {
      if (originalKey === undefined) delete process.env.CLINISYNC_API_KEY;
      else process.env.CLINISYNC_API_KEY = originalKey;
    });

    it('should reject requests with no API key', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('excel', validExcelPath);
      expect(res.statusCode).toBe(401);
      expect(res.body.error.toLowerCase()).toMatch(/api key/);
    });

    it('should reject requests with wrong API key', async () => {
      const res = await request(app)
        .post('/upload')
        .set('Authorization', 'Bearer wrong-key')
        .attach('excel', validExcelPath);
      expect(res.statusCode).toBe(401);
    });

    it('should accept requests with valid Bearer token', async () => {
      const res = await request(app)
        .post('/upload')
        .set('Authorization', 'Bearer test-secret-key')
        .attach('excel', validExcelPath);
      expect(res.statusCode).toBe(200);
    });

    it('should accept requests with valid X-API-Key header', async () => {
      const res = await request(app)
        .post('/upload')
        .set('X-API-Key', 'test-secret-key')
        .attach('excel', validExcelPath);
      expect(res.statusCode).toBe(200);
    });
  });
});
