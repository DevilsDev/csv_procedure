/**
 * Version: 2.5.7
 * Description: Unit tests for virusScan middleware with injected fake scanners.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const virusScan = require('../src/middleware/virusScan');

function makeReq(filePath) {
  return filePath
    ? { file: { path: filePath, originalname: path.basename(filePath) } }
    : {};
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return res;
}

function makeTempFile() {
  const filePath = path.join(os.tmpdir(), `vscan-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  fs.writeFileSync(filePath, 'pretend payload');
  return filePath;
}

describe('virusScan middleware', () => {
  it('passes through when there is no uploaded file', async () => {
    const middleware = virusScan({ scanFile: jest.fn() });
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('passes through when scanner reports clean', async () => {
    const filePath = makeTempFile();
    const middleware = virusScan({ scanFile: async () => ({ clean: true }) });
    const req = makeReq(filePath);
    const res = makeRes();
    const next = jest.fn();

    try {
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(filePath)).toBe(true);
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  it('rejects with 422 and removes the file when infected', async () => {
    const filePath = makeTempFile();
    const middleware = virusScan({
      scanFile: async () => ({ clean: false, viruses: ['Eicar-Test-Signature'] }),
    });
    const req = makeReq(filePath);
    const res = makeRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({ error: 'Upload rejected: malware detected.' });
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('rejects with 503 and removes the file when scanner errors', async () => {
    const filePath = makeTempFile();
    const middleware = virusScan({
      scanFile: async () => { throw new Error('clamd unreachable'); },
    });
    const req = makeReq(filePath);
    const res = makeRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/scan/i);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('default scanner is a noop and warns once', async () => {
    const noop = virusScan.createNoopScanner();
    const result1 = await noop.scanFile('/tmp/anything');
    const result2 = await noop.scanFile('/tmp/anything-else');
    expect(result1).toEqual({ clean: true });
    expect(result2).toEqual({ clean: true });
  });
});
