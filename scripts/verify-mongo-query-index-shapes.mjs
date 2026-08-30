#!/usr/bin/env node
/**
 * 정적 COLLSCAN 가드 — 요청 경로의 Mongo 쿼리 리터럴이 선언 인덱스의 선두 키를 쓰는지 검사한다.
 *
 * 왜 (계획 db-wild-beaver 4단계, docs/db-query-plans-2026-08-30.md):
 *   CI 러너에는 DB 가 없어 explain 을 못 돌린다. 08-30 실측에서 요청 경로 COLLSCAN 은
 *   `users {referralCode}`(auth.js:186) 하나였지만, 그건 그날의 스냅샷일 뿐이다 — 새 라우트가
 *   인덱스 없는 필드로 find 를 추가해도 아무것도 안 잡는다. 이 가드는 그 "다음 referralCode" 를
 *   PR 단계에서 잡는다.
 *
 * 무엇을 보는가:
 *   · 원장: worker/lib/models.js 를 실제로 import 해 `schema.indexes()` 를 읽는다(필드 단위
 *     `index:true`/`unique:true` 까지 포함). 거기에 scripts/migrations/*.mjs 의 createIndex 리터럴을
 *     더한다(파일명에 `drop` 이 든 것은 제외 — 만드는 게 아니라 지우는 스크립트다).
 *   · 쿼리: worker/routes/** · worker/lib/** 를 acorn 으로 파싱해 models.js 에서 import 한 모델의
 *     find/findOne/countDocuments/distinct/updateOne/…/aggregate($match) 첫 필터 인자를 뽑는다.
 *   · 판정: 필터의 최상위 키 집합(`$and` 는 합집합, `$or` 는 가지마다 따로)이 `_id` 를 갖거나,
 *     그 컬렉션의 어떤 인덱스든 **선두 키**를 포함하면 통과(ESR 순서·복합 접두 길이는 보지 않는다 —
 *     선두 키가 있으면 IXSCAN 은 가능하다). 리터럴이 아닌 필터(식별자·스프레드·계산 키·`$expr`)는
 *     `dynamic` 으로 목록에 찍되 실패시키지 않는다.
 *
 * fail-closed(원칙 10): 통과하지 못한 쿼리는 config/mongo-query-index-allowlist.json 에 **사유와 함께**
 * 있어야 한다. 사유 없는 항목·현재 코드에 없는 낡은 항목·중복 항목은 그 자체로 실패다.
 * 원장에 컬렉션이 아예 없으면(모델이 아닌 원시 collection("…") 호출은 `raw` 로 분류) 역시 실패다.
 *
 * 실행: node scripts/verify-mongo-query-index-shapes.mjs [--report] [--self-test]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_REL = "config/mongo-query-index-allowlist.json";
const SCAN_DIRS = ["worker/routes", "worker/lib"];
const MIGRATION_DIR = "scripts/migrations";

/** 첫 인자가 필터인 메서드. distinct 는 두 번째 인자, aggregate 는 첫 $match. */
const FILTER_FIRST = new Set([
  "find", "findOne", "findOneAndUpdate", "findOneAndDelete", "findOneAndReplace",
  "updateOne", "updateMany", "deleteOne", "deleteMany", "replaceOne",
  "countDocuments", "count", "exists",
]);
const BY_ID = new Set(["findById", "findByIdAndUpdate", "findByIdAndDelete"]);

// ── 원장 ────────────────────────────────────────────────────────────────────

/** 마이그레이션 원문에서 `createIndex({ … }` 의 첫 객체 리터럴 키만 뽑는다(표 구동형은 `spec: { … }`). */
export function extractMigrationIndexKeys(source) {
  const out = [];
  const re = /(?:createIndex\(\s*|\bspec:\s*)(\{)/g;
  let m;
  while ((m = re.exec(source))) {
    const start = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = start; i < source.length; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") { depth -= 1; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    try {
      const expr = acorn.parseExpressionAt(`(${source.slice(start, end + 1)})`, 0, { ecmaVersion: "latest" });
      const keys = objectKeys(expr);
      if (keys) out.push(keys);
    } catch { /* 리터럴이 아니면 건너뛴다 */ }
  }
  return out;
}

/** 마이그레이션 한 파일이 어느 컬렉션들을 겨냥하는지 — models.js import 명 + collection("…") 리터럴. */
function migrationCollections(source, modelToCollection) {
  const names = new Set();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*models\.js["']/g;
  let m;
  while ((m = importRe.exec(source))) {
    for (const part of m[1].split(",")) {
      const ident = part.trim().split(/\s+as\s+/).pop();
      if (ident && modelToCollection[ident]) names.add(modelToCollection[ident]);
    }
  }
  const collRe = /collection\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = collRe.exec(source))) names.add(m[1]);
  return Array.from(names);
}

