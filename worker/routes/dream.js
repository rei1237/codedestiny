import { parseNarrativeResponse, stripNarrativeHeadings, narrativePriorDigest, NARRATIVE_RESPONSE_SCHEMA } from "../lib/paid-narrative-candidate.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { runPaidNarrativeDelivery } from "../lib/paid-narrative-delivery.js";
import { settlePerUseAccessDecision, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { countPaidReportBodyChars } from "../lib/paid-report-quality.js";
import { callGeminiText } from "../lib/gemini.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { normalizeDreamText, chooseFallbackDreamCards, normalizeDreamPromptCards, uniqueList, inferDreamThemes, buildDreamTarotConsultPrompt } from "../../lib/tarot/dream-prompt.mjs";

const DREAM_PSYCHO_FEATURE_KEY = "dream-psycho-analysis";
const DREAM_PSYCHO_FEATURE_REASON = "정신분석 해몽";
const DREAM_PSYCHO_REPORT_TYPE = "dreamPsychoAnalysis";
const DREAM_PSYCHO_GEMINI_MODEL_KEYS = Object.freeze([
  "DREAM_PSYCHO_GEMINI_MODEL",
  "PSYCHO_DREAM_GEMINI_MODEL",
  "GEMINI_MODEL",
]);

/** 첫 번째로 값이 있는 env 키를 고른다. callGeminiText 는 `model`(문자열) 하나만 읽는다. */
function firstDreamPsychoModel(env = {}) {
  for (const key of DREAM_PSYCHO_GEMINI_MODEL_KEYS) {
    const value = typeof env?.[key] === "string" ? env[key].trim() : "";
    if (value) return value;
  }
  return "";
}

let dreamGeminiCaller = callGeminiText;
let dreamPsychoAccessVerifier = verifyPsychoDreamAccess;

export function __setDreamGeminiCallerForTest(fn) {
  dreamGeminiCaller = typeof fn === "function" ? fn : callGeminiText;
}

export function __resetDreamGeminiCallerForTest() {
  dreamGeminiCaller = callGeminiText;
}

export function __setDreamPsychoAccessVerifierForTest(fn) {
  dreamPsychoAccessVerifier = typeof fn === "function" ? fn : verifyPsychoDreamAccess;
}

export function __resetDreamPsychoAccessVerifierForTest() {
  dreamPsychoAccessVerifier = verifyPsychoDreamAccess;
}

export async function verifyPsychoDreamAccess(request, env = {}, body = {}, knownAuth) {
  let auth = knownAuth;
  try {
    // allowDbFallback: true — 유효한 JWT는 Mongo 풀 초기화 등 일시적 DB 오류에도 신뢰하고
    // (authDbFallback 플래그만 붙여) 인증을 통과시킨다. 실제로 로그인이 안 된 요청만 null.
    if (!auth) auth = await getOptionalUserFromRequest(request, env, { allowDbFallback: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      return {
        ok: false,
        status: 503,
        code: "AUTH_TEMPORARILY_UNAVAILABLE",
        message: "일시적인 오류로 로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    throw error;
  }
  if (!auth) {
    return { ok: false, status: 401, code: "LOGIN_REQUIRED", message: "로그인 후 정신분석 해몽을 이용해 주세요." };
  }

  const decision = await canAccessPaidFeature(auth.userId, DREAM_PSYCHO_FEATURE_KEY, {
    env,
    reason: DREAM_PSYCHO_FEATURE_REASON,
    // 인증 단계에서 이미 읽은 User 문서를 재사용한다(없으면 내부에서 종전대로 조회).
    userDoc: auth.authUserDoc,
  });
  if (decision?.allowed) {
    // 🔴 이용권·라이선스·월구독 허용은 읽기 전용 판정이다(2026-10-16). 이번 requestId 로 결제가 확인되거나
    //    이용권이 실제로 차감된 경우만 연다. 거부면 아래 토큰·증빙 경로로 넘어간다.
    const settled = await settlePerUseAccessDecision(env, { decision, userId: auth.userId, featureKey: DREAM_PSYCHO_FEATURE_KEY,
      coinPrice: FEATURE_KEY_PRICE_TABLE[DREAM_PSYCHO_FEATURE_KEY].cost, requestId: typeof body.requestId === "string" ? body.requestId : "" });
    if (settled.allowed === null) return { ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE", message: "결제 확인이 지연되고 있어요. 같은 요청을 다시 확인해 주세요." };
    if (settled.allowed) {
      return {
        ok: true,
        auth,
        accessType: settled.source,
        accessSource: String(decision.accessSource || decision.reason || "").trim(),
      };
    }
  }

  // canAccessPaidFeature는 회당 결제(월정석 차감 등)를 판정하지 않고 항상 PAYMENT_REQUIRED를 준다
  // (지속 엔티틀먼트만 확인하는 설계). 결제 직후 발급된 프리미엄 액세스 토큰으로 그 결제를 인정한다.
  const premiumAccessToken = String(body?.premiumAccessToken || "").trim();
  if (premiumAccessToken) {
    const tokenCheck = await verifyPremiumAccessToken(premiumAccessToken, env, {
      userId: auth.userId,
      reportType: DREAM_PSYCHO_REPORT_TYPE,
    });
    if (tokenCheck.ok && String(tokenCheck.payload?.featureKey || "").trim() === DREAM_PSYCHO_FEATURE_KEY) {
      return {
        ok: true,
        auth,
        accessType: "single_payment",
        accessSource: "premium_access_token",
      };
    }
  }

  // A restored request must not depend on a short-lived browser access token.
  if (typeof body.requestId === "string" && body.requestId) {
    const proof = await verifyPerUsePayment(env, { userId: auth.userId, featureKey: DREAM_PSYCHO_FEATURE_KEY, coinPrice: FEATURE_KEY_PRICE_TABLE[DREAM_PSYCHO_FEATURE_KEY].cost, requestId: body.requestId });
    if (proof.proven === true) return { ok: true, auth, accessType: proof.source, accessSource: "saved_payment_proof" };
    if (proof.proven === null) return { ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE", message: "결제 확인이 지연되고 있어요. 같은 요청을 다시 확인해 주세요." };
  }

  return {
    ok: false,
    status: decision?.reason === "LOGIN_REQUIRED" ? 401 : 402,
    code: decision?.reason === "LOGIN_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_REQUIRED",
    message: decision?.reason === "LOGIN_REQUIRED" ? "로그인 후 정신분석 해몽을 이용해 주세요." : "정신분석 해몽 결제 확인이 필요합니다.",
    detail: {
      reason: String(decision?.reason || "PAYMENT_REQUIRED").trim(),
      requiredFeatureKey: DREAM_PSYCHO_FEATURE_KEY,
    },
  };
}

async function handleDreamTarotSelection(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const selection = chooseFallbackDreamCards(normalized.text, body?.cardCount || body?.count || 3, env);
  return json({
    ok: true,
    cached: false,
    ...selection,
    source: "local",
    model: "local-symbol-matcher",
    message: "ok",
  });
}

async function handleDreamPrompt(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  let cards = normalizeDreamPromptCards(body?.cards);
  if (!cards.length) {
    cards = chooseFallbackDreamCards(normalized.text, body?.cardCount || 3, env).cards;
  }
  const dreamThemes = uniqueList(body?.dreamThemes || inferDreamThemes(normalized.text), 5);
  const dreamPrompt = buildDreamTarotConsultPrompt({ dreamText: normalized.text, dreamThemes, cards });

  return json({
    ok: true,
    cached: false,
    dreamPrompt,
    promptText: dreamPrompt,
    source: "local",
    model: "local-prompt-weaver",
    message: "ok",
  });
}


function fallbackMarkdown(dreamText) {
  const compact = dreamText.replace(/\s+/g, " ").trim();
  return [
    "## 핵심 상징",
    `꿈의 반복 소재를 보면 "${compact.slice(0, 160)}" 구간에서 가장 강한 상징이 드러납니다. 이 상징은 현재 삶에서 자주 미루는 문제를 우회적으로 비추는 신호일 가능성이 큽니다.`,
    "상징이 불안하게 느껴졌다면 회피가 아니라 경계 신호로 받아들이는 편이 유리합니다. 지금은 해석보다 기록을 우선해 상징이 어떤 상황에서 재등장하는지 패턴을 모으는 것이 핵심입니다.",
    "특히 사람·장소·시간대가 반복된다면 그 조합이 현재 갈등의 트리거일 수 있습니다. 같은 소재가 다시 나오면 당시 감정 강도를 1~10으로 기록해 변화를 추적해 보세요.",
    "",
    "## 무의식의 갈등",
    "이 꿈은 '원하는 방향'과 '안전하게 머무르려는 본능'의 충돌을 비춥니다. 의식은 전진을 원하지만 무의식은 실패 비용을 크게 계산하는 상태입니다.",
    "갈등이 길어질수록 행동은 느려지고 자기비판이 늘어납니다. 이때 중요한 것은 완벽한 결론이 아니라 작은 실험을 통해 불확실성을 줄이는 방식입니다.",
    "오늘 할 수 있는 가장 작은 행동 하나를 정하고, 그 행동 후의 감정 변화를 기록하면 무의식의 저항이 실제보다 과장되었는지 확인할 수 있습니다.",
    "",
    "## 감정 패턴",
    "감정의 핵심은 불안 그 자체보다 '불안을 통제하지 못할 것 같은 두려움'에 가깝습니다. 그래서 꿈에서 장면이 급변하거나 논리가 끊기는 체감이 생깁니다.",
    "이 패턴은 낮 시간의 과부하와 연결되기 쉽습니다. 할 일을 줄이지 않은 상태에서 회복 시간을 생략하면 꿈에서 감정이 폭주하는 형태로 보상됩니다.",
    "잠들기 30분 전 자극(뉴스, 메시지, 업무)을 줄이고, 메모 5줄로 감정을 외부화하면 꿈의 긴장도가 완만해지는 경우가 많습니다.",
    "",
    "## 현재 삶과 연결",
    "현실에서는 관계·일·자기평가 중 하나에서 경계 설정이 흐려졌을 가능성이 큽니다. 꿈은 그 경계 붕괴를 과장된 이미지로 보여줘 우선순위 재정렬을 요구합니다.",
    "이번 주에는 모든 결정을 한 번에 바꾸기보다, 에너지 소모가 큰 한 지점만 선택해 정리하는 전략이 효과적입니다. 선택과 집중이 불안을 낮춥니다.",
    "특히 반복해서 마음을 빼앗는 주제가 있다면 그것이 현재 무의식의 1순위 과제입니다. 회피하지 말고 일정표에 공식적으로 배치해 '관리 가능한 과제'로 바꾸세요.",
    "",
    "## 7일 실천 가이드",
    "- 1일차: 꿈에서 가장 강한 장면 1개를 문장 3줄로 요약",
    "- 2일차: 그 장면과 닮은 현실 상황 1개를 찾고 감정 점수 기록",
    "- 3일차: 회피 중인 행동을 10분짜리 작업으로 쪼개 실행",
    "- 4일차: 불필요한 약속/업무 1개 취소 또는 위임",
    "- 5일차: 잠들기 전 5분 호흡 + 메모 5줄",
    "- 6일차: 한 주간 감정 점수 변화를 비교",
    "- 7일차: 다음 주에 유지할 습관 1개 확정",
  ].join("\n");
}

function normalizeConsultTone(value) {
  const tone = String(value || "comfort").trim().toLowerCase();
  if (tone === "motivation" || tone === "coaching") return tone;
  return "comfort";
}

function normalizeConsultCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const normalized = list
    .slice(0, 3)
    .map((item, idx) => {
      const name = String(item?.name || item?.card_name || `카드 ${idx + 1}`).trim();
      const orientation = String(item?.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5)
        : [];
      return { name, orientation, keywords };
    })
    .filter((item) => item.name);

  if (!normalized.length) {
    return { ok: false, message: "카드 정보가 필요합니다." };
  }

  return { ok: true, cards: normalized };
}

function consultToneGuide(tone) {
  if (tone === "motivation") {
    return "따뜻하지만 추진력 있는 꿈 상징 해석가처럼 말하고, 꿈이 남긴 에너지를 오늘 움직일 수 있는 작고 선명한 선택으로 내려놓으세요.";
  }
  if (tone === "coaching") {
    return "질문형 리딩 톤으로 말하고, 꿈의 장면, 감정의 잔향, 오늘의 선택을 차례로 짚어 주는 체크포인트를 제시하세요.";
  }
  return "정서적 안정감을 주는 꿈 상징 해석가의 톤으로 말하고, 불안을 키우지 않으면서 마음을 정리하는 작은 회복 행동을 제시하세요.";
}


function fallbackTarotConsultMarkdown({ dreamText, cards }) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const cardLine = cards.map((card) => card.name).join(" · ");
  return [
    "## 꿈의 문을 여는 카드",
    `${cardLine || "오늘의 카드"} 조합은 꿈속 장면("${compact}")이 단순한 잔상이 아니라, 지금 마음이 붙잡고 있는 문을 비추고 있음을 드러냅니다. 이 문은 불안을 키우기 위한 것이 아니라, 아직 이름 붙이지 못한 감정과 필요를 조용히 드러내는 통로에 가깝습니다.`,
    "당장 결론을 내리기보다, 오늘 다룰 수 있는 한 장면만 골라 현실의 작은 행동으로 옮길 때 꿈의 파장이 안정됩니다.",
    "",
    "## 마음 아래 흐르는 감정",
    "지금 감정의 중심에는 두려움 자체보다, 내가 놓치고 싶지 않은 안정과 확인받고 싶은 마음이 함께 흐릅니다. 그래서 생각은 많아지지만, 실제 행동은 늦어지는 패턴이 나타날 수 있습니다.",
    "지금 필요한 것은 완벽한 해답이 아니라, 깨어난 뒤 남은 감정을 사실과 분리해 적어보는 짧은 정리입니다. 감정의 이름을 붙이는 순간 꿈은 막연한 예감이 아니라 나를 돌보는 언어가 됩니다.",
    "",
    "## 오늘의 작은 선택 3가지",
    "- 꿈에서 가장 선명했던 장면 하나를 적고, 그때의 감정을 한 단어로 봉인하기",
    "- 관계나 일에서 미뤄 둔 확인 하나를 오늘 가능한 가장 작은 방식으로 정리하기",
    "- 잠들기 전 5분 동안 조명을 낮추고, 오늘의 감정을 세 문장으로 내려놓기",
    "",
    "## 관계/일/회복의 길",
    "- 관계: 상대의 마음을 단정하기보다, 내가 바라는 안정과 거리감을 먼저 한 문장으로 정리하세요.",
    "- 일/돈: 큰 결정보다 이번 주 부담을 줄이는 작은 실행을 우선하면 흐름이 맑아집니다.",
    "- 회복: 회복 루틴은 길이보다 반복이 중요합니다. 짧은 기록과 호흡만으로도 밤의 파장이 낮아집니다.",
    "",
    "## 봉인 문장",
    "나는 꿈이 남긴 잔향을 오늘의 작고 안전한 선택으로 봉인한다.",
  ].join("\n");
}

function sectionText(markdown, heading) {
  const source = String(markdown || "");
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`##\\s*${escaped}\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const found = source.match(pattern);
  return found ? String(found[1] || "").trim() : "";
}

function firstMeaningfulLine(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => String(line || "").replace(/^[-*]\s*/, "").trim())
    .find(Boolean) || "";
}

function extractActionPlan(markdown) {
  const section = sectionText(markdown, "오늘의 작은 선택 3가지");
  const lines = section
    .split(/\n+/)
    .map((line) => String(line || "").trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  return lines.slice(0, 3);
}

function cleanPromptText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function uniquePromptItems(items, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = cleanPromptText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeDreamPromptContext(context) {
  return (Array.isArray(context) ? context : [])
    .slice(0, 5)
    .map((entry) => {
      const keyword = cleanPromptText(entry?.keyword || entry?.title || entry?.name);
      const meaning = cleanPromptText(entry?.meaning || entry?.summary || entry?.tip || entry?.text);
      if (!keyword && !meaning) return "";
      return keyword && meaning ? `${keyword}: ${meaning}` : (keyword || meaning);
    })
    .filter(Boolean);
}

function collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext) {
  const localKeywords = Array.isArray(localReading?.keywords) ? localReading.keywords : [];
  const cardKeywords = Array.isArray(localReading?.cards)
    ? localReading.cards.map((card) => card?.keyword || card?.energy_keyword || card?.card_name)
    : [];
  const contextKeywords = normalizeDreamPromptContext(dreamLibraryContext).map((line) => line.split(":")[0]);
  const dreamTokens = cleanPromptText(dreamText)
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 5);
  return uniquePromptItems([...localKeywords, ...cardKeywords, ...contextKeywords, ...dreamTokens], 10);
}

function dreamPromptToneLine(tone) {
  if (tone === "motivation") return "문체는 따뜻하지만 힘 있게 흐르고, 사용자가 오늘 바로 붙잡을 수 있는 질문을 남깁니다.";
  if (tone === "coaching") return "문체는 질문을 선명하게 짚는 상담 톤으로 흐르고, 감정과 현실 행동의 경계를 차분히 나눕니다.";
  return "문체는 차분하고 안전하게 흐르며, 불안을 키우는 단정 대신 마음을 정돈하는 문장을 남깁니다.";
}

function buildDreamPromptCards(keywords) {
  return [
    { card_name: "장면 카드", symbol: "🌙", energy_keyword: keywords[0] || "꿈 원문" },
    { card_name: "상징 카드", symbol: "✦", energy_keyword: keywords[1] || "상징 단서" },
    { card_name: "질문 카드", symbol: "🪄", energy_keyword: keywords[2] || "상담 질문" },
  ];
}

function buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext }) {
  const keywordLine = keywords.length ? keywords.slice(0, 8).join(" · ") : "꿈 장면 · 감정 잔향 · 다음 질문";
  const contextLines = normalizeDreamPromptContext(dreamLibraryContext);
  const contextBlock = contextLines.length
    ? contextLines.map((line) => `- ${line}`).join("\n")
    : "- 꿈 원문 안에서 반복되는 장면과 감정의 결을 우선 살핍니다.";

  return [
    "당신은 꿈 상징 해석가입니다.",
    "아래 꿈을 확정 예언으로 몰아가지 말고, 꿈속 장면과 깨어난 뒤의 감정이 어디에 머무는지 전문적인 상담 문장으로 풀어 주세요.",
    dreamPromptToneLine(tone),
    "",
    "[꿈 원문]",
    dreamText,
    "",
    "[핵심 단서]",
    keywordLine,
    "",
    "[상징 참고]",
    contextBlock,
    "",
    "[응답의 그릇]",
    "1. 꿈의 첫빛: 가장 선명한 장면 하나를 고르고, 그 장면이 마음 안에서 어떤 문을 열었는지 드러내 주세요.",
    "2. 감정의 잔향: 깨어난 뒤 남은 감정을 이름 붙이고, 그 감정이 관계·일·회복 중 어디에 기울어 있는지 비춰 주세요.",
    "3. 숨은 상징: 반복되는 존재, 장소, 사물의 상징을 하나의 흐름으로 엮어 주세요.",
    "4. 오늘의 질문: 사용자가 스스로에게 던질 질문 3가지를 부드럽게 남겨 주세요.",
    "5. 작은 의식: 잠들기 전 5분 안에 할 수 있는 기록·호흡·정리 루틴을 제안해 주세요.",
    "6. 봉인 문장: 꿈이 남긴 빛을 오늘의 선택으로 옮기는 한 문장으로 마무리해 주세요.",
    "",
    "[봉인할 경계]",
    "- 죽음, 질병, 임신, 합격, 투자, 이별 여부를 확정하지 마세요.",
    "- 공포를 키우는 경고문이나 운명 단정은 피하세요.",
    "- 제작 과정과 도구 이름은 장막 뒤에 두세요.",
  ].join("\n");
}

function buildDreamPromptRecord({ dreamText, tone, localReading, dreamLibraryContext }) {
  const keywords = collectDreamPromptKeywords(dreamText, localReading, dreamLibraryContext);
  const cards = buildDreamPromptCards(keywords);
  const promptText = buildDreamPromptText({ dreamText, tone, keywords, dreamLibraryContext });
  return {
    id: `dream-prompt-${Date.now()}`,
    kind: "dream_prompt",
    title: "꿈 프롬프트 생성서",
    summary: "꿈의 장면과 감정의 잔향이 ?? ??에게 건넬 질문의 중심으로 모였습니다.",
    stageReadings: {
      scene: "꿈 원문에서 가장 선명한 장면을 먼저 붙잡습니다. 이 장면은 프롬프트의 첫 문을 열고, 상담이 막연한 해몽으로 흩어지지 않도록 중심을 잡습니다.",
      symbol: "반복되는 존재와 감정의 잔향을 함께 묶습니다. 상징은 단독으로 고정되지 않고, 깨어난 뒤 남은 느낌과 함께 프롬프트 안에서 살아납니다.",
      echo: "마지막 장은 ?? ??에게 건넬 질문의 문을 가리킵니다. 관계, 일, 회복 중 어느 문을 열지 정하면 꿈의 언어가 더 또렷하게 흐릅니다.",
    },
    goldenAdvice: "봉인 카드 아래 완성된 프롬프트를 그대로 옮기면, 꿈의 잔향이 상담 가능한 질문으로 열립니다.",
    actionPlan: [
      "꿈 원문을 줄이지 않고 그대로 붙여 넣기",
      "깨어난 뒤 남은 감정을 한 단어로 덧붙이기",
      "관계·일·회복 중 가장 알고 싶은 문 하나 고르기",
    ],
    cards,
    keywords,
    promptText,
    consultingText: promptText,
    usedDreamText: dreamText,
    goldenCardName: "최종 프롬프트",
    goldenCardSymbol: "✶",
    source: "worker/local",
    model: "prompt-maker/local",
    createdAt: new Date().toISOString(),
  };
}

async function handleDreamPromptMaker(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  const tone = normalizeConsultTone(body?.tone);
  const record = buildDreamPromptRecord({
    dreamText: normalized.text,
    tone,
    localReading: body?.localReading || {},
    dreamLibraryContext: body?.dreamLibraryContext || [],
  });
  return json({
    ok: true,
    cached: false,
    record,
    message: "ok",
  });
}

async function handleTarotConsult(request) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const cards = normalizeConsultCards(body?.cards);
  if (!cards.ok) {
    return json({ ok: false, message: cards.message }, { status: 400 });
  }

  const markdown = fallbackTarotConsultMarkdown({ dreamText: normalized.text, cards: cards.cards });
  const formatWarning = true;

  const summary = firstMeaningfulLine(sectionText(markdown, "꿈의 문을 여는 카드"));
  const goldenAdvice = firstMeaningfulLine(sectionText(markdown, "마음 아래 흐르는 감정"));
  const actionPlan = extractActionPlan(markdown);

  return json({
    ok: true,
    cached: false,
    formatWarning,
    record: {
      id: `dream-tarot-consult-${Date.now()}`,
      consultingText: markdown,
      summary,
      goldenAdvice,
      actionPlan,
      source: "local",
      model: "fallback/local",
      createdAt: new Date().toISOString(),
    },
    message: "ok",
  });
}

const PSYCHO_DREAM_REQUIRED_HEADERS = Object.freeze([
  "Chapter 1. 꿈의 장면과 핵심 상징",
  "Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
  "Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
  "Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
  "Chapter 5. 현실 조언과 치유의 방향",
]);

const PSYCHO_DREAM_REQUIRED_PHRASES = Object.freeze([
  "꿈의 핵심 장면 요약",
  "프로이트식 소망 충족 관점",
  "그림자와 아니마/아니무스의 작용",
  "이 꿈이 건네는 신비로운 문장",
  "오늘 할 수 있는 작은 행동",
]);

const PSYCHO_DREAM_POSITIVE_MARKERS = Object.freeze([
  "행복",
  "기쁨",
  "축복",
  "사랑",
  "안도",
  "평온",
  "편안",
  "따뜻",
  "회복",
  "치유",
  "안정",
  "희망",
  "화해",
  "기대",
]);

const PSYCHO_DREAM_HEALING_MARKERS = Object.freeze([
  "위로",
  "돌봄",
  "다정",
  "포근",
  "휴식",
  "숨",
  "정리",
  "부드럽",
  "안식",
  "조율",
]);

const PSYCHO_DREAM_ANXIOUS_MARKERS = Object.freeze([
  "불안",
  "공포",
  "도망",
  "추락",
  "죽음",
  "상실",
  "분노",
  "죄책감",
  "압박",
  "위기",
  "혼란",
  "붕괴",
  "파국",
  "경고",
  "악몽",
]);

const PSYCHO_DREAM_LEAK_MARKERS = Object.freeze([
  /fallback/i,
  /payload/i,
  /json/i,
  /llm/i,
  /api/i,
]);

function cleanPsychoText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function parseJsonCandidate(text) {
  const source = cleanPsychoText(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(cleanPsychoText(fenced[1]));

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = source.indexOf("[");
  const lastBracket = source.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    candidates.push(source.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {}
  }

  return null;
}

function firstPsychoText(values) {
  for (const value of Array.isArray(values) ? values : []) {
    const text = cleanPsychoText(value);
    if (text) return text;
  }
  return "";
}

function countPsychoMarkerHits(text, markers) {
  const source = String(text || "");
  return (Array.isArray(markers) ? markers : []).reduce((count, marker) => {
    if (!marker) return count;
    return count + (source.includes(marker) ? 1 : 0);
  }, 0);
}

function normalizePsychoTone(body, dreamText) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const source = [
    dreamText,
    body?.emotion,
    body?.relationshipContext,
    body?.recurringConcern,
    body?.recentStressContext,
    body?.desiredOutcome,
    intake?.emotionalState,
    intake?.relationshipContext,
    intake?.recurringConcern,
    intake?.recentStressContext,
    intake?.desiredOutcome,
    Array.isArray(body?.peopleInDream) ? body.peopleInDream.join(" ") : body?.peopleInDream,
  ].map((value) => cleanPsychoText(value)).join(" ");

  const happyScore = countPsychoMarkerHits(source, PSYCHO_DREAM_POSITIVE_MARKERS);
  const healingScore = countPsychoMarkerHits(source, PSYCHO_DREAM_HEALING_MARKERS);
  const anxiousScore = countPsychoMarkerHits(source, PSYCHO_DREAM_ANXIOUS_MARKERS);

  let primary = "neutral";
  if (happyScore > 0 || healingScore > 0) {
    if (anxiousScore === 0) {
      primary = happyScore >= healingScore ? "happy" : "healing";
    } else if (anxiousScore > happyScore + healingScore) {
      primary = "anxious";
    } else {
      primary = "mixed";
    }
  } else if (anxiousScore > 0) {
    primary = "anxious";
  }

  const signals = uniqueList([
    ...PSYCHO_DREAM_POSITIVE_MARKERS.filter((marker) => source.includes(marker)),
    ...PSYCHO_DREAM_HEALING_MARKERS.filter((marker) => source.includes(marker)),
    ...PSYCHO_DREAM_ANXIOUS_MARKERS.filter((marker) => source.includes(marker)),
  ], 8);

  return {
    primary,
    signals,
    scores: {
      happy: happyScore,
      healing: healingScore,
      anxious: anxiousScore,
    },
  };
}

/* 정신분석 해몽의 시스템 프롬프트. 예전에는 핸들러 안 인라인이라 관리자 화면이 읽을 수 없었다.
   문자열은 그대로이고 선언 위치만 밖으로 옮겼다(동작 불변). */
const DREAM_PSYCHO_SYSTEM_PROMPT = [
  "당신은 정신분석 해몽가입니다.",
  "말투는 전문적이되 지나치게 기술적이지 않게 유지하고, 꿈의 정서를 먼저 읽으세요.",
  "행복한 꿈은 불안 템플릿으로 밀어 넣지 말고, 긴장된 꿈은 소망과 방어를 균형 있게 다루세요.",
  "전체 리포트는 5장 구조입니다. 이번 호출에서 지정한 부분만 작성하세요.",
  "프로이트·융·영적 상징은 서로 다른 해석 관점이며 임상 진단이나 미래의 사실이 아닙니다. 꿈 밖의 경험·과거사·외상을 지어내거나 질환을 진단하지 마세요.",
].join(" ");

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return DREAM_PSYCHO_SYSTEM_PROMPT;
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   꿈 내용만 있으면 프로덕션과 똑같은 프롬프트가 그대로 조립된다 — 생년 정보가 필요 없다. */
export function buildAdminLabPrompt(body = {}) {
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    throw new Error(normalized.message || "꿈 내용을 입력해 주세요.");
  }

  const tone = normalizePsychoTone(body, normalized.text);

  return {
    systemPrompt: DREAM_PSYCHO_SYSTEM_PROMPT,
    prompt: buildPsychoPrompt(body, normalized.text, tone),
  };
}

function buildPsychoPrompt(body, dreamText, tone) {
  const intake = body?.intake && typeof body.intake === "object" ? body.intake : {};
  const people = Array.isArray(body?.peopleInDream)
    ? uniqueList(body.peopleInDream, 8).join(", ")
    : cleanPsychoText(body?.peopleInDream);
  const places = Array.isArray(body?.placesInDream)
    ? uniqueList(body.placesInDream, 8).join(", ")
    : cleanPsychoText(body?.placesInDream);
  const symbols = Array.isArray(body?.symbolsInDream)
    ? uniqueList(body.symbolsInDream, 8).join(", ")
    : cleanPsychoText(body?.symbolsInDream);

  return [
    "프로이트와 융의 시선을 함께 살려, 꿈의 장면을 다정하고 정밀하게 읽어주세요.",
    "행복한 꿈이라면 불안과 경고를 억지로 덧씌우지 말고, 긴장된 꿈이라면 무의식의 소망과 방어를 균형 있게 비추세요.",
    "",
    "[상담 메타]",
    "- 서비스: 정신분석 해몽",
    "- 출력 형식: Markdown 5장 구조",
    `- 핵심 톤: ${tone.primary}`,
    "- 해석 원칙: 상징을 억지로 과장하지 말고, 꿈이 주는 정서의 결을 먼저 존중하세요.",
    "",
    "[꿈 감정 추정]",
    `- primary: ${tone.primary}`,
    `- signals: ${tone.signals.length ? tone.signals.join(", ") : "없음"}`,
    "",
    "[입력 정보]",
    `- dreamText: ${dreamText}`,
    `- emotion: ${firstPsychoText([body?.emotion, intake.emotionalState])}`,
    `- recurringConcern: ${firstPsychoText([body?.recurringConcern, intake.recurringConcern])}`,
    `- recentStressContext: ${firstPsychoText([body?.recentStressContext, intake.recentStressContext])}`,
    `- desiredOutcome: ${firstPsychoText([body?.desiredOutcome, intake.desiredOutcome])}`,
    `- relationshipContext: ${firstPsychoText([body?.relationshipContext, intake.relationshipContext])}`,
    `- peopleInDream: ${people}`,
    `- placesInDream: ${places}`,
    `- symbolsInDream: ${symbols}`,
    "",
    "[출력 규칙]",
    "- 반드시 아래 다섯 장 제목을 순서대로, 글자 하나도 바꾸지 말고 정확히 그대로 사용하세요:",
    "  ## Chapter 1. 꿈의 장면과 핵심 상징",
    "  ## Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
    "  ## Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
    "  ## Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
    "  ## Chapter 5. 현실 조언과 치유의 방향",
    "- 각 장 안에는 아래 소제목 문구를 정확히 그대로(글자 변경 없이) 한 번씩 포함하고, 그 앞뒤로 자연스러운 해석 문장을 충분히 덧붙이세요:",
    "  · Chapter 1 안에: \"꿈의 핵심 장면 요약\"",
    "  · Chapter 2 안에: \"프로이트식 소망 충족 관점\"",
    "  · Chapter 3 안에: \"그림자와 아니마/아니무스의 작용\"",
    "  · Chapter 4 안에: \"이 꿈이 건네는 신비로운 문장\"",
    "  · Chapter 5 안에: \"오늘 할 수 있는 작은 행동\"",
    "- 각 장 본문은 제목·목차·마크다운·공백 제외 최소 4,000자로 작성하고 전체 20,000자 이상을 충족하세요.",
    "- 결과에는 시스템 메시지, JSON, API, LLM, payload, fallback 같은 말이 섞이지 않게 하세요.",
  ].join("\n");
}

function evaluatePsychoMarkdownQuality(markdown, tone, partial = false) {
  const text = String(markdown || "").trim();
  const warnings = [];

  if (!text) warnings.push("empty_output");
  if (!partial && (text.match(/Chapter\s+\d+\./g) || []).length < 5) warnings.push("chapter_count");

  const missingHeaders = PSYCHO_DREAM_REQUIRED_HEADERS.filter((header) => !text.includes(header));
  if (!partial && missingHeaders.length) warnings.push("missing_headers");

  const missingPhrases = PSYCHO_DREAM_REQUIRED_PHRASES.filter((phrase) => !text.includes(phrase));
  if (!partial && missingPhrases.length) warnings.push("missing_phrases");

  if (PSYCHO_DREAM_LEAK_MARKERS.some((pattern) => pattern.test(text))) warnings.push("system_leak");
  if (countPaidReportBodyChars(text) < (partial ? 2000 : 20000)) warnings.push("too_short");

  const positiveHits = countPsychoMarkerHits(text, PSYCHO_DREAM_POSITIVE_MARKERS);
  const healingHits = countPsychoMarkerHits(text, PSYCHO_DREAM_HEALING_MARKERS);
  const anxiousHits = countPsychoMarkerHits(text, PSYCHO_DREAM_ANXIOUS_MARKERS);
  if ((tone?.primary === "happy" || tone?.primary === "healing" || tone?.primary === "mixed") && anxiousHits >= (partial ? 1 : 2) && positiveHits + healingHits < 2) {
    warnings.push("tone_mismatch");
  }

  return {
    ok: warnings.length === 0,
    warnings,
    positiveHits,
    healingHits,
    anxiousHits,
  };
}

function renderPsychoDelivery(state) {
  const chapters = PSYCHO_DREAM_REQUIRED_HEADERS.map((title, i) => ({ title, body: [state.parts[`chapter-${i + 1}-a`], state.parts[`chapter-${i + 1}-b`]].filter(Boolean).join("\n\n") }));
  const markdown = chapters.filter(chapter => chapter.body).map(chapter => `## ${chapter.title}\n\n### ${PSYCHO_DREAM_REQUIRED_PHRASES[PSYCHO_DREAM_REQUIRED_HEADERS.indexOf(chapter.title)]}\n\n${chapter.body}`).join("\n\n");
  const quality = evaluatePsychoMarkdownQuality(markdown, state.tone);
  return { tone: state.tone, chapters, quality: { ...quality, fallbackUsed: false }, llm: { used: Object.keys(state.parts).length > 0, source: "gemini" },
    record: { id: state.body.requestId, markdown, source: "gemini", createdAt: state.createdAt }, dreamText: state.dreamText, requestId: state.body.requestId };
}
// The route and the server resume task share render and produce.
export function dreamPsychoNarrativeAdapter(env) {
  return {
    reportType: DREAM_PSYCHO_REPORT_TYPE, render: renderPsychoDelivery,
    produce: async (task, state) => {
      const prompt = `${state.prompt}\n[이번 호출]\n${task.prompt}${narrativePriorDigest(state, task)}\n꿈에 없는 사실을 추가하지 마세요. 꿈 장면 요약은 1장에서만 하고, 다른 장은 요약 없이 이번 범위로 바로 들어가세요. 제목·소제목·다른 장·일반적 설명의 반복 없이 본문 ${task.minChars}자 이상, 목표 ${Math.ceil(task.minChars * 1.3)}~${Math.ceil(task.minChars * 1.5)}자(공백·마크다운 제외)를 짧은 문단으로 쓰세요.\nJSON {"evidenceHash":"${state.evidenceHash}","body":"본문"}만 출력하세요.`;
      const ai = await dreamGeminiCaller(env, prompt, { systemPrompt: state.systemPrompt, model: firstDreamPsychoModel(env), temperature: 0.62,
        maxOutputTokens: 9500, thinkingBudget: 0, timeoutMs: Math.min(45000, Math.max(15000, Number(env.DREAM_PSYCHO_PROVIDER_TIMEOUT_MS || env.DREAM_PROVIDER_TIMEOUT_MS) || 45000)), fallbackToWorkersAI: false, responseMimeType: "application/json", responseSchema: NARRATIVE_RESPONSE_SCHEMA });
      if (!ai?.ok || ai.isMock || /mock/i.test(`${ai.provider || ""} ${ai.model || ""}`)) return null;
      const parsed = parseNarrativeResponse(ai.text, state.evidenceHash);
      const value = parsed && { ...parsed, body: stripNarrativeHeadings(parsed.body) };
      if (value?.evidenceHash !== state.evidenceHash || typeof value.body !== "string" || /Chapter\s+\d+\./i.test(value.body) || evaluatePsychoMarkdownQuality(value.body, state.tone, true).warnings.includes("system_leak")) return null;
      return value;
    },
  };
}
async function handlePsychoAnalysis(request, env = {}) {
  const body = request.method === "POST" ? await readJson(request) : {};
  if (request.method === "POST" && !body.resumeResultId) {
    const normalized = normalizeDreamText(body);
    if (!normalized.ok) return json({ ok: false, message: normalized.message }, { status: 400 });
  }
  let auth;
  try { auth = await getOptionalUserFromRequest(request, env, { allowDbFallback: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION }); }
  catch (error) {
    if (isAuthDbInfraError(error)) throw new HttpError(503, "로그인 확인이 지연되고 있어요.", { code: "AUTH_TEMPORARILY_UNAVAILABLE" });
    throw error;
  }
  if (!auth?.userId) throw new HttpError(401, "로그인 후 정신분석 해몽을 이용해 주세요.", { code: "LOGIN_REQUIRED" });
  return runPaidNarrativeDelivery(request, env, auth, body, {
    ...dreamPsychoNarrativeAdapter(env), featureKey: DREAM_PSYCHO_FEATURE_KEY,
    verify: async original => {
      const access = await dreamPsychoAccessVerifier(request, env, original, auth);
      if (!access?.ok) throw new HttpError(Number(access?.status || 402), access?.message || "결제 확인이 필요합니다.", { code: access?.code || "PAYMENT_REQUIRED", detail: { ...access?.detail, requiredFeatureKey: DREAM_PSYCHO_FEATURE_KEY } });
    },
    seed: seedDreamPsychoNarrative,
  });
}
// Shared with the paid-intent task, which seeds a proven intent the same way.
export function seedDreamPsychoNarrative(original) {
  const normalized = normalizeDreamText(original), tone = normalizePsychoTone(original, normalized.text);
  if (!normalized.ok) throw new HttpError(400, normalized.message);
  return { dreamText: normalized.text, tone, createdAt: new Date().toISOString(), minBodyChars: 20000,
    prompt: buildPsychoPrompt(original, normalized.text, tone).split("[출력 규칙]")[0], systemPrompt: DREAM_PSYCHO_SYSTEM_PROMPT,
    tasks: PSYCHO_DREAM_REQUIRED_HEADERS.flatMap((title, i) => ["a", "b"].map(part => ({ id: `chapter-${i + 1}-${part}`, minChars: 1250,
      prompt: `${title} 중 ${part === "a" ? `꿈에 실제 등장한 장면을 근거로 ${PSYCHO_DREAM_REQUIRED_PHRASES[i]}의 관점과 감정 패턴을 해설` : "다른 가능한 해석과 적용되지 않는 조건, 생활 속 사례·성찰 질문·현실적인 작은 행동을 제안"}` }))) };
}

export async function handleDreamRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/dream");
    if (path === "/psycho-result" && request.method === "GET") return await handlePsychoAnalysis(request, env);
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    if (path === "/psycho-analysis") {
      return await handlePsychoAnalysis(request, env);
    }
    if (path === "/dream-tarot") {
      return await handleDreamTarotSelection(request, env);
    }
    if (path === "/dream-prompt") {
      return await handleDreamPrompt(request, env);
    }
    if (path === "/prompt-maker") {
      return await handleDreamPromptMaker(request);
    }
    if (path === "/tarot-consult") {
      return await handleTarotConsult(request, env);
    }
    return notFound();
  } catch (error) {
    if (error.code === "RESULT_STORAGE_UNAVAILABLE") return json({ ok: false, retryable: true, reason: error.code, resultId: error.resultId }, { status: 503 });
    return handleRouteError(error, { request, env });
  }
}
