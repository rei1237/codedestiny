import type { DestinyIconName } from "@/app/components/icons/DestinyIcon";

export const FEATURE_ICON_MAP: Record<string, DestinyIconName> = {
  saju: "yinYang",
  ziwei: "palace",
  tarot: "tarot",
  astrology: "zodiac",
  sukyo: "moon",
  vedic: "compass",
  omikuji: "torii",
  animalTotem: "animalPaw",
  destinyBias: "photocard",
  rune: "rune",
  palmReading: "handLine",
  premiumPdf: "scroll",
};

export const ROUTE_ICON_MAP: Record<string, DestinyIconName> = {
  "/saju/basic": "yinYang",
  "/saju/sibyl": "seal",
  "/saju/lifebook": "scroll",
  "/saju/love-secret": "heartGlow",
  "/saju/love-simulation": "heart",
  "/saju/destiny-bias": "photocard",
  "/saju/animal-test": "animalPaw",
  "/saju/animal-destiny": "animalPaw",
  "/ziwei/chart": "palace",
  "/astrology/cosmic": "zodiac",
  "/vedic/jyotish": "compass",
  "/oracle/sukuyo": "moon",
  "/oracle/rune": "rune",
  "/oracle/ifa": "seal",
  "/oracle/royal-tea": "lotus",
  "/oracle/hwatu": "scroll",
  "/oracle/hwatu-life": "scroll",
  "/oracle/sikojen-povailu": "coin",
  "/tarot/mingri": "tarot",
  "/tarot/love": "heartGlow",
  "/tarot/healing": "sun",
  "/tarot/self-esteem": "ribbon",
  "/tarot/reunion": "ticket",
  "/tarot/year": "zodiac",
  "/dream/tarot": "moon",
  "/dream/psycho": "scroll",
  "/flower/destiny": "lotus",
  "/flower/astrology": "sparkleLine",
  "/flower/jamidusu": "lotus",
  "/flower/sukuyo": "moon",
  "/points": "coin",
  "/insights": "scroll",
  "/me": "seal",
  "/login": "seal",
  "/signup": "sparkle",
};

export function resolveRouteIcon(route?: string, fallback: DestinyIconName = "sparkle"): DestinyIconName {
  if (!route) return fallback;
  return ROUTE_ICON_MAP[route] || fallback;
}