function objectKeys(node) {
  if (!node || node.type !== "ObjectExpression") return null;
  const keys = [];
  for (const p of node.properties) {
    if (p.type !== "Property" || p.computed) return null;
    keys.push(p.key.type === "Identifier" ? p.key.name : String(p.key.value));
  }
  return keys;
}

/**
 * 원장 = { 컬렉션명: [[선두키, …], …] }. models.js 는 실제로 import 한다(연결은 열지 않는다 —
 * mongoose.model() 은 스키마 등록만 한다).
 */
export async function loadLedger({ root = ROOT } = {}) {
  const ledger = {};
  const modelToCollection = {};
  // models.js 하나가 아니다 — review-models.js · feedback-models.js · app-store-models.js 도 모델을 내보낸다.
  // 추출기의 import 매칭(/models\.js$/)과 같은 규칙으로 발견해야 원장과 쿼리가 같은 집합을 본다.
  const libDir = path.join(root, "worker/lib");
  for (const file of fs.readdirSync(libDir).filter((f) => /models\.js$/.test(f)).sort()) {
    const models = await import(pathToFileURL(path.join(libDir, file)).href);
    for (const [name, value] of Object.entries(models)) {
      if (!value || !value.modelName || !value.collection) continue;
      const coll = value.collection.name;
      modelToCollection[name] = coll;
      ledger[coll] = ledger[coll] || [];
      for (const [spec] of value.schema.indexes()) ledger[coll].push(Object.keys(spec));
    }
  }
  const migDir = path.join(root, MIGRATION_DIR);
  const migrationNotes = [];
  for (const file of fs.readdirSync(migDir).filter((f) => f.endsWith(".mjs") && !/drop/i.test(f)).sort()) {
    const source = fs.readFileSync(path.join(migDir, file), "utf8");
    const specs = extractMigrationIndexKeys(source);
    if (specs.length === 0) continue;
    const colls = migrationCollections(source, modelToCollection);
    if (colls.length !== 1) { migrationNotes.push(`${file}: 컬렉션 ${colls.length}개 → 리터럴 ${specs.length}건 귀속 불가(원장에 넣지 않음)`); continue; }
    ledger[colls[0]] = ledger[colls[0]] || [];
    ledger[colls[0]].push(...specs);
  }
  return { ledger, modelToCollection, migrationNotes };
}

// ── 쿼리 추출 ───────────────────────────────────────────────────────────────

const union = (...sets) => new Set(sets.flatMap((s) => Array.from(s)));

/**
 * 필터 객체 리터럴 → 키 집합 배열(가지 하나당 하나). 리터럴이 아니면 null(dynamic).
 * `$and` 는 합집합, `$or` 는 가지별, 그 밖의 `$` 연산자(`$expr`·`$text`·`$where`…)는 dynamic.
 */
export function filterKeySets(node) {
  if (!node || node.type !== "ObjectExpression") return null;
  let base = new Set();
  let branches = null;
  for (const p of node.properties) {
    if (p.type !== "Property" || p.computed) return null;
    const key = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
    if (key === "$and" || key === "$or") {
      if (p.value.type !== "ArrayExpression") return null;
      const parts = [];
      for (const el of p.value.elements) {
        const ks = filterKeySets(el);
        if (!ks) return null;
        parts.push(ks);
      }
      if (key === "$and") {
        for (const ks of parts) {
          if (ks.length === 1) base = union(base, ks[0]);
          else if (!branches) branches = ks;
          else branches = branches.flatMap((b) => ks.map((k) => union(b, k)));
        }
      } else {
        const flat = parts.flat();
        branches = branches ? branches.flatMap((b) => flat.map((k) => union(b, k))) : flat;
      }
      continue;
    }
    if (key.startsWith("$")) return null;
    // `{ arr: { $elemMatch: { sub: … } } }` 는 다중키 인덱스 `arr.sub` 를 탄다(08-30 실측 monthly-credit-expiry IXSCAN).
    const elem = p.value.type === "ObjectExpression" && p.value.properties.length === 1 ? p.value.properties[0] : null;
    if (elem && elem.type === "Property" && !elem.computed && (elem.key.name === "$elemMatch" || elem.key.value === "$elemMatch")) {
      const subKeys = objectKeys(elem.value);
      if (!subKeys) return null;
      for (const sub of subKeys) if (!sub.startsWith("$")) base.add(`${key}.${sub}`);
      continue;
    }
    base.add(key);
  }
  return (branches || [new Set()]).map((b) => union(base, b));
}

