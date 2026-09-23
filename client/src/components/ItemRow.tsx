import { FileTextOutlined } from "@ant-design/icons";
import type { Item, TimePatch } from "../types";
import { isInteractiveClick } from "../lib/dom";
import { DeadlineChip } from "./DeadlineChip";
import { MarkDoneButton } from "./MarkDoneButton";
import { TimeChip } from "./TimeChip";
import { TimeEditor } from "./TimeEditor";

interface Props {
  item: Item;
  weeklyMinutes: number;
  onOpen: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

/** Draggable matrix row; click anywhere on it to open the task. */
export function ItemRow({ item, weeklyMinutes, onOpen, onToggleDone, onSaveTime }: Props) {
  return (
    <li
      className={`item-row${item.done ? " is-done" : ""}`}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`Open "${item.title}"`}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(item.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        if (!isInteractiveClick(e)) onOpen(item);
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(item);
        }
      }}
    >
      <span className="item-main">
        <span className="item-title">{item.title}</span>
        {item.category && <span className="item-category">{item.category}</span>}
        {item.notes && <FileTextOutlined className="item-note-icon" aria-label="Has notes" />}
      </span>
      <span className="item-meta">
        <DeadlineChip item={item} />
        <TimeEditor item={item} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
          <TimeChip item={item} />
        </TimeEditor>
        <MarkDoneButton item={item} onToggle={onToggleDone} variant="icon" />
      </span>
    </li>
  );
}
