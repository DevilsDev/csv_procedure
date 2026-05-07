/**
 * Version: 2.5.9
 * Description: Integration tests for GET /downloads/:filename — happy path, traversal
 *              defense, missing-file, content-type, and auth gate.
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

const CSVS_DIR = path.resolve(__dirname, '..', 'csvs');

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function placeFile(filename, contents) {
  if (!fs.existsSync(CSVS_DIR)) fs.mkdirSync(CSVS_DIR, { recursive: true });
  const fullPath = path.join(CSVS_DIR, filename);
  fs.writeFileSync(fullPath, contents);
  return fullPath;
}

describe('GET /downloads/:filename', () => {
  const placedFiles = [];

  function place(filename, contents) {
    placedFiles.push(placeFile(filename, contents));
  }

  afterAll(() => {
    placedFiles.forEach(p => {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    });
  });

  it('returns the CSV with the right content-type and disposition', async () => {
    const name = `converted-sample-${uniqueSuffix().replace('-', '-1-')}-sheet1.csv`.replace(/[^a-z0-9.\-_]/g, '_');
    // Build a valid filename matching the SAFE_FILENAME pattern manually:
    const valid = `converted-sample-1700000001000-1-sheet1.csv`;
    place(valid, 'Header1,Header2\nfoo,bar\n');

    const res = await request(app).get(`/downloads/${valid}`);
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.header['content-disposition']).toContain(`filename="${valid}"`);
    expect(res.text).toContain('Header1,Header2');
  });

  it('returns the manifest JSON with application/json content-type', async () => {
    const valid = 'manifest-sample-1700000002000-2.json';
    place(valid, JSON.stringify({ ok: true }));

    const res = await request(app).get(`/downloads/${valid}`);
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 404 when the file does not exist (or has been swept)', async () => {
    const res = await request(app).get('/downloads/converted-sample-1700000003000-3-ghost.csv');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('rejects path traversal attempts with 400', async () => {
    const res = await request(app).get('/downloads/..%2F..%2Fpackage.json');
    expect(res.statusCode).toBe(400);
  });

  it('rejects filenames that do not match the generated pattern', async () => {
    const cases = [
      'arbitrary.csv',
      'CONVERTED-uppercase-1-1.csv',
      'converted-sample-noTimestamp.csv',
      'converted-sample-123-456.txt',
      'converted-sample-123-456-../etc.csv',
    ];

    for (const bad of cases) {
      const res = await request(app).get(`/downloads/${encodeURIComponent(bad)}`);
      expect(res.statusCode).toBe(400);
    }
  });

  describe('with API key required', () => {
    const originalKey = process.env.CLINISYNC_API_KEY;
    const valid = 'converted-sample-1700000004000-4-sheet1.csv';

    beforeAll(() => {
      process.env.CLINISYNC_API_KEY = 'test-secret-key';
      placedFiles.push(placeFile(valid, 'Header1,Header2\nfoo,bar\n'));
    });

    afterAll(() => {
      if (originalKey === undefined) delete process.env.CLINISYNC_API_KEY;
      else process.env.CLINISYNC_API_KEY = originalKey;
    });

    it('rejects without API key', async () => {
      const res = await request(app).get(`/downloads/${valid}`);
      expect(res.statusCode).toBe(401);
    });

    it('accepts with valid Bearer token', async () => {
      const res = await request(app)
        .get(`/downloads/${valid}`)
        .set('Authorization', 'Bearer test-secret-key');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Header1,Header2');
    });
  });
});
