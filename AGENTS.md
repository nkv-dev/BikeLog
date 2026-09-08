# AGENTS.md

Agent instructions for working in the BikeLog codebase.

## Project

Mobile-first Astro 7 app for Indian bikers: mileage, fuel, service, issues, rides, modifications, checklists, photos.
**Local-first, GitHub-of-record** — user data lives in browser `localStorage` **and** in a
GitHub repo the user selects, as Markdown under `bikelog/`. The server (Cloudflare Worker)
holds no user data; it only does GitHub OAuth and GitHub API calls on the user's behalf.

See `docs/` for DATA.md (repo format), SETUP.md (self-hosting), TASKS.md (log/roadmap).

## Critical conventions

- API endpoint files under `src/pages/api/**` are plain `.ts` modules with an exported
  `APIRoute`-style function (`export const GET/POST = async (context: any) => …`).
  **Do NOT add frontmatter `---`** to these files — it breaks the build transform.
- Runtime env/bindings are read via `import { env } from "cloudflare:workers"` (helper
  `makeEnv()` in `src/lib/auth.ts`). **`Astro.locals.runtime.env` was removed in Astro v6+**
  and throws at runtime — never reintroduce it.
- `.ts` API endpoints must NOT have frontmatter. Only `.astro` files use `---`.

## Development

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.
`astro` is not on PATH standalone; use `npx astro` or `pnpm exec astro` if needed.
`pnpm build` = `astro build` (verify before committing).

### Local env for dev

`.dev.vars` (git-ignored) mirrors vars/secrets for local runs:
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_ID`, `PUBLIC_SITE_URL`.
`wrangler.jsonc` (committed) holds non-secret vars + KV namespace `id`s (placeholders until set).

## Key modules

| File | Purpose |
|---|---|
| `src/lib/github.ts` | GitHub REST client: KV token store (8h TTL + refresh), repos, contents, bulk commit (Git Data API), binary read, delete, tree |
| `src/lib/auth.ts` | Session cookie (`bikelog_session`), CSRF state, KV sessions (90d), `makeEnv()` |
| `src/lib/mdstore.ts` | Markdown serializer/parser for `bikelog/bikes/<slug>/**` (per-entry files) + README index |
| `src/lib/sync.ts` | `pullFromRepo` / `pushToRepo` (push deletes stale bike files) |
| `src/lib/sync-client.ts` | Client-side typed wrappers (`github.*`, `sync.*`, `mediaUrl`) |
| `src/lib/store.ts` | localStorage store; `hydrateAll()` replaces all collections after a pull |
| `src/pages/api/` | OAuth (`connect/callback/me/repos/select-repo/disconnect`) + sync (`pull/push/upload/media`) |
| `src/pages/settings.astro` | GitHub Sync card: connect, repo select, Pull/Push/Disconnect |

## Formats & gotchas

- Per-entry files under `bikelog/bikes/<slug>/`: `bike.md` (meta), `fuel/`, `maintenance/`,
  `rides/`, `modifications/`, `checklists/`. Each file = `# title` line, optional `> desc`,
  then `<!-- bikelog:bike|fuel|maintenance|ride|modification|checklist -->` marker + `- key: value` props.
  The first marker classifies the file; the `#` line is display-only.
- Strict keys (round-trip): Fuel `pricePerLitre, totalCost, isFullTank, station?, notes?`;
  Service `type (scheduled|repair|general|issue), items[] (comma), cost, workshop?, nextServiceKm?, nextServiceDate?`;
  Issue (type=issue) `title, description, severity, status, estimatedCost?, actualCost?, notes?`; Bike `photos?: string[]`;
  Ride `route, distanceKm, odometer?, avgSpeedKmh?, notes?`; Mod `title, description?, cost?, installedBy?`;
  Checklist `name, items[] (comma), createdAt`.
- Permissions: GitHub App tokens need `Contents: read/write` for data; the repos list filters out forks.
- Auto-sync: store mutations dispatch `bikelog:data-changed`; BaseLayout debounces (5s) an auto-push
  when connected. `hydrateAll`/`migrateLegacyIssues` write directly to localStorage (no event) —
  pulling must NOT trigger a push.

## Verification

- `pnpm build` must pass before committing.
- Local pnpm 12 needs `allowBuilds` in `pnpm-workspace.yaml`; Pages (pnpm 10) uses
  `pnpm.onlyBuiltDependencies` in package.json — keep both.
- With a running dev server, spot-check API behavior:
  - `/api/auth/me` → 200 `{"connected":false}` (unauthed)
  - `/api/auth/connect` → 302 (to GitHub authorize)
  - `/api/sync/pull` + `/api/sync/media` → 401 (unauthed)
  - All 9 pages (`/`, `/bikes`, `/settings`, `/fuel`, `/service`, `/issues`, `/rides`, `/mods`, `/checklists`) → 200
- If API endpoints return 500 with a "deps_ssr/@astrojs_cloudflare…does not exist" error,
  clear vite caches and restart: `rm -rf node_modules/.vite .astro` + `astro dev stop`/`--background`.

## Documentation

Full docs: https://docs.astro.build

Consult before related tasks:
- [Routing / API endpoints](https://docs.astro.build/en/guides/endpoints/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Styling / Tailwind](https://docs.astro.build/en/guides/styling/)
- [Cloudflare adapter runtime](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#cloudflare-runtime)