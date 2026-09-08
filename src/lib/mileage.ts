import type { FuelEntry } from "./types";

export function calculateMileage(entries: FuelEntry[]): number | null {
  const sorted = [...entries]
    .filter((e) => e.isFullTank)
    .sort((a, b) => a.odometer - b.odometer);

  if (sorted.length < 2) return null;

  let totalKm = 0;
  let totalLitres = 0;

  for (let i = 1; i < sorted.length; i++) {
    const kmDiff = sorted[i].odometer - sorted[i - 1].odometer;
    if (kmDiff > 0 && kmDiff < 2000) {
      totalKm += kmDiff;
      totalLitres += sorted[i].litres;
    }
  }

  if (totalLitres === 0) return null;
  return Math.round((totalKm / totalLitres) * 100) / 100;
}

export function calculateLastMileage(entries: FuelEntry[]): number | null {
  const sorted = [...entries]
    .filter((e) => e.isFullTank)
    .sort((a, b) => b.odometer - a.odometer);

  if (sorted.length < 2) return null;

  const kmDiff = sorted[0].odometer - sorted[1].odometer;
  if (kmDiff <= 0 || kmDiff >= 2000) return null;

  return Math.round((kmDiff / sorted[0].litres) * 100) / 100;
}

export function calculateMonthlySpend(entries: FuelEntry[], months: number = 1): number {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  return entries
    .filter((e) => new Date(e.date) >= cutoff)
    .reduce((sum, e) => sum + e.totalCost, 0);
}

export function calculateTotalKm(entries: FuelEntry[]): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
  return sorted[sorted.length - 1].odometer - sorted[0].odometer;
}
