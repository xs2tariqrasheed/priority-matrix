import { Button, Checkbox, Popconfirm, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons";
import type { Item } from "../types";
import { TimeChip } from "./TimeChip";
import { TimeEditor } from "./TimeEditor";

interface Props {
  item: Item;
  onToggle: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onSaveTime: (item: Item, allocatedMinutes: number, spentMinutes: number) => void;
  weeklyMinutes: number;
}

export function ItemRow({ item, onToggle, onEdit, onDelete, onSaveTime, weeklyMinutes }: Props) {
  return (
    <li
      className={`item-row${item.done ? " is-done" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(item.id));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <Checkbox checked={item.done} onChange={() => onToggle(item)} aria-label={`Mark "${item.title}" as done`} />
      <button className="item-title" onClick={() => onEdit(item)} title="Edit">
        {item.title}
        {item.notes && (
          <Tooltip title={item.notes}>
            <FileTextOutlined className="item-note-icon" />
          </Tooltip>
        )}
      </button>
      {item.category && <span className="item-category">{item.category}</span>}
      <TimeEditor item={item} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
        <TimeChip item={item} />
      </TimeEditor>
      <span className="item-actions">
        <Button size="small" type="text" icon={<EditOutlined />} aria-label="Edit" onClick={() => onEdit(item)} />
        <Popconfirm title="Delete this item?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onDelete(item)}>
          <Button size="small" type="text" icon={<DeleteOutlined />} aria-label="Delete" />
        </Popconfirm>
      </span>
    </li>
  );
}
