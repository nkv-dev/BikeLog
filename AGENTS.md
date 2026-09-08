# AGENTS.md — BikeLog Master Agent Instructions

> **Purpose of this file:** This is the single source of context for any AI agent (or future
> session) working on BikeLog. It is intentionally exhaustive — the intent is that if a
> session is lost, this file alone lets a fresh agent rebuild full context: what the project
> is, how it's structured, what git history exists, what skills/frameworks were used, the
> data model, the conventions, the gotchas, the roadmap, and how to verify changes.
>
> There is **no length limit** on this file. Keep adding to it as the project evolves.

---

## 1. Project — What is BikeLog?

**BikeLog** is a **mobile-first Astro 7 web app for Indian bikers** to track:

- **Mileage** (km/l), **fuel** fill-ups + cost in ₹ (INR)
- **Service/maintenance**, **repairs**, and **issues**
- **Rides** (route, distance, avg speed)
- **Modifications/upgrades** with cost
- **Checklists** (reusable pre-ride / maintenance templates with a run mode)
- **Bike profiles** (multiple bikes, switch active bike)
- **Photos** per bike

### Core architecture principle: Local-first + GitHub-of-record

```
Browser localStorage  ──  fast offline cache, what the UI reads/writes
GitHub repo (user's own)  ──  durable source of truth, stored as Markdown under bikelog/
```

- User data lives in **two places**: browser `localStorage` **and** the GitHub repo the user
  selects in Settings.
