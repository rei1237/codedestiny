import { NextResponse } from "next/server";

const KASI_BASE_URL = String(
  process.env.KASI_API_BASE_URL ||
    "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService"
).replace(/\/+$/, "");

const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);

function getServiceKeyCandidates() {
  const raw = String(process.env.KASI_SERVICE_KEY || "").trim();
  if (!raw) return [];

  const candidates = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) candidates.push(decoded);
  } catch (_e) {}

  return Array.from(new Set(candidates));
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractXmlTagText(xmlText, tagName) {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = re.exec(String(xmlText || ""));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseXmlItems(xmlText) {
  const rows = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRe.exec(xmlText))) {
    const block = itemMatch[1] || "";
    const row = {};
    const fieldRe = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch;

    while ((fieldMatch = fieldRe.exec(block))) {
      row[fieldMatch[1]] = decodeXmlEntities(fieldMatch[2]);
    }

    if (Object.keys(row).length) rows.push(row);
  }

  return rows;
}

function normalizePayloadFromRaw(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return { payload: null, parsedAs: "empty" };

  try {
    return { payload: JSON.parse(text), parsedAs: "json" };
  } catch (_jsonErr) {
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

function normalizeRows(payload) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export async function POST(request) {
  try {
    const serviceKeyCandidates = getServiceKeyCandidates();
    if (!serviceKeyCandidates.length) {
      return NextResponse.json(
        {
          ok: false,
          maintenance: true,
          fallbackRecommended: true,
          message: "한국천문연 API 설정이 누락되었습니다. 잠시 후 다시 시도해 주세요.",
          detail: "KASI_SERVICE_KEY is required",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const method = String(body?.method || "").trim();
    const params = body?.params || {};

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        {
          ok: false,
          message: "지원하지 않는 KASI 메서드입니다.",
          detail: method,
        },
        { status: 400 }
      );
    }

    let lastError = null;

    for (let idx = 0; idx < serviceKeyCandidates.length; idx += 1) {
      const serviceKey = serviceKeyCandidates[idx];
      const query = new URLSearchParams({
        ...(params || {}),
        serviceKey,
        _type: "json",
      });
      const url = `${KASI_BASE_URL}/${method}?${query.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const upstream = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const rawText = await upstream.text();
        const parsed = normalizePayloadFromRaw(rawText);
        const payload = parsed.payload;

        if (!payload && String(rawText || "").trim()) {
          throw new Error("KASI 응답 파싱 실패(JSON/XML 아님)");
        }

        if (!upstream.ok) {
          throw new Error(`KASI 응답 오류: HTTP ${upstream.status}`);
        }

        const resultCode = String(payload?.response?.header?.resultCode || "");
        if (resultCode && resultCode !== "00") {
          throw new Error(payload?.response?.header?.resultMsg || "KASI API 오류");
        }

        const rows = normalizeRows(payload);
        return NextResponse.json({
          ok: true,
          method,
          rows,
          cache: { hit: false, layer: "network" },
        });
      } catch (err) {
        lastError = err;
        console.error(`[api/kasi/calendar] method=${method} keyVariant=${idx + 1}/${serviceKeyCandidates.length}`, err);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        maintenance: true,
        fallbackRecommended: true,
        message: "한국천문연 API 서버 점검 중입니다. 잠시 후 다시 시도해 주세요.",
        detail: (lastError && lastError.message) || "KASI upstream unavailable",
      },
      { status: 503 }
    );
  } catch (err) {
    console.error("[api/kasi/calendar]", err);
    return NextResponse.json(
      {
        ok: false,
        maintenance: true,
        fallbackRecommended: true,
        message: "한국천문연 API 요청 처리 중 오류가 발생했습니다.",
        detail: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
