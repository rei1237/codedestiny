/**
 * 마스터 인연의 서 — 부분 생성 세션 집계 (읽기 전용, 쓰기 없음).
 *
 * 2026-09-19 장애로 남은 결과를 부류별로 센다. 무엇을 고칠 수 있고, 그중 몇 건이 LLM 재호출
 * 없이 메타데이터만으로 풀리는지, 재생성이 필요한 장은 모두 몇 장인지를 먼저 본다.
 *
 *   (a) status:"completed" 인데 기대 장이 빠졌다      → 완료 표기가 거짓
 *   (b) 저장된 장이 1개뿐                              → 사용자가 본 증상
 *   (c) 미완인데 도는 작업이 없다(락 없음·대기 시각 지남)
 *        c1 시도 가능한 장이 남음  → 이어쓰기만 하면 된다
 *        c2 남은 장이 전부 시도 소진 → 시도 기록 초기화 + 재생성 필요
 *   (d) savedChapters ⊋ chapters                       → 본문은 있는데 노출이 안 된다
 *                                                        (**LLM 재호출 없이** 복구된다)
 *
 * 🔴 이 스크립트는 아무것도 쓰지 않는다. find/count/aggregate 외의 연산을 넣지 말 것.
 *    실제 복구는 scripts/recover-master-love-codex-session.mjs 로 진행한다.
 *
 * 🔴 판정을 여기서 다시 구현하지 않는다 — 서버·크론이 쓰는 diagnoseCodexSession 을 그대로
 *    부른다. 기대 장 목록도 그 함수가 세션의 manifest(없으면 구매 당시 모드 표)에서 가져온다.
 *    **지금 저장된 장 수로 원래 구성을 역산하지 않는다.**
 *
 * 🔴 본문 무출력·무전송: 본문은 DB 에서 가져오지 않고 **길이만** 서버에서 재서($strLenCP)
 *    length 를 가진 자리표시자로 넘긴다(diagnoseCodexSession 은 body.length 만 본다).
 *    이 계약은 시작할 때 실제 함수로 한 번 확인한다(assertPlaceholderContract).
 *    $strLenCP(코드포인트)는 JS .length(UTF-16)보다 작거나 같으므로, 어긋나도 "복구 후보가
 *    더 많이 잡히는" 쪽으로만 틀린다 — 복구 스크립트가 실제 본문으로 다시 검증한다.
 *
 * 🔴 개인정보 무출력: userId·이름·생년월일·상담 내용·결제 정보를 출력하지 않는다. 세션 id 는
 *    기본 마스킹이고, 복구 대상을 넘길 때만 --with-ids 로 전체를 낸다.
 *
 * 실행 (스테이징):
 *   node scripts/audit-master-love-codex-incomplete.mjs --db code_destiny_staging [--json] [--with-ids]
 */

import assert from "node:assert/strict";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { diagnoseCodexSession, __masterLoveCodexTestUtils } from "../worker/routes/master-love-codex.js";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DATABASE = argValue("--db", "");
if (!["code_destiny_staging", "code_destiny"].includes(DATABASE)) {
  throw new Error("Required: --db code_destiny_staging | code_destiny (no default — pick the target explicitly).");
}
const AS_JSON = process.argv.includes("--json");
const WITH_IDS = process.argv.includes("--with-ids");
const MAX_TIME_MS = Math.max(1000, Math.floor(Number(argValue("--max-time-ms", 120000))) || 120000);
const LIMIT = Math.max(0, Math.floor(Number(argValue("--limit", 0))) || 0);
const AGG_OPTIONS = { maxTimeMS: MAX_TIME_MS, allowDiskUse: false };
const LOCK_TTL_MS = Number(__masterLoveCodexTestUtils?.BATCH_LOCK_TTL_MS) || 120000;

// 인연의 서는 장당 실제 LLM 호출이 걸린 영역이다 — 읽기 전용 감사에 외부 호출이 섞이면
// 이 스크립트가 과금 동작을 유발할 수 있으므로 원천 차단한다.
globalThis.fetch = () => { throw new Error("External HTTP is forbidden in this read-only audit."); };

