#!/usr/bin/env node
/**
 * verify:mongoose-update-pipeline — Mongoose 배열(집계 파이프라인) 업데이트에 `updatePipeline: true` 강제
 *
 * 왜 필요한가 (2026-09-05 사고):
 *   worker/lib/sns-daily-post-task.js 의 markSendStarted 가 IdempotencyKey.updateOne 에 집계
 *   파이프라인 배열을 넘기면서 **세 번째 인자를 아예 주지 않았다.** Mongoose 9 는 이걸 쿼리
 *   계층에서 즉시 거부한다 — DB 왕복조차 없다(node_modules/mongoose/lib/query.js:4052-4054):
 *     if (!updatePipeline && Array.isArray(update)) throw new MongooseError(
 *       'Cannot pass an array to query updates unless the `updatePipeline` option is set.');
 *   그 쓰기는 SNS 발행 직전의 관문이라, 실패하면 설계상 발행을 포기한다. 결과는 조용한 전멸이었다 —
 *   2026-09-03~09-05 사흘간 텔레그램·스레드 일일 발행이 매 실행 stage=mark 로 죽어 발행 0건.
 *
 *   🔴 레포는 이 함정을 **이미 알고 있었다** — worker/lib/rate-limit.js:50-55 에 같은 내용의 주석이
 *   있다. 아는 것만으로는 막지 못한다는 것이 이 가드의 존재 이유다.
 *
 * 무엇을 강제하는가:
 *   updateOne · updateMany · findOneAndUpdate · findByIdAndUpdate 의 **업데이트 인자가 배열**이고
 *   수신자가 **Mongoose 모델**이면, 옵션 인자에 `updatePipeline: true` 가 있어야 한다.
 *
 * 범위 밖 (의도적 — 근거를 함께 적는다):
 *   ① `Model.collection.*` · `db.collection("x").*` — 네이티브 드라이버는 Mongoose 쿼리 계층을 타지
 *      않아 옵션이 필요 없다. worker/routes/auth.js:324·369 가 정확히 그 형태다.
 *   ② `bulkWrite` — 위 throw 는 Query 경로에만 있다(mongoose/lib 전수 grep: query.js 외 히트 없음).
 *      같은 규칙으로 묶으면 근거 없는 단언이 된다.
 *   ③ 전역 옵션 `mongoose.set("updatePipeline", true)` (mongoose/lib/mongoose.js:248) — 레포 사용처
 *      0건(전수: worker/ · scripts/ · lib/, 2026-09-05). 생기면 이 가드가 과하게 엄격해질 뿐이다.
 *
 * 판정 규칙 (CLAUDE.md 원칙 10 — 손으로 쓴 대상 목록은 가드가 아니다. 파일명은 어디에도 없다):
 *                       │ 수신자=Mongoose      │ 수신자=네이티브 │ 수신자=판정불가
 *   업데이트=배열        │ updatePipeline 요구  │ 면제           │ 🔴 실패(미분류)
 *   업데이트=배열 아님   │ 무관                 │ 무관           │ 무관
 *   업데이트=판정불가    │ 🔴 맹점(상한 있음)   │ 무관           │ 무관(Mongoose 쿼리라는 근거가 없다)
 *
 *   "업데이트=판정불가"는 인자가 함수 파라미터라 호출자를 봐야 아는 경우다. 정적으로는 못 푼다.
 *   그래서 **개수에 상한**을 둔다 — 통과시키되 새로 생기면 반드시 사람 눈에 걸리게 한다.
 *
 * 🔴 알려진 한계 — 이름 해석은 **스코프별이 아니라 파일 단위 합집합**이다:
 *   같은 이름이 여러 함수에서 따로 선언되면(예: worker/routes/app-store.js 의 `update` 4곳) 그 값들을
 *   전부 합쳐서 본다. 하나라도 못 풀면 전체가 "판정불가"가 되고, 함수 반환이 자기 이름을 되돌려주면
 *   순환으로 보여 역시 판정불가가 된다. 안전한 쪽(과소 단언)으로 틀리므로 **위반을 놓치지는 않고**
 *   맹점 수가 실제보다 커질 뿐이다. 정밀하게 만들려면 스코프 체인이 필요하다 — 지금은 필요 없다.
 *
 * fail-closed 3방향:
 *   ① 위반·미분류가 있으면 실패
 *   ② 맹점이 상한을 넘으면 실패
 *   ③ 스캔 결과가 바닥값 아래면 실패 (추출기가 죽은 채 초록불이 뜨는 것을 막는다)
 *
 * 실행: npm run verify:mongoose-update-pipeline [--report] [--self-test]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 스캔 범위 — 무인으로 도는 런타임 코드(worker)와 손으로 돌리는 마이그레이션. */
