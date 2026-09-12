import type { Bike, FuelEntry, ServiceEntry, Ride, Modification, Checklist, AppSettings, IssueEntry } from "./types";

/**
 * GitHub-only storage.
 *
 * All app data lives in an in-memory singleton, hydrated from the user's
 * GitHub repo on boot (see `sync.boot()` in sync-client.ts). localStorage is
 * used ONLY for UI preferences (`bikelog_settings`) and the cosmetic accent
 * cache (`bikelog_accent_cache`) — never for data.
 */
export interface SyncDataFlat {
  bikes: Bike[];
  fuel: FuelEntry[];
  service: ServiceEntry[];
  rides: Ride[];
  modifications: Modification[];
  checklists: Checklist[];
}

type DataKey = keyof SyncDataFlat;

const DATA: SyncDataFlat = {
  bikes: [],
  fuel: [],
  service: [],
  rides: [],
  modifications: [],
  checklists: [],
};

/**
 * Legacy localStorage data keys carried over from the local-first version.
 * `seedFromLocalStorage()` migrates them into memory once, and they are
 * REMOVED after a successful GitHub migration (see `clearLegacyLocalStorage`).
 */
const LEGACY_KEYS = {
  BIKES: "bikelog_bikes",
  FUEL: "bikelog_fuel",
  SERVICE: "bikelog_service",
  RIDES: "bikelog_rides",
  MODS: "bikelog_modifications",
  CHECKLISTS: "bikelog_checklists",
  LEGACY_ISSUES: "bikelog_issues",
  MIGRATED: "bikelog_migrated_issues",
} as const;

const SETTINGS_KEY = "bikelog_settings";
/** Resolved brand-accent (e.g. `"ktm"` / `"default"`), cached for pre-paint in the <head>. */
export const ACCENT_CACHE_KEY = "bikelog_accent_cache";
const DATA_CHANGED = "bikelog:data-changed";

/** Fired (browser only) after any in-memory data mutation so pages + auto-sync react. */
function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DATA_CHANGED));
}

function readArr<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

interface CollectionApi<T extends { id: string }> {
  getAll(): T[];
  getById(id: string): T | null;
  add(item: T): void;
  update(id: string, updates: Partial<T>): void;
  remove(id: string): void;
}

interface CollectionByBikeApi<T extends { id: string }> extends CollectionApi<T> {
  getByBike(bikeId: string): T[];
}

function collection<T extends { id: string }, K extends DataKey>(key: K): CollectionApi<T> {
  const all = () => DATA[key] as unknown as T[];
  return {
    getAll: () => all(),
    getById: (id: string) => all().find((i) => i.id === id) ?? null,
    add: (item: T) => {
      all().push(item);
      notifyChanged();
    },
    update: (id: string, updates: Partial<T>) => {
      const items = all();
      const idx = items.findIndex((i) => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updates };
        notifyChanged();
      }
    },
    remove: (id: string) => {
      const items = all();
      const idx = items.findIndex((i) => i.id === id);
      if (idx !== -1) {
        items.splice(idx, 1);
        notifyChanged();
      }
    },
  };
}

function withByBike<T extends { id: string }>(api: CollectionApi<T>): CollectionByBikeApi<T> {
  return {
    ...api,
    getByBike: (bikeId: string) => api.getAll().filter((i) => (i as { bikeId?: string }).bikeId === bikeId),
  };
}

// Bikes
export const bikeStore = collection<Bike, "bikes">("bikes");

// Fuel Entries
export const fuelStore = withByBike<FuelEntry>(collection<FuelEntry, "fuel">("fuel"));

// Service Entries (maintenance + repairs + issues)
export const serviceStore = withByBike<ServiceEntry>(collection<ServiceEntry, "service">("service"));

// Rides
export const rideStore = withByBike<Ride>(collection<Ride, "rides">("rides"));

// Modifications
export const modificationStore = withByBike<Modification>(collection<Modification, "modifications">("modifications"));

// Checklists
export const checklistStore = withByBike<Checklist>(collection<Checklist, "checklists">("checklists"));

// Settings (UI preferences only — stays in localStorage)
const DEFAULT_SETTINGS: AppSettings = {
  activeBikeId: null,
  theme: "system",
  accentTheme: "auto",
};

export const settingsStore = {
  get: (): AppSettings => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  update: (updates: Partial<AppSettings>) => {
    const merged = { ...settingsStore.get(), ...updates };
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    }
  },
};

/**
 * One-time migration of legacy `bikelog_issues` (IssueEntry) into in-memory
 * service entries with type "issue". Runs lazily as part of the legacy seed.
 */