/** 길이 자리표시자가 실제 판정 함수에서 통하는지 확인한다(계약이 깨지면 즉시 멈춘다). */
function assertPlaceholderContract() {
  const { expected } = diagnoseCodexSession({ mode: "", chapters: [] });
  assert.ok(expected.length > 0, "기대 장 목록이 비었다 — 모드 표를 읽지 못했다.");
  const spec = expected[0];
  const long = diagnoseCodexSession({ mode: "", chapters: [{ id: spec.id, order: spec.order, ok: true, body: { length: 1_000_000 } }] });
  const short = diagnoseCodexSession({ mode: "", chapters: [{ id: spec.id, order: spec.order, ok: true, body: { length: 1 } }] });
  assert.equal(long.saved.has(spec.id), true, "길이 자리표시자가 '저장됨'으로 판정되지 않는다 — 본문을 읽는 판정이 생겼다.");
  assert.equal(short.saved.has(spec.id), false, "하한 미달 장이 '저장됨'으로 판정된다 — 검증 규칙이 느슨해졌다.");
  return expected.length;
}

/** 본문 없이 id·order·ok·길이만 뽑는 투영. */
function chapterRows(source) {
  return {
    $map: {
      input: { $ifNull: [source, []] },
      as: "row",
      in: {
        id: "$$row.id",
        order: "$$row.order",
        ok: "$$row.ok",
        chars: { $cond: [{ $eq: [{ $type: "$$row.body" }, "string"] }, { $strLenCP: "$$row.body" }, 0] },
      },
    },
  };
}

/** 길이만 가진 행을 diagnoseCodexSession 이 보는 모양으로 되돌린다. */
function withPlaceholderBody(rows = []) {
  return rows.map(row => ({ ...row, body: { length: Number(row.chars || 0) } }));
}

function maskSessionId(id) {
  const text = String(id || "");
  return text.length <= 12 ? text : `${text.slice(0, 8)}…${text.slice(-4)}`;
}

