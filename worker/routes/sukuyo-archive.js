// 숙요 유료 결과(기본 궁합 · 정밀 궁합 · 본성 심화 해석 · 극T 관계 회로 확장)의 보관함 저장.
//
// 이 결과들은 브라우저가 계산해 그리고 서버는 결제만 안다. 그래서 모달을 닫으면 결과가 사라졌다.
// 렌더가 끝나면 셸이 계산된 구조화 결과를 여기로 보내고, 서버는 **이 사용자가 이 카드로 이 기능을
// 실제로 결제했는지** 확인한 뒤에만 ServiceExecutionTransaction 에 남긴다(저장 모양은
// worker/lib/paid-result-archive.js — 보관함 /api/records 가 metadata.archive 를 읽는다).
//
// 🔴 클라이언트의 결제 주장은 믿지 않는다.
//    · 회당 결제(궁합): 게이트(syOpenPaidSukuyoFeature)는 결제마다 새 requestId
//      'sukuyo-paid:<featureKey>|<profileId>|<꼬리>' 를 만들고 같은 값을 여기로 보낸다. 예전처럼 카드에
//      고정하면 다른 상대를 볼 때 월정석 원장·이용권 마커가 첫 결제의 재생으로 처리돼 두 번째 결제가
//      일어나지 않았다. 서버는 앞부분이 이 기능·이 카드와 같을 때만 받아 그 값으로 증빙을 찾는다 —
//      다른 카드의 결제로 이 카드의 결과를 저장할 수 없다. 결제 1건 = 기록 1건(executionKey 에 requestId).
//      requestId 가 없으면(배포 전 JS·배포 전 결제) 예전 고정값 'sukuyo-paid:<featureKey>|<profileId>' 를
//      서버가 만들어 조회한다.
//    · 출생 기반 해금(본성 심화·극T): 이 카드의 출생 정보로 산 활성 해금 행이 있어야 한다.
// 🔴 이용권 즉시 사용: 셸 게이트는 이용권을 낙관적으로 열고 사용 기록(pass-check)을 뒤에서 보낸다.
//    그 기록이 아직 닿지 않았거나 유실됐으면 회당 결제는 여기서 **같은 requestId 로** 이용권을 직접
//    소비해 증빙을 남긴다(accessMethod:'pass' 일 때만). 같은 (기능, requestId) 소비는 멱등이라 뒤늦게
//    도착한 pass-check 와 두 번 깎이지 않는다 — 영냥이 proveChatAccess 와 같은 순서다.
//    그 밖의 결제 수단은 여기서 결제를 일으키지 않는다.
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { json } from "../lib/http.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import {
  archiveFailure as fail,
  archiveSignature,
  archiveText as text,
  hasArchiveMarkup,
  normalizeArchiveFacts,
  normalizeArchivePartner,
  normalizeArchiveSections,
  readArchiveCard,
  readArchiveJson,
  upsertPaidResultArchive,
} from "../lib/paid-result-archive.js";

export const SUKUYO_ARCHIVE_LOGIC_VERSION = "sukuyo-result-archive-v1";
const COMPAT_FEATURE_KEY = "compat-sukuyo-compatibility";
const COMPAT_PRECISION_FEATURE_KEY = "premium-sukuyo-compat-extra";
const NATURE_DEEP_DIVE_FEATURE_KEY = "sukuyo-nature-deep-dive";
const EXTREME_T_FEATURE_KEY = "sukuyo-extreme-t-relationship";

// 화면 사실표(SavedFacts)가 읽는 이름과 맞춘다 — 그 밖의 키는 버린다.
const COMPAT_FACTS = Object.freeze({
  textKeys: ["myMansion", "partnerMansion", "relationType", "relationTypeHan", "myRole", "partnerRole", "distanceLabel", "partnerGender", "stamp"],
  numberKeys: ["score", "compatibilityIndex", "temperature", "magnetism", "forwardDistance", "reverseDistance"],
});
const PARTNER_KEYS = ["y", "m", "d", "time", "cal", "gender"];

function compatSummary(facts, cardName) {
  const mansion = [facts.myMansion ? `나 ${facts.myMansion}` : "", facts.partnerMansion ? `상대 ${facts.partnerMansion}` : ""].filter(Boolean).join(" · ");
  return {
    summary: [facts.relationType, facts.distanceLabel].filter(Boolean).join(" · "),
    targetName: facts.partnerMansion || "",
    sukuyoResult: {
      ...(cardName ? { name: cardName } : {}),
      ...(mansion ? { mansion } : {}),
      ...(facts.relationType ? { relation: facts.relationType } : {}),
      ...(facts.relationTypeHan ? { relationType: facts.relationTypeHan } : {}),
      ...(facts.distanceLabel ? { distance: facts.distanceLabel } : {}),
      ...(Number.isFinite(facts.score) ? { score: facts.score } : {}),
    },
  };
}

