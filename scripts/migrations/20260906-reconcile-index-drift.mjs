/**
 * MongoDB 마이그레이션 — 스키마 선언과 실물 인덱스의 드리프트 정리 (재실행 가능)
 *
 * 🔴 왜: db.js 는 autoIndex:false 다. 스키마의 `index:true`·`schema.index()` 는 **아무것도 만들지
 * 않고**, 실물은 마이그레이션이 만든 것만 있다. 2026-09-06 전 모델 점검(verify:mongo-launch-indexes)
 * 에서 선언만 있고 실물이 없는 인덱스가 약 100건이었다. 그 선언들은 두 종류다:
 *   · 실제 쿼리가 선두 키로 쓰는데 실물이 없다 → 프로덕션은 지금 COLLSCAN 이다 → **만든다**
 *   · 어떤 리터럴 쿼리도 쓰지 않거나, 실물 복합 인덱스의 접두로 이미 덮인다 → 선언이 거짓말이다
 *     → 코드에서 **선언을 지운다**(이 스크립트가 아니라 같은 PR 의 models 수정)
 * 판정은 정적 COLLSCAN 가드(scripts/verify-mongo-query-index-shapes.mjs)의 쿼리 추출기와 같은 것을
 * 쓰되, 원장을 "선언" 이 아니라 **실물**로 바꿔 돌린다 — 그래서 "오늘 프로덕션에서 COLLSCAN 인 쿼리"
 * 가 나온다.
 *
 * 하는 일(`--check` = 읽기 전용):
 *   1) 4개 모델 파일의 모든 모델을 순회해 선언 인덱스와 listIndexes 를 비교(키 순서·방향까지)
 *   2) 없는 선언마다 판정: create(실물 원장으로 돌린 정적 가드의 위반을 이 선언이 해소) ·
 *      redundant-prefix(실물 인덱스 **또는 같이 만들 선언**의 접두) · unused(어느 리터럴 쿼리도 선두 키로 안 씀)
 *      같은 위반을 단일 키와 복합 키 선언이 둘 다 고치면 **더 넓은 복합만** 만든다(단일은 그 접두다).
 *      동적 필터라 추출기가 못 보는 실제 조회는 `DYNAMIC_READERS` 에 파일:줄 근거와 함께 두면 create 로
 *      강제한다 — 그 spec 이 스키마에 선언돼 있지 않으면 fail-closed 로 멈춘다.
 *   3) 실물 중복: paid_execution_records.paymentId_1 은 부분 유니크 paymentId_unique_nonempty 와
 *      키가 같다 — explain + hint 로 부분 인덱스가 등호 조회를 실제로 타는지 확인한 뒤에만 드롭 후보
 *   4) `--apply --expect <n>`: create 판정만 만들고, 3) 의 증명된 중복만 지운다. n = 그 둘의 합.
 *      unused/redundant 는 DB 에 손대지 않는다(실물이 없으니 지울 것도 없다).
 *
 * 🔴 `unused` 는 "리터럴 쿼리가 없다" 는 뜻이지 "쿼리가 없다" 가 아니다 — 동적 필터(변수로 조립)는
 *    추출기가 못 본다. 그래서 --check 는 그 컬렉션의 dynamic 호출부를 같이 찍는다. 선언을 지우기 전에
 *    그 호출부를 사람이 연다. 단 어느 쪽이든 **실물은 오늘 없으므로** 선언 삭제는 프로덕션 성능을
 *    바꾸지 않는다 — 바뀌는 것은 정적 가드가 더 이상 거짓 통과를 주지 않는다는 것뿐이다.
 *
 * 실행:
 *   node scripts/migrations/20260906-reconcile-index-drift.mjs --self-test
 *   npm run verify:reconcile-index-drift            # --check, 읽기 전용, 대기 항목 있으면 exit 1
 *   npm run migrate:reconcile-index-drift -- --apply --expect <n>
 */

import { config } from "dotenv";

const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const SELF_TEST = process.argv.includes("--self-test");
const DRY_RUN = process.argv.includes("--dry-run");

const OPERATION_ID = "20260906-reconcile-index-drift";

/** 실물 중복. 드롭은 런타임 explain 증명을 통과한 경우에만 한다(손목록이 아니라 증명이 게이트다). */
const DUPLICATE_CANDIDATES = [
  { collection: "paid_execution_records", drop: "paymentId_1", keep: "paymentId_unique_nonempty", field: "paymentId" },
];

