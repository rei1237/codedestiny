import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getOptionalUserFromRequest } from "../lib/auth.js";
import { connectDb, isTransientMongoError } from "../lib/db.js";
import { RelationshipBoundaryTest } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { callGeminiJsonWithRetry as defaultCallGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { calculateLoveSecretAiSaju, normalizeLoveSecretAiInput } from "../lib/love-secret-ai-calculation.js";
import { EDGE_RESPONSE_DEADLINE_MS, clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { completeServiceExecution, failServiceExecution, startServiceExecution } from "../lib/service-execution-task.js";
import { isStagingLlmMockEnabled } from "../lib/staging-llm-mock.js";

const FEATURE_KEY = "relationship-boundary-test";
const SERVICE_KEY = "relationship-boundary-test";
const ORDER_NAME = "그 사람의 바람끼 테스트";
const COST = 100;
const AMOUNT_KRW = 10000;

const clean = (value, max = 0) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return max ? text.slice(0, max) : text;
};
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const id = () => `rbt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function normalize(body = {}) {
  const target = body.targetInfo && typeof body.targetInfo === "object" ? body.targetInfo : {};
  const normalized = normalizeLoveSecretAiInput({
    myInfo: target,
    relationshipStatus: "상대방 마음이 궁금한 상태",
    topic: "전체 연애 흐름",
    userQuestion: "관계 경계와 외부 자극에 흔들릴 수 있는 경향",
  });
  if (!normalized.ok) return normalized;
  if (target.calendarType === "lunar" && typeof target.isLeapMonth !== "boolean") {
    return { ok: false, message: "음력 입력은 윤달 여부를 함께 확인해 주세요." };
  }
  return { ok: true, targetInfo: { ...normalized.input.myInfo, isLeapMonth: target.calendarType === "lunar" && Boolean(target.isLeapMonth) }, normalized, inputHash: hash(normalized.input.myInfo) };
}

function pricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const current = resolved?.pricing || {};
  if (!resolved?.ok || Number(current.coinPrice || current.cost) !== COST || Number(current.amountKRW) !== AMOUNT_KRW) throw new Error("PRICE_NOT_FOUND");
  return { coinPrice: COST, amountKRW: AMOUNT_KRW, membershipCreditCost: calculateMembershipCreditCost(COST) };
}

function paymentPayload(requestId) {
  const current = pricing();
  return {
    featureKey: FEATURE_KEY, serviceKey: SERVICE_KEY, productId: FEATURE_KEY, productType: FEATURE_KEY,
    reason: ORDER_NAME, title: ORDER_NAME, orderName: ORDER_NAME, cost: current.coinPrice, coinPrice: current.coinPrice,
    amountKRW: current.amountKRW, amountKrw: current.amountKRW, paymentAmount: current.amountKRW,
    membershipCreditCost: current.membershipCreditCost, requestId, idempotencyKey: requestId,
    allowedPaymentModes: ["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"], commonPaidGate: true,
  };
}

function storyDirectionFor(score) {
  if (score <= 30) return { key: "steady", scene: "비가 그친 뒤, 한 사람에게 돌아오는 발걸음", tension: "외부의 호의보다 관계 안의 약속이 먼저 떠오르는 흐름", action: "평소의 신뢰를 말과 행동으로 계속 확인하기" };
  if (score <= 55) return { key: "balanced", scene: "창가에 앉아 들어온 메시지를 잠시 내려놓는 장면", tension: "새로운 설렘은 알아채지만 선을 선택할 여지가 큰 흐름", action: "가벼운 교류의 기준을 서로 미리 말해 두기" };
  if (score <= 75) return { key: "responsive", scene: "도시의 불빛과 익숙한 집 사이에서 잠시 멈춘 장면", tension: "권태나 인정 욕구가 쌓이면 분위기에 마음이 빨리 반응할 수 있는 흐름", action: "지치거나 공허한 순간의 연락·모임 경계를 구체적으로 합의하기" };
  return { key: "porous", scene: "여러 갈래 불빛이 교차하는 밤거리의 선택 장면", tension: "시선과 기회가 많은 자리에서 관계 밖 자극이 크게 느껴질 수 있는 흐름", action: "오해가 생기기 전, 관계의 우선순위와 거절 기준을 분명히 확인하기" };
}

function scoreBoundary(saju = {}, gender = "") {
  const chart = saju.myChart || {};
  const stars = chart.shinsal || chart.specialStars || {};
  const hit = (name) => Number(stars?.[name]?.score || stars?.[name]?.intensity || stars?.[name] || 0);
  const factors = [];
  let score = 28;
  const peach = hit("도화") + hit("taohua") + hit("peachBlossom");
  const red = hit("홍염") + hit("hongyeom");
  if (peach > 0) { score += 20; factors.push("도화 기운이 사람의 시선을 끄는 상황에서 두드러집니다."); }
  if (red > 0) { score += 12; factors.push("홍염 기운이 감정 표현과 분위기 반응을 빠르게 만들 수 있습니다."); }
  const interactions = chart.natalInteractions || {};
  const tension = ["branchClashes", "branchHarms", "branchPunishments"].reduce((sum, key) => sum + (Array.isArray(interactions[key]) ? interactions[key].length : 0), 0);
  if (tension) { score += Math.min(18, tension * 5); factors.push("합충형해의 긴장이 쌓일 때 관계 밖 자극에 시선이 옮겨갈 수 있습니다."); }
  const dominant = clean(chart.reference?.dominantTenGod || chart.dominantTenGod);
  if (/식신|상관|편재|정재/.test(dominant)) { score += 10; factors.push(`${dominant}의 표현·교류 성향은 경계를 분명히 할 때 강점으로 작동합니다.`); }
  if (!factors.length) factors.push("한쪽 기운이 과하게 몰리지 않아, 관계의 약속을 생활 리듬으로 지킬 여지가 있습니다.");
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 65 ? "high" : score >= 43 ? "medium" : "low";
  return { score, grade, scoreFactors: factors.slice(0, 4), storyDirection: storyDirectionFor(score) };
}

function fallback(result) {
  const label = result.grade === "high" ? "경계가 흐려지기 쉬운 구간" : result.grade === "medium" ? "거리 조절이 필요한 구간" : "관계를 안정시키는 구간";
  return {
    character: { title: "약속을 고르는 밤의 주인공", caption: `${result.storyDirection.tension}입니다. 실제 행동이나 외도를 판정하는 이름표는 아닙니다.` },
    summary: `${label}입니다. 이 점수는 실제 행동이나 외도를 판정하지 않고, 관계 밖 자극에 반응하는 경향만 읽습니다.`,
    sections: [
      { title: "프롤로그: 첫 장면", body: `이 명식은 ${result.scoreFactors[0]} 관심을 받는 힘 자체는 잘못이 아닙니다. 다만 어떤 자리에서 선을 어떻게 말로 확인하느냐가 관계의 온도를 가릅니다. 익숙한 관계가 편안해질수록, 사소한 호의도 서로 다른 뜻으로 읽힐 수 있습니다. 이 리포트는 그 장면에서 무엇을 먼저 확인하면 좋은지 살펴봅니다.` },
      { title: "시선이 머무는 이유", body: "관계 밖 자극은 늘 특별한 사건으로 시작하지 않습니다. 피곤한 날의 짧은 공감, 알아봐 주는 말 한마디, 답답한 마음을 대신 설명해 주는 사람이 계기가 되기도 합니다. 이 사람에게 중요한 것은 유혹을 두려워하는 일이 아니라, 마음이 비는 순간을 빨리 알아차리는 일입니다. 평소에 감정을 나눌 통로가 있으면 작은 자극이 과하게 커지는 일을 줄일 수 있습니다." },
      { title: "흔들리는 조건", body: "권태·스트레스·연락 공백이 길어질수록 외부의 가벼운 반응이 크게 느껴질 수 있습니다. 특히 서운함을 바로 말하지 못하고 쌓아 두는 습관이 있다면, 다른 자리의 친절이 더 선명하게 다가올 수 있습니다. 사실 확인을 서두르기보다, 최근 관계에서 비어 있던 대화가 무엇인지 돌아보는 편이 먼저입니다. 감정이 흔들린다는 사실 자체보다 그 다음 선택이 관계의 방향을 만듭니다." },
      { title: "관계를 지키는 힘", body: "이 명식에도 관계를 안정시키는 힘은 분명히 있습니다. 약속을 생활의 리듬으로 만들고, 불편한 순간을 늦지 않게 말하면 그 힘이 더 잘 드러납니다. 서로의 휴식 시간과 친구 관계를 존중하면서도, 오해가 생길 만한 상황의 기준은 미리 맞춰 두는 것이 좋습니다. 신뢰는 확인을 피하는 데서가 아니라, 확인해도 안전하다고 느끼는 대화에서 자랍니다." },
      { title: "에필로그: 현실적인 선택", body: "상대를 감시하거나 시험하지 마세요. 대신 불편했던 장면과 원하는 경계를 한 문장씩 나누고, 서로 지킬 수 있는 연락·만남의 리듬을 합의해 보세요. 모임, 이성 친구, 늦은 연락처럼 민감한 주제는 정답을 강요하기보다 각자가 안전하다고 느끼는 기준을 찾는 것이 중요합니다. 관계를 지키는 가장 현실적인 선택은 의심을 키우는 것이 아니라, 필요한 말을 미루지 않는 것입니다." },
    ],
    finalMessage: "사주는 선택을 대신하지 않습니다. 관계를 지키는 힘은 의심이 아니라, 서로가 이해하는 경계를 꾸준히 확인하는 데서 생깁니다.",
  };
}

// ── 동기 LLM 생성의 시간 예산 ────────────────────────────────────────────────
// 이 라우트는 요청 안에서 생성을 끝내고 응답한다(202+waitUntil 폴링은 9850c890 에서
// 되돌린 방향이다 — 공유 DB 연결의 요청 간 I/O 격리로 결과가 고착됐다).
// 엣지는 100s(EDGE_RESPONSE_DEADLINE_MS)에 요청을 끊으므로 LLM 대기는 그보다 먼저 끝나야 한다.
// 🔴 15,000자를 한 번에 뽑는 24,000토큰 단일 호출은 ~200tok/s 기준 벽시계만 ~120s 라
//    구조적으로 엣지를 넘는다. 그래서 장면 5개 + 프레임 1개를 병렬로 나눠 부른다 —
//    벽시계가 합이 아니라 최댓값이 된다.

/** 요청 시작 기준 LLM 총 예산. 남는 20s 는 결과 저장·실패 시 환불 Mongo 왕복 몫이다. */
const RBT_LLM_BUDGET_MS = 80000;
/** Workers AI 폴백에는 timeoutMs 가 안 걸린다(env.AI.run 에 AbortSignal 없음). 그 몫을 미리 뗀다. */
const RBT_FALLBACK_RESERVE_MS = 12000;
/** 웨이브1 장면 1개 대기 상한. 8,000토큰(≈40s) + TTFT·속도변동 여유. 병렬이라 벽시계는 이 하나. */
const RBT_SECTION_TIMEOUT_MS = 48000;
/** 웨이브2 대기 상한. 48s + 30s = 78s 로 총예산 80s 안에 들어온다. */
const RBT_REPAIR_TIMEOUT_MS = 30000;
/** 이만큼도 안 남았으면 웨이브2를 시작하지 않는다 — 시작해 놓고 잘리면 통째로 버려진다. */
const RBT_REPAIR_MIN_REMAINING_MS = 28000;
/** 이보다 짧게밖에 못 기다리면 호출해도 잘려서 빈손이 된다. */
const RBT_MIN_CALL_MS = 15000;
/** 엣지에 잘려 죽은 `generating` 문서는 이 시간이 지나면 재시도를 막지 않는다. */
const RBT_STALE_GENERATING_MS = EDGE_RESPONSE_DEADLINE_MS + 20000;

const RBT_SECTION_TOKENS = 8000;
const RBT_FRAME_TOKENS = 2000;
const RBT_SECTION_MIN_CHARS = 2000;
/** 폴백 수용 문턱 = 장면 하한 2,000자의 40%. CLAUDE.md 의 fallbackMinChars 관례. */
const RBT_SECTION_FALLBACK_MIN_CHARS = 800;
const MIN_READING_CHARS = 15000;

const readingText = (value, max) => String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);

/**
 * 남은 예산 안에서만 기다린다. 0을 돌려주면 호출부가 그 호출을 건너뛴다.
 * 🔴 clampSyncLlmTimeoutMs 는 0/음수를 받으면 상한 85s 로 되돌아가므로 반드시 그 앞에서 막는다.
 */
function sectionTimeoutMs(deadlineAt, capMs) {
  const budget = deadlineAt - Date.now() - RBT_FALLBACK_RESERVE_MS;
  if (budget < RBT_MIN_CALL_MS) return 0;
  return clampSyncLlmTimeoutMs(Math.min(capMs, budget));
}

/** 문장이 끊긴 꼬리를 잘라낸다(잘린 응답도 분량만 채우면 쓸 수 있게). */
function trimToLastCompleteSentence(text) {
  const value = String(text ?? "");
  const cut = Math.max(value.lastIndexOf("."), value.lastIndexOf("!"), value.lastIndexOf("?"), value.lastIndexOf("다.")) ;
  return cut > 0 ? value.slice(0, cut + 1).trim() : value.trim();
}

/** Workers AI 폴백은 타임아웃이 없다. 예산 밖으로 새지 않게 바깥에서 한 번 더 막는다. */
function withHardTimeout(promise, ms, onTimeout) {
  let timer;
  const guard = new Promise((resolve) => { timer = setTimeout(() => resolve(onTimeout), ms); });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

const SECTION_SPECS = Object.freeze([
  Object.freeze({ title: "프롤로그: 첫 장면", focus: "이 명식이 관계 안에서 서 있는 자리를 한 장면으로 연다. 확정 근거를 쉬운 말로 풀고, 관심을 받는 힘 자체는 잘못이 아니라는 전제를 세운다." }),
  Object.freeze({ title: "시선이 머무는 이유", focus: "관계 밖 자극이 시작되는 일상의 계기를 구체적인 장면으로 쓴다. 사건이 아니라 마음이 비는 순간을 알아차리는 법으로 전개한다." }),
  Object.freeze({ title: "흔들리는 조건", focus: "권태·스트레스·연락 공백처럼 경계가 얇아지는 조건을 계산된 근거에 걸어 설명한다. 사실 확인을 재촉하지 않는다." }),
  Object.freeze({ title: "관계를 지키는 힘", focus: "이 명식이 가진 안정시키는 힘과 그것이 잘 드러나는 생활 리듬을 쓴다. 그대로 말해 볼 수 있는 대화 문장을 따옴표로 제시한다." }),
  Object.freeze({ title: "에필로그: 현실적인 선택", focus: "오늘부터 할 수 있는 합의와 순서를 단계별로 정리한다. 감시·시험·압박이 아닌 방식만 제안한다." }),
]);

const SECTION_TITLES = Object.freeze(SECTION_SPECS.map((spec) => spec.title));

const GUARDRAILS = [
  "당신은 명리학 근거를 심리 스릴러 웹툰의 내레이션처럼 풀어 쓰는 관계 상담가입니다.",
  "제공된 계산 사실 밖의 신살·점수·사건을 만들지 말고, 외도 사실·타인의 마음·관계 결말을 단정하지 마세요.",
  "감시, 압박, 시험, 집착을 조언하지 마세요.",
  "만원 유료 리포트에 맞게 요약을 반복하지 말고, 본문을 충분히 풍부하게 작성하세요. 단순 반복으로 분량을 채우지 마세요.",
];

/** 🔴 6개 프롬프트가 모두 같은 앵커를 봐야 장면들이 한 사람의 이야기로 이어진다. */
function anchors(saju, result, targetGender) {
  return [
    `[확정 점수] ${result.score}/100, 등급=${result.grade}`,
    `[대상자 성별] ${targetGender === "female" ? "여성" : "남성"}`,
    `[점수대 연출] 장면=${result.storyDirection.scene}; 긴장=${result.storyDirection.tension}; 보호 행동=${result.storyDirection.action}`,
    `[확정 근거] ${result.scoreFactors.join(" ")}`,
    `[명식] 일간=${clean(saju.myChart?.dayMaster)} 일주=${clean(saju.myChart?.dayPillar)} 대운=${clean(saju.myChart?.majorLuck?.currentCycle?.pillar, 20)}`,
  ];
}

function buildSectionPrompt(saju, result, targetGender, index) {
  const spec = SECTION_SPECS[index];
  const others = SECTION_TITLES.filter((_, i) => i !== index);
  return [
    ...GUARDRAILS,
    ...anchors(saju, result, targetGender),
    `[이번에 쓸 장면] ${index + 1}장 「${spec.title}」`,
    `[이 장면의 역할] ${spec.focus}`,
    `[다른 장면이 맡은 주제 — 침범하지 마세요] ${others.join(" / ")}`,
    "이 장면의 본문만 3200~4000자로 쓰세요. 제목·번호·머리말·마크다운을 붙이지 말고 본문 문장만 출력합니다. 짧은 문단을 빈 줄로 나눠 8~12개 문단으로 구성하세요.",
  ].join("\n");
}

// 프레임(캐릭터명·요약·마지막 메시지)만 JSON 으로 받는다. 짧아서 잘림 위험이 낮다.
function prompt(saju, result, targetGender) {
  return [
    ...GUARDRAILS,
    "결과는 JSON 하나만 반환하세요.",
    ...anchors(saju, result, targetGender),
    "대상자 성별과 점수대 연출을 참고해, 이 사람만의 재미있는 웹툰 캐릭터명(8~18자)과 소개 한 줄을 새로 지으세요. 고정된 별명이나 유명 인물 이름을 반복하지 마세요. 캐릭터명은 비난·낙인·외도 단정 없이, 선택과 관계의 분위기를 표현해야 합니다.",
    `[본문 다섯 장면이 이미 맡은 주제] ${SECTION_TITLES.join(" / ")}`,
    "summary는 본문 장면을 되풀이하지 말고 6~8문장으로 전체를 꿰어 씁니다. finalMessage는 4~6문장으로 씁니다.",
    JSON.stringify({ character: { title: "웹툰 캐릭터명", caption: "한 문장 소개" }, summary: "6~8문장", finalMessage: "4~6문장" }),
  ].join("\n");
}

/**
 * 스테이징 mock 응답을 유료 결과로 쓸 수 있는지 판정한다.
 *
 * 🔴 스테이징은 LLM 실호출을 막아 둔 환경이다(wrangler.staging.toml 의
 *    APP_ENV=staging + STAGING_LLM_MOCK_ENABLED=true + WORKERS_AI_ENABLED=false).
 *    거기서 lib/llm-client.ts 는 프롬프트에 박힌 JSON 스키마를 그대로 흉내 낸
 *    고정 fixture 를 돌려준다. JSON 모드 fixture 는 모든 문자열이 ~130자짜리
 *    한 문장이라 이 기능의 장면 하한 2,000자를 절대 못 넘는다 — 그래서 스테이징에서는
 *    결제가 끝나도 100% READING_INCOMPLETE 였다. 장면을 산문(JSON 아님)으로 받으면
 *    fixture 가 maxTokens 에 비례한 길이로 와서 하한을 넘긴다.
 * 반대로 프로덕션에서 mock 이 새어 나오면 만원짜리 결과로 fixture 를 저장하게 되므로
 * 그때는 실패로 취급한다(이웃 12개 라우트와 같은 판정).
 */
const mockRejected = (env, response) => (/mock/i.test(String(response?.provider || "")) || /mock/i.test(String(response?.model || "")) || response?.isMock === true) && !isStagingLlmMockEnabled(env);

/** 장면 1개 호출. 실패를 throw 하지 않고 빈 문자열로 돌려 한 장면이 나머지를 죽이지 않게 한다. */
async function callSection(env, call, promptText, timeoutMs, maxTokens) {
  if (!timeoutMs) return "";
  const attempt = Promise.resolve()
    .then(() => call(env, promptText, {
      temperature: 0.72, baseTokens: maxTokens, capTokens: maxTokens, attempts: 1,
      timeoutMs, responseMimeType: "", taskType: "fortune",
      fallbackToWorkersAI: true, fallbackMinChars: RBT_SECTION_FALLBACK_MIN_CHARS,
    }))
    .catch(() => null);
  const response = await withHardTimeout(attempt, timeoutMs + RBT_FALLBACK_RESERVE_MS, null);
  if (!response?.ok || !response.text || mockRejected(env, response)) return "";
  const body = readingText(response.text, 12000);
  return response.truncated ? trimToLastCompleteSentence(body) : body;
}

async function callFrame(env, call, promptText, timeoutMs) {
  if (!timeoutMs) return null;
  const attempt = Promise.resolve()
    .then(() => call(env, promptText, {
      temperature: 0.72, baseTokens: RBT_FRAME_TOKENS, capTokens: RBT_FRAME_TOKENS, attempts: 1,
      timeoutMs, taskType: "fortune", fallbackToWorkersAI: true, fallbackMinChars: 200,
    }))
    .catch(() => null);
  const response = await withHardTimeout(attempt, timeoutMs + RBT_FALLBACK_RESERVE_MS, null);
  if (!response?.ok || !response.text || mockRejected(env, response)) return null;
  try {
    const parsed = JSON.parse(response.text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}

async function generate(saju, boundary, targetGender, env, callGeminiJsonWithRetry = defaultCallGeminiJsonWithRetry, startedAt = Date.now()) {
  const local = fallback(boundary);
  const deadlineAt = startedAt + RBT_LLM_BUDGET_MS;

  // 웨이브1 — 장면 5개 + 프레임 1개를 동시에. 벽시계는 가장 느린 하나다.
  const wave1 = sectionTimeoutMs(deadlineAt, RBT_SECTION_TIMEOUT_MS);
  const [frame, ...bodies] = await Promise.all([
    callFrame(env, callGeminiJsonWithRetry, prompt(saju, boundary, targetGender), wave1),
    ...SECTION_SPECS.map((_, index) => callSection(env, callGeminiJsonWithRetry, buildSectionPrompt(saju, boundary, targetGender, index), wave1, RBT_SECTION_TOKENS)),
  ]);

  const sections = SECTION_SPECS.map((spec, index) => ({ title: spec.title, body: bodies[index] }));
  let resolvedFrame = frame;

  // 웨이브2 — 비었거나 짧은 장면(과 실패한 프레임)만 다시 부른다.
  const shortIndexes = sections.map((section, index) => (section.body.length < RBT_SECTION_MIN_CHARS ? index : -1)).filter((index) => index >= 0);
  const needsFrame = !resolvedFrame || !clean(resolvedFrame.summary);
  if (shortIndexes.length || needsFrame) {
    const remaining = deadlineAt - Date.now();
    const wave2 = remaining >= RBT_REPAIR_MIN_REMAINING_MS ? sectionTimeoutMs(deadlineAt, RBT_REPAIR_TIMEOUT_MS) : 0;
    if (wave2) {
      const [repairedFrame, ...repairedBodies] = await Promise.all([
        needsFrame ? callFrame(env, callGeminiJsonWithRetry, prompt(saju, boundary, targetGender), wave2) : Promise.resolve(resolvedFrame),
        ...shortIndexes.map((index) => callSection(env, callGeminiJsonWithRetry, buildSectionPrompt(saju, boundary, targetGender, index), wave2, RBT_SECTION_TOKENS)),
      ]);
      if (repairedFrame) resolvedFrame = repairedFrame;
      // 실제로 길어졌을 때만 채택한다.
      shortIndexes.forEach((index, order) => { if (repairedBodies[order].length > sections[index].body.length) sections[index].body = repairedBodies[order]; });
    }
  }

  // 유료 결과의 하한은 그대로다. 채우지 못하면 하드코딩 본문으로 대체하지 않고 실패를 알린다.
  const total = sections.reduce((sum, section) => sum + section.body.length, 0);
  if (sections.some((section) => section.body.length < RBT_SECTION_MIN_CHARS) || total < MIN_READING_CHARS) throw new Error("READING_INCOMPLETE");
  const summary = clean(resolvedFrame?.summary, 1000);
  if (!summary) throw new Error("READING_INCOMPLETE");

  const character = resolvedFrame?.character && typeof resolvedFrame.character === "object" ? resolvedFrame.character : {};
  return {
    character: { title: clean(character.title, 40) || local.character.title, caption: clean(character.caption, 300) || local.character.caption },
    summary,
    sections,
    finalMessage: clean(resolvedFrame?.finalMessage, 2000) || local.finalMessage,
  };
}

async function handlePrepare(request, env) {
  const body = await readJson(request); const requestId = clean(body.idempotencyKey || request.headers.get("Idempotency-Key"), 180); const input = normalize(body);
  if (!input.ok || requestId.length < 12) return json({ ok: false, reason: "INVALID_INPUT", message: input.message || "대상자의 생년 정보와 성별을 확인해 주세요." }, { status: 422 });
  try { calculateLoveSecretAiSaju(input.normalized, { mode: "validate" }); } catch { return json({ ok: false, reason: "CALCULATION_FAILED", message: "사주 계산을 준비하지 못했어요. 입력값을 확인해 주세요." }, { status: 422 }); }
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return json({ ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 이용해 주세요." }, { status: 401 });
  return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: paymentPayload(requestId) }, { status: 402 });
}

// ── 결제 차감 복구 ───────────────────────────────────────────────────────────
// 이용권·관리자 통과에는 transactionId 가 없고 차감도 없으므로 되돌릴 것이 없다.
// 형태는 human-design-report.js:230-275 와 같다(같은 verifyPerUsePayment 입력).
const executionKeyOf = (requestId) => `${FEATURE_KEY}:${requestId}`;

async function openRefundableExecution(env, userId, requestId, sessionId, transactionId) {
  if (!transactionId) return;
  await startServiceExecution(env, userId, {
    executionKey: executionKeyOf(requestId), requestId: executionKeyOf(requestId),
    featureKey: FEATURE_KEY, cost: COST, sourceTransactionId: transactionId,
    reportId: sessionId, reportType: FEATURE_KEY, idempotencyKey: requestId,
    metadata: { featureKey: FEATURE_KEY, reportId: sessionId },
  }).catch((error) => { console.warn("[relationship-boundary-test] execution open failed", clean(error?.message || error, 200)); });
}

async function closeExecution(env, userId, requestId, sessionId, transactionId) {
  if (!transactionId) return;
  await completeServiceExecution(env, userId, {
    executionKey: executionKeyOf(requestId), requestId: executionKeyOf(requestId),
    reportId: sessionId, metadata: { featureKey: FEATURE_KEY, reportId: sessionId },
  }).catch((error) => { console.warn("[relationship-boundary-test] execution close failed", clean(error?.message || error, 200)); });
}

async function refundExecution(env, userId, requestId, sessionId, reasonMessage, transactionId) {
  if (!transactionId) return false;
  const result = await failServiceExecution(env, userId, {
    executionKey: executionKeyOf(requestId), requestId: executionKeyOf(requestId),
    reportId: sessionId, reasonCode: "relationship_boundary_test_generation_failed",
    reasonMessage: clean(reasonMessage, 300), failureStage: "generation", forceRefundOnClose: true,
  }).catch((error) => { console.error("[relationship-boundary-test] execution refund failed", clean(error?.message || error, 200)); return null; });
  return Boolean(result);
}

/** 저장 문서에서 화면이 쓰는 것만 내보낸다(userId·targetInfo·paymentId·_id 는 응답에 넣지 않는다). */
const publicResult = (doc) => ({
  ok: true, sessionId: doc.id, score: doc.score, grade: doc.grade, character: doc.character,
  scoreFactors: doc.scoreFactors, summary: doc.summary, sections: doc.sections, finalMessage: doc.finalMessage,
});

/** 엣지에 잘려 죽은 `generating` 문서인가. timestamps:true 의 updatedAt 을 쓴다(스키마 변경 없음). */
function isStaleGenerating(doc) {
  const touchedAt = new Date(doc?.updatedAt || doc?.createdAt || 0).getTime();
  return !Number.isFinite(touchedAt) || Date.now() - touchedAt > RBT_STALE_GENERATING_MS;
}

// `/generate` URL은 클라이언트 계약이다. 이 기능은 웨이브 이어쓰기가 아니라
// 한 번에 장문 리포트를 생성하므로 보안 계층에서는 start 버킷으로 분류한다.
async function handleStart(request, env) {
  // 🔴 LLM 예산의 기준점은 핸들러 진입 시각이다. 인증·결제확인·DB 왕복이 느린 날
  //    생성까지 예산을 온전히 주면 합계가 엣지 한계를 넘는다.
  const requestStartedAt = Date.now();
  const body = await readJson(request); const requestId = clean(body.idempotencyKey || request.headers.get("Idempotency-Key"), 180); const input = normalize(body);
  if (!input.ok || requestId.length < 12) return json({ ok: false, reason: "INVALID_INPUT", message: input.message || "입력 정보를 확인해 주세요." }, { status: 422 });
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return json({ ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 이용해 주세요." }, { status: 401 });
  const proof = await verifyPerUsePayment(env, { userId: auth.userId, featureKey: FEATURE_KEY, coinPrice: COST, requestId });
  if (proof.proven === null) return json({ ok: false, reason: "DB_DEGRADED", retryable: true, message: "결제 확인이 지연되고 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  if (!proof.proven) return json({ ok: false, reason: "PAYMENT_REQUIRED", message: "결제 또는 이용권 확인이 필요합니다." }, { status: 402 });

  await connectDb(env);
  const userId = clean(auth.userId);
  const existing = await RelationshipBoundaryTest.findOne({ userId, idempotencyKey: requestId }).lean();
  if (existing?.status === "completed") return json(publicResult(existing));
  // 같은 결제 키로 다른 대상자를 보내는 것은 한 번의 결제로 두 결과를 받는 길이다.
  if (existing && existing.inputHash && existing.inputHash !== input.inputHash) {
    return json({ ok: false, reason: "INPUT_MISMATCH", message: "이 결제 건에는 다른 대상자 정보가 저장돼 있어요. 새로 시작해 주세요." }, { status: 409 });
  }
  // 아직 살아 있는 생성은 중복 실행하지 않는다. 잘려 죽은 세션은 재시도를 막지 않는다.
  if (existing?.status === "generating" && !isStaleGenerating(existing)) {
    return json({ ok: false, reason: "GENERATING", sessionId: existing.id, retryable: true, message: "결과를 작성하고 있어요. 잠시만 기다려 주세요." }, { status: 202 });
  }

  let saju; try { saju = calculateLoveSecretAiSaju(input.normalized); } catch { return json({ ok: false, reason: "CALCULATION_FAILED", message: "사주 계산을 완료하지 못했어요." }, { status: 422 }); }
  const boundary = scoreBoundary(saju);
  const sessionId = existing?.id || id();
  const base = {
    id: sessionId, userId, targetInfo: input.targetInfo, inputHash: input.inputHash,
    accessType: proof.source || "paid", paymentId: proof.transactionId || "",
    ...boundary, sajuFacts: { dayMaster: saju.myChart?.dayMaster, dayPillar: saju.myChart?.dayPillar },
  };
  // 🔴 생성 전에 문서를 남긴다. 엣지가 요청을 끊어도 회수할 기록이 남고,
  //    스키마 required(score·grade·character)는 채점 결과와 폴백 캐릭터로 선충전한다.
  await RelationshipBoundaryTest.findOneAndUpdate(
    { userId, idempotencyKey: requestId },
    { $set: { ...base, character: existing?.character || fallback(boundary).character, status: "generating", generationError: null } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  await openRefundableExecution(env, userId, requestId, sessionId, proof.transactionId);

  let content;
  try {
    content = await generate(saju, boundary, input.targetInfo.gender, env, defaultCallGeminiJsonWithRetry, requestStartedAt);
  } catch (error) {
    const reason = clean(error?.message || error, 300);
    await RelationshipBoundaryTest.updateOne({ userId, idempotencyKey: requestId }, { $set: { status: "generation_failed", generationError: { reason, at: new Date() } } }).catch(() => {});
    const refunded = await refundExecution(env, userId, requestId, sessionId, reason, proof.transactionId);
    return json({
      ok: false, reason: "GENERATION_FAILED", retryable: true, sessionId, refunded,
      message: refunded
        ? "결과를 작성하지 못해 결제를 되돌렸어요. 잠시 후 다시 시도해 주세요."
        : "결과를 작성하지 못했어요. 결제는 그대로 남아 있으니 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }

  const doc = await RelationshipBoundaryTest.findOneAndUpdate({ userId, idempotencyKey: requestId }, { $set: { ...base, ...content, status: "completed", generationError: null } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  await closeExecution(env, userId, requestId, sessionId, proof.transactionId);
  return json(publicResult(doc));
}

async function handleResult(request, env) {
  const sessionId = clean(new URL(request.url).searchParams.get("sessionId"), 120); const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return json({ ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 이용해 주세요." }, { status: 401 });
  await connectDb(env); const doc = await RelationshipBoundaryTest.findOne({ id: sessionId, userId: clean(auth.userId) }).lean();
  if (!doc) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: "결과를 찾지 못했어요." }, { status: 404 });
  // 폴링이 수렴하려면 완료 외의 상태도 구분해서 알려야 한다.
  if (doc.status === "generation_failed") return json({ ok: false, reason: "GENERATION_FAILED", retryable: true, sessionId: doc.id, message: "결과를 작성하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  if (doc.status !== "completed") {
    if (isStaleGenerating(doc)) return json({ ok: false, reason: "GENERATION_FAILED", retryable: true, sessionId: doc.id, message: "결과 작성이 중단됐어요. 다시 시도해 주세요." }, { status: 503 });
    return json({ ok: false, reason: "GENERATING", retryable: true, sessionId: doc.id, message: "결과를 작성하고 있어요." }, { status: 202 });
  }
  return json(publicResult(doc));
}

export async function handleRelationshipBoundaryTestRoutes(request, env = {}) {
  // 🔴 await 없이 반환하면 핸들러 예외가 이 try/catch 를 지나쳐 최상위로 샌다
  //    (그러면 DB_DEGRADED 판정도 못 하고 비-JSON 응답이 될 수 있다).
  try { const path = getRoutePath(request, "/api/relationship-boundary-test"); if (request.method === "POST" && path === "/prepare") return await handlePrepare(request, env); if (request.method === "POST" && path === "/generate") return await handleStart(request, env); if (request.method === "GET" && path === "/result") return await handleResult(request, env); return ["GET", "POST"].includes(request.method) ? notFound() : methodNotAllowed(); }
  catch (error) { if (isTransientMongoError(error)) return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요." }, { status: 503 }); console.error("[relationship-boundary-test]", clean(error?.message || error, 300)); return json({ ok: false, reason: "SERVER_ERROR", message: "결과를 준비하는 중 문제가 생겼어요." }, { status: 500 }); }
}

export const __relationshipBoundaryTestTestUtils = { normalize, scoreBoundary, storyDirectionFor, prompt, buildSectionPrompt, SECTION_SPECS, SECTION_TITLES, paymentPayload, generate, MIN_READING_CHARS, RBT_SECTION_MIN_CHARS, RBT_SECTION_TOKENS, RBT_LLM_BUDGET_MS };
