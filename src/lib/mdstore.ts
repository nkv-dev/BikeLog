import type { Bike, FuelEntry, ServiceEntry, Ride, Modification, Checklist } from "./types";

// ---------------------------------------------------------------------------
// BikeLog stores all data as Markdown files in the user's GitHub repo.
//
// Repo layout (inside the user's selected repo):
//   bikelog/README.md                          -> auto-generated dashboard index
//   bikelog/bikes/<slug>/bike.md               -> bike profile (meta)
//   bikelog/bikes/<slug>/fuel/<date>-<odo>.md       -> one file per fuel fill
//   bikelog/bikes/<slug>/maintenance/<date>-<slug>.md -> service / repairs / issues
//   bikelog/bikes/<slug>/rides/<date>-<slug>.md     -> rides
//   bikelog/bikes/<slug>/modifications/<date>-<slug>.md
//   bikelog/bikes/<slug>/checklists/<name>.md        -> checklist templates
//   bikelog/bikes/<slug>/media/
//       bike/<name>.<ext>                          -> bike profile photos
//       <category>/<YYYY>/<MM>/<date>-<slug>.<ext> -> entry photos (receipts)
//
// Every entry file uses YAML frontmatter + a free-text Markdown body so it can
// be edited by hand AND round-tripped back into the app:
//
//   ---
//   type: fuel
//   id: f1
//   date: 2026-09-01
//   odometer: 42381
//   litres: 8.2
//   price_per_litre: 103.20
//   total: 846.24
//   full_tank: true
//   fuel_station: HP Petrol Pump
//   receipt: ../media/fuel/2026/09/2026-09-01-42381.webp
//   ---
//
//   Filled before the highway ride.
//
// The first `type:` key classifies the file (`bike` | `fuel` | a service type
// `scheduled|repair|general|issue` for maintenance files | `ride` |
// `modification` | `checklist`). Keys are snake_case. Structured data lives in
// frontmatter; notes/description text lives in the body.
//
// Legacy `# title` + `<!-- bikelog:category -->` marker files are still
// READABLE (backwards compatible); everything new is written as frontmatter.
// ---------------------------------------------------------------------------

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "bike";

export const bikeSlug = (name: string): string => slugify(name);

/** A short, filename-safe slug for an entry's distinguishing label. */
const labelSlug = (s: string): string => slugify(s);

const fmtDate = (iso: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

// ---- path helpers ----

export const bikeDir = (slug: string) => `bikelog/bikes/${slug}`;
export const mediaDir = (slug: string) => `${bikeDir(slug)}/media`;

/** Relative path for the bike's media file (profile photos). */
export const bikeMediaPath = (slug: string, name: string): string =>
  `${mediaDir(slug)}/bike/${name}`;

/** Relative path for an entry's media file: <category>/<YYYY>/<MM>/<name>. */
export const entryMediaPath = (slug: string, category: string, date: string, name: string): string => {
  const d = fmtDate(date);
  const [y, m] = [d.slice(0, 4), d.slice(5, 7)];
  return `${mediaDir(slug)}/${category}/${y || "0000"}/${m || "00"}/${name}`;
};

function entryFilePath(slug: string, dir: string, date: string, label: string, id: string, used: Set<string>): string {
  const base = dir === "checklists"
    ? `${label}.md`
    : `${fmtDate(date) || "unknown"}-${label}.md`;
  let path = `${bikeDir(slug)}/${dir}/${base}`;
  const seen = used.has(path);
  used.add(path);
  if (seen) {
    path = path.replace(/\.md$/, `-${id.slice(-5)}.md`);
    used.add(path);
  }
  return path;
}

export function fuelFilePath(slug: string, f: FuelEntry, used: Set<string>): string {
  return entryFilePath(slug, "fuel", f.date, String(f.odometer || 0), f.id, used);
}

export function serviceFilePath(slug: string, s: ServiceEntry, used: Set<string>): string {
  const label = labelSlug(s.items?.[0] || s.title || s.type || "service");
  return entryFilePath(slug, "maintenance", s.date, label, s.id, used);
}

export function rideFilePath(slug: string, r: Ride, used: Set<string>): string {
  const label = labelSlug(r.route || "ride");
  return entryFilePath(slug, "rides", r.date, label, r.id, used);
}

export function modificationFilePath(slug: string, m: Modification, used: Set<string>): string {
  const label = labelSlug(m.title || "mod");
  return entryFilePath(slug, "modifications", m.date, label, m.id, used);
}

export function checklistFilePath(slug: string, c: Checklist, used: Set<string>): string {
  const label = labelSlug(c.name || "checklist");
  return entryFilePath(slug, "checklists", c.createdAt || "", label, c.id, used);
}

const SERVICE_TYPES = ["scheduled", "repair", "general", "issue"] as const;

// ---- YAML frontmatter serializer/parser (subset, no deps) ----

/** Render a scalar for YAML frontmatter. Strings stay bare when safe. */
function yamlValue(v: unknown): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = String(v);
  return /^[\w@.,+:\-/ ]*$/.test(s) ? s : JSON.stringify(s);
}