export function migrateLegacyIssues(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LEGACY_KEYS.MIGRATED)) return;
    const legacy = readArr<IssueEntry>(LEGACY_KEYS.LEGACY_ISSUES);
    if (legacy.length > 0) {
      const issues: ServiceEntry[] = legacy.map((i) => ({
        id: i.id,
        bikeId: i.bikeId,
        date: i.date,
        odometer: i.odometer,
        type: "issue",
        items: [],
        cost: i.actualCost ?? i.estimatedCost ?? 0,
        title: i.title,
        description: i.description,
        severity: i.severity,
        status: i.status,
        estimatedCost: i.estimatedCost,
        actualCost: i.actualCost,
        notes: i.notes,
      }));
      DATA.service = [...DATA.service, ...issues];
      localStorage.removeItem(LEGACY_KEYS.LEGACY_ISSUES);
    }
  } catch {
    // Leave legacy data in place; don't block the app.
  }
  localStorage.setItem(LEGACY_KEYS.MIGRATED, new Date().toISOString());
}

/**
 * Seed the in-memory store from legacy localStorage keys (guests get a
 * read-only view of any on-device data from the local-first version). No-op
 * once memory already holds data. Call before `sync.boot()` / export.
 */
export function seedFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  if (hasMemoryData()) return;
  try {
    DATA.bikes = readArr<Bike>(LEGACY_KEYS.BIKES);
    DATA.fuel = readArr<FuelEntry>(LEGACY_KEYS.FUEL);
    DATA.service = readArr<ServiceEntry>(LEGACY_KEYS.SERVICE);
    DATA.rides = readArr<Ride>(LEGACY_KEYS.RIDES);
    DATA.modifications = readArr<Modification>(LEGACY_KEYS.MODS);
    DATA.checklists = readArr<Checklist>(LEGACY_KEYS.CHECKLISTS);
    migrateLegacyIssues();
  } catch {
    // Nothing to seed.
  }
}

/**
 * Drop the legacy localStorage data keys once the GitHub repo is the store of
 * record (called after a successful pull, or a successful seed-push).
 */
export function clearLegacyLocalStorage(): void {
  if (typeof window === "undefined") return;
  Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
}

/** Snapshot of all in-memory data collections (shallow copy). */
export function snapshotData(): SyncDataFlat {
  return {
    bikes: [...DATA.bikes],
    fuel: [...DATA.fuel],
    service: [...DATA.service],
    rides: [...DATA.rides],
    modifications: [...DATA.modifications],
    checklists: [...DATA.checklists],
  };
}

/** True if any non-empty collection is in memory. */
export function hasMemoryData(): boolean {
  return (
    DATA.bikes.length > 0 ||
    DATA.fuel.length > 0 ||
    DATA.service.length > 0 ||
    DATA.rides.length > 0 ||
    DATA.modifications.length > 0 ||
    DATA.checklists.length > 0
  );
}

function hasRepoData(data: Partial<SyncDataFlat> | undefined | null): boolean {
  if (!data) return false;
  return Object.values(data).some((arr) => ((arr as unknown[] | undefined)?.length ?? 0) > 0);
}

/** Replace every in-memory collection (used after pulling from GitHub). No change event. */
export function hydrateAll(data: Partial<SyncDataFlat> & { settings?: Partial<AppSettings> }): void {
  if (data.bikes) DATA.bikes = data.bikes;
  if (data.fuel) DATA.fuel = data.fuel;
  if (data.service) DATA.service = data.service;
  if (data.rides) DATA.rides = data.rides;
  if (data.modifications) DATA.modifications = data.modifications;
  if (data.checklists) DATA.checklists = data.checklists;
  if (data.settings) settingsStore.update(data.settings);
}

// Export/Import
export function exportAllData(): string {
  seedFromLocalStorage();
  return JSON.stringify(
    {
      ...snapshotData(),
      settings: settingsStore.get(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr) as Partial<SyncDataFlat> & { settings?: Partial<AppSettings> };
    if (data.bikes) DATA.bikes = data.bikes;
    if (data.fuel) DATA.fuel = data.fuel;
    if (data.service) DATA.service = data.service;
    if (data.rides) DATA.rides = data.rides;
    if (data.modifications) DATA.modifications = data.modifications;
    if (data.checklists) DATA.checklists = data.checklists;
    if (data.settings) settingsStore.update(data.settings);
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}

/** Wipe all data from memory + legacy keys. Settings (theme/accent) survive. */
export function clearAllData(): void {
  clearMemoryData();
  clearLegacyLocalStorage();
  settingsStore.update({ activeBikeId: null });
  notifyChanged();
}

/** Reset in-memory data collections only (no event, keeps settings + legacy keys). */
export function clearMemoryData(): void {
  DATA.bikes = [];
  DATA.fuel = [];
  DATA.service = [];
  DATA.rides = [];
  DATA.modifications = [];
  DATA.checklists = [];
}

export { hasRepoData };