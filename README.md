# BikeLog

Mobile-first web app for Indian bikers to track mileage, fuel, servicing, and repairs.

## Features

- **Dashboard** — Total km, average mileage (km/l), monthly spend, recent activity, count-up stat readouts, quick actions
- **Fuel Log** — Track fill-ups, auto-calc mileage and costs in ₹
- **Service Log** — Record scheduled maintenance, repairs, and costs
- **Issues & Repairs** — Log problems with severity/status tracking
- **Bike Profiles** — Manage multiple bikes, switch active bike
- **Brand accents** — Per-brand accent themes with auto + manual override
- **Dark / light mode** — Starwind UI theme toggle
- **Data export/import** — JSON backup and restore
- **Indian-focused** — INR formatting, km units, local bike brands, common service items

## Tech Stack

- [Astro](https://astro.build) — framework
- [Starwind UI](https://starwind.dev) — accessible Tailwind components
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Cloudflare Pages](https://pages.cloudflare.com) — deployment (SSR adapter)
- pnpm — package manager
- localStorage — data persistence (per-device)

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
pnpm build      # build for production
```

## Deploy to Cloudflare Pages

1. Push to GitHub
2. Cloudflare Pages → Create project → connect repo
3. Build command: `pnpm build`
4. Output directory: `dist`

## Project Structure

```
src/
├── components/starwind/   # Starwind UI components
├── layouts/BaseLayout.astro
├── pages/                 # Dashboard, Fuel, Service, Issues, Bikes, Settings
├── lib/                   # types, store, mileage, utils
└── styles/starwind.css
```

## Data Storage

All data is stored in `localStorage` under `bikelog_*` keys. No backend required.
Use Settings → Export to back up your data as JSON.
