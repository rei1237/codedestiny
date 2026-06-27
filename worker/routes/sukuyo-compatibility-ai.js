import { Lunar, Solar } from "lunar-javascript";
import { requireAuth } from "../lib/auth.js";
import { connectDb } from "../lib/db.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, SukuyoCompatibilityAiConsultation, User } from "../lib/models.js";
import { buildSukuyoAiCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-ai-calculation.js";
import { callGeminiText } from "../lib/gemini.js";

const FEATURE_KEY = "sukuyo-compatibility-ai";
const TITLE = "숙요점 궁합 AI 상담";
const AMOUNT_KRW = 49000;
const COIN_PRICE = 490;
const TOKEN_TTL_MS = 20 * 60 * 1000;
const startLocks = new Map();

const RELATIONSHIP_TYPES = new Set(["연인", "썸", "부부", "재회", "짝사랑", "비즈니스 파트너", "친구", "가족"]);
const TOPICS = new Set([
  "전체 궁합",
  "연애 궁합",
  "결혼 가능성",
  "재회 가능성",
  "갈등 원인",
  "속궁합/정서적 친밀감",
  "장기 관계 가능성",
  "상대의 마음",
  "관계 유지 전략",
]);
const FORBIDDEN_RESULT_PATTERNS = [/PDF/gi, /챕터/g, /chapter/gi, /progress/gi, /job/gi, /프롬프트/g, /시스템/g];

const MESSAGES = {
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "숙요점 궁합 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "두 사람의 생년월일과 관계 정보를 다시 확인해 주세요.",
  calculationFailed: "숙요점 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  llmFailed: "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
};

const SYSTEM_PROMPT = [
  "당신은 숙요점 궁합을 상담하는 최고 수준의 동양 점성술 상담가입니다.",
  "",
  "사용자 A와 사용자 B의 생년월일, 성별, 양력/음력 정보, 관계 유형, 상담 주제, 그리고 계산된 27숙과 숙요점 관계 유형을 바탕으로 궁합을 상담형으로 해석합니다.",
  "",
  "반드시 지켜야 할 원칙:",
  "1. PDF 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 말하듯 자연스럽게 답변합니다.",
  "2. 숙요점의 27숙, 관계 유형, 거리 개념을 정확하게 반영합니다.",
  "3. 명, 업태, 영친, 우쇠, 안괴, 위성/성위 관계를 단순한 길흉으로만 말하지 말고 관계 심리로 풀어냅니다.",
  "4. 좋다/나쁘다로 단정하지 말고, 관계가 어떤 방식으로 끌리고 어떤 방식으로 상처를 주는지 설명합니다.",
  "5. 연애, 결혼, 재회, 갈등, 장기 관계 가능성을 현실적으로 상담합니다.",
  "6. 불안감을 조장하지 않습니다.",
  "7. 상대방의 마음을 확정적으로 단정하지 않습니다.",
  "8. 운세를 절대적 예언처럼 말하지 않습니다.",
  "9. 같은 문장을 반복하지 않습니다.",
  "10. AI, 프롬프트, 시스템, PDF, 챕터 같은 표현을 결과에 노출하지 않습니다.",
  "11. 사용자가 입력한 관계 유형과 상담 주제를 가장 깊게 다룹니다.",
  "12. 마지막에는 사용자가 추가 질문을 할 수 있도록 자연스럽게 상담을 이어갑니다.",
].join("\n");

function clean(value, max = 0) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return max > 0 ? text.slice(0, max) : text;
}

function normalizeId(value) {
  return clean(value, 180).replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function normalizeGender(value) {
  const token = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(token)) return "female";
  if (["other", "기타", "비공개", "unknown"].includes(token)) return token === "unknown" ? "" : "other";
  return token ? clean(value, 40) : "";
}

function normalizeCalendarType(value) {
  const token = clean(value).toLowerCase();
  if (token.includes("lunar") || token.includes("음력")) return "lunar";
  return "solar";
}

function parseBirthDate(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day, raw };
}

