import { currentLogin, makeEnv } from "@/lib/auth";
import { getUserAccessToken, listUserRepos, setSelectedRepo } from "@/lib/github";

export const POST = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);

  if (!login) {
    return new Response(JSON.stringify({ ok: false, error: "not_connected" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await getUserAccessToken(env, login);
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "not_connected" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { repo?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const repo = body.repo;
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_repo" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate the user can actually push to this repo (public or private) before
  // persisting the selection, so push/pull failures are caught early.
  let repos;
  try {
    repos = await listUserRepos(token);
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Couldn't verify repo access. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
  const accessible = repos.find((r) => r.full_name.toLowerCase() === repo.toLowerCase());
  if (!accessible) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "You don't have push access to that repo. Install the BikeLog GitHub App on it, then try again. Private repos work.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  await setSelectedRepo(env, login, accessible.full_name);
  return new Response(
    JSON.stringify({ ok: true, repo: accessible.full_name }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};