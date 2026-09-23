import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY: ReadonlySet<number> = new Set();

/** The modifier keys a mouse or keyboard event carries; only these three matter here. */
export interface SelectionModifiers {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}

export interface CellSelection {
  ids: ReadonlySet<number>;
  count: number;
  allSelected: boolean;
  isSelected: (id: number) => boolean;
  /**
   * Mouse-down or key press on a cell: replaces, extends (shift) or toggles (⌘/Ctrl) the
   * selection. `drag` arms drag-to-extend and belongs to pointer input only.
   */
  start: (id: number, mods: SelectionModifiers, drag?: boolean) => void;
  /** Pointer dragged onto a cell; only extends while a drag that started on a cell is live. */
  extendTo: (id: number) => void;
  /** Selects the whole column, or clears it when everything is already selected. */
  toggleAll: () => void;
  clear: () => void;
  /** Moves one row up or down, selecting (or extending to) it; returns the row to focus. */
  step: (id: number, dir: -1 | 1, extend: boolean) => number | null;
}

/**
 * Spreadsheet-style selection over a single column of rows: click a cell, shift-click or drag
 * for a range, ⌘/Ctrl-click to add or remove one. `rowIds` must be memoised by the caller and
 * listed in display order; rows that disappear (a filter change) drop out of the selection.
 */
export function useCellSelection(rowIds: number[]): CellSelection {
  const [ids, setIds] = useState<ReadonlySet<number>>(EMPTY);
  const anchor = useRef<number | null>(null);
  const dragging = useRef(false);
  const order = useRef(rowIds);
  order.current = rowIds;

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  useEffect(() => {
    setIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(rowIds);
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (anchor.current !== null && !rowIds.includes(anchor.current)) anchor.current = null;
  }, [rowIds]);

  const rangeBetween = useCallback((from: number, to: number): Set<number> => {
    const list = order.current;
    const a = list.indexOf(from);
    const b = list.indexOf(to);
    if (a < 0 || b < 0) return new Set([to]);
    return new Set(a <= b ? list.slice(a, b + 1) : list.slice(b, a + 1));
  }, []);

  const start = useCallback(
    (id: number, mods: SelectionModifiers, drag = false) => {
      dragging.current = drag;
      if (mods.shiftKey && anchor.current !== null) {
        setIds(rangeBetween(anchor.current, id));
        return;
      }
      anchor.current = id;
      if (mods.metaKey || mods.ctrlKey) {
        setIds((prev) => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        });
        return;
      }
      setIds(new Set([id]));
    },
    [rangeBetween],
  );

  const extendTo = useCallback(
    (id: number) => {
      if (!dragging.current || anchor.current === null) return;
      setIds(rangeBetween(anchor.current, id));
    },
    [rangeBetween],
  );

  const toggleAll = useCallback(() => {
    const list = order.current;
    setIds((prev) => {
      if (list.length > 0 && prev.size === list.length) {
        anchor.current = null;
        return EMPTY;
      }
      anchor.current = list[0] ?? null;
      return new Set(list);
    });
  }, []);

  const clear = useCallback(() => {
    anchor.current = null;
    setIds(EMPTY);
  }, []);

  const step = useCallback(
    (id: number, dir: -1 | 1, extend: boolean): number | null => {
      const list = order.current;
      const next = list[list.indexOf(id) + dir];
      if (next === undefined) return null;
      if (extend && anchor.current !== null) {
        setIds(rangeBetween(anchor.current, next));
      } else {
        anchor.current = next;
        setIds(new Set([next]));
      }
      return next;
    },
    [rangeBetween],
  );

  return {
    ids,
    count: ids.size,
    allSelected: rowIds.length > 0 && ids.size === rowIds.length,
    isSelected: (id: number) => ids.has(id),
    start,
    extendTo,
    toggleAll,
    clear,
    step,
  };
}
