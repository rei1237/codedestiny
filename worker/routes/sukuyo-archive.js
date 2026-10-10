// 숙요 회당 결제 결과(기본 궁합 · 정밀 궁합)의 보관함 저장.
//
// 이 두 결과는 브라우저가 계산해 그리고 서버는 결제만 안다. 그래서 모달을 닫으면 결과가 사라졌다.
// 렌더가 끝나면 셸이 계산된 구조화 결과를 여기로 보내고, 서버는 **이 사용자가 이 카드로 이 기능을
// 실제로 결제·소비했는지** 확인한 뒤에만 ServiceExecutionTransaction 에 남긴다(인연 레이더의
// writeSukuyoPastLifeArchive 와 같은 저장 모양 — 보관함 /api/records 가 metadata.archive 를 읽는다).
//
// 🔴 클라이언트의 결제 주장은 믿지 않는다. 결제 requestId 는 게이트(syOpenPaidSukuyoFeature)가 만드는
//    'sukuyo-paid:<featureKey>|<profileId>' 를 서버가 직접 다시 만들어 조회한다 — 카드가 requestId 에
//    박혀 있으므로 다른 카드의 결제로 이 카드의 결과를 저장할 수 없다.
// 🔴 이 저장은 결제를 일으키지 않는다(requireExisting) — 이용권 차감도 여기서는 하지 않는다.
// 🔴 HTML 은 받지 않는다. 문자열에 '<' 가 있으면 거절한다.
import { createHash } from "node:crypto";
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { json } from "../lib/http.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { connectDb, withMongoRetry } from "../lib/db.js";
import { ProfileCard, ServiceExecutionTransaction } from "../lib/models.js";
import { computeBirthKey } from "../lib/birth-key.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";

export const SUKUYO_ARCHIVE_LOGIC_VERSION = "sukuyo-result-archive-v1";
const COMPAT_FEATURE_KEY = "compat-sukuyo-compatibility";
const COMPAT_PRECISION_FEATURE_KEY = "premium-sukuyo-compat-extra";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_SECTIONS = 40;
const MAX_SECTION_TITLE = 120;
const MAX_SECTION_BODY = 4000;
const MAX_FACT_TEXT = 200;

// 경로 조각 → 결제 기능. 여기 없는 기능은 저장하지 않는다.
export const SUKUYO_ARCHIVE_FEATURES = Object.freeze({
  compat: Object.freeze({
    featureKey: COMPAT_FEATURE_KEY,
    reportType: "sukuyo-compatibility",
    title: "숙요점 궁합",
  }),
  "compat-precision": Object.freeze({
    featureKey: COMPAT_PRECISION_FEATURE_KEY,
    reportType: "sukuyo-compatibility-precision",
    title: "숙요점 정밀 궁합",
  }),
});

// 화면 사실표(SavedFacts)가 읽는 이름과 맞춘다 — 그 밖의 키는 버린다.
const FACT_TEXT_KEYS = ["myMansion", "partnerMansion", "relationType", "relationTypeHan", "myRole", "partnerRole", "distanceLabel", "partnerGender", "stamp"];
const FACT_NUMBER_KEYS = ["score", "compatibilityIndex", "temperature", "magnetism", "forwardDistance", "reverseDistance"];
const PARTNER_KEYS = ["y", "m", "d", "time", "cal", "gender"];

function fail(status, code, message) {
  return json({ ok: false, error: { code, message } }, { status });
}

function text(value, max) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function hasMarkup(value) {
  return typeof value === "string" && value.includes("<");
}

function anyMarkup(value, depth = 0) {
  if (depth > 4) return false;
  if (typeof value === "string") return hasMarkup(value);
  if (Array.isArray(value)) return value.some((entry) => anyMarkup(entry, depth + 1));
  if (value && typeof value === "object") return Object.values(value).some((entry) => anyMarkup(entry, depth + 1));
  return false;
}

function normalizeFacts(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const facts = {};
  for (const key of FACT_TEXT_KEYS) {
    const value = text(source[key], MAX_FACT_TEXT);
    if (value) facts[key] = value;
  }
  for (const key of FACT_NUMBER_KEYS) {
    const value = Number(source[key]);
    if (Number.isFinite(value)) facts[key] = Math.round(value * 100) / 100;
  }
  return facts;
}

function normalizePartner(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const partner = {};
  for (const key of PARTNER_KEYS) {
    const value = text(source[key], 20);
    if (value) partner[key] = value;
  }
  return partner;
}

function normalizeSections(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SECTIONS).map((entry) => {
    const row = entry && typeof entry === "object" ? entry : {};
    const title = text(row.title, MAX_SECTION_TITLE);
    // 본문은 줄바꿈을 살린다(읽기 화면이 문단으로 나눈다).
    const body = typeof row.body === "string" ? row.body.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_SECTION_BODY) : "";
    return body ? { title: title || "상세 해석", body } : null;
  }).filter(Boolean);
}

function signatureOf(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex").slice(0, 24);
}

/** 보관함 읽기 화면(SavedSukuyoSummary · SavedFacts · SavedChapters)이 그대로 그리는 모양. */
function buildArchiveResult(spec, facts, sections, cardName, generatedAt) {
  const mansion = [facts.myMansion ? `나 ${facts.myMansion}` : "", facts.partnerMansion ? `상대 ${facts.partnerMansion}` : ""].filter(Boolean).join(" · ");
  const sukuyoResult = {
    ...(cardName ? { name: cardName } : {}),
    ...(mansion ? { mansion } : {}),
    ...(facts.relationType ? { relation: facts.relationType } : {}),
    ...(facts.relationTypeHan ? { relationType: facts.relationTypeHan } : {}),
    ...(facts.distanceLabel ? { distance: facts.distanceLabel } : {}),
    ...(Number.isFinite(facts.score) ? { score: facts.score } : {}),
  };
  const summary = [facts.relationType, facts.distanceLabel].filter(Boolean).join(" · ");
  return { title: spec.title, summary, generatedAt, logicVersion: SUKUYO_ARCHIVE_LOGIC_VERSION, sukuyoResult, facts, sections };
}

