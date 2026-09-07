export interface BrandPalette {
  label: string;
  light: {
    primary: string;
    primaryForeground: string;
    primaryAccent: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    primaryAccent: string;
  };
}

export type AccentTheme = "auto" | "default" | BrandKey;
export type BrandKey =
  | "hero"
  | "bajaj"
  | "tvs"
  | "honda"
  | "yamaha"
  | "royal-enfield"
  | "ktm"
  | "suzuki"
  | "kawasaki"
  | "mahindra"
  | "triumph"
  | "harley-davidson"
  | "indian"
  | "benelli"
  | "cfmoto";

export const BRAND_THEMES: Record<BrandKey, BrandPalette> = {
  ktm: {
    label: "KTM",
    light: { primary: "#ff6600", primaryForeground: "#ffffff", primaryAccent: "#e65c00" },
    dark: { primary: "#ff6a14", primaryForeground: "#1a1a1a", primaryAccent: "#ffa05c" },
  },
  bajaj: {
    label: "Bajaj",
    light: { primary: "#2e62ff", primaryForeground: "#ffffff", primaryAccent: "#274fd6" },
    dark: { primary: "#5b86ff", primaryForeground: "#0b1020", primaryAccent: "#aac1ff" },
  },
  tvs: {
    label: "TVS",
    light: { primary: "#e30613", primaryForeground: "#ffffff", primaryAccent: "#c20511" },
    dark: { primary: "#ff4d57", primaryForeground: "#200002", primaryAccent: "#ffa3a9" },
  },
  honda: {
    label: "Honda",
    light: { primary: "#cc0000", primaryForeground: "#ffffff", primaryAccent: "#ab0000" },
    dark: { primary: "#ff3b3b", primaryForeground: "#220000", primaryAccent: "#ff9e9e" },
  },
  yamaha: {
    label: "Yamaha",
    light: { primary: "#0039a6", primaryForeground: "#ffffff", primaryAccent: "#002f8c" },
    dark: { primary: "#4d7dff", primaryForeground: "#081020", primaryAccent: "#aac3ff" },
  },
  "royal-enfield": {
    label: "Royal Enfield",
    light: { primary: "#8a6d1f", primaryForeground: "#ffffff", primaryAccent: "#6f5718" },
    dark: { primary: "#d8b64e", primaryForeground: "#1a1505", primaryAccent: "#ecd9a0" },
  },
  suzuki: {
    label: "Suzuki",
    light: { primary: "#1e5aa8", primaryForeground: "#ffffff", primaryAccent: "#194b8e" },
    dark: { primary: "#5b95e6", primaryForeground: "#071425", primaryAccent: "#b6d4f8" },
  },
  kawasaki: {
    label: "Kawasaki",
    light: { primary: "#009639", primaryForeground: "#ffffff", primaryAccent: "#007d30" },
    dark: { primary: "#34c25e", primaryForeground: "#03150a", primaryAccent: "#a9eec0" },
  },
  mahindra: {
    label: "Mahindra",
    light: { primary: "#e31837", primaryForeground: "#ffffff", primaryAccent: "#c2132f" },
    dark: { primary: "#ff4d5e", primaryForeground: "#240105", primaryAccent: "#ffa8b2" },
  },
  triumph: {
    label: "Triumph",
    light: { primary: "#c8102e", primaryForeground: "#ffffff", primaryAccent: "#a80d26" },
    dark: { primary: "#f24a63", primaryForeground: "#200308", primaryAccent: "#fbacb9" },
  },
  "harley-davidson": {
    label: "Harley-Davidson",
    light: { primary: "#d4af37", primaryForeground: "#1a1a1a", primaryAccent: "#b89424" },
    dark: { primary: "#e8c866", primaryForeground: "#1a1505", primaryAccent: "#f3e0a3" },
  },
  indian: {
    label: "Indian",
    light: { primary: "#b3122f", primaryForeground: "#ffffff", primaryAccent: "#960e27" },
    dark: { primary: "#f04e66", primaryForeground: "#24040c", primaryAccent: "#fbacb9" },
  },
  benelli: {
    label: "Benelli",
    light: { primary: "#006847", primaryForeground: "#ffffff", primaryAccent: "#00543a" },
    dark: { primary: "#2eb683", primaryForeground: "#03150d", primaryAccent: "#a9eecf" },
  },
  cfmoto: {
    label: "CFMoto",
    light: { primary: "#005eb8", primaryForeground: "#ffffff", primaryAccent: "#004e99" },
    dark: { primary: "#4d99e6", primaryForeground: "#061425", primaryAccent: "#aaccee" },
  },
  hero: {
    label: "Hero",
    light: { primary: "#e2231a", primaryForeground: "#ffffff", primaryAccent: "#c01c14" },
    dark: { primary: "#ff544a", primaryForeground: "#1f0201", primaryAccent: "#ffaba6" },
  },
};

export const DEFAULT_THEME: AccentTheme = "auto";

function normalizeBrand(brand: string): BrandKey | "default" {
  const key = brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (key in BRAND_THEMES) return key as BrandKey;
  if (key === "royal-enfield" || key === "royalenfield") return "royal-enfield";
  if (key === "harley-davidson" || key === "harleydavidson" || key === "harley") return "harley-davidson";
  if (key === "cf-moto" || key === "cfmoto") return "cfmoto";
  return "default";
}

export function resolveThemeForBrand(brand: string | undefined | null): BrandKey | "default" {
  if (!brand) return "default";
  return normalizeBrand(brand);
}

export function resolveAccentTheme(accentTheme: AccentTheme | undefined, brand: string | undefined | null): BrandKey | "default" {
  if (!accentTheme || accentTheme === "auto") return resolveThemeForBrand(brand);
  if (accentTheme === "default") return "default";
  return accentTheme in BRAND_THEMES ? (accentTheme as BrandKey) : "default";
}

export function getBrandPalette(key: BrandKey | "default"): BrandPalette | null {
  return key === "default" ? null : BRAND_THEMES[key];
}

export const ACCENT_THEME_OPTIONS: { value: AccentTheme; label: string; swatch: string | null }[] = [
  { value: "auto", label: "Auto", swatch: null },
  { value: "default", label: "Default", swatch: "#3b82f6" },
  ...(Object.keys(BRAND_THEMES) as BrandKey[]).map((key) => ({
    value: key as AccentTheme,
    label: BRAND_THEMES[key].label,
    swatch: BRAND_THEMES[key].light.primary,
  })),
];