function normalizeBirthTime(value) {
  const raw = clean(value);
  if (!raw) return "";
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw) ? raw : "";
}

function normalizePerson(value = {}, fallbackName) {
  const source = value && typeof value === "object" ? value : {};
  const birthDate = parseBirthDate(source.birthDate);
  return {
    name: clean(source.name || source.nickname || fallbackName, 80),
    gender: normalizeGender(source.gender),
    birthDate: birthDate?.raw || "",
    birthParts: birthDate,
    birthTime: normalizeBirthTime(source.birthTime),
    calendarType: normalizeCalendarType(source.calendarType),
    isLeapMonth: source.isLeapMonth === true || clean(source.calendarType).toLowerCase().includes("leap") || clean(source.calendarType).includes("윤달"),
  };
}

function normalizeInput(body = {}) {
  const personA = normalizePerson(body.personA || body.self || body.user || {}, "나");
  const personB = normalizePerson(body.personB || body.partner || {}, "상대");
  const relationshipType = clean(body.relationshipType || body.relationType || body.category, 80);
  const topic = clean(body.topic || body.consultationTopic || body.questionTopic, 80);
  const question = clean(body.question || body.message || body.consultationQuestion || "", 1200);
  const errors = [];
  if (!personA.birthParts) errors.push("personA.birthDate");
  if (!personB.birthParts) errors.push("personB.birthDate");
  if (!RELATIONSHIP_TYPES.has(relationshipType)) errors.push("relationshipType");
  if (!TOPICS.has(topic)) errors.push("topic");
  return { ok: errors.length === 0, errors, personA, personB, relationshipType, topic, question };
}

function lunarForPerson(person) {
  const { year, month, day } = person.birthParts || {};
  if (!year || !month || !day) throw Object.assign(new Error("INVALID_BIRTH_DATE"), { code: "INVALID_INPUT" });
  if (person.calendarType === "lunar") {
    const lunarMonth = person.isLeapMonth ? -Math.abs(month) : Math.abs(month);
    Lunar.fromYmd(year, lunarMonth, day);
    return { lunarYear: year, lunarMonth: month, lunarDay: day, isLeapMonth: person.isLeapMonth, source: "user-lunar-input" };
  }
  const [hour, minute] = person.birthTime ? person.birthTime.split(":").map(Number) : [12, 0];
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function calculatePersonSukuyo(person, label) {
  try {
    const lunar = lunarForPerson(person);
    const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
      isLeapMonth: lunar.isLeapMonth,
      source: lunar.source,
    });
    if (!sukuyo) throw new Error("SUKUYO_EMPTY");
    return { ...sukuyo, lunarYear: lunar.lunarYear };
  } catch (error) {
    console.warn("[sukuyo-compatibility-ai] calculation failed", {
      label,
      birthDate: person.birthDate,
      calendarType: person.calendarType,
      isLeapMonth: person.isLeapMonth,
      error: clean(error?.message || error),
    });
    throw Object.assign(new Error(MESSAGES.calculationFailed), { code: "CALCULATION_FAILED", status: 422 });
  }
}

function normalizeDistance(compatibility = {}) {
  const label = clean(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel);
  const tier = clean(compatibility.distanceMetrics?.tier).toLowerCase();
  if (tier === "near" || label.includes("근")) return "near";
  if (tier === "middle" || label.includes("중")) return "middle";
  if (tier === "far" || label.includes("원")) return "far";
  return "";
}

function shukuName(sukuyo = {}) {
  const name = clean(sukuyo.nameKo || sukuyo.name || "");
  return name ? `${name}숙` : "";
}

