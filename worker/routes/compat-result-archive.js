// 점성술 궁합(셀럽·직접 입력) · 자미두수 궁합 — 브라우저가 계산하는 회당 결제 결과의 보관함 저장.
// POST /api/compat-archive/<astro-synastry|astro-direct-synastry|ziwei-compat>
//
// 이 결과들은 js/saju-engine.js 가 그리고 서버는 결제만 안다. 렌더가 끝나면 셸이 구조화 결과를 보내고,
// 서버는 그 결제 requestId 로 **이 사용자가 이 기능을 실제로 결제했는지** 확인한 뒤에만 남긴다
// (저장 모양은 worker/lib/paid-result-archive.js).
//
// 🔴 숙요 궁합과 달리 requestId 를 카드에 고정하지 않는다. 상대가 매번 바뀌는 회당 결제라 고정하면
//    두 번째 상대의 결제가 첫 결제의 멱등 재생으로 처리된다. 셸은 결제마다 새 requestId 를 만들어
//    게이트에 넘기고 같은 값을 여기로 보낸다. 서버는 그 값이 이 사용자·이 기능의 결제인지만 본다 —
//    다른 사람의 requestId 로는 증빙이 없다. 결제 1건 = 기록 1건(executionKey 에 requestId).
// 🔴 이용권 즉시 사용(accessMethod:'pass')은 사용 기록이 아직 없으면 같은 requestId 로 이용권을 직접
//    소비해 증빙을 남긴다(멱등 — 뒤늦은 pass-check 와 두 번 깎이지 않는다). sukuyo-archive.js 와 같다.
import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { connectDb } from "../lib/db.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import {
  archiveFailure as fail,
  archiveSignature,
  archiveText as text,
  hasArchiveMarkup,
  normalizeArchiveFacts,
  normalizeArchiveSections,
  readArchiveCard,
  readArchiveJson,
  upsertPaidResultArchive,
} from "../lib/paid-result-archive.js";

export const COMPAT_ARCHIVE_LOGIC_VERSION = "compat-result-archive-v1";
const ASTRO_SYNASTRY_FEATURE_KEY = "compat-astro-synastry";
const ASTRO_DIRECT_SYNASTRY_FEATURE_KEY = "compat-astro-direct-synastry";
const ZIWEI_COMPAT_FEATURE_KEY = "compat-ziwei-compatibility";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9:_.|-]{12,120}$/;

const ASTRO_FACTS = Object.freeze({
  textKeys: ["partnerName", "relationType", "partnerSun", "partnerMoon", "partnerVenus", "partnerMars", "bestSupport", "bestChallenge"],
  numberKeys: ["score"],
});

function describeAstro(facts) {
  return {
    summary: [facts.relationType, Number.isFinite(facts.score) ? `${facts.score}점` : ""].filter(Boolean).join(" · "),
    targetName: facts.partnerName || "",
    // SavedAstrology 는 행성표가 없으면 SavedFacts 로 이 값을 그린다.
    chart: {
      astrologyChart: {
        ...(facts.partnerName ? { name: facts.partnerName } : {}),
        ...(facts.relationType ? { relationType: facts.relationType } : {}),
        ...(Number.isFinite(facts.score) ? { score: facts.score } : {}),
        ...(facts.partnerSun ? { sun: facts.partnerSun } : {}),
        ...(facts.partnerMoon ? { moon: facts.partnerMoon } : {}),
      },
    },
  };
}

export const COMPAT_ARCHIVE_FEATURES = Object.freeze({
  "astro-synastry": Object.freeze({
    featureKey: ASTRO_SYNASTRY_FEATURE_KEY,
    reportType: "astro-synastry",
    title: "점성술 궁합",
    facts: ASTRO_FACTS,
    describe: describeAstro,
  }),
  "astro-direct-synastry": Object.freeze({
    featureKey: ASTRO_DIRECT_SYNASTRY_FEATURE_KEY,
    reportType: "astro-direct-synastry",
    title: "점성술 궁합 · 직접 입력",
    facts: ASTRO_FACTS,
    describe: describeAstro,
  }),
  "ziwei-compat": Object.freeze({
    featureKey: ZIWEI_COMPAT_FEATURE_KEY,
    reportType: "ziwei-compatibility",
    title: "자미두수 궁합",
    facts: {
      textKeys: ["partnerName", "myMingPalace", "partnerMingPalace", "mySpousePalace", "partnerSpousePalace"],
      numberKeys: ["score", "loveScore", "marriageScore", "friendScore", "workScore", "businessScore", "pastLifeScore"],
    },
    describe: (facts) => ({
      summary: Number.isFinite(facts.score) ? `종합 ${facts.score}점` : "",
      targetName: facts.partnerName || "",
      // SavedZiwei 는 궁 배열이 없으면 SavedFacts 로 이 값을 그린다.
      chart: {
        ziweiChart: {
          ...(facts.partnerName ? { name: facts.partnerName } : {}),
          ...(Number.isFinite(facts.score) ? { score: facts.score } : {}),
        },
      },
    }),
  }),
});

