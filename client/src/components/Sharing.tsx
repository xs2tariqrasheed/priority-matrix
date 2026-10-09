import { useCallback, useEffect, useState } from "react";
import { App as AntApp, Button, Dropdown, Input, Popconfirm, Tooltip } from "antd";
import { CloseOutlined, DownOutlined, LogoutOutlined, UserAddOutlined, UserDeleteOutlined, UserOutlined } from "@ant-design/icons";
import { api } from "../api";
import { displayName } from "../people";
import type { Item, Member, Members, UserRef } from "../types";
import { UserAvatar } from "./UserAvatar";

/** An epic's owner and members, refetched when `version` changes (e.g. its member count). */
function useMembers(epicId: number, version: unknown) {
  const [members, setMembers] = useState<Members | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.members.list(epicId).then(
      (m) => {
        setMembers(m);
        setError(null);
      },
      (e) => setError((e as Error).message)
    );
  }, [epicId]);

  useEffect(() => {
    reload();
  }, [reload, version]);

  return { members, setMembers, error };
}

/** Owner first, then accepted members: everyone a task can be assigned to. */
const peopleOf = (m: Members): UserRef[] => [m.owner, ...m.members.filter((x) => x.status === "accepted").map((x) => x.user)];

const STATUS_LABEL: Record<Member["status"], string> = { accepted: "Member", pending: "Invited", rejected: "Declined" };

interface PeopleProps {
  epic: Item;
  meId: number;
  /** Membership changed (or you left): reload the items. */
  onChanged: () => void;
}

/**
 * Who an epic is shared with. Anyone on it can invite people by email or user id, withdraw
 * invitations, remove members or leave; invitees answer in the app.
 */
