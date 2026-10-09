import { Button, Drawer, Popconfirm } from "antd";
import { CheckCircleFilled, CloseOutlined, DeleteOutlined, EditOutlined, FieldTimeOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import type { Item, ItemInput, TimePatch } from "../types";
import { FOCUS, IMPACT } from "../labels";
import { formatMinutes } from "../time";
import { formatDateTime, relativeDeadline } from "../dates";
import { paceLabel, useExpectedProgress } from "../expected";
import { DEFAULT_SORT, sortItems } from "../filters";
import { displayName, isShared } from "../people";
import { ActivityButton } from "./ActivityLog";
import { DeadlineChip } from "./DeadlineChip";
import { ItemForm, type FormDefaults } from "./ItemForm";
import { MarkDoneButton } from "./MarkDoneButton";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { EpicPeople, TaskAssignee } from "./Sharing";
import { TimeEditor } from "./TimeEditor";
import { UserAvatar } from "./UserAvatar";

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
  /** The signed-in user. */
  meId: number;
  onClose: () => void;
  onModeChange: (mode: DrawerMode) => void;
  /** Open another item in the panel (an epic's task, or a task's epic). */
  onOpen: (item: Item) => void;
  /** Start a new task inside this item, which then becomes an epic. */
  onAddTask: (epic: Item) => void;
  onSubmit: (values: ItemInput, item: Item | null) => void;
  onDelete: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
  /** Pick up, assign or unassign (null) a task inside an epic. */
  onAssign: (item: Item, userId: number | null) => Promise<void>;
  /** An epic's people changed (or you left it). */
  onMembersChanged: () => void;
}

/** One side panel for reading, editing and creating tasks. */
export function ItemDrawer({
  state,
  item,
  items,
  areas,
  weeklyMinutes,
  saving,
  meId,
  onClose,
  onModeChange,
  onOpen,
  onAddTask,
  onSubmit,
  onDelete,
  onToggleDone,
  onSaveTime,
  onAssign,
  onMembersChanged,
}: Props) {
  const mode = state.open ? state.mode : "view";
  const defaults = state.open ? state.defaults : undefined;
  const newTaskEpic = defaults?.parentId ? items.find((i) => i.id === defaults.parentId) : undefined;

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
          <DrawerBar title={newTaskEpic ? `New task in "${newTaskEpic.title}"` : "New task"} onClose={onClose} />
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
          <DrawerBar title={item.childCount > 0 ? "Edit epic" : "Edit task"} onClose={onClose} />
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
          items={items}
          weeklyMinutes={weeklyMinutes}
          meId={meId}
          onOpen={onOpen}
          onAddTask={onAddTask}
          onClose={onClose}
          onEdit={() => onModeChange("edit")}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
          onSaveTime={onSaveTime}
          onAssign={onAssign}
          onMembersChanged={onMembersChanged}
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
  items: Item[];
  weeklyMinutes: number;
  meId: number;
  onOpen: (item: Item) => void;
  onAddTask: (epic: Item) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (item: Item) => void;
  onToggleDone: (item: Item) => void;
  onSaveTime: (item: Item, patch: TimePatch) => void;
  onAssign: (item: Item, userId: number | null) => Promise<void>;
  onMembersChanged: () => void;
}