/**
 * Build a frontmatter file. `rows` keep insertion order so output reads
 * naturally (e.g. `date, odometer, litres, price_per_litre, total, …`).
 */
function frontmatter(type: string, rows: [string, unknown][], body?: string): string {
  const lines = ["---", `type: ${type}`];
  for (const [k, v] of rows) {
    if (v === undefined || v === null || v === "") continue;
    lines.push(`${k}: ${yamlValue(v)}`);
  }
  lines.push("---");
  if (body && body.trim()) lines.push("", body.trim());
  lines.push("");
  return lines.join("\n");
}

interface Frontmatter {
  props: Record<string, string | number | boolean>;
  body: string;
}

/** Parse a leading `---\n…\n---` block. Returns null if there is none. */
function parseFrontmatter(md: string): Frontmatter | null {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const props: Record<string, string | number | boolean> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const raw = kv[2].trim();
    props[kv[1]] = parseYamlScalar(raw);
  }
  const body = md.slice(m[0].length).trim();
  return { props, body };
}

function parseYamlScalar(raw: string): string | number | boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const quoted = raw.match(/^"(.*)"$/s) ?? raw.match(/^'(.*)'$/s);
  if (quoted) return quoted[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

// ---- conversion helpers (frontmatter props -> typed model) ----

const fStr = (p: Record<string, string | number | boolean>, k: string, d = ""): string =>
  typeof p[k] === "string" ? p[k] : p[k] !== undefined ? String(p[k]) : d;
const fNum = (p: Record<string, string | number | boolean>, k: string, d = 0): number =>
  typeof p[k] === "number" ? p[k] : p[k] !== undefined ? Number(p[k]) : d;
const fBool = (p: Record<string, string | number | boolean>, k: string): boolean =>
  p[k] === true || p[k] === "true" || p[k] === "1";
const fList = (p: Record<string, string | number | boolean>, k: string): string[] =>
  typeof p[k] === "string" ? p[k].split(",").map((x) => x.trim()).filter(Boolean) : [];

// ---- receipt / media path handling ----

/** Convert a repo-relative media path into the `receipt:` value of an entry file. */
function pathToReceipt(slug: string, repoPath: string): string {
  const prefix = `${mediaDir(slug)}/`;
  if (repoPath.startsWith(prefix)) return `../media/${repoPath.slice(prefix.length)}`;
  return repoPath;
}

/** Convert an entry file's `receipt:` (relative) back into a repo path. */
function receiptToPath(slug: string, rel: string): string {
  if (!rel) return "";
  if (rel.startsWith("../media/")) return `${mediaDir(slug)}/${rel.slice("../media/".length)}`;
  return rel;
}

const firstReceipt = (slug: string, photos: string[] | undefined): string | undefined => {
  const first = photos?.[0];
  return first ? pathToReceipt(slug, first) : undefined;
};

// ---- legacy marker-format parser (read-only fallback) ----

interface ParsedEntry {
  category: string;
  props: Record<string, string>;
}

/** Parse `<!-- bikelog:category -->` + `- key: value` props. */
function parseEntryMarkdown(md: string): ParsedEntry | null {
  const category = md.match(/<!--\s*bikelog:(\w+)\s*-->/)?.[1];
  if (!category) return null;
  const props: Record<string, string> = {};
  const start = md.indexOf(`bikelog:${category}`);
  const propsStart = md.indexOf("\n", start);
  const body = propsStart === -1 ? "" : md.slice(propsStart + 1);
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s+(.+?):\s*(.*)$/);
    if (m) props[m[1]] = m[2];
  }
  return { category, props };
}

