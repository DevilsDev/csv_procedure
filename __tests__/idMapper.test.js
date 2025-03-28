/**
 * Version: 1.0.0
 * Description: Unit tests for getAnonymizedId and resetIdMap functions.
 * Author: Ali Kahwaji
 */

const { getAnonymizedId, resetIdMap } = require('../src/etl/idMapper');

describe('getAnonymizedId()', () => {
  beforeEach(() => {
    resetIdMap();
  });

  it('should return consistent IDs for the same NHI', () => {
    const id1 = getAnonymizedId('ABC123');
    const id2 = getAnonymizedId('ABC123');
    expect(id1).toBe('ID-001');
    expect(id2).toBe('ID-001');
  });

  it('should increment IDs for different NHIs', () => {
    const id1 = getAnonymizedId('NHI001');
    const id2 = getAnonymizedId('NHI002');
    const id3 = getAnonymizedId('NHI003');
    expect(id1).toBe('ID-001');
    expect(id2).toBe('ID-002');
    expect(id3).toBe('ID-003');
  });

  it('should reset IDs after resetIdMap()', () => {
    getAnonymizedId('OLD001');
    resetIdMap();
    const idNew = getAnonymizedId('NEW001');
    expect(idNew).toBe('ID-001');
  });

  it('should return empty string for invalid input', () => {
    expect(getAnonymizedId(undefined)).toBe('');
    expect(getAnonymizedId(null)).toBe('');
    expect(getAnonymizedId(123)).toBe('');
  });
});
