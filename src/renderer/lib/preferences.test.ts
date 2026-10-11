import { describe, expect, it } from 'vitest';
import { moveColumnTo } from './column-layout';
import { DEFAULT_PREFERENCES, parsePreferences } from './preferences';

describe('parsePreferences', () => {
  it('returns the defaults for missing or corrupt storage', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{nope')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('"a string"')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps valid values', () => {
    const stored = {
      pageSize: 250,
      sortKey: 'expirationDate',
      sortDir: 'desc',
      density: 'compact',
    };
    expect(parsePreferences(JSON.stringify(stored))).toEqual({
      ...stored,
      columns: DEFAULT_PREFERENCES.columns,
    });
  });

  it('falls back per field, keeping the valid ones', () => {
    const stored = { pageSize: 7, sortKey: 'renewal', sortDir: 'sideways' };
    expect(parsePreferences(JSON.stringify(stored))).toEqual({
      pageSize: DEFAULT_PREFERENCES.pageSize,
      sortKey: 'renewal',
      sortDir: DEFAULT_PREFERENCES.sortDir,
      density: DEFAULT_PREFERENCES.density,
      columns: DEFAULT_PREFERENCES.columns,
    });
  });

  it('keeps a saved column layout and drops a key it does not know', () => {
    const active = {
      ...DEFAULT_PREFERENCES.columns.active,
      order: moveColumnTo(
        DEFAULT_PREFERENCES.columns.active.order,
        'nameservers',
        1,
      ),
      hidden: ['purchaseDate', 'purchaseAmount', 'privacy', 'gone'],
    };
    const stored = {
      pageSize: 50,
      sortKey: 'domainName',
      sortDir: 'asc',
      density: 'normal',
      columns: { active, archive: DEFAULT_PREFERENCES.columns.archive },
    };
    const parsed = parsePreferences(JSON.stringify(stored));
    expect(parsed.columns.active.order[1]).toBe('nameservers');
    expect(parsed.columns.active.hidden).toEqual([
      'purchaseDate',
      'purchaseAmount',
      'privacy',
    ]);
    expect(parsed.columns.archive).toEqual(DEFAULT_PREFERENCES.columns.archive);
  });
});