const num = (s: string | undefined, d = 0) => (s ? Number(s) : d);
const isTrue = (s: string | undefined) => s === "true" || s === "1";
const splitList = (s: string | undefined) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

// ---- entry → markdown (YAML frontmatter) ----

export function fuelToMarkdown(f: FuelEntry, slug = ""): string {
  return frontmatter("fuel", [
    ["id", f.id],
    ["date", fmtDate(f.date) || f.date],
    ["odometer", f.odometer],
    ["litres", f.litres],
    ["price_per_litre", f.pricePerLitre],
    ["total", f.totalCost],
    ["full_tank", f.isFullTank],
    ["fuel_station", f.station],
    ["receipt", firstReceipt(slug, f.photos)],
  ], f.notes);
}

export function serviceToMarkdown(s: ServiceEntry, slug = ""): string {
  return frontmatter(s.type, [
    ["id", s.id],
    ["date", fmtDate(s.date) || s.date],
    ["odometer", s.odometer],
    ["items", (s.items ?? []).join(", ")],
    ["cost", s.cost],
    ["workshop", s.workshop],
    ["next_service_km", s.nextServiceKm],
    ["next_service_date", s.nextServiceDate],
    ["title", s.title],
    ["description", s.description],
    ["severity", s.severity],
    ["status", s.status],
    ["estimated_cost", s.estimatedCost],
    ["actual_cost", s.actualCost],
    ["receipt", firstReceipt(slug, s.photos)],
  ], s.notes);
}

export function rideToMarkdown(r: Ride, slug = ""): string {
  return frontmatter("ride", [
    ["id", r.id],
    ["date", fmtDate(r.date) || r.date],
    ["route", r.route],
    ["distance_km", r.distanceKm],
    ["odometer", r.odometer],
    ["avg_speed_kmh", r.avgSpeedKmh],
    ["receipt", firstReceipt(slug, r.photos)],
  ], r.notes);
}

export function modificationToMarkdown(m: Modification, slug = ""): string {
  return frontmatter("modification", [
    ["id", m.id],
    ["date", fmtDate(m.date) || m.date],
    ["title", m.title],
    ["description", m.description],
    ["cost", m.cost],
    ["installed_by", m.installedBy],
    ["receipt", firstReceipt(slug, m.photos)],
  ], m.notes);
}

export function checklistToMarkdown(c: Checklist): string {
  return frontmatter("checklist", [
    ["id", c.id],
    ["name", c.name],
    ["items", (c.items ?? []).join(", ")],
    ["created", c.createdAt],
  ]);
}

// ---- markdown → entry (frontmatter first, legacy markers as fallback) ----