// 경로 조각 → 결제 기능. 여기 없는 기능은 저장하지 않는다.
export const SUKUYO_ARCHIVE_FEATURES = Object.freeze({
  compat: Object.freeze({
    featureKey: COMPAT_FEATURE_KEY,
    reportType: "sukuyo-compatibility",
    title: "숙요점 궁합",
    payment: "per_use",
    facts: COMPAT_FACTS,
    partner: true,
    describe: compatSummary,
  }),
  "compat-precision": Object.freeze({
    featureKey: COMPAT_PRECISION_FEATURE_KEY,
    reportType: "sukuyo-compatibility-precision",
    title: "숙요점 정밀 궁합",
    payment: "per_use",
    facts: COMPAT_FACTS,
    partner: true,
    describe: compatSummary,
  }),
  // 본성 심화는 오늘의 달 흐름이 섞여 날마다 일부 문장이 바뀐다 — 날짜별로 따로 남긴다(signature 에 dailyDate).
  "nature-deep-dive": Object.freeze({
    featureKey: NATURE_DEEP_DIVE_FEATURE_KEY,
    reportType: "sukuyo-nature-deep-dive",
    title: "본성 심화 해석",
    payment: "birth_unlock",
    facts: { textKeys: ["myMansion", "moonTone", "mantra", "dailyDate"], numberKeys: [] },
    required: "myMansion",
    signatureFacts: ["myMansion", "dailyDate"],
    describe: (facts, cardName) => ({
      summary: [facts.myMansion, facts.moonTone].filter(Boolean).join(" · "),
      targetName: "",
      sukuyoResult: { ...(cardName ? { name: cardName } : {}), ...(facts.myMansion ? { mansion: facts.myMansion } : {}) },
    }),
  }),
  "extreme-t": Object.freeze({
    featureKey: EXTREME_T_FEATURE_KEY,
    reportType: "sukuyo-extreme-t-relationship",
    title: "극T 관계 회로 확장",
    payment: "birth_unlock",
    facts: { textKeys: ["typeName", "tTier", "headline", "catchphrase", "summaryMood", "emotionSpeed", "toneRisk", "loveDifficulty", "summaryTip"], numberKeys: ["finalScore"] },
    required: "typeName",
    signatureFacts: ["typeName", "finalScore"],
    describe: (facts, cardName) => ({
      summary: [facts.typeName, facts.headline].filter(Boolean).join(" · "),
      targetName: "",
      sukuyoResult: {
        ...(cardName ? { name: cardName } : {}),
        ...(facts.typeName ? { type: facts.typeName } : {}),
        ...(Number.isFinite(facts.finalScore) ? { score: facts.finalScore } : {}),
      },
    }),
  }),
});

// 결제마다 붙는 꼬리 — 셸의 syNewSukuyoPaymentRequestId(base36 시각 + base36 난수).
const PER_PAYMENT_TAIL_PATTERN = /^[a-z0-9]{6,40}$/;

// 게이트가 결제에 쓴 requestId. 보내지 않았으면 예전 고정값, 이 기능·이 카드 것이 아니면 null.
function resolvePerUseRequestId(spec, profileId, raw) {
  const legacy = `sukuyo-paid:${spec.featureKey}|${profileId}`;
  const requestId = typeof raw === "string" ? raw.trim() : "";
  if (!requestId) return { requestId: legacy, perPayment: false };
  const tail = requestId.startsWith(`${legacy}|`) ? requestId.slice(legacy.length + 1) : "";
  return PER_PAYMENT_TAIL_PATTERN.test(tail) ? { requestId, perPayment: true } : null;
}

async function provePerUse(env, spec, { userId, profileId, requestId, accessMethod }) {
  const input = {
    userId,
    featureKey: spec.featureKey,
    coinPrice: Number(FEATURE_KEY_PRICE_TABLE[spec.featureKey]?.cost) || 0,
    requestId,
    profileId,
  };
  let proof = await verifyPerUsePayment(env, { ...input, requireExisting: true });
  if (proof?.proven === false && accessMethod === "pass") proof = await verifyPerUsePayment(env, input);
  logPerUsePaymentProof(spec.featureKey, proof);
  return { proof, requestId };
}

async function proveBirthUnlock(env, spec, { userId, profileId }) {
  // 동적 import — 모델 일부만 흉내 내는 라우트 테스트가 이 파일을 정적으로 끌어오면 그래프가 깨진다.
  const { findActivePaidContentUnlock } = await import("../lib/content-unlocks.js");
  try {
    await connectDb(env);
    const unlock = await withMongoRetry(env, () => findActivePaidContentUnlock({ userId, profileId, featureKey: spec.featureKey }));
    if (!unlock) return { proof: { proven: false, source: "", reason: "NO_UNLOCK" }, requestId: "" };
    const requestId = text(unlock.orderId || unlock.evidenceId || unlock._id, 120);
    return {
      proof: { proven: true, source: text(unlock.source, 40).toLowerCase(), reason: "", transactionId: text(unlock.paymentId, 120) },
      requestId,
    };
  } catch (error) {
    // 🔴 DB 블립을 "미결제"로 세탁하지 않는다.
    if (isTransientMongoError(error)) return { proof: { proven: null, source: "", reason: "DB_DEGRADED" }, requestId: "" };
    throw error;
  }
}

