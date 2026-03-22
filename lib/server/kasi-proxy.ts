type KasiMethod = "getLunCalInfo" | "getSolCalInfo" | "get24DivisionsInfo";

const KASI_BASE_URL = String(
  process.env.KASI_API_BASE_URL ||
    "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService",
).replace(/\/+$/, "");

const CACHE_TTL_MS = Math.max(
  30,
  Number(process.env.KASI_CACHE_TTL_SECONDS || 60 * 60 * 24),
) * 1000;
const FETCH_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.KASI_PROXY_TIMEOUT_MS || 3000),
);

const ALLOWED_METHODS: KasiMethod[] = [
  "getLunCalInfo",
  "getSolCalInfo",
  "get24DivisionsInfo",
];

type CacheEntry = {
  savedAt: number;
  rows: Record<string, unknown>[];
};

const globalCache = globalThis as typeof globalThis & {
  __kasiCalendarCache?: Map<string, CacheEntry>;
};

const memoryCache = globalCache.__kasiCalendarCache || new Map<string, CacheEntry>();
globalCache.__kasiCalendarCache = memoryCache;

function decodeServiceKeyCandidate(rawKey: string): string {
  if (!rawKey) return "";
  const key = String(rawKey).trim();
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function getServiceKeyCandidates(): string[] {
  const astronomyApiKey = String(process.env.ASTRONOMY_API_KEY || "").trim();
  const kasiServiceKey = String(process.env.KASI_SERVICE_KEY || "").trim();
  const chosen = astronomyApiKey || kasiServiceKey;
  if (!chosen) {
    const err = new Error(
      "ASTRONOMY_API_KEY (or KASI_SERVICE_KEY) is undefined in server runtime.",
    ) as Error & { status?: number; code?: string };
    err.status = 500;
    err.code = "KASI_API_KEY_MISSING";
    throw err;
  }
  const decoded = decodeServiceKeyCandidate(chosen);
  return Array.from(new Set([decoded, chosen].filter(Boolean)));
}

function normalizeMethod(method: unknown): KasiMethod {
  const m = String(method || "").trim() as KasiMethod;
  if (!ALLOWED_METHODS.includes(m)) {
    const err = new Error("Unsupported KASI method") as Error & { status?: number };
    err.status = 400;
    throw err;
  }
  return m;
}

function stableSortObject(obj: unknown): unknown {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out: Record<string, unknown> = {};
  Object.keys(obj as Record<string, unknown>)
    .sort()
    .forEach((k) => {
      out[k] = stableSortObject((obj as Record<string, unknown>)[k]);
    });
  return out;
}

function buildCacheKey(method: KasiMethod, params: Record<string, unknown>): string {
  return `kasi:v2:${method}:${JSON.stringify(stableSortObject(params || {}))}`;
}

function getMemoryCache(key: string): Record<string, unknown>[] | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.savedAt > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return hit.rows;
}

function setMemoryCache(key: string, rows: Record<string, unknown>[]): void {
  memoryCache.set(key, { savedAt: Date.now(), rows });
}

function decodeXmlEntities(value: string): string {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractXmlTagText(xmlText: string, tagName: string): string {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = re.exec(String(xmlText || ""));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseXmlItems(xmlText: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRe.exec(xmlText))) {
    const block = itemMatch[1] || "";
    const row: Record<string, unknown> = {};
    const fieldRe = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRe.exec(block))) {
      const key = fieldMatch[1];
      row[key] = decodeXmlEntities(fieldMatch[2]);
    }

    if (Object.keys(row).length) rows.push(row);
  }

  return rows;
}

function normalizePayloadFromRaw(rawText: string): {
  payload: Record<string, unknown> | null;
  parsedAs: "json" | "xml" | "empty" | "unknown";
} {
  const text = String(rawText || "").trim();
  if (!text) return { payload: null, parsedAs: "empty" };

  try {
    return {
      payload: JSON.parse(text) as Record<string, unknown>,
      parsedAs: "json",
    };
  } catch {
    const resultCode = extractXmlTagText(text, "resultCode");
    const resultMsg = extractXmlTagText(text, "resultMsg");
    const rows = parseXmlItems(text);
    if (resultCode || resultMsg || rows.length) {
      return {
        payload: {
          response: {
            header: {
              resultCode: resultCode || "00",
              resultMsg: resultMsg || "NORMAL SERVICE.",
            },
            body: {
              items: {
                item: rows,
              },
            },
          },
        },
        parsedAs: "xml",
      };
    }
  }

  return { payload: null, parsedAs: "unknown" };
}

