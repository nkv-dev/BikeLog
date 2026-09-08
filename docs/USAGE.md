# User Guide

BikeLog is a **local-first** bike log for Indian riders: track mileage (km/l),
fuel fill-ups, servicing, repairs, rides, modifications, and checklists — on your
phone or laptop.

Your data lives in two places:

1. **In the browser** (`localStorage`) — works instantly, works offline.
2. **In a GitHub repo you own** — as readable Markdown, you can sync to it.

This guide explains how to connect your GitHub account, pick a repo, and keep your
data in sync. It assumes you are using the hosted app (or a deployment provided by
someone). If you want to run your own instance, see [SETUP.md](SETUP.md).

---

## Why sync to GitHub?

- **Backup.** If you clear your browser or switch devices, your log isn't lost.
- **Portability.** The data is plain Markdown — you own it and can read/edit it.
- **Multi-device.** Pull on your phone, push from your laptop.

## Public or private repo?

**Use a private repo for peace of mind.** Private repos are fully supported —
data files, photos, everything syncs exactly the same. With a private repo, only
people you grant access can see your mileage, costs, and bike history.

Want total simplicity? A brand-new private repo with nothing in it works great —
BikeLog will create the `bikelog/` folder on the first push.

> Tip: keep the same repo for the app, or create a dedicated one. Any repo where
> the BikeLog GitHub App is installed (and that you can push to) can be used.

---

## 1. Connect your GitHub account

1. Open **Settings** (gear icon, top right).
2. Find the **GitHub Sync** card.
3. Tap **Connect with GitHub**.
4. GitHub will ask you to authorize the **BikeLog** app and choose where it can be
   installed. Select the account/repos you want to use.
5. You'll be returned to the app and it will show your avatar + username.

> **First-time note:** GitHub may ask you to "install" the BikeLog app on your
> account and choose which repos it can access. Select **All repositories** (or at
> least the repo you'll use) so the app can read/write your `bikelog/` folder.

## 2. Select a repo

After connecting, a **Data repo** dropdown appears under GitHub Sync:

1. Choose the repo where BikeLog should store your data.
   - Private repos are listed with a `· private` tag and work normally.
   - The list shows repos you can push to (owned by you or where you're a collaborator
     and the App is installed).
2. Tap **Save repo**.

> If a repo isn't in the list: install the BikeLog GitHub App on it
> (GitHub → Settings → Applications → BikeLog → Configure → Add repository), then
> reconnect.

## 3. First push

With a repo selected, the app auto-syncs, but you can also push manually:

1. In **Settings → GitHub Sync**, tap **Push data**.
2. After a moment, `bikelog/README.md` and `bikelog/bikes/<slug>/…` appear in your
   repo — one Markdown file per bike and per entry.

From then on, **every change auto-pushes** ~5 seconds after you make it (add fuel,
log a service, add a photo, etc.). You don't need to tap anything.

## 4. Pull (fetch from GitHub)

Pull brings your repo's data *into* the current browser — useful after you've
edited Markdown on GitHub, pushed from another device, or set up a new device:

- **Settings → GitHub Sync → Pull data**, or
- tap the **down arrow (↓)** in the top header.

To send your local data up to GitHub, tap **Push data** or the **up arrow (↑)**
in the header.

## 5. Verify your data in the repo

Open your repo on GitHub and check:

```
bikelog/
├── README.md                       # auto index
└── bikes/<bike-slug>/
    ├── bike.md                     # the bike profile
    ├── fuel/…, rides/…, etc.       # one file per entry
    └── media/…                     # photos
```

See [DATA.md](DATA.md) for the exact format (YAML frontmatter).

## Disconnecting

- **Settings → GitHub Sync → Disconnect** stops syncing; your browser data stays.
- To remove the app entirely: GitHub → Settings → Applications → BikeLog → Revoke.

---

## Frequently asked questions

### Is my data private if I use a private repo?

Yes. All reads/writes happen through GitHub with your authenticated token; the
app server never stores or sees your data. Photos are also served through an
authenticated endpoint.

### Do I need a repo in the list to be existing/non-empty?

No. Empty repos work — the first push auto-creates the initial commit and the
`bikelog/` folder.

### What happens offline?

BikeLog works 100% offline via `localStorage`. Sync happens when you are back
online (each change triggers an auto-push once connected).

### I edited Markdown on GitHub by hand — will it be lost?

GitHub is the store; the app reads it on **pull**. But pushes are last-write-wins
per file, so a push after a manual GitHub edit could overwrite that file. Keep
hand-edits lightweight, and pull before pushing from the app.

### Is the app server storing anything about me?

Only a session cookie and an OAuth token in Cloudflare KV (acting as a login
portal). Your actual data stays in your browser + your repo. See
[SECURITY.md](../SECURITY.md).

---

## Next steps

- [Data format & repo layout](DATA.md)
- [Self-host the app](SETUP.md)
- [Roadmap & contributing](../CONTRIBUTING.md)