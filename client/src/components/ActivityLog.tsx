import { useEffect, useState, type ReactNode } from "react";
import { Button, Modal, Skeleton } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  HistoryOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  SwapOutlined,
  UndoOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { api } from "../api";
import { formatDateTime } from "../dates";
import { nameFor } from "../people";
import type { Item, LogEntry, UserRef } from "../types";

interface Props {
  item: Item;
  meId: number;
}

/** "Activity" button that opens the item's log; an epic's log includes its tasks. */
export function ActivityButton({ item, meId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="text" icon={<HistoryOutlined />} onClick={() => setOpen(true)}>
        Activity
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
        title={
          <span className="activity-title">
            Activity <small>{item.title}</small>
          </span>
        }
      >
        <ActivityList item={item} meId={meId} />
      </Modal>
    </>
  );
}

function ActivityList({ item, meId }: Props) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.logs(item.id).then(
      (l) => !cancelled && setLogs(l),
      (e) => !cancelled && setError((e as Error).message)
    );
    return () => {
      cancelled = true;
    };
  }, [item.id, attempt]);

  if (error) {
    return (
      <div className="activity-empty">
        <p>Couldn't load the activity: {error}</p>
        <Button icon={<ReloadOutlined />} onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!logs) return <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  if (logs.length === 0) return <p className="muted activity-empty">Nothing recorded yet.</p>;

  return (
    <ol className="activity-list">
      {logs.map((l) => {
        const { icon, text, tone } = describe(l, meId);
        return (
          <li key={l.id} className="activity">
            <span className={`activity-icon${tone ? ` is-${tone}` : ""}`}>{icon}</span>
            <div className="activity-body">
              <p>
                <strong>{l.actor ? nameFor(l.actor, meId) : "Someone"}</strong> {text}
              </p>
              <small>
                {formatDateTime(l.createdAt)}
                {l.itemId !== item.id && <span className="activity-on"> · {l.itemTitle}</span>}
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: "the title",
  area: "the area",
  category: "the category",
  impact: "the impact",
  focus: "the focus",
  notes: "the notes",
  allocatedMinutes: "the allocated time",
  spentMinutes: "the time spent",
  progress: "the progress",
  deadline: "the deadline",
};

const list = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

const str = (v: unknown) => (typeof v === "string" ? v : null);

/** One line of the log: an icon and what the actor did, phrased from the reader's point of view. */
function describe(l: LogEntry, meId: number): { icon: ReactNode; text: ReactNode; tone?: "ok" | "warn" | "accent" } {
  const who = (u: UserRef | null) => (u ? <strong>{u.id === meId ? "you" : nameFor(u, meId)}</strong> : "someone");
  const d = l.details;
  switch (l.action) {
    case "created":
      return { icon: <PlusOutlined />, text: "created this" };
    case "updated": {
      const fields = Array.isArray(d.fields) ? (d.fields as string[]).map((f) => FIELD_LABELS[f] ?? f) : [];
      return { icon: <EditOutlined />, text: fields.length ? `changed ${list(fields)}` : "made changes" };
    }
    case "completed":
      return { icon: <CheckCircleOutlined />, text: "marked it done", tone: "ok" };
    case "reopened":
      return { icon: <UndoOutlined />, text: "reopened it" };
    case "moved": {
      const to = str(d.to);
      const from = str(d.from);
      return { icon: <SwapOutlined />, text: to ? <>moved it into “{to}”</> : <>moved it out of “{from}” to the top level</> };
    }
    case "task_moved_out":
      return { icon: <ExportOutlined />, text: <>moved the task “{str(d.title)}” {str(d.to) ? <>to “{str(d.to)}”</> : "out of this epic"}</> };
    case "task_deleted":
      return { icon: <DeleteOutlined />, text: <>deleted the task “{str(d.title)}”</>, tone: "warn" };
    case "invited":
      return { icon: <UserAddOutlined />, text: <>invited {who(l.target)}</>, tone: "accent" };
    case "invite_cancelled":
      return { icon: <StopOutlined />, text: <>withdrew the invitation to {who(l.target)}</> };
    case "accepted":
      return { icon: <LoginOutlined />, text: "accepted the invitation and joined", tone: "ok" };
    case "rejected":
      return { icon: <StopOutlined />, text: "declined the invitation", tone: "warn" };
    case "removed":
      return { icon: <UserDeleteOutlined />, text: <>removed {who(l.target)} from the epic</>, tone: "warn" };
    case "left":
      return { icon: <LogoutOutlined />, text: "left the epic", tone: "warn" };
    case "picked":
      return {
        icon: <UserOutlined />,
        text: <>picked up this task{str(d.previous) && <> (it was assigned to {str(d.previous)})</>}</>,
        tone: "accent",
      };
    case "assigned":
      return {
        icon: <UserOutlined />,
        text: <>assigned it to {who(l.target)}{str(d.previous) && <> (was {str(d.previous)})</>}</>,
        tone: "accent",
      };
    case "unassigned": {
      const reason = str(d.reason);
      // Leaving unassigns the leaver's own tasks: actor and target are the same person.
      if (reason === "left") return { icon: <UserDeleteOutlined />, text: "was unassigned on leaving the epic" };
      const why =
        reason === "removed" ? " when they were removed from the epic" : reason === "moved" ? " when the task was moved" : "";
      return { icon: <UserDeleteOutlined />, text: <>unassigned {who(l.target)}{why}</> };
    }
    default:
      return { icon: <HistoryOutlined />, text: l.action.replace(/_/g, " ") };
  }
}
