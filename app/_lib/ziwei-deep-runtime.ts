import { generateZiweiDeepChapter } from "./generate-ziwei-deep-chapter";
import { validateZiweiChapter } from "./validate-ziwei-chart";
import { ZiweiDeepChart, ZiweiDeepChapter, ZiweiDeepRuntimeCache, ZiweiSectionId } from "./ziwei-types";

const CACHE_KEY = "ziwei:deep:runtime:v3";
const memoryCache = new Map<string, ZiweiDeepRuntimeCache>();

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function getChartKey(chart: ZiweiDeepChart): string {
  const u = chart.user;
  return [
    chart.version || "legacy",
    u.birthYear,
    u.birthMonth,
    u.birthDay,
    u.birthHour,
    u.birthMinute,
    u.gender,
    u.calendarType,
    Number(u.isLeapMonth),
  ].join("-");
}

function readSessionCache(chartKey: string): ZiweiDeepRuntimeCache | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ZiweiDeepRuntimeCache;
    if (!parsed || parsed.chartKey !== chartKey) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeSessionCache(cache: ZiweiDeepRuntimeCache) {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // no-op
  }
}

function ensureCache(chart: ZiweiDeepChart): ZiweiDeepRuntimeCache {
  const chartKey = getChartKey(chart);
  const inMemory = memoryCache.get(chartKey);
  if (inMemory) return inMemory;

  const fromSession = readSessionCache(chartKey);
  if (fromSession) {
    memoryCache.set(chartKey, fromSession);
    return fromSession;
  }

  const created: ZiweiDeepRuntimeCache = {
    chartKey,
    generatedAt: Date.now(),
    chapters: {},
  };
  memoryCache.set(chartKey, created);
  writeSessionCache(created);
  return created;
}

export function primeZiweiDeepRuntime(chart: ZiweiDeepChart, preload: ZiweiSectionId[] = ["overview", "ming"]) {
  const cache = ensureCache(chart);
  preload.forEach((id) => {
    if (!cache.chapters[id]) {
      cache.chapters[id] = generateZiweiDeepChapter(chart, id);
    }
  });
  writeSessionCache(cache);
}

export function getZiweiDeepChapter(chart: ZiweiDeepChart, sectionId: ZiweiSectionId): ZiweiDeepChapter {
  const cache = ensureCache(chart);
  const cached = cache.chapters[sectionId];
  if (cached) return cached;

  const chapter = generateZiweiDeepChapter(chart, sectionId);
  const validation = validateZiweiChapter(sectionId, chapter);
  if (!validation.isValid) {
    chapter.cautions = [...chapter.cautions, ...validation.issues.map((v) => `검증: ${v}`)];
  }

  cache.chapters[sectionId] = chapter;
  writeSessionCache(cache);
  return chapter;
}

export function clearZiweiDeepRuntimeCache() {
  memoryCache.clear();
  if (!hasWindow()) return;
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // no-op
  }
}
