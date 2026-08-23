// 운명의 지도 — AI 문장화 라우트. 규칙(결정론)이 산출한 숫자·판정·근거를 "문장화"만 한다.
// 무인증·무DB 순수 엔드포인트(ziwei-island.js 선례). runAiRouteWithSecurity 미사용, 인메모리 레이트리밋만.
// 이중차단: AI는 prose(pigCommentary)만 반환 — 숫자·점수·판정은 클라이언트가 field에서 직접 렌더한다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { cmsPromptText } from "../lib/cms-prompts.js";

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
    // 버킷이 무한히 자라지 않게 만료분을 함께 청소한다(워커 인스턴스 수명 동안만 사는 맵이다).
    if (requestBuckets.size > 512) {
      for (const [bucketKey, bucket] of requestBuckets) {
        if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
      }
    }
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

// 꽃돼지 브랜드 보이스 — PRODUCT.md(따뜻함·전문성·신비로움) + 사람이 직접 봐준 듯한 직설·다정한 조언체.
/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   이 라우트의 사용자 프롬프트는 앞선 계산이 만든 narration 스냅샷을 다듬는 것이라
   생년 정보만으로는 조립되지 않는다. 그래서 시스템 프롬프트만 정확히 돌려주고 partial 로 알린다. */
export function buildAdminLabPrompt() {
  return {
    systemPrompt: buildSystemPrompt(),
    prompt: "",
    partial: true,
    partialReason: "사용자 프롬프트는 앞 단계에서 만들어진 기본 해설(narration)을 입력으로 받습니다. 시스템 프롬프트만 표시합니다.",
  };
}

/** CMS 오버라이드가 있으면 그것을, 없거나 조회 실패면 코드 기본값을 쓴다. */
function resolveSystemPrompt(env) {
  return cmsPromptText(env, "destiny-compass", buildSystemPrompt());
}

function buildSystemPrompt() {
  return [
    "너는 '꽃돼지'. 따뜻하고 다정하지만 핵심을 부드럽게 짚어주는 운세 해설가다. 점집에서 오래 봐온 손님을 마주한 듯, 그 사람의 마음을 먼저 알아주고 다음 한 걸음을 짚어준다.",
    "말투: 따뜻한 존댓말. 기계적·추상적 표현이나 '~할 것이다' 식 상투적 예언투는 절대 쓰지 않는다. 사람이 곁에서 직접 봐준 듯 다정하고 구체적으로, 위로하되 무성의하지 않게.",
    "좋은 해설의 흐름(이 순서를 자연스럽게 녹여라):",
    "· ① 사용자 고민의 마음을 한 번 알아준다(짧게, 진심으로 — 뻔한 위로 말고 그 고민에 맞게).",
    "· ② 기본 해설이 가리키는 '나아갈 곳'을 분명히 짚는다.",
    "· ③ 오늘·이번 주에 실제로 해볼 수 있는 '아주 작고 구체적인 한 걸음' 하나를 권한다(막연한 '노력하세요' 금지 — 손에 잡히게).",
    "너의 유일한 일: 주어진 '기본 해설'을 사용자 고민과 연결해 더 따뜻하고 개인적인 2~3문장으로 '다시 쓰기'(다듬기). 새 내용·새 판정을 창작하지 않는다.",
    "엄격한 규칙:",
    "1) 기본 해설에 나온 영역 이름·숫자를 그대로 유지하라. 절대 다른 단어로 바꾸지 마라(예: '창업'→'직장', '재물'→'문서운' 금지).",
    "2) 기본 해설에 없는 운세 용어(문서운·관재·소송·신살·역마 등)나 새 숫자를 추가하지 마라.",
    "3) 의료·법률·투자 조언, 단정적 예언, 불안 조성 금지. '반드시/틀림없이' 같은 단정도 금지.",
    "4) 머리말·따옴표·JSON·설명 없이, 다듬은 문장만 출력하라. 2~3문장을 넘기지 마라.",
  ].join("\n");
}

