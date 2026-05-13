import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const DEFAULT_KASI_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService";
const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);

function decodeServiceKeyCandidate(rawKey) {
  if (!rawKey) return "";
  const key = String(rawKey).trim();
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function normalizeMethod(method) {
  const value = String(method || "").trim();
  if (!ALLOWED_METHODS.has(value)) {
    throw createHttpError(400, "지원하지 않는 KASI 메서드입니다.", { code: "KASI_INVALID_METHOD" });
  }
  return value;
}

function normalizeRows(payload) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

async function requestCalendar(env, methodRaw, paramsRaw) {
  const method = normalizeMethod(methodRaw);
  const params = (paramsRaw && typeof paramsRaw === "object") ? paramsRaw : {};
  const kasiBaseUrl = String(env.KASI_API_BASE_URL || DEFAULT_KASI_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = Math.max(1000, Number(env.KASI_PROXY_TIMEOUT_MS || 3000));

  const decoded = decodeServiceKeyCandidate(env.KASI_SERVICE_KEY);
  const candidates = Array.from(new Set([decoded, String(env.KASI_SERVICE_KEY || "").trim()].filter(Boolean)));
  if (!candidates.length) {
    throw createHttpError(500, "KASI_SERVICE_KEY 환경변수가 필요합니다.", { code: "KASI_KEY_MISSING" });
  }

  let lastError = null;
  for (const serviceKey of candidates) {
    const query = new URLSearchParams({
      ...params,
      serviceKey,
      _type: "json",
    });

    const url = `${kasiBaseUrl}/${method}?${query.toString()}`;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) {
        try {
          controller.abort();
        } catch (_) {}
      }
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : undefined,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        throw createHttpError(503, `KASI 응답 오류: HTTP ${response.status}`, { code: "KASI_UPSTREAM_ERROR" });
      }

      const resultCode = String(payload?.response?.header?.resultCode || "");
      if (resultCode && resultCode !== "00") {
        throw createHttpError(503, payload?.response?.header?.resultMsg || "KASI API 오류", { code: "KASI_UPSTREAM_ERROR" });
      }

      return {
        rows: normalizeRows(payload),
        cache: "miss",
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        lastError = createHttpError(503, "KASI API 타임아웃", { code: "KASI_TIMEOUT" });
      } else {
        lastError = error;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || createHttpError(503, "KASI API 요청 실패", { code: "KASI_REQUEST_FAILED" });
}

export async function handleKasiRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/kasi");

    if (path !== "/calendar") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const body = await readJson(request);
    const result = await requestCalendar(env, body?.method, body?.params || {});

    return json({
      ok: true,
      method: String(body?.method || "").trim(),
      rows: result?.rows || [],
      cache: result?.cache || null,
    });
  } catch (error) {
    if (Number(error?.status) === 400) {
      return json({
        ok: false,
        maintenance: false,
        fallbackRecommended: false,
        message: error?.message || "KASI 요청 파라미터를 확인해 주세요.",
        detail: error?.message || null,
      }, { status: 400 });
    }

    if (Number(error?.status) >= 500) {
      return json({
        ok: false,
        maintenance: true,
        fallbackRecommended: true,
        message: "한국천문연 API 서버 점검 중입니다. 잠시 후 다시 시도해 주세요.",
        detail: error?.message || null,
      }, { status: 503 });
    }

    return handleRouteError(error);
  }
}
