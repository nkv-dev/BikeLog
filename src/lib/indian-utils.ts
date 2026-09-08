export const BIKE_BRANDS = [
  "Hero",
  "Bajaj",
  "TVS",
  "Honda",
  "Yamaha",
  "Royal Enfield",
  "KTM",
  "Suzuki",
  "Kawasaki",
  "Mahindra",
  "Triumph",
  "Harley-Davidson",
  "Indian",
  "Benelli",
  "CFMoto",
] as const;

export const COMMON_SERVICE_ITEMS = [
  "Engine Oil Change",
  "Oil Filter",
  "Air Filter",
  "Brake Pads",
  "Brake Disc",
  "Chain Lube & Adjustment",
  "Spark Plug",
  "Coolant",
  "Clutch Cable",
  "Throttle Cable",
  "Battery",
  "Tyres",
  "Headlight Bulb",
  "Fuse",
  "Carburetor Cleaning",
  "Valve Adjustment",
  "Suspension Service",
  "Ball Bearings",
  "Indicator Light",
  "Horn",
] as const;

export const SEVERITY_CONFIG = {
  low: { label: "Low", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  high: { label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  critical: { label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
} as const;

export const STATUS_CONFIG = {
  reported: { label: "Reported", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  diagnosed: { label: "Diagnosed", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  "in-progress": { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
} as const;

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatOdometer(km: number): string {
  return km.toLocaleString("en-IN") + " km";
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
