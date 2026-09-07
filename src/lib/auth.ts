import { env } from "cloudflare:workers";
import type { GitHubEnv, StoredToken } from "./github";

const SESSION_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
const COOKIE = "bikelog_session";

export interface Session {
  login: string;
  state: string; // CSRF state bound to the session
}

/** Bindings/vars from the Cloudflare runtime, available via `cloudflare:workers`. */
export function makeEnv(): GitHubEnv {
  return env as unknown as GitHubEnv;
}

// ---- Session cookie helpers ----

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function sessionCookieHeader(token: string, maxAge: number): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(maxAge / 1000)}`;
}

/** Create a session token and bind a temporary oauth state to it. Stores in KV. */
export async function createSession(env: GitHubEnv, state: string): Promise<{ token: string; header: string }> {
  const token = crypto.randomUUID();
  const session: Session = { login: "", state };
  await env.BIKE_SESSIONS.put(token, JSON.stringify(session), { expirationTtl: 3600 });
  return { token, header: sessionCookieHeader(token, 3600 * 1000) };
}

/** Read a session from the request cookies (no KV fetch). */
export function readSessionToken(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies[COOKIE] || null;
}

/** Fetch the session record for a token. */
export async function getSession(env: GitHubEnv, token: string): Promise<Session | null> {
  const raw = await env.BIKE_SESSIONS.get(token);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/** Bind a login to an existing session and extend its TTL. */
export async function bindLogin(env: GitHubEnv, token: string, login: string): Promise<void> {
  const existing = await getSession(env, token);
  const session: Session = { login, state: existing?.state ?? "" };
  await env.BIKE_SESSIONS.put(token, JSON.stringify(session), { expirationTtl: Math.floor(SESSION_TTL / 1000) });
}

/** Clear a session (logout). */
export async function clearSession(env: GitHubEnv, token: string): Promise<void> {
  await env.BIKE_SESSIONS.delete(token);
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Get the currently connected login for a request, or null. */
export async function currentLogin(env: GitHubEnv, request: Request): Promise<string | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const session = await getSession(env, token);
  return session?.login || null;
}

/** Get the stored user token for the connected login, or null. */
export async function currentStoredToken(env: GitHubEnv, request: Request): Promise<StoredToken | null> {
  const login = await currentLogin(env, request);
  if (!login) return null;
  const { getStoredToken } = await import("./github");
  return getStoredToken(env, login);
}
