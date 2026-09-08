# Security Policy

BikeLog is **local-first**: user data lives in the browser's `localStorage` and
in the user's own GitHub repository. The hosted Worker holds **no user data** —
it only completes the GitHub OAuth handshake and proxies GitHub API calls.

## Reporting a vulnerability

If you believe you have found a security issue, **do not** open a public issue.
Report it privately so it can be handled before disclosure.

- Email / GitHub: create a private vulnerability report at
  `https://github.com/nkv-dev/BikeLog/security/advisories/new`
  (GitHub's Private Vulnerability Reporting — recommended), or
- Open a standard issue **without** revealing secrets, if you prefer.

Please include:

1. A description of the issue and its impact.
2. Steps to reproduce (minimal, if possible).
3. Affected versions/routes.
4. Any proof-of-concept (without live credentials).

## What to include

Things that are in scope for most reports:

- Auth/session issues in the OAuth flow (`/api/auth/*`).
- Path traversal or authorization issues in `/api/sync/*` (media, pull, push).
- Secrets handling (GitHub App credentials, user tokens in KV).

## Security model highlights

| Concern | Mitigation |
|---|---|
| OAuth client secret | Server-side only (Cloudflare secret / `.dev.vars`), never committed |
| User tokens | Cloudflare KV (`BIKE_TOKENS`), only reachable with session cookie, auto-refreshed (8h) |
| Sessions | HttpOnly, Secure, SameSite=Lax cookie + CSRF state; 90-day KV TTL |
| Data access | Token scoped to the user-selected repo (`repo` scope) |
| Photo serving | `/api/sync/media` validates session + path (`bikelog/bikes/…/media/…`, no `..`) |
| Repo choice | Server regex-validates `<owner>/<repo>`; only pushable repos listed |

Deployers should keep `wrangler.jsonc`, `.dev.vars`, and never commit
`*.pem`, secrets, or token material (.gitignore already excludes these).

## Response timeline

We aim to acknowledge reports within **72 hours** and provide a first assessment
within **7 days**. Patches are shipped and disclosed publicly after a fix and a
reasonable grace period for deployment.

## Supported versions

Security fixes are made against the **latest release on `main`**. There are no
longer-lived release branches at this time.