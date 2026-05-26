import { sajuLifeBookBlueprint } from "./sajuLifeBookBlueprint.js";
import { sajuLoveBookBlueprint } from "./sajuLoveBookBlueprint.js";
import { sajuYearlyBookBlueprint } from "./sajuYearlyBookBlueprint.js";
import { ziweiBookBlueprint } from "./ziweiBookBlueprint.js";
import { sukyoBookBlueprint } from "./sukyoBookBlueprint.js";
import { westernAstroBookBlueprint } from "./westernAstroBookBlueprint.js";
import { vedicBookBlueprint } from "./vedicBookBlueprint.js";

function normalizeMode(mode = "") {
  const v = String(mode || "").trim().toLowerCase();
  if (v === "couple" || v === "compat") return "compatibility";
  if (v === "solo") return "personal";
  return v || "personal";
}

export function getPremiumBlueprintByReportType(reportType = "", mode = "personal") {
  const normalizedMode = normalizeMode(mode);
  const key = String(reportType || "").trim();
  if (key === "lifeBook") return sajuLifeBookBlueprint;
  if (key === "loveSecret") return sajuLoveBookBlueprint[normalizedMode] || sajuLoveBookBlueprint.personal;
  if (key === "sajuNewYear") return sajuYearlyBookBlueprint;
  if (key === "ziweiPremium") return ziweiBookBlueprint;
  if (key === "sookyoPremium") return sukyoBookBlueprint[normalizedMode] || sukyoBookBlueprint.personal;
  if (key === "westernAstrologyPremium") return westernAstroBookBlueprint;
  if (key === "vedicPremium") return vedicBookBlueprint;
  return null;
}