const SCAN_DIRS = ["worker", "scripts/migrations"];

/** 업데이트 인자가 배열이면 Mongoose 가 거부하는 쿼리 메서드. 값은 [업데이트 인자, 옵션 인자] 위치. */
const UPDATE_OPS = new Map([
  ["updateOne", [1, 2]],
  ["updateMany", [1, 2]],
  ["findOneAndUpdate", [1, 2]],
  ["findByIdAndUpdate", [1, 2]],
]);

/**
 * 추출기가 죽으면 위반이 0건으로 보인다. 실측(2026-09-05: 파일 322 · 호출 395 · 배열 4)보다
 * 넉넉히 낮게 잡되 0 은 금지한다. 걸리면 "낮춰서 통과"가 아니라 **왜 줄었는지**를 먼저 본다.
 */
const FLOORS = Object.freeze({ files: 200, updateCalls: 300, arrayUpdates: 2 });

/**
 * Mongoose 모델에 **정적으로 풀 수 없는 값**을 업데이트로 넘기는 호출의 상한. 실측 4건
 * (2026-09-05, `--report` 로 확인): 업데이트가 함수 파라미터인 경우 1건과, 위 "알려진 한계"의
 * 동명 선언 합집합에 걸린 경우 3건. 넷 다 넘기는 값은 객체이고 배열이 될 경로가 없다.
 * 🔴 올리기 전에 새로 생긴 호출이 배열을 넘길 수 없음을 확인할 것. 확인 없이 올리면 가드가 죽는다.
 */
const BLIND_SPOT_LIMIT = 4;

// ─────────────────────────────────────────────────────────────────────────────
// 수신자 판정 — 이 호출이 Mongoose 쿼리 계층을 타는가
// ─────────────────────────────────────────────────────────────────────────────

/** `import { User, IdempotencyKey } from "…/models.js"` 의 지역 이름 → 모델 이름. */
function modelBindings(ast) {
  const named = new Map();
  const namespaces = new Set();
  for (const node of ast.body) {
    if (node.type !== "ImportDeclaration" || !/models\.js$/.test(node.source.value)) continue;
    for (const s of node.specifiers) {
      if (s.type === "ImportSpecifier") named.set(s.local.name, s.imported.name ?? s.imported.value);
      else if (s.type === "ImportNamespaceSpecifier") namespaces.add(s.local.name);
    }
  }
  return { named, namespaces };
}

/** `const users = User.collection` · `const c = db.collection("x")` 같은 지역 별칭을 따라간다. */
function localAliases(ast, bindings) {
  const native = new Set();
  const mongoose = new Map();
  // 선언이 사용보다 뒤에 오거나 별칭이 별칭을 참조할 수 있어 두 번 훑는다.
  for (let pass = 0; pass < 2; pass += 1) {
    walk.simple(ast, {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !node.init) return;
        const kind = receiverKind(node.init, { ...bindings, native, mongoose });
        if (kind.kind === "native") native.add(node.id.name);
        else if (kind.kind === "mongoose") mongoose.set(node.id.name, kind.model);
      },
    });
  }
  return { native, mongoose };
}

function isCollectionMember(node) {
  return (
    node?.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    node.property.name === "collection"
  );
}

