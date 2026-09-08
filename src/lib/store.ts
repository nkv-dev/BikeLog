import type { Bike, FuelEntry, ServiceEntry, Ride, Modification, Checklist, AppSettings, IssueEntry } from "./types";

const KEYS = {
  BIKES: "bikelog_bikes",
  FUEL: "bikelog_fuel",
  SERVICE: "bikelog_service",
  RIDES: "bikelog_rides",
  MODS: "bikelog_modifications",
  CHECKLISTS: "bikelog_checklists",
  SETTINGS: "bikelog_settings",
  LEGACY_ISSUES: "bikelog_issues",
  MIGRATED: "bikelog_migrated_issues",
} as const;

const DATA_CHANGED = "bikelog:data-changed";

/** Fired (browser only) after any local data mutation so auto-sync can react. */
function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DATA_CHANGED));
}

function getAll<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setAll<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function getById<T extends { id: string }>(key: string, id: string): T | null {
  return getAll<T>(key).find((item) => item.id === id) ?? null;
}

function add<T extends { id: string }>(key: string, item: T): void {
  const items = getAll<T>(key);
  items.push(item);
  setAll(key, items);
  notifyChanged();
}

function update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): void {
  const items = getAll<T>(key);
  const idx = items.findIndex((item) => item.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    setAll(key, items);
    notifyChanged();
  }
}

function remove(key: string, id: string): void {
  const items = getAll<{ id: string }>(key);
  setAll(
    key,
    items.filter((item) => item.id !== id)
  );
  notifyChanged();
}

/**
 * One-time migration: legacy `bikelog_issues` (IssueEntry) became maintenance
 * entries with type "issue". Runs lazily so existing localStorage carries over.
 */
export function migrateLegacyIssues(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.MIGRATED)) return;
  try {
    const legacy = getAll<IssueEntry>(KEYS.LEGACY_ISSUES);
    if (legacy.length > 0) {
      const service = getAll<ServiceEntry>(KEYS.SERVICE);
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
      setAll(KEYS.SERVICE, [...service, ...issues]);
    }
    localStorage.removeItem(KEYS.LEGACY_ISSUES);
  } catch {
    // Leave legacy data in place; don't block the app.
  }
  localStorage.setItem(KEYS.MIGRATED, new Date().toISOString());
}

// Bikes
export const bikeStore = {
  getAll: () => getAll<Bike>(KEYS.BIKES),
  getById: (id: string) => getById<Bike>(KEYS.BIKES, id),
  add: (bike: Bike) => add(KEYS.BIKES, bike),
  update: (id: string, updates: Partial<Bike>) => update<Bike>(KEYS.BIKES, id, updates),
  remove: (id: string) => remove(KEYS.BIKES, id),
};

// Fuel Entries
export const fuelStore = {
  getAll: () => getAll<FuelEntry>(KEYS.FUEL),
  getByBike: (bikeId: string) => getAll<FuelEntry>(KEYS.FUEL).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<FuelEntry>(KEYS.FUEL, id),
  add: (entry: FuelEntry) => add(KEYS.FUEL, entry),
  update: (id: string, updates: Partial<FuelEntry>) => update<FuelEntry>(KEYS.FUEL, id, updates),
  remove: (id: string) => remove(KEYS.FUEL, id),
};

// Service Entries (maintenance + repairs + issues)
export const serviceStore = {
  getAll: () => getAll<ServiceEntry>(KEYS.SERVICE),
  getByBike: (bikeId: string) => getAll<ServiceEntry>(KEYS.SERVICE).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<ServiceEntry>(KEYS.SERVICE, id),
  add: (entry: ServiceEntry) => add(KEYS.SERVICE, entry),
  update: (id: string, updates: Partial<ServiceEntry>) => update<ServiceEntry>(KEYS.SERVICE, id, updates),
  remove: (id: string) => remove(KEYS.SERVICE, id),
};

