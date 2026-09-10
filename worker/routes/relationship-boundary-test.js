import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getOptionalUserFromRequest } from "../lib/auth.js";
import { connectDb, isTransientMongoError } from "../lib/db.js";
import { RelationshipBoundaryTest } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { calculateLoveSecretAiSaju, normalizeLoveSecretAiInput } from "../lib/love-secret-ai-calculation.js";

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

function prompt(saju, result, targetGender) {
  return [
    "당신은 명리학 근거를 심리 스릴러 웹툰의 내레이션처럼 풀어 쓰는 관계 상담가입니다.",
    "제공된 계산 사실 밖의 신살·점수·사건을 만들지 말고, 외도 사실·타인의 마음·관계 결말을 단정하지 마세요.",
    "감시, 압박, 시험, 집착을 조언하지 마세요. 결과는 JSON 하나만 반환하세요.",
    `[확정 점수] ${result.score}/100, 등급=${result.grade}`,
    `[대상자 성별] ${targetGender === "female" ? "여성" : "남성"}`,
    `[점수대 연출] 장면=${result.storyDirection.scene}; 긴장=${result.storyDirection.tension}; 보호 행동=${result.storyDirection.action}`,
    "대상자 성별과 점수대 연출을 참고해, 이 사람만의 재미있는 웹툰 캐릭터명(8~18자)과 소개 한 줄을 새로 지으세요. 고정된 별명이나 유명 인물 이름을 반복하지 마세요. 캐릭터명은 비난·낙인·외도 단정 없이, 선택과 관계의 분위기를 표현해야 합니다.",
    `[확정 근거] ${result.scoreFactors.join(" ")}`,
    `[명식] 일간=${clean(saju.myChart?.dayMaster)} 일주=${clean(saju.myChart?.dayPillar)} 대운=${clean(saju.myChart?.majorLuck?.currentCycle?.pillar, 20)}`,
    "만원 유료 리포트에 맞게 요약을 반복하지 말고, 전체 본문을 충분히 풍부하게 작성하세요. summary는 6~8문장으로 쓰고, 다섯 장면의 body 합계는 공백 포함 최소 15000자 이상으로 씁니다. 각 장면은 3200~4000자로 구성하며 짧은 문단을 빈 줄로 나눕니다. 계산 근거의 쉬운 설명, 일상 장면, 강점과 주의점, 대화 예시, 단계별 행동을 서로 중복하지 않게 전개하세요. 단순 반복으로 분량을 채우지 마세요. finalMessage는 4~6문장으로 씁니다.",
    JSON.stringify({ character: { title: "웹툰 캐릭터명", caption: "한 문장 소개" }, summary: "6~8문장", sections: [{ title: "프롤로그: 첫 장면", body: "3200~4000자, 빈 줄로 구분한 8~12개 문단" }, { title: "시선이 머무는 이유", body: "3200~4000자, 빈 줄로 구분한 8~12개 문단" }, { title: "흔들리는 조건", body: "3200~4000자, 빈 줄로 구분한 8~12개 문단" }, { title: "관계를 지키는 힘", body: "3200~4000자, 빈 줄로 구분한 8~12개 문단" }, { title: "에필로그: 현실적인 선택", body: "3200~4000자, 빈 줄로 구분한 8~12개 문단" }], finalMessage: "4~6문장" }),
  ].join("\n");
}

const MIN_READING_CHARS = 15000;
const readingText = (value, max) => String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);

async function generate(saju, boundary, targetGender, env, callModel = callGeminiJsonWithRetry) {
  const local = fallback(boundary);
  const response = await callModel(env, prompt(saju, boundary, targetGender), { temperature: 0.72, baseTokens: 24000, capTokens: 32000, attempts: 3, fallbackToWorkersAI: true, fallbackMinChars: MIN_READING_CHARS });
  if (!response?.ok || response.truncated || !response.text) throw new Error("READING_INCOMPLETE");
  const parsed = JSON.parse(response.text);
  if (!parsed || typeof parsed !== "object" || !clean(parsed.summary) || !Array.isArray(parsed.sections)) throw new Error("READING_INCOMPLETE");
  const sections = parsed.sections.map((item) => ({ title: clean(item?.title, 80), body: readingText(item?.body, 12000) })).filter((item) => item.title && item.body).slice(0, 5);
  if (sections.length !== 5 || sections.some((section) => section.body.length < 2000) || sections.reduce((total, section) => total + section.body.length, 0) < MIN_READING_CHARS) throw new Error("READING_INCOMPLETE");
  const character = parsed.character && typeof parsed.character === "object" ? parsed.character : {};
  return { character: { title: clean(character.title, 40) || local.character.title, caption: clean(character.caption, 300) || local.character.caption }, summary: clean(parsed.summary, 1000), sections, finalMessage: clean(parsed.finalMessage, 2000) || local.finalMessage };
}