- The **server holds NO user data**. The Cloudflare Worker only:
  1. completes the **GitHub OAuth** handshake (keeps the app's client secret server-side), and
  2. calls the **GitHub API** on the user's behalf (reads/writes `bikelog/` in their repo).
- This means a single shared front-end works for everyone; each user keeps their data in
  their own repo. Multi-user safe by design.

### Physical location (important)

The repo root is the **`bikelog/`** subfolder of the workspace:

```
/home/user/WORKSPACE-CODE/milage calculator/bikelog/
```

Note the space in the parent path — always quote paths when using shell commands.

---

## 2. Git Repository Map

- **Remote:** `git@github.com:nkv-dev/BikeLog.git` (`origin`, SSH)
- **Author (all commits):** `nkv-dev`
- **Current branch:** `main`
- **Workflow pattern:** feature/fix branches are merged into `main` via merge commits.
  Branches are used for each logical feature, then cleaned up.

### Full commit history (oldest → newest)

| SHA | Date | Message |
|---|---|---|
| `3dec04b` | 2026-09-07 | init: astro + starwind ui + cloudflare setup |
| `d546ee9` | 2026-09-07 | feat: data model types, localStorage store, utilities |
| `f3675ca` | 2026-09-07 | feat: base layout with bottom nav + dashboard page |
| `0a88ad2` | 2026-09-07 | feat: fuel, service, issues, bikes, settings pages + build fix |
| `e0ce059` | 2026-09-07 | docs: README + gitignore + cloudflare security headers |
| `bf920d1` | 2026-09-07 | feat: accessibility & UX polish for dialogs, toasts, and empty states |
| `e86e60a` | 2026-09-07 | fix: close unclosed script tag in fuel page; wire up Starwind theming |
| `9635e99` | 2026-09-07 | feat: bike-brand accent themes with auto + manual override ← **themes** |
| `8d0f876` | 2026-09-07 | feat: GitHub-backed storage with OAuth, markdown sync, and photos |
| `5932841` | 2026-09-07 | fix: show setup help instead of redirecting to GitHub 404 when App credentials are unconfigured |
| `8f3a395` | 2026-09-07 | merge: brand/accent theme system into develop |
| `d82ec0b` | 2026-09-07 | feat: premium garage-ledger redesign — tokens, type, dashboard, unified entry cards ← **develop** |
| `a5ed935` | 2026-09-07 | merge: bring premium redesign into github-sync (OAuth + GitHub-backed sync) |
| `87e8e0f` | 2026-09-08 | chore: wire real GitHub App + KV namespace IDs into wrangler config; fix export btn after merge |
| `6ac2e9e` | 2026-09-08 | deploy: set prod PUBLIC_SITE_URL, wire SESSION KV, fix woff2 _headers rule |
| `39d9eea` | 2026-09-08 | fix: drop pnpm-workspace.yaml; allow esbuild/workerd builds via package.json for pnpm>=9 compatibility |
| `f4eb6ea` | 2026-09-08 | fix: (duplicate of above) |
| `3996696` | 2026-09-08 | feat: 0.0.2 per-entry repo layout with rides/mods/checklists and auto-sync ← **dev/data-structure-0.0.2** |
| `afc67df` | 2026-09-08 | merge: 0.0.2 per-entry repo layout + auto-sync into github-sync |
| `0a65998` | 2026-09-08 | merge: sync 0.0.2 per-entry repo layout + auto-sync into main |
| `7e629b5` | 2026-09-08 | fix: typecheck setup for TS7 + astro editor module resolution |
| `94ba7d5` | 2026-09-08 | merge: TS7 typecheck setup + astro editor module resolution into main |
| `21b2d25` | 2026-09-08 | fix: bootstrap pushes into empty GitHub repos |
| `a040bfe` | 2026-09-08 | merge: bootstrap empty-repo pushes into main |

### Branch map (local + remote)

| Branch | Purpose / content | Last commit |
|---|---|---|
| `main` ← current | Integration branch; deploy target | `a040bfe` |
| `develop` | Premium "garage-ledger" redesign iteration | `d82ec0b` |
| `themes` | Bike-brand accent theme system | `9635e99` |
| `github-sync` | GitHub OAuth + Markdown sync + photos (0.0.1) | `afc67df` |
| `dev/data-structure-0.0.2` | 0.0.2 per-entry repo layout + rides/mods/checklists + auto-sync | `3996696` |
| `fix/empty-repo-bootstrap` | Bootstrap pushes into empty GitHub repos | `21b2d25` |
| `fix/typecheck-ts7` | TS7 typecheck setup + astro editor module resolution | `7e629b5` |
| `AGENTS.md` ← this branch | This documentation update | new |

Remote-tracking branches exist for: `main`, `themes`, `github-sync`, `develop`, `dev/data-structure-0.0.2`.

---

## 3. Tech Stack, Skills & Frameworks Used

### Runtime / framework
- **Astro 7.x** — SSR (`output: 'server'`)
- **`@astrojs/cloudflare`** adapter — deploys as a Cloudflare Worker (Workers + static assets in one Worker; no Pages project needed)
- **Node.js ≥ 22.12**, **TypeScript 6.x** (`astro/tsconfigs/strict`)
- **pnpm** package manager

### Cloudflare
- **Cloudflare Workers + KV** — OAuth token store + session store (`BIKE_TOKENS`, `BIKE_SESSIONS`)
- Runtime bindings read via `import { env } from "cloudflare:workers"` (helper `makeEnv()`)
- **wrangler** CLI (dep; used via `pnpm exec wrangler …`)

### GitHub integration
- **GitHub App / REST API** — per-user repo storage (OAuth user tokens)
- Git Data API (bulk commits), Contents API (read/write/delete), Trees API (recursive listing)

### Styling / UI components
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) — `src/styles/starwind.css`
- **Starwind UI v3** — accessible Tailwind components, bundled registry, Astro framework
- **`tw-animate-css`** — animation utilities
- **`@tailwindcss/forms`** — form reset plugin
- **`clsx` + `tailwind-merge`** (`cn()` helper in `src/lib/utils.ts`), **`tailwind-variants`**
- **Fonts:** `@fontsource-variable/plus-jakarta-sans` (UI), `@fontsource-variable/jetbrains-mono` (instrument readouts)
- **Icons:** `@tabler/icons`

### Starwind UI components available (from `starwind.config.json`, registry `bundled` v2.2.0)
```
button  card  input  select  textarea  label  badge  dialog  sheet  toast
tabs  table  separator  progress  accordion  dropdown  skeleton  tooltip  sidebar
avatar  theme-toggle
```
Component source lives in `src/components/starwind/<name>/`. Edit the source CSS/components
there (do not depend on CDN). `theme-toggle` is imported directly from `@/components/starwind/theme-toggle`.

### Version pins (from `package.json`)
- `@astrojs/cloudflare` ^14.3.0, `astro` ^7.3.1, `wrangler` ^4.129.0
- `@starwind-ui/astro` 1.2.0, `tailwindcss`/`@tailwindcss/vite` ^4.3.3, `tailwind-merge` ^3.6.0, `tailwind-variants` ^3.3.1
- `@astrojs/check` ^0.9.10, `typescript` ^6.0.3
- Package `name: "bikelog"`, `version: "0.0.2"`, `"type": "module"`

---

## 4. Project Structure

