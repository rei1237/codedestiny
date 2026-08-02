// 운명의 지도 — 심층 리포트(유료, 회당 결제). 9섹션을 두 웨이브로 나눠 '동기' 생성한다.
//
// ⚠ ctx.waitUntil + /result 폴링으로 되돌리지 말 것. 9850c890 에서 형제 라우트 전부가
//   Workers 요청 간 I/O 격리 때문에 'generating' 고착을 겪고 동기로 되돌아왔다
//   (worker/lib/sync-llm-timeout.js 주석). 엣지는 100초에 요청을 끊는다.
//
// 그래서 전달 방식은 요청 2회다:
//   POST /report           → 인증·결제 확인 → 웨이브 A(체계별 5섹션 병렬) → 200 stage:"partial"
//   POST /report/continue  → 이어받기 토큰만 확인(무과금) → 웨이브 B(종합 4섹션 병렬) → 200 stage:"complete"
// 사용자는 A가 도착한 순간부터 읽기 시작한다(체감 속도).
//
// 무료 /api/destiny-compass(narrate)와 **다른 파일**인 이유: 그쪽은 worker/index.js 에서
// 보안 래퍼 없이 bare 마운트된 무인증·무DB 계약이다. 형제 -ai 파일 선례: ziwei-island / pet-saju.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, cookieValue, HttpError } from "../lib/http.js";
import { connectDb, isTransientMongoError } from "../lib/db.js";
import { DestinyCompassReport } from "../lib/models.js";
import { requireAuth, getAccessTokenSecret, getJwtAudience, getJwtIssuer } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { cmsPromptText } from "../lib/cms-prompts.js";
import { startServiceExecution, completeServiceExecution, failServiceExecution } from "../lib/service-execution-task.js";
import {
  COMPASS_REPORT_VERSION,
  COMPASS_SECTIONS,
  COMPASS_SECTION_MAX_OUTPUT_TOKENS,
  COMPASS_WAVE_A_KEYS,
  COMPASS_WAVE_B_KEYS,
  buildAllowedLabels,
  buildCompassBasisPayload,
  buildCompassSectionPrompt,
  buildCompassSystemPrompt,
  compassFallbackMinChars,
  computeSystemStars,
  getCompassSection,
  resolveGrounds,
  splitGroundsLine,
  trimToLastSentence,
  validateCompassSection,
} from "../lib/destiny-compass-report-contract.js";

const FEATURE_KEY = "destiny-compass-deep-report";
const REPORT_TYPE = "destinyCompassDeepReport";
const SERVICE_KEY = "destiny-compass";
const REPORT_COST = 100;
const CONTINUATION_TYPE = "destiny-compass-report-continuation";
const CONTINUATION_TTL = "10m";

/** 섹션 하나에 허용하는 LLM 대기. 웨이브 예산 안에서 다시 깎인다. */
const COMPASS_SECTION_TIMEOUT_MS = 42000;
/** 교정(repair) 한 바퀴를 더 돌리려면 최소 이만큼 남아 있어야 한다. */
const COMPASS_REPAIR_MIN_REMAINING_MS = 12000;
/** 웨이브 A 는 인증·결제 왕복이 앞에 붙으므로 B 보다 짧게 잡는다. */
const COMPASS_WAVE_A_BUDGET_MS = 58000;
const COMPASS_WAVE_B_BUDGET_MS = 72000;
/** 웨이브 A 가 이만큼도 못 살리면 리포트라고 부를 수 없다 → 환불. */
const WAVE_A_MIN_USABLE_SECTIONS = 3;
const DELIVERY_MIN_CHARS = 400;

const LLM_ERROR_MESSAGE = "리포트를 완성하지 못했어요. 결제는 자동 환급됩니다. 잠시 후 다시 시도해 주세요.";

function clean(value, max = 0) {
  const text = String(value == null ? "" : value).trim();
  return max > 0 ? text.slice(0, max) : text;
}

function invalidInput(message) {
  return new HttpError(422, message, { error: "INVALID_INPUT" });
}

// ── 입력 정규화 ────────────────────────────────────────────────
// 🔴 field·evidencePack 은 클라이언트가 계산해 보낸다(엔진이 클라 TS라 워커로 못 옮긴다 — 번들 1MB).
//    위조하면 서사가 달라질 뿐 과금은 우회할 수 없지만, 프롬프트에 실리는 값이므로 전부 클램프한다.