/** 값 노드 하나를 수신자 종류로 판정한다. 판정 못 하면 unknown — 통과가 아니라 분기의 근거가 된다. */
function receiverKind(node, ctx) {
  if (!node) return { kind: "unknown" };
  // db.collection("x") — 네이티브 드라이버
  if (node.type === "CallExpression") return isCollectionMember(node.callee) ? { kind: "native" } : { kind: "unknown" };
  if (node.type === "MemberExpression") {
    // Model.collection — 네이티브 드라이버
    if (isCollectionMember(node)) return { kind: "native" };
    // models.User — 네임스페이스 임포트를 통한 모델 접근
    if (!node.computed && node.object.type === "Identifier" && ctx.namespaces?.has(node.object.name)) {
      return { kind: "mongoose", model: `${node.object.name}.${node.property.name}` };
    }
    return { kind: "unknown" };
  }
  if (node.type === "Identifier") {
    if (ctx.native?.has(node.name)) return { kind: "native" };
    if (ctx.named?.has(node.name)) return { kind: "mongoose", model: ctx.named.get(node.name) };
    if (ctx.mongoose?.has(node.name)) return { kind: "mongoose", model: ctx.mongoose.get(node.name) };
  }
  return { kind: "unknown" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 인자 판정 — 이 업데이트가 배열일 수 있는가
// ─────────────────────────────────────────────────────────────────────────────

function pushTo(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function functionName(node, parent) {
  if (node.type === "FunctionDeclaration") return node.id?.name ?? null;
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") return parent.id.name;
  if (parent?.type === "Property" && parent.key?.type === "Identifier") return parent.key.name;
  return null;
}

/**
 * 이름 하나가 가질 수 있는 값 노드를 파일 전체에서 모은다. 스코프를 나누지 않고 **합집합**으로
 * 본다 — 같은 이름이 여러 번 선언돼도 그중 하나라도 배열이면 배열로 취급하는 쪽이 안전하다.
 */
function buildValueIndex(ast) {
  const names = new Map();
  const functions = new Map();

  walk.simple(ast, {
    VariableDeclarator(node) {
      if (node.id.type !== "Identifier" || !node.init) return;
      const init = node.init;
      if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
        // 화살표 함수의 암묵 반환은 ReturnStatement 가 없으니 여기서 직접 담는다.
        if (init.body.type !== "BlockStatement") pushTo(functions, node.id.name, init.body);
        return;
      }
      pushTo(names, node.id.name, init);
    },
    AssignmentExpression(node) {
      if (node.operator === "=" && node.left.type === "Identifier") pushTo(names, node.left.name, node.right);
    },
  });

  walk.ancestor(ast, {
    ReturnStatement(node, _state, ancestors) {
      if (!node.argument) return;
      for (let i = ancestors.length - 2; i >= 0; i -= 1) {
        const fn = ancestors[i];
        if (fn.type !== "FunctionDeclaration" && fn.type !== "FunctionExpression" && fn.type !== "ArrowFunctionExpression") continue;
        const name = functionName(fn, ancestors[i - 1]);
        if (name) pushTo(functions, name, node.argument);
        return;
      }
    },
  });

  return { names, functions };
}

/** 값 노드가 배열일 수 있는가 — "array" · "not-array" · "unknown". */
function valueShape(node, index, seen = new Set()) {
  if (!node) return "not-array";
  switch (node.type) {
    case "ArrayExpression":
      return "array";
    case "ObjectExpression":
    case "TemplateLiteral":
    case "NewExpression":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return "not-array";
    case "Literal":
      return "not-array";
    case "AwaitExpression":
      return valueShape(node.argument, index, seen);
    case "ConditionalExpression":
      return mergeShapes(valueShape(node.consequent, index, seen), valueShape(node.alternate, index, seen));
    case "LogicalExpression":
      return mergeShapes(valueShape(node.left, index, seen), valueShape(node.right, index, seen));
    case "Identifier": {
      if (seen.has(`v:${node.name}`)) return "unknown";
      seen.add(`v:${node.name}`);
      const nodes = index.names.get(node.name);
      if (!nodes?.length) return "unknown";
      return nodes.reduce((acc, n) => mergeShapes(acc, valueShape(n, index, seen)), "not-array");
    }
    case "CallExpression": {
      if (node.callee.type !== "Identifier") return "unknown";
      if (seen.has(`f:${node.callee.name}`)) return "unknown";
      seen.add(`f:${node.callee.name}`);
      const returns = index.functions.get(node.callee.name);
      if (!returns?.length) return "unknown";
      return returns.reduce((acc, n) => mergeShapes(acc, valueShape(n, index, seen)), "not-array");
    }
    default:
      return "unknown";
  }
}

/** 하나라도 배열이면 배열, 하나라도 모르면 모름. */
function mergeShapes(a, b) {
  if (a === "array" || b === "array") return "array";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "not-array";
}

/** 옵션 객체에 `updatePipeline: true` 가 있는가 — "present" · "absent" · "unknown". */
function optionsCarryUpdatePipeline(node, index) {
  if (!node) return "absent";
  const resolved = node.type === "Identifier" ? index.names.get(node.name)?.at(-1) ?? node : node;
  if (resolved.type !== "ObjectExpression") return "unknown";
  for (const prop of resolved.properties) {
    if (prop.type === "SpreadElement") return "unknown";
    const key = prop.key?.type === "Identifier" ? prop.key.name : prop.key?.value;
    if (key !== "updatePipeline") continue;
    return prop.value?.type === "Literal" && prop.value.value === true ? "present" : "unknown";
  }
  return "absent";
}

// ─────────────────────────────────────────────────────────────────────────────
// 추출
// ─────────────────────────────────────────────────────────────────────────────

function extractSites(source, { file }) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
  const bindings = modelBindings(ast);
  const ctx = { ...bindings, ...localAliases(ast, bindings) };
  const index = buildValueIndex(ast);
  const sites = [];
  let updateCalls = 0;

  walk.simple(ast, {
    CallExpression(node) {
      const callee = node.callee;
      if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return;
      const positions = UPDATE_OPS.get(callee.property.name);
      if (!positions) return;
      updateCalls += 1;
      const [updateIdx, optionsIdx] = positions;
      const shape = valueShape(node.arguments[updateIdx], index);
      if (shape === "not-array") return;
      const receiver = receiverKind(callee.object, ctx);
      sites.push({
        file,
        line: node.loc.start.line,
        op: callee.property.name,
        shape,
        receiver: receiver.kind,
        model: receiver.model ?? null,
        options: optionsCarryUpdatePipeline(node.arguments[optionsIdx], index),
      });
    },
  });

  return { sites, updateCalls };
}

function listSources(root) {
  const out = [];
  for (const dir of SCAN_DIRS) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.(js|mjs)$/.test(entry.name)) out.push(full);
      }
    }
  }
  return out.sort();
}