/** import { A, B as C } from "…/models.js" → { 로컬명: 내보낸 이름 } */
function modelBindings(ast) {
  const map = {};
  for (const node of ast.body) {
    if (node.type !== "ImportDeclaration" || !/models\.js$/.test(node.source.value)) continue;
    for (const s of node.specifiers) if (s.type === "ImportSpecifier") map[s.local.name] = s.imported.name;
  }
  return map;
}

/** `Model.op(`, `Model.collection.op(` 의 (모델 로컬명, op) — 아니면 null. */
function calleeModel(callee, bindings) {
  if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return null;
  const op = callee.property.name;
  let obj = callee.object;
  if (obj.type === "MemberExpression" && !obj.computed && obj.property.type === "Identifier" && obj.property.name === "collection") obj = obj.object;
  if (obj.type !== "Identifier" || !bindings[obj.name]) return null;
  return { model: bindings[obj.name], op };
}

/** 원시 `….collection("name").op(` */
function calleeRaw(callee) {
  if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return null;
  const obj = callee.object;
  if (obj.type !== "CallExpression" || obj.callee.type !== "MemberExpression" || obj.callee.computed) return null;
  if (obj.callee.property.name !== "collection" || obj.arguments.length !== 1 || obj.arguments[0].type !== "Literal") return null;
  return { collection: String(obj.arguments[0].value), op: callee.property.name };
}

/**
 * 한 파일의 쿼리 호출 목록. 각 항목: { file, line, model|collection, op, keySets|null, kind }
 * kind: "literal" | "dynamic" | "raw" | "byId"
 */
export function extractQueries(source, { file }) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
  const bindings = modelBindings(ast);
  const out = [];
  walk.simple(ast, {
    CallExpression(node) {
      const raw = calleeRaw(node.callee);
      if (raw && (FILTER_FIRST.has(raw.op) || raw.op === "distinct" || raw.op === "aggregate")) {
        out.push({ file, line: node.loc.start.line, collection: raw.collection, op: raw.op, keySets: null, kind: "raw" });
        return;
      }
      const hit = calleeModel(node.callee, bindings);
      if (!hit) return;
      const { model, op } = hit;
      let filterNode;
      if (BY_ID.has(op)) { out.push({ file, line: node.loc.start.line, model, op, keySets: [new Set(["_id"])], kind: "byId" }); return; }
      if (FILTER_FIRST.has(op)) filterNode = node.arguments[0];
      else if (op === "distinct") filterNode = node.arguments[1];
      else if (op === "aggregate") {
        const stages = node.arguments[0];
        const first = stages && stages.type === "ArrayExpression" ? stages.elements[0] : null;
        const match = first && first.type === "ObjectExpression"
          ? first.properties.find((p) => p.type === "Property" && !p.computed && (p.key.name === "$match" || p.key.value === "$match"))
          : null;
        if (!match) { out.push({ file, line: node.loc.start.line, model, op, keySets: null, kind: "dynamic" }); return; }
        filterNode = match.value;
      } else return;
      // 인자 없는 find()/countDocuments() 는 빈 필터 = 전체 스캔이다.
      const keySets = filterNode === undefined ? [new Set()] : filterKeySets(filterNode);
      out.push({ file, line: node.loc.start.line, model, op, keySets, kind: keySets ? "literal" : "dynamic" });
    },
  });
  return out;
}

// ── 판정 ────────────────────────────────────────────────────────────────────

export function queryId(q) {
  const target = q.model || q.collection;
  const shape = q.keySets ? q.keySets.map((s) => `{${Array.from(s).sort().join(",")}}`).join("|") : "dynamic";
  return `${q.file}::${target}.${q.op}::${shape}`;
}

function branchIndexed(keys, indexes) {
  if (keys.has("_id")) return true;
  return indexes.some((idx) => idx.length > 0 && keys.has(idx[0]));
}

/**
 * queries + ledger + allowlist → { indexed, dynamic, raw, allowlisted, violations, allowlistErrors }
 * allowlist: [{ id, reason }]
 */
