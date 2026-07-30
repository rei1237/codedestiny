"use client";

// 런타임 CMS 소비 훅 — "즉시 반영" 채널(공지·이벤트·배너·버튼 문구)용.
//
// 사용법은 기존 문자열을 폴백으로 감싸는 것뿐이다:
//   const label = useCmsCopy("button-copy", "home.start", "text", "지금 시작하기");
//
// 🔴 폴백 우선. 값이 오기 전/못 올 때는 fallback 이 그대로 보인다 — 첫 페인트가 지연되지 않고,
//    API 가 죽어도 화면이 비지 않는다. 서버 렌더 텍스트도 그대로라 SEO 영향이 없다.
//
// 성능: 번들은 네임스페이스 단위로 1회만 받고, 같은 탭에서는 sessionStorage 로 5분간 재사용한다.
// 동시에 여러 컴포넌트가 같은 네임스페이스를 요구해도 in-flight 요청 하나로 합쳐진다.
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";

type Fields = Record<string, unknown>;
type NamespaceEntries = Record<string, Fields>;

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = "cd-cms-bundle:";

const memoryCache = new Map<string, { entries: NamespaceEntries; storedAt: number }>();
const inFlight = new Map<string, Promise<NamespaceEntries>>();
const subscribers = new Set<() => void>();

function cacheKey(ns: string, locale: string): string {
  return `${ns}:${locale}`;
}

function readSessionCache(key: string): NamespaceEntries | null {
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { entries?: NamespaceEntries; storedAt?: number };
    if (!parsed?.entries || Date.now() - Number(parsed.storedAt || 0) > CACHE_TTL_MS) return null;
    return parsed.entries;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, entries: NamespaceEntries): void {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({ entries, storedAt: Date.now() }));
  } catch {
    // 용량 초과·차단 환경은 메모리 캐시만으로 동작한다.
  }
}

async function loadNamespace(ns: string, locale: string): Promise<NamespaceEntries> {
  const key = cacheKey(ns, locale);

  const memo = memoryCache.get(key);
  if (memo && Date.now() - memo.storedAt <= CACHE_TTL_MS) return memo.entries;

  const stored = readSessionCache(key);
  if (stored) {
    memoryCache.set(key, { entries: stored, storedAt: Date.now() });
    return stored;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl() || ""}/api/cms/bundle?ns=${encodeURIComponent(ns)}&locale=${encodeURIComponent(locale)}`,
        { credentials: "omit" },
      );
      if (!response.ok) return {};

      const data = await response.json() as { entries?: Record<string, NamespaceEntries> };
      const entries = data?.entries?.[ns] || {};
      memoryCache.set(key, { entries, storedAt: Date.now() });
      writeSessionCache(key, entries);
      return entries;
    } catch {
      // 조회 실패 = 오버라이드 없음. 호출부는 폴백을 그대로 쓴다.
      return {};
    } finally {
      inFlight.delete(key);
      for (const notify of subscribers) notify();
    }
  })();

  inFlight.set(key, request);
  return request;
}

/** 단일 문구. 값이 없거나 조회 실패면 fallback 을 그대로 돌려준다. */
export function useCmsCopy(ns: string, key: string, field: string, fallback: string, locale = "ko"): string {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    let cancelled = false;

    const apply = (entries: NamespaceEntries) => {
      if (cancelled) return;
      const next = entries?.[key]?.[field];
      setValue(typeof next === "string" && next.trim() ? next : fallback);
    };

    void loadNamespace(ns, locale).then(apply);

    const notify = () => {
      const memo = memoryCache.get(cacheKey(ns, locale));
      if (memo) apply(memo.entries);
    };
    subscribers.add(notify);

    return () => {
      cancelled = true;
      subscribers.delete(notify);
    };
  }, [ns, key, field, fallback, locale]);

  return value;
}

/** 네임스페이스 전체(공지·이벤트·배너처럼 항목 수가 가변인 경우). 로딩 중엔 빈 객체. */
export function useCmsEntries(ns: string, locale = "ko"): NamespaceEntries {
  const [entries, setEntries] = useState<NamespaceEntries>(() => memoryCache.get(cacheKey(ns, locale))?.entries || {});

  useEffect(() => {
    let cancelled = false;
    void loadNamespace(ns, locale).then((next) => {
      if (!cancelled) setEntries(next);
    });
    return () => { cancelled = true; };
  }, [ns, locale]);

  return entries;
}
