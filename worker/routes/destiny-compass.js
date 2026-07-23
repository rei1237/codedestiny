// 운명의 지도 — AI 문장화 라우트. 규칙(결정론)이 산출한 숫자·판정·근거를 "문장화"만 한다.
// 무인증·무DB 순수 엔드포인트(ziwei-island.js 선례). runAiRouteWithSecurity 미사용, 인메모리 레이트리밋만.
// 이중차단: AI는 prose(pigCommentary)만 반환 — 숫자·점수·판정은 클라이언트가 field에서 직접 렌더한다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestBuckets = new Map();

function readClientKey(request) {
  return String(
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local",
  ).slice(0, 160);
}

function checkRateLimit(request) {
  const key = readClientKey(request);
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function invalidInput(message) {
  return new HttpError(400, message, { error: "INVALID_INPUT" });
}

// 입력 정규화 — 클라의 buildNarrationInput 결과 + 규칙 템플릿(baseText)만 받는다(출생 PII 미수신).
function normalizeNarration(body) {
  const n = body?.narration;
  if (!n || typeof n !== "object") throw invalidInput("narration 데이터가 필요합니다.");
  const str = (v, max) => String(v ?? "").slice(0, max);
  const evidence = Array.isArray(n.evidence) ? n.evidence.slice(0, 8).map((e) => str(e?.term, 40)).filter(Boolean) : [];
  return {
    question: str(n.question, 120),
    primaryLabel: str(n.primaryLabel, 24),
    evidence,
    baseText: str(body?.baseText, 400),
  };
}

function buildSystemPrompt() {
  return [
    "너는 한국어 문장을 다듬는 편집자다. 주어진 '기본 해설'을, 사용자 고민과 연결해 더 따뜻하고 개인적인 2~3문장으로 '다시 쓰기'만 한다.",
    "엄격한 규칙:",
    "1) 기본 해설에 나오는 구체적 단어(영역 이름·숫자)를 그대로 유지하라. 절대 다른 단어로 바꾸지 마라(예: '창업'→'직장' 금지).",
    "2) 기본 해설에 없는 새로운 소재(문서운·관재·소송 등 다른 운세 용어, 새 숫자)를 절대 추가하지 마라.",
    "3) 의료·법률·투자 조언, 단정적 예언, 불안 조성 금지.",
    "4) 따뜻한 존댓말. 설명·머리말·따옴표·JSON 없이, 다시 쓴 문장만 출력하라.",
  ].join("\n");
}

function buildNarrativePrompt(n) {
  const evText = n.evidence.length ? n.evidence.join(", ") : "";
  return [
    n.question ? `사용자의 고민: "${n.question}"` : "사용자의 고민: (자유 입력 없음)",
    evText ? `참고 근거(원 용어, 선택적으로 한 번 언급 가능): ${evText}` : "",
    "",
    "기본 해설(이 내용·영역 이름·숫자를 그대로 유지하며 톤만 다듬어라):",
    n.baseText || "(기본 해설 없음)",
    "",
    "위 기본 해설의 구체적 단어를 바꾸지 말고, 사용자의 고민과 연결해 꽃돼지 톤으로 더 따뜻하게 다듬어라.",
  ].filter(Boolean).join("\n");
}

async function handleNarrate(request, env) {
  const body = await readJson(request);
  const n = normalizeNarration(body);

  // 기본 해설이 없으면 다듬을 대상이 없다 → 클라가 템플릿을 그대로 쓴다.
  if (!n.baseText) {
    return json({ ok: false, error: "NO_BASE_TEXT" }, { status: 200 });
  }

  let ai;
  try {
    ai = await callGeminiJsonWithRetry(env, buildNarrativePrompt(n), {
      systemPrompt: buildSystemPrompt(),
      taskType: "general",
      temperature: 0.5,
      timeoutMs: 30000,
      baseTokens: 500,
      capTokens: 800,
      // JSON 강제는 이 태스크에서 confabulation을 유발 → plain text로 받는다.
      responseMimeType: "",
      fallbackToWorkersAI: true,
      cache: {
        store: createLlmCacheStore(env),
        deterministic: true,
        ttlSeconds: 7 * 24 * 60 * 60,
        // field.seed + 고민이 프롬프트에 포함돼 캐시키(프롬프트 해시)에 반영되지만, 버전 구분자를 명시한다.
        keyExtra: "compass-narrate-v1",
      },
    });
  } catch {
    ai = null;
  }

  const text = ai?.ok ? ai.text : "";
  if (!text || !hasRenderableLlmText(text, { minChars: 20 })) {
    // 폴백은 클라이언트가 규칙 템플릿으로 처리 — 결과는 항상 표시된다.
    return json({ ok: false, error: "NARRATION_UNAVAILABLE" }, { status: 200 });
  }

  // plain text 응답 — 혹시 JSON/따옴표/머리말이 섞이면 정리한다. 숫자·판정은 클라가 field에서 렌더(재생성 위험 없음).
  let pigCommentary = String(text || "").trim();
  if (pigCommentary.startsWith("{")) {
    try {
      pigCommentary = String(JSON.parse(pigCommentary)?.pigCommentary || "").trim();
    } catch {
      /* JSON 아님 — 그대로 */
    }
  }
  pigCommentary = pigCommentary
    .replace(/^```[a-z]*\s*|\s*```$/gi, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/^(pigCommentary|해설)\s*[:：]\s*/i, "")
    .trim();

  if (!pigCommentary || pigCommentary.replace(/\s+/g, "").length < 12) {
    return json({ ok: false, error: "NARRATION_EMPTY" }, { status: 200 });
  }

  return json({ ok: true, pigCommentary, provider: ai.provider || "gemini" });
}

function routeError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, error: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
  }
  return json({ ok: false, error: "INTERNAL", message: "잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function handleDestinyCompassRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/destiny-compass");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });

    if (path === "/narrate") {
      if (method !== "POST") return methodNotAllowed();
      if (!checkRateLimit(request)) {
        return json({ ok: false, error: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } });
      }
      return await handleNarrate(request, env);
    }
    return notFound();
  } catch (error) {
    return routeError(error);
  }
}
