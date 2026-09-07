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
  bikeFilePath,
  bikeSlug,
  bikeToMarkdown,
  markdownToBike,
  readmeToMarkdown,
} from "./mdstore";
import type { Bike, FuelEntry, ServiceEntry, IssueEntry } from "./types";

export interface SyncData {
  bikes: Bike[];
  fuel: FuelEntry[];
  service: ServiceEntry[];
  issues: IssueEntry[];
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

const EMPTY: SyncData = { bikes: [], fuel: [], service: [], issues: [] };

/**
 * Pull all data from bikelog/bikes/*.md in the selected repo.
 * Returns empty arrays if the folder doesn't exist yet (first run / disconnected).
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
  const issues: IssueEntry[] = [];

  let tree;
  try {
    tree = await getRepoTree(env, repo, token, "bikelog/bikes");
  } catch {
    return EMPTY; // folder missing -> nothing synced yet
  }

  const mdFiles = tree.filter((t) => t.type === "blob" && t.path.endsWith(".md"));
  for (const f of mdFiles) {
    const md = await readTextFile(env, repo, token, f.path).catch(() => null);
    if (!md) continue;
    const parsed = markdownToBike(md);
    if (parsed.bike) {
      bikes.push(parsed.bike);
      fuel.push(...parsed.fuel);
      service.push(...parsed.service);
      issues.push(...parsed.issues);
    }
  }

  return { bikes, fuel, service, issues };
}

/**
 * Push current data to the selected repo as Markdown (one file per bike + README).
 */
export async function pushToRepo(
  env: GitHubEnv,
  request: Request,
  login: string | null,
  data: SyncData
): Promise<void> {
  const { token, repo } = await resolve(env, request, login);

  const byBike = (bikeId: string) => ({
    fuelList: data.fuel.filter((f) => f.bikeId === bikeId),
    serviceList: data.service.filter((s) => s.bikeId === bikeId),
    issuesList: data.issues.filter((i) => i.bikeId === bikeId),
  });

  const files: { path: string; content: string }[] = [];
  const fuelByBike: Record<string, FuelEntry[]> = {};
  const serviceByBike: Record<string, ServiceEntry[]> = {};
  const issueByBike: Record<string, IssueEntry[]> = {};

  for (const bike of data.bikes) {
    const { fuelList, serviceList, issuesList } = byBike(bike.id);
    files.push({ path: bikeFilePath(bike.name), content: bikeToMarkdown(bike, fuelList, serviceList, issuesList) });
    fuelByBike[bike.id] = fuelList;
    serviceByBike[bike.id] = serviceList;
    issueByBike[bike.id] = issuesList;
  }

  files.push({
    path: "bikelog/README.md",
    content: readmeToMarkdown(data.bikes, fuelByBike, serviceByBike, issueByBike),
  });

  await commitFiles(env, repo, token, files, "BikeLog: sync data");

  // Remove markdown files for bikes that no longer exist (deleted locally),
  // so a later pull doesn't resurrect them.
  const slugs = new Set(data.bikes.map((b) => bikeSlug(b.name)));
  const existing = await getRepoTree(env, repo, token, "bikelog/bikes").catch(() => [] as { path: string }[]);
  for (const f of existing) {
    if (f.type !== "blob" || !f.path.endsWith(".md")) continue;
    const slug = f.path.split("/").pop()?.replace(/\.md$/, "");
    if (slug && !slugs.has(slug)) {
      await deleteFile(env, repo, token, f.path, "BikeLog: remove deleted bike").catch(() => null);
    }
  }
}
