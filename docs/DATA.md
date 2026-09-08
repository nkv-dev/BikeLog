# Data Storage & Repo Format

BikeLog is **local-first with a GitHub-of-record**. Your data exists in two places:

1. **Browser `localStorage`** (`bikelog_bikes`, `bikelog_fuel`, `bikelog_service`, `bikelog_rides`, `bikelog_modifications`, `bikelog_checklists`, `bikelog_settings`) — the fast offline cache the UI reads/writes.
2. **Your GitHub repo**, inside a `bikelog/` folder, as readable Markdown — the durable source of truth you can sync to and from.

> The app server stores **no user data**. Cloudflare KV only holds the user's OAuth token and selected-repo pointer.

## Repo layout (0.0.2 multi-bike)

Inside the GitHub repo you select in Settings:

```
bikelog/
├── README.md                         # auto-generated dashboard index
├── bikes/
│   └── <bike-slug>/
│       ├── bike.md                   # bike profile (frontmatter only)
│       ├── fuel/
│       │   └── <YYYY-MM-DD>-<odo>.md # one file per fuel entry
│       ├── maintenance/
│       │   └── <YYYY-MM-DD>-<slug>.md# one file per service/repair/issue
│       ├── rides/
│       │   └── <YYYY-MM-DD>-<slug>.md# one file per ride
│       ├── modifications/
│       │   └── <YYYY-MM-DD>-<slug>.md# one file per modification
│       ├── checklists/
│       │   └── <name>.md             # one file per checklist (template)
│       └── media/
│           ├── bike/                 # profile photos (profile.webp, front.webp, …)
│           ├── fuel/<YYYY>/<MM>/      # entry receipts, matched by name to entries
│           ├── maintenance/<YYYY>/<MM>/
│           ├── rides/<YYYY>/<MM>/
│           └── modifications/<YYYY>/<MM>/
```

Each entry lives in its own file so GitHub shows clean, per-entry history.

## Entry & bike file format

Every file uses **YAML frontmatter** for structured data plus an optional free-text
Markdown **body** for notes. Keys are snake_case. The first key, `type:`, classifies the
file — for maintenance files it is the service type (`scheduled|repair|general|issue`).

`bike.md`:

```yaml
---
type: bike
id: 5f8e2a
name: Duke 390
brand: KTM
model: Duke 390 BS6
year: 2021
odometer: 12345
fuel_type: petrol
created: 2026-09-01T00:00:00.000Z
bike_photos: bikelog/bikes/duke-390/media/bike/profile.webp,bikelog/bikes/duke-390/media/bike/front.webp
---
```

A fuel entry (`fuel/2026-09-07-42520.md`):

```markdown
---
type: fuel
id: f1
date: 2026-09-07
odometer: 42520
litres: 8.72
price_per_litre: 103.20
total: 899.90
full_tank: true
fuel_station: HP Petrol Pump
receipt: ../media/fuel/2026/09/2026-09-07-42520.webp
---

Filled before highway ride.
```

A service/repair/issue entry (`maintenance/2026-08-10-duke-390.md`):

```markdown
---
type: scheduled
id: s1
date: 2026-08-10
odometer: 10000
items: Oil change, Chain adjustment
cost: 1200
workshop: KTM Service Center
next_service_km: 15000
next_service_date: 2027-02-10
---

Engine oil and filter, chain cleaned and tensioned.
```

Issues are maintenance entries with `type: issue` plus the issue fields:

```markdown
---
type: issue
id: i1
date: 2026-08-15
odometer: 10500
title: Vibrating mirrors
description: Excessive vibration above 80 km/h
severity: low
status: reported
estimated_cost: 300
actual_cost: 400
---

Addressed by replacing the left mirror mount.
```

A ride (`rides/2026-09-03-duke-390.md`):

```markdown
---
type: ride
id: r1
date: 2026-09-03
route: Bangalore to Mysore to Bangalore
distance_km: 245.5
odometer: 12300
avg_speed_kmh: 68
---

Heavy rain on the return leg.
```

A modification (`modifications/2026-09-04-duke-390.md`):

```markdown
---
type: modification
id: m1
date: 2026-09-04
title: LED headlamp upgrade
description: 60W LED set, better throw at night
cost: 3200
installed_by: Amazon garage
---

Bugs collected on the highway are visible in the beam.
```

