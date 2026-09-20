#!/usr/bin/env node
/**
 * 마스터 인연의 서 — **실호출 실검증**(스테이징 DB 전용). 🔴 이 레포에서 인연의 서 경로로
 * 실제 Gemini 를 부르는 유일한 스크립트다.
 *
 * 왜 있는가: `__tests__/worker/master-love-codex-*` 는 전부 `dependencies.generateChapter`
 * 주입 mock 이라 "계약이 지켜지는가"만 본다. 이번 장애의 핵심 수정은 **여러 장이 실제로
 * 저장됐을 때 그 전부가 노출되는가**(원인 B)인데, mock 은 항상 같은 모양의 본문을 주므로
 * 실제 모델 출력이 장별 검증(assertCodexChapterQuality)을 통과한 뒤에도 노출이 살아 있는지는
 * mock 으로 알 수 없다. 그래서 한 웨이브(4장)를 실제 모델로 태워 본다.
 *
 * 🔴 절대 규칙 1: 실호출은 `--live` 뒤에 두고 **사용자의 승인 범위 안에서만** 쓴다.
 *    플래그 없이 돌리면 호출 0·DB 접속 0 으로 계획만 출력한다(예상 호출 수·모델·키 이름·판정 기준).
 * 🔴 절대 규칙 2: `--db code_destiny_staging` 만 받는다. 운영 DB 이름은 **인자로도 거부**한다 —
 *    이 스크립트는 세션을 쓰고(시드·락·저장) 지운다.
 * 🔴 결제·구매 권리를 만들지 않는다. resolveStartAccess 를 타지 않고 스테이징 DB 에 검증용
 *    세션 문서를 직접 넣는다. paymentId·billingRequestId 는 비우고 accessType 은 검증 표식이다.
 *    운영 구매 권한을 흉내 내지 않는다.
 * 🔴 개인정보 무출력: 생년월일은 합성 고정값이고, 본문은 **길이·제공자·종료 사유**만 찍는다.
 *
 * 판정 기준(2026-09-19 장애의 수정 내용에 직접 대응한다):
 *   ① 한 웨이브가 실제 본문을 검증·저장한다 (요구 ①). 실제 모델은 장 단위로 게이트에
 *     걸리므로 "항상 4장"을 요구하지 않는다 — 실패를 정상으로 위장하지 않는 것이 계약이다.
 *   ①' 시도 여력이 남은 장이 있으면 한 장이 실패해도 세션이 닫히지 않는다 (원인 A)
 *   ② 저장된 장이 **전부** `chapters` 에 노출된다 — 앞구간 절단 없음 (원인 B 직접 확인)
 *   ③ 4/20 상태가 completed·봉인·100% 가 되지 않는다 (요구 ④)
 *   ④ 응답이 전부 실제 provider 다 — staging-mock 이 하나라도 섞이면 실패 (mock 통과를
 *      실호출 검증으로 표기하지 않는다)
 *   ⑤ 환불·결제 필드가 변하지 않는다
 *
 * 사용:
 *   node --env-file=.env.local scripts/verify-master-love-codex-live.mjs --db code_destiny_staging
 *   node --env-file=.env.local scripts/verify-master-love-codex-live.mjs --db code_destiny_staging --live
 *
 * 🔴 키는 `--env-file` 로 넘긴다. 셸에서 `KEY=$(grep ...)` 로 뽑으면 .env 의 따옴표가 값에
 *    딸려 들어가 인증이 통째로 실패한다(2026-09-06 실사고). 아래 호출 계수기가 실제 HTTP
 *    호출 수를 세므로, 캐시 적중이나 인증 실패로 호출이 0 이면 "실호출 검증"으로 찍히지 않는다.
 */

import assert from "node:assert/strict";
import { connectDb, mongoose } from "../worker/lib/db.js";
import { MasterLoveCodexSession } from "../worker/lib/models.js";
import { isStagingLlmMockEnabled } from "../worker/lib/staging-llm-mock.js";
import { pickGeminiKeys, pickGeminiModels } from "../worker/lib/gemini.js";
import {
  diagnoseCodexSession,
  acquireBatchLock,
  runCodexWave,
  __masterLoveCodexTestUtils as utils,
} from "../worker/routes/master-love-codex.js";