export function judge(queries, { ledger, modelToCollection }, allowlist) {
  const result = { indexed: [], dynamic: [], raw: [], allowlisted: [], violations: [], allowlistErrors: [] };
  const seen = new Map();
  for (const entry of allowlist) {
    if (!entry || typeof entry.id !== "string") { result.allowlistErrors.push(`id 없는 항목: ${JSON.stringify(entry)}`); continue; }
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 8) result.allowlistErrors.push(`사유 없음(8자 미만): ${entry.id}`);
    if (seen.has(entry.id)) result.allowlistErrors.push(`중복: ${entry.id}`);
    seen.set(entry.id, false);
  }
  for (const q of queries) {
    const id = queryId(q);
    if (q.kind === "raw") { result.raw.push({ ...q, id }); continue; }
    if (q.kind === "dynamic") { result.dynamic.push({ ...q, id }); continue; }
    const coll = modelToCollection[q.model];
    const indexes = coll ? ledger[coll] : null;
    let ok = false;
    let why = "";
    if (!indexes) why = `원장에 컬렉션 없음 (model=${q.model})`;
    else {
      const bad = q.keySets.find((ks) => !branchIndexed(ks, indexes));
      ok = !bad;
      if (!ok) why = bad.size === 0 ? "빈 필터(전체 스캔)" : `선두 키 불일치: {${Array.from(bad).join(",")}} vs 인덱스 선두 [${Array.from(new Set(indexes.map((i) => i[0]))).join(", ")}]`;
    }
    if (ok) { result.indexed.push({ ...q, id }); continue; }
    if (seen.has(id)) { seen.set(id, true); result.allowlisted.push({ ...q, id, why }); continue; }
    result.violations.push({ ...q, id, why });
  }
  for (const [id, used] of seen) if (!used) result.allowlistErrors.push(`낡은 항목(현재 코드에 없음): ${id}`);
  return result;
}

// ── 실행 ────────────────────────────────────────────────────────────────────

function listSources(root) {
  const files = [];
  const visit = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) visit(full);
      else if (/\.(js|mjs)$/.test(ent.name)) files.push(full);
    }
  };
  for (const rel of SCAN_DIRS) visit(path.join(root, rel));
  return files.sort();
}