export function EpicPeople({ epic, meId, onChanged }: PeopleProps) {
  const { message } = AntApp.useApp();
  const { members, setMembers, error } = useMembers(epic.id, epic.memberCount);
  const [who, setWho] = useState("");
  const [inviting, setInviting] = useState(false);

  const invite = async (user = who.trim()) => {
    if (!user) return;
    setInviting(true);
    try {
      const next = await api.members.invite(epic.id, user);
      setMembers(next);
      setWho("");
      const invited = next.members.find((m) => m.user.email === user.toLowerCase() || String(m.user.id) === user);
      message.success(`Invitation sent to ${invited ? displayName(invited.user) : user}`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const remove = async (m: Member) => {
    const leaving = m.user.id === meId;
    try {
      const next = await api.members.remove(epic.id, m.user.id);
      if (leaving) {
        message.success(`You left "${epic.title}"`);
      } else {
        setMembers(next);
        message.success(m.status === "accepted" ? `${displayName(m.user)} removed` : `Invitation to ${displayName(m.user)} withdrawn`);
      }
      onChanged();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const accepted = members?.members.filter((m) => m.status === "accepted").length ?? epic.memberCount;
  return (
    <section className="detail-people">
      <header className="detail-tasks-head">
        <h3>
          People{accepted > 0 && <span className="count">shared with {accepted}</span>}
        </h3>
      </header>
      {error && !members ? (
        <p className="muted">Couldn't load the people on this epic: {error}</p>
      ) : (
        <ul className="people-list">
          {members && (
            <li className="person">
              <UserAvatar user={members.owner} size="md" />
              <span className="person-name">
                <span>
                  {displayName(members.owner)}
                  {members.owner.id === meId && <small> (you)</small>}
                </span>
                {members.owner.name && <small>{members.owner.email}</small>}
              </span>
              <span className="person-role is-owner">Owner</span>
            </li>
          )}
          {members?.members.map((m) => {
            const me = m.user.id === meId;
            return (
              <li key={m.user.id} className={`person is-${m.status}`}>
                <UserAvatar user={m.user} size="md" />
                <span className="person-name">
                  <span>
                    {displayName(m.user)}
                    {me && <small> (you)</small>}
                  </span>
                  {m.user.name && <small>{m.user.email}</small>}
                </span>
                <span className={`person-role is-${m.status}`}>{STATUS_LABEL[m.status]}</span>
                {m.status === "rejected" && (
                  <Tooltip title="Invite again">
                    <Button size="small" type="text" shape="circle" icon={<UserAddOutlined />} aria-label={`Invite ${displayName(m.user)} again`} onClick={() => invite(m.user.email)} />
                  </Tooltip>
                )}
                <Popconfirm
                  title={me ? "Leave this epic?" : m.status === "accepted" ? `Remove ${displayName(m.user)}?` : "Withdraw the invitation?"}
                  description={
                    me
                      ? "It and its tasks disappear from your matrix, and tasks assigned to you are unassigned."
                      : m.status === "accepted"
                        ? "They lose access to the epic and its tasks, and their tasks are unassigned."
                        : undefined
                  }
                  okText={me ? "Leave" : m.status === "accepted" ? "Remove" : "Withdraw"}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(m)}
                  placement="topRight"
                >
                  {me ? (
                    <Button size="small" type="text" danger icon={<LogoutOutlined />}>
                      Leave
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      type="text"
                      shape="circle"
                      icon={m.status === "accepted" ? <UserDeleteOutlined /> : <CloseOutlined />}
                      aria-label={m.status === "accepted" ? `Remove ${displayName(m.user)}` : `Withdraw the invitation to ${displayName(m.user)}`}
                    />
                  )}
                </Popconfirm>
              </li>
            );
          })}
        </ul>
      )}
      <div className="invite-form">
        <Input
          value={who}
          onChange={(e) => setWho(e.target.value)}
          onPressEnter={() => invite()}
          placeholder="Email or user id"
          prefix={<UserAddOutlined />}
          maxLength={200}
          aria-label="Invite by email or user id"
        />
        <Button onClick={() => invite()} loading={inviting} disabled={!who.trim()}>
          Invite
        </Button>
      </div>
      <p className="muted people-hint">
        They get an invitation in the app. Members can do everything you can: edit the epic, add, pick and assign its tasks, and invite others.
      </p>
    </section>
  );
}

interface AssigneeProps {
  /** A task inside an epic. */
  task: Item;
  meId: number;
  onAssign: (task: Item, userId: number | null) => Promise<void>;
}

/** Who has picked up a task in a shared epic, with Pick up / Assign / Unassign. */
export function TaskAssignee({ task, meId, onAssign }: AssigneeProps) {
  const { members } = useMembers(task.parentId!, task.memberCount);
  const [busy, setBusy] = useState(false);
  const assignee = task.assignee;

  const run = async (userId: number | null) => {
    setBusy(true);
    try {
      await onAssign(task, userId);
    } finally {
      setBusy(false);
    }
  };

  const others = members ? peopleOf(members).filter((p) => p.id !== assignee?.id) : [];
  return (
    <div className="detail-assignee">
      <span className="detail-assignee-label">Assignee</span>
      <span className="detail-assignee-who">
        {assignee ? (
          <>
            <UserAvatar user={assignee} />
            <span>{assignee.id === meId ? "You" : displayName(assignee)}</span>
          </>
        ) : (
          <span className="muted">Nobody yet</span>
        )}
      </span>
      <span className="detail-assignee-actions">
        {assignee?.id !== meId && (
          <Button size="small" type="primary" ghost icon={<UserOutlined />} loading={busy} onClick={() => run(meId)}>
            Pick up
          </Button>
        )}
        <Dropdown
          trigger={["click"]}
          disabled={busy || others.length === 0}
          menu={{
            items: others.map((p) => ({
              key: p.id,
              label: (
                <span className="assign-option">
                  <UserAvatar user={p} />
                  {p.id === meId ? "Me" : displayName(p)}
                </span>
              ),
              onClick: () => run(p.id),
            })),
          }}
        >
          <Button size="small">
            Assign <DownOutlined />
          </Button>
        </Dropdown>
        {assignee && (
          <Button size="small" type="text" disabled={busy} onClick={() => run(null)}>
            Unassign
          </Button>
        )}
      </span>
    </div>
  );
}
