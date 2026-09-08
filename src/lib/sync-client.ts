import {
  bikeStore,
  fuelStore,
  serviceStore,
  rideStore,
  modificationStore,
  checklistStore,
  hydrateAll,
  migrateLegacyIssues,
} from "./store";
import type { Bike } from "./types";

export interface MeResponse {
  connected: boolean;
  login?: string;
  name?: string | null;
  avatar_url?: string;
  repo?: string | null;
}

export interface RepoOption {
  full_name: string;
  name: string;
  private: boolean;
}

const j = (r: Response) => r.json();

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await j(res);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const github = {
  me: () => api<MeResponse>("/api/auth/me"),
  connectUrl: () => "/api/auth/connect",
  disconnect: () => api<{ ok: boolean }>("/api/auth/disconnect", { method: "POST" }),
  repos: () => api<{ connected: boolean; repos: (RepoOption & { default_branch: string })[]; selected: string | null }>("/api/auth/repos"),
  selectRepo: (repo: string) =>
    api<{ ok: boolean; repo: string }>("/api/auth/select-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo }),
    }),
};

export const sync = {
  /** Pull data from the user's repo into localStorage. Throws on error. */
  async pull(): Promise<void> {
    const { ok, data, error } = await api<{ ok: boolean; data?: any; error?: string }>("/api/sync/pull");
    if (!ok) throw new Error(error || "Pull failed");
    hydrateAll(data);
  },

  /** Push current localStorage data to the user's repo (as Markdown). Throws on error. */
  async push(): Promise<void> {
    migrateLegacyIssues();
    const data = {
      bikes: bikeStore.getAll(),
      fuel: fuelStore.getAll(),
      service: serviceStore.getAll(),
      rides: rideStore.getAll(),
      modifications: modificationStore.getAll(),
      checklists: checklistStore.getAll(),
    };
    await api<{ ok: boolean }>("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  },

  /** Upload a photo to bikelog/bikes/<slug>/media/ and return its repo-relative path. */
  async uploadPhoto(bike: Bike, file: File): Promise<string> {
    const form = new FormData();
    form.append("bikeName", bike.name);
    form.append("file", file);
    const { ok, path, error } = await api<{ ok: boolean; path?: string; error?: string }>(
      "/api/sync/upload",
      { method: "POST", body: form }
    );
    if (!ok) throw new Error(error || "Upload failed");
    return path!;
  },
};

/** URL to display a photo stored in the user's repo (auth via session cookie). */
export const mediaUrl = (path: string) => `/api/sync/media?path=${encodeURIComponent(path)}`;

/** True/False helper guards. */
export { fuelStore, serviceStore, rideStore, modificationStore, checklistStore };