async function readLimitedJson(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true };
  if (!raw.trim()) return { body: {} };
  try {
    const body = JSON.parse(raw);
    return { body: body && typeof body === "object" && !Array.isArray(body) ? body : {} };
  } catch {
    return { invalid: true };
  }
}

export async function handleSukuyoResultArchive(request, env, featureSlug) {
  const spec = SUKUYO_ARCHIVE_FEATURES[featureSlug];
  if (!spec) return fail(404, "NOT_FOUND", "저장할 수 없는 기능입니다.");
  const auth = await requireUserFromRequest(request, env);
  const parsed = await readLimitedJson(request);
  if (parsed.tooLarge) return fail(413, "PAYLOAD_TOO_LARGE", "저장할 결과가 너무 큽니다.");
  if (parsed.invalid) return fail(400, "INVALID_JSON", "요청 형식이 올바르지 않습니다.");
  const body = parsed.body;

  const profileId = text(body.profileId, 80);
  if (!profileId) return fail(400, "PROFILE_REQUIRED", "결제에 사용한 프로필 카드가 필요합니다.");
  if (anyMarkup(body.facts) || anyMarkup(body.sections) || anyMarkup(body.partner)) {
    return fail(400, "MARKUP_NOT_ALLOWED", "결과에는 HTML 을 넣을 수 없습니다.");
  }
  const facts = normalizeFacts(body.facts);
  const sections = normalizeSections(body.sections);
  const partner = normalizePartner(body.partner);
  if (!facts.partnerMansion || !partner.y || !partner.m || !partner.d) {
    return fail(400, "RESULT_REQUIRED", "저장할 궁합 결과가 없습니다.");
  }

  // 게이트가 결제에 쓴 바로 그 requestId — 서버가 만든다.
  const requestId = `sukuyo-paid:${spec.featureKey}|${profileId}`;
  const proof = await verifyPerUsePayment(env, {
    userId: auth.userId,
    featureKey: spec.featureKey,
    coinPrice: Number(FEATURE_KEY_PRICE_TABLE[spec.featureKey]?.cost) || 0,
    requestId,
    requireExisting: true,
  });
  logPerUsePaymentProof(spec.featureKey, proof);
  // 🔴 null 은 DB 장애다 — 미결제(403)로 바꾸지 않는다.
  if (proof?.proven === null) return fail(503, "PAYMENT_CHECK_UNAVAILABLE", "결제 확인이 잠시 지연되고 있습니다.");
  if (proof?.proven !== true) return fail(403, "PAYMENT_NOT_VERIFIED", "결제가 확인되지 않아 저장하지 않았습니다.");

  await connectDb(env);
  const card = await withMongoRetry(env, () => ProfileCard.findOne({ userId: auth.userId, profileId }).lean());
  const cardName = text(card?.name || card?.nickname, 60);
  const birthKey = card ? computeBirthKey(card) : "";

  // 같은 카드(출생정보)·같은 상대 입력이면 같은 기록이다 — 다시 저장하면 갱신된다.
  const signature = signatureOf({ v: SUKUYO_ARCHIVE_LOGIC_VERSION, birthKey, partner, myMansion: facts.myMansion || "" });
  const executionKey = `${featureSlug}:${auth.userId}:${profileId}:${signature}`.slice(0, 120);
  const now = new Date();
  const generatedAt = now.toISOString();
  const result = buildArchiveResult(spec, facts, sections, cardName, generatedAt);
  const transactionId = text(proof.transactionId, 120);

  const doc = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate(
    { userId: auth.userId, executionKey },
    {
      $setOnInsert: {
        userId: auth.userId,
        executionKey,
        featureKey: spec.featureKey,
        timeoutAt: now,
        nextRetryAt: now,
        retentionUntil: null,
      },
      $set: {
        reportType: spec.reportType,
        reportId: `${featureSlug}-${signature}`,
        sessionId: requestId.slice(0, 120),
        // 환불 판정(isStoredPaidResultRevoked)이 이 두 값으로 결제 기록을 되짚는다.
        idempotencyKey: requestId.slice(0, 120),
        paymentId: transactionId,
        profileId,
        status: "success",
        premiumStatus: "completed",
        completedAt: now,
        generationStartedAt: now,
        generationCompletedAt: now,
        coinTransactionId: transactionId,
        sourceTransactionId: transactionId,
        metadata: {
          signature,
          logicVersion: SUKUYO_ARCHIVE_LOGIC_VERSION,
          featureKey: spec.featureKey,
          reportType: spec.reportType,
          accessType: text(proof.source, 40),
          requestId,
          profileId,
          birthKey,
          cardName,
          partner,
          archive: {
            reportType: spec.reportType,
            title: spec.title,
            displayName: cardName,
            targetName: facts.partnerMansion || "",
            summary: result.summary,
            generatedAt,
            logicVersion: SUKUYO_ARCHIVE_LOGIC_VERSION,
            result,
            payload: { facts, partner },
          },
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean());

  return json({ ok: true, recordId: String(doc?._id || ""), executionKey });
}