```
src/
├── components/starwind/   # Starwind UI components (one folder per component)
├── layouts/
│   └── BaseLayout.astro   # Shell: header, bottom nav, theme, accent, sync logic
├── pages/                 # Dashboard, Fuel, Service, Issues, Rides, Mods, Bikes,
│   │                      #  Checklists, Settings (each is a .astro page + <script>)
│   └── api/               # OAuth + sync API endpoints (plain .ts — NO frontmatter!)
│       ├── auth/          # connect, callback, me, repos, select-repo, disconnect
│       └── sync/          # pull, push, upload, media
├── lib/                   # types, store, github client, auth, mdstore, sync, etc.
└── styles/
    └── starwind.css       # Tailwind entry + design-system tokens/components/theme
docs/                      # DATA.md, SETUP.md, TASKS.md
public/                    # favicon, _headers (security + caching)
wrangler.jsonc             # Cloudflare Worker config (vars + KV namespace IDs)
starwind.config.json       # Starwind registry config
astro.config.mjs           # Astro config (SSR, cloudflare adapter, tailwind vite plugin)
```

### Pages (all 9, protected paths)
| Route | File | Purpose |
|---|---|---|
| `/` | `index.astro` | Dashboard: stats, count-up, recent activity, quick actions |
| `/bikes` | `bikes.astro` | Bike profiles, add/edit/delete, photos, set active |
| `/fuel` | `fuel.astro` | Fuel log + add dialog |
| `/service` | `service.astro` | Service/maintenance log (excludes issues) |
| `/issues` | `issues.astro` | Filtered view of service `type:"issue"` entries |
| `/rides` | `rides.astro` | Ride log |
| `/mods` | `mods.astro` | Modifications |
| `/checklists` | `checklists.astro` | Checklist templates |
| `/settings` | `settings.astro` | GitHub sync, appearance/themes, data export/import/clear |

All pages follow the same pattern: **static HTML shell + inline `<script>` with client-side
rendering** driven by `localStorage` stores. They listen for `bikelog:data-changed` events to re-render.

---

## 5. Core Modules (`src/lib/`) — In-Depth

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript data-model interfaces |
| `store.ts` | localStorage store, migration, hydrate/import/export/clear, event dispatch |
| `mileage.ts` | Mileage / spend / total-km calculators |
| `github.ts` | GitHub REST client: KV token store (8h TTL + refresh), repos, contents read/write, Git Data API bulk commit, binary read, delete, recursive tree |
| `auth.ts` | Session cookie (`bikelog_session`), CSRF state, KV sessions (90d), `makeEnv()` |
| `mdstore.ts` | Markdown serializer/parser (per-entry + bike profile + README) + legacy 0.0.1 parser |
| `sync.ts` | Server-side `pullFromRepo` / `pushToRepo` orchestration |
| `sync-client.ts` | Client-side typed wrappers (`github.*`, `sync.*`, `mediaUrl`) |
| `toast.ts` | `showToast()` + `confirmDialog()` browser helpers |
| `brand-themes.ts` | Bike-brand → accent color map + ACCENT_THEME_OPTIONS |
| `indian-utils.ts` | `BIKE_BRANDS`, `COMMON_SERVICE_ITEMS`, severity/status configs, INR/date/odometer formatters, `generateId`, `todayISO` |
| `utils.ts` | `cn()` (clsx + tailwind-merge) |

### `types.ts` — data model

```ts
Bike          { id, name, brand, model, year, odometer, fuelType: "petrol"|"diesel",
                createdAt, photos?: string[] }
FuelEntry     { id, bikeId, date, odometer, litres, pricePerLitre, totalCost,
                isFullTank, station?, notes? }
ServiceType   = "scheduled" | "repair" | "general" | "issue"
ServiceEntry  { id, bikeId, date, odometer, type: ServiceType, items: string[], cost,
                workshop?, notes?, nextServiceKm?, nextServiceDate?,
                // issue-only fields:
                title?, description?, severity?, status?, estimatedCost?, actualCost? }
Ride          { id, bikeId, date, route, distanceKm, odometer?, avgSpeedKmh?, notes? }
Modification  { id, bikeId, date, title, description?, cost?, installedBy?, notes? }
Checklist     { id, bikeId, name, items: string[], createdAt }
IssueEntry    // LEGACY 0.0.1 — bundled only for migration
AppSettings   { activeBikeId: string|null, theme: "light"|"dark"|"system", accentTheme? }
```

**Severity:** `low | medium | high | critical` · **Status:** `reported | diagnosed | in-progress | resolved`

### `store.ts` — localStorage store

- **localStorage keys:** `bikelog_bikes`, `bikelog_fuel`, `bikelog_service`, `bikelog_rides`,
  `bikelog_modifications`, `bikelog_checklists`, `bikelog_settings`, plus `bikelog_issues`
  (legacy) and `bikelog_migrated_issues` (migration flag).
