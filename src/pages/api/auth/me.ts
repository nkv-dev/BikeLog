import { currentLogin, currentStoredToken, makeEnv } from "@/lib/auth";
import { fetchUser, getSelectedRepo } from "@/lib/github";

export const GET = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);
  const stored = login ? await currentStoredToken(env, context.request) : null;

  if (!login || !stored) {
    return new Response(JSON.stringify({ connected: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let user;
  try {
    user = await fetchUser(stored.access_token);
  } catch {
    user = { login, name: null, avatar_url: stored.avatar_url ?? "", email: null };
  }

  const repo = await getSelectedRepo(env, login);

  return new Response(
    JSON.stringify({
      connected: true,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      repo,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