function calculateSukuyo(input) {
  const personASukuyo = calculatePersonSukuyo(input.personA, "personA");
  const personBSukuyo = calculatePersonSukuyo(input.personB, "personB");
  const compatibility = buildSukuyoAiCompatibility(personASukuyo, personBSukuyo);
  const relationType = clean(compatibility.relationType || "명");
  return {
    personASukuyo,
    personBSukuyo,
    compatibility,
    sukuyoResult: {
      personAShuku: shukuName(personASukuyo),
      personBShuku: shukuName(personBSukuyo),
      relationType,
      distance: normalizeDistance(compatibility),
      distanceLabel: clean(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel),
      direction: [compatibility.directionFromAToB, compatibility.directionFromBToA].map(clean).filter(Boolean).join(" / "),
      forwardDistance: Number.isFinite(Number(compatibility.forwardDistance)) ? Number(compatibility.forwardDistance) : null,
      reverseDistance: Number.isFinite(Number(compatibility.reverseDistance)) ? Number(compatibility.reverseDistance) : null,
    },
  };
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToText(value) {
  const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (String(value || "").length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function sha256Text(text) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", textToBytes(text))));
}

function tokenSecret(env = {}) {
  return clean(env.SUKUYO_COMPAT_AI_ACCESS_SECRET || env.JWT_ACCESS_SECRET || env.AUTH_SECRET || "dev-sukuyo-compat-ai-secret");
}

async function signTokenPayload(env, payload) {
  const body = bytesToBase64Url(textToBytes(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", textToBytes(tokenSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textToBytes(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(env, token) {
  try {
    const [body, signature] = clean(token).split(".");
    if (!body || !signature) return null;
    const parsed = JSON.parse(base64UrlToText(body));
    const expected = await signTokenPayload(env, parsed);
    if (expected !== `${body}.${signature}`) return null;
    if (Number(parsed.exp || 0) < Date.now()) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

async function inputHash(input) {
  return sha256Text(JSON.stringify({
    personA: input.personA,
    personB: input.personB,
    relationshipType: input.relationshipType,
    topic: input.topic,
  }));
}

function mapAccessType(decision = {}, user = {}) {
  if (clean(user.role).toLowerCase() === "admin") return "admin";
  const source = clean(decision.accessSource).toLowerCase();
  const reason = clean(decision.reason).toLowerCase();
  const license = clean(decision.licenseType).toLowerCase();
  if (source.includes("monthly") || license.includes("monthly") || reason.includes("monthly")) return "subscription";
  if (source.includes("paid") || license.includes("single") || reason.includes("already_purchased")) return "paid";
  return "pass";
}

function buildPaymentPayload(idempotencyKey) {
  return {
    provider: "PORTONE_V2",
    featureKey: FEATURE_KEY,
    title: TITLE,
    reason: TITLE,
    orderName: TITLE,
    amountKRW: AMOUNT_KRW,
    coinPrice: COIN_PRICE,
    currency: "KRW",
    allowedPaymentModes: ["pass", "monthly", "direct"],
    membershipCreditCost: COIN_PRICE * 10,
    requestId: idempotencyKey,
    idempotencyKey,
    checkoutEndpoint: "/api/billing/checkout",
    confirmEndpoint: "/api/billing/confirm",
    runtimeGate: {
      title: TITLE,
      reason: TITLE,
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      serviceKey: FEATURE_KEY,
      cost: COIN_PRICE,
      coinPrice: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
      amountKrw: AMOUNT_KRW,
      allowedPaymentModes: ["pass", "monthly", "direct"],
      membershipCreditCost: COIN_PRICE * 10,
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

async function resolveUser(auth, env) {
  await connectDb(env);
  return User.findById(auth.userId).select("role").lean();
}

function paymentIdFromBody(body = {}) {
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : {};
  return clean(
    body.paymentId
      || body.transactionId
      || body.purchaseId
      || body.ledgerId
      || body.impUid
      || body.merchantUid
      || payment.paymentId
      || payment.impUid
      || payment.merchantUid
      || accessGrant.paymentId
      || accessGrant.purchaseId
      || accessGrant.transactionId
      || accessGrant.ledgerId
      || accessGrant.evidenceId
      || consume.paymentId
      || consume.purchaseId
      || consume.transactionId
      || consume.ledgerId,
    160,
  );
}

async function hasPaidPayment(env, auth, paymentId) {
  if (!paymentId) return false;
  await connectDb(env);
  const payment = await Payment.exists({
    userId: auth.userId,
    $or: [
      { impUid: paymentId },
      { merchantUid: paymentId },
      { requestId: paymentId },
      { idempotencyKey: paymentId },
    ],
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    status: { $in: ["paid", "success", "fulfilled"] },
  });
  return Boolean(payment);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = clean(value, 180);
    if (id) ids.add(id);
  };
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : {};
  const sources = [
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.ledgerId,
    body.requestId,
    body.idempotencyKey,
    body.orderId,
    payment.paymentId,
    payment.impUid,
    payment.merchantUid,
    payment.transactionId,
    payment.purchaseId,
    payment.requestId,
    accessGrant.paymentId,
    accessGrant.purchaseId,
    accessGrant.transactionId,
    accessGrant.ledgerId,
    accessGrant.evidenceId,
    accessGrant.requestId,
    consume.paymentId,
    consume.purchaseId,
    consume.transactionId,
    consume.ledgerId,
    consume.evidenceId,
    consume.requestId,
  ];
  sources.forEach(add);
  return [...ids];
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}

function buildPointHistoryEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
      { impUid: id },
      { merchantUid: id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id }, { paymentId: id });
  });
  return or;
}

function buildMonthlyLedgerEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { sourceId: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.pointHistoryId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

async function resolveBillingUsageEvidence(env, auth, body = {}) {
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  await connectDb(env);
  const pointOr = buildPointHistoryEvidenceQuery(ids);
  const pointHistory = pointOr.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      $and: [
        { $or: pointOr },
        {
          $or: [
            { "metadata.accessType": { $in: ["membership_credit", "membership_pass", "family", "coin", "single_purchase"] } },
            { "metadata.transactionType": { $in: ["membership_credit", "membership_pass", "family_pass", "coin", "single_purchase"] } },
            { "metadata.accessMethod": { $in: ["MONTHLY", "PASS", "FAMILY", "COIN", "DIRECT_KRW"] } },
            { "metadata.paymentMethod": { $in: ["MONTHLY", "PASS", "FAMILY", "COIN", "DIRECT_KRW"] } },
          ],
        },
      ],
    }).select("_id metadata").lean()
    : null;
  if (pointHistory) {
    const accessType = clean(pointHistory?.metadata?.accessType).toLowerCase();
    return {
      ok: true,
      accessType: accessType === "membership_credit" ? "subscription" : accessType === "membership_pass" || accessType === "family" ? "pass" : "paid",
      paymentId: String(pointHistory._id || paymentIdFromBody(body) || ""),
    };
  }
  const ledgerOr = buildMonthlyLedgerEvidenceQuery(ids);
  const ledger = ledgerOr.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      $or: ledgerOr,
    }).select("_id metadata").lean()
    : null;
  if (ledger) {
    return { ok: true, accessType: "subscription", paymentId: String(ledger._id || paymentIdFromBody(body) || "") };
  }
  return null;
}

async function handleEnsureAccess(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED" }, { status: 401 });
  }
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  const idempotencyKey = normalizeId(body.idempotencyKey || request.headers.get("idempotency-key") || `sukuyo-ai-${Date.now().toString(36)}`);
  const user = await resolveUser(auth, env);
  const accessHash = await inputHash(normalized);
  if (clean(user?.role).toLowerCase() === "admin") {
    return json({
      ok: true,
      accessToken: await signTokenPayload(env, { userId: String(auth.userId), accessType: "admin", inputHash: accessHash, idempotencyKey, exp: Date.now() + TOKEN_TTL_MS }),
      accessType: "admin",
    });
  }
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE });
  if (decision.allowed) {
    const accessType = mapAccessType(decision, user || {});
    return json({
      ok: true,
      accessToken: await signTokenPayload(env, { userId: String(auth.userId), accessType, inputHash: accessHash, idempotencyKey, exp: Date.now() + TOKEN_TTL_MS }),
      accessType,
    });
  }
  return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildPaymentPayload(idempotencyKey) }, { status: 402 });
}

