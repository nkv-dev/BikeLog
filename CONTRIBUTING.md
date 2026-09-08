# Contributing to BikeLog

Thanks for your interest in BikeLog! This is a small, friendly, open-source
project. Any contribution — a bug report, a typo fix, a new feature, docs, or
a better test — is welcome.

## Code of Conduct

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

```bash
git clone git@github.com:nkv-dev/BikeLog.git
cd BikeLog
pnpm install
pnpm dev         # http://localhost:4321
```

BikeLog requires **Node.js ≥ 22.12** and `pnpm`. See
[docs/SETUP.md](docs/SETUP.md) for full self-hosting instructions.

## Project conventions (read first)

The file explains everything: `AGENTS.md` covers architecture, the data/repo
format, key gotchas, and the dev checklist. Please skim it before touching code.

High-level pointers:

- **Astro 7 SSR** for Cloudflare Workers. Pages are static HTML + inline
  `<script>` reading `localStorage` stores (`src/lib/store.ts`).
- **API endpoints** (`src/pages/api/*.ts`) are plain `.ts` modules — **no
  `---` frontmatter**. Only `.astro` files use frontmatter.
- **Local-first + GitHub-of-record**: the UI reads/writes `localStorage`; a
  GitHub repo is the durable Markdown store. The Worker only proxies OAuth and
  GitHub API calls.
- **Repo format**: YAML frontmatter, snake_case keys, one file per entry under
  `bikelog/bikes/<slug>/`. See [docs/DATA.md](docs/DATA.md).
- Run `pnpm build` before committing — it must pass.

## How to contribute

### 1. Open an issue first (for non-trivial work)

Describe what you want to do or the bug you found, so work isn't wasted.
Good issues include: steps to reproduce, expected vs. actual behavior, and
screenshots where relevant.

### 2. Work on a branch

```bash
git checkout -b feature/your-change
```

Branches are merged into `main` via a merge commit, then cleaned up.

### 3. Make the change

- Follow existing code style (there are no strict linters; match the file).
- Keep changes atomic and focused — one logical change per PR.
- Update relevant docs (`docs/`, `AGENTS.md`, `README.md`) when behavior
  changes.

### 4. Verify

```bash
pnpm build
```

The build must pass. If you change the data format, the round-trip
serializer/parser tests are the contract — keep them green.

### 5. Commit & push

```bash
git commit -m "feat: short description"
git push -u origin feature/your-change
```

Commit messages follow conventional prefixes (`feat:`, `fix:`, `docs:`,
`chore:`, `refactor:`).

### 6. Open a pull request

Describe what changed and why, and link any related issue. A maintainer will
review and merge it.

## Good first issues & roadmap

See [docs/TASKS.md](docs/TASKS.md) for the roadmap. Items marked B1–B8 and
F1–F2 are good starting points.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).