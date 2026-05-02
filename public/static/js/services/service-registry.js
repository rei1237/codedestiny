import { initTarotService } from "./tarot.js";
import { initStonehengeRuneService } from "./stonehenge-rune.js";
import { initPigOracleService } from "/js/services/pig-oracle.js";
import { initHwatuLifeService } from "./hwatu-life.js";

export const SERVICES = {
  tarot: {
    id: "tarot",
    title: "타로",
    entry: initTarotService,
  },
  "stonehenge-rune": {
    id: "stonehenge-rune",
    title: "스톤헨지 룬",
    entry: initStonehengeRuneService,
  },
  "pig-oracle": {
    id: "pig-oracle",
    title: "돼지 주석점",
    entry: initPigOracleService,
  },
  "hwatu-life": {
    id: "hwatu-life",
    title: "화투 인생 패",
    entry: initHwatuLifeService,
  },
};

export function resolveServiceId(raw) {
  const normalized = String(raw || "").trim().toLowerCase();
  if (!normalized) return "";

  const aliases = {
    rune: "stonehenge-rune",
    stonehenge: "stonehenge-rune",
    sikojen: "pig-oracle",
    "sikojen-povailu": "pig-oracle",
    pig: "pig-oracle",
    hwatu: "hwatu-life",
  };

  return aliases[normalized] || normalized;
}
