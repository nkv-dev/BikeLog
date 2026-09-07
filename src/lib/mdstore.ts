import type { Bike, FuelEntry, ServiceEntry, IssueEntry } from "./types";

// ---------------------------------------------------------------------------
// BikeLog stores all data as Markdown files in the user's GitHub repo.
//
// Repo layout (inside the user's selected repo):
//   bikelog/README.md          -> auto-generated dashboard index
//   bikelog/bikes/<slug>.md    -> one Markdown file per bike
//   bikelog/assets/<slug>/...  -> photos
//
// Each bike file uses a strict, human-readable Markdown structure so it can be
// edited by hand AND round-tripped back into the app:
//
//   # Duke 390
//
//   <!-- bikelog:meta -->
//   - id: 5f8e...
//   - name: Duke 390
//   - brand: KTM
//   - model: Duke 390 BS6
//   - year: 2021
//   - odometer: 12345
//   - fuelType: petrol
//   - createdAt: 2026-09-01T00:00:00.000Z
//   - photos:
//
//   ## Fuel
//   <!-- bikelog:fuel -->
//   ### 2026-09-01 · 12345 km
//   - id: f1
//   - odometer: 12345
//   - litres: 8.2
//   - pricePerLitre: 98.4
//   - totalCost: 620
//   - isFullTank: true
//
//   ## Service
//   <!-- bikelog:service -->
//   ...
//
//   ## Issues
//   <!-- bikelog:issues -->
//   ...
// ---------------------------------------------------------------------------

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "bike";

/** Path to a bike's markdown file. */
export const bikeFilePath = (name: string): string => `bikelog/bikes/${slugify(name)}.md`;
export const bikeSlug = (name: string): string => slugify(name);

// ---- small line-based markdown serializer/parser (no deps) ----

function propLines(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `- ${k}: ${String(v)}`)
    .join("\n");
}

interface ParsedBlock {
  title: string;
  props: Record<string, string>;
}

