# Task Log & Roadmap

A running log of what's been done and what's next. Keep this updated as work lands.

## Done

### `themes` branch — brand accent themes (commit `9635e99`)
- `src/lib/brand-themes.ts` — BIKE_BRANDS → accent color map + `ACCENT_THEME_OPTIONS`
- `src/styles/starwind.css` — `data-theme` accent blocks (cold/auto/brand swatches)
- `AppSettings.accentTheme` (`auto` | `default` | brand) with pre-paint apply on `BaseLayout`
- Settings accent picker with auto / default / brand swatches

### `github-sync` branch — GitHub-backed storage (v0.0.1)
**Server (Cloudflare Worker, Astro SSR):**
- `src/lib/github.ts` — GitHub API client: token store (KV, 8h TTL + refresh), user/repos, contents read/write, bulk commit via Git Data API, binary read (for photos), file delete, repo tree
- `src/lib/auth.ts` — session cookie (`bikelog_session`, HttpOnly/Secure/SameSite=Lax), CSRF state, KV-backed sessions (90d), `makeEnv()` via `import { env } from "cloudflare:workers"`
- `src/pages/api/auth/*` — `connect`, `callback` (code exchange + state check), `me`, `repos`, `select-repo` (regex-validated), `disconnect` (POST)
- `src/pages/api/sync/*` — `pull`, `push`, `upload`, `media`
- `src/lib/mdstore.ts` — line-based Markdown serializer/parser with `<!-- bikelog:… -->` markers; round-trip verified
- `src/lib/sync.ts` — `pullFromRepo` / `pushToRepo` orchestration
- `wrangler.jsonc` — KV namespaces `BIKE_TOKENS` + `BIKE_SESSIONS`, vars, secrets docs (committed; secrets stay out)

**Client:**
- `src/lib/sync-client.ts` — typed helpers (`me`/`repos`/`selectRepo`/`disconnect`, `sync.pull`/`push`/`uploadPhoto`, `mediaUrl`)
- Settings → GitHub Sync card — connect, repo select, Pull/Push/Disconnect
- Bikes page — per-bike "Add photo" + thumbnail gallery served via `/api/sync/media`

**Env-access fix:** Astro v6+ removed `Astro.locals.runtime.env`; switched to
`import { env } from "cloudflare:workers"`.

**Pages build fix:** dropped `pnpm-workspace.yaml`, added `pnpm.onlyBuiltDependencies`
(`esbuild`, `workerd`); local pnpm 12 uses `allowBuilds` in `pnpm-workspace.yaml` — both ship.

### `dev/data-structure-0.0.2` branch — per-entry repo layout + rides/mods/checklists
- **Repo layout (0.0.2):** `bikelog/bikes/<slug>/` → `bike.md`, `fuel/`, `maintenance/`,
  `rides/`, `modifications/`, `checklists/`, `media/`. One file per entry; `README.md` auto-index.
- `src/lib/types.ts` — `ServiceType` adds `"issue"`; `ServiceEntry` gains issue fields
  (title/description/severity/status/estimated/actual); new `Ride`, `Modification`, `Checklist`;
  legacy `IssueEntry` retained for migration.
- `src/lib/store.ts` — six collections (`bikes/fuel/service/rides/mods/checklists`);
  `migrateLegacyIssues()` folds old `bikelog_issues` into service entries `type:"issue"`;
  `hydrateAll`/`importAllData`/`clearAllData` updated; mutations dispatch `bikelog:data-changed`.
- `src/lib/mdstore.ts` — per-entry serializers/parsers with strict round-trip (verified),
  path helpers, README generator, and real legacy single-file parser (meta/fuel/service/issues
  sections → new collections; issues → maintenance `type:"issue"`).
- `src/lib/sync.ts` — pull walks `bikes/<slug>/**` (dirs + legacy single files);
  push writes per-entry files, README, deletes stale/legacy files.
- `src/lib/sync-client.ts` — push payload now carries all six collections; `uploadPhoto`.
- Pages — new `rides.astro`, `mods.astro`, `checklists.astro`; `issues.astro` is now a
  filtered view of service `type:"issue"`; service page excludes issues; nav is 7 items
  (Home/Fuel/Service/Rides/Mods/Checks/Bikes).
- **Auto-sync:** header sync button + debounced (5s) auto-push after any local change
  when connected; store mutations notify via `bikelog:data-changed`.
- Docs updated (`docs/DATA.md` → 0.0.2 layout, SETUP/README), `package.json` → 0.0.2.
- Verified: `pnpm build` green; all 9 pages return 200; markdown round-trip + legacy
  migration tests pass.

## Next (0.0.2 cleanup)

- [ ] Merge `dev/data-structure-0.0.2` → `github-sync` → `main`; redeploy Worker from `main`.
- [ ] B1 — cascade-delete fuel/service/ride/mod/checklist entries when a bike is deleted
- [ ] B2 — odometer monotonicity + duplicate-date validation on entry save
- [ ] B4 — saving an issue should update the bike odometer
- [ ] B5 — mileage outlier sanitize + "N fills excluded" note
- [ ] B7 — bikes.astro brand select: hardcode options → derive from `BIKE_BRANDS`
- [ ] B8 — dedupe brand names + fix `cfdmoto` typo
- [ ] F1 — edit existing fuel/service/issue entries (reuse `store.update`)
- [ ] F2 — auto service reminders from latest `nextServiceKm` / `nextServiceDate`

## Blocked / waiting on user

- [ ] GitHub App callback URL not added → live OAuth (auto-sync) can't be verified in prod.
  Must add `https://bikelog.nkv-dev.workers.dev/api/auth/callback` in the GitHub App dashboard.

## Backlog (open-source)

- [ ] LICENSE + CONTRIBUTING + CI
- [ ] Multi-device conflict strategy (last-write-wins is current behavior)