export function markdownToFuel(md: string, slug = ""): FuelEntry | null {
  const fm = parseFrontmatter(md);
  if (fm && fStr(fm.props, "type") === "fuel") {
    const p = fm.props;
    const id = fStr(p, "id");
    if (!id) return null;
    const litres = fNum(p, "litres");
    const pricePerLitre = fNum(p, "price_per_litre");
    const photos = fStr(p, "receipt") ? [receiptToPath(slug, fStr(p, "receipt"))] : [];
    return {
      id,
      bikeId: "",
      date: fStr(p, "date") || new Date().toISOString(),
      odometer: fNum(p, "odometer"),
      litres,
      pricePerLitre,
      totalCost: p.total !== undefined ? fNum(p, "total") : litres * pricePerLitre,
      isFullTank: fBool(p, "full_tank"),
      station: fStr(p, "fuel_station") || undefined,
      notes: fm.body || undefined,
      photos,
    };
  }

  const p = parseEntryMarkdown(md);
  if (!p || p.category !== "fuel" || !p.props.id) return null;
  return {
    id: p.props.id,
    bikeId: p.props.bikeId || "",
    date: p.props.date || new Date().toISOString(),
    odometer: num(p.props.odometer),
    litres: num(p.props.litres),
    pricePerLitre: num(p.props.pricePerLitre),
    totalCost: p.props.totalCost !== undefined ? num(p.props.totalCost) : num(p.props.cost),
    isFullTank: isTrue(p.props.isFullTank) ?? isTrue(p.props.full),
    station: p.props.station || undefined,
    notes: p.props.notes || undefined,
  };
}

export function markdownToService(md: string, slug = ""): ServiceEntry | null {
  const fm = parseFrontmatter(md);
  if (fm && (SERVICE_TYPES as readonly string[]).includes(fStr(fm.props, "type"))) {
    const p = fm.props;
    const id = fStr(p, "id");
    if (!id) return null;
    const photos = fStr(p, "receipt") ? [receiptToPath(slug, fStr(p, "receipt"))] : [];
    return {
      id,
      bikeId: "",
      date: fStr(p, "date") || new Date().toISOString(),
      odometer: fNum(p, "odometer"),
      type: fStr(p, "type") as ServiceEntry["type"],
      items: fList(p, "items"),
      cost: fNum(p, "cost"),
      workshop: fStr(p, "workshop") || undefined,
      notes: fm.body || undefined,
      nextServiceKm: p.next_service_km !== undefined ? fNum(p, "next_service_km") : undefined,
      nextServiceDate: fStr(p, "next_service_date") || undefined,
      title: fStr(p, "title") || undefined,
      description: fStr(p, "description") || undefined,
      severity: (fStr(p, "severity") as ServiceEntry["severity"]) || undefined,
      status: (fStr(p, "status") as ServiceEntry["status"]) || undefined,
      estimatedCost: p.estimated_cost !== undefined ? fNum(p, "estimated_cost") : undefined,
      actualCost: p.actual_cost !== undefined ? fNum(p, "actual_cost") : undefined,
      photos,
    };
  }

  const p = parseEntryMarkdown(md);
  if (!p || p.category !== "service" || !p.props.id) return null;
  const type = (p.props.type as ServiceEntry["type"]) || "general";
  return {
    id: p.props.id,
    bikeId: p.props.bikeId || "",
    date: p.props.date || new Date().toISOString(),
    odometer: num(p.props.odometer),
    type,
    items: splitList(p.props.items),
    cost: num(p.props.cost),
    workshop: p.props.workshop || undefined,
    notes: p.props.notes || undefined,
    nextServiceKm: p.props.nextServiceKm ? num(p.props.nextServiceKm) : undefined,
    nextServiceDate: p.props.nextServiceDate || undefined,
    title: p.props.title || undefined,
    description: p.props.description || undefined,
    severity: (p.props.severity as ServiceEntry["severity"]) || undefined,
    status: (p.props.status as ServiceEntry["status"]) || undefined,
    estimatedCost: p.props.estimatedCost ? num(p.props.estimatedCost) : undefined,
    actualCost: p.props.actualCost ? num(p.props.actualCost) : undefined,
  };
}

