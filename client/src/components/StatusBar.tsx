import { Button } from "antd";
import type { Item } from "../types";
import { formatMinutes } from "../time";
import type { CellSelection } from "../lib/selection";

interface Props {
  /** The rows currently in the table, in display order. */
  items: Item[];
  selection: CellSelection;
}

/**
 * Sticky footer that totals the selected Allocated cells, the way a spreadsheet sums a
 * selection. With nothing selected it falls back to the column total of every visible row.
 */
export function StatusBar({ items, selection }: Props) {
  const picked = items.filter((i) => selection.isSelected(i.id));
  const sum = (list: Item[]) => list.reduce((total, i) => total + i.allocatedMinutes, 0);
  const total = sum(picked);
  const spent = picked.reduce((t, i) => t + i.spentMinutes, 0);

  return (
    <div className="status-bar" role="status" aria-live="polite">
      <div className="status-inner">
        {picked.length > 0 ? (
          <>
            <span className="status-total">
              Sum <strong className="num">{formatMinutes(total)}</strong>
            </span>
            <span className="status-stat">
              Cells <b className="num">{picked.length}</b>
            </span>
            <span className="status-stat">
              Average <b className="num">{formatMinutes(Math.round(total / picked.length))}</b>
            </span>
            <span className="status-stat">
              Time spent <b className="num">{formatMinutes(spent)}</b>
            </span>
            <span className="status-spacer" />
            {!selection.allSelected && (
              <Button size="small" type="text" onClick={selection.toggleAll}>
                Select column
              </Button>
            )}
            <Button size="small" type="text" onClick={selection.clear}>
              Clear selection
            </Button>
          </>
        ) : (
          <>
            <span className="status-total">
              Allocated <strong className="num">{formatMinutes(sum(items))}</strong>
              <span className="muted"> · {items.length} shown</span>
            </span>
            <span className="status-spacer" />
            <span className="status-hint">Click an Allocated cell to total it — drag or Shift-click for a range, ⌘/Ctrl-click to add</span>
            {items.length > 0 && (
              <Button size="small" type="text" onClick={selection.toggleAll}>
                Select column
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