const args = process.argv.slice(2);
const live = args.includes("--live");
const argValue = (name, fallback = "") => {
  const hit = args.find(arg => arg.startsWith(`${name}=`));
  if (hit) return hit.slice(name.length + 1);
  const idx = args.indexOf(name);
  return idx >= 0 && idx < args.length - 1 ? args[idx + 1] : fallback;
};

const DATABASE = argValue("--db");
if (DATABASE !== "code_destiny_staging") {
  throw new Error("Required: --db code_destiny_staging. 이 스크립트는 쓰기를 하므로 운영 DB 를 받지 않는다.");
}
const KEEP = args.includes("--keep");

/**
 * 승인된 실호출 예산. 올릴 수 없고 `--budget` 으로 **내리기만** 한다 — 앞선 실행이 예산의
 * 일부를 이미 태웠을 때 남은 몫만 쓰기 위한 것이다.
 */
const MAX_LIVE_CALLS = Math.min(8, Math.max(1, Number(argValue("--budget", "8")) || 8));
/** 돌릴 모드. 예산이 부족하면 한 모드만 돌린다. */
const MODES_TO_RUN = (() => {
  const picked = argValue("--mode", "both");
  if (picked === "both") return ["solo", "compat"];
  if (["solo", "compat"].includes(picked)) return [picked];
  throw new Error("--mode 는 solo | compat | both 만 받는다.");
})();
const WAVE_SIZE = Number(utils.CHAPTER_BATCH_SIZE) || 4;
const DEADLINE_MS = Math.max(60_000, Number(argValue("--deadline-ms", "300000")) || 300_000);

const GEMINI_HOST = "generativelanguage.googleapis.com";
const calls = [];

/**
 * 과금 호출 계수기 겸 차단기. Gemini 외 호스트는 전부 막고, 예산을 넘는 호출은 던진다.
 * (몽고 드라이버는 TCP 라 여기를 타지 않는다.)
 */
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(typeof input === "string" ? input : input?.url || "");
  const host = (() => { try { return new URL(url).host; } catch { return ""; } })();
  if (host !== GEMINI_HOST) {
    throw new Error(`External HTTP is blocked in this verification: ${host || "(unparsable)"}`);
  }
  if (!live) throw new Error("실호출은 --live 에서만 허용된다.");
  if (calls.length >= MAX_LIVE_CALLS) {
    throw new Error(`실호출 예산 ${MAX_LIVE_CALLS}회를 넘었다 — 중단한다.`);
  }
  const entry = { at: Date.now(), status: 0, ms: 0 };
  calls.push(entry);
  const started = Date.now();
  const response = await realFetch(input, init);
  entry.status = response.status;
  entry.ms = Date.now() - started;
  return response;
};

/** 합성 고정 입력 — 실제 고객 데이터를 쓰지 않는다. */
const SOLO_BODY = {
  birthInfo: { name: "검증", birthDate: "1990-05-15", birthTime: "13:30", gender: "female", calendarType: "solar" },
  prologueChoice: "yes",
};
const COMPAT_BODY = {
  birthInfo: SOLO_BODY.birthInfo,
  partnerInfo: { name: "상대", birthDate: "1988-11-03", birthTime: "07:10", gender: "male", calendarType: "solar" },
  prologueChoice: "partner",
};

function envForRun() {
  // 🔴 APP_ENV·STAGING_LLM_MOCK_ENABLED 를 **넣지 않는다**. isStagingLlmMockEnabled 는 넘겨받은
  //    env 객체만 보므로(worker/lib/staging-llm-mock.js), 여기서 비워 두면 스테이징 배포본의
  //    mock 플래그를 건드리지 않고도 같은 코드 경로가 실제 모델을 탄다.
  const env = {
    MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
    MONGO_DB_NAME: DATABASE,
    MONGO_SERVER_SELECTION_TIMEOUT_MS: "10000",
    MONGO_CONNECT_TIMEOUT_MS: "10000",
    MONGO_SOCKET_TIMEOUT_MS: "45000",
    MONGO_WORKER_CONNECT_GUARD_MS: "15000",
    MONGO_MAX_POOL_SIZE: "5",
    MONGO_IP_FAMILY: "4",
    MONGO_IP_FAMILY_AUTO_FALLBACK: "true",
  };
  for (const key of pickGeminiKeys()) {
    const value = String(process.env[key] || "").trim();
    if (value) env[key] = value;
  }
  return env;
}

