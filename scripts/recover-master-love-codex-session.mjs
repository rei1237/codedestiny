/**
 * 마스터 인연의 서 — 부분 생성 세션 복구. **--dry-run 이 기본이고 --apply 없이는 쓰지 않는다.**
 *
 * 2026-09-19 수정 이전에 만들어진 결과를 지금 규칙으로 되돌린다.
 *   · 본문은 있는데 노출이 안 되는 장을 `chapters` 에 되살린다          → LLM 재호출 0
 *   · 완료 표기인데 장이 빠진 세션을 생성 중으로 되돌린다                → 이어쓰기가 마저 쓴다
 *   · 한 장의 시도 소진으로 닫힌 세션의 reviewRequired 를 푼다           → 남은 장을 다시 쓴다
 *   · --reset-attempts 를 줄 때만 소진된 장의 시도 기록을 지운다          → 추가 LLM 호출 발생
 *   · --metadata-only 는 위 첫 줄만 한다(닫힌 세션을 열지 않는다)         → LLM 재호출 0
 *
 * 🔴 결제·구매 권리는 건드리지 않는다. `paymentId`·`billingRequestId`·`accessType` 은
 *    **가져오지도 않는다**(select 에서 제외). 환급된 세션은 DB 필터에서 걸러지므로
 *    `passRefund`·`billingRefund` 의 내용도 이 프로세스로 오지 않는다 — 환급분을 공짜로
 *    완성시키지 않기 위한 제외 조건일 뿐, 어떤 경로에서도 쓰지 않는다.
 *
 * 🔴 판정은 서버·크론과 같은 diagnoseCodexSession 하나를 쓴다. 기대 장 목록은 세션에 고정된
 *    manifest(없으면 구매 당시 모드 표)에서 오고, **지금 저장된 장 수로 역산하지 않는다.**
 *
 * 🔴 읽을 수 있던 장을 줄이지 않는다. 새로 계산한 노출 목록이 현재보다 짧으면 그 세션은
 *    손대지 않고 needs-confirmation 으로 분리한다(fail-closed).
 *
 * 🔴 되돌릴 수 있게 한다. 변경 전 상태(status·노출 장 id·attempts/failures/errors·진행 상태)를
 *    `deliveryMeta.repairSnapshot` 에 **한 번만** 기록하고, --apply 때는 같은 내용을 레포의 기존
 *    장치인 writeBeforeImage 로 backups/migrations 에도 남긴다(문서 안/밖 두 경로에서 롤백 가능).
 *    본문은 이 스크립트가 지우지 않으므로 스냅샷에 담지 않는다(개인 데이터 최소화).
 *
 * 🔴 중복 실행 안전: 갱신은 읽은 시점의 updatedAt 을 필터에 넣은 조건부 쓰기다. 그 사이 세션이
 *    바뀌었으면 아무것도 쓰지 않고 멈춘다. 이미 복구된 세션은 계획이 비어 건너뛴다.
 *
 * 🔴 본문·이름·생년월일·결제 정보를 출력하지 않는다. 세션 id 는 기본 마스킹이다.
 *
 * 실행:
 *   node scripts/recover-master-love-codex-session.mjs --db code_destiny_staging --all --dry-run
 *   node scripts/recover-master-love-codex-session.mjs --db code_destiny_staging --session mlc-... --apply
 */

import assert from "node:assert/strict";
import { config } from "dotenv";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { MasterLoveCodexSession } from "../worker/lib/models.js";
import { diagnoseCodexSession, __masterLoveCodexTestUtils } from "../worker/routes/master-love-codex.js";
import { buildMongoEnv, requireMongoUri, writeBeforeImage } from "./lib/migration-before-image.mjs";
import { planCodexRepair, plannedFields } from "./lib/master-love-codex-repair.mjs";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const DATABASE = argValue("--db", "");
const SESSION_ID = argValue("--session", "");
const ALL = process.argv.includes("--all");
const APPLY = process.argv.includes("--apply");
const RESET_ATTEMPTS = process.argv.includes("--reset-attempts");
// 노출 복구만 승인되고 재생성 승인이 아직 없을 때 쓴다 — 이 모드의 변경은 LLM 을 부르지 않는다.
const METADATA_ONLY = process.argv.includes("--metadata-only");
const AS_JSON = process.argv.includes("--json");
const WITH_IDS = process.argv.includes("--with-ids");
const LIMIT = Math.max(1, Math.floor(Number(argValue("--limit", 25))) || 25);
const SCAN_CAP = Math.max(LIMIT, Math.floor(Number(argValue("--scan", 500))) || 500);

