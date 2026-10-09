import type { Item, UserRef } from "./types";

export const displayName = (u: UserRef) => u.name.trim() || u.email;

export const initialsOf = (u: UserRef) => {
  const source = u.name.trim() || u.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
};

/** "You" for the signed-in user, otherwise their name. */
export const nameFor = (u: UserRef, meId: number) => (u.id === meId ? "You" : displayName(u));

/** Shared with someone: the item is an epic with members, or a task inside one. */
export const isShared = (i: Item) => i.memberCount > 0;

/**
 * Work that is the user's to do: assigned to them, or unassigned and in their own matrix.
 * Tasks someone else picked up in a shared epic are theirs, not the owner's.
 */
export const isMine = (i: Item, meId: number) => (i.assignee ? i.assignee.id === meId : i.owner.id === meId);