const BAND = new Set(["strong", "steady", "caution"]);
const WEATHER = new Set(["clear", "breeze", "fog", "storm"]);
const DIRECTION_KEYS = new Set(["career", "venture", "study", "relationship", "love", "wealth", "health", "rest"]);
const SYSTEM_KEYS = new Set(["saju", "ziwei", "sukuyo", "tarot", "vedic"]);
const TIMELINE_KEYS = ["d30", "d90", "y1", "y3"];

function clampScore(value) {
  const n = Math.round(Number(value) || 0);
  return n < 0 ? 0 : n > 100 ? 100 : n;
}

function clampUnit(value) {
  const n = Number(value) || 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function normalizeDirection(raw) {
  const key = clean(raw?.key, 24);
  if (!DIRECTION_KEYS.has(key)) return null;
  const band = clean(raw?.band, 16);
  return { key, score: clampScore(raw?.score), band: BAND.has(band) ? band : "steady" };
}

function normalizeField(raw) {
  if (!raw || typeof raw !== "object") throw invalidInput("field 데이터가 필요합니다.");

  const directions = (Array.isArray(raw.directions) ? raw.directions : [])
    .slice(0, 8)
    .map(normalizeDirection)
    .filter(Boolean);
  const primary = normalizeDirection(raw.primary) || directions[0];
  if (!primary) throw invalidInput("대표 방향을 확인할 수 없습니다.");

  const timeline = {};
  for (const key of TIMELINE_KEYS) {
    const phase = raw.timeline?.[key];
    if (!phase) continue;
    const weather = clean(phase.weather, 16);
    timeline[key] = { weather: WEATHER.has(weather) ? weather : "breeze", momentum: clampScore(phase.momentum) };
  }

  const strongKey = clean(raw.strongArea?.key, 24);
  const blockedKey = clean(raw.blockedArea?.key, 24);

  return {
    seed: clean(raw.seed, 160),
    confidence: clampUnit(raw.confidence),
    sources: (Array.isArray(raw.sources) ? raw.sources : []).map((s) => clean(s, 24)).filter((s) => SYSTEM_KEYS.has(s)).slice(0, 5),
    directions,
    primary,
    strongArea: { key: DIRECTION_KEYS.has(strongKey) ? strongKey : primary.key },
    blockedArea: { key: DIRECTION_KEYS.has(blockedKey) ? blockedKey : primary.key },
    timeline,
  };
}

function normalizeEvidencePack(raw) {
  const systems = [];
  for (const bucket of Array.isArray(raw?.systems) ? raw.systems.slice(0, 5) : []) {
    const system = clean(bucket?.system, 24);
    if (!SYSTEM_KEYS.has(system) || systems.some((s) => s.system === system)) continue;
    const items = [];
    for (const item of Array.isArray(bucket.items) ? bucket.items.slice(0, 12) : []) {
      const term = clean(item?.term, 80);
      if (!term) continue;
      items.push({
        // id 는 서버가 근거 카드를 조인하는 키다. 형식을 벗어나면 버린다(임의 문자열 주입 차단).
        id: /^[a-z]+\.[A-Za-z]+$/.test(clean(item?.id, 80)) ? clean(item.id, 80) : "",
        term,
        detail: clean(item?.detail, 180),
        tone: ["positive", "caution", "neutral"].includes(clean(item?.tone, 16)) ? clean(item.tone, 16) : undefined,
      });
    }
    if (!items.length) continue;
    systems.push({ system, dataQuality: clampUnit(bucket.dataQuality), weight: clampUnit(bucket.weight), items });
  }
  if (!systems.length) throw invalidInput("근거 데이터가 비어 있습니다.");
  return { version: "compass-evidence-v1", systems };
}

function normalizeReportInput(body) {
  const idempotencyKey = clean(body?.idempotencyKey, 120);
  if (idempotencyKey.length < 12) throw invalidInput("idempotencyKey가 필요합니다.");
  return {
    idempotencyKey,
    question: clean(body?.question, 300),
    emotion: clean(body?.emotion, 24),
    field: normalizeField(body?.field),
    evidencePack: normalizeEvidencePack(body?.evidencePack),
  };
}

// ── 해시(캐시키·무결성) ────────────────────────────────────────
// seed 에는 생년·응답이 들어 있으므로 캐시키에 원문을 싣지 않는다.

function hash36(value) {
  let h = 5381;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return (h >>> 0).toString(36);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${k}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function buildHashes(input) {
  return {
    seedHash: hash36(input.field.seed),
    questionHash: hash36(`${input.question}|${input.emotion}`),
    packHash: hash36(stableStringify(input.evidencePack)),
  };
}

function buildInputHash(input) {
  const h = buildHashes(input);
  return `${h.seedHash}.${h.questionHash}.${h.packHash}`;
}

// ── 접근 권한 ──────────────────────────────────────────────────

async function resolveAccess(request, env, body, route) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) throw new HttpError(401, "로그인 후 이용해 주세요.", { error: "LOGIN_REQUIRED" });
    throw error;
  }

  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, REPORT_TYPE, {
    ...(body || {}),
    featureKey: FEATURE_KEY,
    reportType: REPORT_TYPE,
    transactionId: clean(body?.transactionId),
    purchaseId: clean(body?.purchaseId),
    requestId: clean(body?.requestId),
    sessionId: clean(body?.sessionId),
    premiumAccessToken: clean(
      request.headers.get("x-premium-access-token")
      || body?.premiumAccessToken
      || cookieValue(request, "cd_premium_access")
      || "",
    ) || undefined,
    _accessRoute: route,
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    throw new HttpError(status, status === 401 ? "로그인 후 이용해 주세요." : "결제 확인이 필요합니다.", {
      error: status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_REQUIRED",
    });
  }
  return { auth, access };
}

