import {
  buildAstrologyChapterCacheKey,
  generateAstrologyLlmReport,
} from "./astrology-llm-engine.js";

export const buildAstrologyPremiumChapterCacheKey = buildAstrologyChapterCacheKey;

export async function generateAstrologyPremiumReport(params = {}) {
  return generateAstrologyLlmReport(params);
}
