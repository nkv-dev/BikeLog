import {
  clearSession,
  clearSessionCookie,
  currentLogin,
  makeEnv,
  readSessionToken,
} from "@/lib/auth";
import { deleteUserToken } from "@/lib/github";

export const POST = async (context: any) => {
  const env = makeEnv();
  const token = readSessionToken(context.request);
  const login = await currentLogin(env, context.request);

  if (token) await clearSession(env, token);
  if (login) {
    try {
      await deleteUserToken(env, login);
    } catch {
      // Ignore revoke failures; local session is cleared regardless.
    }
  }

  const start = new URL(env.PUBLIC_SITE_URL.replace(/\/$/, ""));
  start.pathname = "/settings";
  return new Response(null, {
    status: 302,
    headers: { Location: start.toString(), "Set-Cookie": clearSessionCookie() },
  });
};
