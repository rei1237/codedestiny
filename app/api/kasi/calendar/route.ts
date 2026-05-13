import { NextRequest, NextResponse } from "next/server";

const KASI_BASE_URL = String(
  process.env.KASI_API_BASE_URL ||
    "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService"
).replace(/\/+$/, "");

const KASI_SERVICE_KEY = String(process.env.KASI_SERVICE_KEY || "").trim();
const FETCH_TIMEOUT_MS = Math.max(1000, Number(process.env.KASI_PROXY_TIMEOUT_MS || 3000));
const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);

function decodeServiceKeyCandidate(rawKey: string) {
  if (!rawKey) return "";
  const key = String(rawKey).trim();
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function normalizeMethod(method: unknown) {
  const m = String(method || "").trim();
  if (!ALLOWED_METHODS.has(m)) {
    const err = new Error("지원하지 않는 KASI 메서드입니다.") as Error & { status?: number };
    err.status = 400;
    throw err;
  }
  return m;
}

function normalizeRows(payload: any) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

async function requestCalendar(methodRaw: unknown, paramsRaw: unknown) {
  const method = normalizeMethod(methodRaw);
  const params = (paramsRaw && typeof paramsRaw === "object") ? (paramsRaw as Record<string, string>) : {};

  const decoded = decodeServiceKeyCandidate(KASI_SERVICE_KEY);
  const candidates = Array.from(new Set([decoded, KASI_SERVICE_KEY].filter(Boolean)));
  if (!candidates.length) {
    const err = new Error("KASI_SERVICE_KEY 환경변수가 필요합니다.") as Error & { status?: number };
    err.status = 500;
    throw err;
  }

  let lastError: any = null;
  for (const serviceKey of candidates) {
    const query = new URLSearchParams({
      ...params,
      serviceKey,
      _type: "json",
    });
    const url = `${KASI_BASE_URL}/${method}?${query.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        const err = new Error(`KASI 응답 오류: HTTP ${response.status}`) as Error & { status?: number };
        err.status = 503;
        throw err;
      }
      const resultCode = String(payload?.response?.header?.resultCode || "");
      if (resultCode && resultCode !== "00") {
        const err = new Error(payload?.response?.header?.resultMsg || "KASI API 오류") as Error & { status?: number };
        err.status = 503;
        throw err;
      }
      return {
        rows: normalizeRows(payload),
        cache: "miss",
      };
    } catch (error: any) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("KASI API 타임아웃") as Error & { status?: number };
        timeoutError.status = 503;
        lastError = timeoutError;
      } else {
        lastError = error;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError) throw lastError;
  const err = new Error("KASI API 요청 실패") as Error & { status?: number };
  err.status = 503;
  throw err;
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const method = String(body?.method || "").trim();
    const params = (body?.params || {}) as Record<string, unknown>;

    const result = await requestCalendar(method, params);

    return NextResponse.json({
      ok: true,
      method,
      rows: result?.rows || [],
      cache: result?.cache || null,
    });
  } catch (error: any) {
    const status = Number(error?.status) >= 400 ? Number(error.status) : 503;
    const isUpstreamIssue = status >= 500;
    const isKeyMissing = error?.code === "KASI_KEY_MISSING" || error?.message?.includes("KASI_SERVICE_KEY");
    const message = isUpstreamIssue
      ? (isKeyMissing
          ? "한국천문연 API 키가 설정되지 않아 로컬 엔진으로 전환합니다."
          : "한국천문연 API 서버 점검 중입니다. 잠시 후 다시 시도해 주세요.")
      : (error?.message || "KASI 요청 파라미터를 확인해 주세요.");

    return NextResponse.json(
      {
        ok: false,
        maintenance: isUpstreamIssue,
        fallbackRecommended: isUpstreamIssue,
        code: isKeyMissing ? "KASI_KEY_MISSING" : (isUpstreamIssue ? "KASI_UPSTREAM_ERROR" : "KASI_BAD_REQUEST"),
        message,
        detail: error?.message || null,
      },
      { status }
    );
  }
}
