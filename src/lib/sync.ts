import {
  commitFiles,
  deleteFile,
  getRepoTree,
  getSelectedRepo,
  getUserAccessToken,
  readTextFile,
} from "./github";
import type { GitHubEnv } from "./github";
import {
  bikeDir,
  bikeSlug,
  bikeToMarkdown,
  checklistFilePath,
  checklistToMarkdown,
  fuelFilePath,
  fuelToMarkdown,
  legacyMarkdownToBike,
  markdownToBike,
  markdownToChecklist,
  markdownToFuel,
  markdownToModification,
  markdownToRide,
  markdownToService,
  modificationFilePath,
  modificationToMarkdown,
  readmeToMarkdown,
  rideFilePath,
  rideToMarkdown,
  serviceFilePath,
  serviceToMarkdown,
} from "./mdstore";
import type { Bike, FuelEntry, ServiceEntry, Ride, Modification, Checklist } from "./types";

export interface SyncData {
  bikes: Bike[];
  fuel: FuelEntry[];
  service: ServiceEntry[];
  rides: Ride[];
  modifications: Modification[];
  checklists: Checklist[];
}

export class SyncError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Resolve the connected login + access token + selected repo, or throw. */
async function resolve(env: GitHubEnv, request: Request, login: string | null) {
  if (!login) throw new SyncError("Not connected", 401);
  const token = await getUserAccessToken(env, login);
  if (!token) throw new SyncError("Session expired; reconnect", 401);
  const repo = await getSelectedRepo(env, login);
  if (!repo) throw new SyncError("No repo selected", 400);
  return { token, repo };
}

const EMPTY: SyncData = { bikes: [], fuel: [], service: [], rides: [], modifications: [], checklists: [] };

/**
 * Pull all data from bikelog/bikes/<slug>/** in the selected repo.
 * Returns empty arrays if the folder doesn't exist yet (first run / disconnected).
 * Also migrates legacy 0.0.1 single-file bikes/<slug>.md layout.
 */
