import { currentLogin, makeEnv } from "@/lib/auth";
import { getSelectedRepo, getUserAccessToken, readBinaryFile } from "@/lib/github";

/** Serve a file from the user's repo (photos live under bikelog/assets/). */
export const GET = async (context: any) => {
  const env = makeEnv();
  const login = await currentLogin(env, context.request);
  if (!login) {
    return new Response(JSON.stringify({ ok: false, error: "Not connected" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await getUserAccessToken(env, login);
  const repo = await getSelectedRepo(env, login);
  if (!token || !repo) {
    return new Response(JSON.stringify({ ok: false, error: "No repo selected" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(context.request.url);
  const path = url.searchParams.get("path") || "";
  if (!path.startsWith("bikelog/assets/") || path.includes("..")) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { bytes, contentType } = await readBinaryFile(env, repo, token, path);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
};