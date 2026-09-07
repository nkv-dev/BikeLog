export interface Bike {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  odometer: number;
  fuelType: "petrol" | "diesel";
  createdAt: string;
  photos?: string[]; // relative paths under bikelog/assets/<slug>/
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

export interface ServiceEntry {
  id: string;
  bikeId: string;
  date: string;
  odometer: number;
  type: "scheduled" | "repair" | "general";
  items: string[];
  cost: number;
  workshop?: string;
  notes?: string;
  nextServiceKm?: number;
  nextServiceDate?: string;
}

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