export async function pullFromRepo(
  env: GitHubEnv,
  request: Request,
  login: string | null
): Promise<SyncData> {
  const { token, repo } = await resolve(env, request, login);

  const bikes: Bike[] = [];
  const fuel: FuelEntry[] = [];
  const service: ServiceEntry[] = [];
  const rides: Ride[] = [];
  const modifications: Modification[] = [];
  const checklists: Checklist[] = [];

  let tree;
  try {
    tree = await getRepoTree(env, repo, token, "bikelog/bikes");
  } catch {
    return EMPTY; // folder missing -> nothing synced yet
  }

  const blobs = tree.filter((t) => t.type === "blob");
  const byDir: Record<string, string[]> = {};
  for (const b of blobs) {
    const parts = b.path.split("/");
    // bikelog/bikes/<slug>/<dir>/... or legacy bikelog/bikes/<slug>.md
    const slug = parts[2];
    if (!slug) continue;
    (byDir[slug] = byDir[slug] ?? []).push(b.path);
  }

  for (const slug of Object.keys(byDir)) {
    const files = byDir[slug];
    const legacy = files.filter((f) => f.replace(/^.*\//, "") === `${slug}.md`);
    const dirFiles = files.filter((f) => !legacy.includes(f));

    // Legacy single-file layout first (content wins unless a new layout exists).
    for (const legacyPath of legacy) {
      const md = await readTextFile(env, repo, token, legacyPath).catch(() => null);
      if (!md) continue;
      const parsed = legacyMarkdownToBike(md);
      if (parsed.bike) {
        bikes.push(parsed.bike);
        fuel.push(...parsed.fuel);
        service.push(...parsed.service);
        rides.push(...parsed.rides);
        modifications.push(...parsed.modifications);
        checklists.push(...parsed.checklists);
      }
    }

    // New per-entry layout.
    const mdFiles = dirFiles.filter((p) => p.endsWith(".md"));
    for (const f of mdFiles) {
      const md = await readTextFile(env, repo, token, f).catch(() => null);
      if (!md) continue;
      const fileName = f.slice(f.lastIndexOf("/") + 1);
      // bikelog/bikes/<slug>/bike.md -> "bike" (the slug is NOT the kind!)
      const kind = fileName === "bike.md" ? "bike" : f.split("/").slice(0, -1).pop();
      if (kind === "bike") {
        const bike = markdownToBike(md);
        if (bike) {
          // Avoid duplicating a bike that was already loaded from a legacy file.
          if (!bikes.some((b) => b.id === bike.id)) bikes.push(bike);
        }
      } else if (kind === "fuel") {
        const e = markdownToFuel(md, slug);
        if (e) fuel.push(e);
      } else if (kind === "maintenance") {
        const e = markdownToService(md, slug);
        if (e) service.push(e);
      } else if (kind === "rides") {
        const e = markdownToRide(md, slug);
        if (e) rides.push(e);
      } else if (kind === "modifications") {
        const e = markdownToModification(md, slug);
        if (e) modifications.push(e);
      } else if (kind === "checklists") {
        const e = markdownToChecklist(md);
        if (e) checklists.push(e);
      }
    }

    // Entries no longer carry bikeId in their files (folders imply the bike).
    // Re-attach it here so pulls round-trip back into the app model.
    const slugBike = bikes.find((b) => bikeSlug(b.name) === slug);
    if (slugBike) {
      const attach = (arr: { bikeId: string }[]) => {
        for (const e of arr) if (!e.bikeId) e.bikeId = slugBike.id;
      };
      attach(fuel);
      attach(service);
      attach(rides);
      attach(modifications);
      attach(checklists);
    }
  }

  return { bikes, fuel, service, rides, modifications, checklists };
}

/**
 * Push current data to the selected repo as Markdown (one file per entry,
 * one per bike profile, plus README). Remove files that no longer exist locally.
 */
export async function pushToRepo(
  env: GitHubEnv,
  request: Request,
  login: string | null,
  data: SyncData
): Promise<void> {
  const { token, repo } = await resolve(env, request, login);

  const byBike = (bikeId: string) => ({
    fuel: data.fuel.filter((f) => f.bikeId === bikeId),
    service: data.service.filter((s) => s.bikeId === bikeId),
    rides: data.rides.filter((r) => r.bikeId === bikeId),
    modifications: data.modifications.filter((m) => m.bikeId === bikeId),
    checklists: data.checklists.filter((c) => c.bikeId === bikeId),
  });

  const files: { path: string; content: string }[] = [];
  const used = new Set<string>();

  for (const bike of data.bikes) {
    const slug = bikeSlug(bike.name);
    const { fuel, service, rides, modifications, checklists } = byBike(bike.id);

    files.push({ path: `${bikeDir(slug)}/bike.md`, content: bikeToMarkdown(bike) });
    for (const f of fuel) files.push({ path: fuelFilePath(slug, f, used), content: fuelToMarkdown(f, slug) });
    for (const s of service)
      files.push({ path: serviceFilePath(slug, s, used), content: serviceToMarkdown(s, slug) });
    for (const r of rides) files.push({ path: rideFilePath(slug, r, used), content: rideToMarkdown(r, slug) });
    for (const m of modifications)
      files.push({ path: modificationFilePath(slug, m, used), content: modificationToMarkdown(m, slug) });
    for (const c of checklists)
      files.push({ path: checklistFilePath(slug, c, used), content: checklistToMarkdown(c) });
  }

  files.push({
    path: "bikelog/README.md",
    content: readmeToMarkdown(data.bikes, data),
  });

  await commitFiles(env, repo, token, files, "BikeLog: sync data");

  // Remove stale files (bikes/entries that no longer exist locally, and any
  // legacy single-file bikes). Keeps a later pull from resurrecting deleted data.
  const activePaths = new Set(files.map((f) => f.path));
  const existing = await getRepoTree(env, repo, token, "bikelog/bikes").catch(() => [] as { path: string; type: string }[]);
  for (const f of existing) {
    if (f.type !== "blob") continue;
    if (activePaths.has(f.path)) continue;
    if (f.path.endsWith(".md")) {
      await deleteFile(env, repo, token, f.path, "BikeLog: remove stale data").catch(() => null);
    }
  }
}