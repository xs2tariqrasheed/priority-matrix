import { Tooltip } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import type { Item, UserRef } from "../types";
import { displayName, initialsOf, isShared } from "../people";

interface Props {
  user: UserRef;
  size?: "sm" | "md";
  /** Tooltip text; defaults to the person's name and email. */
  title?: string;
}

/** Round initials badge for a person. */
export function UserAvatar({ user, size = "sm", title }: Props) {
  const label = title ?? (user.name ? `${user.name} · ${user.email}` : user.email);
  return (
    <Tooltip title={label} mouseEnterDelay={0.3}>
      <span className={`user-avatar user-avatar-${size}`} aria-label={title ?? displayName(user)} role="img">
        {initialsOf(user)}
      </span>
    </Tooltip>
  );
}

/**
 * Compact sharing marker for a row: who picked up a task, or that an epic is shared
 * (and by whom, when it isn't yours).
 */
export function ShareMark({ item, meId }: { item: Item; meId: number }) {
  if (item.assignee) {
    return <UserAvatar user={item.assignee} title={`Assigned to ${item.assignee.id === meId ? "you" : displayName(item.assignee)}`} />;
  }
  if (item.parentId !== null || !isShared(item)) return null;
  const title =
    item.owner.id === meId
      ? `Shared with ${item.memberCount} ${item.memberCount === 1 ? "person" : "people"}`
      : `Shared by ${displayName(item.owner)}`;
  return (
    <Tooltip title={title} mouseEnterDelay={0.3}>
      <span className="share-mark" aria-label={title} role="img">
        <TeamOutlined />
        {item.memberCount + 1}
      </span>
    </Tooltip>
  );
}