export function markdownToRide(md: string, slug = ""): Ride | null {
  const fm = parseFrontmatter(md);
  if (fm && fStr(fm.props, "type") === "ride") {
    const p = fm.props;
    const id = fStr(p, "id");
    if (!id) return null;
    const photos = fStr(p, "receipt") ? [receiptToPath(slug, fStr(p, "receipt"))] : [];
    return {
      id,
      bikeId: "",
      date: fStr(p, "date") || new Date().toISOString(),
      route: fStr(p, "route"),
      distanceKm: fNum(p, "distance_km"),
      odometer: p.odometer !== undefined ? fNum(p, "odometer") : undefined,
      avgSpeedKmh: p.avg_speed_kmh !== undefined ? fNum(p, "avg_speed_kmh") : undefined,
      notes: fm.body || undefined,
      photos,
    };
  }

  const p = parseEntryMarkdown(md);
  if (!p || p.category !== "ride" || !p.props.id) return null;
  return {
    id: p.props.id,
    bikeId: p.props.bikeId || "",
    date: p.props.date || new Date().toISOString(),
    route: p.props.route || "",
    distanceKm: num(p.props.distanceKm),
    odometer: p.props.odometer ? num(p.props.odometer) : undefined,
    avgSpeedKmh: p.props.avgSpeedKmh ? num(p.props.avgSpeedKmh) : undefined,
    notes: p.props.notes || undefined,
  };
}

export function markdownToModification(md: string, slug = ""): Modification | null {
  const fm = parseFrontmatter(md);
  if (fm && fStr(fm.props, "type") === "modification") {
    const p = fm.props;
    const id = fStr(p, "id");
    if (!id) return null;
    const photos = fStr(p, "receipt") ? [receiptToPath(slug, fStr(p, "receipt"))] : [];
    return {
      id,
      bikeId: "",
      date: fStr(p, "date") || new Date().toISOString(),
      title: fStr(p, "title"),
      description: fStr(p, "description") || undefined,
      cost: p.cost !== undefined ? fNum(p, "cost") : undefined,
      installedBy: fStr(p, "installed_by") || undefined,
      notes: fm.body || undefined,
      photos,
    };
  }

  const p = parseEntryMarkdown(md);
  if (!p || p.category !== "modification" || !p.props.id) return null;
  return {
    id: p.props.id,
    bikeId: p.props.bikeId || "",
    date: p.props.date || new Date().toISOString(),
    title: p.props.title || "",
    description: p.props.description || undefined,
    cost: p.props.cost ? num(p.props.cost) : undefined,
    installedBy: p.props.installedBy || undefined,
    notes: p.props.notes || undefined,
  };
}

export function markdownToChecklist(md: string): Checklist | null {
  const fm = parseFrontmatter(md);
  if (fm && fStr(fm.props, "type") === "checklist") {
    const p = fm.props;
    const id = fStr(p, "id");
    if (!id) return null;
    return {
      id,
      bikeId: "",
      name: fStr(p, "name"),
      items: fList(p, "items"),
      createdAt: fStr(p, "created") || new Date().toISOString(),
    };
  }

  const p = parseEntryMarkdown(md);
  if (!p || p.category !== "checklist" || !p.props.id) return null;
  return {
    id: p.props.id,
    bikeId: p.props.bikeId || "",
    name: p.props.name || "",
    items: splitList(p.props.items),
    createdAt: p.props.createdAt || new Date().toISOString(),
  };
}

// ---- legacy single-file-per-bike format (0.0.1) ----

interface LegacyBlock {
  title: string;
  props: Record<string, string>;
}

