import {
  bindLogin,
  getSession,
  makeEnv,
  readSessionToken,
} from "@/lib/auth";
import { fetchUser, saveUserToken } from "@/lib/github";

export const GET = async (context: any) => {
  const env = makeEnv();
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const redirectUri = `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/callback`;

  const token = readSessionToken(context.request);
  const session = token ? await getSession(env, token) : null;

  const fail = (msg: string) =>
    new Response(`<h1>BikeLog — setup error</h1><p>${msg}</p>`, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });

  // GitHub App installation just completed: GitHub redirects to the app's
  // post-installation URL (our callback) with setup_action=install and no
  // OAuth code/state. Resume the OAuth flow so the user gets code+state.
  const setupAction = url.searchParams.get("setup_action");
  const installationId = url.searchParams.get("installation_id");
  if (!code && (setupAction === "install" || installationId)) {
    return new Response(null, { status: 302, headers: { Location: "/api/auth/connect" } });
  }

  // User denied / error from GitHub
  if (error) return fail(`Authorization was cancelled or failed (${error}). <a href="/settings">Go back</a>`);
  if (!code) return fail("Missing authorization code. <a href='/'>Go back</a>");
  if (!state || !session || session.state !== state) {
    return fail("Invalid state parameter (CSRF check failed). Please try connecting again.");
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

  const start = new URL(env.PUBLIC_SITE_URL.replace(/\/$/, ""));
  return new Response(null, { status: 302, headers: { Location: start.toString() } });
};
