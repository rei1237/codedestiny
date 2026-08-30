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
  "/saju/basic/play": "compass",
  "/saju/sibyl": "seal",
  "/life-book-ai": "scroll",
  "/saju/lifebook": "scroll",
  "/saju/love-secret": "heartGlow",
  "/saju/love-bible": "heartGlow",
  "/saju/love-simulation": "heart",
  "/saju/destiny-bias": "photocard",
  "/saju/animal-test": "animalPaw",
  "/saju/animal-destiny": "animalPaw",
  "/saju/destiny-meeting-place": "heartGlow",
  "/saju-guardian": "seal",
  "/animal/mbti": "animalPaw",
  "/ziwei/chart": "palace",
  "/astrology/cosmic": "zodiac",
  "/vedic/jyotish": "compass",
  "/oracle/sukuyo": "moon",
  "/oracle/rune": "rune",
  "/ifa-oracle.html": "seal",
  "/oracle/ifa": "seal",
  "/oracle/royal-tea": "lotus",
  "/oracle/hwatu": "scroll",
  "/oracle/hwatu-life": "scroll",
  "/oracle/sikojen-povailu": "coin",
  "/geomancy-oracle-v4.html": "compass",
  "/destiny-poker.html": "tarot",
  "/fortune-teller-fish.html": "moon",
  "/tadagochi": "crystal",
  "/neville-meditation.html": "lotus",
  "/yoga-guru.html": "lotus",
  "/cosmic-soul-meditation.html": "sparkleLine",
  "/emoi_omikuji_v2.html": "torii",
  "/blood-type-app.html": "crystal",
  "/myungwun_final.html": "scroll",
  "/guides": "crystal",
  "/olympus": "stageLight",
  "/psychotest": "seal",
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
  "/login": "seal",
  "/signup": "sparkle",
};

const STATIC_ACTION_ICON_MAP: Record<string, DestinyIconName> = {
  gotoNamingPremium: "scroll",
  openAnimalTotemModal: "animalPaw",
};

export function resolveRouteIcon(route?: string, fallback: DestinyIconName = "sparkle"): DestinyIconName {
  if (!route) return fallback;
  if (ROUTE_ICON_MAP[route]) return ROUTE_ICON_MAP[route];

  const [path, query = ""] = route.split("?");
  if (ROUTE_ICON_MAP[path]) return ROUTE_ICON_MAP[path];

  if (path === "/static/index.html" || path === "/static/") {
    const params = new URLSearchParams(query);
    const action = params.get("action") || "";
    if (STATIC_ACTION_ICON_MAP[action]) {
      return STATIC_ACTION_ICON_MAP[action];
    }
  }

  const prefixed = Object.keys(ROUTE_ICON_MAP).find((key) => route.startsWith(`${key}/`));
  if (prefixed) {
    return ROUTE_ICON_MAP[prefixed];
  }

  return fallback;
}