/** Parse a bike markdown file into metadata + entry blocks. */
function parseBikeMarkdown(md: string): {
  meta: Record<string, string>;
  blocks: Record<string, ParsedBlock[]>;
} {
  const lines = md.split("\n");
  const blocks: Record<string, ParsedBlock[]> = {};
  let currentSection: string | null = null;
  let currentBlock: ParsedBlock | null = null;

  for (const line of lines) {
    const markerMatch = line.match(/^<!--\s*bikelog:(\w+)\s*-->/);
    if (markerMatch) {
      currentSection = markerMatch[1];
      // The meta block has no `###` heading — collect props into it directly.
      if (currentSection === "meta") {
        currentBlock = { title: "meta", props: {} };
        blocks[currentSection] = [currentBlock];
      } else {
        currentBlock = null;
      }
      continue;
    }
    if (!currentSection) continue;

    const headMatch = line.match(/^###\s+(.*)$/);
    const propMatch = line.match(/^-\s+(.+?):\s*(.*)$/);

    if (headMatch) {
      currentBlock = { title: headMatch[1], props: {} };
      if (!blocks[currentSection]) blocks[currentSection] = [];
      blocks[currentSection].push(currentBlock);
      continue;
    }
    if (propMatch && currentBlock) {
      currentBlock.props[propMatch[1]] = propMatch[2];
    }
  }

  const meta = blocks["meta"]?.[0]?.props ?? {};
  return { meta, blocks };
}

const num = (s: string | undefined, d = 0) => (s ? Number(s) : d);
const isTrue = (s: string | undefined) => s === "true" || s === "1";

// ---- deserialize entries ----

function metaToBike(meta: Record<string, string>): Bike | null {
  if (!meta.id || !meta.name) return null;
  return {
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
}

function fuelFromProps(p: Record<string, string>, bikeId: string): FuelEntry | null {
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
  };
}

function serviceFromProps(p: Record<string, string>, bikeId: string): ServiceEntry | null {
  if (!p.id) return null;
  return {
    id: p.id,
    bikeId: p.bikeId || bikeId,
    date: p.date || new Date().toISOString(),
    odometer: num(p.odometer),
    type: (p.type as ServiceEntry["type"]) || "general",
    items: p.items ? p.items.split(",").map((i) => i.trim()).filter(Boolean) : [],
    cost: num(p.cost),
    workshop: p.workshop || undefined,
    notes: p.notes || undefined,
    nextServiceKm: p.nextServiceKm ? num(p.nextServiceKm) : undefined,
    nextServiceDate: p.nextServiceDate || undefined,
  };
}

function issueFromProps(p: Record<string, string>, bikeId: string): IssueEntry | null {
  if (!p.id) return null;
  return {
    id: p.id,
    bikeId: p.bikeId || bikeId,
    date: p.date || new Date().toISOString(),
    odometer: num(p.odometer),
    title: p.title || p.description || "",
    description: p.description || p.title || "",
    severity: (p.severity as IssueEntry["severity"]) || "low",
    status: (p.status as IssueEntry["status"]) || "reported",
    estimatedCost: p.estimatedCost ? num(p.estimatedCost) : undefined,
    actualCost: p.actualCost ? num(p.actualCost) : undefined,
    notes: p.notes || undefined,
  };
}

// ---- serialize one bike to markdown ----

export function bikeToMarkdown(
  bike: Bike,
  fuel: FuelEntry[],
  service: ServiceEntry[],
  issues: IssueEntry[]
): string {
  const fmtDate = (iso: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

  const fuelMd = [...fuel]
    .sort((a, b) => a.odometer - b.odometer)
    .map(
      (f) =>
        `### ${fmtDate(f.date)} · ${f.odometer} km\n` +
        propLines({
          id: f.id,
          bikeId: f.bikeId,
          date: f.date,
          odometer: f.odometer,
          litres: f.litres,
          pricePerLitre: f.pricePerLitre,
          totalCost: f.totalCost,
          isFullTank: f.isFullTank,
          station: f.station,
          notes: f.notes,
        })
    )
    .join("\n\n");

  const serviceMd = [...service]
    .sort((a, b) => a.odometer - b.odometer)
    .map(
      (s) =>
        `### ${fmtDate(s.date)} · ${s.odometer} km\n` +
        propLines({
          id: s.id,
          bikeId: s.bikeId,
          date: s.date,
          odometer: s.odometer,
          type: s.type,
          items: s.items.join(","),
          cost: s.cost,
          workshop: s.workshop,
          notes: s.notes,
          nextServiceKm: s.nextServiceKm,
          nextServiceDate: s.nextServiceDate,
        })
    )
    .join("\n\n");

  const issueMd = [...issues]
    .sort((a, b) => a.odometer - b.odometer)
    .map(
      (i) =>
        `### ${fmtDate(i.date)} · ${i.odometer} km\n` +
        propLines({
          id: i.id,
          bikeId: i.bikeId,
          date: i.date,
          odometer: i.odometer,
          title: i.title,
          description: i.description,
          severity: i.severity,
          status: i.status,
          estimatedCost: i.estimatedCost,
          actualCost: i.actualCost,
          notes: i.notes,
        })
    )
    .join("\n\n");

  return [
    `# ${bike.name}`,
    "",
    `<sub>Auto-generated by BikeLog · edit with care, format is strict</sub>`,
    "",
    "<!-- bikelog:meta -->",
    propLines({
      id: bike.id,
      name: bike.name,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      odometer: bike.odometer,
      fuelType: bike.fuelType,
      createdAt: bike.createdAt,
      photos: (bike.photos ?? []).join(","),
    }),
    "",
    "## Fuel",
    "<!-- bikelog:fuel -->",
    fuelMd || "_No fuel entries._",
    "",
    "## Service",
    "<!-- bikelog:service -->",
    serviceMd || "_No service entries._",
    "",
    "## Issues",
    "<!-- bikelog:issues -->",
    issueMd || "_No issues._",
    "",
  ].join("\n");
}

// ---- parse a bike markdown file back into store arrays ----

export function markdownToBike(md: string): {
  bike: Bike | null;
  fuel: FuelEntry[];
  service: ServiceEntry[];
  issues: IssueEntry[];
} {
  const { meta, blocks } = parseBikeMarkdown(md);
  const bike = metaToBike(meta);
  const bikeId = bike?.id ?? "";

  const fuel = (blocks["fuel"] ?? [])
    .map((b) => fuelFromProps(b.props, bikeId))
    .filter((x): x is FuelEntry => x !== null);
  const service = (blocks["service"] ?? [])
    .map((b) => serviceFromProps(b.props, bikeId))
    .filter((x): x is ServiceEntry => x !== null);
  const issues = (blocks["issues"] ?? [])
    .map((b) => issueFromProps(b.props, bikeId))
    .filter((x): x is IssueEntry => x !== null);

  return { bike, fuel, service, issues };
}

// ---- README.md (dashboard index) ----

export function readmeToMarkdown(
  bikes: Bike[],
  fuelByBike: Record<string, FuelEntry[]>,
  serviceByBike: Record<string, ServiceEntry[]>,
  issueByBike: Record<string, IssueEntry[]>
): string {
  const totalKm = (fuel: FuelEntry[], odometer: number) => {
    const sorted = [...fuel].sort((a, b) => a.odometer - b.odometer);
    if (sorted.length < 2) return odometer;
    return Math.max(0, sorted[sorted.length - 1].odometer - sorted[0].odometer);
  };

  const lines: string[] = [
    "# BikeLog",
    "",
    "> Mileage, fuel, service and issue tracking — data lives in this repo as Markdown.",
    "",
    "## Bikes",
    "",
  ];

  if (bikes.length === 0) {
    lines.push("_No bikes yet._");
  } else {
    for (const b of bikes) {
      const slug = bikeSlug(b.name);
      const fuel = fuelByBike[b.id] ?? [];
      const service = serviceByBike[b.id] ?? [];
      const issues = issueByBike[b.id] ?? [];
      const lastService = [...service].sort((a, b) => a.date.localeCompare(b.date)).pop();
      lines.push(
        `### ${b.name} · [\`${slug}.md\`](bikes/${slug}.md)`,
        "",
        `- **Odometer:** ${b.odometer} km`,
        `- **Total KM (fills):** ${totalKm(fuel, b.odometer)} km`,
        `- **Fuel fills:** ${fuel.length}`,
        `- **Last service:** ${lastService ? new Date(lastService.date).toISOString().slice(0, 10) : "never"}${
          lastService?.nextServiceKm ? ` · next at ${lastService.nextServiceKm} km` : ""
        }`,
        `- **Open issues:** ${issues.filter((i) => i.status !== "resolved").length}`,
        ""
      );
    }
  }

  lines.push("---", "", `<sub>Generated ${new Date().toISOString()} by BikeLog.</sub>`, "");
  return lines.join("\n");
}