function bump(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

const env = {
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  MONGO_DB_NAME: DATABASE,
  MONGODB_DB_NAME: DATABASE,
  MONGO_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "10000",
  MONGO_CONNECT_TIMEOUT_MS: process.env.MONGO_CONNECT_TIMEOUT_MS || "10000",
  MONGO_SOCKET_TIMEOUT_MS: process.env.MONGO_SOCKET_TIMEOUT_MS || "45000",
  MONGO_WORKER_CONNECT_GUARD_MS: process.env.MONGO_WORKER_CONNECT_GUARD_MS || "15000",
  MONGO_MAX_POOL_SIZE: process.env.MONGO_MAX_POOL_SIZE || "5",
  MONGO_IP_FAMILY: process.env.MONGO_IP_FAMILY || "4",
  MONGO_IP_FAMILY_AUTO_FALLBACK: process.env.MONGO_IP_FAMILY_AUTO_FALLBACK || "true",
};

if (!env.MONGO_URI && !env.MONGODB_URI) {
  console.error("❌ MONGO_URI 또는 MONGODB_URI 환경변수가 필요합니다.");
  process.exit(1);
}

const defaultChapterCount = assertPlaceholderContract();

let connected = false;
try {
  await connectDb(env);
  connected = true;
  assert.equal(mongoose.connection.name, DATABASE);
  const collection = mongoose.connection.db.collection("masterLoveCodexSessions");

  const pipeline = [
    { $sort: { createdAt: -1 } },
    ...(LIMIT ? [{ $limit: LIMIT }] : []),
    { $project: {
      _id: 0,
      id: 1,
      mode: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      refunded: { $or: [
        { $ne: [{ $ifNull: ["$passRefund.refundedAt", null] }, null] },
        { $ne: [{ $ifNull: ["$billingRefund.refundedAt", null] }, null] },
      ] },
      lockedAt: "$generationProgress.lockedAt",
      chapters: chapterRows("$chapters"),
      deliveryMeta: {
        manifest: "$deliveryMeta.manifest",
        attempts: "$deliveryMeta.attempts",
        errors: "$deliveryMeta.errors",
        reviewRequired: "$deliveryMeta.reviewRequired",
        reviewReason: "$deliveryMeta.reviewReason",
        nextAttemptAt: "$deliveryMeta.nextAttemptAt",
        codexReopenedAt: "$deliveryMeta.codexReopenedAt",
        dedupeReopenedAt: "$deliveryMeta.dedupeReopenedAt",
        codexRepairedAt: "$deliveryMeta.codexRepairedAt",
        savedChapters: chapterRows("$deliveryMeta.savedChapters"),
      },
    } },
  ];

  const now = Date.now();
  const rows = await collection.aggregate(pipeline, AGG_OPTIONS).toArray();

  const byMode = new Map();
  const byStatus = new Map();
  const errorCodes = new Map();
  const classes = { a: [], b: [], c1: [], c2: [], d: [] };
  let refundedCount = 0;
  let manifestMissing = 0;
  let healthy = 0;
  let regenerationChapters = 0;
  let metadataOnly = 0;
  const repairTargets = new Set();

  for (const row of rows) {
    const doc = {
      ...row,
      chapters: withPlaceholderBody(row.chapters),
      deliveryMeta: { ...row.deliveryMeta, savedChapters: withPlaceholderBody(row.deliveryMeta?.savedChapters) },
    };
    const diag = diagnoseCodexSession(doc);
    const savedIds = new Set(diag.saved.keys());
    const exposedIds = new Set((row.chapters || []).map(chapter => chapter.id));
    const hidden = [...savedIds].filter(id => !exposedIds.has(id));

    bump(byMode, String(row.mode || "(none)"));
    bump(byStatus, String(row.status || "(none)"));
    for (const entry of Object.values(row.deliveryMeta?.errors || {})) bump(errorCodes, String(entry?.code || "(none)"));
    if (!row.deliveryMeta?.manifest?.chapterIds?.length) manifestMissing += 1;
    if (row.refunded) { refundedCount += 1; continue; }

    const lockAlive = new Date(row.lockedAt || 0).getTime() > now - LOCK_TTL_MS;
    const dueAt = new Date(row.deliveryMeta?.nextAttemptAt || 0).getTime();
    const idle = !lockAlive && (!Number.isFinite(dueAt) || dueAt <= now);
    const complete = row.status === "completed";

    const flags = [];
    if (complete && diag.pending.length) flags.push("a");
    if (savedIds.size === 1) flags.push("b");
    if (!complete && idle && diag.pending.length) flags.push(diag.actionable.length ? "c1" : "c2");
    if (hidden.length) flags.push("d");

    if (!flags.length) { healthy += 1; continue; }

    const entry = {
      sessionId: row.id,
      mode: row.mode || "",
      status: row.status || "",
      expected: diag.expected.length,
      saved: savedIds.size,
      exposed: exposedIds.size,
      hidden: hidden.length,
      pending: diag.pending.length,
      actionable: diag.actionable.length,
      exhausted: diag.exhausted.length,
      reviewRequired: row.deliveryMeta?.reviewRequired === true,
      // 크론(reopenClosedSessions)이 스스로 열 수 있는 세션인지 — 운영자 개입이 필요한 모수를 가른다.
      cronCanReopen: row.status === "generation_failed" && row.deliveryMeta?.reviewRequired === true
        && row.deliveryMeta?.reviewReason === "GENERATION_BUDGET_EXCEEDED"
        && !row.deliveryMeta?.codexReopenedAt && diag.actionable.length > 0,
      alreadyRepaired: Boolean(row.deliveryMeta?.codexRepairedAt),
      updatedAt: row.updatedAt || null,
    };
    for (const flag of flags) classes[flag].push(entry);
    repairTargets.add(row.id);
    // 메타데이터만으로 끝나는 건: 노출만 막혀 있고 실제로 빠진 장이 없다.
    if (!diag.pending.length) metadataOnly += 1;
    else regenerationChapters += diag.pending.length;
  }

  const summary = {
    database: DATABASE,
    generatedAt: new Date(now).toISOString(),
    scanned: rows.length,
    defaultChapterCount,
    byMode: Object.fromEntries(byMode),
    byStatus: Object.fromEntries(byStatus),
    refundedExcluded: refundedCount,
    manifestMissing,
    healthy,
    classes: {
      a_completedButMissing: classes.a.length,
      b_singleChapterOnly: classes.b.length,
      c1_stalledResumable: classes.c1.length,
      c2_stalledExhausted: classes.c2.length,
      d_savedButHidden: classes.d.length,
    },
    repairTargets: repairTargets.size,
    metadataOnlyRepairs: metadataOnly,
    estimatedRegenerationChapters: regenerationChapters,
    cronSelfHealing: [...new Set(classes.c1.filter(entry => entry.cronCanReopen).map(entry => entry.sessionId))].length,
    errorCodes: Object.fromEntries([...errorCodes].sort((a, b) => b[1] - a[1])),
    sessions: [...repairTargets].map(id => {
      const entry = [...classes.a, ...classes.b, ...classes.c1, ...classes.c2, ...classes.d].find(row => row.sessionId === id);
      return { ...entry, sessionId: WITH_IDS ? id : maskSessionId(id) };
    }),
  };

  if (AS_JSON) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("");
    console.log(`[masterLoveCodexSessions@${DATABASE}] 부분 생성 세션 집계 (읽기 전용)`);
    console.log("-".repeat(64));
    console.log(`조회한 세션            : ${summary.scanned}`);
    console.log(`모드 분포              : ${[...byMode].map(([key, count]) => `${key}=${count}`).join(" · ") || "-"}`);
    console.log(`상태 분포              : ${[...byStatus].map(([key, count]) => `${key}=${count}`).join(" · ") || "-"}`);
    console.log(`환급되어 제외          : ${summary.refundedExcluded}`);
    console.log(`매니페스트 없음(구형)  : ${summary.manifestMissing}`);
    console.log(`이상 없음              : ${summary.healthy}`);
    console.log("-".repeat(64));
    console.log(`(a) 완료 표기인데 장 누락 : ${summary.classes.a_completedButMissing}`);
    console.log(`(b) 저장된 장이 1개뿐     : ${summary.classes.b_singleChapterOnly}`);
    console.log(`(c1) 멈춤 · 이어쓰기 가능 : ${summary.classes.c1_stalledResumable} (그중 크론이 스스로 재개: ${summary.cronSelfHealing})`);
    console.log(`(c2) 멈춤 · 시도 소진     : ${summary.classes.c2_stalledExhausted}`);
    console.log(`(d) 본문 있으나 미노출    : ${summary.classes.d_savedButHidden}`);
    console.log("-".repeat(64));
    console.log(`복구 대상(합집합)        : ${summary.repairTargets}`);
    console.log(`메타데이터만으로 복구    : ${summary.metadataOnlyRepairs}  ← LLM 재호출 0`);
    console.log(`재생성이 필요한 장 합계  : ${summary.estimatedRegenerationChapters}  ← 예상 추가 LLM 호출량`);
    console.log(`오류 코드 분포           : ${[...errorCodes].map(([key, count]) => `${key}=${count}`).join(" · ") || "-"}`);
    if (summary.sessions.length) {
      console.log("-".repeat(64));
      console.log("세션별(기대/저장/노출/미완, 세션 id 는 마스킹):");
      for (const entry of summary.sessions) {
        console.log(`  ${entry.sessionId} ${entry.mode}/${entry.status} 기대${entry.expected} 저장${entry.saved} 노출${entry.exposed} 미완${entry.pending} 소진${entry.exhausted}${entry.alreadyRepaired ? " (복구됨)" : ""}`);
      }
    }
    console.log("-".repeat(64));
    console.log("이 스크립트는 아무것도 쓰지 않았습니다. 복구는 scripts/recover-master-love-codex-session.mjs --dry-run 으로 시작합니다.");
  }
} finally {
  if (connected) await mongoose.disconnect();
}
