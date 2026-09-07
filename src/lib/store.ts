import type { Bike, FuelEntry, ServiceEntry, IssueEntry, AppSettings } from "./types";

const KEYS = {
  BIKES: "bikelog_bikes",
  FUEL: "bikelog_fuel",
  SERVICE: "bikelog_service",
  ISSUES: "bikelog_issues",
  SETTINGS: "bikelog_settings",
} as const;

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
}

function update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): void {
  const items = getAll<T>(key);
  const idx = items.findIndex((item) => item.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    setAll(key, items);
  }
}

function remove(key: string, id: string): void {
  const items = getAll<{ id: string }>(key);
  setAll(
    key,
    items.filter((item) => item.id !== id)
  );
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

// Service Entries
export const serviceStore = {
  getAll: () => getAll<ServiceEntry>(KEYS.SERVICE),
  getByBike: (bikeId: string) => getAll<ServiceEntry>(KEYS.SERVICE).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<ServiceEntry>(KEYS.SERVICE, id),
  add: (entry: ServiceEntry) => add(KEYS.SERVICE, entry),
  update: (id: string, updates: Partial<ServiceEntry>) => update<ServiceEntry>(KEYS.SERVICE, id, updates),
  remove: (id: string) => remove(KEYS.SERVICE, id),
};

// Issue Entries
export const issueStore = {
  getAll: () => getAll<IssueEntry>(KEYS.ISSUES),
  getByBike: (bikeId: string) => getAll<IssueEntry>(KEYS.ISSUES).filter((e) => e.bikeId === bikeId),
  getById: (id: string) => getById<IssueEntry>(KEYS.ISSUES, id),
  add: (entry: IssueEntry) => add(KEYS.ISSUES, entry),
  update: (id: string, updates: Partial<IssueEntry>) => update<IssueEntry>(KEYS.ISSUES, id, updates),
  remove: (id: string) => remove(KEYS.ISSUES, id),
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
  const data = {
    bikes: bikeStore.getAll(),
    fuel: fuelStore.getAll(),
    service: serviceStore.getAll(),
    issues: issueStore.getAll(),
    settings: settingsStore.get(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

/** Replace every data collection in localStorage (used after pulling from GitHub). */
export function hydrateAll(data: {
  bikes?: Bike[];
  fuel?: FuelEntry[];
  service?: ServiceEntry[];
  issues?: IssueEntry[];
  settings?: Partial<AppSettings>;
}): void {
  if (data.bikes) setAll(KEYS.BIKES, data.bikes);
  if (data.fuel) setAll(KEYS.FUEL, data.fuel);
  if (data.service) setAll(KEYS.SERVICE, data.service);
  if (data.issues) setAll(KEYS.ISSUES, data.issues);
  if (data.settings) settingsStore.update(data.settings);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.bikes) setAll(KEYS.BIKES, data.bikes);
    if (data.fuel) setAll(KEYS.FUEL, data.fuel);
    if (data.service) setAll(KEYS.SERVICE, data.service);
    if (data.issues) setAll(KEYS.ISSUES, data.issues);
    if (data.settings) settingsStore.update(data.settings);
    return true;
  } catch {
    return false;
  }
}