if (!["code_destiny_staging", "code_destiny"].includes(DATABASE)) {
  throw new Error("Required: --db code_destiny_staging | code_destiny (no default — pick the target explicitly).");
}
if ((SESSION_ID && ALL) || (!SESSION_ID && !ALL)) {
  throw new Error("Required: exactly one of --session <id> or --all. Add --apply only after inspecting the dry-run.");
}

// 복구는 LLM·PG 를 부르지 않는다. 실수로라도 외부 호출이 섞이면 과금이 발생하므로 차단한다.
globalThis.fetch = () => { throw new Error("External HTTP is forbidden in recovery."); };

const LOCK_TTL_MS = Number(__masterLoveCodexTestUtils?.BATCH_LOCK_TTL_MS) || 120000;

/** 이 스크립트가 가져오는 필드 — 결제·개인 정보는 애초에 읽지 않는다. */
const SELECT_FIELDS = "id userId mode status chapters deliveryMeta generationProgress generationError totalCharCount updatedAt";

function maskSessionId(id) {
  const text = String(id || "");
  return WITH_IDS ? text : text.length <= 12 ? text : `${text.slice(0, 8)}…${text.slice(-4)}`;
}

/** 계획은 scripts/lib 의 순수 함수 하나가 만든다 — 테스트와 운영이 같은 규칙을 본다. */
function planRepair(doc, now) {
  return planCodexRepair(doc, {
    diagnose: diagnoseCodexSession,
    now,
    resetAttempts: RESET_ATTEMPTS,
    metadataOnly: METADATA_ONLY,
    lockTtlMs: LOCK_TTL_MS,
  });
}

/** 조건부 쓰기 — 읽은 뒤 세션이 바뀌었으면 아무것도 쓰지 않는다. */
async function applyRepair(doc, plan) {
  const update = { $set: plan.set, ...(plan.unset ? { $unset: plan.unset } : {}) };
  const result = await MasterLoveCodexSession.updateOne({
    id: doc.id,
    userId: doc.userId,
    updatedAt: doc.updatedAt,
    "passRefund.refundedAt": { $exists: false },
    "billingRefund.refundedAt": { $exists: false },
  }, update);
  if (result.modifiedCount !== 1) {
    throw new Error(`세션이 그 사이 바뀌었다 — 다시 조회한 뒤 복구하라 (${maskSessionId(doc.id)}).`);
  }
}

// DB 이름은 환경변수가 아니라 --db 에서만 온다 — 어느 DB 를 고치는지 매번 손으로 고르게 한다.
const env = {
  ...buildMongoEnv(),
  MONGO_DB_NAME: DATABASE,
  MONGODB_DB_NAME: DATABASE,
  MONGO_WORKER_CONNECT_GUARD_MS: process.env.MONGO_WORKER_CONNECT_GUARD_MS || "15000",
};
requireMongoUri(env);

