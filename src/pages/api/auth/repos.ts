import { currentLogin, currentStoredToken, makeEnv } from "@/lib/auth";
import { getSelectedRepo, getUserAccessToken, listUserRepos } from "@/lib/github";

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

  // Auto-refresh the (8h-lived) GitHub App token so private + public repos list
  // correctly long after the original OAuth exchange.
  const token = await getUserAccessToken(env, login);
  const repos = token ? await listUserRepos(token).catch(() => []) : [];
  const selected = await getSelectedRepo(env, login);

  return new Response(
    JSON.stringify({ connected: true, repos, selected }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};