export function readAllowlist(root = ROOT) {
  const file = path.join(root, ALLOWLIST_REL);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

async function main() {
  const report = process.argv.includes("--report");
  const { ledger, modelToCollection, migrationNotes } = await loadLedger();
  const queries = [];
  for (const file of listSources(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    queries.push(...extractQueries(fs.readFileSync(file, "utf8"), { file: rel }));
  }
  const r = judge(queries, { ledger, modelToCollection }, readAllowlist());
  const line = (q) => `  ${q.file}:${q.line}  ${q.model || q.collection}.${q.op}  ${q.why || ""}`;

  console.log(`[mongo-query-index-shapes] 파일 ${listSources(ROOT).length} · 쿼리 ${queries.length} · indexed ${r.indexed.length} · dynamic ${r.dynamic.length} · raw ${r.raw.length} · allowlisted ${r.allowlisted.length} · 위반 ${r.violations.length}`);
  for (const note of migrationNotes) console.log(`  (원장 주의) ${note}`);
  if (report) {
    console.log("\n[dynamic — 리터럴 아님, 검사 밖]"); r.dynamic.forEach((q) => console.log(line(q)));
    console.log("\n[raw — collection(\"…\") 직접 호출, 검사 밖]"); r.raw.forEach((q) => console.log(line(q)));
    console.log("\n[allowlisted]"); r.allowlisted.forEach((q) => console.log(line(q)));
  }
  if (queries.length === 0) { console.error("❌ 쿼리를 하나도 찾지 못했다 — 추출기가 죽었다(fail-closed)."); process.exit(1); }
  if (r.allowlistErrors.length) { console.error(`❌ ${ALLOWLIST_REL} 오류:`); r.allowlistErrors.forEach((e) => console.error(`  ${e}`)); }
  if (r.violations.length) {
    console.error("❌ 선언 인덱스 선두 키를 쓰지 않는 쿼리 — 인덱스를 선언하거나(models.js + 마이그레이션) 사유와 함께 allowlist 에 넣을 것:");
    r.violations.forEach((q) => { console.error(line(q)); console.error(`    id: ${q.id}`); });
  }
  if (r.allowlistErrors.length || r.violations.length) process.exit(1);
  console.log("✅ mongo-query-index-shapes OK");
}

// ── self-test (픽스처, DB·models.js 불필요) ───────────────────────────────────

export function selfTest() {
  const src = `
import { User, Payment as Pay } from "../lib/models.js";
export async function h(db, id, q) {
  await User.findOne({ referralCode: "x" });
  await User.findById(id);
  await Pay.find({ userId: id, $or: [{ status: "a" }, { contentKey: "b" }] }).sort({ createdAt: -1 });
  await Pay.countDocuments({ $and: [{ userId: id }, { $or: [{ a: 1 }, { b: 2 }] }] });
  await User.find(q);
  await User.find({ ...q, a: 1 });
  await User.find({ $expr: { $gt: ["$a", 1] } });
  await User.find();
  await Pay.distinct("featureKey", { userId: id, kind: "deduct" });
  await Pay.aggregate([{ $match: { userId: id } }, { $group: { _id: null } }]);
  await db.collection("daehan_purchases").findOne({ userId: id });
  await User.collection.updateMany({ email: "e" }, { $set: { a: 1 } });
  await User.find({ lots: { $elemMatch: { expiresAt: { $lte: 1 }, remaining: { $gt: 0 } } } });
}`;
  const queries = extractQueries(src, { file: "worker/routes/fixture.js" });
  const ledger = { users: [["email"], ["status"], ["lots.expiresAt"]], payments: [["userId", "createdAt"], ["status", "createdAt"]] };
  const modelToCollection = { User: "users", Payment: "payments" };
  const kinds = queries.map((q) => `${q.op}:${q.kind}`);
  const expectKinds = ["findOne:literal", "findById:byId", "find:literal", "countDocuments:literal", "find:dynamic", "find:dynamic", "find:dynamic", "find:literal", "distinct:literal", "aggregate:literal", "findOne:raw", "updateMany:literal", "find:literal"];
  if (JSON.stringify(kinds) !== JSON.stringify(expectKinds)) throw new Error(`추출 분류 불일치:\n got ${JSON.stringify(kinds)}\n exp ${JSON.stringify(expectKinds)}`);

  const r0 = judge(queries, { ledger, modelToCollection }, []);
  const vio = r0.violations.map((v) => `${v.line}`);
  // 4행 referralCode(선두 아님) · 11행 find() 빈 필터 → 위반. 6행 $or 가지는 둘 다 userId 를 가지므로 통과.
  if (JSON.stringify(vio) !== JSON.stringify(["4", "11"])) throw new Error(`위반 행 불일치: ${JSON.stringify(vio)} (exp 4,11)`);
  if (r0.indexed.length !== 7) throw new Error(`indexed 7 기대, 실제 ${r0.indexed.length}`);
  if (r0.dynamic.length !== 3 || r0.raw.length !== 1) throw new Error("dynamic 3 · raw 1 기대");

  // 원장에 없는 컬렉션 → 위반
  const r1 = judge(queries, { ledger: { payments: ledger.payments }, modelToCollection }, []);
  if (!r1.violations.some((v) => /원장에 컬렉션 없음/.test(v.why))) throw new Error("원장에 없는 컬렉션이 위반으로 잡히지 않음");

  // allowlist: 사유 있는 항목은 구제, 사유 없음·낡은 항목·중복은 오류
  const ids = r0.violations.map((v) => v.id);
  const r2 = judge(queries, { ledger, modelToCollection }, [{ id: ids[0], reason: "self-test 픽스처 사유" }, { id: ids[1], reason: "self-test 픽스처 사유" }]);
  if (r2.violations.length !== 0 || r2.allowlisted.length !== 2 || r2.allowlistErrors.length !== 0) throw new Error("allowlist 구제가 동작하지 않음");
  const r3 = judge(queries, { ledger, modelToCollection }, [{ id: ids[0], reason: "" }, { id: ids[0], reason: "중복 항목 사유" }, { id: "worker/routes/gone.js::User.find::{x}", reason: "낡은 항목 사유" }]);
  const errs = r3.allowlistErrors.join("\n");
  if (!/사유 없음/.test(errs) || !/중복/.test(errs) || !/낡은 항목/.test(errs)) throw new Error(`allowlist 오류 3종이 전부 잡히지 않음:\n${errs}`);

  // 마이그레이션 리터럴 추출: createIndex({…}) 와 spec: {…} 둘 다, 변수 인자는 무시
  const mig = extractMigrationIndexKeys(`await X.collection.createIndex({ a: 1, "b.c": -1 }, { name: "n" });\nconst T = [{ spec: { d: 1 }, options: {} }];\nawait X.collection.createIndex(index.spec, index.options);`);
  if (JSON.stringify(mig) !== JSON.stringify([["a", "b.c"], ["d"]])) throw new Error(`마이그레이션 추출 불일치: ${JSON.stringify(mig)}`);

  console.log("✅ mongo-query-index-shapes self-test OK (단언 8, $elemMatch 포함)");
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  if (process.argv.includes("--self-test")) selfTest();
  else main().catch((error) => { console.error(`❌ ${error.stack || error.message}`); process.exit(1); });
}