async function resolveStartAccess(request, env, auth, body, normalized, accessHash) {
  const token = clean(body.accessToken || body.access_token);
  const tokenPayload = token ? await verifyToken(env, token) : null;
  if (
    tokenPayload
    && tokenPayload.userId === String(auth.userId)
    && tokenPayload.inputHash === accessHash
    && (!tokenPayload.idempotencyKey || tokenPayload.idempotencyKey === normalizeId(body.idempotencyKey || request.headers.get("idempotency-key")))
  ) {
    return { ok: true, accessType: tokenPayload.accessType || "pass", paymentId: "" };
  }
  const user = await resolveUser(auth, env);
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE });
  if (decision.allowed) return { ok: true, accessType: mapAccessType(decision, user || {}), paymentId: paymentIdFromBody(body) };
  const billingEvidence = await resolveBillingUsageEvidence(env, auth, body);
  if (billingEvidence?.ok) return billingEvidence;
  const paidPaymentId = paymentIdFromBody(body);
  if (await hasPaidPayment(env, auth, paidPaymentId)) return { ok: true, accessType: "paid", paymentId: paidPaymentId };
  return { ok: false };
}

function buildFirstPrompt(input, calculation) {
  return [
    "아래 계산 데이터만 근거로 숙요점 궁합 첫 상담 답변을 작성하세요.",
    "없는 사실을 지어내지 말고, 계산된 27숙과 관계 유형을 중심으로 말하세요.",
    "",
    "[사용자 입력]",
    `- 사용자 A: ${input.personA.name || "나"} · 성별 ${input.personA.gender || "미입력"} · ${input.personA.birthDate} · ${input.personA.calendarType === "lunar" ? "음력" : "양력"} · 출생시간 ${input.personA.birthTime || "미입력"}`,
    `- 사용자 B: ${input.personB.name || "상대"} · 성별 ${input.personB.gender || "미입력"} · ${input.personB.birthDate} · ${input.personB.calendarType === "lunar" ? "음력" : "양력"} · 출생시간 ${input.personB.birthTime || "미입력"}`,
    `- 관계 유형: ${input.relationshipType}`,
    `- 상담 주제: ${input.topic}`,
    input.question ? `- 사용자의 현재 질문: ${input.question}` : "",
    "",
    "[숙요점 계산 결과]",
    JSON.stringify({
      personA: {
        shuku: calculation.sukuyoResult.personAShuku,
        index: calculation.personASukuyo.index,
        keywords: calculation.personASukuyo.keywords,
        strengths: calculation.personASukuyo.strengths,
        shadows: calculation.personASukuyo.shadows,
      },
      personB: {
        shuku: calculation.sukuyoResult.personBShuku,
        index: calculation.personBSukuyo.index,
        keywords: calculation.personBSukuyo.keywords,
        strengths: calculation.personBSukuyo.strengths,
        shadows: calculation.personBSukuyo.shadows,
      },
      relation: calculation.sukuyoResult,
      compatibility: calculation.compatibility,
    }, null, 2),
    "",
    "첫 답변은 다음 흐름을 자연스럽게 모두 포함하세요.",
    "두 사람의 숙요점 핵심 궁합, 두 사람 사이의 끌림 구조, 반복되기 쉬운 갈등 패턴, 한쪽이 더 상처받기 쉬운 지점, 연애 궁합, 결혼 또는 장기 관계 가능성, 재회/회복 가능성, 대화 방식과 감정 조율법, 조심해야 할 관계 패턴, 관계를 좋게 만드는 현실 조언, 마지막 상담 메시지.",
  ].filter(Boolean).join("\n");
}

