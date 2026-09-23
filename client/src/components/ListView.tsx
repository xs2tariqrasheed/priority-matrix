import { Button, Checkbox, Popconfirm, Progress, Table, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { IMPACT } from "../labels";
import { formatMinutes, progressPercent } from "../time";
import { TimeEditor } from "./TimeEditor";

interface Props {
  items: Item[];
  weeklyMinutes: number;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onSaveTime: (item: Item, allocatedMinutes: number, spentMinutes: number) => void;
}

const LABEL_ORDER = ["PS", "PL", "VS", "VL"];
const remaining = (i: Item) => i.allocatedMinutes - i.spentMinutes;

export function ListView({ items, weeklyMinutes, onToggle, onEdit, onDelete, onSaveTime }: Props) {
  return (
    <Table<Item>
      className="list-view"
      rowKey="id"
      dataSource={items}
      pagination={false}
      size="middle"
      scroll={{ x: 860 }}
      rowClassName={(i) => (i.done ? "is-done" : "")}
      locale={{ emptyText: "No items match these filters." }}
      columns={[
        {
          key: "done",
          width: 44,
          render: (_, it) => (
            <Checkbox checked={it.done} onChange={() => onToggle(it)} aria-label={`Mark "${it.title}" as done`} />
          ),
        },
        {
          title: "Task",
          key: "title",
          sorter: (a, b) => a.title.localeCompare(b.title),
          render: (_, it) => (
            <button className="item-title" onClick={() => onEdit(it)} title="Edit">
              {it.title}
              {it.notes && (
                <Tooltip title={it.notes}>
                  <FileTextOutlined className="item-note-icon" />
                </Tooltip>
              )}
            </button>
          ),
        },
        {
          title: "Area",
          key: "area",
          width: 190,
          sorter: (a, b) => `${a.area} ${a.category}`.localeCompare(`${b.area} ${b.category}`),
          render: (_, it) => (
            <span className="list-area">
              {it.area}
              {it.category && <span className="item-category">{it.category}</span>}
            </span>
          ),
        },
        {
          title: "Label",
          key: "label",
          width: 90,
          sorter: (a, b) => LABEL_ORDER.indexOf(a.impact + a.focus) - LABEL_ORDER.indexOf(b.impact + b.focus),
          render: (_, it) => (
            <span className="label-code" style={{ background: IMPACT[it.impact].color }}>
              {it.impact}
              {it.focus}
            </span>
          ),
        },
        {
          title: "Allocated",
          key: "allocated",
          width: 110,
          sorter: (a, b) => a.allocatedMinutes - b.allocatedMinutes,
          render: (_, it) => (it.allocatedMinutes ? formatMinutes(it.allocatedMinutes) : <span className="muted">—</span>),
        },
        {
          title: "Progress",
          key: "progress",
          width: 200,
          sorter: (a, b) =>
            progressPercent(a.spentMinutes, a.allocatedMinutes) - progressPercent(b.spentMinutes, b.allocatedMinutes),
          render: (_, it) => (
            <TimeEditor item={it} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
              <button type="button" className="list-progress" aria-label={`Edit time for "${it.title}"`}>
                {it.allocatedMinutes ? (
                  <Progress percent={progressPercent(it.spentMinutes, it.allocatedMinutes)} size="small" />
                ) : (
                  <span className="muted">Allocate time</span>
                )}
              </button>
            </TimeEditor>
          ),
        },
        {
          title: "Remaining",
          key: "remaining",
          width: 120,
          sorter: (a, b) => remaining(a) - remaining(b),
          render: (_, it) => (it.allocatedMinutes ? <strong>{formatMinutes(remaining(it))}</strong> : <span className="muted">—</span>),
        },
        {
          key: "actions",
          width: 84,
          render: (_, it) => (
            <span className="list-actions">
              <Button size="small" type="text" icon={<EditOutlined />} aria-label="Edit" onClick={() => onEdit(it)} />
              <Popconfirm title="Delete this item?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(it)}>
                <Button size="small" type="text" icon={<DeleteOutlined />} aria-label="Delete" />
              </Popconfirm>
            </span>
          ),
        },
      ]}
    />
  );
}