function ItemDetail({
  item,
  items,
  weeklyMinutes,
  meId,
  onOpen,
  onAddTask,
  onClose,
  onEdit,
  onDelete,
  onToggleDone,
  onSaveTime,
  onAssign,
  onMembersChanged,
}: DetailProps) {
  const pct = item.done ? 100 : item.progress;
  const remaining = item.allocatedMinutes - item.spentMinutes;
  const { expected, pace } = useExpectedProgress(item);
  const epic = item.parentId === null ? undefined : items.find((i) => i.id === item.parentId);
  const tasks = item.childCount > 0 ? sortItems(items.filter((i) => i.parentId === item.id), DEFAULT_SORT) : [];
  return (
    <div className="detail">
      <div className="drawer-bar">
        <span className="detail-label">
          <span className="label-code" style={{ background: IMPACT[item.impact].color }}>
            {item.impact}
            {item.focus}
          </span>
          {IMPACT[item.impact].name} · {FOCUS[item.focus].name}
          {item.childCount > 0 && <span className="epic-tag">Epic</span>}
        </span>
        <span className="drawer-bar-actions">
          <ActivityButton item={item} meId={meId} />
          <Button type="text" icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
          <Button type="text" shape="circle" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
        </span>
      </div>

      <div className="drawer-body">
        {epic && (
          <button type="button" className="detail-epic" onClick={() => onOpen(epic)}>
            <span className="epic-tag">Epic</span>
            <span className="detail-epic-title">{epic.title}</span>
          </button>
        )}
        <h2 className={`detail-title${item.done ? " is-done" : ""}`}>{item.title}</h2>
        <p className="detail-area">
          {item.area}
          {item.category && <span className="detail-crumb">{item.category}</span>}
        </p>
        {isShared(item) && (
          <p className="detail-shared">
            <TeamOutlined />
            {item.owner.id === meId
              ? `Shared with ${item.memberCount} ${item.memberCount === 1 ? "person" : "people"}`
              : `Shared by ${displayName(item.owner)}`}
          </p>
        )}

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
              <ProgressRing percent={pct} expected={expected} size={22} stroke={3} />
              <span className="num">{pct}%</span>
              {pace && (
                <small className={`pace-text is-${pace.status}`}>
                  {paceLabel(pace)} · {expected}% expected
                </small>
              )}
              {tasks.length > 0 && <small>from {tasks.length} {tasks.length === 1 ? "task" : "tasks"}</small>}
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
          <ProgressBar percent={pct} expected={expected} done={item.done} />
          <TimeEditor item={item} weeklyMinutes={weeklyMinutes} onSave={onSaveTime}>
            <Button size="small" icon={<FieldTimeOutlined />}>
              Adjust time &amp; progress
            </Button>
          </TimeEditor>
        </div>

        {item.parentId !== null && (isShared(item) || item.assignee) && <TaskAssignee task={item} meId={meId} onAssign={onAssign} />}

        {item.parentId === null && (
          <section className="detail-tasks">
            <header className="detail-tasks-head">
              <h3>
                Tasks{tasks.length > 0 && <span className="count">{tasks.filter((t) => t.done).length}/{tasks.length} done</span>}
              </h3>
              <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => onAddTask(item)}>
                Add task
              </Button>
            </header>
            {tasks.length === 0 ? (
              <p className="muted">Break this down into tasks. Adding one turns this task into an epic whose progress follows its tasks.</p>
            ) : (
              <ul className="detail-task-list">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <button type="button" className={`detail-task${t.done ? " is-done" : ""}`} onClick={() => onOpen(t)}>
                      {t.done ? <CheckCircleFilled className="detail-task-check" /> : <ProgressRing percent={t.progress} size={16} stroke={2.5} />}
                      <span className="detail-task-title">{t.title}</span>
                      {t.deadline && !t.done && <DeadlineChip item={t} />}
                      {t.assignee && <UserAvatar user={t.assignee} title={`Assigned to ${t.assignee.id === meId ? "you" : displayName(t.assignee)}`} />}
                      <span className="num muted">{t.done ? 100 : t.progress}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {item.parentId === null && <EpicPeople epic={item} meId={meId} onChanged={onMembersChanged} />}

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
          title={item.childCount > 0 ? "Delete this epic?" : "Delete this task?"}
          description={
            item.childCount > 0
              ? `Its ${item.childCount} ${item.childCount === 1 ? "task is" : "tasks are"} deleted too. This can't be undone.`
              : "This can't be undone."
          }
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