/**
 * 정적 추출기가 못 보는 동적 필터의 실제 조회. 각 항목은 스키마에 같은 spec 이 선언돼 있어야 한다.
 * 근거는 파일:줄 — 그 줄이 사라지면 이 항목도 지운다.
 */
const DYNAMIC_READERS = [
  {
    collection: "fortuneChatSessions",
    spec: { anonymousSessionId: 1, updatedAt: -1 },
    evidence: "worker/routes/fortune-chat.js:54 비회원 bootstrap findOne({anonymousSessionId}).sort({updatedAt:-1})",
  },
];

function argValue(name, fallback = "") {
  const at = process.argv.indexOf(name);
  if (at < 0 || at + 1 >= process.argv.length) return fallback;
  return process.argv[at + 1];
}

/** mongoose 기본 이름 규칙: `a_1_b_-1` */
export function defaultIndexName(spec) {
  return Object.entries(spec).map(([key, dir]) => `${key}_${dir}`).join("_");
}

const entries = (spec) => Object.entries(spec).map(([key, dir]) => `${key}:${dir}`);

/** 키·방향·순서가 전부 같은가 */
export function sameKey(a, b) {
  return JSON.stringify(entries(a)) === JSON.stringify(entries(b));
}

/** 선언 spec 이 실물 인덱스 하나의 접두(같은 순서·방향)인가 — 그러면 선언은 군더더기다. */
export function findPrefixCover(spec, liveIndexes) {
  const want = entries(spec);
  for (const index of liveIndexes) {
    const have = entries(index.key || {});
    if (have.length <= want.length) continue;
    if (want.every((part, i) => have[i] === part)) return index.name;
  }
  return null;
}

/**
 * 한 컬렉션의 없는 선언들을 한꺼번에 판정한다(선언끼리의 관계를 봐야 해서 하나씩 못 한다).
 * items: [{ spec, ... }] · violations: 실물 원장으로 돌린 정적 가드의 위반(이 컬렉션 것만, keySets 는 가지별 키 집합)
 * forced: DYNAMIC_READERS 중 이 컬렉션 것.
 * 규칙: ① 실물 접두면 redundant-prefix ② 위반 가지에 선두 키가 있으면 create — 단 같은 가지를 더 넓은
 * 선언이 고치면 그쪽에 양보 ③ create 끼리의 접두도 redundant-prefix ④ 나머지 unused.
 */
export function classifyCollection(items, liveIndexes, violations, forced = []) {
  const width = (spec) => Object.keys(spec).length;
  const leadingOf = (spec) => Object.keys(spec)[0];
  const out = [];
  const candidates = [];
  for (const item of items) {
    const cover = findPrefixCover(item.spec, liveIndexes);
    if (cover) out.push({ ...item, verdict: "redundant-prefix", coveredBy: cover });
    else candidates.push(item);
  }
  const creates = [];
  const rest = [];
  for (const item of candidates) {
    // unique 는 조회 성능이 아니라 정합성 선언이다 — 실물이 없으면 지금 중복이 안 막힌다. 조회와 무관하게 만든다.
    if (item.options?.unique) { creates.push({ ...item, verdict: "create", fixes: ["unique 선언(정합성)"] }); continue; }
    const forcedHit = forced.find((f) => sameKey(f.spec, item.spec));
    if (forcedHit) { creates.push({ ...item, verdict: "create", fixes: [forcedHit.evidence] }); continue; }
    const leading = leadingOf(item.spec);
    const fixes = violations.filter((v) => (v.keySets || []).some((ks) => ks.has(leading)
      && !candidates.some((other) => other !== item && width(other.spec) > width(item.spec) && ks.has(leadingOf(other.spec)))));
    if (fixes.length) creates.push({ ...item, verdict: "create", fixes: fixes.map((v) => `${v.file}:${v.line}`) });
    else rest.push(item);
  }
  const declared = (except) => creates.filter((c) => c !== except).map((c) => ({ name: `(선언) ${defaultIndexName(c.spec)}`, key: c.spec }));
  for (const item of creates) {
    const cover = findPrefixCover(item.spec, declared(item));
    out.push(cover ? { ...item, verdict: "redundant-prefix", coveredBy: cover } : item);
  }
  for (const item of rest) {
    const cover = findPrefixCover(item.spec, declared(null));
    out.push(cover ? { ...item, verdict: "redundant-prefix", coveredBy: cover } : { ...item, verdict: "unused" });
  }
  return out;
}

