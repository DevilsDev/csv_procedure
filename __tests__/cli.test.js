/**
 * Version: 2.7.4
 * Description: Tests for bin/clinisync.js — exercises the CLI as a subprocess so the
 *              actual published binary surface is what's verified.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { generateAllFixtures } = require('../src/utils/generateFixtures');

const BIN = path.resolve(__dirname, '..', 'bin', 'clinisync.js');
const FIXTURE = path.resolve(__dirname, 'fixtures', 'case-mix-sample.xlsx');

function run(args, opts) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    ...(opts || {}),
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'thresh-' + label + '-'));
}

describe('thresh CLI', () => {
  beforeAll(() => {
    generateAllFixtures();
    expect(fs.existsSync(FIXTURE)).toBe(true);
  });

  it('prints the version', () => {
    const { code, stdout } = run(['version']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^thresh \d+\.\d+\.\d+/);
  });

  it('prints help with no args', () => {
    const { code, stdout } = run([]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Usage:\s+thresh <command>/);
    expect(stdout).toMatch(/clean/);
    expect(stdout).toMatch(/preview/);
    expect(stdout).toMatch(/serve/);
  });

  it('prints command-specific help', () => {
    const { code, stdout } = run(['help', 'clean']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/thresh clean <file>/);
    expect(stdout).toMatch(/--rules/);
    expect(stdout).toMatch(/--quiet/);
  });

  it('exits 2 for unknown commands', () => {
    const { code, stderr } = run(['banana']);
    expect(code).toBe(2);
    expect(stderr.toLowerCase()).toMatch(/unknown command/);
  });

  it('clean produces CSVs + manifest in the output dir', () => {
    const out = makeTempDir('clean');
    try {
      const { code, stderr } = run(['clean', FIXTURE, '-o', out]);
      expect(code).toBe(0);
      expect(stderr).toMatch(/wrote.*manifest/);

      const written = fs.readdirSync(out);
      expect(written.some(n => /^converted-.*\.csv$/.test(n))).toBe(true);
      expect(written.some(n => /^manifest-.*\.json$/.test(n))).toBe(true);

      const manifestName = written.find(n => /^manifest-.*\.json$/.test(n));
      const manifest = JSON.parse(fs.readFileSync(path.join(out, manifestName), 'utf8'));
      expect(manifest.sheetsProcessed).toBe(2);
      expect(manifest.rowsProcessed).toBe(4);
      expect(Array.isArray(manifest.files)).toBe(true);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('clean --quiet emits a single JSON line to stdout', () => {
    const out = makeTempDir('clean-quiet');
    try {
      const { code, stdout, stderr } = run(['clean', FIXTURE, '-o', out, '--quiet']);
      expect(code).toBe(0);
      expect(stderr).toBe('');
      const lines = stdout.trim().split('\n');
      expect(lines.length).toBe(1);
      const parsed = JSON.parse(lines[0]);
      expect(parsed).toEqual(expect.objectContaining({
        sheetsProcessed: 2,
        rowsProcessed: 4,
        files: expect.any(Array),
        manifest: expect.any(String),
        outputDir: expect.any(String),
      }));
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('preview emits a dry-run JSON report and writes nothing', () => {
    const cwdBefore = fs.readdirSync(process.cwd());
    const { code, stdout } = run(['preview', FIXTURE]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.sheetsProcessed).toBe(2);
    expect(parsed.sheets.length).toBe(2);
    expect(parsed.sheets[0].previewRows.length).toBeGreaterThan(0);
    expect(parsed.sheets[0].previewRows[0]).toContain('ID');
    // No new directory or file should appear next to the cwd.
    const cwdAfter = fs.readdirSync(process.cwd());
    expect(cwdAfter).toEqual(cwdBefore);
  });

  it('clean --rules respects a custom rule set', () => {
    const rulesPath = path.join(makeTempDir('rules'), 'rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify({
      version: '1',
      rules: [
        { match: { equals: 'nhi' }, action: 'redact', replaceWith: '****' },
      ],
    }));
    const out = makeTempDir('clean-with-rules');
    try {
      const { code, stdout } = run(['clean', FIXTURE, '-o', out, '--rules', rulesPath, '--quiet']);
      expect(code).toBe(0);
      const summary = JSON.parse(stdout);
      // The fixture has 4 NHI cells across two sheets — all should be redacted.
      expect(summary.redactedCellCount).toBeGreaterThan(0);
      // Spot check the produced CSV: NHI column header survives but values are redacted.
      const firstCsv = path.join(out, summary.files[0]);
      const text = fs.readFileSync(firstCsv, 'utf8');
      expect(text).toMatch(/NHI/i);
      expect(text).toMatch(/\*\*\*\*/);
    } finally {
      fs.rmSync(path.dirname(rulesPath), { recursive: true, force: true });
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('clean reports a clear error for a missing input', () => {
    const { code, stderr } = run(['clean', '/no/such/file.xlsx']);
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toMatch(/file not found/);
  });

  it('detect emits a JSON detection report and a suggested rule set', () => {
    const { code, stdout } = run(['detect', FIXTURE]);
    expect(code).toBe(0);
    const report = JSON.parse(stdout);
    expect(report.dryRun).toBe(true);
    expect(Array.isArray(report.columns)).toBe(true);
    expect(report.suggestedRuleSet).toEqual(expect.objectContaining({
      version: '1',
      rules: expect.any(Array),
    }));
    // Suggested rule set should at minimum include the universal hygiene tail.
    const tail = report.suggestedRuleSet.rules.slice(-2);
    expect(tail[0].match).toEqual({ empty: true });
    expect(tail[1].match).toEqual({ startsWith: 'column' });
    // Fixture has NHI + DOB columns, so detection should pick them up.
    const types = report.columns.map(c => c.bestType).filter(Boolean);
    expect(types).toEqual(expect.arrayContaining(['nhi', 'dob']));
  });

  it('detect --apply runs the cleaning pipeline against the suggested rule set', () => {
    const out = makeTempDir('detect-apply');
    try {
      const { code, stderr } = run(['detect', FIXTURE, '--apply', '-o', out]);
      expect(code).toBe(0);
      expect(stderr.toLowerCase()).toMatch(/detected.*identifier/);
      const written = fs.readdirSync(out);
      expect(written.some(n => /^converted-.*\.csv$/.test(n))).toBe(true);
      expect(written.some(n => /^manifest-.*\.json$/.test(n))).toBe(true);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('detect reports a clear error for a missing input', () => {
    const { code, stderr } = run(['detect', '/no/such/file.xlsx']);
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toMatch(/file not found/);
  });
});
