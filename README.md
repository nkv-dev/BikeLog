# BikeLog

Mobile-first web app for Indian bikers to track mileage, fuel, servicing, repairs, and photos.

**Local-first, GitHub-of-record.** Data lives in your browser's `localStorage` *and* in a GitHub repo you own, as readable Markdown under `bikelog/`. The server holds no user data — it only completes GitHub OAuth and calls the GitHub API on your behalf.

## Features

- **Dashboard** — Total km, average mileage (km/l), monthly spend, recent activity, count-up stat readouts, quick actions
- **Fuel Log** — Track fill-ups, auto-calc mileage and costs in ₹
- **Service Log** — Record scheduled maintenance, repairs, and costs
- **Issues & Repairs** — Log problems with severity/status tracking
- **Bike Profiles** — Manage multiple bikes, switch active bike
- **GitHub Sync** — Sign in with GitHub, pick a repo, and push/pull your data as Markdown
- **Photos** — Attach bike photos (stored in your repo under `bikelog/assets/`)
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
2. **Your GitHub repo** — `bikelog/README.md` (index) + `bikelog/bikes/<slug>.md` (per bike) + `bikelog/assets/<slug>/` (photos).

Format is strict but human-readable so you can also edit it on GitHub. See [docs/DATA.md](docs/DATA.md).

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

Open-source friendly. Planned work includes the 0.0.2 cleanup pass (entry editing,
service reminders, validation hardening) — see `docs/TASKS.md` for what's been done
and what's next.

## License

TBD (open source)