/** Parse a legacy `bikes/<slug>.md` (sections: meta/fuel/service/issues). */
function legacyParse(md: string): { meta: Record<string, string>; blocks: Record<string, LegacyBlock[]> } {
  const lines = md.split("\n");
  const blocks: Record<string, LegacyBlock[]> = {};
  let currentSection: string | null = null;
  let currentBlock: LegacyBlock | null = null;

  for (const line of lines) {
    const marker = line.match(/^<!--\s*bikelog:(\w+)\s*-->/);
    if (marker) {
      currentSection = marker[1];
      if (currentSection === "meta") {
        currentBlock = { title: "meta", props: {} };
        blocks[currentSection] = [currentBlock];
      } else {
        currentBlock = null;
      }
      continue;
    }
    if (!currentSection) continue;
    const head = line.match(/^###\s+(.*)$/);
    const prop = line.match(/^-\s+(.+?):\s*(.*)$/);
    if (head) {
      currentBlock = { title: head[1], props: {} };
      blocks[currentSection] = blocks[currentSection] ?? [];
      blocks[currentSection].push(currentBlock);
      continue;
    }
    if (prop && currentBlock) currentBlock.props[prop[1]] = prop[2];
  }
  return { meta: blocks["meta"]?.[0]?.props ?? {}, blocks };
}

/** Parse and convert a legacy 0.0.1 `bikes/<slug>.md` into the new model. */
export function legacyMarkdownToBike(md: string): {
  bike: Bike | null;
  fuel: FuelEntry[];
  service: ServiceEntry[];
  rides: Ride[];
  modifications: Modification[];
  checklists: Checklist[];
} {
  const { meta, blocks } = legacyParse(md);
  if (!meta.id || !meta.name) return { bike: null, fuel: [], service: [], rides: [], modifications: [], checklists: [] };

  const bike: Bike = {
    id: meta.id,
    name: meta.name,
    brand: meta.brand || "",
    model: meta.model || "",
    year: num(meta.year, 0),
    odometer: num(meta.odometer, 0),
    fuelType: meta.fuelType === "diesel" ? "diesel" : "petrol",
    createdAt: meta.createdAt || new Date().toISOString(),
    photos: meta.photos ? meta.photos.split(",").map((p) => p.trim()).filter(Boolean) : [],
  };
  const bikeId = bike.id;

  const fuel: FuelEntry[] = (blocks["fuel"] ?? [])
    .map((b) => {
      const p = b.props;
      if (!p.id) return null;
      return {
        id: p.id,
        bikeId: p.bikeId || bikeId,
        date: p.date || new Date().toISOString(),
        odometer: num(p.odometer),
        litres: num(p.litres),
        pricePerLitre: num(p.pricePerLitre),
        totalCost: p.totalCost !== undefined ? num(p.totalCost) : num(p.cost),
        isFullTank: isTrue(p.isFullTank) ?? isTrue(p.full),
        station: p.station || undefined,
        notes: p.notes || undefined,
      } as FuelEntry;
    })
    .filter((x): x is FuelEntry => x !== null);

  const service: ServiceEntry[] = (blocks["service"] ?? []).map((b) => {
    const p = b.props;
    return {
      id: p.id,
      bikeId: p.bikeId || bikeId,
      date: p.date || new Date().toISOString(),
      odometer: num(p.odometer),
      type: (p.type as ServiceEntry["type"]) || "general",
      items: splitList(p.items),
      cost: num(p.cost),
      workshop: p.workshop || undefined,
      notes: p.notes || undefined,
      nextServiceKm: p.nextServiceKm ? num(p.nextServiceKm) : undefined,
      nextServiceDate: p.nextServiceDate || undefined,
    } as ServiceEntry;
  });

  // Legacy issues → maintenance entries with type "issue".
  const issues: ServiceEntry[] = (blocks["issues"] ?? []).map((b) => {
    const p = b.props;
    return {
      id: p.id,
      bikeId: p.bikeId || bikeId,
      date: p.date || new Date().toISOString(),
      odometer: num(p.odometer),
      type: "issue",
      items: [],
      cost: p.actualCost ? num(p.actualCost) : p.estimatedCost ? num(p.estimatedCost) : 0,
      title: p.title || p.description || "",
      description: p.description || p.title || "",
      severity: (p.severity as ServiceEntry["severity"]) || "low",
      status: (p.status as ServiceEntry["status"]) || "reported",
      estimatedCost: p.estimatedCost ? num(p.estimatedCost) : undefined,
      actualCost: p.actualCost ? num(p.actualCost) : undefined,
      notes: p.notes || undefined,
    } as ServiceEntry;
  });

  return {
    bike,
    fuel,
    service: [...service, ...issues],
    rides: [],
    modifications: [],
    checklists: [],
  };
}

// ---- bike profile (meta) file ----

export function bikeToMarkdown(bike: Bike): string {
  return frontmatter("bike", [
    ["id", bike.id],
    ["name", bike.name],
    ["brand", bike.brand],
    ["model", bike.model],
    ["year", bike.year],
    ["odometer", bike.odometer],
    ["fuel_type", bike.fuelType],
    ["created", bike.createdAt],
    ["bike_photos", (bike.photos ?? []).join(",")],
  ]);
}

export function markdownToBike(md: string): Bike | null {
  const fm = parseFrontmatter(md);
  if (fm && fStr(fm.props, "type") === "bike") {
    const p = fm.props;
    const id = fStr(p, "id");
    const name = fStr(p, "name");
    if (!id || !name) return null;
    return {
      id,
      name,
      brand: fStr(p, "brand"),
      model: fStr(p, "model"),
      year: fNum(p, "year"),
      odometer: fNum(p, "odometer"),
      fuelType: fStr(p, "fuel_type") === "diesel" ? "diesel" : "petrol",
      createdAt: fStr(p, "created") || new Date().toISOString(),
      photos: fList(p, "bike_photos"),
    };
  }

  const p = parseEntryMarkdown(md);
  if (!p || p.category !== "bike" || !p.props.id || !p.props.name) return null;
  return {
    id: p.props.id,
    name: p.props.name,
    brand: p.props.brand || "",
    model: p.props.model || "",
    year: num(p.props.year, 0),
    odometer: num(p.props.odometer, 0),
    fuelType: p.props.fuelType === "diesel" ? "diesel" : "petrol",
    createdAt: p.props.createdAt || new Date().toISOString(),
    photos: p.props.photos ? p.props.photos.split(",").map((p2) => p2.trim()).filter(Boolean) : [],
  };
}

// ---- README.md (dashboard index) ----

export function readmeToMarkdown(
  bikes: Bike[],
  data: {
    fuel: FuelEntry[];
    service: ServiceEntry[];
    rides: Ride[];
    modifications: Modification[];
    checklists: Checklist[];
  }
): string {
  const byBike = (bikeId: string) => ({
    fuel: data.fuel.filter((f) => f.bikeId === bikeId),
    service: data.service.filter((s) => s.bikeId === bikeId),
    rides: data.rides.filter((r) => r.bikeId === bikeId),
    mods: data.modifications.filter((m) => m.bikeId === bikeId),
    checklists: data.checklists.filter((c) => c.bikeId === bikeId),
  });

  const lines: string[] = [
    "# BikeLog",
    "",
    "> Mileage, fuel, service, rides, modifications and checklists — data lives in this repo as Markdown.",
    "",
    "## Bikes",
    "",
  ];

  if (bikes.length === 0) {
    lines.push("_No bikes yet._");
  } else {
    for (const b of bikes) {
      const slug = bikeSlug(b.name);
      const { fuel, service, rides, mods, checklists } = byBike(b.id);
      const sortedFuel = [...fuel].sort((a, c) => a.odometer - c.odometer);
      const totalKm =
        sortedFuel.length >= 2
          ? Math.max(0, sortedFuel[sortedFuel.length - 1].odometer - sortedFuel[0].odometer)
          : b.odometer;
      const lastService = [...service].sort((a, c) => a.date.localeCompare(c.date)).pop();
      const openIssues = service.filter((s) => s.type === "issue" && s.status !== "resolved");

      lines.push(
        `### ${b.name} · [\`${slug}/\`](bikes/${slug}/)`,
        "",
        `- **Odometer:** ${b.odometer} km`,
        `- **Total KM (fills):** ${totalKm} km`,
        `- **Fuel fills:** ${fuel.length}`,
        `- **Rides:** ${rides.length}`,
        `- **Modifications:** ${mods.length}`,
        `- **Checklists:** ${checklists.length}`,
        `- **Last service:** ${lastService ? fmtDate(lastService.date) : "never"}${lastService?.nextServiceKm ? ` · next at ${lastService.nextServiceKm} km` : ""}`,
        `- **Open issues:** ${openIssues.length}`,
        ""
      );
    }
  }

  lines.push("---", "", `<sub>Generated ${new Date().toISOString()} by BikeLog.</sub>`, "");
  return lines.join("\n");
}