async function provePerUse(env, spec, { userId, requestId, profileId, accessMethod }) {
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
  return proof;
}

export async function handleCompatResultArchive(request, env, featureSlug) {
  const spec = COMPAT_ARCHIVE_FEATURES[featureSlug];
  if (!spec) return fail(404, "NOT_FOUND", "저장할 수 없는 기능입니다.");
  const auth = await requireUserFromRequest(request, env);
  const parsed = await readArchiveJson(request);
  if (parsed.tooLarge) return fail(413, "PAYLOAD_TOO_LARGE", "저장할 결과가 너무 큽니다.");
  if (parsed.invalid) return fail(400, "INVALID_JSON", "요청 형식이 올바르지 않습니다.");
  const body = parsed.body;

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!REQUEST_ID_PATTERN.test(requestId)) return fail(400, "REQUEST_ID_REQUIRED", "결제 요청 번호가 필요합니다.");
  if (hasArchiveMarkup(body.facts) || hasArchiveMarkup(body.sections)) {
    return fail(400, "MARKUP_NOT_ALLOWED", "결과에는 HTML 을 넣을 수 없습니다.");
  }
  const facts = normalizeArchiveFacts(body.facts, spec.facts);
  const sections = normalizeArchiveSections(body.sections);
  if (!Number.isFinite(facts.score) || !sections.length) return fail(400, "RESULT_REQUIRED", "저장할 궁합 결과가 없습니다.");
  const profileId = text(body.profileId, 80);

  const proof = await provePerUse(env, spec, {
    userId: auth.userId,
    requestId,
    profileId,
    accessMethod: text(body.accessMethod, 20).toLowerCase(),
  });
  // 🔴 null 은 DB 장애다 — 미결제(403)로 바꾸지 않는다.
  if (proof?.proven === null) return fail(503, "PAYMENT_CHECK_UNAVAILABLE", "결제 확인이 잠시 지연되고 있습니다.");
  if (proof?.proven !== true) return fail(403, "PAYMENT_NOT_VERIFIED", "결제가 확인되지 않아 저장하지 않았습니다.");

  await connectDb(env);
  const { cardName, birthKey } = await readArchiveCard(env, auth.userId, profileId);
  const signature = archiveSignature({ v: COMPAT_ARCHIVE_LOGIC_VERSION, featureKey: spec.featureKey, requestId });
  const executionKey = `${featureSlug}:${auth.userId}:${signature}`.slice(0, 120);
  const generatedAt = new Date().toISOString();
  const described = spec.describe(facts);
  const result = {
    title: spec.title,
    summary: described.summary,
    generatedAt,
    logicVersion: COMPAT_ARCHIVE_LOGIC_VERSION,
    ...described.chart,
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
      logicVersion: COMPAT_ARCHIVE_LOGIC_VERSION,
      accessType: text(proof.source, 40),
      birthKey,
      cardName,
    },
    archive: {
      reportType: spec.reportType,
      title: spec.title,
      displayName: cardName,
      targetName: described.targetName,
      summary: described.summary,
      generatedAt,
      logicVersion: COMPAT_ARCHIVE_LOGIC_VERSION,
      result,
      payload: { facts },
    },
  });

  return json({ ok: true, recordId: String(doc?._id || ""), executionKey });
}

export async function handleCompatResultArchiveRoutes(request, env = {}) {
  try {
    const path = getRoutePath(request, "/api/compat-archive");
    const match = /^\/([a-z-]+)$/.exec(path);
    if (!match) return notFound();
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    return await handleCompatResultArchive(request, env, match[1]);
  } catch (error) {
    return handleRouteError(error, { route: "compat-archive", request });
  }
}
