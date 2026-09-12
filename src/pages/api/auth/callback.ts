import {
  bindLogin,
  getSession,
  makeEnv,
  readSessionToken,
  sessionCookie,
} from "@/lib/auth";
import { fetchUser, saveUserToken } from "@/lib/github";

const RETRY_COOKIE = "bikelog_oauth_retry";
const MAX_RETRIES = 8;
const RETRY_TTL = 10 * 60; // seconds the retry counter is meaningful

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function retryCookie(count: number): string {
  return `${RETRY_COOKIE}=${count}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${RETRY_TTL}`;
}

function clearRetryCookie(): string {
  return `${RETRY_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export const GET = async (context: any) => {
  const env = makeEnv();
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const redirectUri = `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/callback`;
  const start = new URL(env.PUBLIC_SITE_URL.replace(/\/$/, ""));

  const token = readSessionToken(context.request);
  const session = token ? await getSession(env, token) : null;
  const retries = Number(readCookie(context.request, RETRY_COOKIE) || 0);

  // Failure page with diagnostics: this is a GitHub App OAuth endpoint, and
  // hop-level issues are otherwise invisible. Echoing what GitHub actually sent
  // (and what we were expecting) makes a stuck flow actionable instead of a
  // dead end.
  const fail = (msg: string) => {
    const raw = url.search || "(no query params)";
    const body = `<!doctype html><meta charset="utf-8"><title>BikeLog — setup error</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:40rem;margin:auto;padding:2rem;line-height:1.6}
  code{background:#eee;padding:.1rem .35rem;border-radius:4px;word-break:break-all}
  pre{background:#f4f4f4;padding:.6rem;border-radius:6px;overflow:auto;font-size:.85rem}
  a{color:#1b66ca}
</style>
<h1>BikeLog — setup error</h1>
<p>${msg}</p>
<p><a href="/api/auth/connect">Try connecting again</a> · <a href="/settings">Go to Settings</a></p>
<h2>Diagnostics</h2>
<pre>received query: ${raw}
redirect_uri:   ${redirectUri}
session found:  ${session ? "yes" : "no"}
pending state:  ${session?.state ? "yes" : "no"} (${session?.state === state ? "matches" : "mismatch/none"})
retry count:    ${retries}</pre>
<p>Checked: the <em>Callback URL</em> in the GitHub App settings must be exactly
<code>${redirectUri}</code> and it should be the <strong>first</strong> URL listed. If GitHub
keeps redirecting here with no <code>code</code>, open the app's settings and turn
<strong>off</strong> “Request user authorization (OAuth) during installation”, then retry.</p>`;
    return new Response(body, { status: 400, headers: { "Content-Type": "text/html" } });
  };

  // GitHub App OAuth redirects to this callback WITHOUT a code on the
  // post-installation hop (setup_action=install + installation_id) and, for some
  // App configurations, as a bare redirect. Those are "install not yet issued a
  // code" signals: resume the web application flow (fresh CSRF state) instead of
  // dead-ending. Bounded by a retry counter so a genuinely broken config shows a
  // clear diagnostic rather than an invisible loop.
  const resumeFlow = (): Response => {
    if (retries >= MAX_RETRIES) {
      return fail("GitHub did not complete the sign-in flow. Please try connecting again.");
    }
    return new Response(null, {
      status: 302,
      headers: { Location: "/api/auth/connect", "Set-Cookie": retryCookie(retries + 1) },
    });
  };

  const setupAction = url.searchParams.get("setup_action");
  const installationId = url.searchParams.get("installation_id");
  if (setupAction === "install" || (installationId && !state)) {
    return resumeFlow();
  }

  // User denied / error from GitHub
  if (error) return fail(`Authorization was cancelled or failed (${error}).`);

  // No code and no error: not a completed authorization. If there is no pending
  // session, there is nothing to resume — explain.
  if (!code) {
    if (!session) {
      return fail("No active sign-in flow was found, so there is nothing to complete here.");
    }
    return resumeFlow();
  }

  // The code must match the CSRF state bound to the pending session. A stale or
  // expired pending session (connect issues a 1h cookie/TTL) is restarted.
  if (!session || session.state !== state) {
    return resumeFlow();
  }

  // Exchange the code for a GitHub App user access token
  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokData = (await res.json()) as Record<string, string>;
  if (!tokData.access_token) return fail("Failed to obtain an access token from GitHub.");

  // Fetch the user to know who signed in
  const user = await fetchUser(tokData.access_token).catch(() => null);
  if (!user) return fail("Failed to read your GitHub profile.");

  const stored = {
    login: user.login,
    access_token: tokData.access_token,
    refresh_token: tokData.refresh_token,
    expires_at:
      Date.now() + (tokData.expires_in ? Number(tokData.expires_in) * 1000 : 8 * 60 * 60 * 1000),
    scope: tokData.scope,
    avatar_url: user.avatar_url,
  };

  await saveUserToken(env, stored);
  await bindLogin(env, token!, user.login);

  // Re-issue the cookie with the 90-day Max-Age — the connect-time cookie was
  // only 1h (pending OAuth state) and otherwise the user would log out an hour
  // after connecting. Also clear any OAuth retry counter.
  return new Response(null, {
    status: 302,
    headers: {
      Location: start.toString(),
      "Set-Cookie": [clearRetryCookie(), sessionCookie(token!)],
    },
  });
};