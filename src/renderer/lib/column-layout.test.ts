import { describe, expect, it } from 'vitest';
import {
  columnLayoutsEqual,
  defaultColumnLayout,
  moveColumnTo,
  normalizeColumnLayout,
  visibleColumnKeys,
} from './column-layout';

const ACTIVE_VISIBLE = [
  'domainName',
  'folder',
  'binPrice',
  'minOffer',
  'registrar',
  'createdDate',
  'expirationDate',
  'renewal',
  'autoRenew',
  'privacy',
  'locked',
  'nameservers',
];

const ARCHIVE_VISIBLE = [
  'domainName',
  'folder',
  'createdDate',
  'purchaseDate',
  'purchaseAmount',
  'saleDate',
  'saleAmount',
  'expirationDate',
];

describe('default column layouts', () => {
  it('shows the Active columns in table order', () => {
    const layout = defaultColumnLayout('active');
    expect(
      visibleColumnKeys(layout, 'active', { purchasedFilter: false }),
    ).toEqual(ACTIVE_VISIBLE);
    expect(layout.hidden).toEqual(['purchaseDate', 'purchaseAmount']);
    expect(layout.order).not.toContain('saleDate');
  });

  it('shows the Archive columns in table order', () => {
    const layout = defaultColumnLayout('archive');
    expect(
      visibleColumnKeys(layout, 'archive', { purchasedFilter: false }),
    ).toEqual(ARCHIVE_VISIBLE);
    expect(layout.hidden).toEqual([
      'binPrice',
      'minOffer',
      'registrar',
      'renewal',
      'autoRenew',
      'privacy',
      'locked',
      'nameservers',
    ]);
  });
});

describe('normalizeColumnLayout', () => {
  it('keeps Domain first and visible', () => {
    const layout = normalizeColumnLayout(
      {
        order: ['folder', 'domainName', 'registrar'],
        hidden: ['domainName', 'folder'],
      },
      'active',
    );
    expect(layout.order[0]).toBe('domainName');
    expect(layout.order.filter((key) => key === 'domainName')).toHaveLength(1);
    expect(layout.hidden).not.toContain('domainName');
    expect(layout.hidden).toContain('folder');
  });

  it('drops unknown keys and appends a column the save never mentioned', () => {
    const layout = normalizeColumnLayout(
      {
        order: ['domainName', 'nope', 'folder'],
        hidden: ['nope', 'purchaseDate'],
      },
      'active',
    );
    expect(layout.order).not.toContain('nope');
    expect(layout.hidden).not.toContain('nope');
    expect(layout.order.at(-1)).toBe('nameservers');
    expect(layout.hidden).toContain('purchaseAmount');
    expect(layout.hidden).not.toContain('nameservers');
  });
});

describe('visibleColumnKeys', () => {
  it('hides a column without shuffling the rest', () => {
    const layout = defaultColumnLayout('active');
    layout.hidden = [...layout.hidden, 'registrar'];
    expect(
      visibleColumnKeys(layout, 'active', { purchasedFilter: false }),
    ).toEqual(ACTIVE_VISIBLE.filter((key) => key !== 'registrar'));
  });

  it('uses the dragged order', () => {
    const layout = defaultColumnLayout('active');
    layout.order = moveColumnTo(
      layout.order,
      'renewal',
      layout.order.indexOf('expirationDate'),
    );
    const visible = visibleColumnKeys(layout, 'active', {
      purchasedFilter: false,
    });
    expect(visible.indexOf('renewal')).toBe(
      visible.indexOf('expirationDate') - 1,
    );
  });

  it('shows Purchased after Created while the filter is on and the column is off', () => {
    const visible = visibleColumnKeys(defaultColumnLayout('active'), 'active', {
      purchasedFilter: true,
    });
    expect(visible.indexOf('purchaseDate')).toBe(
      visible.indexOf('createdDate') + 1,
    );
  });

  it('keeps a turned-on Purchased column where it was dragged', () => {
    const layout = defaultColumnLayout('active');
    layout.hidden = layout.hidden.filter((key) => key !== 'purchaseDate');
    layout.order = moveColumnTo(
      layout.order,
      'purchaseDate',
      layout.order.length - 1,
    );
    const visible = visibleColumnKeys(layout, 'active', {
      purchasedFilter: true,
    });
    expect(visible.at(-1)).toBe('purchaseDate');
  });

  it('puts a filter-shown Purchased column in Created’s slot when Created is hidden', () => {
    const layout = defaultColumnLayout('active');
    layout.hidden = [...layout.hidden, 'createdDate'];
    const visible = visibleColumnKeys(layout, 'active', {
      purchasedFilter: true,
    });
    const createdAt = layout.order.indexOf('createdDate');
    const before = layout.order
      .slice(0, createdAt)
      .filter((key) => !layout.hidden.includes(key));
    expect(visible[before.length]).toBe('purchaseDate');
    expect(visible).not.toContain('createdDate');
  });
});

describe('moveColumnTo', () => {
  it('does not move Domain or pass it', () => {
    const order = defaultColumnLayout('active').order;
    expect(moveColumnTo(order, 'domainName', 4)).toBe(order);
    expect(moveColumnTo(order, 'folder', 0)[0]).toBe('domainName');
    expect(moveColumnTo(order, 'folder', 0)[1]).toBe('folder');
  });
});

describe('columnLayoutsEqual', () => {
  it('matches the default to itself and not a hide', () => {
    const layout = defaultColumnLayout('archive');
    expect(columnLayoutsEqual(layout, defaultColumnLayout('archive'))).toBe(
      true,
    );
    expect(
      columnLayoutsEqual(layout, {
        ...layout,
        hidden: layout.hidden.filter((key) => key !== 'registrar'),
      }),
    ).toBe(false);
  });
});
