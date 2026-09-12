import {
  bikeStore,
  fuelStore,
  serviceStore,
  rideStore,
  modificationStore,
  checklistStore,
  hydrateAll,
  seedFromLocalStorage,
  clearLegacyLocalStorage,
  hasMemoryData,
  hasRepoData,
} from "./store";
import type { SyncDataFlat } from "./store";
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

async function pullRaw(): Promise<{ ok: boolean; data?: SyncDataFlat }> {
  return api<{ ok: boolean; data?: SyncDataFlat }>("/api/sync/pull");
}

export const sync = {
  /** Pull data from the user's repo into memory. Throws on error. */
  async pull(): Promise<void> {
    const res = await pullRaw();
    if (!res.ok) throw new Error("Pull failed");
    hydrateAll(res.data ?? {});
  },

  /** Push the current in-memory data to the user's repo (as Markdown). Throws on error. */
  async push(): Promise<void> {
    await api<{ ok: boolean }>("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          bikes: bikeStore.getAll(),
          fuel: fuelStore.getAll(),
          service: serviceStore.getAll(),
          rides: rideStore.getAll(),
          modifications: modificationStore.getAll(),
          checklists: checklistStore.getAll(),
        },
      }),
    });
  },

  /**
   * Boot-time sync. Seeds legacy localStorage once, then points memory at the
   * repo: pull wins when the repo has data; an empty repo gets seeded from any
   * in-memory data via a push. Legacy data keys are dropped only after memory
   * is in sync with the repo. Returns whether saving is enabled.
   */
  async boot(): Promise<{ saveEnabled: boolean; connected: boolean; repo: string | null }> {
    const me = await github.me();
    const connected = !!me.connected;
    const repo = me.repo ?? null;
    const saveEnabled = connected && !!repo;

    seedFromLocalStorage();

    if (saveEnabled) {
      let inSync = false;
      try {
        const res = await pullRaw();
        if (res.ok && hasRepoData(res.data)) {
          hydrateAll(res.data ?? {});
          inSync = true;
        }
      } catch {
        // Pull failed (offline/5xx) — keep seeded memory; try seeding the repo below.
      }
      if (!inSync && hasMemoryData()) {
        try {
          await sync.push();
          inSync = true;
        } catch {
          // Repo write failed — legacy keys stay so the next boot retries.
        }
      }
      if (inSync) clearLegacyLocalStorage();
    }

    return { saveEnabled, connected, repo };
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