import type { Item, ItemInput, ItemPatch, Settings, User } from "./types";

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
  list: () => request<Item[]>(ITEMS),
  create: (input: ItemInput) => request<Item>(ITEMS, { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, patch: ItemPatch) =>
    request<Item>(`${ITEMS}/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: number) => request<void>(`${ITEMS}/${id}`, { method: "DELETE" }),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (patch: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
};
