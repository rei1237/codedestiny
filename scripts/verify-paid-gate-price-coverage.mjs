#!/usr/bin/env node
/**
 * 결제창 "0원" 회귀 가드 — React 유료 게이트 호출부 **전수**가 가격을 실제로 푸는지 확인한다.
 *
 * 왜 필요한가:
 *   커밋 9bc21abc6 이 "이용권 프로브를 강제한다"는 (틀린) 근거로 호출부 3곳에서 cost/coinPrice/
 *   membershipCreditCost 를 지웠다. 그 값이 결제창 금액의 유일한 출처였고, 결과는
 *     · 단건 카드 "0원"
 *     · 월정석 카드 영구 비활성(월정석 비용 = coinPrice × 10 = 0)
 *     · 이용권 스냅샷 즉시통과 사멸(resolveVerdict 가 cost<=0 에서 즉시 반환)
 *   이었다. 그런데 결제 가드 36개 중 **어느 것도 울지 않았다** — 전부 "공통 게이트를 쓰는가"만
 *   보고 "그 게이트가 가격을 푸는가"는 아무도 보지 않았기 때문이다.
 *
 * fail-closed 4방향 (CLAUDE.md 원칙 10 — 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① 가격을 못 푸는 호출부           → 실패
 *   ② ALLOWED_UNRESOLVED 인데 실제로는 풀림 → 실패 (낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다)
 *   ③ ALLOWED_UNRESOLVED 가 가리키는 호출부가 없음 → 실패
 *   ④ 발견된 호출부가 0개             → 실패 (호출 이름이 바뀌었는데 초록불인 것을 막는다)
 *
 * 판정은 문자열 매칭이 아니라 **출하되는 해석기를 실제로 실행**해서 한다:
 *   · worker/lib/billing-feature-registry.js 의 getBillingFeaturePricing (서버 coin-gate 와 같은 함수)
 *   · app/_lib/billing-client.ts 의 resolveKnownCoinCost / resolveKnownAmountKRW (원문을 잘라 실행)
 *
 * 실행: npm run verify:paid-gate-price-coverage
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { getBillingFeaturePricing } from "../worker/lib/billing-feature-registry.js";
import { PASS_EXCLUDED_FEATURE_KEYS } from "../worker/payments/catalog.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(root, rel), "utf8");
const toPosix = (value) => value.split(sep).join("/");

const SCAN_ROOTS = ["app", "src", "components"];
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "public", "reports", "dist", "build", ".open-next", "__snapshots__"]);
const SOURCE_EXT = /\.(?:tsx?|jsx?)$/i;

/** 유료 게이트 진입 함수. 이름이 바뀌면 ④ 가 걸린다. */
const GATE_CALLEES = new Set(["runPaidAccessGate", "runBillingCoinGate", "ensurePaidAccess", "purchaseFeature"]);

/** 게이트 구현 자체(정본). 자기 자신을 검사 대상으로 삼지 않는다. */
const IMPLEMENTATION_FILES = new Set(["app/_lib/billing-client.ts"]);

/**
 * 가격을 정적으로 풀 수 없지만 통과시키는 호출부. 각 항목에 **왜** 를 적는다.
 * 🔴 여기에 넣기 전에 먼저 물을 것: "그럼 이 화면의 결제창은 무슨 금액을 보여주는가?"
 *    답이 "모른다" 면 그건 0원 결제창이다.
 */
// 현재 비어 있다 — 호출부 전수가 가격을 푼다(2026-08-17 실측). 비어 있는 것이 정상 상태이며,
// 항목이 생기면 그만큼 "결제창 금액을 모르는 화면"이 있다는 뜻이다.
const ALLOWED_UNRESOLVED = [];

/* ────────────────────────────────────────────────────────────────────────────
   1. 파일 순회
   ──────────────────────────────────────────────────────────────────────────── */

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
   2. AST — 게이트 호출부 발견 + 인자 해석
   ──────────────────────────────────────────────────────────────────────────── */

/** 함수 스코프까지 포함해 `const X = ...` 를 찾는다(호출부 지역 변수 대응). */
function collectAllConsts(sourceFile) {
  const table = new Map();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (!table.has(node.name.text)) table.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return table;
}

