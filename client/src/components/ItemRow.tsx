import { FileTextOutlined } from "@ant-design/icons";
import { isEpic } from "../tree";
import type { Item, TimePatch } from "../types";
import { isInteractiveClick } from "../lib/dom";
import { DeadlineChip } from "./DeadlineChip";
import { MarkDoneButton } from "./MarkDoneButton";
import { TimeChip } from "./TimeChip";
import { TimeEditor } from "./TimeEditor";
import { ShareMark } from "./UserAvatar";

interface Props {
  item: Item;
  /** Shown indented under its epic, which is the row above. */
  nested?: boolean;
  /** Epic of a task shown away from it (another quadrant or area). */
  epicTitle?: string;
  meId: number;
  weeklyMinutes: number;
  onOpen: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

/** Draggable matrix row; click anywhere on it to open the task. */
export function ItemRow({ item, nested = false, epicTitle, meId, weeklyMinutes, onOpen, onToggleDone, onSaveTime }: Props) {
  return (
    <li
      className={`item-row${item.done ? " is-done" : ""}${nested ? " is-nested" : ""}`}
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
        {isEpic(item) && <span className="epic-tag">Epic · {item.childCount}</span>}
        <span className="item-title">{item.title}</span>
        {epicTitle && <span className="item-epic">in {epicTitle}</span>}
        {item.category && <span className="item-category">{item.category}</span>}
        {item.notes && <FileTextOutlined className="item-note-icon" aria-label="Has notes" />}
      </span>
      <span className="item-meta">
        <ShareMark item={item} meId={meId} />
        <DeadlineChip item={item} />
        <TimeEditor item={item} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
          <TimeChip item={item} />
        </TimeEditor>
        <MarkDoneButton item={item} onToggle={onToggleDone} variant="icon" />
      </span>
    </li>
  );
}
