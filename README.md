# BikeLog

Mobile-first web app for Indian bikers to track mileage, fuel, servicing, repairs, and photos.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/nkv-dev/BikeLog/actions/workflows/ci.yml/badge.svg)](https://github.com/nkv-dev/BikeLog/actions/workflows/ci.yml)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro%207-ff5d01.svg)](https://astro.build)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.12-brightgreen.svg)](package.json)

**Local-first, GitHub-of-record.** Data lives in your browser's `localStorage` *and* in a GitHub repo you own, as readable Markdown under `bikelog/`. The server holds no user data — it only completes GitHub OAuth and calls the GitHub API on your behalf.

> 🔒 **Public or private repo — both supported.** Choose a **private** repo so your
> mileage, costs, and bike history stay between you and GitHub. Everything (data files
> *and* photos) syncs through your authenticated GitHub token.

## Quick start for users

1. Open the app (or your deployment).
2. **Settings → GitHub Sync → Connect with GitHub**.
3. Authorize the BikeLog app and pick a repo (private recommended).
4. Log entries as usual — every change **auto-syncs** to your repo (5s debounce).

👉 Full walkthrough: [docs/USAGE.md](docs/USAGE.md)

## Features

- **Dashboard** — Total km, average mileage (km/l), monthly spend, recent activity, count-up stat readouts, quick actions
- **Fuel Log** — Track fill-ups, auto-calc mileage and costs in ₹
- **Service Log** — Record scheduled maintenance, repairs, and costs
- **Issues & Repairs** — Log problems with severity/status tracking (folded into maintenance)
- **Ride Log** — Trip tracking: route, distance, avg speed
- **Modifications** — Track upgrades and custom parts with cost
- **Checklists** — Reusable pre-ride / maintenance templates with run mode
- **Bike Profiles** — Manage multiple bikes, switch active bike
- **GitHub Sync + auto-sync** — Sign in with GitHub, pick a repo (public or private); every change auto-pushes as Markdown (5s debounce), with **↑ push / ↓ pull** buttons in the header
- **Photos** — Attach bike photos (stored in your repo under `bikelog/bikes/<slug>/media/`)
- **Brand accents** — Per-brand accent themes with auto + manual override
- **Dark / light mode** — Starwind UI theme toggle
- **Data export/import** — JSON backup and restore
- **Indian-focused** — INR formatting, km units, local bike brands, common service items

## Tech Stack

- [Astro](https://astro.build) — framework (SSR)
- [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) — Cloudflare Workers adapter
- [Starwind UI](https://starwind.dev) — accessible Tailwind components
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Cloudflare Workers + KV](https://developers.cloudflare.com/kv/) — OAuth tokens & sessions
- [GitHub App / REST API](https://docs.github.com/en/rest) — per-user repo storage
- pnpm — package manager

## How data is stored

Two layers, same data:

1. **localStorage** (`bikelog_*`) — offline cache, what the UI reads/writes.
2. **Your GitHub repo** — `bikelog/README.md` (index) + one Markdown file per bike/entry under `bikelog/bikes/<slug>/` (bike.md, fuel/, maintenance/, rides/, modifications/, checklists/) + `media/` (photos).

Format is strict but human-readable so you can also edit it on GitHub. See [docs/DATA.md](docs/DATA.md).

## Documentation

| Doc | What it covers |
|---|---|
| [docs/USAGE.md](docs/USAGE.md) | End-user guide: connect GitHub, pick a repo, push/pull, privacy |
| [docs/DATA.md](docs/DATA.md) | Data model + repo Markdown format (YAML frontmatter) |
| [docs/SETUP.md](docs/SETUP.md) | Self-hosting: GitHub App, KV, deploy |
| [docs/TASKS.md](docs/TASKS.md) | Roadmap & task log |

## Design System

Premium "garage ledger" visual layer in `src/styles/starwind.css`:

- **Type** — Plus Jakarta Sans for UI, JetBrains Mono for instrument readouts (`@fontsource-variable` packages)
- **Tokens** — surface/rule/ink/shadow semantic tokens + motion easings, dark-first with `.dark` and `.light`
- **Components** — `k-label`, `k-stat`, `k-entry` (unified list-entry card), `k-press`/`k-action` tactile buttons, `k-chip`
- **Motion** — `reveal` entrance via IntersectionObserver (opacity/transform only), count-up stats, press feedback; all gated by `prefers-reduced-motion`
- **Accessibility** — known theme contrast pairs verified ≥ WCAG AA; decorative motion disabled under reduced motion

## Development

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # build for production (Cloudflare Worker)
```

> Dev server: use background mode via `astro dev --background`; manage with
> `astro dev stop` / `status` / `logs`.

## Self-hosting

The app hosts **no user data** — you only need to run the front-end + a tiny
Cloudflare Worker for OAuth and GitHub API proxying. Setup takes ~10 minutes:

👉 [docs/SETUP.md](docs/SETUP.md) — GitHub App + KV namespaces + deploy

## Project Structure

```
src/
├── components/starwind/   # Starwind UI components
├── layouts/BaseLayout.astro
├── pages/                 # Dashboard, Fuel, Service, Issues, Bikes, Settings
│   └── api/               # OAuth + sync endpoints (no frontmatter in .ts!)
├── lib/                   # types, store, github client, auth, mdstore, sync
└── styles/starwind.css
```

## Contributing / Roadmap

Open-source friendly — MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and `docs/TASKS.md` for what's been done
and what's next.

## Security

See [SECURITY.md](SECURITY.md). BikeLog holds **no user data** on its own servers —
user data stays in the browser and the user's GitHub repo (which users can keep
private).

## License

MIT — see [LICENSE](LICENSE). © 2026 BikeLog contributors.

Made by [Nitesh Kumar Verma](https://nkv-dev.in) (nkv-dev).