/** startCodexSession 의 $setOnInsert 와 같은 모양으로 검증용 세션을 만든다(결제 경로는 타지 않는다). */
function seedDoc(mode, body, stamp) {
  const normalized = utils.normalizeInput(body);
  assert.equal(normalized.ok, true, `입력 정규화 실패: ${normalized.message || ""}`);
  assert.equal(normalized.mode, mode, `모드가 ${mode} 로 잡히지 않았다 — 입력 픽스처를 확인하라.`);
  const charts = utils.buildCharts(normalized);
  const modeDef = utils.resolveMode(normalized.mode);
  return {
    id: `mlc-livecheck-${stamp}-${mode}`,
    userId: `livecheck-${stamp}`,
    mode: normalized.mode,
    birthInfo: normalized.birthInfo,
    partnerInfo: normalized.partnerInfo,
    prologueChoice: normalized.prologueChoice,
    sajuResult: charts.saju,
    ziweiChart: charts.ziweiChart,
    partnerSajuResult: charts.partnerSaju,
    partnerZiweiChart: charts.partnerZiweiChart,
    compatibility: charts.compatibility,
    chapters: [],
    // 결제 식별자는 비운다. 구매 권한을 흉내 내지 않는다. accessType 은 스키마 enum 이라
    // 임의 문자열을 못 쓰고, 그중 `admin` 만이 "과금되지 않은 접근"이다 — 환불 경로도
    // 이 값을 NOT_BILLED 로 즉시 건너뛴다(refundSessionBillingIfNeeded).
    accessType: "admin",
    paymentId: "",
    billingRequestId: "",
    idempotencyKey: `livecheck-${stamp}-${mode}`,
    inputHash: normalized.inputHash,
    status: "generating",
    deliveryMeta: {
      locale: "ko",
      manifest: { mode: normalized.mode, chapterIds: modeDef.chapters.map(spec => spec.id), version: modeDef.cacheKeyExtra },
    },
    passRefund: null,
  };
}

function printPlan() {
  const soloDef = utils.resolveMode("solo");
  const compatDef = utils.resolveMode("compat");
  console.log("계획 (호출 0 · DB 접속 0)");
  console.log(`  대상 DB          : ${DATABASE}`);
  console.log(`  모드             : ${MODES_TO_RUN.join(" + ")} (solo ${soloDef.chapters.length}장 · compat ${compatDef.chapters.length}장 구성)`);
  console.log(`  웨이브 크기      : ${WAVE_SIZE}장 (CHAPTER_BATCH_SIZE / CHAPTER_CONCURRENCY)`);
  console.log(`  예상 실호출      : ${WAVE_SIZE} × ${MODES_TO_RUN.length} = ${WAVE_SIZE * MODES_TO_RUN.length}회 (상한 ${MAX_LIVE_CALLS})`);
  console.log(`  모델             : ${pickGeminiModels().join(", ")}`);
  console.log(`  키 이름          : ${pickGeminiKeys().map(key => `${key}${process.env[key] ? "(있음)" : "(없음)"}`).join(" · ")}`);
  console.log(`  판정             : ①4장 저장 ②저장=노출(절단 없음) ③completed 아님 ④mock 0건 ⑤환불필드 불변`);
  console.log("");
  console.log("실행하려면 --live 를 붙인다.");
}