let connected = false;
try {
  await connectDb(env);
  connected = true;
  assert.equal(mongoose.connection.name, DATABASE);

  const now = Date.now();
  // 환급된 세션은 여기서 걸러진다 — 환급 필드는 이 프로세스로 오지 않는다.
  const filter = {
    "passRefund.refundedAt": { $exists: false },
    "billingRefund.refundedAt": { $exists: false },
    ...(SESSION_ID ? { id: SESSION_ID } : {}),
  };

  const planned = [];
  const blocked = [];
  let scanned = 0;

  const cursor = MasterLoveCodexSession.find(filter).select(SELECT_FIELDS).sort({ updatedAt: -1 }).lean().cursor();
  for await (const doc of cursor) {
    scanned += 1;
    const plan = planRepair(doc, now);
    if (plan.set) planned.push({ doc, plan });
    else if (plan.blocked && plan.blocked !== "nothing-to-do") blocked.push(plan);
    if (planned.length >= LIMIT || scanned >= SCAN_CAP) break;
  }
  await cursor.close().catch(() => {});

  if (SESSION_ID && !scanned) throw new Error("대상 세션을 찾지 못했다(환급된 세션이거나 id 가 다르다).");

  let applied = 0;
  let beforeImage = "";
  if (APPLY && planned.length) {
    // 쓰기 전에 롤백 근거부터 남긴다. 실패하면 여기서 멈추고 아무것도 쓰지 않는다.
    beforeImage = writeBeforeImage(
      `master-love-codex-repair-${DATABASE}`,
      planned.map(({ doc, plan }) => ({
        _id: String(doc._id || doc.id),
        id: doc.id,
        status: doc.status || "",
        updatedAt: doc.updatedAt,
        chapterIds: (doc.chapters || []).map(row => row.id),
        totalCharCount: Number(doc.totalCharCount || 0),
        deliveryMeta: {
          reviewRequired: doc.deliveryMeta?.reviewRequired ?? null,
          reviewReason: doc.deliveryMeta?.reviewReason || "",
          attempts: doc.deliveryMeta?.attempts || {},
          failures: doc.deliveryMeta?.failures || {},
          errors: doc.deliveryMeta?.errors || {},
        },
        generationProgress: doc.generationProgress || null,
        willChange: plannedFields(plan),
      })),
      { database: DATABASE, resetAttempts: RESET_ATTEMPTS, script: "recover-master-love-codex-session" },
    );
    for (const { doc, plan } of planned) {
      await applyRepair(doc, plan);
      applied += 1;
    }
  }

  const summary = {
    database: DATABASE,
    generatedAt: new Date(now).toISOString(),
    mode: APPLY ? "apply" : "dry-run",
    scope: METADATA_ONLY ? "metadata-only" : "full",
    resetAttempts: RESET_ATTEMPTS,
    scanned,
    planned: planned.length,
    applied,
    blocked: blocked.length,
    estimatedRegenerationChapters: planned.reduce((sum, row) => sum + row.plan.regenerationChapters, 0),
    changedFields: [...new Set(planned.flatMap(row => plannedFields(row.plan)))].sort(),
    beforeImage: beforeImage || null,
    sessions: planned.map(({ plan }) => ({
      sessionId: maskSessionId(plan.sessionId),
      mode: plan.mode,
      status: plan.status,
      expected: plan.expected,
      saved: plan.saved,
      exposed: `${plan.exposedBefore}→${plan.exposedAfter}`,
      pending: plan.pending,
      exhausted: plan.exhausted,
      regenerationChapters: plan.regenerationChapters,
      actions: plan.actions,
    })),
    needsConfirmation: blocked.map(plan => ({
      sessionId: maskSessionId(plan.sessionId),
      mode: plan.mode,
      status: plan.status,
      reason: plan.blocked,
      expected: plan.expected,
      saved: plan.saved,
      exposed: `${plan.exposedBefore}→${plan.exposedAfter}`,
      exhausted: plan.exhausted,
    })),
  };

  if (AS_JSON) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("");
    console.log(`[masterLoveCodexSessions@${DATABASE}] 복구 ${summary.mode} · ${summary.scope}${RESET_ATTEMPTS ? " (+시도 기록 초기화)" : ""}`);
    console.log("-".repeat(64));
    console.log(`조회한 세션        : ${summary.scanned}`);
    console.log(`복구 계획          : ${summary.planned}`);
    console.log(`실제 반영          : ${summary.applied}${APPLY ? "" : "  ← --apply 없이는 쓰지 않는다"}`);
    console.log(`보류(사람 확인)    : ${summary.blocked}`);
    console.log(`예상 추가 LLM 장 수: ${summary.estimatedRegenerationChapters}`);
    console.log(`변경 필드          : ${summary.changedFields.join(", ") || "-"}`);
    if (summary.sessions.length) {
      console.log("-".repeat(64));
      for (const row of summary.sessions) {
        console.log(`  ${row.sessionId} ${row.mode}/${row.status} 기대${row.expected} 저장${row.saved} 노출${row.exposed} 미완${row.pending} → ${row.actions.join(" · ") || "-"}`);
      }
    }
    if (summary.needsConfirmation.length) {
      console.log("-".repeat(64));
      console.log("보류 — 사람 확인 필요:");
      for (const row of summary.needsConfirmation) {
        console.log(`  ${row.sessionId} ${row.mode}/${row.status} ${row.reason} (기대${row.expected} 저장${row.saved} 노출${row.exposed} 소진${row.exhausted})`);
      }
    }
    console.log("-".repeat(64));
    console.log(APPLY
      ? `복구 전 상태: deliveryMeta.repairSnapshot${beforeImage ? ` · ${beforeImage}` : ""}. 결제·구매 권리는 변경하지 않았습니다.`
      : "아무것도 쓰지 않았습니다. 위 계획을 확인한 뒤 --apply 를 붙여 실행하세요.");
  }
} finally {
  if (connected) await mongoose.disconnect();
}
