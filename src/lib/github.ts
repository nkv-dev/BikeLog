export interface GitHubEnv {
  BIKE_TOKENS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_APP_ID: string;
  GITHUB_REPO_NAME: string;
  PUBLIC_SITE_URL: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_PRIVATE_KEY?: string;
}

export interface StoredToken {
  login: string;
  access_token: string;
  refresh_token?: string;
  expires_at: number; // ms epoch
  scope?: string;
  avatar_url?: string;
}

const GH = "https://api.github.com";
const TOKEN_TTL = 8 * 60 * 60 * 1000; // GitHub App user tokens expire in 8h

const GITHUB_TOKEN_KEY = (login: string) => `gh:${login}`;

function ghHeaders(token: string, json = false): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${token}`,
    "User-Agent": "bikelog",
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function ghFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: { ...ghHeaders(token, !!init?.body), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ---- Token store (KV) ----

export async function getStoredToken(env: GitHubEnv, login: string): Promise<StoredToken | null> {
  const raw = await env.BIKE_TOKENS.get(GITHUB_TOKEN_KEY(login));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

export async function refreshUserToken(env: GitHubEnv, stored: StoredToken): Promise<StoredToken> {
  if (!stored.refresh_token) return stored;
  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: stored.refresh_token,
  });
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json()) as Record<string, string>;
  if (!data.access_token) {
    await env.BIKE_TOKENS.delete(GITHUB_TOKEN_KEY(stored.login));
    throw new Error("GitHub token refresh failed; session invalidated");
  }
  const updated: StoredToken = {
    ...stored,
    access_token: data.access_token,
    refresh_token: data.refresh_token || stored.refresh_token,
    expires_at: Date.now() + (data.expires_in ? Number(data.expires_in) * 1000 : TOKEN_TTL),
  };
  await env.BIKE_TOKENS.put(GITHUB_TOKEN_KEY(stored.login), JSON.stringify(updated));
  return updated;
}

/** Returns a valid (possibly refreshed) access token for the user, or null. */
export async function getUserAccessToken(env: GitHubEnv, login: string): Promise<string | null> {
  const stored = await getStoredToken(env, login);
  if (!stored || !stored.access_token) return null;
  if (Date.now() >= stored.expires_at) {
    try {
      const refreshed = await refreshUserToken(env, stored);
      return refreshed.access_token;
    } catch {
      return null;
    }
  }
  return stored.access_token;
}

export async function saveUserToken(env: GitHubEnv, stored: StoredToken): Promise<void> {
  await env.BIKE_TOKENS.put(GITHUB_TOKEN_KEY(stored.login), JSON.stringify(stored));
}

export async function deleteUserToken(env: GitHubEnv, login: string): Promise<void> {
  await env.BIKE_TOKENS.delete(GITHUB_TOKEN_KEY(login));
}

// ---- Selected repo (per user) ----

const REPO_KEY = (login: string) => `bikelog_repo:${login}`;

export async function getSelectedRepo(env: GitHubEnv, login: string): Promise<string | null> {
  return env.BIKE_TOKENS.get(REPO_KEY(login));
}

export async function setSelectedRepo(env: GitHubEnv, login: string, fullName: string): Promise<void> {
  await env.BIKE_TOKENS.put(REPO_KEY(login), fullName);
}

// ---- User / repos ----

export interface GHUser {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface GHRepo {
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  permissions?: { push: boolean };
  updated_at: string;
}

export async function fetchUser(token: string): Promise<GHUser> {
  const u = await ghFetch<{
    login: string;
    name: string | null;
    avatar_url: string;
    email: string | null;
  }>("/user", token);
  return u;
}

/** List the user's authored repos (repos they can push to). */
export async function listUserRepos(token: string): Promise<GHRepo[]> {
  const repos: GHRepo[] = [];
  let page = 1;
  while (page <= 5) {
    const batch = await ghFetch<
      (GHRepo & { owner: { login: string }; fork: boolean })[]
    >(`/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator&sort=updated`, token);
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  // Allow any repo the user can push to (not just forks-visible), including private.
  return repos
    .filter((r) => !r.fork)
    .map((r) => ({
      full_name: r.full_name,
      name: r.name,
      private: r.private,
      default_branch: r.default_branch,
      permissions: r.permissions,
      updated_at: r.updated_at,
    }));
}

// ---- Contents API ----

interface GHTreeEntry {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000";
  type: "blob" | "tree" | "commit";
  sha?: string | null;
  content?: string;
}

export interface GHContentItem {
  type: "file" | "dir" | "submodule" | "symlink";
  name: string;
  path: string;
  sha: string;
  download_url: string | null;
}

/** List the root (or subpath) of the repo, returning files & dirs. */
export async function listRepo(env: GitHubEnv, full: string, token: string, path = ""): Promise<GHContentItem[]> {
  const p = path ? `/${path}` : "";
  return ghFetch<GHContentItem[]>(`/repos/${full}/contents${p}`, token);
}

/** Read a UTF-8 text file from the repo. Returns content or null if missing. */
export async function readTextFile(env: GitHubEnv, full: string, token: string, path: string): Promise<string | null> {
  const res = await fetch(`${GH}/repos/${full}/contents/${path}`, { headers: ghHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Read failed ${res.status} for ${path}`);
  const data = (await res.json()) as { content: string; encoding: string; sha: string };
  if (!data || data.encoding !== "base64") return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/** Write one file via the Contents API (creates or updates). Returns commit sha. */