async function runOne(env, mode, body, stamp) {
  const doc = seedDoc(mode, body, stamp);
  const expectedTotal = doc.deliveryMeta.manifest.chapterIds.length;
  await MasterLoveCodexSession.deleteOne({ id: doc.id });
  await MasterLoveCodexSession.create(doc);

  const lock = await acquireBatchLock(doc.id, doc.userId);
  assert.equal(lock.ok, true, `${mode}: 배치 락을 잡지 못했다.`);

  const before = calls.length;
  const started = Date.now();
  await runCodexWave(env, {
    sessionId: doc.id,
    userId: doc.userId,
    doc: lock.doc,
    lockToken: lock.lockToken,
    deadlineAt: Date.now() + DEADLINE_MS,
  });
  const elapsed = Date.now() - started;
  const liveCalls = calls.length - before;

  const saved = await MasterLoveCodexSession.findOne({ id: doc.id }).lean();
  assert.ok(saved, `${mode}: 세션을 다시 읽지 못했다.`);
  // 🔴 diagnoseCodexSession 의 saved 는 Set 이 아니라 **Map**(id → 장)이다. 펼치면 [id, 장]
  //    쌍이 나오므로 반드시 keys() 로 id 만 꺼낸다.
  const { expected, saved: validated } = diagnoseCodexSession(saved);
  const validatedIds = [...validated.keys()];
  const exposed = (saved.chapters || []).map(chapter => chapter.id);
  const providers = [...new Set((saved.chapters || []).map(chapter => String(chapter.provider || "")))];

  console.log(`[${mode}] 기대 ${expected.length}장 · 검증·저장 ${validated.size}장 · 노출 ${exposed.length}장 · 실호출 ${liveCalls}회 · ${Math.round(elapsed / 1000)}초`);
  for (const chapter of saved.chapters || []) {
    console.log(`   ${String(chapter.order).padStart(2, "0")} ${chapter.id} · ${String(chapter.body || "").length}자 · provider=${chapter.provider || "?"} · ok=${chapter.ok !== false}`);
  }
  const errors = Object.entries(saved.deliveryMeta?.errors || {}).map(([id, value]) => `${id}:${value?.code || value}`);
  if (errors.length) console.log(`   오류코드: ${errors.join(" · ")}`);
  console.log(`   status=${saved.status} · percent=${saved.generationProgress?.percent ?? "(없음)"} · step=${saved.generationProgress?.step || "(없음)"}`);

  // ④ mock 이 섞이면 실호출 검증이 아니다.
  assert.ok(!providers.includes("staging-mock"), `${mode}: staging-mock 응답이 섞였다 — 실호출 검증이 아니다.`);
  // provider 가 gemini 가 아니면(workers-ai 폴백·mock) 실제 모델 검증이 성립하지 않는다.
  assert.deepEqual(providers, ["gemini"], `${mode}: 응답 provider 가 gemini 만이 아니다 — ${providers.join(",")}`);
  // 호출 0회는 실패가 아니라 **응답 캐시 적중**일 수 있다(직전 실행이 같은 프롬프트를 태웠다).
  // 새 호출인지 재사용인지는 감추지 않고 그대로 보고한다.
  if (liveCalls === 0) console.log("   ⓘ 새 HTTP 호출 0회 — 직전 실제 gemini 응답이 캐시에서 재사용됐다.");
  // ① 한 웨이브가 실제 본문을 저장한다. 🔴 "항상 4장"을 요구하지 않는다 — 실제 모델은
  //    장 단위로 품질 게이트에 걸린다(실측: 궁합판 self 장이 LLM_PARTNER_EVIDENCE_MISSING).
  //    그 실패를 정상으로 위장하지 않는 것이 요구사항이지, 실패가 없어야 하는 게 아니다.
  assert.ok(validated.size >= 1, `${mode}: 웨이브가 한 장도 저장하지 못했다.`);
  assert.ok(validated.size <= WAVE_SIZE, `${mode}: 한 웨이브가 ${WAVE_SIZE}장을 넘겼다 — 예산을 벗어났다.`);
  // ② 저장된 장이 전부 노출된다 — 이번 장애의 원인 B 직접 확인.
  assert.deepEqual([...exposed].sort(), [...validatedIds].sort(), `${mode}: 저장은 됐는데 노출 목록이 다르다 — 앞구간 절단이 남아 있다.`);
  // ②' 중간에 구멍이 났는데도 뒷장이 남아 있으면 그게 원인 B 가 고쳐졌다는 직접 증거다.
  const orders = (saved.chapters || []).map(chapter => Number(chapter.order)).sort((a, b) => a - b);
  const contiguous = orders.every((order, index) => order === index + 1);
  if (!contiguous) console.log(`   ✔ 원인 B 직접 확인: 앞에 구멍(${orders.join(",")})이 났는데도 뒷장이 노출된다.`);
  // ③ 부분 상태가 완료로 찍히지 않는다.
  assert.notEqual(saved.status, "completed", `${mode}: ${validated.size}/${expectedTotal} 인데 completed 다.`);
  // ③' 한 장이 실패해도 책이 죽지 않는다 — 시도 여력이 남아 있으면 세션은 열려 있어야 한다.
  const attemptLimit = Number(utils.CHAPTER_ATTEMPT_LIMIT) || 3;
  const stillTryable = expected.some(spec => !validated.has(spec.id)
    && Number(saved.deliveryMeta?.attempts?.[spec.id] || 0) < attemptLimit);
  if (stillTryable) {
    assert.equal(saved.status, "generating", `${mode}: 시도 여력이 남았는데 세션이 ${saved.status} 로 닫혔다 — 원인 A 가 남아 있다.`);
    assert.notEqual(saved.deliveryMeta?.reviewRequired, true, `${mode}: 시도 여력이 남았는데 reviewRequired 가 섰다.`);
  }
  assert.ok((saved.generationProgress?.percent ?? 0) < 100, `${mode}: 부분 상태인데 100% 다.`);
  // ⑤ 결제·환불 필드 불변.
  assert.equal(saved.passRefund, null, `${mode}: passRefund 가 생겼다.`);
  assert.equal(saved.billingRefund ?? null, null, `${mode}: billingRefund 가 생겼다.`);
  assert.equal(saved.paymentId || "", "", `${mode}: paymentId 가 생겼다.`);

  return { mode, expected: expected.length, validated: validated.size, exposed: exposed.length, liveCalls, elapsed, status: saved.status, id: doc.id, expectedTotal };
}

