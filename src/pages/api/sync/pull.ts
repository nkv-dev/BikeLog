import { currentLogin, makeEnv } from "@/lib/auth";
import { pullFromRepo, SyncError } from "@/lib/sync";

export const GET = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);
  try {
    const data = await pullFromRepo(env, context.request, login);
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e instanceof SyncError ? e.status : 500;
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