// ── 선차감 복원(환불) ──────────────────────────────────────────
// 결제는 프론트의 공용 게이트(useCoinGate)가 이미 끝냈다. 생성이 실패하면 여기서 되돌린다.
// 세 호출 모두 실패해도 리포트 전달을 막지 않는다(로그만) — 환불 실패가 결과 유실이 되면 안 된다.

function executionKeyOf(idempotencyKey) {
  return `${FEATURE_KEY}:${idempotencyKey}`;
}

async function startRefundableExecution(env, auth, access, input, reportId) {
  const sourceTransactionId = clean(access?.matchedTransactionId, 120);
  if (!sourceTransactionId) return false; // 이용권·관리자 통과 등 차감이 없던 경로 → 되돌릴 것도 없다.
  const result = await startServiceExecution(env, auth.userId, {
    executionKey: executionKeyOf(input.idempotencyKey),
    requestId: executionKeyOf(input.idempotencyKey),
    featureKey: FEATURE_KEY,
    cost: REPORT_COST,
    sourceTransactionId,
    reportId,
    reportType: REPORT_TYPE,
    idempotencyKey: input.idempotencyKey,
    metadata: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, reportId },
  }).catch((error) => {
    console.warn("[destiny-compass-ai] execution guard start failed", { message: clean(error?.message || error, 300) });
    return null;
  });
  return Boolean(result?.execution);
}

async function completeRefundableExecution(env, auth, input, reportId) {
  await completeServiceExecution(env, auth.userId, {
    executionKey: executionKeyOf(input.idempotencyKey),
    requestId: executionKeyOf(input.idempotencyKey),
    reportId,
    metadata: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, reportId },
  }).catch((error) => {
    console.warn("[destiny-compass-ai] execution guard complete failed", { message: clean(error?.message || error, 300) });
  });
}

async function refundExecution(env, auth, input, reportId, reasonMessage) {
  const result = await failServiceExecution(env, auth.userId, {
    executionKey: executionKeyOf(input.idempotencyKey),
    requestId: executionKeyOf(input.idempotencyKey),
    reportId,
    reasonCode: "destiny_compass_report_generation_failed",
    reasonMessage: clean(reasonMessage || LLM_ERROR_MESSAGE, 300),
    failureStage: "generation",
    forceRefundOnClose: true,
  }).catch((error) => {
    console.error("[destiny-compass-ai] execution guard refund failed", { message: clean(error?.message || error, 300) });
    return null;
  });
  return Boolean(result?.ok);
}

// ── 영속화 ─────────────────────────────────────────────────────
// 🔴 전부 best-effort 다. DB 가 흔들려도 생성·전달은 그대로 진행해야 한다 —
//    저장을 못 했다고 결제한 결과를 버리면 그게 더 큰 사고다.
//    읽기(/result)만 예외로, 실패를 transient 503 으로 올려 클라가 재시도하게 한다.