/** 문자열 리터럴로 접히는 것만 인정한다. 못 접히면 null(=신원 미상). */
function constFoldString(node, consts, depth = 0) {
  if (!node || depth > 2) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return constFoldString(node.expression, consts, depth);
  if (ts.isIdentifier(node)) return constFoldString(consts.get(node.text), consts, depth + 1);
  return null;
}

/**
 * 인자 노드를 ObjectLiteralExpression 집합으로 환원한다.
 * R1 객체 리터럴 그대로 / R2 식별자 → 초기화식 / R3 같은 파일의 빌더 함수 → return 객체들
 * 하나라도 못 풀면 null 을 섞어 돌려준다(= 미해석).
 */
function resolveArgObjects(node, consts, funcs, depth = 0) {
  if (!node || depth > 3) return [null];
  if (ts.isObjectLiteralExpression(node)) return [node];
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return resolveArgObjects(node.expression, consts, funcs, depth);
  if (ts.isIdentifier(node)) return resolveArgObjects(consts.get(node.text), consts, funcs, depth + 1);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const builder = funcs.get(node.expression.text);
    if (!builder) return [null];
    const returned = [];
    const visit = (child) => {
      if (ts.isReturnStatement(child) && child.expression) {
        returned.push(...resolveArgObjects(child.expression, consts, funcs, depth + 1));
      }
      // 중첩 함수의 return 은 이 빌더의 반환값이 아니다.
      if (!ts.isFunctionDeclaration(child) && !ts.isFunctionExpression(child) && !ts.isArrowFunction(child)) {
        ts.forEachChild(child, visit);
      }
    };
    if (builder.body && ts.isBlock(builder.body)) ts.forEachChild(builder.body, visit);
    else if (builder.body) returned.push(...resolveArgObjects(builder.body, consts, funcs, depth + 1));
    return returned.length ? returned : [null];
  }
  return [null];
}

/** 같은 파일에 정의된 함수/화살표 함수 목록(R3 용). */
function collectFunctions(sourceFile) {
  const table = new Map();
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) table.set(node.name.text, node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      table.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return table;
}

const IDENTITY_KEYS = ["categoryKey", "subFeatureKey", "featureKey", "reason"];
const PRICE_KEYS = ["cost", "coinPrice", "amountKRW", "amountKrw", "priceKRW", "cashPrice", "paymentAmount"];

/**
 * 객체 리터럴에서 신원(4키)과 "확실한 인라인 가격" 여부를 뽑는다.
 * 🔴 인라인 가격은 엄격하게 본다 — 숫자 0 이거나 `X || undefined` 형태면 런타임에 값이 사라지므로
 *    가격 근거로 인정하지 않는다.
 * 🔴 스프레드는 **정적으로 풀리는 것만** 받는다 — `{ ...buildBillingGateInput(...), resume }` 처럼
 *    같은 파일의 빌더로 환원되면 그 빌더가 담은 신원·가격을 읽는다. `...payload` 처럼 못 푸는 것은
 *    예전과 같이 근거로 치지 않는다(무엇이 들었는지 알 수 없다). 빌더가 여러 갈래로 return 하면
 *    **전 갈래가 같은 값을 줄 때만** 인정한다 — 한 갈래라도 가격이 빠지면 실패로 남긴다.
 * 키 단위로 들고 다니는 이유는 스프레드 뒤에 오는 속성이 그 키를 덮기 때문이다
 * (`{ ...builder(), cost: 0 }` 은 가격 근거가 아니다).
 */
