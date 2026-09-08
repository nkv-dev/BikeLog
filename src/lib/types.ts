export interface Bike {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  odometer: number;
  fuelType: "petrol" | "diesel";
  createdAt: string;
  photos?: string[]; // relative paths under bikelog/bikes/<slug>/media/bike/
}

export interface FuelEntry {
  id: string;
  bikeId: string;
  date: string;
  odometer: number;
  litres: number;
  pricePerLitre: number;
  totalCost: number;
  isFullTank: boolean;
  station?: string;
  notes?: string;
}

export type ServiceType = "scheduled" | "repair" | "general" | "issue";

export interface ServiceEntry {
  id: string;
  bikeId: string;
  date: string;
  odometer: number;
  type: ServiceType;
  items: string[];
  cost: number;
  workshop?: string;
  notes?: string;
  nextServiceKm?: number;
  nextServiceDate?: string;
  // Issue fields (only meaningful when type === "issue")
  title?: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: "reported" | "diagnosed" | "in-progress" | "resolved";
  estimatedCost?: number;
  actualCost?: number;
}

export interface Ride {
  id: string;
  bikeId: string;
  date: string;
  route: string;
  distanceKm: number;
  odometer?: number;
  avgSpeedKmh?: number;
  notes?: string;
}

export interface Modification {
  id: string;
  bikeId: string;
  date: string;
  title: string;
  description?: string;
  cost?: number;
  installedBy?: string;
  notes?: string;
}

export interface Checklist {
  id: string;
  bikeId: string;
  name: string;
  items: string[];
  createdAt: string;
}

// Legacy 0.0.1 issue type, kept only for migrating existing localStorage/repo data.
export interface IssueEntry {
  id: string;
  bikeId: string;
  date: string;
  odometer: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "reported" | "diagnosed" | "in-progress" | "resolved";
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
}

export type AccentThemeValue = "auto" | "default" | string;

export interface AppSettings {
  activeBikeId: string | null;
  theme: "light" | "dark" | "system";
  accentTheme?: AccentThemeValue;
}