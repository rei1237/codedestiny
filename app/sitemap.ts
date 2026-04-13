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
      bucket.set(url, { url, lastModified, changeFrequency, priority });
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

// ── MongoDB fortune_contents 동적 URL 조회 (실패 시 빈 배열 반환) ──────────────
interface FortuneContentDoc {
  _id: unknown;
  category: string;
  subcategory?: string;
  updatedAt?: Date;
}

async function fetchFortuneContentEntries(now: Date): Promise<SitemapEntry[]> {
  try {
    // 사이트맵은 서버 빌드/ISR 시점에만 실행되므로 DB 연결 타임아웃을 짧게 유지
    const { dbConnect } = await import("./_lib/dbConnect.js");
    const mongoose = await dbConnect();
    const db = mongoose.connection.db;
    if (!db) return [];

    const docs = await db
      .collection<FortuneContentDoc>("fortune_contents")
      .find(
        { isActive: true },
        {
          projection: { _id: 1, category: 1, subcategory: 1, updatedAt: 1 },
          limit: 2000,
          maxTimeMS: 8000,
        },
      )
      .toArray();

    return docs.map((doc) => {
      const sub = String(doc.subcategory || "").trim();
      const cat = String(doc.category || "").trim();
      // URL 패턴: /fortune/content/{category}/{subcategory or id}
      const slug = sub || String(doc._id);
      const path = `/fortune/content/${cat}/${encodeURIComponent(slug)}`;
      const url = new URL(path, BASE_URL).toString();
      const lastModified =
        doc.updatedAt instanceof Date && !Number.isNaN(doc.updatedAt.getTime())
          ? doc.updatedAt
          : now;

      return {
        url,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.70,
      };
    });
  } catch {
    // DB 연결 실패(배포 환경 변수 미설정 등)는 사이트맵 생성을 막지 않음
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entriesByUrl = new Map<string, SitemapEntry>();

  const TRUST_AND_METHOD_URLS: Array<{ url: string; changeFrequency: SitemapEntry["changeFrequency"]; priority: number }> = [
    { url: "https://code-destiny.com/about",            changeFrequency: "monthly", priority: 0.80 },
    { url: "https://code-destiny.com/methodology",      changeFrequency: "monthly", priority: 0.78 },
    { url: "https://code-destiny.com/faq",              changeFrequency: "monthly", priority: 0.70 },
    { url: "https://code-destiny.com/contact-us",       changeFrequency: "yearly",  priority: 0.55 },
    { url: "https://code-destiny.com/privacy-policy",   changeFrequency: "yearly",  priority: 0.50 },
    { url: "https://code-destiny.com/terms-of-service", changeFrequency: "yearly",  priority: 0.50 },
  ];

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

    // lastMod: articles.js의 updatedAt(실제 수정일)을 우선 사용
    addLocalizedEntries(
      entriesByUrl,
      `/insights/${slug}`,
      "weekly",
      0.78,
      toLastModified(article?.updatedAt, now),
    );
  }

  for (const url of TRUST_AND_METHOD_URLS) {
    if (!entriesByUrl.has(url.url)) {
      entriesByUrl.set(url.url, {
        url: url.url,
        lastModified: now,
        changeFrequency: url.changeFrequency,
        priority: url.priority,
      });
    }
  }

  // ── 운세 정적 HTML 페이지 (fortune static pages) ───────────────────────────
  // today/tomorrow → "daily" / priority 0.80 (최신 갱신 콘텐츠)
  // weekly/monthly  → "weekly" / priority 0.72
  const FORTUNE_PERIODS = ["today", "tomorrow", "weekly", "monthly"] as const;
  const FORTUNE_ANIMALS = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"];
  const FORTUNE_ZODIACS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  const FORTUNE_VEDIC   = ["mesha","vrishabha","mithuna","karka","simha","kanya","tula","vrishchika","dhanu","makara","kumbha","meena"];
  const FORTUNE_ZIWEI   = ["mingong","hyeongje","bubu","janyeo","jeonaek","noebok","chunyi","jilaek","jaeback","gwanllok","bokdeok","bumo"];
  const FORTUNE_SUKUYO  = Array.from({ length: 27 }, (_, i) => String(i + 1));

  for (const period of FORTUNE_PERIODS) {
    const isDaily = period === "today" || period === "tomorrow";
    const freq: SitemapEntry["changeFrequency"] = isDaily ? "daily" : "weekly";

    for (const id of [...FORTUNE_ANIMALS, ...FORTUNE_ZODIACS]) {
      const url = `${BASE_URL}/fortune/${period}/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: freq, priority: isDaily ? 0.80 : 0.72 });
      }
    }
    for (const id of FORTUNE_VEDIC) {
      const url = `${BASE_URL}/fortune/${period}/vedic/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: freq, priority: isDaily ? 0.78 : 0.70 });
      }
    }
    for (const id of FORTUNE_ZIWEI) {
      const url = `${BASE_URL}/fortune/${period}/ziwei/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: freq, priority: isDaily ? 0.78 : 0.70 });
      }
    }
    for (const id of FORTUNE_SUKUYO) {
      const url = `${BASE_URL}/fortune/${period}/sukuyo/${id}`;
      if (!entriesByUrl.has(url)) {
        entriesByUrl.set(url, { url, lastModified: now, changeFrequency: freq, priority: isDaily ? 0.75 : 0.68 });
      }
    }
  }

  // ── MongoDB fortune_contents 동적 URL (lastMod = DB updatedAt) ─────────────
  const dbEntries = await fetchFortuneContentEntries(now);
  for (const entry of dbEntries) {
    if (!entriesByUrl.has(entry.url)) {
      entriesByUrl.set(entry.url, entry);
    }
  }

  // ── 최종 정렬: priority 내림차순 → lastModified 내림차순 ──────────────────
  return Array.from(entriesByUrl.values()).sort((a, b) => {
    const pDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (pDiff !== 0) return pDiff;
    return (
      new Date(b.lastModified ?? 0).getTime() -
      new Date(a.lastModified ?? 0).getTime()
    );
  });
}
