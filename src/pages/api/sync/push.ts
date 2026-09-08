import { currentLogin, makeEnv } from "@/lib/auth";
import { pushToRepo, SyncError } from "@/lib/sync";
import type { SyncData } from "@/lib/sync";

export const POST = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);

  let body: { data?: SyncData };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body?.data) {
    return new Response(JSON.stringify({ ok: false, error: "missing_data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await pushToRepo(env, context.request, login, body.data);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e instanceof SyncError ? e.status : 500;
    const raw = (e as Error).message;
    const error = /Resource not accessible by integration/.test(raw)
      ? 'GitHub App missing "Contents: Read and write" permission. Grant it in GitHub → Settings → Developer settings → your app → Permissions → Repository permissions → Contents, save, then reconnect in Settings.'
      : raw;
    return new Response(JSON.stringify({ ok: false, error }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
