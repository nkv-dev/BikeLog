import { createSession, makeEnv } from "@/lib/auth";

export const GET = async (context: any) => {
  const env = makeEnv();
  const state = crypto.randomUUID();

  const { token, header } = await createSession(env, state);

  const redirectUri = `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "repo user", // GitHub App user token: contents + repo creation + profile
    state,
  });
  const authorizeUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      "Set-Cookie": header,
    },
  });
};