export async function writeTextFile(
  env: GitHubEnv,
  full: string,
  token: string,
  path: string,
  content: string,
  message = "Update via BikeLog"
): Promise<string> {
  const body: Record<string, string> = { message, content: b64(content) };
  const existing = await getFileSha(full, token, path);
  if (existing) body.sha = existing;
  const res = await ghFetch<{ commit: { sha: string } }>(`/repos/${full}/contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.commit.sha;
}

/** Read a binary file from the repo (e.g. a photo). Throws if missing. */
export async function readBinaryFile(
  env: GitHubEnv,
  full: string,
  token: string,
  path: string
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await fetch(`${GH}/repos/${full}/contents/${path}`, {
    headers: { ...ghHeaders(token), Accept: "application/vnd.github.raw+json" },
  });
  if (!res.ok) throw new Error(`Read failed ${res.status} for ${path}`);
  const bytes = await res.arrayBuffer();
  const contentType =
    res.headers.get("content-type") || contentTypeFromPath(path) || "application/octet-stream";
  return { bytes, contentType };
}

/** Delete one file from the repo via the Contents API. */
export async function deleteFile(
  env: GitHubEnv,
  full: string,
  token: string,
  path: string,
  message = "Delete via BikeLog"
): Promise<void> {
  const sha = await getFileSha(full, token, path);
  if (!sha) return;
  await ghFetch(`/repos/${full}/contents/${path}`, token, {
    method: "DELETE",
    body: JSON.stringify({ message, sha }),
  });
}

function contentTypeFromPath(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
    jfif: "image/jpeg",
  };
  return map[ext] ?? null;
}

/** Best-effort: fetch the sha of a file if present, for updates. */
async function getFileSha(full: string, token: string, path: string): Promise<string | null> {
  const res = await fetch(`${GH}/repos/${full}/contents/${path}`, { headers: ghHeaders(token) });
  if (!res.ok) return null;
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

// ---- Git Data API (bulk commit for photos / multiple files) ----

/**
 * Read the head SHA of a branch. Returns null when the repo has no commits yet
 * (git refs don't exist), so callers can bootstrap an empty repo.
 */
async function getHeadShaOrNull(full: string, token: string, branch: string): Promise<string | null> {
  try {
    const head = await ghFetch<{ object: { sha: string } }>(`/repos/${full}/git/ref/heads/${branch}`, token);
    return head.object.sha;
  } catch (err) {
    // 409 "Git Repository is empty" / 404 -> repo has no commits, no refs.
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : String(err);
    if (/^GitHub API 40[49]/.test(msg) || /Git Repository is empty/.test(msg)) return null;
    throw err;
  }
}

export async function commitFiles(
  env: GitHubEnv,
  full: string,
  token: string,
  files: { path: string; content: string }[],
  message = "Update via BikeLog"
): Promise<void> {
  const defaultBranch = await getDefaultBranch(full, token);
  const headSha = await getHeadShaOrNull(full, token, defaultBranch);

  const entries: GHTreeEntry[] = [];
  if (headSha) {
    const tree = await ghFetch<{ tree: GHTreeEntry[] }>(`/repos/${full}/git/trees/${headSha}`, token);
    entries.push(...tree.tree);
  }
  for (const f of files) {
    const blob = await ghFetch<{ sha: string }>(`/repos/${full}/git/blobs`, token, {
      method: "POST",
      body: JSON.stringify({ content: f.content, encoding: "base64" }),
    });
    const idx = entries.findIndex((e) => e.path === f.path);
    if (idx !== -1) {
      entries[idx] = { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
    } else {
      entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
    }
  }

  const newTree = await ghFetch<{ sha: string }>(`/repos/${full}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ ...(headSha ? { base_tree: headSha } : {}), tree: entries }),
  });
  const commit = await ghFetch<{ sha: string }>(`/repos/${full}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: headSha ? [headSha] : [] }),
  });
  if (headSha) {
    await ghFetch(`/repos/${full}/git/refs/heads/${defaultBranch}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } else {
    // Empty repo: create the default branch with the initial commit.
    await ghFetch(`/repos/${full}/git/refs`, token, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${defaultBranch}`, sha: commit.sha }),
    });
  }
}

async function getDefaultBranch(full: string, token: string): Promise<string> {
  const repo = await ghFetch<{ default_branch: string }>(`/repos/${full}`, token);
  return repo.default_branch;
}

export interface RepoTreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

/** Recursively list the repo tree, optionally filtered to a path prefix. */
export async function getRepoTree(
  env: GitHubEnv,
  full: string,
  token: string,
  prefix = ""
): Promise<RepoTreeEntry[]> {
  const branch = await getDefaultBranch(full, token);
  const tree = await ghFetch<{ tree: RepoTreeEntry[] }>(
    `/repos/${full}/git/trees/${branch}?recursive=1`,
    token
  );
  if (!prefix) return tree.tree;
  return tree.tree.filter((t) => t.path.startsWith(prefix + "/"));
}

/** Upload a binary photo to assets/<path>. Returns the in-repo relative path. */
export async function uploadPhoto(
  env: GitHubEnv,
  full: string,
  token: string,
  path: string,
  bytes: Uint8Array,
  message = "Add photo via BikeLog"
): Promise<string> {
  await commitFiles(env, full, token, [{ path, content: b64(bytes) }], message);
  return path;
}

function b64(input: string | Uint8Array): string {
  if (typeof input === "string") return Buffer.from(input, "utf-8").toString("base64");
  return Buffer.from(input).toString("base64");
}
