import { currentLogin, currentStoredToken, makeEnv } from "@/lib/auth";
import { getSelectedRepo, listUserRepos } from "@/lib/github";

export const GET = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);
  const stored = login ? await currentStoredToken(env, context.request) : null;

  if (!login || !stored) {
    return new Response(JSON.stringify({ connected: false, repos: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = stored.access_token;
  const repos = await listUserRepos(accessToken).catch(() => []);
  const selected = await getSelectedRepo(env, login);

  return new Response(
    JSON.stringify({ connected: true, repos, selected }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