function normalizeRows(payload: Record<string, unknown> | null): Record<string, unknown>[] {
  const response = payload?.response as Record<string, unknown> | undefined;
  const body = (response?.body || {}) as Record<string, unknown>;
  const items = (body?.items || {}) as Record<string, unknown>;
  const item = items?.item;
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  if (item && typeof item === "object") return [item as Record<string, unknown>];

  const rows = payload?.rows;
  if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  return [];
}

export async function requestKasiCalendar(
  methodInput: unknown,
  paramsInput: unknown,
): Promise<{
  method: KasiMethod;
  rows: Record<string, unknown>[];
  cache: { hit: boolean; layer: "memory" | "network" };
  diagnostics: { parsedAs: string; keyVariantTried: number };
}> {
  const method = normalizeMethod(methodInput);
  const params = (paramsInput && typeof paramsInput === "object"
    ? paramsInput
    : {}) as Record<string, unknown>;

  const cacheKey = buildCacheKey(method, params);
  const cached = getMemoryCache(cacheKey);
  if (cached) {
    return {
      method,
      rows: cached,
      cache: { hit: true, layer: "memory" },
      diagnostics: { parsedAs: "cache", keyVariantTried: 0 },
    };
  }

  const keys = getServiceKeyCandidates();
  let lastError: Error | null = null;

  for (let idx = 0; idx < keys.length; idx += 1) {
    const serviceKey = keys[idx];
    const query = new URLSearchParams({
      ...(params || {}),
      serviceKey,
      _type: "json",
    } as Record<string, string>);
    const url = `${KASI_BASE_URL}/${method}?${query.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const rawText = await response.text();
      const parsed = normalizePayloadFromRaw(rawText);
      const payload = parsed.payload;

      if (!payload && String(rawText || "").trim()) {
        const err = new Error("KASI response parse failure (neither JSON nor XML)") as Error & {
          status?: number;
          detail?: string;
        };
        err.status = 503;
        err.detail = String(rawText).slice(0, 260);
        throw err;
      }

      if (!response.ok) {
        const err = new Error(`KASI upstream HTTP ${response.status}`) as Error & {
          status?: number;
        };
        err.status = 503;
        throw err;
      }

      const header = (payload?.response as Record<string, unknown> | undefined)
        ?.header as Record<string, unknown> | undefined;
      const resultCode = String(header?.resultCode || "");
      if (resultCode && resultCode !== "00") {
        const err = new Error(String(header?.resultMsg || "KASI API error")) as Error & {
          status?: number;
          resultCode?: string;
        };
        err.status = 503;
        err.resultCode = resultCode;
        throw err;
      }

      const rows = normalizeRows(payload);
      setMemoryCache(cacheKey, rows);
      return {
        method,
        rows,
        cache: { hit: false, layer: "network" },
        diagnostics: { parsedAs: parsed.parsedAs, keyVariantTried: idx + 1 },
      };
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        const timeoutErr = new Error("KASI API timeout") as Error & { status?: number };
        timeoutErr.status = 503;
        lastError = timeoutErr;
      } else {
        lastError = error as Error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const fail = (lastError || new Error("KASI request failed")) as Error & {
    status?: number;
  };
  if (!fail.status) fail.status = 503;
  throw fail;
}

export function getKasiAllowedMethods(): string[] {
  return ALLOWED_METHODS.slice();
}

export function hasKasiApiKeyConfigured(): boolean {
  const astronomyApiKey = String(process.env.ASTRONOMY_API_KEY || "").trim();
  const kasiServiceKey = String(process.env.KASI_SERVICE_KEY || "").trim();
  return Boolean(astronomyApiKey || kasiServiceKey);
}
