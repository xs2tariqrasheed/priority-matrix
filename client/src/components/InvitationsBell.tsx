import { useCallback, useEffect, useState } from "react";
import { App as AntApp, Badge, Button, Popover } from "antd";
import { BellOutlined, CheckOutlined, CloseOutlined, TeamOutlined } from "@ant-design/icons";
import { api } from "../api";
import { formatDateTime } from "../dates";
import { displayName } from "../people";
import type { Invitation } from "../types";

/** How often to look for new invitations while the app is open. */
const POLL_MS = 30_000;

interface Props {
  /** Called after accepting, so the shared epic and its tasks show up. */
  onAccepted: () => void;
}

/** Bell in the header with the epics other people invited you to; accept or reject each one. */
export function InvitationsBell({ onAccepted }: Props) {
  const { message } = AntApp.useApp();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    api.invitations.list().then(setInvitations, () => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const respond = async (inv: Invitation, accept: boolean) => {
    setBusy(inv.epic.id);
    try {
      await api.invitations.respond(inv.epic.id, accept);
      setInvitations((list) => list.filter((i) => i.epic.id !== inv.epic.id));
      if (accept) {
        message.success(`You joined "${inv.epic.title}"`);
        onAccepted();
      } else {
        message.info(`Declined "${inv.epic.title}"`);
      }
    } catch (e) {
      message.error((e as Error).message);
      load();
    } finally {
      setBusy(null);
    }
  };

  const count = invitations.length;
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
      title="Invitations"
      content={
        <div className="invites">
          {count === 0 ? (
            <p className="muted invites-empty">No invitations right now. When someone adds you to an epic, it shows up here.</p>
          ) : (
            <ul className="invite-list">
              {invitations.map((inv) => {
                const inviter = inv.invitedBy ?? inv.owner;
                return (
                  <li key={inv.epic.id} className="invite">
                    <TeamOutlined className="invite-icon" />
                    <div className="invite-body">
                      <strong className="invite-title">{inv.epic.title}</strong>
                      <small>
                        {displayName(inviter)} invited you · {formatDateTime(inv.invitedAt)}
                        {inviter.id !== inv.owner.id && <> · owned by {displayName(inv.owner)}</>}
                      </small>
                      <div className="invite-actions">
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={busy === inv.epic.id}
                          disabled={busy !== null && busy !== inv.epic.id}
                          onClick={() => respond(inv, true)}
                        >
                          Accept
                        </Button>
                        <Button size="small" icon={<CloseOutlined />} disabled={busy !== null} onClick={() => respond(inv, false)}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      }
    >
      <Badge count={count} size="small" offset={[-4, 4]}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined />}
          aria-label={count ? `${count} ${count === 1 ? "invitation" : "invitations"}` : "Invitations"}
          className="bell-btn"
        />
      </Badge>
    </Popover>
  );
}
