/**
 * Which Domains columns are on screen, and in what order. Active and Archive
 * each keep their own layout. Domain stays first and visible. A Purchased
 * date filter on Active still shows that column after Created until the
 * picker has turned it on.
 */

export type ColumnView = 'active' | 'archive';

export interface ColumnLayout {
  /** Left to right. Includes hidden columns, in the spot they return to. */
  order: string[];
  hidden: string[];
}

interface ColumnSpec {
  key: string;
  label: string | { active: string; archive: string };
  views: ColumnView[];
  /** Off until the picker turns it on. Still sits in `order`. */
  hiddenOn?: ColumnView[];
  locked?: boolean;
}

/** Table order. Hidden columns stay in this list so turning one on puts it back. */
const COLUMN_SPECS: ColumnSpec[] = [
  {
    key: 'domainName',
    label: 'Domain',
    views: ['active', 'archive'],
    locked: true,
  },
  {
    key: 'folder',
    label: { active: 'Folder', archive: 'Status' },
    views: ['active', 'archive'],
  },
  {
    key: 'binPrice',
    label: 'BIN price',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  {
    key: 'minOffer',
    label: 'Min offer',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  {
    key: 'registrar',
    label: 'Registrar',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  { key: 'createdDate', label: 'Created', views: ['active', 'archive'] },
  {
    key: 'purchaseDate',
    label: 'Purchased',
    views: ['active', 'archive'],
    hiddenOn: ['active'],
  },
  {
    key: 'purchaseAmount',
    label: 'Purchased for',
    views: ['active', 'archive'],
    hiddenOn: ['active'],
  },
  { key: 'saleDate', label: 'Sold', views: ['archive'] },
  { key: 'saleAmount', label: 'Sold for', views: ['archive'] },
  { key: 'expirationDate', label: 'Expires', views: ['active', 'archive'] },
  {
    key: 'renewal',
    label: 'Renewal',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  {
    key: 'autoRenew',
    label: 'Auto',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  {
    key: 'privacy',
    label: 'Privacy',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  {
    key: 'locked',
    label: 'Locked',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
  {
    key: 'nameservers',
    label: 'Nameservers',
    views: ['active', 'archive'],
    hiddenOn: ['archive'],
  },
];

const LOCKED = 'domainName';

export function defaultColumnLayout(view: ColumnView): ColumnLayout {
  const specs = COLUMN_SPECS.filter((s) => s.views.includes(view));
  return {
    order: specs.map((s) => s.key),
    hidden: specs.filter((s) => s.hiddenOn?.includes(view)).map((s) => s.key),
  };
}

export function columnLabel(view: ColumnView, key: string): string {
  const spec = COLUMN_SPECS.find((s) => s.key === key);
  if (!spec) return key;
  return typeof spec.label === 'string' ? spec.label : spec.label[view];
}

export function isLockedColumn(key: string): boolean {
  return key === LOCKED;
}

/** Drop unknown keys, keep Domain first and visible, append columns the save predates. */
export function normalizeColumnLayout(
  raw: unknown,
  view: ColumnView,
): ColumnLayout {
  const defaults = defaultColumnLayout(view);
  if (!raw || typeof raw !== 'object') return defaults;
  const rec = raw as { order?: unknown; hidden?: unknown };
  const allowed = new Set(defaults.order);

  const order = [LOCKED];
  const seen = new Set<string>([LOCKED]);
  if (Array.isArray(rec.order)) {
    for (const key of rec.order) {
      if (typeof key !== 'string' || key === LOCKED || !allowed.has(key))
        continue;
      if (seen.has(key)) continue;
      order.push(key);
      seen.add(key);
    }
  } else {
    for (const key of defaults.order) {
      if (seen.has(key)) continue;
      order.push(key);
      seen.add(key);
    }
  }
  const appended: string[] = [];
  for (const key of defaults.order) {
    if (seen.has(key)) continue;
    order.push(key);
    appended.push(key);
  }

  const mentioned = new Set<string>();
  if (Array.isArray(rec.order)) {
    for (const key of rec.order) {
      if (typeof key === 'string') mentioned.add(key);
    }
  }
  if (Array.isArray(rec.hidden)) {
    for (const key of rec.hidden) {
      if (typeof key === 'string') mentioned.add(key);
    }
  }

  const hidden = new Set<string>();
  if (Array.isArray(rec.hidden)) {
    for (const key of rec.hidden) {
      if (typeof key !== 'string' || key === LOCKED || !allowed.has(key))
        continue;
      hidden.add(key);
    }
  } else {
    for (const key of defaults.hidden) hidden.add(key);
  }
  const defaultHidden = new Set(defaults.hidden);
  for (const key of appended) {
    if (mentioned.has(key)) continue;
    if (defaultHidden.has(key)) hidden.add(key);
    else hidden.delete(key);
  }

  return {
    order,
    hidden: defaults.order.filter((key) => hidden.has(key)),
  };
}

export function columnLayoutsEqual(a: ColumnLayout, b: ColumnLayout): boolean {
  if (a.order.length !== b.order.length) return false;
  if (a.order.some((key, i) => key !== b.order[i])) return false;
  if (a.hidden.length !== b.hidden.length) return false;
  const hidden = new Set(a.hidden);
  return b.hidden.every((key) => hidden.has(key));
}

/**
 * Move `key` to `toIndex` in a copy of `order`. Index 0 is Domain and is
 * never the destination. `toIndex` is the index in the original array.
 */
export function moveColumnTo(
  order: string[],
  key: string,
  toIndex: number,
): string[] {
  if (key === LOCKED) return order;
  const from = order.indexOf(key);
  if (from < 0) return order;
  const to = Math.max(1, Math.min(toIndex, order.length - 1));
  if (to === from) return order;
  const next = order.slice();
  next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
}

/**
 * Columns actually drawn. On Active, a Purchased filter shows Purchased
 * after Created while that column is still off in the picker. Once the
 * picker has turned it on, it stays where the layout put it.
 */
export function visibleColumnKeys(
  layout: ColumnLayout,
  view: ColumnView,
  options: { purchasedFilter: boolean },
): string[] {
  const normalized = normalizeColumnLayout(layout, view);
  const hidden = new Set(normalized.hidden);
  const forcePurchase =
    view === 'active' && options.purchasedFilter && hidden.has('purchaseDate');
  const visible: string[] = [];
  for (const key of normalized.order) {
    if (key === LOCKED) {
      visible.push(key);
      continue;
    }
    if (forcePurchase && key === 'purchaseDate') continue;
    if (hidden.has(key)) {
      if (forcePurchase && key === 'createdDate') visible.push('purchaseDate');
      continue;
    }
    visible.push(key);
    if (forcePurchase && key === 'createdDate') visible.push('purchaseDate');
  }
  if (forcePurchase && !visible.includes('purchaseDate'))
    visible.push('purchaseDate');
  return visible;
}
