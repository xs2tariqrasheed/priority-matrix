import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { Button, Table, Tooltip, type TableColumnsType, type TableProps } from "antd";
import { CaretRightOutlined, FileTextOutlined, PlusOutlined } from "@ant-design/icons";
import type { Item, TimePatch } from "../types";
import { IMPACT } from "../labels";
import { formatMinutes } from "../time";
import { expectedProgress, paceLabel, paceOf, useNow } from "../expected";
import { type Sort, type SortKey, DEFAULT_SORT } from "../filters";
import { isInteractiveClick } from "../lib/dom";
import type { CellSelection } from "../lib/selection";
import { isEpic, type TreeRow } from "../tree";
import { DeadlineChip } from "./DeadlineChip";
import { MarkDoneButton } from "./MarkDoneButton";
import { ProgressBar } from "./ProgressBar";
import { TimeEditor } from "./TimeEditor";

interface Props {
  /** Epics carry their visible tasks as `children`. */
  rows: TreeRow[];
  /** Epics whose tasks are hidden. */
  collapsed: ReadonlySet<number>;
  onToggleEpic: (id: number) => void;
  onAddTask: (epic: Item) => void;
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

/**
 * Sorted tree table: epics with their tasks nested beneath. The rows themselves open the item,
 * column headers drive the shared sort.
 */
export function ListView({ rows, collapsed, onToggleEpic, onAddTask, weeklyMinutes, sort, onSortChange, selection, onOpen, onToggleDone, onSaveTime }: Props) {
  const now = useNow();
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
        <div className={`cell-task${it.parentId !== null ? " is-subtask" : ""}`}>
          {"children" in it && it.children ? (
            <button
              type="button"
              className={`tree-toggle${collapsed.has(it.id) ? "" : " is-open"}`}
              aria-expanded={!collapsed.has(it.id)}
              aria-label={`${collapsed.has(it.id) ? "Show" : "Hide"} the tasks in "${it.title}"`}
              onClick={() => onToggleEpic(it.id)}
            >
              <CaretRightOutlined />
            </button>
          ) : (
            <span className="tree-spacer" />
          )}
          {isEpic(it) && (
            <span className="epic-tag" title={`Epic with ${it.childCount} ${it.childCount === 1 ? "task" : "tasks"}`}>
              Epic · {it.childCount}
            </span>
          )}
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
        const expected = expectedProgress(it, now);
        const pace = expected === null ? null : paceOf(pct, expected);
        const cell = (
          <button
            type="button"
            className={`cell-progress${pace ? ` is-${pace.status}` : ""}`}
            aria-label={isEpic(it) ? `${pct}% complete, from its tasks; edit time for "${it.title}"` : `Edit progress for "${it.title}"`}
          >
            <ProgressBar percent={pct} expected={expected} done={it.done} size={[80, 6]} />
            <span className="num">{pct}%</span>
          </button>
        );
        return (
          <TimeEditor item={it} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
            {pace ? (
              <Tooltip title={`${expected}% expected by now · ${paceLabel(pace)}`} mouseEnterDelay={0.3}>
                {cell}
              </Tooltip>
            ) : (
              cell
            )}
          </TimeEditor>
        );
      },
    },
    {
      key: "actions",
      width: 184,
      align: "right",
      render: (_, it) => (
        <span className="row-actions">
          {it.parentId === null && (
            <Tooltip title={isEpic(it) ? "Add a task to this epic" : "Add a task under this one (makes it an epic)"} mouseEnterDelay={0.3}>
              <Button
                size="small"
                type="text"
                shape="circle"
                icon={<PlusOutlined />}
                className="add-task-btn"
                aria-label={`Add a task to "${it.title}"`}
                onClick={() => onAddTask(it)}
              />
            </Tooltip>
          )}
          <MarkDoneButton item={it} onToggle={onToggleDone} variant="text" />
        </span>
      ),
    },
  ];

  const handleChange: TableProps<TreeRow>["onChange"] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = s?.columnKey as SortKey | undefined;
    if (!key || !s?.order || !SORTABLE.includes(key)) {
      onSortChange(DEFAULT_SORT);
      return;
    }
    onSortChange({ key, dir: s.order === "ascend" ? "asc" : "desc" });
  };

  return (
    <Table<TreeRow>
      className="list-view"
      rowKey="id"
      dataSource={rows}
      columns={columns as TableColumnsType<TreeRow>}
      pagination={false}
      size="middle"
      scroll={{ x: 1040 }}
      showSorterTooltip={false}
      rowClassName={(i) => `list-row${i.done ? " is-done" : ""}${isEpic(i) ? " is-epic" : ""}${i.parentId !== null ? " is-subtask" : ""}`}
      // The Task cell draws its own toggle and indent so the title can still truncate.
      expandable={{
        expandedRowKeys: rows.filter((r) => r.children && !collapsed.has(r.id)).map((r) => r.id),
        indentSize: 0,
        expandIcon: () => null,
      }}
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