- Per-collection stores: `bikeStore`, `fuelStore`, `serviceStore`, `rideStore`,
  `modificationStore`, `checklistStore`, `settingsStore` — each with `getAll/getById/
  getByBike/add/update/remove` (settings has `get/update`).
- **`notifyChanged()`** dispatches `CustomEvent("bikelog:data-changed")` on `window` after
  any `add/update/remove`. **This is what triggers auto-sync.**
- **`migrateLegacyIssues()`** — one-time migration of legacy `bikelog_issues` (IssueEntry)
  into service entries with `type:"issue"`. Guarded by `bikelog_migrated_issues` flag.
- **`hydrateAll(data)`** — replaces every collection after a GitHub **pull**. Writes directly
  to localStorage via `setAll` (no change event) so pulling does **not** trigger a push-back.
- **`importAllData(jsonStr)`** — restore from export; dispatches change event.
- **`exportAllData()`** — JSON backup (runs migration first).
- **`clearAllData()`** — wipes all keys.

### `mileage.ts` — calculations

- `calculateMileage(entries)` — avg km/l using **full-tank only**, consecutive entry odometer
  diffs (skips diffs ≤0 or ≥2000 km). Returns null if <2 full-tank entries.
- `calculateLastMileage(entries)` — mileage between the two most recent full tanks.
- `calculateMonthlySpend(entries, months=1)` — sum totalCost in the trailing period.
- `calculateTotalKm(entries)` — last odometer − first odometer.

### `github.ts` — GitHub REST client (server-only)

- **Token store (KV):** keys `gh:<login>`; TTL 8h (GitHub App user tokens) + auto-refresh via
  refresh token (`refreshUserToken`). `getUserAccessToken` returns a valid/refreshed token.
- **Selected repo (KV):** key `bikelog_repo:<login>` → `<owner>/<repo>`.
- `fetchUser`, `listUserRepos` (paged, filters out forks, includes private + collaborator).
- `listRepo`, `readTextFile`, `writeTextFile` (Contents API, uses sha for update),
  `readBinaryFile` (raw), `deleteFile`.
- **`commitFiles`** — Git Data API bulk commit (blobs → tree → commit → update/create ref).
  **Handles empty repos** (no head ref → creates the default branch with the initial commit).
  This is the "empty-repo bootstrap" fix.
- `getRepoTree(full, token, prefix)` — recursive tree, optionally filtered to a prefix.
- `uploadPhoto(full, token, path, bytes)` — commits a base64 blob.
- `b64()` — base64 encode (UTF-8 strings or bytes).

### `auth.ts` — sessions

- Cookie `bikelog_session` (HttpOnly, Secure, SameSite=Lax).
- KV sessions in `BIKE_SESSIONS` — 90-day TTL after login bind; 1h TTL for pending OAuth state.
- `createSession` binds a CSRF `state`; callback validates `state` matches session.
- `makeEnv()` returns `env as GitHubEnv` via `cloudflare:workers`.

### `mdstore.ts` — Markdown (see §6 for exact format)

- Per-entry serializers: `fuelToMarkdown`, `serviceToMarkdown`, `rideToMarkdown`,
  `modificationToMarkdown`, `checklistToMarkdown`, `bikeToMarkdown`, `readmeToMarkdown`.
- Parsers: `markdownToFuel/Service/Ride/Modification/Checklist/Bike` + `legacyMarkdownToBike`
  (0.0.1 single-file format, converts issues → service `type:"issue"`).
- Path helpers: `bikeDir`, `mediaDir`, `bikeMediaPath`, `entryMediaPath`, `*FilePath`.
- `slugify` — lowercase, non-alphanumerics → `-`, trim `-`, cap 60 chars, default `"bike"`.

### `sync.ts` — pull/push orchestration

- **`pullFromRepo`** — reads `bikelog/bikes/**` tree, buckets blobs by slug, parses per-entry
  `.md` files, migrates legacy single-file bikes. Missing `bikelog/` folder → returns empty.
- **`pushToRepo`** — serializes all localStorage into per-entry files + `README.md`, then
  `commitFiles`; finally **deletes stale/legacy `.md` files** no longer present locally so a
  later pull doesn't resurrect them.
- `SyncError` class sets HTTP status.

### `sync-client.ts` — client-side API

- `github.me()` → `/api/auth/me`; `github.repos()` → `/api/auth/repos`;
  `github.selectRepo(repo)` → POST `/api/auth/select-repo`; `github.disconnect()`.