// Rides
export const rideStore = {
  getAll: () => getAll<Ride>(KEYS.RIDES),
  getByBike: (bikeId: string) => getAll<Ride>(KEYS.RIDES).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<Ride>(KEYS.RIDES, id),
  add: (entry: Ride) => add(KEYS.RIDES, entry),
  update: (id: string, updates: Partial<Ride>) => update<Ride>(KEYS.RIDES, id, updates),
  remove: (id: string) => remove(KEYS.RIDES, id),
};

// Modifications
export const modificationStore = {
  getAll: () => getAll<Modification>(KEYS.MODS),
  getByBike: (bikeId: string) => getAll<Modification>(KEYS.MODS).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<Modification>(KEYS.MODS, id),
  add: (entry: Modification) => add(KEYS.MODS, entry),
  update: (id: string, updates: Partial<Modification>) => update<Modification>(KEYS.MODS, id, updates),
  remove: (id: string) => remove(KEYS.MODS, id),
};

// Checklists
export const checklistStore = {
  getAll: () => getAll<Checklist>(KEYS.CHECKLISTS),
  getByBike: (bikeId: string) => getAll<Checklist>(KEYS.CHECKLISTS).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<Checklist>(KEYS.CHECKLISTS, id),
  add: (entry: Checklist) => add(KEYS.CHECKLISTS, entry),
  update: (id: string, updates: Partial<Checklist>) => update<Checklist>(KEYS.CHECKLISTS, id, updates),
  remove: (id: string) => remove(KEYS.CHECKLISTS, id),
};

// Settings
const DEFAULT_SETTINGS: AppSettings = {
  activeBikeId: null,
  theme: "system",
  accentTheme: "auto",
};

export const settingsStore = {
  get: (): AppSettings => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  update: (updates: Partial<AppSettings>) => {
    const current = settingsStore.get();
    const merged = { ...current, ...updates };
    if (typeof window !== "undefined") {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
    }
  },
};

// Export/Import
export function exportAllData(): string {
  migrateLegacyIssues();
  const data = {
    bikes: bikeStore.getAll(),
    fuel: fuelStore.getAll(),
    service: serviceStore.getAll(),
    rides: rideStore.getAll(),
    modifications: modificationStore.getAll(),
    checklists: checklistStore.getAll(),
    settings: settingsStore.get(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export interface SyncDataFlat {
  bikes: Bike[];
  fuel: FuelEntry[];
  service: ServiceEntry[];
  rides: Ride[];
  modifications: Modification[];
  checklists: Checklist[];
}

/** Replace every data collection in localStorage (used after pulling from GitHub). */
export function hydrateAll(data: Partial<SyncDataFlat> & { settings?: Partial<AppSettings> }): void {
  migrateLegacyIssues();
  if (data.bikes) setAll(KEYS.BIKES, data.bikes);
  if (data.fuel) setAll(KEYS.FUEL, data.fuel);
  if (data.service) setAll(KEYS.SERVICE, data.service);
  if (data.rides) setAll(KEYS.RIDES, data.rides);
  if (data.modifications) setAll(KEYS.MODS, data.modifications);
  if (data.checklists) setAll(KEYS.CHECKLISTS, data.checklists);
  if (data.settings) settingsStore.update(data.settings);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.bikes) setAll(KEYS.BIKES, data.bikes);
    if (data.fuel) setAll(KEYS.FUEL, data.fuel);
    if (data.service) setAll(KEYS.SERVICE, data.service);
    if (data.rides) setAll(KEYS.RIDES, data.rides);
    if (data.modifications) setAll(KEYS.MODS, data.modifications);
    if (data.checklists) setAll(KEYS.CHECKLISTS, data.checklists);
    if (data.settings) settingsStore.update(data.settings);
    localStorage.setItem(KEYS.MIGRATED, new Date().toISOString());
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}

export const clearAllData = () => {
  Object.values(KEYS).forEach((k) => {
    if (typeof window !== "undefined") localStorage.removeItem(k);
  });
  notifyChanged();
};