import { Progress, Table, Tooltip, type TableColumnsType, type TableProps } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import type { Item, TimePatch } from "../types";
import { IMPACT } from "../labels";
import { formatMinutes } from "../time";
import { type Sort, type SortKey, DEFAULT_SORT } from "../filters";
import { isInteractiveClick } from "../lib/dom";
import { DeadlineChip } from "./DeadlineChip";
import { MarkDoneButton } from "./MarkDoneButton";
import { TimeEditor } from "./TimeEditor";

interface Props {
  items: Item[];
  weeklyMinutes: number;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  onOpen: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

const SORTABLE: SortKey[] = ["title", "area", "deadline", "allocated", "spent", "progress"];
const orderFor = (key: SortKey, sort: Sort) => (sort.key === key ? (sort.dir === "asc" ? "ascend" : "descend") : null);

/** Sorted table; the rows themselves open the task, column headers drive the shared sort. */
export function ListView({ items, weeklyMinutes, sort, onSortChange, onOpen, onToggleDone, onSaveTime }: Props) {
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
      width: 124,
      sorter: true,
      sortOrder: orderFor("allocated", sort),
      render: (_, it) => (it.allocatedMinutes ? <span className="num">{formatMinutes(it.allocatedMinutes)}</span> : <span className="muted">—</span>),
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
