import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Columns3, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  columnLabel,
  columnLayoutsEqual,
  defaultColumnLayout,
  isLockedColumn,
  moveColumnTo,
  normalizeColumnLayout,
  type ColumnLayout,
  type ColumnView,
} from '../../lib/column-layout';

/**
 * Choose and reorder the Domains columns for one view. Toggles apply
 * immediately. A drag applies when the pointer goes up. Active and Archive
 * are separate layouts; the page saves whichever one this edits.
 */
function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 639px)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

export function ColumnPicker({
  view,
  layout,
  purchasedFilter,
  onLayout,
}: {
  view: ColumnView;
  layout: ColumnLayout;
  /** Active: the Purchased filter is showing that column. */
  purchasedFilter: boolean;
  onLayout: (next: ColumnLayout) => void;
}) {
  const narrow = useNarrowScreen();
  const normalized = normalizeColumnLayout(layout, view);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const dragRef = useRef<{
    key: string;
    origin: string[];
    startIndex: number;
    startY: number;
    height: number;
  } | null>(null);
  const draftRef = useRef<string[] | null>(null);
  const order = draft ?? normalized.order;
  const hidden = new Set(normalized.hidden);
  const isDefault = columnLayoutsEqual(normalized, defaultColumnLayout(view));
  const purchaseLocked = view === 'active' && purchasedFilter;

  function commit(next: ColumnLayout) {
    onLayout(normalizeColumnLayout(next, view));
  }

  function toggle(key: string) {
    if (isLockedColumn(key)) return;
    if (key === 'purchaseDate' && purchaseLocked) return;
    const nextHidden = new Set(hidden);
    if (nextHidden.has(key)) nextHidden.delete(key);
    else nextHidden.add(key);
    commit({ order: normalized.order, hidden: [...nextHidden] });
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    key: string,
  ) {
    if (event.button !== 0 || isLockedColumn(key)) return;
    event.preventDefault();
    const row = event.currentTarget.closest(
      '[data-column-key]',
    ) as HTMLElement | null;
    dragRef.current = {
      key,
      origin: normalized.order,
      startIndex: normalized.order.indexOf(key),
      startY: event.clientY,
      height: row?.offsetHeight || 36,
    };
    draftRef.current = normalized.order;
    setDragKey(key);
    setDraft(normalized.order);

    const move = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const shift = Math.round((ev.clientY - drag.startY) / drag.height);
      const next = moveColumnTo(drag.origin, drag.key, drag.startIndex + shift);
      draftRef.current = next;
      setDraft(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const next = draftRef.current;
      const origin = dragRef.current?.origin;
      dragRef.current = null;
      draftRef.current = null;
      setDragKey(null);
      setDraft(null);
      if (next && origin && next.some((k, i) => k !== origin[i])) {
        commit({ order: next, hidden: normalized.hidden });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLDivElement>, key: string) {
    if (
      event.altKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault();
      if (isLockedColumn(key)) return;
      commit({
        order: moveColumnTo(
          normalized.order,
          key,
          normalized.order.indexOf(key) + (event.key === 'ArrowUp' ? -1 : 1),
        ),
        hidden: normalized.hidden,
      });
      return;
    }
    if (
      (event.key === ' ' || event.key === 'Enter') &&
      event.target === event.currentTarget
    ) {
      event.preventDefault();
      toggle(key);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9">
          <Columns3 />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={16}
        className="flex max-h-[min(32rem,70vh)] w-64 flex-col p-0"
      >
        <PopoverArrow />
        <div className="px-3 pt-3 pb-2">
          <p className="text-sm font-medium">Columns</p>
          <p className="text-xs text-muted-foreground">
            {view === 'archive' ? 'Archive' : 'Active'}
          </p>
        </div>
        <div
          role="list"
          aria-label="Columns"
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-1 pb-1',
            dragKey && 'select-none',
          )}
        >
          {order.map((key) => {
            const label = columnLabel(view, key);
            const locked = isLockedColumn(key);
            const filterLocked = key === 'purchaseDate' && purchaseLocked;
            const shown = locked || filterLocked || !hidden.has(key);
            return (
              <div
                key={key}
                role="listitem"
                tabIndex={0}
                data-column-key={key}
                aria-grabbed={dragKey === key}
                onKeyDown={(event) => onRowKeyDown(event, key)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  dragKey === key && 'bg-muted',
                )}
              >
                {locked ? (
                  <span className="size-4 shrink-0" />
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Drag to reorder ${label}`}
                    onPointerDown={(event) => onPointerDown(event, key)}
                    className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </button>
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    !shown && 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
                <Checkbox
                  checked={shown}
                  disabled={locked || filterLocked}
                  tabIndex={-1}
                  aria-label={
                    locked
                      ? 'Domain is always shown'
                      : filterLocked
                        ? `Clear the Purchased filter to hide ${label}`
                        : `Show ${label}`
                  }
                  title={
                    filterLocked
                      ? 'Clear the Purchased filter to hide this column'
                      : undefined
                  }
                  className={
                    locked || filterLocked ? 'disabled:opacity-100' : undefined
                  }
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            );
          })}
        </div>
        {narrow && (
          <p className="px-3 pb-2 text-xs text-muted-foreground">
            A few columns stay hidden until the window is wider.
          </p>
        )}
        <div className="border-t px-3 py-2">
          <button
            type="button"
            disabled={isDefault}
            onClick={() => commit(defaultColumnLayout(view))}
            className="text-xs text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Reset to default
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
