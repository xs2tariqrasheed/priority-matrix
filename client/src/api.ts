import type { Item, ItemInput, ItemPatch, Settings } from "./types";

const BASE = "/api/items";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
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
    throw new Error(message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  list: () => request<Item[]>(BASE),
  create: (input: ItemInput) => request<Item>(BASE, { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, patch: ItemPatch) =>
    request<Item>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: number) => request<void>(`${BASE}/${id}`, { method: "DELETE" }),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (patch: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
};
