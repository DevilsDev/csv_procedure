/**
 * Version: 2.7.4
 * Description: Integration tests for POST /preview — same auth + validation gates as
 *              /upload, but no files written, response includes inline previewRows.
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

describe('POST /preview', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');
  const validExcelPath = path.join(fixtureDir, 'case-mix-sample.xlsx');
  const invalidPath = path.join(fixtureDir, 'invalid.txt');
  const csvDir = path.resolve('csvs');

  function listCsvFiles() {
    if (!fs.existsSync(csvDir)) return new Set();
    return new Set(fs.readdirSync(csvDir));
  }

  beforeAll(() => {
    generateAllFixtures();
    if (!fs.existsSync(validExcelPath)) throw new Error('Missing fixture: case-mix-sample.xlsx');
  });

  it('returns the cleaned per-sheet stats and inline preview rows', async () => {
    const res = await request(app).post('/preview').attach('excel', validExcelPath);

    expect(res.statusCode).toBe(200);
    expect(res.body.dryRun).toBe(true);
    expect(res.body.sheetsProcessed).toBe(2);
    expect(res.body.rowsProcessed).toBe(4);
    expect(res.body.previewLimit).toBeGreaterThan(0);
    expect(Array.isArray(res.body.sheets)).toBe(true);
    expect(res.body.sheets).toHaveLength(2);

    // The contract: no `files` and no `manifest` in the response — nothing was
    // persisted from this request. (We deliberately don't snapshot the csvs/
    // directory here because parallel jest workers running /upload tests can
    // legitimately add files there during this assertion's lifetime.)
    expect(res.body.files).toBeUndefined();
    expect(res.body.manifest).toBeUndefined();

    for (const sheet of res.body.sheets) {
      expect(Array.isArray(sheet.previewRows)).toBe(true);
      expect(sheet.previewRows.length).toBeGreaterThan(0);
      expect(sheet.previewRows[0]).toEqual(expect.arrayContaining(['ID', 'Age']));
      expect(sheet.previewMeta).toEqual(expect.objectContaining({
        totalDataRows: expect.any(Number),
        previewedDataRows: expect.any(Number),
        truncated: expect.any(Boolean),
      }));
    }
  });

  it('rejects missing file with 400', async () => {
    const res = await request(app).post('/preview');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.toLowerCase()).toMatch(/no file uploaded/);
  });

  it('rejects unsupported extension via the same allowlist as /upload', async () => {
    const res = await request(app).post('/preview').attach('excel', invalidPath);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.toLowerCase()).toMatch(/unsupported file format/);
  });

  describe('with API key required', () => {
    const originalKey = process.env.CLINISYNC_API_KEY;
    beforeAll(() => { process.env.CLINISYNC_API_KEY = 'preview-test-key'; });
    afterAll(() => {
      if (originalKey === undefined) delete process.env.CLINISYNC_API_KEY;
      else process.env.CLINISYNC_API_KEY = originalKey;
    });

    it('rejects without API key', async () => {
      const res = await request(app).post('/preview').attach('excel', validExcelPath);
      expect(res.statusCode).toBe(401);
    });

    it('accepts with valid Bearer token', async () => {
      const res = await request(app)
        .post('/preview')
        .set('Authorization', 'Bearer preview-test-key')
        .attach('excel', validExcelPath);
      expect(res.statusCode).toBe(200);
      expect(res.body.dryRun).toBe(true);
    });
  });
});
