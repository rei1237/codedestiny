import { sajuLifeBookExampleResult } from "./sajuLifeBookExample.js";
import { sajuLoveBookExampleResult } from "./sajuLoveBookExample.js";
import { sajuYearlyBookExampleResult } from "./sajuYearlyBookExample.js";
import { ziweiBookExampleResult } from "./ziweiBookExample.js";
import { sukyoBookExampleResult } from "./sukyoBookExample.js";
import { westernAstroBookExampleResult } from "./westernAstroBookExample.js";
import { vedicBookExampleResult } from "./vedicBookExample.js";

const MAP = Object.freeze({
  lifeBook: sajuLifeBookExampleResult,
  loveSecret: sajuLoveBookExampleResult,
  sajuNewYear: sajuYearlyBookExampleResult,
  ziweiPremium: ziweiBookExampleResult,
  sookyoPremium: sukyoBookExampleResult,
  westernAstrologyPremium: westernAstroBookExampleResult,
  vedicPremium: vedicBookExampleResult,
});

export function getPremiumExampleResultByReportType(reportType = "") {
  return MAP[String(reportType || "").trim()] || null;
}

export { MAP as PREMIUM_EXAMPLE_RESULT_MAP };