function readGateArgParts(objectLiteral, consts, funcs, depth = 0) {
  const identity = {};
  const present = new Set();
  const price = new Set();
  const putIdentity = (key, folded) => {
    present.add(key);
    if (folded) identity[key] = folded;
    else delete identity[key];
  };
  const putPrice = (key, isEvidence) => {
    present.add(key);
    if (isEvidence) price.add(key);
    else price.delete(key);
  };

  for (const prop of objectLiteral.properties) {
    if (ts.isSpreadAssignment(prop)) {
      if (depth >= 2) continue;
      const resolved = resolveArgObjects(prop.expression, consts, funcs);
      // 하나라도 못 풀면 이 스프레드는 통째로 미상이다 — 예전처럼 아무 근거도 주지 않는다.
      if (!resolved.length || resolved.some((node) => !node)) continue;
      const parts = resolved.map((node) => readGateArgParts(node, consts, funcs, depth + 1));
      for (const key of IDENTITY_KEYS) {
        if (!parts.some((part) => part.present.has(key))) continue;
        const values = parts.map((part) => part.identity[key]);
        putIdentity(key, values.every((value) => value && value === values[0]) ? values[0] : "");
      }
      for (const key of PRICE_KEYS) {
        if (!parts.some((part) => part.present.has(key))) continue;
        putPrice(key, parts.every((part) => part.price.has(key)));
      }
      continue;
    }
    if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
    const name = prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : "";
    if (!name) continue;
    if (IDENTITY_KEYS.includes(name)) {
      putIdentity(name, ts.isPropertyAssignment(prop) ? constFoldString(prop.initializer, consts) : "");
      continue;
    }
    if (PRICE_KEYS.includes(name)) {
      if (!ts.isPropertyAssignment(prop)) {
        putPrice(name, false);
        continue;
      }
      const value = prop.initializer;
      if (ts.isNumericLiteral(value)) {
        putPrice(name, Number(value.text) > 0);
        continue;
      }
      // `X || undefined` / `X ?? undefined` 는 런타임에 undefined 로 접힐 수 있다 → 근거 아님.
      const collapsesToUndefined = ts.isBinaryExpression(value)
        && (value.operatorToken.kind === ts.SyntaxKind.BarBarToken || value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
        && ts.isIdentifier(value.right) && value.right.text === "undefined";
      putPrice(name, !collapsesToUndefined);
    }
  }
  return { identity, present, price };
}

function readGateArg(objectLiteral, consts, funcs) {
  const { identity, price } = readGateArgParts(objectLiteral, consts, funcs);
  return { identity, hasInlinePrice: price.size > 0 };
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

const callSites = [];
for (const scanRoot of SCAN_ROOTS) {
  for (const absolute of walk(join(root, scanRoot))) {
    const rel = toPosix(relative(root, absolute));
    if (IMPLEMENTATION_FILES.has(rel)) continue;
    const source = readFileSync(absolute, "utf8");
    if (![...GATE_CALLEES].some((name) => source.includes(`${name}(`))) continue;

    const sourceFile = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const consts = collectAllConsts(sourceFile);
    const funcs = collectFunctions(sourceFile);

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const callee = ts.isIdentifier(node.expression)
          ? node.expression.text
          : (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name) ? node.expression.name.text : "");
        if (GATE_CALLEES.has(callee) && node.arguments.length > 0) {
          const objects = resolveArgObjects(node.arguments[0], consts, funcs);
          for (const objectLiteral of objects) {
            callSites.push({
              file: rel,
              line: lineOf(sourceFile, node),
              callee,
              ...(objectLiteral ? readGateArg(objectLiteral, consts, funcs) : { identity: {}, hasInlinePrice: false, unparsed: true }),
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
}

// ④ fail-closed: 대상이 0개면 발견 로직이 죽은 것이다.
assert.ok(
  callSites.length > 0,
  "유료 게이트 호출부를 하나도 찾지 못했습니다. GATE_CALLEES 의 함수 이름이 바뀌었는지 확인하세요(가드가 조용히 무력화된 상태입니다).",
);

/* ────────────────────────────────────────────────────────────────────────────
   3. 출하되는 해석기를 실제로 실행한다
   ──────────────────────────────────────────────────────────────────────────── */

// billing-client 의 가격 해석 함수 2개를 원문 그대로 잘라 실행한다.
// 🔴 사본을 만들지 않는 것이 핵심이다 — 사본을 쓰면 출하 코드가 바뀌어도 가드는 계속 초록불이다.
// 🔴 sliceFunction(중괄호 균형)을 쓰지 않는다 — TS 함수는 파라미터에 인라인 타입 리터럴 `{...}` 을
//    갖는 경우가 있어 스캐너가 본문이 아니라 타입에서 멈춘다(runPaidServiceRuntimePayment 가 그렇다).
//    AST 로 함수 노드를 직접 집는다.
const billingClientSource = read("app/_lib/billing-client.ts");
const billingClientAst = ts.createSourceFile("billing-client.ts", billingClientSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function billingClientFunctionText(name) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      found = node.getText(billingClientAst);
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(billingClientAst, visit);
  assert.ok(found, `app/_lib/billing-client.ts 에서 ${name} 을 찾지 못했습니다(이름이 바뀌었다면 이 가드도 함께 갱신하세요).`);
  return found;
}

const slicedPricingFns = [
  billingClientFunctionText("resolveKnownCoinCost"),
  billingClientFunctionText("resolveKnownAmountKRW"),
].join("\n");

const transpiled = ts.transpileModule(slicedPricingFns, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
}).outputText;

const { resolveKnownCoinCost, resolveKnownAmountKRW } = new Function(
  "toNumber",
  "resolveServerFeaturePricing",
  `${transpiled}\nreturn { resolveKnownCoinCost, resolveKnownAmountKRW };`,
)(
  (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback),
  // server-feature-pricing.ts 도 원문을 그대로 쓴다(정본 해석기 = getBillingFeaturePricing).
  (input) => resolveServerFeaturePricingForGuard(input),
);

function resolveServerFeaturePricingForGuard(input) {
  try {
    const resolved = getBillingFeaturePricing({
      categoryKey: input?.categoryKey,
      subFeatureKey: input?.subFeatureKey,
      featureKey: input?.featureKey,
      reason: input?.reason,
    });
    if (!resolved?.ok || !resolved.pricing) return null;
    const cost = Math.floor(Number(resolved.pricing.cost ?? resolved.pricing.coinPrice));
    if (!Number.isFinite(cost) || cost <= 0) return null;
    const amountKRW = Math.floor(Number(resolved.pricing.amountKRW ?? resolved.pricing.cashPrice)) || cost * 100;
    return { cost, amountKRW, featureKey: String(resolved.pricing.featureKey || "") };
  } catch {
    return null;
  }
}

// 🔴 출하 모듈과 가드의 해석기가 같은 계약인지 확인한다(위 사본이 lib/payment 의 것과 갈라지면 무의미).
{
  const shipped = read("lib/payment/server-feature-pricing.ts");
  assert.match(shipped, /getBillingFeaturePricing/, "server-feature-pricing 은 서버 정본 해석기를 써야 합니다");
  assert.match(shipped, /catch\s*\{\s*\n?\s*return null;/, "server-feature-pricing 은 requireSubFeaturePricing 의 throw 를 삼켜야 합니다(게이트 전체가 죽습니다)");
  const shippedExcluded = [...shipped.matchAll(/PASS_EXCLUDED_FEATURE_KEYS = new Set\(\[([^\]]*)\]/g)][0]?.[1] || "";
  const shippedKeys = [...shippedExcluded.matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(
    shippedKeys,
    [...PASS_EXCLUDED_FEATURE_KEYS].sort(),
    "lib/payment/server-feature-pricing.ts 의 이용권 제외 목록이 worker/payments/catalog.js 정본과 다릅니다 — 갈라지면 이용권 미커버 기능이 스냅샷 즉시통과로 무료가 됩니다",
  );
}

// 게이트가 그 해석기를 실제로 지나는지(배선) 확인한다.
for (const label of ["resolveSnapshotPassVerdict", "runPaidServiceRuntimePayment", "recordMembershipPassInBackground"]) {
  assert.match(
    billingClientFunctionText(label),
    /resolveKnownCoinCost\(/,
    `${label} 은 가격 해석 정본(resolveKnownCoinCost)을 지나야 합니다`,
  );
}
assert.match(
  billingClientFunctionText("resolveKnownCoinCost"),
  /resolveServerFeaturePricing\(/,
  "resolveKnownCoinCost 는 호출부·eligibility 가 가격을 모를 때 서버 가격표로 폴백해야 합니다(없으면 결제창이 0원으로 뜹니다)",
);

// 미등록 featureKey 의 동작이 폴백 도입 전과 같은지(0) — 폴백이 없는 값을 지어내지 않는다는 계약.
assert.equal(
  resolveKnownCoinCost({ featureKey: "__가드용-존재하지-않는-기능__" }, null),
  0,
  "미등록 featureKey 는 종전대로 0 이어야 합니다(폴백이 값을 지어내면 안 됩니다)",
);

/* ────────────────────────────────────────────────────────────────────────────
   4. 판정
   ──────────────────────────────────────────────────────────────────────────── */

const allowKey = (file, callee) => `${file}::${callee}`;
const allowed = new Map(ALLOWED_UNRESOLVED.map(([file, callee, why]) => [allowKey(file, callee), why]));
const allowedHit = new Set();

const failures = [];
for (const site of callSites) {
  const key = allowKey(site.file, site.callee);
  // 신원만으로 게이트가 가격을 푸는가 — 인라인 가격을 뺀 상태로 **실행**해 본다.
  const resolvedCost = resolveKnownCoinCost(site.identity, null);
  const resolvedKRW = resolveKnownAmountKRW(site.identity, null, resolvedCost);
  const registryResolvable = resolvedCost > 0 && resolvedKRW > 0;
  const ok = registryResolvable || site.hasInlinePrice;

  if (ok) {
    if (allowed.has(key)) allowedHit.add(key);
    continue;
  }
  if (allowed.has(key)) {
    allowedHit.add(key);
    continue;
  }
  failures.push(
    `${site.file}:${site.line} ${site.callee}() — 가격을 풀 수 없습니다`
    + (site.unparsed ? " (인자를 정적으로 해석하지 못했습니다)" : ` (신원: ${JSON.stringify(site.identity)})`)
    + ". 호출부에 cost/coinPrice/amountKRW 를 넘기거나, featureKey 가 서버 가격표에 등록돼 있는지 확인하세요."
    + " 이대로 두면 결제창이 0원으로 뜨고 월정석 카드가 비활성이 됩니다.",
  );
}

// ① 미분류 실패
assert.deepEqual(failures, [], `\n${failures.join("\n")}\n`);

// ②③ 낡은 선언 실패
const staleDeclared = [];
for (const [key, why] of allowed) {
  if (!allowedHit.has(key)) staleDeclared.push(`${key} — 해당 호출부가 소스에 없습니다 (사유: ${why})`);
}
assert.deepEqual(
  staleDeclared,
  [],
  `ALLOWED_UNRESOLVED 에 죽은 선언이 있습니다. 목록이 거짓말이 되기 전에 지우세요:\n${staleDeclared.join("\n")}`,
);

// 워크플로 배선 — 이 가드가 보는 '메커니즘 파일'은 트리거 paths 에도 있어야 한다(CLAUDE.md 원칙 10).
{
  const workflow = read(".github/workflows/paid-flow-gates.yml");
  const MECHANISM_FILES = [
    "app/_lib/billing-client.ts",
    "app/hooks/useCoinGate.ts",
    "worker/lib/paid-feature-registry.js",
    "worker/lib/billing-policy.js",
    "worker/lib/billing-feature-registry.js",
    "lib/music-access-policy.js",
  ];
  const missing = MECHANISM_FILES.filter((file) => !workflow.includes(`"${file}"`));
  assert.deepEqual(
    missing,
    [],
    `이 가드가 실행하는 파일이 paid-flow-gates.yml 의 트리거 paths 에 없습니다 — 그 파일만 고친 PR 에서는 가드가 안 돕니다: ${missing.join(", ")}`,
  );
}

const outsideTrigger = new Set(callSites.map((site) => site.file)).size;
console.log(`[verify-paid-gate-price-coverage] PASS — 게이트 호출부 ${callSites.length}개(파일 ${outsideTrigger}개) 전부 가격이 풀립니다.`);
console.log("  ⚠️ 호출부 대부분은 paid-flow-gates.yml 트리거 paths 밖(app/**·src/**)이다. 유료 화면만 고친 PR 은");
console.log("     이 가드를 PR 시점에 깨우지 못하고, push:main 건강 신호가 머지 직후에 잡는다(트리거 확대는 사용자 승인 사항).");