async function handlePrepare(request, env) {
  const body = await readJson(request); const requestId = clean(body.idempotencyKey || request.headers.get("Idempotency-Key"), 180); const input = normalize(body);
  if (!input.ok || requestId.length < 12) return json({ ok: false, reason: "INVALID_INPUT", message: input.message || "대상자의 생년 정보와 성별을 확인해 주세요." }, { status: 422 });
  try { calculateLoveSecretAiSaju(input.normalized, { mode: "validate" }); } catch { return json({ ok: false, reason: "CALCULATION_FAILED", message: "사주 계산을 준비하지 못했어요. 입력값을 확인해 주세요." }, { status: 422 }); }
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return json({ ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 이용해 주세요." }, { status: 401 });
  return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: paymentPayload(requestId) }, { status: 402 });
}

// `/generate` URL은 클라이언트 계약이다. 이 기능은 웨이브 이어쓰기가 아니라
// 한 번에 장문 리포트를 생성하므로 보안 계층에서는 start 버킷으로 분류한다.
async function handleStart(request, env) {
  const body = await readJson(request); const requestId = clean(body.idempotencyKey || request.headers.get("Idempotency-Key"), 180); const input = normalize(body);
  if (!input.ok || requestId.length < 12) return json({ ok: false, reason: "INVALID_INPUT", message: input.message || "입력 정보를 확인해 주세요." }, { status: 422 });
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return json({ ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 이용해 주세요." }, { status: 401 });
  const proof = await verifyPerUsePayment(env, { userId: auth.userId, featureKey: FEATURE_KEY, coinPrice: COST, requestId });
  if (proof.proven === null) return json({ ok: false, reason: "DB_DEGRADED", retryable: true, message: "결제 확인이 지연되고 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  if (!proof.proven) return json({ ok: false, reason: "PAYMENT_REQUIRED", message: "결제 또는 이용권 확인이 필요합니다." }, { status: 402 });
  await connectDb(env);
  const existing = await RelationshipBoundaryTest.findOne({ userId: clean(auth.userId), idempotencyKey: requestId }).lean();
  if (existing?.status === "completed") return json({ ok: true, sessionId: existing.id, ...existing });
  let saju; try { saju = calculateLoveSecretAiSaju(input.normalized); } catch { return json({ ok: false, reason: "CALCULATION_FAILED", message: "사주 계산을 완료하지 못했어요." }, { status: 422 }); }
  const boundary = scoreBoundary(saju); const content = await generate(saju, boundary, input.targetInfo.gender, env); const sessionId = existing?.id || id();
  const doc = await RelationshipBoundaryTest.findOneAndUpdate({ userId: clean(auth.userId), idempotencyKey: requestId }, { $set: { id: sessionId, userId: clean(auth.userId), targetInfo: input.targetInfo, inputHash: input.inputHash, accessType: proof.source || "paid", paymentId: proof.transactionId || "", ...boundary, ...content, sajuFacts: { dayMaster: saju.myChart?.dayMaster, dayPillar: saju.myChart?.dayPillar }, status: "completed", generationError: null } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  return json({ ok: true, sessionId: doc.id, score: doc.score, grade: doc.grade, character: doc.character, scoreFactors: doc.scoreFactors, summary: doc.summary, sections: doc.sections, finalMessage: doc.finalMessage });
}

async function handleResult(request, env) {
  const sessionId = clean(new URL(request.url).searchParams.get("sessionId"), 120); const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return json({ ok: false, reason: "LOGIN_REQUIRED", message: "로그인 후 이용해 주세요." }, { status: 401 });
  await connectDb(env); const doc = await RelationshipBoundaryTest.findOne({ id: sessionId, userId: clean(auth.userId) }).lean();
  if (!doc) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: "결과를 찾지 못했어요." }, { status: 404 });
  return json({ ok: true, sessionId: doc.id, score: doc.score, grade: doc.grade, character: doc.character, scoreFactors: doc.scoreFactors, summary: doc.summary, sections: doc.sections, finalMessage: doc.finalMessage });
}

export async function handleRelationshipBoundaryTestRoutes(request, env = {}) {
  try { const path = getRoutePath(request, "/api/relationship-boundary-test"); if (request.method === "POST" && path === "/prepare") return handlePrepare(request, env); if (request.method === "POST" && path === "/generate") return handleStart(request, env); if (request.method === "GET" && path === "/result") return handleResult(request, env); return ["GET", "POST"].includes(request.method) ? notFound() : methodNotAllowed(); }
  catch (error) { if (isTransientMongoError(error)) return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요." }, { status: 503 }); console.error("[relationship-boundary-test]", clean(error?.message || error, 300)); return json({ ok: false, reason: "SERVER_ERROR", message: "결과를 준비하는 중 문제가 생겼어요." }, { status: 500 }); }
}

export const __relationshipBoundaryTestTestUtils = { normalize, scoreBoundary, storyDirectionFor, prompt, paymentPayload, generate, MIN_READING_CHARS };
