import { github } from "./sync-client";
import { showToast } from "./toast";

export interface SaveState {
  connected: boolean;
  repo: string | null;
}

let cached: SaveState | null = null;
let checkedAt = 0;
const CACHE_TTL = 60_000;

/** Session state used to decide whether saving is allowed (connected + repo chosen). */
export async function refreshSaveState(force = false): Promise<SaveState> {
  const now = Date.now();
  if (!force && cached && now - checkedAt < CACHE_TTL) return cached;
  try {
    const me = await github.me();
    cached = { connected: !!me.connected, repo: me.repo ?? null };
  } catch {
    cached = { connected: false, repo: null };
  }
  checkedAt = now;
  return cached;
}

export async function canSave(): Promise<boolean> {
  const s = await refreshSaveState();
  return s.connected && !!s.repo;
}

/**
 * Gate for mutating actions. Returns true when the user is connected to
 * GitHub AND has a data repo selected. Otherwise toasts a hint and returns
 * false so the caller can abort before mutating.
 */
export async function requireSave(): Promise<boolean> {
  const s = await refreshSaveState();
  if (s.connected && s.repo) return true;
  showToast(
    !s.connected ? "Connect GitHub to save your data" : "Pick a data repo in Settings to save",
    "info"
  );
  return false;
}