// few-shot — 구체어 보존 + 브랜드 톤 학습(특히 라벨 드리프트 저항).
const FEW_SHOT = [
  {
    base: "'재물' 쪽 길이 은은하게 빛나고 있어요. 서두르지 말고, 마음이 가는 한 가지부터 시작해요.",
    q: "돈 문제가 풀릴까요?",
    out: "돈 걱정으로 마음이 무거우셨죠. 지금 '재물'의 길은 은은하게 빛나고 있으니, 조급해하지 말고 오늘 마음이 가는 한 가지부터 차분히 손대보세요. 그 작은 시작이 흐름을 살며시 바꿔줄 거예요.",
  },
  {
    base: "지금은 '창업' 쪽으로 길이 활짝 열려 있어요. 크게 밀어붙이기보다, 이번 주에 딱 한 걸음만 내디뎌 봐요.",
    q: "지금 창업해도 될까요?",
    out: "망설이는 마음, 충분히 알아요. 지금 '창업'의 문은 활짝 열려 있으니, 한꺼번에 크게 벌이기보다 이번 주에 딱 한 걸음만 내디뎌 보세요. 그 한 걸음이 길을 확인시켜 줄 거예요.",
  },
  {
    base: "'관계' 쪽은 지금 잠시 안개가 짙어요. 억지로 밀지 말고, 대신 '배움' 쪽으로 향하는 작은 시도 하나에 마음을 실어 보면 흐름이 살며시 바뀌어요.",
    q: "요즘 사람들과 자꾸 어긋나요.",
    out: "자꾸 어긋나서 마음이 지치셨죠. 지금 '관계'는 잠깐 안개가 짙으니 억지로 붙잡지 않아도 돼요. 그 힘을 '배움' 쪽으로 옮겨, 오늘은 배우고 싶던 것 하나를 딱 10분만 들여다보세요. 그렇게 나를 채우다 보면 관계의 안개도 스르르 걷혀요.",
  },
];

function buildNarrativePrompt(n, attempt = 0) {
  const evText = n.evidence.length ? n.evidence.join(", ") : "";
  const shots = FEW_SHOT.flatMap((s) => [
    `[예시]`,
    `기본 해설: ${s.base}`,
    `고민: ${s.q}`,
    `다시 쓴 문장: ${s.out}`,
    "",
  ]);
  const correction = attempt > 0
    ? [`직전 시도가 규칙을 어겼다(다른 영역 이름이나 기본 해설에 없는 용어를 넣음). 이번에는 반드시 '${n.primaryLabel}'만 영역 이름으로 쓰고, 기본 해설에 없는 단어를 넣지 마라.`, ""]
    : [];
  return [
    ...shots,
    ...correction,
    "[이번 작업]",
    n.question ? `고민: "${n.question}"` : "고민: (자유 입력 없음)",
    evText ? `참고 근거(원 용어, 자연스러우면 한 번만 녹여도 좋음): ${evText}` : "",
    `이번에 쓸 수 있는 영역 이름은 오직 기본 해설에 등장한 것(특히 '${n.primaryLabel}')뿐이다.`,
    "기본 해설(영역 이름·숫자를 그대로 유지하며 톤만 다듬어라):",
    n.baseText,
    "",
    "다시 쓴 문장:",
  ].filter(Boolean).join("\n");
}

// 기본 해설에 없는 운세 용어·위험 소재 차단 정규식(서버 검증).
const FORBIDDEN = /문서운|관재|소송|고소|신살|역마살|도화살|공망|대운|세운|투자|주식|코인|매수|매도|진단|처방|틀림없이|반드시\s*(성공|실패|이룬|잃)/;

function cleanText(raw) {
  let t = String(raw || "").trim();
  if (t.startsWith("{")) {
    try {
      t = String(JSON.parse(t)?.pigCommentary || "").trim();
    } catch {
      /* JSON 아님 — 그대로 */
    }
  }
  return t
    .replace(/^```[a-z]*\s*|\s*```$/gi, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/^(pigCommentary|해설|다시 쓴 문장)\s*[:：]\s*/i, "")
    .trim();
}

