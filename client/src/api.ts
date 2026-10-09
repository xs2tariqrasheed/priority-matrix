import type { ApiItem, Invitation, ItemInput, ItemPatch, LogEntry, Members, Settings, User } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Fired when any request (other than sign-in checks) comes back 401, so the app can show the sign-in screen. */
export const UNAUTHORIZED_EVENT = "priority-matrix:unauthorized";

async function request<T>(url: string, init: RequestInit = {}, opts: { quiet401?: boolean } = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.issues?.length) message = body.issues.map((i: { message: string }) => i.message).join(", ");
      else if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && !opts.quiet401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const ITEMS = "/api/items";

export const api = {
  auth: {
    me: () => request<{ user: User }>("/api/auth/me", {}, { quiet401: true }).then((r) => r.user),
    login: (email: string, password: string) =>
      request<{ user: User }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
        { quiet401: true }
      ).then((r) => r.user),
    logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  },
  list: () => request<ApiItem[]>(ITEMS),
  get: (id: number) => request<ApiItem>(`${ITEMS}/${id}`),
  create: (input: ItemInput) => request<ApiItem>(ITEMS, { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, patch: ItemPatch) =>
    request<ApiItem>(`${ITEMS}/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: number) => request<void>(`${ITEMS}/${id}`, { method: "DELETE" }),
  /** Pick up (your own id), assign (someone else's) or unassign (null) a task inside an epic. */
  assign: (id: number, userId: number | null) =>
    request<ApiItem>(`${ITEMS}/${id}/assignee`, { method: "PUT", body: JSON.stringify({ userId }) }),
  logs: (id: number) => request<LogEntry[]>(`${ITEMS}/${id}/logs`),
  members: {
    list: (epicId: number) => request<Members>(`${ITEMS}/${epicId}/members`),
    /** `user` is an email address or a numeric user id. */
    invite: (epicId: number, user: string) =>
      request<Members>(`${ITEMS}/${epicId}/members`, { method: "POST", body: JSON.stringify({ user }) }),
    /** Removes a member, withdraws an invitation, or leaves the epic when it is your own id. */
    remove: (epicId: number, userId: number) => request<Members>(`${ITEMS}/${epicId}/members/${userId}`, { method: "DELETE" }),
  },
  invitations: {
    list: () => request<Invitation[]>("/api/invitations"),
    respond: (epicId: number, accept: boolean) =>
      request<void>(`/api/invitations/${epicId}/${accept ? "accept" : "reject"}`, { method: "POST" }),
  },
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (patch: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
};
