import { NextResponse } from "next/server";

// 한국천문연구원 공공 API 기본 URL
const KASI_BASE_URL = (
  process.env.KASI_API_BASE_URL ||
  "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService"
).replace(/\/+$/, "");

const KASI_SERVICE_KEY = String(process.env.KASI_SERVICE_KEY || "").trim();

const ALLOWED_METHODS = new Set([
  "getLunCalInfo",
  "getSolCalInfo",
  "get24DivisionsInfo",
]);

const FETCH_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.KASI_PROXY_TIMEOUT_MS || 5000),
);

// Edge-runtime 호환 인메모리 캐시 (요청당 수명)
const _memCache = new Map();
const CACHE_TTL_MS =
  Math.max(30, Number(process.env.KASI_CACHE_TTL_SECONDS || 60 * 60 * 24)) *
  1000;

function _cacheKey(method, params) {
  const sorted = Object.keys(params || {})
    .sort()
    .reduce((acc, k) => { acc[k] = params[k]; return acc; }, {});
  return `kasi:v1:${method}:${JSON.stringify(sorted)}`;
}

function _getCache(key) {
  const hit = _memCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { _memCache.delete(key); return null; }
  return hit.rows;
}

function _setCache(key, rows) {
  _memCache.set(key, { at: Date.now(), rows });
}

function _decodeKey(raw) {
  if (!raw) return "";
  try { return decodeURIComponent(raw); } catch (_) { return raw; }
}

function _normalizeRows(payload) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function _extractXmlTag(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(String(xml || ""));
  if (!m) return "";
  return String(m[1] || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function _parseXmlItems(xml) {
  const rows = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1] || "";
    const row = {};
    const fieldRe = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let f;
    while ((f = fieldRe.exec(block))) {
      row[f[1]] = String(f[2] || "")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .trim();
    }
    if (Object.keys(row).length) rows.push(row);
  }
  return rows;
}

function _normalizeRaw(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  // XML 폴백
  const resultCode = _extractXmlTag(text, "resultCode");
  const resultMsg  = _extractXmlTag(text, "resultMsg");
  const items      = _parseXmlItems(text);
  if (resultCode || resultMsg || items.length) {
    return {
      response: {
        header: { resultCode: resultCode || "00", resultMsg: resultMsg || "NORMAL SERVICE." },
        body:   { items: { item: items } },
      },
    };
  }
  return null;
}

async function _fetchKasiDirect(method, params) {
  const keyCandidates = [
    _decodeKey(KASI_SERVICE_KEY),
    KASI_SERVICE_KEY,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  if (!keyCandidates.length) {
    const err = new Error("KASI_SERVICE_KEY 환경변수가 필요합니다.");
    err.status = 500;
    throw err;
  }

  let lastError = null;

  for (const serviceKey of keyCandidates) {
    const query = new URLSearchParams({ ...(params || {}), serviceKey, _type: "json" });
    const url = `${KASI_BASE_URL}/${method}?${query.toString()}`;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(tid);

      const rawText = await res.text();
      const payload = _normalizeRaw(rawText);

      if (!payload && rawText.trim()) {
        const e = new Error("KASI 응답 파싱 실패");
        e.status = 503;
        throw e;
      }

      if (!res.ok) {
        const e = new Error(`KASI HTTP ${res.status}`);
        e.status = 503;
        throw e;
      }

      const rc = String(payload?.response?.header?.resultCode || "");
      if (rc && rc !== "00") {
        const e = new Error(payload?.response?.header?.resultMsg || "KASI API 오류");
        e.status = 503;
        e.resultCode = rc;
        throw e;
      }

      return _normalizeRows(payload);
    } catch (err) {
      clearTimeout(tid);
      if (err?.name === "AbortError") {
        const te = new Error("KASI API 타임아웃");
        te.status = 503;
        lastError = te;
      } else {
        lastError = err;
      }
      console.error(
        `[api/kasi/calendar] fetch failed method=${method} params=${JSON.stringify(params || {})}`,
        lastError?.message,
      );
    }
  }

  throw lastError || new Error("KASI API 호출 실패");
}

export async function POST(request) {
  try {
    const body   = await request.json().catch(() => ({}));
    const method = String(body?.method || "").trim();
    const params = body?.params || {};

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { ok: false, message: "지원하지 않는 KASI 메서드입니다." },
        { status: 400 },
      );
    }

    const key    = _cacheKey(method, params);
    const cached = _getCache(key);
    if (cached) {
      return NextResponse.json(
        { ok: true, method, rows: cached, cache: { hit: true, layer: "memory" } },
        { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
      );
    }

    const rows = await _fetchKasiDirect(method, params);
    _setCache(key, rows);

    return NextResponse.json(
      { ok: true, method, rows, cache: { hit: false, layer: "network" } },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    const status =
      Number.isFinite(err?.status) && err.status >= 400 ? err.status : 503;
    const isUpstream = status >= 500;
    const message = isUpstream
      ? "한국천문연 API 서버 점검 중입니다. 잠시 후 다시 시도해 주세요."
      : (err?.message || "KASI 요청 파라미터를 확인해 주세요.");

    console.error("[api/kasi/calendar]", {
      status,
      message: err?.message || null,
      resultCode: err?.resultCode || null,
    });

    return NextResponse.json(
      {
        ok: false,
        maintenance: isUpstream,
        fallbackRecommended: isUpstream,
        message,
        detail: err?.message || null,
      },
      { status },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "POST 메서드를 사용하세요." },
    { status: 405 },
  );
}