/** createIndex 에 넘길 옵션 — 스키마 옵션 중 실물에 의미 있는 것만. */
export function indexOptions(spec, options = {}) {
  const out = { name: options.name || defaultIndexName(spec) };
  for (const key of ["unique", "sparse", "expireAfterSeconds", "partialFilterExpression"]) {
    if (options[key] !== undefined) out[key] = options[key];
  }
  return out;
}

/* ── DB 없이 도는 자체 점검 ───────────────────────────────────────────────── */
function runSelfTest() {
  const failures = [];
  const ok = (condition, message) => { if (!condition) failures.push(message); };

  ok(defaultIndexName({ userId: 1, createdAt: -1 }) === "userId_1_createdAt_-1", "기본 이름 규칙");
  ok(sameKey({ a: 1, b: -1 }, { a: 1, b: -1 }) && !sameKey({ a: 1, b: -1 }, { b: -1, a: 1 }), "키 비교는 순서를 본다");
  ok(!sameKey({ a: 1 }, { a: -1 }), "키 비교는 방향을 본다");

  const live = [{ name: "userId_1_status_1", key: { userId: 1, status: 1 } }, { name: "x_1", key: { x: 1 } }];
  ok(findPrefixCover({ userId: 1 }, live) === "userId_1_status_1", "단일 키가 복합 접두면 덮인다");
  ok(findPrefixCover({ status: 1 }, live) === null, "복합의 두 번째 키는 접두가 아니다");
  ok(findPrefixCover({ x: 1 }, live) === null, "같은 인덱스는 접두 덮음이 아니라 '있음'이다(더 긴 실물만 덮는다)");
  ok(findPrefixCover({ userId: -1 }, live) === null, "방향이 다르면 덮이지 않는다");

  const vio = [{ file: "worker/routes/a.js", line: 3, keySets: [new Set(["orderId", "status"])] }];
  const verdictOf = (spec, items, forced) => classifyCollection(items, live, vio, forced).find((it) => sameKey(it.spec, spec));
  ok(verdictOf({ orderId: 1, status: 1 }, [{ spec: { orderId: 1, status: 1 } }]).verdict === "create", "위반을 해소하는 선언은 create");
  ok(verdictOf({ status: 1 }, [{ spec: { status: 1 } }]).verdict === "create", "선두 키가 위반 가지에 있으면 create");
  ok(verdictOf({ featureKey: 1 }, [{ spec: { featureKey: 1 } }]).verdict === "unused", "어느 위반도 못 고치면 unused");
  ok(verdictOf({ userId: 1 }, [{ spec: { userId: 1 } }]).verdict === "redundant-prefix", "접두 덮음이 create 보다 먼저다");
  const pair = [{ spec: { status: 1 } }, { spec: { orderId: 1, status: 1 } }, { spec: { orderId: 1 } }];
  ok(verdictOf({ orderId: 1, status: 1 }, pair).verdict === "create", "같은 가지는 더 넓은 선언이 create");
  ok(verdictOf({ status: 1 }, pair).verdict === "unused", "더 넓은 선언이 같은 가지를 고치면 단일 키는 양보한다");
  ok(verdictOf({ orderId: 1 }, pair).verdict === "redundant-prefix" && verdictOf({ orderId: 1 }, pair).coveredBy.startsWith("(선언)"), "create 의 접두 선언은 redundant-prefix");
  const tie = [{ spec: { orderId: 1, status: 1 } }, { spec: { orderId: 1, createdAt: -1 } }];
  ok(classifyCollection(tie, live, vio).every((it) => it.verdict === "create"), "폭이 같은 복합 둘은 둘 다 create");
  const forced = [{ spec: { anon: 1, updatedAt: -1 }, evidence: "worker/routes/x.js:9" }];
  const forcedVerdict = verdictOf({ anon: 1, updatedAt: -1 }, [{ spec: { anon: 1, updatedAt: -1 } }], forced);
  ok(forcedVerdict.verdict === "create" && forcedVerdict.fixes[0] === "worker/routes/x.js:9", "DYNAMIC_READERS 는 근거를 달고 create 로 강제");
  ok(verdictOf({ id: 1 }, [{ spec: { id: 1 }, options: { unique: true } }]).verdict === "create", "unique 선언은 조회가 없어도 create");

  const opts = indexOptions({ a: 1 }, { unique: true, background: true, expireAfterSeconds: 60 });
  ok(opts.name === "a_1" && opts.unique === true && opts.expireAfterSeconds === 60 && !("background" in opts), "옵션은 의미 있는 것만 넘긴다");

  ok(!(APPLY && DRY_RUN), "--apply 와 --dry-run 을 함께 주면 쓰기를 하지 않는다");

  const total = 19;
  console.log(`[self-test] 점검 ${total}건 중 ${total - failures.length}건 통과`);
  if (failures.length) {
    for (const failure of failures) console.error(`  FAIL ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("[self-test] OK");
}

if (SELF_TEST) {
  runSelfTest();
} else {
  await runAgainstDatabase();
}

async function listLiveIndexes(collection) {
  return collection.listIndexes().toArray().catch((error) => {
    if (error?.code === 26 || /ns does not exist/i.test(String(error?.message))) return null;
    throw error;
  });
}

function planIndexName(plan) {
  if (!plan || typeof plan !== "object") return null;
  if (plan.stage === "IXSCAN" && plan.indexName) return plan.indexName;
  for (const child of [plan.inputStage, ...(plan.inputStages || [])]) {
    const found = planIndexName(child);
    if (found) return found;
  }
  return null;
}

async function runAgainstDatabase() {
  config({ path: ".env.local", quiet: true });
  config({ path: ".env", quiet: true });

  const fs = await import("node:fs");
  const path = await import("node:path");
  const { buildMongoEnv, requireMongoUri, writeBeforeImage } = await import("../lib/migration-before-image.mjs");
  const { connectDb, mongoose } = await import("../../worker/lib/db.js");
  await import("../../worker/lib/models.js");
  await import("../../worker/lib/app-store-models.js");
  await import("../../worker/lib/feedback-models.js");
  await import("../../worker/lib/review-models.js");
  const shapes = await import("../verify-mongo-query-index-shapes.mjs");

  const env = buildMongoEnv();
  requireMongoUri(env);
  const expectRaw = String(argValue("--expect", "any"));
  const expect = expectRaw === "any" ? null : Number(expectRaw);

  const models = Object.values(mongoose.models);
  if (models.length < 40) {
    console.error(`❌ 등록 모델이 ${models.length}개뿐 — 모델 파일 로드 실패 의심(fail-closed)`);
    process.exitCode = 1;
    return;
  }

  // 정적 쿼리 추출(DB 무관). 판정 원장은 아래에서 실물로 만든다.
  const { fileURLToPath } = await import("node:url");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const queries = [];
  for (const file of shapes.listSources(root)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    queries.push(...shapes.extractQueries(fs.readFileSync(file, "utf8"), { file: rel }));
  }
  const modelToCollection = {};
  for (const model of models) modelToCollection[model.modelName] = model.collection.name;

  await connectDb(env);
  try {
    const liveLedger = {};
    const liveByCollection = new Map();
    const docCount = new Map();
    const missing = []; // { collection, spec, options, model }
    for (const model of models) {
      const name = model.collection.name;
      if (liveByCollection.has(name)) continue; // 같은 컬렉션을 두 모델이 볼 수 있다
      const live = await listLiveIndexes(model.collection);
      liveByCollection.set(name, live);
      liveLedger[name] = (live || []).map((index) => Object.keys(index.key || {}));
      docCount.set(name, live ? await model.collection.estimatedDocumentCount() : -1);
    }
    for (const model of models) {
      const name = model.collection.name;
      const live = liveByCollection.get(name) || [];
      for (const [spec, options = {}] of model.schema.indexes()) {
        if (live.some((index) => sameKey(index.key || {}, spec))) continue;
        missing.push({ collection: name, spec, options, model });
      }
    }

    // 실물 원장으로 돌린 정적 가드 — 오늘 프로덕션에서 COLLSCAN 인 리터럴 쿼리.
    const judged = shapes.judge(queries, { ledger: liveLedger, modelToCollection }, []);
    const violationsByCollection = new Map();
    for (const v of judged.violations) {
      const coll = modelToCollection[v.model];
      if (!violationsByCollection.has(coll)) violationsByCollection.set(coll, []);
      violationsByCollection.get(coll).push(v);
    }
    const dynamicByCollection = new Map();
    for (const q of judged.dynamic) {
      const coll = modelToCollection[q.model];
      if (!dynamicByCollection.has(coll)) dynamicByCollection.set(coll, []);
      dynamicByCollection.get(coll).push(`${q.file}:${q.line}`);
    }

    // DYNAMIC_READERS 는 스키마 선언이 있어야 한다 — 없으면 근거 줄과 선언이 어긋난 것이다(fail-closed).
    for (const reader of DYNAMIC_READERS) {
      const model = models.find((m) => m.collection.name === reader.collection);
      const declared = model && model.schema.indexes().some(([spec]) => sameKey(spec, reader.spec));
      if (!declared) {
        console.error(`❌ DYNAMIC_READERS ${reader.collection} ${JSON.stringify(reader.spec)} 가 스키마에 선언돼 있지 않다 (${reader.evidence})`);
        process.exitCode = 1;
        return;
      }
    }

    const verdicts = { create: [], "redundant-prefix": [], unused: [] };
    const missingByCollection = new Map();
    for (const item of missing) {
      if (!missingByCollection.has(item.collection)) missingByCollection.set(item.collection, []);
      missingByCollection.get(item.collection).push(item);
    }
    for (const [coll, items] of missingByCollection) {
      const judgedItems = classifyCollection(
        items,
        liveByCollection.get(coll) || [],
        violationsByCollection.get(coll) || [],
        DYNAMIC_READERS.filter((r) => r.collection === coll),
      );
      for (const it of judgedItems) verdicts[it.verdict].push(it);
    }

    console.log(`[${OPERATION_ID}] 모델 ${models.length} · 컬렉션 ${liveByCollection.size} · 없는 선언 ${missing.length} · 실물 원장 기준 COLLSCAN 리터럴 쿼리 ${judged.violations.length}`);
    const fmtSpec = (spec) => JSON.stringify(spec);
    console.log(`\n== create (${verdicts.create.length}) — 실물이 없어 지금 COLLSCAN 인 쿼리를 이 선언이 해소한다`);
    for (const it of verdicts.create) {
      console.log(`  ${it.collection} ${fmtSpec(it.spec)} docs=${docCount.get(it.collection)} ← ${it.fixes.join(", ")}`);
    }
    console.log(`\n== redundant-prefix (${verdicts["redundant-prefix"].length}) — 실물 복합 인덱스의 접두. 코드에서 선언을 지운다`);
    for (const it of verdicts["redundant-prefix"]) console.log(`  ${it.collection} ${fmtSpec(it.spec)} ⊂ ${it.coveredBy}`);
    console.log(`\n== unused (${verdicts.unused.length}) — 어느 리터럴 쿼리도 선두 키로 안 쓴다. 코드에서 선언을 지운다(동적 호출부는 사람이 본다)`);
    const unusedByColl = new Map();
    for (const it of verdicts.unused) {
      if (!unusedByColl.has(it.collection)) unusedByColl.set(it.collection, []);
      unusedByColl.get(it.collection).push(fmtSpec(it.spec));
    }
    for (const [coll, specs] of unusedByColl) {
      const dyn = dynamicByCollection.get(coll) || [];
      console.log(`  ${coll} docs=${docCount.get(coll)}: ${specs.join(" ")}${dyn.length ? `\n      dynamic: ${dyn.join(", ")}` : ""}`);
    }
    // unique·DYNAMIC_READERS 로 만든 것도 같은 선두 키의 위반을 고친다 — fixes 문자열이 아니라 선두 키로 본다.
    const createLeading = new Map();
    for (const it of verdicts.create) {
      if (!createLeading.has(it.collection)) createLeading.set(it.collection, new Set());
      createLeading.get(it.collection).add(Object.keys(it.spec)[0]);
    }
    const leftover = judged.violations.filter((v) => {
      const leading = createLeading.get(modelToCollection[v.model]) || new Set();
      return !(v.keySets || []).some((ks) => [...leading].some((key) => ks.has(key)));
    });
    if (leftover.length) {
      console.log(`\n== 실물 원장 기준 위반인데 어느 선언도 못 고치는 쿼리 (${leftover.length}) — allowlist 사유 확인 대상`);
      for (const v of leftover) console.log(`  ${v.file}:${v.line} ${v.model}.${v.op} ${v.why}`);
    }

    // ── 실물 중복 증명 ──────────────────────────────────────────────────────
    const drops = [];
    console.log(`\n== duplicate (후보 ${DUPLICATE_CANDIDATES.length})`);
    for (const cand of DUPLICATE_CANDIDATES) {
      const live = liveByCollection.get(cand.collection) || [];
      const hasDrop = live.some((i) => i.name === cand.drop);
      const keep = live.find((i) => i.name === cand.keep);
      if (!hasDrop || !keep) { console.log(`  ${cand.collection}: ${cand.drop}=${hasDrop ? "있음" : "없음"} · ${cand.keep}=${keep ? "있음" : "없음"} → 할 일 없음`); continue; }
      const collection = mongoose.connection.db.collection(cand.collection);
      const sample = await collection.findOne({ [cand.field]: { $gt: "" } }, { projection: { [cand.field]: 1 } });
      if (!sample) { console.log(`  ${cand.collection}: ${cand.field} 가 비어 있지 않은 문서가 없어 증명 불가 → 드롭하지 않음`); continue; }
      let usable = false;
      let detail = "";
      try {
        const explain = await collection.find({ [cand.field]: sample[cand.field] }).hint(cand.keep).explain("queryPlanner");
        const chosen = planIndexName(explain?.queryPlanner?.winningPlan);
        usable = chosen === cand.keep;
        detail = `hint 플랜 인덱스=${chosen || "(없음)"}`;
      } catch (error) {
        detail = `hint 거부: ${String(error?.message || error).slice(0, 120)}`;
      }
      const literal = queries.filter((q) => modelToCollection[q.model] === cand.collection && q.keySets?.some((ks) => ks.has(cand.field)));
      console.log(`  ${cand.collection}: ${detail} · ${cand.field} 리터럴 조회 ${literal.length}곳 → ${usable ? `DROP ${cand.drop}` : "드롭하지 않음"}`);
      if (usable) drops.push({ ...cand, collectionHandle: collection });
    }

    const pending = verdicts.create.length + drops.length;
    if (pending === 0 && verdicts["redundant-prefix"].length === 0 && verdicts.unused.length === 0) {
      console.log("\nRESULT OK");
      return;
    }
    if (CHECK || DRY_RUN || !APPLY) {
      console.log("\n🔍 읽기 전용 — 아무것도 쓰지 않았습니다.");
      console.log(`   DB 에 적용할 것: create ${verdicts.create.length} + drop ${drops.length} = ${pending}`);
      if (pending) console.log(`   적용: npm run migrate:reconcile-index-drift -- --apply --expect ${pending}`);
      if (verdicts["redundant-prefix"].length || verdicts.unused.length) {
        console.log(`   코드에서 지울 선언: ${verdicts["redundant-prefix"].length + verdicts.unused.length}건(위 목록)`);
      }
      console.log("RESULT PENDING");
      if (CHECK) process.exitCode = 1;
      return;
    }
    if (expect !== null && pending !== expect) {
      console.error(`\n❌ 기대 ${expect}건과 다릅니다(실제 ${pending}건). 다시 --check 로 확인한 뒤 실행하세요.`);
      process.exitCode = 1;
      return;
    }
    if (pending === 0) {
      console.log("\nDB 에 적용할 것이 없습니다(코드 선언만 남았습니다).");
      console.log("RESULT PENDING");
      process.exitCode = 1;
      return;
    }

    // before-image: 손대는 컬렉션의 실물 인덱스 정의(개인정보 없음)
    const touched = new Set([...verdicts.create.map((it) => it.collection), ...drops.map((d) => d.collection)]);
    const image = [...touched].map((coll) => ({ _id: coll, indexes: liveByCollection.get(coll) || [] }));
    const imagePath = writeBeforeImage(OPERATION_ID, image, { creates: verdicts.create.length, drops: drops.length });
    console.log(`\n  before-image: ${imagePath}`);

    for (const it of verdicts.create) {
      const options = indexOptions(it.spec, it.options);
      const created = await it.model.collection.createIndex(it.spec, options);
      console.log(`  created ${it.collection} ${created}`);
    }
    for (const d of drops) {
      await d.collectionHandle.dropIndex(d.drop);
      console.log(`  dropped ${d.collection} ${d.drop}`);
    }

    // 자체 검증: 만든 것은 있고, 지운 것은 없다.
    let bad = 0;
    for (const it of verdicts.create) {
      const live = (await listLiveIndexes(it.model.collection)) || [];
      if (!live.some((index) => sameKey(index.key || {}, it.spec))) { bad += 1; console.error(`  ❌ 없음: ${it.collection} ${fmtSpec(it.spec)}`); }
    }
    for (const d of drops) {
      const live = (await listLiveIndexes(d.collectionHandle)) || [];
      if (live.some((index) => index.name === d.drop)) { bad += 1; console.error(`  ❌ 남아 있음: ${d.collection} ${d.drop}`); }
    }
    if (bad) { process.exitCode = 1; return; }
    console.log("RESULT OK");
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}
