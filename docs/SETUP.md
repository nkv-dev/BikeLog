# Self-Hosting Guide

BikeLog is **local-first**: your data lives in `localStorage` in your browser and in a **GitHub repo you own**, stored as Markdown. The backend runs as a single Cloudflare Worker (Astro SSR) that only:

1. completes the GitHub OAuth handshake (keeps the app's client secret server-side), and
2. calls the GitHub API on your behalf (reads/writes `bikelog/` in your repo).

The app itself stores **no user data**. That means a single shared front-end works for everyone; each person keeps their own data in their own repo.

---

## 1. Prerequisites

- A GitHub account.
- A Cloudflare account.
- **Node.js ≥ 22.12** and `pnpm` locally (or use Cloudflare's dashboard).
- `wrangler` is already a dependency (`pnpm exec wrangler …`).

---

## 2. Create a GitHub App (one per deployment)

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**.
2. **GitHub App name**: `BikeLog` (must be unique globally; add a suffix if taken).
3. **Homepage URL**: your deployed site URL (or `http://localhost:4321` during testing).
4. **Callback URL**: `https://<your-site>/api/auth/callback`
5. **Permissions → Repository permissions** (set all of these to **Read & write**):
   - **Contents** — required (read/write `bikelog/` Markdown + photos)
   - **Metadata** — required (read-only is enough; the app sets it)
   - *Optional*: **Webhooks** (only if you want auto-sync on change)
6. **Where can this GitHub App be installed?** → **Any account** (so any user can connect).
7. **Disable webhook** (deactivate) unless you plan to build auto-sync.
8. Create the app, then note down:
   - **Client ID** and **Client secret** → set as `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
   - **App ID** → set as `GITHUB_APP_ID`
   - **Generate a private key** (download `.pem`) → set as `GITHUB_PRIVATE_KEY` *(optional; only needed for app-level signing — not required for the user token flow)*.

---

## 3. Cloudflare Worker setup

### KV namespaces

BikeLog uses two KV namespaces:

```bash
pnpm exec wrangler kv namespace create BIKE_TOKENS   # stores GitHub access tokens per login
pnpm exec wrangler kv namespace create BIKE_SESSIONS # stores session/CSRF records
```

Copy the two returned **id**s into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "BIKE_TOKENS",   "id": "<from wrangler create>" },
  { "binding": "BIKE_SESSIONS", "id": "<from wrangler create>" }
]
```

### Vars

Edit `wrangler.jsonc`:

```jsonc
"vars": {
  "GITHUB_CLIENT_ID": "<your github app client id>",
  "GITHUB_APP_ID": "<your github app id>",
  "PUBLIC_SITE_URL": "https://<your-site>/",
  "GITHUB_REPO_NAME": "bikelog"   // legacy default; per-user repo selection replaces this
}
```

`PUBLIC_SITE_URL` must be the public URL of your install (it builds the OAuth redirect URIs).

### Secrets

```bash
pnpm exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm exec wrangler secret put GITHUB_PRIVATE_KEY     # optional
```

Never commit secrets. `*.pem`, `secrets/` and `.env.local` are git-ignored.

### Local dev

Create `.dev.vars` locally (git-ignored) so `astro dev` can read the same vars/secrets:

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_APP_ID=...
PUBLIC_SITE_URL=http://localhost:4321
```

> **Note:** local dev currently resolves runtime bindings via `import { env } from "cloudflare:workers"`. KV is only wired when running through the Worker runtime (`wrangler dev`) or the Astro Cloudflare adapter. Plain `astro dev` without the adapter shim will serve pages but API endpoints touching KV may need `wrangler dev` to work fully.

---

## 4. Deploy

```bash
pnpm install
pnpm build          # astro build (output: server via @astrojs/cloudflare)

pnpm exec wrangler deploy
```

Each deploy uploads the Worker + static assets. No Pages project needed (Workers + static assets in one Worker).

---

## 5. Verify

1. Open your deployed site.
2. **Settings → GitHub Sync → Connect with GitHub**.
3. Authorize the GitHub App.
4. Pick an existing repo (data goes into a `bikelog/` folder; you can use a dedicated data repo or an existing one).
5. Hit **Push data** once — a `bikelog/bikes/<slug>/bike.md` + `bikelog/README.md` appear in your repo. Afterwards auto-sync keeps GitHub mirrored (5s after each change); the header sync button forces a push.
6. Edit something and use **Pull data** on another device to fetch it.

### Troubleshooting

- **Push fails with `403 "Resource not accessible by integration"`** on `/git/blobs` →
  the GitHub App is missing the **Contents: Read and write** repository permission
  (for GitHub App user tokens the OAuth `scope` parameter is ignored; the token only
  gets what the App's dashboard grants). Fix in GitHub → Settings → Developer settings →
  your App → **Permissions → Repository permissions → Contents: Read and write** → save,
  then **re-connect** in Settings → GitHub Sync.
- **Push fails with `409 "Git Repository is empty"`** → the selected repo has no commits.
  BikeLog now bootstraps empty repos automatically (creates the default branch on first push);
  just push again.
- **Pull returns nothing on a fresh repo** → normal; there is no data until the first push.

Photos upload to `bikelog/bikes/<bike-slug>/media/` and are served back through the authenticated `/api/sync/media` endpoint (so even private repos work).

---

## Security model

| Concern | How it's handled |
|---|---|
| OAuth client secret | Kept server-side only (Cloudflare secret / `.dev.vars`), never in the repo |
| User tokens | Stored in Cloudflare KV (`BIKE_TOKENS`), only reachable with the session cookie, auto-refreshed (8h expiry, refresh token) |
| Sessions | HttpOnly, Secure, SameSite=Lax cookie + CSRF `state` check; 90-day TTL in `BIKE_SESSIONS` KV |
| Data access | Token scoped to `repo` (read/write contents) — the app can only touch the user-selected repo they authorize |
| Photo serving | `/api/sync/media` validates the session and path (`bikelog/bikes/…/media/…`) before streaming bytes |
| Repo choice | Server regex-validates `<owner>/<repo>`; only repos the token can push to are listed |