export async function handleSukuyoResultArchive(request, env, featureSlug) {
  const spec = SUKUYO_ARCHIVE_FEATURES[featureSlug];
  if (!spec) return fail(404, "NOT_FOUND", "저장할 수 없는 기능입니다.");
  const auth = await requireUserFromRequest(request, env);
  const parsed = await readArchiveJson(request);
  if (parsed.tooLarge) return fail(413, "PAYLOAD_TOO_LARGE", "저장할 결과가 너무 큽니다.");
  if (parsed.invalid) return fail(400, "INVALID_JSON", "요청 형식이 올바르지 않습니다.");
  const body = parsed.body;

  const profileId = text(body.profileId, 80);
  if (!profileId) return fail(400, "PROFILE_REQUIRED", "결제에 사용한 프로필 카드가 필요합니다.");
  if (hasArchiveMarkup(body.facts) || hasArchiveMarkup(body.sections) || hasArchiveMarkup(body.partner)) {
    return fail(400, "MARKUP_NOT_ALLOWED", "결과에는 HTML 을 넣을 수 없습니다.");
  }
  const facts = normalizeArchiveFacts(body.facts, spec.facts);
  const sections = normalizeArchiveSections(body.sections);
  const partner = spec.partner ? normalizeArchivePartner(body.partner, PARTNER_KEYS) : {};
  const missing = spec.partner
    ? (!facts.partnerMansion || !partner.y || !partner.m || !partner.d)
    : (!facts[spec.required] || !sections.length);
  if (missing) return fail(400, "RESULT_REQUIRED", "저장할 결과가 없습니다.");
  const perUse = spec.payment === "per_use" ? resolvePerUseRequestId(spec, profileId, body.requestId) : null;
  if (spec.payment === "per_use" && !perUse) return fail(400, "REQUEST_ID_INVALID", "결제 요청 번호가 이 카드의 결제가 아닙니다.");

  const accessMethod = text(body.accessMethod, 20).toLowerCase();
  const { proof, requestId } = perUse
    ? await provePerUse(env, spec, { userId: auth.userId, profileId, requestId: perUse.requestId, accessMethod })
    : await proveBirthUnlock(env, spec, { userId: auth.userId, profileId });
  // 🔴 null 은 DB 장애다 — 미결제(403)로 바꾸지 않는다.
  if (proof?.proven === null) return fail(503, "PAYMENT_CHECK_UNAVAILABLE", "결제 확인이 잠시 지연되고 있습니다.");
  if (proof?.proven !== true) return fail(403, "PAYMENT_NOT_VERIFIED", "결제가 확인되지 않아 저장하지 않았습니다.");

  await connectDb(env);
  const { cardName, birthKey } = await readArchiveCard(env, auth.userId, profileId);

  // 결제마다 requestId 가 있으면 결제 1건 = 기록 1건이다. 그 밖에는 같은 카드(출생정보)·같은 입력이면
  // 같은 기록이다. 어느 쪽이든 다시 저장하면 갱신된다.
  const signatureInput = perUse?.perPayment
    ? { v: SUKUYO_ARCHIVE_LOGIC_VERSION, featureKey: spec.featureKey, requestId }
    : spec.partner
      ? { v: SUKUYO_ARCHIVE_LOGIC_VERSION, birthKey, partner, myMansion: facts.myMansion || "" }
      : { v: SUKUYO_ARCHIVE_LOGIC_VERSION, birthKey, ...Object.fromEntries(spec.signatureFacts.map((key) => [key, facts[key] ?? ""])) };
  const signature = archiveSignature(signatureInput);
  const executionKey = `${featureSlug}:${auth.userId}:${profileId}:${signature}`.slice(0, 120);
  const generatedAt = new Date().toISOString();
  const described = spec.describe(facts, cardName);
  const result = {
    title: spec.title,
    summary: described.summary,
    generatedAt,
    logicVersion: SUKUYO_ARCHIVE_LOGIC_VERSION,
    sukuyoResult: described.sukuyoResult,
    facts,
    sections,
  };

  const doc = await upsertPaidResultArchive(env, {
    userId: auth.userId,
    executionKey,
    featureKey: spec.featureKey,
    reportType: spec.reportType,
    reportId: `${featureSlug}-${signature}`,
    requestId,
    transactionId: proof.transactionId,
    profileId,
    metadata: {
      signature,
      logicVersion: SUKUYO_ARCHIVE_LOGIC_VERSION,
      accessType: text(proof.source, 40),
      birthKey,
      cardName,
      ...(spec.partner ? { partner } : {}),
    },
    archive: {
      reportType: spec.reportType,
      title: spec.title,
      displayName: cardName,
      targetName: described.targetName,
      summary: described.summary,
      generatedAt,
      logicVersion: SUKUYO_ARCHIVE_LOGIC_VERSION,
      result,
      payload: { facts, ...(spec.partner ? { partner } : {}) },
    },
  });

  return json({ ok: true, recordId: String(doc?._id || ""), executionKey });
}
