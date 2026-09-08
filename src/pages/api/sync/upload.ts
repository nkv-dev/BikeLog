import { currentLogin, makeEnv } from "@/lib/auth";
import { getUserAccessToken, getSelectedRepo, uploadPhoto } from "@/lib/github";
import { bikeMediaPath, bikeSlug } from "@/lib/mdstore";

export const POST = async (context: any) => {
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

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Expected multipart form" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bikeName = (form.get("bikeName") as string) || "bike";
  const file = form.get("file") as File | null;
  if (!file) {
    return new Response(JSON.stringify({ ok: false, error: "Missing file" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ts = Date.now();
  const path = bikeMediaPath(bikeSlug(bikeName), `photo-${ts}.${ext}`);
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const savedPath = await uploadPhoto(env, repo, token, path, bytes, "BikeLog: add photo");
    return new Response(
      JSON.stringify({ ok: true, path: savedPath, name: file.name }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};