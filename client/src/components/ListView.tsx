import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { Progress, Table, Tooltip, type TableColumnsType, type TableProps } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import type { Item, TimePatch } from "../types";
import { IMPACT } from "../labels";
import { formatMinutes } from "../time";
import { type Sort, type SortKey, DEFAULT_SORT } from "../filters";
import { isInteractiveClick } from "../lib/dom";
import type { CellSelection } from "../lib/selection";
import { DeadlineChip } from "./DeadlineChip";
import { MarkDoneButton } from "./MarkDoneButton";
import { TimeEditor } from "./TimeEditor";

interface Props {
  items: Item[];
  weeklyMinutes: number;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  /** Spreadsheet-style selection of the Allocated column; totals show in the status bar. */
  selection: CellSelection;
  onOpen: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

const SORTABLE: SortKey[] = ["title", "area", "deadline", "allocated", "spent", "progress"];
const orderFor = (key: SortKey, sort: Sort) => (sort.key === key ? (sort.dir === "asc" ? "ascend" : "descend") : null);

/** Sorted table; the rows themselves open the task, column headers drive the shared sort. */
export function ListView({ items, weeklyMinutes, sort, onSortChange, selection, onOpen, onToggleDone, onSaveTime }: Props) {
  const cells = useRef(new Map<number, HTMLButtonElement>());

  const focusCell = (id: number | null) => {
    if (id !== null) cells.current.get(id)?.focus();
  };

  const onCellMouseDown = (e: MouseEvent<HTMLButtonElement>, id: number) => {
    // Keep the drag from selecting the table's text, but still take focus for keyboard use.
    e.preventDefault();
    e.currentTarget.focus();
    selection.start(id, e, true);
  };

  const onCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(selection.step(id, e.key === "ArrowDown" ? 1 : -1, e.shiftKey));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      selection.start(id, e);
    } else if (e.key === "Escape") {
      selection.clear();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (!selection.allSelected) selection.toggleAll();
    }
  };

  const columns: TableColumnsType<Item> = [
    {
      title: "Task",
      key: "title",
      sorter: true,
      sortOrder: orderFor("title", sort),
      ellipsis: true,
      render: (_, it) => (
        <div className="cell-task">
          <span className="item-title">{it.title}</span>
          {it.category && <span className="item-category">{it.category}</span>}
          {it.notes && (
            <Tooltip title={it.notes}>
              <FileTextOutlined className="item-note-icon" />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Area",
      key: "area",
      width: 130,
      sorter: true,
      sortOrder: orderFor("area", sort),
      render: (_, it) => <span className="cell-area">{it.area}</span>,
    },
    {
      title: "Label",
      key: "label",
      width: 84,
      render: (_, it) => (
        <span className="label-code" style={{ background: IMPACT[it.impact].color }}>
          {it.impact}
          {it.focus}
        </span>
      ),
    },
    {
      title: "Deadline",
      key: "deadline",
      width: 176,
      sorter: true,
      sortOrder: orderFor("deadline", sort),
      render: (_, it) => (it.deadline ? <DeadlineChip item={it} /> : <span className="muted">—</span>),
    },
    {
      title: "Allocated",
      key: "allocated",
      width: 140,
      sorter: true,
      sortOrder: orderFor("allocated", sort),
      render: (_, it) => {
        const selected = selection.isSelected(it.id);
        return (
          <button
            type="button"
            ref={(el) => {
              if (el) cells.current.set(it.id, el);
              else cells.current.delete(it.id);
            }}
            className={`cell-alloc${selected ? " is-selected" : ""}`}
            aria-pressed={selected}
            aria-label={`Allocated ${formatMinutes(it.allocatedMinutes)} for "${it.title}"; select to total`}
            onMouseDown={(e) => onCellMouseDown(e, it.id)}
            onMouseEnter={(e) => {
              // Only while the primary button is still held, in case a mouseup was missed.
              if (e.buttons === 1) selection.extendTo(it.id);
            }}
            onKeyDown={(e) => onCellKeyDown(e, it.id)}
          >
            {it.allocatedMinutes ? <span className="num">{formatMinutes(it.allocatedMinutes)}</span> : <span className="muted">—</span>}
          </button>
        );
      },
    },
    {
      title: "Time spent",
      key: "spent",
      width: 134,
      sorter: true,
      sortOrder: orderFor("spent", sort),
      render: (_, it) => (
        <TimeEditor item={it} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
          <button type="button" className="cell-time" aria-label={`Edit time for "${it.title}"`}>
            {it.spentMinutes ? <strong className="num">{formatMinutes(it.spentMinutes)}</strong> : <span className="muted">Log time</span>}
          </button>
        </TimeEditor>
      ),
    },
    {
      title: "Progress",
      key: "progress",
      width: 160,
      sorter: true,
      sortOrder: orderFor("progress", sort),
      render: (_, it) => {
        const pct = it.done ? 100 : it.progress;
        return (
          <TimeEditor item={it} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
            <button type="button" className="cell-progress" aria-label={`Edit progress for "${it.title}"`}>
              <Progress percent={pct} size={[80, 6]} showInfo={false} strokeColor={it.done ? "var(--ok)" : "var(--accent)"} />
              <span className="num">{pct}%</span>
            </button>
          </TimeEditor>
        );
      },
    },
    {
      key: "actions",
      width: 148,
      align: "right",
      render: (_, it) => <MarkDoneButton item={it} onToggle={onToggleDone} variant="text" />,
    },
  ];

  const handleChange: TableProps<Item>["onChange"] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = s?.columnKey as SortKey | undefined;
    if (!key || !s?.order || !SORTABLE.includes(key)) {
      onSortChange(DEFAULT_SORT);
      return;
    }
    onSortChange({ key, dir: s.order === "ascend" ? "asc" : "desc" });
  };

  return (
    <Table<Item>
      className="list-view"
      rowKey="id"
      dataSource={items}
      columns={columns}
      pagination={false}
      size="middle"
      scroll={{ x: 1040 }}
      showSorterTooltip={false}
      rowClassName={(i) => `list-row${i.done ? " is-done" : ""}`}
      locale={{ emptyText: <div className="table-empty">No tasks match these filters.</div> }}
      onChange={handleChange}
      onRow={(it) => ({
        onClick: (e) => {
          if (!isInteractiveClick(e)) onOpen(it);
        },
      })}
    />
  );
}