async function main() {
  if (!live) {
    printPlan();
    return;
  }

  const env = envForRun();
  // 🔴 fail-closed: mock 이 켜져 있으면 "실호출 검증"이라는 이름으로 mock 을 통과시키게 된다.
  assert.equal(isStagingLlmMockEnabled(env), false, "staging mock 이 켜진 env 다 — 실호출 검증이 성립하지 않는다.");
  assert.ok(pickGeminiKeys().some(key => env[key]), "Gemini 키가 없다 — --env-file=.env.local 로 넘겨라.");

  await connectDb(env);
  assert.equal(mongoose.connection.name, DATABASE, `연결된 DB 가 ${DATABASE} 가 아니다: ${mongoose.connection.name}`);
  console.log(`연결: ${mongoose.connection.name} · 실호출 상한 ${MAX_LIVE_CALLS}회`);
  console.log("");

  const stamp = Date.now().toString(36);
  const results = [];
  try {
    const bodies = { solo: SOLO_BODY, compat: COMPAT_BODY };
    for (const mode of MODES_TO_RUN) {
      const body = bodies[mode];
      results.push(await runOne(env, mode, body, stamp));
      console.log("");
    }
  } finally {
    if (!KEEP) {
      const removed = await MasterLoveCodexSession.deleteMany({ id: { $regex: `^mlc-livecheck-${stamp}-` } });
      console.log(`검증 세션 정리: ${removed.deletedCount}건 삭제`);
    }
    console.log(`실호출 합계 ${calls.length}회 (상태 ${calls.map(call => call.status).join(",") || "-"} · ${calls.map(call => `${Math.round(call.ms / 1000)}s`).join(",") || "-"})`);
    await mongoose.disconnect().catch(() => {});
  }

  console.log("");
  console.log("OK — 실제 모델 응답으로 한 웨이브가 저장되고, 저장된 장이 전부 노출되며, 부분 상태가 완료로 찍히지 않는다.");
  for (const result of results) {
    console.log(`  ${result.mode}: 기대 ${result.expected} · 저장 ${result.validated} · 노출 ${result.exposed} · 실호출 ${result.liveCalls} · status=${result.status}`);
  }
  console.log(`  🔴 20장 완주는 이 검증 범위가 아니다 — 모드당 웨이브 1개(${WAVE_SIZE}장)만 태운다.`);
}

main().catch(error => {
  console.error(String(error?.message || error));
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});