function sanitizeConsultationText(text) {
  let result = clean(text, 60000);
  for (const pattern of FORBIDDEN_RESULT_PATTERNS) result = result.replace(pattern, "");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

async function createFirstAnswer(env, input, calculation) {
  const ai = await callGeminiText(env, buildFirstPrompt(input, calculation), {
    systemPrompt: SYSTEM_PROMPT,
    taskType: "fortune",
    temperature: 0.74,
    maxOutputTokens: 4096,
    timeoutMs: Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  const content = sanitizeConsultationText(ai?.text || "");
  if (!ai?.ok || isMock || content.length < 240) {
    console.error("[sukuyo-compatibility-ai] llm failed", { error: clean(ai?.error || ""), provider, model, isMock });
    throw Object.assign(new Error(MESSAGES.llmFailed), { code: "LLM_FAILED", status: 503 });
  }
  return { content, provider, model };
}

function serializeConsultation(doc) {
  const raw = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(raw._id || raw.id || ""),
    personA: raw.personA,
    personB: raw.personB,
    sukuyoResult: raw.sukuyoResult,
    relationshipType: raw.relationshipType,
    topic: raw.topic,
    accessType: raw.accessType,
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function executionAccessMethod(accessType) {
  if (accessType === "paid") return "single";
  if (accessType === "subscription") return "monthly";
  return "pass";
}

async function recordSuccessfulUsage(auth, idempotencyKey, access, consultation, now) {
  const accessMethod = executionAccessMethod(access.accessType);
  await PaidExecutionRecord.findOneAndUpdate(
    {
      userId: String(auth.userId || ""),
      featureId: FEATURE_KEY,
      profileId: "default",
      requestId: idempotencyKey,
    },
    {
      $setOnInsert: {
        executionId: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 160),
        requestId: idempotencyKey,
        userId: String(auth.userId || ""),
        featureId: FEATURE_KEY,
        profileId: "default",
        accessMode: "per_use",
        accessMethod,
        amountCoins: accessMethod === "single" ? COIN_PRICE : 0,
        amountKRW: accessMethod === "single" ? AMOUNT_KRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? COIN_PRICE : 0,
        paymentId: access.paymentId || "",
        orderId: access.paymentId || idempotencyKey,
        consumedAt: now,
        idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: now,
        resultId: String(consultation._id || ""),
        result: {
          consultationId: String(consultation._id || ""),
          featureKey: FEATURE_KEY,
          accessType: access.accessType,
        },
      },
    },
    { upsert: true },
  );
}

async function handleStart(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  const idempotencyKey = normalizeId(body.idempotencyKey || request.headers.get("idempotency-key") || `sukuyo-ai-${Date.now().toString(36)}`);
  const lockKey = `${auth.userId}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) return startLocks.get(lockKey);

  const pending = (async () => {
    await connectDb(env);
    const existing = await SukuyoCompatibilityAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
    if (existing) return json({ ok: true, consultation: serializeConsultation(existing), reused: true });
    const accessHash = await inputHash(normalized);
    const access = await resolveStartAccess(request, env, auth, body, normalized, accessHash);
    if (!access.ok) {
      return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildPaymentPayload(idempotencyKey), message: MESSAGES.paymentRequired }, { status: 402 });
    }
    const calculation = calculateSukuyo(normalized);
    const firstAnswer = await createFirstAnswer(env, normalized, calculation);
    const now = new Date();
    try {
      const created = await SukuyoCompatibilityAiConsultation.create({
        userId: auth.userId,
        idempotencyKey,
        personA: {
          name: normalized.personA.name,
          gender: normalized.personA.gender,
          birthDate: normalized.personA.birthDate,
          birthTime: normalized.personA.birthTime,
          calendarType: normalized.personA.calendarType,
          isLeapMonth: normalized.personA.isLeapMonth,
          shuku: calculation.sukuyoResult.personAShuku,
          shukuIndex: calculation.personASukuyo.index,
        },
        personB: {
          name: normalized.personB.name,
          gender: normalized.personB.gender,
          birthDate: normalized.personB.birthDate,
          birthTime: normalized.personB.birthTime,
          calendarType: normalized.personB.calendarType,
          isLeapMonth: normalized.personB.isLeapMonth,
          shuku: calculation.sukuyoResult.personBShuku,
          shukuIndex: calculation.personBSukuyo.index,
        },
        sukuyoResult: calculation.sukuyoResult,
        relationshipType: normalized.relationshipType,
        topic: normalized.topic,
        accessType: access.accessType,
        paymentId: access.paymentId || paymentIdFromBody(body),
        messages: [{ role: "assistant", content: firstAnswer.content, createdAt: now }],
        provider: firstAnswer.provider,
        model: firstAnswer.model,
      });
      await recordSuccessfulUsage(auth, idempotencyKey, access, created, now);
      return json({ ok: true, consultation: serializeConsultation(created) });
    } catch (error) {
      if (Number(error?.code) === 11000) {
        const duplicate = await SukuyoCompatibilityAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate) return json({ ok: true, consultation: serializeConsultation(duplicate), reused: true });
      }
      throw error;
    }
  })().catch((error) => {
    const status = Number(error?.status || 500);
    const code = clean(error?.code || "SERVER_ERROR");
    const message = code === "LLM_FAILED"
      ? MESSAGES.llmFailed
      : code === "CALCULATION_FAILED"
        ? MESSAGES.calculationFailed
        : MESSAGES.serverFailed;
    console.error("[sukuyo-compatibility-ai] start failed", { code, status, message: clean(error?.message || "") });
    return json({ ok: false, reason: code, message }, { status: status >= 400 && status < 600 ? status : 500 });
  }).finally(() => {
    startLocks.delete(lockKey);
  });
  startLocks.set(lockKey, pending);
  return pending;
}

function buildFollowupPrompt(consultation, userMessage) {
  return [
    "아래 기존 숙요점 궁합 상담 맥락을 이어서 답변하세요.",
    "계산된 27숙과 관계 유형을 바꾸지 마세요.",
    "상대방의 마음을 확정하지 말고, 건강한 관계 선택을 돕는 상담으로 답하세요.",
    "",
    "[숙요점 계산 요약]",
    JSON.stringify({
      personA: consultation.personA,
      personB: consultation.personB,
      sukuyoResult: consultation.sukuyoResult,
      relationshipType: consultation.relationshipType,
      topic: consultation.topic,
    }, null, 2),
    "",
    "[최근 상담 흐름]",
    (consultation.messages || []).slice(-6).map((item) => `${item.role}: ${clean(item.content, 1800)}`).join("\n\n"),
    "",
    `[사용자 추가 질문]\n${userMessage}`,
  ].join("\n");
}

async function handleMessage(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env);
  } catch (_) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const body = await readJson(request);
  const sessionId = clean(body.sessionId || body.consultationId || body.id);
  const content = clean(body.message || body.content || body.question, 1600);
  if (!/^[0-9a-f]{24}$/i.test(sessionId) || content.length < 2) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  }
  await connectDb(env);
  const consultation = await SukuyoCompatibilityAiConsultation.findOne({ _id: sessionId, userId: auth.userId });
  if (!consultation) return json({ ok: false, reason: "NOT_FOUND", message: "상담 내역을 찾지 못했습니다." }, { status: 404 });
  const ai = await callGeminiText(env, buildFollowupPrompt(consultation, content), {
    systemPrompt: SYSTEM_PROMPT,
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: 2600,
    timeoutMs: Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  const answer = sanitizeConsultationText(ai?.text || "");
  if (!ai?.ok || isMock || answer.length < 80) return json({ ok: false, reason: "LLM_FAILED", message: MESSAGES.llmFailed }, { status: 503 });
  const now = new Date();
  consultation.messages.push({ role: "user", content, createdAt: now });
  consultation.messages.push({ role: "assistant", content: answer, createdAt: now });
  consultation.provider = provider || consultation.provider;
  consultation.model = model || consultation.model;
  await consultation.save();
  return json({ ok: true, consultation: serializeConsultation(consultation), message: { role: "assistant", content: answer, createdAt: now } });
}

export async function handleSukuyoCompatibilityAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/sukuyo-compatibility-ai");
  if (method !== "POST") return methodNotAllowed();
  if (path === "/ensure-access") return handleEnsureAccess(request, env);
  if (path === "/start") return handleStart(request, env);
  if (path === "/message") return handleMessage(request, env);
  return notFound();
}
