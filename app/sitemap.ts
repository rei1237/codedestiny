import type { MetadataRoute } from "next";
import { INSIGHT_ARTICLES } from "./insights/articles";
import { BASE_URL, LOCALE_PREFIXES, ROUTES } from "../lib/seo-site-urls";
import { SERVICE_MAP } from "./_lib/serviceMap";

type SitemapEntry = MetadataRoute.Sitemap[number];

function toLastModified(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addLocalizedEntries(
  bucket: Map<string, SitemapEntry>,
  routePath: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
  lastModified: Date,
) {
  for (const prefix of LOCALE_PREFIXES) {
    const localizedPath = prefix
      ? `${prefix}${routePath === "/" ? "" : routePath}`
      : routePath;
    const url = new URL(localizedPath, BASE_URL).toString();

    const existing = bucket.get(url);
    if (!existing) {
      bucket.set(url, {
        url,
        lastModified,
        changeFrequency,
        priority,
      });
      continue;
    }

    const prevModified = new Date(existing.lastModified ?? 0).getTime();
    const nextModified = lastModified.getTime();
    bucket.set(url, {
      ...existing,
      lastModified: nextModified > prevModified ? lastModified : existing.lastModified,
      changeFrequency: existing.changeFrequency ?? changeFrequency,
      priority: Math.max(existing.priority ?? 0, priority),
    });
  }
}

import type { SitemapRouteEntry } from "../lib/seo-site-urls";

function getAutoIndexedSajuAndPsychRoutes(): SitemapRouteEntry[] {
  const keys = Object.keys(SERVICE_MAP || {});
  return keys
    .filter((slug) => {
      const value = String(slug || "").toLowerCase();
      return (
        value.startsWith("saju/") ||
        value.includes("/psycho") ||
        value.includes("/mbti") ||
        value.includes("/physio")
      );
    })
    .map((slug) => ({
      path: `/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.82,
    }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entriesByUrl = new Map<string, SitemapEntry>();

  const mergedRoutes = [...ROUTES, ...getAutoIndexedSajuAndPsychRoutes()];

  for (const route of mergedRoutes) {
    if (route.noLocale) {
      // .html 정적 파일 등 locale prefix 불필요 경로 — 루트 URL만 추가
      const url = new URL(route.path, BASE_URL).toString();
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, {
          url,
          lastModified: now,
          changeFrequency: route.changeFrequency,
          priority: route.priority ?? 0.7,
        });
      }
    } else {
      addLocalizedEntries(
        entriesByUrl,
        route.path,
        route.changeFrequency,
        route.priority ?? 0.7,
        now,
      );
    }
  }

  for (const article of INSIGHT_ARTICLES) {
    const slug = String(article?.slug || "").trim();
    if (!slug) continue;

    addLocalizedEntries(
      entriesByUrl,
      `/insights/${slug}`,
      "monthly",
      0.75,
      toLastModified(article?.updatedAt, now),
    );
  }

  // ── 운세 정적 HTML 페이지 (fortune static pages) ──
  const FORTUNE_PERIODS = ["today", "tomorrow", "weekly", "monthly"] as const;
  const FORTUNE_ANIMALS = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"];
  const FORTUNE_ZODIACS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  const FORTUNE_VEDIC   = ["mesha","vrishabha","mithuna","karka","simha","kanya","tula","vrishchika","dhanu","makara","kumbha","meena"];
  const FORTUNE_ZIWEI   = ["mingong","hyeongje","bubu","janyeo","jeonaek","noebok","chunyi","jilaek","jaeback","gwanllok","bokdeok","bumo"];
  const FORTUNE_SUKUYO  = Array.from({length: 27}, (_, i) => String(i + 1));

  for (const period of FORTUNE_PERIODS) {
    for (const id of [...FORTUNE_ANIMALS, ...FORTUNE_ZODIACS]) {
      const url = `${BASE_URL}/fortune/${period}/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: period === "today" || period === "tomorrow" ? "daily" : "weekly", priority: 0.75 });
      }
    }
    for (const id of FORTUNE_VEDIC) {
      const url = `${BASE_URL}/fortune/${period}/vedic/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: period === "today" || period === "tomorrow" ? "daily" : "weekly", priority: 0.72 });
      }
    }
    for (const id of FORTUNE_ZIWEI) {
      const url = `${BASE_URL}/fortune/${period}/ziwei/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: period === "today" || period === "tomorrow" ? "daily" : "weekly", priority: 0.72 });
      }
    }
    for (const id of FORTUNE_SUKUYO) {
      const url = `${BASE_URL}/fortune/${period}/sukuyo/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: period === "today" || period === "tomorrow" ? "daily" : "weekly", priority: 0.70 });
      }
    }
  }

  return Array.from(entriesByUrl.values());
}

