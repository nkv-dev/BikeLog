# Task Log & Roadmap

A running log of what's been done and what's next. Keep this updated as work lands.

## Done

### `themes` branch — brand accent themes (commit `9635e99`)
- `src/lib/brand-themes.ts` — BIKE_BRANDS → accent color map + `ACCENT_THEME_OPTIONS`
- `src/styles/starwind.css` — `data-theme` accent blocks (cold/auto/brand swatches)
- `AppSettings.accentTheme` (`auto` | `default` | brand) with pre-paint apply on `BaseLayout`
- Settings accent picker with auto / default / brand swatches

### `github-sync` branch — GitHub-backed storage (in progress)
**Server (Cloudflare Worker, Astro SSR):**
- `src/lib/github.ts` — GitHub API client: token store (KV, 8h TTL + refresh), user/repos, contents read/write, bulk commit via Git Data API, binary read (for photos), file delete, repo tree
- `src/lib/auth.ts` — session cookie (`bikelog_session`, HttpOnly/Secure/SameSite=Lax), CSRF state, KV-backed sessions (90d), `makeEnv()` via `import { env } from "cloudflare:workers"`
- `src/pages/api/auth/*` — `connect`, `callback` (code exchange + state check), `me`, `repos`, `select-repo` (regex-validated), `disconnect` (POST)
- `src/pages/api/sync/*` — `pull` (parse repo→localStorage), `push` (localStorage→Markdown, deletes stale bike files), `upload` (photo → `bikelog/assets/<slug>/`, requires `bikeName`), `media` (authenticated photo serving, path validated to `bikelog/assets/`)
- `src/lib/mdstore.ts` — line-based Markdown serializer/parser with `<!-- bikelog:meta|fuel|service|issues -->` markers; round-trip verified (fixed meta-block parse: meta has no `###` heading)
- `src/lib/sync.ts` — `pullFromRepo` / `pushToRepo` orchestration
- `wrangler.jsonc` — KV namespaces `BIKE_TOKENS` + `BIKE_SESSIONS`, vars, secrets docs (committed; secrets stay out)

**Client:**
- `src/lib/sync-client.ts` — typed helpers (`me`/`repos`/`selectRepo`/`disconnect`, `sync.pull`/`push`/`uploadPhoto`, `mediaUrl`)
- Settings → GitHub Sync card — connect button, avatar/name, repo `<select>`, Save repo, Pull data, Push data, Disconnect
- Bikes page — per-bike "Add photo" + thumbnail gallery served via `/api/sync/media`

**Env-access fix:** Astro v6+ removed `Astro.locals.runtime.env`; switched to
`import { env } from "cloudflare:workers"`. All API endpoints verified:
`/api/auth/me|repos` → 200, `/api/sync/pull` → 401 (unauthed), `/api/auth/connect` → 302, `/api/sync/media` → 401.

## Next (0.0.2 cleanup)

Bugs found in gap analysis (priority order):
- [ ] B1 — cascade-delete fuel/service/issue entries when a bike is deleted
- [ ] B2 — odometer monotonicity + duplicate-date validation on entry save
- [ ] B3 — Dashboard "Total KM" relabel to clarify (it's the fuel-card racing difference)
- [ ] B4 — saving an issue should update the bike odometer
- [ ] B5 — mileage outlier sanitize + "N fills excluded" note
- [ ] B6 — version bump 1.0.0 → 0.0.2
- [ ] B7 — bikes.astro brand select: hardcode 11 options → derive from `BIKE_BRANDS` (15 brands)
- [ ] B8 — dedupe brand names + fix `cfdmoto` typo

Features:
- [ ] F1 — edit existing fuel/service/issue entries (reuse `store.update`)
- [ ] F2 — auto service reminders from latest `nextServiceKm` / `nextServiceDate`

## Backlog (open-source)

- [ ] LICENSE + CONTRIBUTING + CI
- [ ] Auto-sync (optional) — webhook or on-save push trigger
- [ ] Multi-device conflict strategy (last-write-wins is current behavior)