- `sync.pull()` → calls pull then `hydrateAll(data)`; `sync.push()` → sends all six
  collections to `/api/sync/push`; `sync.uploadPhoto(bike, file)`.
- `mediaUrl(path)` → `/api/sync/media?path=…`.

---

## 6. Data Storage & Markdown Format (repo format)

### Repo layout (0.0.2)

```
bikelog/
├── README.md                          # auto-generated dashboard index
├── bikes/
│   └── <bike-slug>/
│       ├── bike.md                    # bike profile (meta block)
│       ├── fuel/<YYYY-MM-DD>-<odo>.md # one file per fuel entry
│       ├── maintenance/<YYYY-MM-DD>-<slug>.md  # service / repair / issue
│       ├── rides/<YYYY-MM-DD>-<slug>.md
│       ├── modifications/<YYYY-MM-DD>-<slug>.md
│       ├── checklists/<name>.md       # checklist template
│       └── media/
│           ├── bike/                  # profile photos
│           └── <category>/<YYYY>/<MM>/ # entry photos
└── assets/                            # (legacy 0.0.1 location — no longer written)
```

### File format rules

Every entry file is **YAML frontmatter** + optional free-text body:
```
---
type: <bike|fuel|<service type>|ride|modification|checklist>   <- FIRST key classifies the file
- key: value (snake_case)
---

<free-text body → notes>
```

- Frontmatter keys are **snake_case** (see `docs/DATA.md` for the full key map). Optional
  props may be omitted. `items` is a comma-separated list. Unknown keys ignored on read.
- The **body** (text after the closing `---`) maps to `notes`.
- `bikeId` is NOT stored in files (folder-implied); the pull re-attaches it from the slug.
- `receipt` is relative to the entry file (`../media/<cat>/<YYYY>/<MM>/<name>`) and resolves
  back to `media/` on pull.
- Legacy `# title` + `<!-- bikelog:<category> -->` + `- key: value` marker files from earlier
  builds are still **readable** (backwards compatible); everything is written as frontmatter.

### Strict keys per category

- **Fuel:** `price_per_litre, total, full_tank, fuel_station?, receipt?`, body → notes
- **Service:** `type (scheduled|repair|general|issue), items[] (comma), cost, workshop?,
  next_service_km?, next_service_date?`, body → notes
- **Issue** (type=issue): `title, description, severity, status, estimated_cost?, actual_cost?`, body → notes
- **Bike:** `bike_photos?: string[]`
- **Ride:** `route, distance_km, odometer?, avg_speed_kmh?`, body → notes
- **Mod:** `title, description?, cost?, installed_by?`, body → notes
- **Checklist:** `name, items[] (comma), created`

Slug = lowercase name, non-alphanumerics → `-`, truncated to 60 chars. Checklist names become
filenames via slugify; duplicate names get an `-<id5>` suffix.

### Sync behavior

- **Auto-sync (0.0.2):** after connecting + selecting a repo, every local change auto-pushes
  after a **5s debounce**. Header push (↑) button forces an immediate push; header pull (↓) button forces a pull.
- **Push:** serializes all localStorage → per-entry `.md` + `README.md`, commits to the
  selected repo's default branch. Removes stale/legacy files.
- **Pull:** reads all `bikelog/bikes/<slug>/**`, parses into the six collections, replaces
  localStorage. Missing folder → empty data.
- **Migration:** legacy 0.0.1 single-file bikes parsed into new collections; issues →
  maintenance `type:"issue"`. Legacy `bikelog_issues` localStorage migrated once.
- **Photos** are compressed to WebP in the browser (canvas strips EXIF) before upload;
  profile photos → `media/bike/`, entry receipts → `media/<category>/<YYYY>/<MM>/`,
  referenced via `receipt` frontmatter key / `photos` lists.

> ⚠️ **PR/merge caveat:** pushes use the GitHub API with the latest base tree.
> Last-write-wins per file — **not** a merge. Editing the Markdown by hand on GitHub can be
> overwritten by a push. Keep hand-edits lightweight.

---

## 7. Design System (`src/styles/starwind.css`)

Premium **"garage ledger"** visual layer. Dark-first semantic tokens with `.dark` and `.light` (`.dark` class on `<html>`).

### Tokens
- **Type:** Plus Jakarta Sans (UI), JetBrains Mono (readouts)
- **Colors:** `background/foreground/card/popover/primary/secondary/muted/accent/info/
  success/warning/error/border/input/outline` + extended `surface-raised/surface-sunken/
  rule-strong/ink-soft` + `shadow-card/shadow-pop`
