import { createSession, makeEnv } from "@/lib/auth";

const SETUP_HELP = `
<style>
  body{font-family:system-ui,sans-serif;max-width:34rem;margin:auto;padding:2rem;line-height:1.6}
  code{background:#eee;padding:.1rem .35rem;border-radius:4px}
  a{color:#1b66ca}
</style>
<h1>BikeLog · GitHub App not configured</h1>
<p><strong>${"{{REASON}}"}</strong></p>
<p>To connect GitHub accounts, this deployment needs a GitHub App with its
<strong>Client ID</strong> and <strong>Client secret</strong> configured:</p>
<ol>
  <li>Create a GitHub App → <code>github.com/settings/apps/new</code> (see <code>docs/SETUP.md</code>).</li>
  <li>Set the callback URL to <code>${"{{PUBLIC_SITE_URL}}"}/api/auth/callback</code>.</li>
  <li>Set <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code>:
    <ul>
      <li>Production: <code>wrangler.jsonc</code> (vars) + <code>wrangler secret put GITHUB_CLIENT_SECRET</code></li>
      <li>Local dev: <code>.dev.vars</code> at the project root</li>
    </ul>
  </li>
  <li>Restart and try again — see <a href="/settings">Settings → GitHub Sync</a>.</li>
</ol>`;

function setupResponse(reason: string, siteUrl: string): Response {
  const html = SETUP_HELP.replaceAll("{{REASON}}", reason).replaceAll("{{PUBLIC_SITE_URL}}", siteUrl);
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export const GET = async (context: any) => {
  const env = makeEnv();
  const siteUrl = env.PUBLIC_SITE_URL?.replace(/\/$/, "") || "";

  if (!env.GITHUB_CLIENT_ID || env.GITHUB_CLIENT_ID.includes("REPLACE_WITH")) {
    return setupResponse("The GitHub Client ID is not configured for this deployment.", siteUrl || "<your-site>");
  }
  if (!env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET.includes("REPLACE_WITH")) {
    return setupResponse("The GitHub Client secret is not configured for this deployment.", siteUrl || "<your-site>");
  }
  if (!siteUrl) {
    return setupResponse("PUBLIC_SITE_URL is not configured.", "<your-site>");
  }

  const state = crypto.randomUUID();

  const { token, header } = await createSession(env, state);

  const redirectUri = `${siteUrl}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  });
  const authorizeUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  // Note: the bikelog_oauth_retry cookie is intentionally NOT cleared here —
  // callback.ts resumes this endpoint on GitHub App no-code hops and uses that
  // counter to bound the resume loop. Clearing it here would reset the counter
  // on every hop and hide a broken GitHub App configuration forever.

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      "Set-Cookie": header,
    },
  });
};