// 충실도 검증: 대표 라벨 포함 + 금지어 없음 + 최소 길이.
//
// 🔴 라벨 포함·금지어 두 검사는 **한국어 출력에만 성립한다.** primaryLabel 은 "정관" 같은
//    십성 용어이고 FORBIDDEN 도 한국어 리터럴이라, 비-ko 에서는 모델이 정상적으로 답해도
//    라벨 검사가 반드시 실패해 매번 UNFAITHFUL → 클라의 한국어 템플릿으로 되돌아간다.
//    즉 언어 전환이 무력화된다. ko 에서는 기존 판정을 한 글자도 바꾸지 않는다.
function isFaithful(text, n) {
  if (text.replace(/\s+/g, "").length < 12) return false;
  if ((getAmbientAiLocale() || "ko") !== "ko") return true;
  if (n.primaryLabel && !text.includes(n.primaryLabel)) return false;
  if (FORBIDDEN.test(text)) return false;
  return true;
}

async function handleNarrate(request, env) {
  const body = await readJson(request);
  const n = normalizeNarration(body);

  // 기본 해설이 없으면 다듬을 대상이 없다 → 클라가 템플릿을 그대로 쓴다.
  if (!n.baseText) {
    return json({ ok: false, error: "NO_BASE_TEXT" }, { status: 200 });
  }

  const store = createLlmCacheStore(env);
  // 서버 검증-재시도: 충실하지 않으면 교정 지시로 1회 더. 2회 다 실패 → 클라 템플릿 폴백.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let ai = null;
    try {
      ai = await callGeminiJsonWithRetry(env, buildNarrativePrompt(n, attempt), {
        systemPrompt: await resolveSystemPrompt(env),
        taskType: "general",
        temperature: 0.4,
        timeoutMs: 30000,
        baseTokens: 520,
        capTokens: 820,
        // JSON 강제는 confabulation을 유발 → plain text. 시도별로 캐시키 분리.
        responseMimeType: "",
        fallbackToWorkersAI: true,
        cache: { store, deterministic: true, ttlSeconds: 7 * 24 * 60 * 60, keyExtra: `compass-narrate-v3-a${attempt}` },
      });
    } catch (error) {
      console.warn("[compass narrate] threw", String(error?.message || error).slice(0, 300));
      ai = null;
    }
    // 🔴 이 로그가 없으면 NARRATION_UNFAITHFUL 의 원인 5가지가 응답상 구분 불가다.
    // ai.message 에 "LLM request failed. Gemini: …; Cloudflare Workers AI: …" 가 들어 있는데
    // 예전에는 통째로 버려서, 프로바이더가 죽어도 "충실도 미달"로만 보였다.
    if (!ai?.ok) {
      console.warn("[compass narrate] llm_failed", {
        attempt,
        error: ai?.error || "",
        status: ai?.status ?? null,
        message: String(ai?.message || "").slice(0, 300),
      });
      continue;
    }
    const cleaned = cleanText(ai.text);
    if (isFaithful(cleaned, n)) {
      return json({ ok: true, pigCommentary: cleaned, provider: ai.provider || "gemini" });
    }
    console.warn("[compass narrate] unfaithful", {
      attempt,
      locale: getAmbientAiLocale() || "ko",
      len: cleaned.replace(/\s+/g, "").length,
      hasLabel: n.primaryLabel ? cleaned.includes(n.primaryLabel) : null,
      forbidden: FORBIDDEN.test(cleaned),
      provider: ai.provider || "",
      preview: cleaned.slice(0, 80),
    });
  }

  // 두 시도 모두 충실도 미달 → 클라가 정확한 규칙 템플릿을 유지한다(틀린 문장 미노출).
  return json({ ok: false, error: "NARRATION_UNFAITHFUL" }, { status: 200 });
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