A checklist (`checklists/pre-ride.md`):

```yaml
---
type: checklist
id: c1
name: Pre-ride check
items: Helmet & gloves, Air pressure, Chain lube, Mirrors aligned
created: 2026-09-01T10:00:00.000Z
---
```

### Key map

| Category | Frontmatter keys |
|---|---|
| bike | `id`, `name`, `brand`, `model`, `year`, `odometer`, `fuel_type`, `created`, `bike_photos` |
| fuel | `id`, `date`, `odometer`, `litres`, `price_per_litre`, `total`, `full_tank`, `fuel_station`, `receipt` |
| maintenance | `id`, `date`, `odometer`, `items*`, `cost`, `workshop`, `next_service_km`, `next_service_date`, `title*`, `description*`, `severity*`, `status*`, `estimated_cost*`, `actual_cost*`, `receipt` |
| ride | `id`, `date`, `route`, `distance_km`, `odometer`, `avg_speed_kmh`, `receipt` |
| modification | `id`, `date`, `title`, `description`, `cost`, `installed_by`, `receipt` |
| checklist | `id`, `name`, `items*`, `created` |

`*` issue-only (`type: issue`) / optional fields:
- `items` (maintenance + checklist) is a comma-separated list.
- `title`, `description`, `severity`, `status`, `estimated_cost`, `actual_cost` appear on issues.
- Tickets omitted keys are omitted on disk.

### Rules

- The first `type:` key classifies the file (`bike` | `fuel` | a service type for
  `maintenance/` files | `ride` | `modification` | `checklist`).
- The **body** (free text after the closing `---`) maps to `notes`. All structured data
  lives in frontmatter; unknown keys are ignored on read.
- `price_per_litre × litres` yields `total` when `total` is omitted.
- `receipt` is relative to the entry file (`../media/<category>/<YYYY>/<MM>/<name>`);
  the app resolves it back to `bikelog/bikes/<slug>/media/…` on pull.
- `bikeId` is **not** stored in files — the `<slug>/` folder implies the bike; the app
  re-attaches it on pull.
- Legacy marker files (`# title` + `<!-- bikelog:<category> -->` + `- key: value`) from
  earlier builds are still **readable** and round-tripped during pull.
- Slug = lowercase name, non-alphanumerics → `-`, truncated to 60 chars.
- Checklist names become filenames via `slugify`; duplicate names get an `-<id5>` suffix.

## Sync behavior

- **Auto-sync (0.0.2):** once a repo is selected and you're connected, every local change
  (add/edit/delete) auto-pushes to GitHub after a 5s debounce. The header **↑** button forces
  a push; the header **↓** button forces a pull. Connect + repo selection happen once in Settings.
  Public and **private** repos are both supported — private is recommended for data safety.
- **Push** serializes all localStorage data into per-entry `.md` files + `README.md` and
  commits to the selected repo's default branch. Files (including legacy single-file bikes)
  no longer present locally are removed so a later pull doesn't resurrect them.
- **Pull** reads every `bikelog/bikes/<slug>/**` markdown file, parses into the six
  collections (accepting both the new frontmatter format and legacy marker format), re-attaches
  `bikeId` from the folder slug, and replaces localStorage. A missing `bikelog/` folder yields
  empty data (first-run friendly).
- **Migration:** legacy 0.0.1 `bikes/<slug>.md` single files (meta/fuel/service/issues
  sections) are parsed on pull into the new collections; issues become maintenance entries
  of type `issue`. Legacy `bikelog_issues` localStorage is migrated once too.
- **Photos** are compressed to WebP **in the browser** (canvas strips EXIF, max 2048px,
  quality ~0.82, JPEG fallback) before upload. Profile photos land in
  `bikelog/bikes/<slug>/media/bike/`; entry receipts land in
  `bikelog/bikes/<slug>/media/<category>/<YYYY>/<MM>/` and are referenced via the `receipt`
  key. The app references them from `photos` lists.

> **PR/merge caveat:** if you edit the Markdown by hand on GitHub and the app also pushes,
> the commit uses GitHub API with the latest base tree — last-write-wins per file, not a
> merge. Keep edits lightweight.

## Offline / no backend notes

- Without a connected GitHub account the app is fully functional offline via localStorage.
- Connect once in Settings, then auto-sync keeps GitHub mirrored automatically.