function sectionsForDb(sections) {
  return sections.map((s) => ({
    key: s.key, order: s.order, title: s.title, system: s.system,
    body: s.body, chars: s.chars, status: s.status, grounds: s.grounds,
  }));
}

async function loadStoredReport(env, userId, { idempotencyKey, reportId }) {
  try {
    await connectDb(env);
    const query = reportId ? { id: reportId, userId: String(userId) } : { userId: String(userId), idempotencyKey };
    return await DestinyCompassReport.findOne(query).lean();
  } catch (error) {
    console.warn("[destiny-compass-ai] report load failed", { message: clean(error?.message || error, 200) });
    return null;
  }
}

async function persistWaveA(env, userId, input, reportId, context, sections, access) {
  try {
    await connectDb(env);
    await DestinyCompassReport.findOneAndUpdate(
      { userId: String(userId), idempotencyKey: input.idempotencyKey },
      {
        $set: {
          id: reportId,
          userId: String(userId),
          idempotencyKey: input.idempotencyKey,
          inputHash: buildInputHash(input),
          seedHash: buildHashes(input).seedHash,
          question: input.question,
          emotion: input.emotion,
          field: input.field,
          evidencePack: input.evidencePack,
          basis: context.basisPayload,
          systemConfidence: context.systemConfidence,
          sections: sectionsForDb(sections),
          status: "partial",
          accessType: clean(access?.accessType, 40),
          generationError: null,
        },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    console.warn("[destiny-compass-ai] wave A persist failed", { message: clean(error?.message || error, 200) });
  }
}

async function persistWaveB(env, userId, reportId, sections, complete) {
  try {
    await connectDb(env);
    const doc = await DestinyCompassReport.findOne({ id: reportId, userId: String(userId) });
    if (!doc) return;
    const byKey = new Map(doc.sections.map((s) => [s.key, s]));
    for (const s of sectionsForDb(sections)) byKey.set(s.key, s);
    doc.sections = [...byKey.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
    doc.status = complete ? "completed" : "partial";
    if (complete && !doc.usageAppliedAt) doc.usageAppliedAt = new Date();
    await doc.save();
  } catch (error) {
    console.warn("[destiny-compass-ai] wave B persist failed", { message: clean(error?.message || error, 200) });
  }
}

async function markReportFailed(env, userId, input, reportId, reason) {
  try {
    await connectDb(env);
    await DestinyCompassReport.findOneAndUpdate(
      { userId: String(userId), idempotencyKey: input.idempotencyKey },
      {
        $set: {
          id: reportId,
          userId: String(userId),
          idempotencyKey: input.idempotencyKey,
          inputHash: buildInputHash(input),
          status: "generation_failed",
          generationError: { reason: clean(reason, 200), at: new Date().toISOString() },
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.warn("[destiny-compass-ai] fail-mark failed", { message: clean(error?.message || error, 200) });
  }
}

/** 저장본 → 응답 봉투. 재열람과 멱등 재요청이 같은 모양을 받는다. */
function publicStoredReport(doc) {
  const sections = (doc.sections || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  return {
    ok: true,
    reportId: doc.id,
    version: COMPASS_REPORT_VERSION,
    stage: doc.status === "completed" ? "complete" : "partial",
    basis: doc.basis || null,
    systemConfidence: doc.systemConfidence || [],
    sections,
    degraded: sections.some((s) => s.status !== "ok"),
    restored: true,
  };
}

// ── 섹션 생성 ──────────────────────────────────────────────────

function resolveSystemPrompt(env) {
  return cmsPromptText(env, "destiny-compass-report", buildCompassSystemPrompt());
}

/**
 * 섹션 하나를 생성한다. **절대 던지지 않는다** — 한 섹션이 죽어도 웨이브는 계속돼야 한다.
 * @returns {Promise<{key: string, ok: boolean, text: string, evidenceIds: string[], issues: string[], truncated: boolean, provider: string, reason: string}>}
 */
async function generateCompassSection(env, spec, context, options) {
  const { systemPrompt, cacheStore, timeoutMs, repairIssues } = options;
  const empty = { key: spec.key, ok: false, text: "", evidenceIds: [], issues: [], truncated: false, provider: "", reason: "" };

  let ai;
  try {
    ai = await callGeminiText(env, buildCompassSectionPrompt({ ...context, spec, repairIssues }), {
      systemPrompt,
      taskType: "fortune",
      temperature: repairIssues?.length ? 0.58 : 0.68,
      maxOutputTokens: COMPASS_SECTION_MAX_OUTPUT_TOKENS,
      timeoutMs,
      fallbackToWorkersAI: true,
      // 🔴 폴백을 켠 유료 라우트는 문턱을 반드시 함께 준다. 없으면 8% 분량이 정상 결제로 나간다.
      fallbackMinChars: compassFallbackMinChars(spec),
      cache: {
        store: cacheStore,
        deterministic: true,
        ttlSeconds: 7 * 24 * 60 * 60,
        // 섹션 키를 넣어야 같은 웨이브의 병렬 호출이 in-flight dedup 에서 서로를 덮지 않는다.
        keyExtra: `${COMPASS_REPORT_VERSION}:${spec.key}:${context.cacheSalt}${repairIssues?.length ? ":r1" : ""}`,
      },
      logContext: { route: "destiny-compass-ai", section: spec.key },
    });
  } catch (error) {
    console.warn("[destiny-compass-ai] section threw", { section: spec.key, message: clean(error?.message || error, 300) });
    return { ...empty, reason: "threw" };
  }

  if (!ai?.ok) {
    console.warn("[destiny-compass-ai] section llm_failed", {
      section: spec.key,
      error: clean(ai?.error, 80),
      status: ai?.status ?? null,
      message: clean(ai?.message, 300),
    });
    return { ...empty, reason: clean(ai?.error, 80) || "llm_failed" };
  }

  const split = splitGroundsLine(ai.text);
  const body = ai.truncated ? trimToLastSentence(split.body) : split.body;
  return {
    key: spec.key,
    ok: Boolean(body),
    text: body,
    evidenceIds: split.evidenceIds,
    issues: [],
    truncated: ai.truncated === true,
    provider: clean(ai.provider, 40),
    reason: "",
  };
}

/**
 * 한 웨이브를 병렬 생성하고, 규칙을 어긴 섹션만 한 바퀴 교정한다.
 * 벽시계 = 가장 느린 섹션 하나(합이 아니다).
 */
async function runWave(env, keys, context, options) {
  const { budgetMs, startedAt, cacheStore, systemPrompt } = options;
  const remaining = () => budgetMs - (Date.now() - startedAt);
  const timeoutMs = clampSyncLlmTimeoutMs(Math.min(COMPASS_SECTION_TIMEOUT_MS, Math.max(1, remaining())));

  const specs = keys.map(getCompassSection).filter(Boolean);
  let results = await Promise.all(
    specs.map((spec) => generateCompassSection(env, spec, context, { systemPrompt, cacheStore, timeoutMs })),
  );

  // 검증 → 교정 1회. 문장 중복 검사는 결정론 순서로 누적해야 재현된다.
  const seenSentences = context.seenSentences;
  results = results.map((result) => {
    const spec = getCompassSection(result.key);
    if (!result.ok) return result;
    return { ...result, issues: validateCompassSection(result.text, { spec, allowedLabels: context.allowedLabels, seenSentences }) };
  });

  const needsRepair = results.filter((r) => r.ok && r.issues.length);
  if (needsRepair.length && remaining() > COMPASS_REPAIR_MIN_REMAINING_MS) {
    const repairTimeout = clampSyncLlmTimeoutMs(Math.max(1, Math.min(COMPASS_SECTION_TIMEOUT_MS, remaining() - 4000)));
    const repaired = await Promise.all(
      needsRepair.map((r) => generateCompassSection(env, getCompassSection(r.key), context, {
        systemPrompt, cacheStore, timeoutMs: repairTimeout, repairIssues: r.issues,
      })),
    );
    const byKey = new Map(repaired.filter((r) => r.ok).map((r) => [r.key, r]));
    results = results.map((result) => {
      const fix = byKey.get(result.key);
      if (!fix) return result;
      const issues = validateCompassSection(fix.text, { spec: getCompassSection(fix.key), allowedLabels: context.allowedLabels, seenSentences });
      // 교정본이 더 나쁘면 원본을 지킨다(재시도가 결과를 깎지 않게).
      return issues.length <= result.issues.length ? { ...fix, issues } : result;
    });
  }

  // 확정된 본문의 문장을 누적해 다음 웨이브의 중복 검사를 가능하게 한다.
  for (const result of results) {
    if (!result.ok) continue;
    for (const sentence of result.text.split(/(?<=[.!?。])\s+/)) {
      const s = sentence.replace(/\s+/g, " ").trim();
      if (s.length >= 24) seenSentences.add(s);
    }
  }
  return results;
}

function toPublicSection(result, context) {
  const spec = getCompassSection(result.key);
  const grounds = resolveGrounds(result.evidenceIds, context.evidencePack, context.starsBySystem);
  return {
    key: spec.key,
    order: spec.order,
    title: spec.title,
    system: spec.system,
    body: result.text,
    chars: result.text.replace(/\s+/g, "").length,
    // 규칙 위반이 남았어도 본문은 전달한다(경량 보장 계약). 화면이 '참고' 표시를 붙일 수 있게 알린다.
    status: result.issues.length || result.truncated ? "degraded" : "ok",
    grounds,
  };
}

function buildContext(input) {
  const basisPayload = buildCompassBasisPayload({ evidencePack: input.evidencePack, field: input.field });
  const systemConfidence = computeSystemStars(input.evidencePack);
  const hashes = buildHashes(input);
  return {
    field: input.field,
    evidencePack: input.evidencePack,
    basisPayload,
    question: input.question,
    emotion: input.emotion,
    allowedLabels: buildAllowedLabels(basisPayload),
    starsBySystem: new Map(systemConfidence.map((row) => [row.system, row.stars])),
    systemConfidence,
    cacheSalt: `${hashes.seedHash}:${hashes.questionHash}:${hashes.packHash}`,
    seenSentences: new Set(),
    digests: [],
  };
}

// ── 이어받기 토큰 ──────────────────────────────────────────────

async function issueContinuationToken(env, auth, input, reportId, digests) {
  return signJwt(
    { typ: CONTINUATION_TYPE, featureKey: FEATURE_KEY, userId: String(auth.userId), reportId, inputHash: buildInputHash(input), digests },
    getAccessTokenSecret(env),
    { expiresIn: CONTINUATION_TTL, issuer: getJwtIssuer(env), audience: getJwtAudience(env) },
  );
}

async function readContinuationToken(env, auth, token, input) {
  let payload;
  try {
    payload = await verifyJwt(clean(token, 4000), getAccessTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
  } catch (error) {
    throw new HttpError(401, "이어보기 시간이 지났어요. 리포트를 다시 열어 주세요.", { error: "CONTINUATION_EXPIRED" });
  }
  if (payload?.typ !== CONTINUATION_TYPE || payload?.featureKey !== FEATURE_KEY) {
    throw new HttpError(401, "이어보기 정보를 확인할 수 없어요.", { error: "CONTINUATION_INVALID" });
  }
  if (String(payload.userId) !== String(auth.userId)) {
    throw new HttpError(403, "다른 계정의 리포트는 이어볼 수 없어요.", { error: "CONTINUATION_FORBIDDEN" });
  }
  if (payload.inputHash !== buildInputHash(input)) {
    throw new HttpError(409, "리포트 정보가 처음과 달라요. 다시 열어 주세요.", { error: "CONTINUATION_MISMATCH" });
  }
  return payload;
}

// ── 핸들러 ─────────────────────────────────────────────────────

async function handleReport(request, env) {
  const body = await readJson(request);
  const input = normalizeReportInput(body);
  const { auth, access } = await resolveAccess(request, env, body, "/api/destiny-compass-ai/report");

  const reportId = `dcdr_${buildHashes(input).seedHash}_${hash36(input.idempotencyKey)}`;

  // 같은 요청 키로 다시 들어오면 재생성하지 않는다 — 이미 낸 돈으로 만든 리포트를 그대로 돌려준다.
  // (새로고침·이중 클릭·네트워크 재시도가 두 번째 생성을 부르지 않게)
  const stored = await loadStoredReport(env, auth.userId, { idempotencyKey: input.idempotencyKey });
  if (stored && stored.sections?.length && stored.status !== "generation_failed") {
    const pending = COMPASS_WAVE_B_KEYS.filter((k) => !stored.sections.some((s) => s.key === k));
    return json({
      ...publicStoredReport(stored),
      continuation: pending.length
        ? { token: await issueContinuationToken(env, auth, input, stored.id, []), pendingSections: pending }
        : undefined,
    });
  }

  const context = buildContext(input);
  const startedAt = Date.now();

  // 생성 전에 선차감을 '되돌릴 수 있는 상태'로 연다. 실패하면 아래 refundExecution 이 복원한다.
  await startRefundableExecution(env, auth, access, input, reportId);

  const results = await runWave(env, COMPASS_WAVE_A_KEYS, context, {
    budgetMs: COMPASS_WAVE_A_BUDGET_MS,
    startedAt,
    cacheStore: createLlmCacheStore(env),
    systemPrompt: await resolveSystemPrompt(env),
  });

  const usable = results.filter((r) => r.ok);
  const assembled = usable.map((r) => r.text).join("\n\n");
  const deliverable = usable.length >= WAVE_A_MIN_USABLE_SECTIONS && hasRenderableLlmText(assembled, { minChars: DELIVERY_MIN_CHARS });

  if (!deliverable) {
    const refunded = await refundExecution(env, auth, input, reportId, "웨이브 A 생성 실패");
    await markReportFailed(env, auth.userId, input, reportId, "wave_a_not_deliverable");
    return json({
      ok: false,
      reason: "GENERATION_FAILED",
      refunded,
      retryable: true,
      message: refunded ? LLM_ERROR_MESSAGE : "리포트를 완성하지 못했어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }

  const sections = usable.map((r) => toPublicSection(r, context)).sort((a, b) => a.order - b.order);
  const digests = sections.map((s) => ({ title: s.title, text: s.body.slice(0, 300) }));

  // 전달 직전에 저장한다. 여기서 실패해도 응답은 그대로 나간다(사용자가 결과를 잃지 않는다).
  await persistWaveA(env, auth.userId, input, reportId, context, sections, access);

  return json({
    ok: true,
    reportId,
    version: COMPASS_REPORT_VERSION,
    stage: "partial",
    continuation: {
      token: await issueContinuationToken(env, auth, input, reportId, digests),
      pendingSections: COMPASS_WAVE_B_KEYS.slice(),
    },
    basis: context.basisPayload,
    systemConfidence: context.systemConfidence,
    sections,
    degraded: sections.some((s) => s.status !== "ok") || usable.length < COMPASS_WAVE_A_KEYS.length,
    provider: clean(usable[0]?.provider, 40),
  });
}

async function handleContinue(request, env) {
  const body = await readJson(request);
  const input = normalizeReportInput(body);

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) throw new HttpError(401, "로그인 후 이용해 주세요.", { error: "LOGIN_REQUIRED" });
    throw error;
  }

  // 이어받기는 과금하지 않는다 — 웨이브 A 에서 이미 받았다. 토큰이 결제 증거를 대신한다.
  const payload = await readContinuationToken(env, auth, body?.continuationToken, input);
  const reportId = clean(payload.reportId, 120);

  // 저장본이 있으면 그것이 정본이다 — 토큰의 digests 는 10분 만료라 놓칠 수 있다.
  const stored = await loadStoredReport(env, auth.userId, { reportId });
  if (stored?.status === "completed") return json(publicStoredReport(stored));

  const context = buildContext(input);
  const storedDigests = (stored?.sections || [])
    .filter((s) => s.body)
    .map((s) => ({ title: clean(s.title, 60), text: clean(s.body, 300) }));
  context.digests = storedDigests.length
    ? storedDigests
    : (Array.isArray(payload.digests)
      ? payload.digests.map((d) => ({ title: clean(d?.title, 60), text: clean(d?.text, 300) })).filter((d) => d.title && d.text)
      : []);
  for (const digest of context.digests) context.seenSentences.add(digest.text);

  const results = await runWave(env, COMPASS_WAVE_B_KEYS, context, {
    budgetMs: COMPASS_WAVE_B_BUDGET_MS,
    startedAt: Date.now(),
    cacheStore: createLlmCacheStore(env),
    systemPrompt: await resolveSystemPrompt(env),
  });

  const usable = results.filter((r) => r.ok);
  const sections = usable.map((r) => toPublicSection(r, context)).sort((a, b) => a.order - b.order);

  // 웨이브 B 는 무과금이라 503 을 내지 않는다. 비어도 A 의 5섹션은 이미 사용자 손에 있다.
  if (!sections.length) {
    return json({
      ok: true, reportId, version: COMPASS_REPORT_VERSION, stage: "partial_failed",
      sections: [], degraded: true, retryable: true,
      message: "종합 해석을 불러오지 못했어요. 다시 시도하면 이어서 채워집니다.",
    });
  }

  const complete = usable.length === COMPASS_WAVE_B_KEYS.length;
  await persistWaveB(env, auth.userId, reportId, sections, complete);

  // 전달이 확정된 시점에 선차감을 확정한다(여기까지 왔다면 결제된 만큼은 나갔다).
  await completeRefundableExecution(env, auth, input, reportId);

  return json({
    ok: true,
    reportId,
    version: COMPASS_REPORT_VERSION,
    stage: complete ? "complete" : "partial_failed",
    sections,
    degraded: sections.some((s) => s.status !== "ok") || usable.length < COMPASS_WAVE_B_KEYS.length,
    provider: clean(usable[0]?.provider, 40),
  });
}

/**
 * GET /result       → 내 리포트 목록(최근 20개, 본문 제외)
 * GET /result?id=…  → 저장본 재열람
 *
 * 여기서는 DB 실패를 삼키지 않는다 — 읽기 전용이라 재시도가 안전하고,
 * 조용히 "없음"을 돌려주면 사용자가 결제한 리포트가 사라진 것처럼 보인다.
 */
async function handleResult(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) throw new HttpError(401, "로그인 후 이용해 주세요.", { error: "LOGIN_REQUIRED" });
    throw error;
  }

  const id = clean(new URL(request.url).searchParams.get("id"), 120);
  try {
    await connectDb(env);
    if (!id) {
      const rows = await DestinyCompassReport
        .find({ userId: String(auth.userId) }, { id: 1, question: 1, status: 1, createdAt: 1, systemConfidence: 1 })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      return json({ ok: true, reports: rows.map((r) => ({ reportId: r.id, question: r.question, status: r.status, createdAt: r.createdAt })) });
    }
    const doc = await DestinyCompassReport.findOne({ id, userId: String(auth.userId) }).lean();
    if (!doc) return json({ ok: false, reason: "NOT_FOUND", message: "리포트를 찾을 수 없어요." }, { status: 404 });
    if (doc.status === "generating") {
      return json({ ok: false, reason: "GENERATING", retryable: true, message: "아직 만들고 있어요." }, { status: 202, headers: { "Retry-After": "3" } });
    }
    if (doc.status === "generation_failed") {
      return json({ ok: false, reason: "GENERATION_FAILED", message: "이 리포트는 생성에 실패했어요. 결제는 환급 처리됩니다." }, { status: 409 });
    }
    return json(publicStoredReport(doc));
  } catch (error) {
    // 일시적 Mongo 장애를 404 로 내리면 "결제한 리포트가 사라졌다"로 보인다.
    if (isTransientMongoError(error)) {
      return json({ ok: false, reason: "DB_DEGRADED", retryable: true, message: "잠시 후 다시 시도해 주세요." }, { status: 503 });
    }
    throw error;
  }
}

function routeError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, reason: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
  }
  console.error("[destiny-compass-ai] unhandled", { name: error?.name, message: clean(error?.message || error, 300) });
  return json({ ok: false, reason: "INTERNAL", retryable: true, message: "잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function handleDestinyCompassAiRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/destiny-compass-ai");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });

    if (path === "/report") {
      if (method !== "POST") return methodNotAllowed();
      return await handleReport(request, env);
    }
    if (path === "/report/continue") {
      if (method !== "POST") return methodNotAllowed();
      return await handleContinue(request, env);
    }
    if (path === "/result") {
      if (method !== "GET") return methodNotAllowed();
      return await handleResult(request, env);
    }
    return notFound();
  } catch (error) {
    return routeError(error);
  }
}

/** verify 하네스 전용 — 순수 함수만 노출한다. */
export const __destinyCompassAiTestUtils = {
  normalizeField,
  normalizeEvidencePack,
  buildInputHash,
  COMPASS_SECTIONS,
  COMPASS_SECTION_MAX_OUTPUT_TOKENS,
};
