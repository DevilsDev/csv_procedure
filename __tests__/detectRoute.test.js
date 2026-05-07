/**
 * Version: 2.7.5
 * Description: Integration tests for POST /detect — same auth + validation gates
 *              as /upload + /preview, returns the detection report inline.
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

describe('POST /detect', () => {
  const fixtureDir = path.resolve(__dirname, 'fixtures');
  const validExcelPath = path.join(fixtureDir, 'case-mix-sample.xlsx');
  const invalidPath = path.join(fixtureDir, 'invalid.txt');

  beforeAll(() => {
    generateAllFixtures();
    if (!fs.existsSync(validExcelPath)) throw new Error('Missing fixture');
  });

  it('returns detections + a runnable suggested rule set', async () => {
    const res = await request(app).post('/detect').attach('excel', validExcelPath);

    expect(res.statusCode).toBe(200);
    expect(res.body.dryRun).toBe(true);
    expect(res.body.sheetsScanned).toBeGreaterThan(0);
    expect(Array.isArray(res.body.columns)).toBe(true);
    expect(res.body.summary).toEqual(expect.objectContaining({
      directIdentifiers: expect.any(Number),
      quasiIdentifiers: expect.any(Number),
    }));
    // Suggested rule set is shaped like a real rule set.
    expect(res.body.suggestedRuleSet).toEqual(expect.objectContaining({
      version: '1',
      rules: expect.any(Array),
    }));
    // Hygienic rules always tail-appended.
    const tail = res.body.suggestedRuleSet.rules.slice(-2);
    expect(tail[0].match).toEqual({ empty: true });
    expect(tail[1].match).toEqual({ startsWith: 'column' });
  });

  it('rejects missing file with 400', async () => {
    const res = await request(app).post('/detect');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.toLowerCase()).toMatch(/no file uploaded/);
  });

  it('rejects unsupported extension via the same allowlist as /upload', async () => {
    const res = await request(app).post('/detect').attach('excel', invalidPath);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.toLowerCase()).toMatch(/unsupported file format/);
  });

  describe('with API key required', () => {
    const originalKey = process.env.CLINISYNC_API_KEY;
    beforeAll(() => { process.env.CLINISYNC_API_KEY = 'detect-test-key'; });
    afterAll(() => {
      if (originalKey === undefined) delete process.env.CLINISYNC_API_KEY;
      else process.env.CLINISYNC_API_KEY = originalKey;
    });

    it('rejects without API key', async () => {
      const res = await request(app).post('/detect').attach('excel', validExcelPath);
      expect(res.statusCode).toBe(401);
    });

    it('accepts with valid Bearer token', async () => {
      const res = await request(app)
        .post('/detect')
        .set('Authorization', 'Bearer detect-test-key')
        .attach('excel', validExcelPath);
      expect(res.statusCode).toBe(200);
    });
  });
});
