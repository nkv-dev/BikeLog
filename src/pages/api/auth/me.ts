import { currentLogin, currentStoredToken, makeEnv, readSessionToken, sessionCookie } from "@/lib/auth";
import { fetchUser, getSelectedRepo, getUserAccessToken } from "@/lib/github";

export const GET = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);
  const stored = login ? await currentStoredToken(env, context.request) : null;
  const sessionToken = readSessionToken(context.request);

  const renew = (body: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        // Sliding renewal: as long as the user has a session, keep the cookie
        // (and its 90-day Max-Age) live so they don't get logged out.
        ...(login && sessionToken ? { "Set-Cookie": sessionCookie(sessionToken) } : {}),
        ...(init.headers || {}),
      },
    });

  if (!login || !stored) {
    return renew({ connected: false });
  }

  // Use the auto-refreshing token path (GitHub App tokens expire in ~8h).
  const token = await getUserAccessToken(env, login);

  let user;
  if (token) {
    try {
      user = await fetchUser(token);
    } catch {
      user = { login, name: null, avatar_url: stored.avatar_url ?? "", email: null };
    }
  } else {
    user = { login, name: null, avatar_url: stored.avatar_url ?? "", email: null };
  }

  const repo = await getSelectedRepo(env, login);

  return renew({
    connected: true,
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
    repo,
  });
};