- **Motion easings:** `--ease-out`, `--ease-spring`, `--duration-short/long`

### Component classes (`@layer components`)
| Class | Purpose |
|---|---|
| `k-label` / `k-label-aloud` | small mono uppercase key labels / primary label |
| `k-stat` | instrument-gauge mono readout |
| `k-entry*` | unified list-entry card (`-row/-dot/-title/-sub/-mono`) |
| `k-press` / `k-press-card` | tactile press / hover-lift press |
| `k-action` | tactile quick-action button |
| `k-chip` | hero/bike identity chip |

### Motion
- `reveal` entrance via IntersectionObserver (opacity/transform only), count-up stats,
  press feedback — **all gated by `prefers-reduced-motion`**.
- Motion uses only transform/opacity (per the `animate` skill principle).

### Brand accent themes
- `[data-theme="<brand>"]` blocks in CSS set `--primary`, `--primary-foreground`,
  `--primary-accent`, `--sidebar-*` for light + `.dark[data-theme=…]` variants.
- Brands: ktm, bajaj, tvs, honda, yamaha, royal-enfield, suzuki, kawasaki, mahindra,
  triumph, harley-davidson, indian, benelli, cfmoto, hero.
- `accentTheme` setting: `"auto"` (follow active bike's brand) | `"default"` | a brand key.
- Pre-paint applied in `BaseLayout.astro` `<head>` inline script (reads localStorage before
  first paint to avoid FOUC) and re-applied on `astro:after-swap`. Normalization maps
  `royalenfield→royal-enfield`, `harleydavidson/harley→harley-davidson`, `cfdmoto→cfmoto`.

### Accessibility
- Theme contrast pairs verified ≥ WCAG AA. Decorative motion disabled under reduced motion.
- `toast.ts` confirm modal has `role/aria` and focus handling; bike dialog manages
  `aria-modal`, Escape close, focus restore.

---

## 8. API Endpoints (`src/pages/api/`) — No frontmatter in `.ts`!

**CRITICAL:** `.ts` endpoint files are plain modules exporting `GET`/`POST` — do **NOT** add
frontmatter `---` to them (breaks the build transform). Only `.astro` files use `---`.
They receive `(context: any)` and return `Response` objects.

### `/api/auth/*`
| Endpoint | Method | Behavior |
|---|---|---|
| `connect` | GET | 302 → GitHub authorize (or 503 setup-help page if App unconfigured). Sets session cookie + CSRF state. |
| `callback` | GET | Exchanges code, validates CSRF state, fetches user, saves token+login, 302 → `/` |
| `me` | GET | `{connected:false}` or `{connected:true, login, name, avatar_url, repo}` |
| `repos` | GET | `{connected, repos[], selected}` (list of pushable non-fork repos) |
| `select-repo` | POST | Validates `<owner>/<repo>` regex, stores selection |
| `disconnect` | POST | Clears session + token, 302 → `/settings` |

`connect` scopes: `repo user`. GitHub App tokens live 8h; `me`/`repos` use the stored token.

### `/api/sync/*`
| Endpoint | Method | Behavior |
|---|---|---|
| `pull` | GET | Pulls data from repo, returns `{ok, data}` |
| `push` | POST | Body `{data}` (all six collections), commits Markdown, deletes stale |
| `upload` | POST | multipart `bikeName` + `file` → upload to `media/bike/`, returns `{ok, path, name}` |
| `media` | GET | Serves a photo from repo; **validates path** must start `bikelog/bikes/`, contain `/media/`, and no `..` |

All sync endpoints return 401 when unauthenticated (via `SyncError` or explicit checks).

---

## 9. Critical Conventions & Gotchas (DO NOT violate)

1. **API `.ts` files have NO frontmatter.** Only `.astro` files use `---`.
2. **Runtime env via `import { env } from "cloudflare:workers"`** (`makeEnv()`). 
   `Astro.locals.runtime.env` was removed in Astro v6+ and **throws** — never reintroduce it.
3. **Auto-sync must not loop:** store mutations dispatch `bikelog:data-changed` → BaseLayout
   debounces (5s) an auto-push. But `hydrateAll`/`migrateLegacyIssues` write directly to
   localStorage (no event) so a **pull does not trigger a push**.
4. **Empty-repo push:** `commitFiles` must handle a repo with no commits (no refs) by
   creating the default branch with the initial commit. Don't regress this bootstrap logic.
5. **Format consistency:** the frontmatter `type:` key (or, for maintenance files, the
   service type) must match what each `markdownTo*` parser accepts; keep the key map in
   $6 and `docs/DATA.md` in sync.
6. **pnpm builds:** local pnpm 12 uses `allowBuilds` in `pnpm-workspace.yaml`;
   Cloudflare Pages (pnpm 10) uses `pnpm.onlyBuiltDependencies` (`esbuild`, `workerd`) in
   `package.json` — **keep both** (the `pnpm-workspace.yaml` may be dropped/gitignored;
   never delete `package.json` `pnpm` block).
7. **Slug collisions handled** in `entryFilePath` via a `used` Set + `-<id-last5>` suffix.
8. **Bikes brand select** (bikes.astro) currently hardcodes options from `BIKE_BRANDS` — see
   roadmap B7 to dedupe and derive themes. There's a known `cfdmoto` typo in one place.
9. **Deleting a bike does NOT yet cascade-delete** its entries (roadmap B1).
10. Secrets (`GITHUB_CLIENT_SECRET`, `GITHUB_PRIVATE_KEY`) are in `.dev.vars` (git-ignored)
    / wrangler secrets — **never** commit them.

---

## 10. Development Commands

```bash
pnpm install              # install deps
pnpm dev                  # astro dev → http://localhost:4321
pnpm build                # astro build (MUST pass before committing)
pnpm preview              # astro preview
pnpm exec astro …         # astro CLI (not on PATH standalone)
pnpm exec wrangler …      # wrangler CLI
pnpm exec astro check     # type-check (TS7 setup via fix/typecheck-ts7)
pnpm exec tsc             # tsc
```

### Dev server (background mode)
```bash
pnpm exec astro dev --background   # start in background
pnpm exec astro dev stop|status|logs
```

### Local env
`.dev.vars` (git-ignored) mirrors secrets/vars for local runs:
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_ID`, `PUBLIC_SITE_URL`.
`wrangler.jsonc` (committed) holds non-secret vars + KV namespace `id`s.

---

## 11. Verification Checklist (run before committing)

- **`pnpm build` must pass.**
- With a running dev server, spot-check API behavior:
  - `/api/auth/me` → 200 `{"connected":false}` (unauthed)
  - `/api/auth/connect` → 302 (to GitHub authorize)
  - `/api/sync/pull` + `/api/sync/media` → 401 (unauthed)
  - All 9 pages (`/`, `/bikes`, `/settings`, `/fuel`, `/service`, `/issues`, `/rides`,
    `/mods`, `/checklists`) → 200
- **Known 500 fix:** if you see `deps_ssr/@astrojs_cloudflare…does not exist`, clear vite
  caches + restart: `rm -rf node_modules/.vite .astro` then `astro dev` again.

---

## 12. Roadmap / Task Log (from `docs/TASKS.md`)

### Done (this release series)
- **`themes` branch — brand accent themes** (commit `9635e99`): `brand-themes.ts`,
  `data-theme` CSS blocks, accent picker, pre-paint apply.
- **`github-sync` branch — GitHub-backed storage (0.0.1):** full OAuth + KV + Markdown sync
  + photos. Env-access fix (cloudflare:workers). Pages build fix (pnpm deps).
- **`dev/data-structure-0.0.2`:** per-entry repo layout, new types (rides/mods/checklists,
  issue-as-service), six collections, migration, auto-sync (5s debounce), new pages, README
  generator. Verified build + 9 pages + round-trip/migration tests.
- **`fix/empty-repo-bootstrap`:** pushes into empty GitHub repos (initial-commit branch).
- **`fix/typecheck-ts7`:** TS7 typecheck setup + astro editor module resolution.

### Next (0.0.2 cleanup)
- [ ] Merge `dev/data-structure-0.0.2` → `github-sync` → `main`; redeploy (most already merged).
- [ ] **B1** — cascade-delete fuel/service/ride/mod/checklist entries when a bike is deleted
- [ ] **B2** — odometer monotonicity + duplicate-date validation on entry save
- [ ] **B4** — saving an issue should update the bike odometer
- [ ] **B5** — mileage outlier sanitize + "N fills excluded" note
- [ ] **B7** — bikes.astro brand select: hardcode options → derive from `BIKE_BRANDS`
- [ ] **B8** — dedupe brand names + fix `cfdmoto` typo
- [ ] **F1** — edit existing fuel/service/issue entries (reuse `store.update`)
- [ ] **F2** — auto service reminders from latest `nextServiceKm` / `nextServiceDate`

### Blocked / waiting on user
- [ ] GitHub App callback URL not added → live OAuth (auto-sync) can't be verified in prod.
  Must add `https://bikelog.nkv-dev.workers.dev/api/auth/callback` in the GitHub App dashboard.

### Backlog (open-source)
- [ ] LICENSE + CONTRIBUTING + CI
- [ ] Multi-device conflict strategy (last-write-wins is current behavior)

---

## 13. Self-Hosting & Deployment (from `docs/SETUP.md`)

- **No user data on server** → a shared front-end + one small Worker works for everyone.
- **GitHub App:** one per deployment. Needs `Contents` (read/write) + `Metadata` (read)
  permissions, `Any account` install, callback `https://<site>/api/auth/callback`. Note
  Client ID, Client Secret, App ID (private key optional — token flow).
- **KV namespaces:** `BIKE_TOKENS` (tokens) + `BIKE_SESSIONS` (sessions) — create via
  `pnpm exec wrangler kv namespace create …` and paste IDs into `wrangler.jsonc`.
- **Vars:** `GITHUB_CLIENT_ID`, `GITHUB_APP_ID`, `GITHUB_REPO_NAME`, `PUBLIC_SITE_URL`.
- **Secrets:** `wrangler secret put GITHUB_CLIENT_SECRET` (+ optional `GITHUB_PRIVATE_KEY`,
  `GITHUB_WEBHOOK_SECRET`). Never commit secrets.
- **Deploy:** `pnpm build` then `pnpm exec wrangler deploy`. Workers + static assets in one Worker.
- **Prod URL:** `https://bikelog.nkv-dev.workers.dev` (set in `wrangler.jsonc` PUBLIC_SITE_URL).

### Security model
| Concern | Handling |
|---|---|
| OAuth client secret | Server-side only (secret / `.dev.vars`), never in repo |
| User tokens | KV `BIKE_TOKENS`, reachable only with session cookie, auto-refreshed (8h) |
| Sessions | HttpOnly, Secure, SameSite=Lax cookie + CSRF state; 90-day KV TTL |
| Data access | Token scoped to `repo` — can only touch the user-selected repo |
| Photo serving | `/api/sync/media` validates session + path before streaming |
| Repo choice | Server regex-validates `<owner>/<repo>`; only pushable repos listed |

### Production security headers (`public/_headers`)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`
- `/ _astro/*` immutable long cache; favicon 1 week; woff2 immutable long cache.

---

## 14. Documentation Cross-References

- `docs/DATA.md` — full data model + repo format (mirrors §6)
- `docs/SETUP.md` — full self-hosting guide (mirrors §13)
- `docs/TASKS.md` — task log + roadmap (mirrors §12)
- `README.md` — feature list, tech stack, structure, design system summary
- Astro docs: https://docs.astro.build
  - [Routing / API endpoints](https://docs.astro.build/en/guides/endpoints/)
  - [Astro components](https://docs.astro.build/en/basics/astro-components/)
  - [Styling / Tailwind](https://docs.astro.build/en/guides/styling/)
  - [Cloudflare adapter runtime](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#cloudflare-runtime)

---

## 15. Skills & Tools Used to Build This Project

This project was built with the help of these agent skills / frameworks. When continuing work,
consider which apply:

- **Starwind UI (skill)** — initializing/adding/components in `source/components/starwind`,
  theming via `starwind.config.json` + `src/styles/starwind.css`.
- **basecoat-ui / web-design** — business-website design principles (optionally applicable).
- **frontend-design / ui-visual-composition / web-visual-direction** — the "garage ledger"
  aesthetic, hierarchy, spacing, typography, color.
- **animate** — micro-interactions (press feedback, count-up, reveal) — motion is
  transform/opacity + `prefers-reduced-motion` gated (see §7).
- **a11y / accessibility-* / wcag-accessibility** — dialogs, toasts, focus management,
  contrast (WCAG AA), reduced-motion support.
- **clarify** — UX copy/labels (₹ formatting, "garage ledger" voice).
- **typeset** — Plus Jakarta Sans + JetBrains Mono pairing.
- **depth / colorize / bolder / quieter / polish / normalize** — iterative visual polish of
  tokens, elevation, semantic color, and consistency.
- **data-viz / data-density-patterns** — dashboard stats, count-up readouts, tabular numbers.
- **test / audit / critique / responsive-ui-qa** — QA/verification of the 9 pages and APIs.
- **premium-website-design / landing-page-craft** — product/landing sensibility.

The **Basecoat UI** MCP and **Starwind UI** MCP tools are available for component discovery and
install commands.

---

*Last updated: 2026-09-08 (on branch `AGENTS.md`). Keep this file updated as new features,
bugs, formats, or gotchas land — it is the durable memory of the project.*
