import { currentLogin, currentStoredToken, makeEnv } from "@/lib/auth";
import { setSelectedRepo } from "@/lib/github";

export const POST = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);
  const stored = login ? await currentStoredToken(env, context.request) : null;

  if (!login || !stored) {
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

  await setSelectedRepo(env, login, repo);
  return new Response(
    JSON.stringify({ ok: true, repo }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
