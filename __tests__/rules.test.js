/**
 * Version: 2.7.4
 * Description: Tests for the configurable rule engine in src/etl/rules.js, plus
 *              integration tests verifying that custom rule sets thread correctly
 *              through transformSheetWithStats.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_RULE_SET,
  validateRuleSet,
  compileRuleSet,
  loadRuleSetFromPath,
  normalizeHeader,
} = require('../src/etl/rules');
const { transformSheetWithStats } = require('../src/etl/transform');

describe('rules.normalizeHeader', () => {
  it('lower-cases and trims', () => {
    expect(normalizeHeader('  NHI ')).toBe('nhi');
    expect(normalizeHeader(null)).toBe('');
    expect(normalizeHeader(undefined)).toBe('');
    expect(normalizeHeader(123)).toBe('123');
  });
});

describe('rules.validateRuleSet', () => {
  it('accepts the default rule set', () => {
    expect(() => validateRuleSet(DEFAULT_RULE_SET)).not.toThrow();
  });

  it('rejects non-objects', () => {
    expect(() => validateRuleSet(null)).toThrow(/must be an object/);
    expect(() => validateRuleSet(42)).toThrow(/must be an object/);
  });

  it('rejects rule sets without a rules array', () => {
    expect(() => validateRuleSet({})).toThrow(/rules.*array/i);
  });

  it('rejects unknown actions', () => {
    expect(() => validateRuleSet({
      rules: [{ match: { equals: 'foo' }, action: 'explode' }],
    })).toThrow(/action must be one of/);
  });

  it('rejects unknown match keys', () => {
    expect(() => validateRuleSet({
      rules: [{ match: { regexp: 'foo' }, action: 'drop' }],
    })).toThrow(/match must have exactly one of/);
  });

  it('rejects multi-key match clauses', () => {
    expect(() => validateRuleSet({
      rules: [{ match: { equals: 'a', startsWith: 'b' }, action: 'drop' }],
    })).toThrow(/exactly one/);
  });

  it('requires outputName for anonymize / ageFromDate / rename', () => {
    for (const action of ['anonymize', 'ageFromDate', 'rename']) {
      expect(() => validateRuleSet({
        rules: [{ match: { equals: 'x' }, action }],
      })).toThrow(/outputName/);
    }
  });

  it('requires replaceWith for redact', () => {
    expect(() => validateRuleSet({
      rules: [{ match: { equals: 'x' }, action: 'redact' }],
    })).toThrow(/replaceWith/);
  });

  it('rejects invalid regex strings', () => {
    expect(() => validateRuleSet({
      rules: [{ match: { regex: '(' }, action: 'drop' }],
    })).toThrow(/regex is invalid/);
  });
});

describe('rules.compileRuleSet', () => {
  it('returns first-match-wins lookup', () => {
    const lookup = compileRuleSet({
      rules: [
        { match: { equals: 'foo' }, action: 'drop' },
        { match: { startsWith: 'foo' }, action: 'rename', outputName: 'BAR' },
      ],
    });
    expect(lookup('foo')).toMatchObject({ action: 'drop' });
    expect(lookup('foobar')).toMatchObject({ action: 'rename', outputName: 'BAR' });
  });

  it('returns keep for unmatched headers', () => {
    const lookup = compileRuleSet({ rules: [] });
    expect(lookup('anything')).toEqual({ action: 'keep' });
  });

  it('matches case-insensitively', () => {
    const lookup = compileRuleSet({
      rules: [{ match: { equals: 'NHI' }, action: 'drop' }],
    });
    expect(lookup('nhi')).toMatchObject({ action: 'drop' });
    expect(lookup('Nhi')).toMatchObject({ action: 'drop' });
  });

  it('supports regex matching', () => {
    const lookup = compileRuleSet({
      rules: [{ match: { regex: '^id_\\d+$' }, action: 'drop' }],
    });
    expect(lookup('ID_123')).toMatchObject({ action: 'drop' });
    expect(lookup('ID_xyz')).toEqual({ action: 'keep' });
  });

  it('supports empty matching', () => {
    const lookup = compileRuleSet({
      rules: [{ match: { empty: true }, action: 'drop' }],
    });
    expect(lookup('')).toMatchObject({ action: 'drop' });
    expect(lookup('  ')).toMatchObject({ action: 'drop' });
    expect(lookup('NHI')).toEqual({ action: 'keep' });
  });
});

describe('rules.loadRuleSetFromPath', () => {
  let tmpFile;
  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    tmpFile = null;
  });

  function writeTmp(contents) {
    tmpFile = path.join(os.tmpdir(), 'rules-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.json');
    fs.writeFileSync(tmpFile, contents);
    return tmpFile;
  }

  it('parses and validates a JSON rule set', () => {
    const rs = loadRuleSetFromPath(writeTmp(JSON.stringify(DEFAULT_RULE_SET)));
    expect(rs.rules.length).toBe(DEFAULT_RULE_SET.rules.length);
  });

  it('throws on malformed JSON', () => {
    expect(() => loadRuleSetFromPath(writeTmp('{ not json'))).toThrow(/parse rule set JSON/);
  });

  it('throws on invalid schema', () => {
    expect(() => loadRuleSetFromPath(writeTmp(JSON.stringify({
      rules: [{ match: { equals: 'x' }, action: 'unknown' }],
    })))).toThrow(/action must be one of/);
  });
});

describe('transformSheetWithStats with custom rule sets', () => {
  it('produces identical output to legacy code with the default rule set', () => {
    const input = [
      ['NHI', 'DOB', 'Contact', 'Address', 'Weight'],
      ['AB123', '1990-01-01', '021-555', '12 Queen St', 72],
      ['CD456', '1985-06-15', '021-666', '34 King Rd', 68],
    ];
    const out = transformSheetWithStats(input);
    expect(out.rows[0]).toEqual(['ID', 'Age', 'Weight']);
    expect(out.rows[1][0]).toBe('ID-001');
    expect(out.rows[2][0]).toBe('ID-002');
  });

  it('redacts a column when configured to do so', () => {
    const customRules = {
      version: '1',
      rules: [
        { match: { equals: 'phone' }, action: 'redact', replaceWith: '***' },
      ],
    };
    const input = [
      ['Name', 'Phone'],
      ['Alice', '555-1234'],
      ['Bob', '555-5678'],
      ['Charlie', ''],
    ];
    const out = transformSheetWithStats(input, undefined, { ruleSet: customRules });
    expect(out.rows[0]).toEqual(['Name', 'Phone']);
    expect(out.rows[1]).toEqual(['Alice', '***']);
    expect(out.rows[2]).toEqual(['Bob', '***']);
    expect(out.rows[3]).toEqual(['Charlie', '***']);
    expect(out.stats.redactedCellCount).toBe(2); // empty cell doesn't count
  });

  it('renames a column without changing values', () => {
    const customRules = {
      version: '1',
      rules: [
        { match: { equals: 'employee_id' }, action: 'rename', outputName: 'EmployeeID' },
      ],
    };
    const input = [
      ['Name', 'Employee_ID'],
      ['Alice', 'E1234'],
    ];
    const out = transformSheetWithStats(input, undefined, { ruleSet: customRules });
    expect(out.rows[0]).toEqual(['Name', 'EmployeeID']);
    expect(out.rows[1]).toEqual(['Alice', 'E1234']);
  });

  it('drops a column matched by regex', () => {
    const customRules = {
      version: '1',
      rules: [
        { match: { regex: '^internal_' }, action: 'drop' },
      ],
    };
    const input = [
      ['Name', 'Internal_Code', 'Internal_Notes', 'Public_Field'],
      ['Alice', 'IC1', 'note', 'public'],
    ];
    const out = transformSheetWithStats(input, undefined, { ruleSet: customRules });
    expect(out.rows[0]).toEqual(['Name', 'Public_Field']);
    expect(out.rows[1]).toEqual(['Alice', 'public']);
  });

  it('treats unmatched columns as keep with original casing', () => {
    const customRules = {
      version: '1',
      rules: [
        { match: { equals: 'nhi' }, action: 'anonymize', outputName: 'ID' },
      ],
    };
    const input = [
      ['NHI', 'CamelCaseField'],
      ['AB', 'value'],
    ];
    const out = transformSheetWithStats(input, undefined, { ruleSet: customRules });
    expect(out.rows[0]).toEqual(['ID', 'CamelCaseField']);
    expect(out.rows[1]).toEqual(['ID-001', 'value']);
  });
});
