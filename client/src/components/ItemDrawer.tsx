import { Button, Drawer, Popconfirm, Progress } from "antd";
import { CheckCircleFilled, CloseOutlined, DeleteOutlined, EditOutlined, FieldTimeOutlined } from "@ant-design/icons";
import type { Item, ItemInput, TimePatch } from "../types";
import { FOCUS, IMPACT } from "../labels";
import { formatMinutes } from "../time";
import { formatDateTime, relativeDeadline } from "../dates";
import { DeadlineChip } from "./DeadlineChip";
import { ItemForm, type FormDefaults } from "./ItemForm";
import { MarkDoneButton } from "./MarkDoneButton";
import { ProgressRing } from "./ProgressRing";
import { TimeEditor } from "./TimeEditor";

export type DrawerMode = "view" | "edit" | "create";

export type DrawerState = { open: false } | { open: true; mode: DrawerMode; itemId: number | null; defaults?: FormDefaults };

interface Props {
  state: DrawerState;
  /** The live task for view/edit modes (looked up by id so edits elsewhere stay in sync). */
  item: Item | null;
  items: Item[];
  areas: string[];
  weeklyMinutes: number;
  saving: boolean;
  onClose: () => void;
  onModeChange: (mode: DrawerMode) => void;
  onSubmit: (values: ItemInput, item: Item | null) => void;
  onDelete: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

/** One side panel for reading, editing and creating tasks. */
export function ItemDrawer({ state, item, items, areas, weeklyMinutes, saving, onClose, onModeChange, onSubmit, onDelete, onToggleDone, onSaveTime }: Props) {
  const mode = state.open ? state.mode : "view";
  const defaults = state.open ? state.defaults : undefined;

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      size={540}
      destroyOnHidden
      closable={false}
      className="item-drawer"
      styles={{ body: { padding: 0 }, header: { display: "none" } }}
    >
      {mode === "create" && (
        <>
          <DrawerBar title="New task" onClose={onClose} />
          <div className="drawer-body">
            <ItemForm
              item={null}
              defaults={defaults}
              items={items}
              areas={areas}
              weeklyMinutes={weeklyMinutes}
              saving={saving}
              onSubmit={(v) => onSubmit(v, null)}
              onCancel={onClose}
            />
          </div>
        </>
      )}
      {mode === "edit" && item && (
        <>
          <DrawerBar title="Edit task" onClose={onClose} />
          <div className="drawer-body">
            <ItemForm
              item={item}
              items={items}
              areas={areas}
              weeklyMinutes={weeklyMinutes}
              saving={saving}
              onSubmit={(v) => onSubmit(v, item)}
              onCancel={() => onModeChange("view")}
            />
          </div>
        </>
      )}
      {mode === "view" && item && (
        <ItemDetail
          item={item}
          weeklyMinutes={weeklyMinutes}
          onClose={onClose}
          onEdit={() => onModeChange("edit")}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
          onSaveTime={onSaveTime}
        />
      )}
    </Drawer>
  );
}

function DrawerBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="drawer-bar">
      <span className="drawer-bar-title">{title}</span>
      <Button type="text" shape="circle" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
    </div>
  );
}

interface DetailProps {
  item: Item;
  weeklyMinutes: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
}

function ItemDetail({ item, weeklyMinutes, onClose, onEdit, onDelete, onToggleDone, onSaveTime }: DetailProps) {
  const pct = item.done ? 100 : item.progress;
  const remaining = item.allocatedMinutes - item.spentMinutes;
  return (
    <div className="detail">
      <div className="drawer-bar">
        <span className="detail-label">
          <span className="label-code" style={{ background: IMPACT[item.impact].color }}>
            {item.impact}
            {item.focus}
          </span>
          {IMPACT[item.impact].name} · {FOCUS[item.focus].name}
        </span>
        <span className="drawer-bar-actions">
          <Button type="text" icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
          <Button type="text" shape="circle" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
        </span>
      </div>

      <div className="drawer-body">
        <h2 className={`detail-title${item.done ? " is-done" : ""}`}>{item.title}</h2>
        <p className="detail-area">
          {item.area}
          {item.category && <span className="detail-crumb">{item.category}</span>}
        </p>

        {item.done && (
          <div className="detail-banner">
            <CheckCircleFilled />
            Completed{item.completedAt ? ` ${formatDateTime(item.completedAt)}` : ""}
          </div>
        )}

        <dl className="detail-grid">
          <div>
            <dt>Deadline</dt>
            <dd>
              {item.deadline ? (
                <>
                  <DeadlineChip item={item} />
                  <small>{relativeDeadline(item.deadline)}</small>
                </>
              ) : (
                <span className="muted">No deadline</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Progress</dt>
            <dd className="detail-progress">
              <ProgressRing percent={pct} size={22} stroke={3} />
              <span className="num">{pct}%</span>
            </dd>
          </div>
          <div>
            <dt>Allocated</dt>
            <dd>{item.allocatedMinutes ? <span className="num">{formatMinutes(item.allocatedMinutes)}</span> : <span className="muted">—</span>}</dd>
          </div>
          <div>
            <dt>Time spent</dt>
            <dd>
              <span className="num">{formatMinutes(item.spentMinutes)}</span>
              {item.allocatedMinutes > 0 && (
                <small className={remaining < 0 ? "text-warn" : undefined}>
                  {remaining >= 0 ? `${formatMinutes(remaining)} left` : `${formatMinutes(-remaining)} over`}
                </small>
              )}
            </dd>
          </div>
        </dl>

        <div className="detail-bar">
          <Progress percent={pct} showInfo={false} strokeColor={item.done ? "var(--ok)" : "var(--accent)"} />
          <TimeEditor item={item} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
            <Button size="small" icon={<FieldTimeOutlined />}>
              Adjust time &amp; progress
            </Button>
          </TimeEditor>
        </div>

        <section className="detail-notes">
          <h3>Notes</h3>
          {item.notes ? <p>{item.notes}</p> : <p className="muted">No notes yet.</p>}
        </section>

        <p className="detail-meta">
          Added {formatDateTime(item.createdAt)} · Updated {formatDateTime(item.updatedAt)}
        </p>
      </div>

      <footer className="detail-actions">
        <MarkDoneButton item={item} onToggle={onToggleDone} variant="primary" size="middle" />
        <Popconfirm
          title="Delete this task?"
          description="This can't be undone."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(item)}
          placement="topRight"
        >
          <Button type="text" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      </footer>
    </div>
  );
}