/** 판정 표를 그대로 코드로 옮긴다. 반환값이 곧 실패 사유 분류다. */
function classify(site) {
  if (site.shape === "array") {
    if (site.receiver === "unknown") return "unclassified";
    if (site.receiver === "native") return "exempt";
    if (site.options === "present") return "compliant";
    return "violation";
  }
  // shape === "unknown"
  return site.receiver === "mongoose" ? "blindSpot" : "irrelevant";
}

// ─────────────────────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const report = process.argv.includes("--report");
  const buckets = { compliant: [], exempt: [], violation: [], unclassified: [], blindSpot: [], irrelevant: [] };
  const parseErrors = [];
  let files = 0;
  let updateCalls = 0;
  let arrayUpdates = 0;

  for (const full of listSources(ROOT)) {
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    files += 1;
    try {
      const result = extractSites(fs.readFileSync(full, "utf8"), { file: rel });
      updateCalls += result.updateCalls;
      for (const site of result.sites) {
        if (site.shape === "array") arrayUpdates += 1;
        const reason = site.options === "unknown" && site.shape === "array" && site.receiver === "mongoose"
          ? " (옵션이 정적 객체가 아니라 확인 불가)"
          : "";
        buckets[classify(site)].push(`${rel}:${site.line} ${site.model ?? "?"}.${site.op}()${reason}`);
      }
    } catch (error) {
      parseErrors.push(`${rel}: ${error.message}`);
    }
  }

  if (report) {
    console.log(`파일 ${files} · 업데이트 호출 ${updateCalls} · 배열 업데이트 ${arrayUpdates}`);
    for (const [name, lines] of Object.entries(buckets)) {
      for (const line of lines) console.log(`  ${name.padEnd(12)} ${line}`);
    }
  }

  const failures = [];
  if (parseErrors.length) {
    failures.push(`파싱 실패 ${parseErrors.length}건 — 못 읽은 파일은 위반을 숨긴다:\n    ${parseErrors.join("\n    ")}`);
  }
  if (files < FLOORS.files) failures.push(`스캔 파일 ${files}개 < 바닥값 ${FLOORS.files} — 스캐너가 죽었다`);
  if (updateCalls < FLOORS.updateCalls) failures.push(`업데이트 호출 ${updateCalls}건 < 바닥값 ${FLOORS.updateCalls} — 추출기가 죽었다`);
  if (arrayUpdates < FLOORS.arrayUpdates) failures.push(`배열 업데이트 ${arrayUpdates}건 < 바닥값 ${FLOORS.arrayUpdates} — 가드가 눈멀었다`);
  if (buckets.unclassified.length) {
    failures.push(`배열 업데이트인데 수신자를 판정 못 했다 ${buckets.unclassified.length}건 (미분류는 통과가 아니다):\n    ${buckets.unclassified.join("\n    ")}`);
  }
  if (buckets.blindSpot.length > BLIND_SPOT_LIMIT) {
    failures.push(
      `Mongoose 모델에 정적으로 못 푸는 업데이트를 넘기는 호출 ${buckets.blindSpot.length}건 > 상한 ${BLIND_SPOT_LIMIT}:\n    ` +
        `${buckets.blindSpot.join("\n    ")}\n    → 그 값이 배열일 수 없음을 확인했으면 BLIND_SPOT_LIMIT 을 올린다(확인 없이 올리지 말 것).`,
    );
  }
  if (buckets.violation.length) {
    failures.push(`\`updatePipeline: true\` 누락 ${buckets.violation.length}건:\n    ${buckets.violation.join("\n    ")}`);
  }

  if (failures.length) {
    console.error("❌ verify:mongoose-update-pipeline 실패");
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\n  고치는 법: 해당 호출의 옵션 인자에 `updatePipeline: true` 를 넣는다." +
        "\n  선례: worker/lib/rate-limit.js:55 · worker/routes/billing.js:957" +
        "\n  없으면 Mongoose 9 가 DB 왕복 없이 즉시 던진다(mongoose/lib/query.js:4052-4054).",
    );
    process.exit(1);
  }

  console.log(
    `✅ verify:mongoose-update-pipeline 통과 — 파일 ${files} · 업데이트 호출 ${updateCalls} · ` +
      `배열 업데이트 ${arrayUpdates}건(적법 ${buckets.compliant.length} · 네이티브 면제 ${buckets.exempt.length}) · ` +
      `맹점 ${buckets.blindSpot.length}/${BLIND_SPOT_LIMIT}.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 자가 테스트 — 가드가 실제로 무는지 확인한다 (도는 가드 ≠ 무는 가드)
// ─────────────────────────────────────────────────────────────────────────────

function selfTest() {
  const fixture = `
import { IdempotencyKey, User, AbuseScore } from "../lib/models.js";
const users = User.collection;
const raw = db.collection("things");
const pipeline = [{ $set: { a: 1 } }];
function buildUpdate() { return { $set: { b: 2 } }; }
await IdempotencyKey.updateOne({ a: 1 }, [{ $set: { b: 2 } }]);
await AbuseScore.findOneAndUpdate({ a: 1 }, [{ $set: { b: 2 } }], { upsert: true, updatePipeline: true });
await users.updateOne({ a: 1 }, [{ $set: { b: 2 } }]);
await raw.updateMany({ a: 1 }, pipeline);
await User.updateOne({ a: 1 }, { $set: { b: 2 } });
await User.findByIdAndUpdate(id, buildUpdate(), { returnDocument: "after" });
await someUnknown.updateOne({ a: 1 }, [{ $set: { b: 2 } }]);
const apply = (filter, update) => User.findOneAndUpdate(filter, update);
`;
  const { sites, updateCalls } = extractSites(fixture, { file: "fixture.js" });
  const at = (line) => sites.find((s) => s.line === line);
  const assert = (cond, message) => {
    if (!cond) {
      console.error(`❌ self-test: ${message}`);
      process.exit(1);
    }
  };

  assert(updateCalls === 8, `업데이트 호출 8건을 찾아야 한다 (실제 ${updateCalls})`);
  assert(classify(at(7)) === "violation", "7행: Mongoose + 배열 + 옵션 없음 = 위반이어야 한다");
  assert(classify(at(8)) === "compliant", "8행: updatePipeline: true 를 인식해야 한다");
  assert(classify(at(9)) === "exempt", "9행: `const users = User.collection` 별칭은 네이티브 면제다");
  assert(classify(at(10)) === "exempt", "10행: db.collection() 별칭 + 배열 상수를 풀어야 한다");
  assert(!at(11), "11행: 객체 업데이트는 후보에서 빠져야 한다");
  assert(!at(12), "12행: 객체만 반환하는 지역 함수 호출은 배열이 아니라고 풀어야 한다");
  assert(classify(at(13)) === "unclassified", "13행: 배열인데 수신자를 모르면 실패여야 한다(통과 아님)");
  assert(classify(at(14)) === "blindSpot", "14행: 파라미터로 들어온 업데이트는 맹점으로 세어야 한다");
  console.log("✅ verify:mongoose-update-pipeline --self-test 통과 — 위반·면제·미분류·맹점을 각각 가른다.");
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  if (process.argv.includes("--self-test")) selfTest();
  else {
    try {
      main();
    } catch (error) {
      console.error(`❌ ${error.stack || error.message}`);
      process.exit(1);
    }
  }
}
