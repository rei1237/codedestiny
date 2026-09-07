#!/usr/bin/env node
/**
 * 결제 후 자동 재개(resume) 배선 누락 가드 — 유료 게이트 호출부 **전수**가 재개 서술자를
 * 넘기는지, 그리고 서술자의 `kind` 가 실제로 등록된 핸들러와 만나는지 확인한다.
 *
 * 왜 필요한가 (docs/handoff/paid-feature-resume-2026-09-06.md):
 *   모바일 PortOne 은 상위 프레임을 리다이렉트하므로 게이트의 `await` 가 페이지와 함께 죽는다.
 *   복귀한 문서는 새 문서라 `onGranted` 클로저가 통째로 사라진다 — "결제했는데 메인 화면"의 정체다.
 *   유일한 복구 수단이 게이트 옵션의 `resume: {kind, action, args}` 서술자 + 등록된 핸들러인데,
 *   2026-09-07 까지 **이 축을 보는 가드가 하나도 없었다**(`grep resume package.json` 0건).
 *   그래서 41건 배선이 전부 손 검색으로 이뤄졌고, 실제로 "36건 → 진짜 2건" 같은 오계수가 났다.
 *   가드가 없으면 앞으로 추가되는 유료 기능은 **조용히 미배선으로 태어난다**.
 *
 * fail-closed 6방향 (CLAUDE.md 원칙 10 — 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① 발견된 호출부가 축별로 0개                → 실패 (게이트 함수 이름이 바뀐 것)
 *   ② `resume` 을 안 넘기는 호출부               → 실패
 *   ③ UNWIRED_BACKLOG 인데 실제로는 배선됨       → 실패 (낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다)
 *   ④ UNWIRED_BACKLOG 가 가리키는 호출부가 없음  → 실패
 *   ⑤ 서술자 `kind` 에 등록된 핸들러가 없음      → 실패 ('지금 열기' 카드로만 떨어지는 상태)
 *   ⑥ 등록됐는데 아무도 안 쓰는 `kind`           → 실패 (리네임 뒤 남은 죽은 배선)
 *   + 재개 계약 정본(js/core/checkout-entry.js · app/hooks/usePaidResume.ts)의 배선이 살아 있는지
 *   + 이 가드가 읽는 메커니즘 파일이 워크플로 트리거 paths 에 있는지 (원칙 10)
 *
 * 판정은 문자열 매칭이 아니라 **AST** 로 한다. 게이트 인자는 객체 리터럴 그대로 / 식별자 →
 * 초기화식 / 같은 파일의 빌더 함수 → return 객체 / `Object.assign` / 정적으로 풀리는 스프레드
 * 까지 따라 들어간다(verify-paid-gate-price-coverage.mjs 와 같은 환원 규칙).
 *
 * 실행: npm run verify:paid-resume-wiring
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(root, rel), "utf8");
const toPosix = (value) => value.split(sep).join("/");

/* ────────────────────────────────────────────────────────────────────────────
   0. 계약 — 무엇이 게이트이고, 서술자는 몇 번째 인자에 실리는가
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * React 축 게이트. 서술자는 옵션 객체(0번 인자)의 `resume` 키다.
 * 🔴 이름이 바뀌면 ① 이 걸린다.
 */
const REACT_GATES = new Map([
  ["ensurePaidAccess", [0]],
  ["runPaidAccessGate", [0]],
  ["runBillingCoinGate", [0]],
  ["purchaseFeature", [0]],
]);

/**
 * 정적 축 게이트. `_cdCoinGatePerUse(cost, reason, onGranted, onCancel, options)` 는 옵션 백이
 * 4번이지만, 4번째 인자가 객체면 옵션 백으로 취급하는 shim 이 있어 3번도 함께 본다
 * (js/destiny-profile.js `_cdCoinGatePerUse` 정의부).
 * `syRequirePaidSukuyoFeature(feature, onGranted, resume)` 는 서술자가 **위치 인자**다.
 */
const STATIC_GATES = new Map([
  ["_cdOpenPaidServiceGate", [0]],
  ["_cdCoinGatePerUse", [3, 4]],
  ["syRequirePaidSukuyoFeature", [2]],
]);

/** 서술자를 위치 인자로 받는 게이트 — 객체 리터럴이 아니어도 "넘겼다"로 본다. */
const POSITIONAL_DESCRIPTOR_GATES = new Set(["syRequirePaidSukuyoFeature"]);

/**
 * 게이트 구현·전달자(정본). 자기 자신을 검사 대상으로 삼지 않는다.
 * 🔴 여기 넣는 기준은 "이 함수 자체가 게이트다" 하나뿐이다 — 호출부를 편하게 통과시키려고
 *    넣기 시작하면 가드가 아니라 목록이 된다.
 */
const IMPLEMENTATION_FILES = new Set([
  "app/_lib/billing-client.ts",
  "app/hooks/useCoinGate.ts",
  "app/hooks/usePaidResume.ts",
  "js/core/checkout-entry.js",
]);

/** 게이트를 감싸 서술자를 그대로 흘려보내는 함수. 그 안의 게이트 호출은 배선 대상이 아니다. */
const FORWARDER_FUNCTIONS = new Set([
  "syRequirePaidSukuyoFeature", // js/saju-engine-tarot-sukuyo-quantum.js — resume 를 gateOptions 로 옮긴다
  "_cdOpenPaidServiceGate",
  "_cdCoinGatePerUse",
  "_cdRunPerUseCoinGate",
]);

/** 재개 핸들러 등록 정본. 여기서 출발해 같은 계약의 지역 등록기까지 고정점으로 넓힌다. */
const ROOT_REGISTRARS = ["registerPaidResumeHandler", "usePaidResume"];

/**
 * 아직 재개가 배선되지 않은 게이트 호출부. **각 항목에 왜 인지와 후속 과제를 적는다.**
 * 🔴 여기에 넣기 전에 먼저 물을 것: "이 기능은 모바일에서 결제하면 무엇이 열리는가?"
 *    답이 "메인 화면" 이면 그건 배선 누락이지 예외가 아니다.
 * 형식: [파일, 게이트 이름, 사유]
 */
const UNWIRED_BACKLOG = [
  [
    "components/fpti/FptiResultCard.tsx",
    "purchaseFeature",
    "FPTI 심화 리포트 — 서버 영구 해금형(featureKey: premium-fpti-report)이라 재과금은 없지만, "
    + "복귀 문서는 스스로 열리지 않는다(핸드오프 §(c) 분류: 영구 unlock 이 '스스로 열림'을 뜻하지 않는다). "
    + "2026-09-07 이 가드 신설 시점의 기존 미배선분 — 후속 과제.",
  ],
  [
    "src/features/fortune-tea-house/FortuneTeaHousePage.tsx",
    "runBillingCoinGate",
    "운명 찻집 상담 — 게이트가 서버 응답 payload 로 조립되는 buildFortuneTeaBillingGateInput 를 타고, "
    + "상담 생성이 202 폴링이라 재개 서술자에 폴링 상태까지 실어야 한다. "
    + "2026-09-07 이 가드 신설 시점의 기존 미배선분 — 후속 과제.",
  ],
  [
    "js/tarot-year-fortune-experience.js",
    "_cdOpenPaidServiceGate",
    "신년 타로의 **폴백** 경로(consumeCoinDirect) — 주 경로 requireYearAccess 는 _cdCoinGatePerUse 로 "
    + "resume 을 넘긴다(같은 파일 :485). 이 갈래는 _cdCoinGatePerUse 가 없을 때만 타고 resume 파라미터 "
    + "자체를 받지 않는다. 핸드오프 §초판 6건의 '_dpChooseServicePaymentMode 폴백' 과 같은 형태다 — 후속 과제.",
  ],
  [
    "src/features/master-love-codex/MasterLoveCodexPage.tsx",
    "runBillingCoinGate",
    "마스터 러브 코덱스 — buildBillingGateInput(...) 결과를 그대로 넘겨 resume 자리가 없다. "
    + "2026-09-07 이 가드 신설 시점의 기존 미배선분 — 후속 과제.",
  ],
];

/**
 * 서술자 `kind` 를 정적으로 풀지 못하는 호출부. React 축은 featureKey 가 상수·prop·import 라
 * 애초에 kind 대조 대상이 아니고(훅 하나가 등록과 서술자 생성을 겸해 짝이 구조적으로 맞는다),
 * 정적 축에서만 대조한다. 여기 항목이 늘어나면 그만큼 "짝을 확인 못 한 kind" 가 있다는 뜻이다.
 */
const UNRESOLVED_STATIC_KINDS = [];

/* ────────────────────────────────────────────────────────────────────────────
   1. 파일 수집 — React 축(app·src·components) + 정적 축(index.html·루트 *.html·js/**)
   ──────────────────────────────────────────────────────────────────────────── */

const SKIP_DIRS = new Set([
  ".git", ".next", "node_modules", "public", "reports", "dist", "build", ".open-next",
  "__snapshots__", "coverage", ".wrangler", ".paid-gate-base",
]);
const REACT_EXT = /\.(?:tsx?|jsx?)$/i;

function walk(dir, matcher, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, matcher, out);
    else if (matcher(entry.name)) out.push(full);
  }
  return out;
}

const reactFiles = ["app", "src", "components"]
  .flatMap((scanRoot) => walk(join(root, scanRoot), (name) => REACT_EXT.test(name)));

const rootHtmlFiles = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".html"))
  .map((entry) => join(root, entry.name));

const staticFiles = [
  ...rootHtmlFiles,
  ...walk(join(root, "js"), (name) => name.endsWith(".js")),
];

/* ────────────────────────────────────────────────────────────────────────────
   2. 파싱 — HTML 은 인라인 <script> 를 잘라 붙이고 줄번호 보정만 들고 다닌다
   ──────────────────────────────────────────────────────────────────────────── */

const SCRIPT_BLOCK = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

/** @returns {{text: string, lineOffset: number}[]} 파싱 단위 목록. */
function parseUnits(absolutePath, source) {
  if (!absolutePath.toLowerCase().endsWith(".html")) return [{ text: source, lineOffset: 0 }];
  const units = [];
  for (const match of source.matchAll(SCRIPT_BLOCK)) {
    const attrs = match[1] || "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/\btype\s*=/i.test(attrs) && !/\btype\s*=\s*["']?(?:text\/javascript|module|application\/javascript)/i.test(attrs)) continue;
    const bodyStart = match.index + match[0].indexOf(">", match[0].indexOf("<script") + 7) + 1;
    const lineOffset = source.slice(0, bodyStart).split("\n").length - 1;
    units.push({ text: match[2], lineOffset });
  }
  return units;
}

/** 같은 파일에 정의된 `X = ...` 전부(스코프 무시 — 호출부 지역 변수까지 본다). */
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

/** 같은 파일에 정의된 함수/화살표 함수(빌더 환원용). */
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

/** 문자열 리터럴로 접히는 것만 인정한다. 못 접히면 null(= 신원 미상). */
function constFoldString(node, consts, depth = 0) {
  if (!node || depth > 3) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return constFoldString(node.expression, consts, depth);
  if (ts.isIdentifier(node)) return constFoldString(consts.get(node.text), consts, depth + 1);
  return null;
}

/**
 * 인자 노드를 ObjectLiteralExpression 집합으로 환원한다.
 * R1 객체 리터럴 / R2 식별자 → 초기화식 / R3 같은 파일 빌더 → return 객체 / R4 Object.assign(...)
 * 하나라도 못 풀면 null 을 섞어 돌려준다(= 미해석).
 */
function resolveArgObjects(node, consts, funcs, depth = 0) {
  if (!node || depth > 3) return [null];
  if (ts.isObjectLiteralExpression(node)) return [node];
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return resolveArgObjects(node.expression, consts, funcs, depth);
  if (ts.isIdentifier(node)) return resolveArgObjects(consts.get(node.text), consts, funcs, depth + 1);
  // `resume ? { resume: resume } : undefined` — 양 갈래를 다 본다(한 갈래라도 서술자를 실으면 배선이다).
  if (ts.isConditionalExpression(node)) {
    return [
      ...resolveArgObjects(node.whenTrue, consts, funcs, depth + 1),
      ...resolveArgObjects(node.whenFalse, consts, funcs, depth + 1),
    ];
  }
  if (ts.isCallExpression(node)) {
    // R4: Object.assign({}, a, {...}) — 합쳐지는 조각 전부를 후보로 본다.
    const callee = node.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name) && callee.name.text === "assign"
      && ts.isIdentifier(callee.expression) && callee.expression.text === "Object") {
      return node.arguments.flatMap((arg) => resolveArgObjects(arg, consts, funcs, depth + 1));
    }
    if (!ts.isIdentifier(callee)) return [null];
    const builder = funcs.get(callee.text);
    if (!builder) return [null];
    const returned = [];
    const visit = (child) => {
      if (ts.isReturnStatement(child) && child.expression) {
        returned.push(...resolveArgObjects(child.expression, consts, funcs, depth + 1));
      }
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

/** 객체 리터럴(스프레드 포함)에 `key` 속성이 실리는가. */
function hasProperty(objectLiteral, key, consts, funcs, depth = 0) {
  if (!objectLiteral) return false;
  for (const prop of objectLiteral.properties) {
    if (ts.isSpreadAssignment(prop)) {
      if (depth >= 2) continue;
      const resolved = resolveArgObjects(prop.expression, consts, funcs);
      if (resolved.some((node) => node && hasProperty(node, key, consts, funcs, depth + 1))) return true;
      continue;
    }
    if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
    const name = prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : "";
    if (name !== key) continue;
    // `resume: undefined` 는 넘긴 것이 아니다.
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.initializer) && prop.initializer.text === "undefined") continue;
    return true;
  }
  return false;
}

/** 호출부를 감싸는 가장 가까운 이름 있는 함수. 전달자 판정에 쓴다. */
function enclosingFunctionName(node) {
  for (let cursor = node.parent; cursor; cursor = cursor.parent) {
    if (ts.isFunctionDeclaration(cursor) && cursor.name) return cursor.name.text;
    if ((ts.isFunctionExpression(cursor) || ts.isArrowFunction(cursor))
      && cursor.parent && ts.isVariableDeclaration(cursor.parent) && ts.isIdentifier(cursor.parent.name)) {
      return cursor.parent.name.text;
    }
    if (ts.isMethodDeclaration(cursor) && cursor.name && ts.isIdentifier(cursor.name)) return cursor.name.text;
  }
  return "";
}

/** 호출부를 감싸는 가장 바깥 함수 본문. 조건부 대입(`opts.resume = resume`) 탐색에 쓴다. */
function enclosingFunctionBody(node) {
  let outermost = null;
  for (let cursor = node.parent; cursor; cursor = cursor.parent) {
    if (ts.isFunctionDeclaration(cursor) || ts.isFunctionExpression(cursor)
      || ts.isArrowFunction(cursor) || ts.isMethodDeclaration(cursor)) {
      outermost = cursor.body || outermost;
    }
  }
  return outermost;
}

/**
 * 옵션 객체를 변수로 조립한 뒤 **조건부로** 서술자를 붙이는 형태를 인정한다.
 *   var gateOptions = {...}; if (resume) gateOptions.resume = resume; gate(gateOptions);
 * 🔴 리터럴만 보면 이 형태가 전부 미배선으로 잡힌다(js/saju-engine-tarot-sukuyo-quantum.js
 *    syOpenPaidSukuyoFeature 가 정확히 이 모양이다).
 */
function assignsResumeLater(argNode, callNode) {
  if (!argNode || !ts.isIdentifier(argNode)) return false;
  const scope = enclosingFunctionBody(callNode);
  if (!scope) return false;
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.name) && node.left.name.text === "resume"
      && ts.isIdentifier(node.left.expression) && node.left.expression.text === argNode.text) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return found;
}

function calleeName(node) {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) return node.expression.name.text;
  return "";
}

/** 파일 하나를 파싱해 필요한 것을 전부 뽑는다. */
function analyze(absolutePath) {
  const rel = toPosix(relative(root, absolutePath));
  const source = readFileSync(absolutePath, "utf8");
  const units = parseUnits(absolutePath, source);
  const parsed = [];
  for (const unit of units) {
    const kind = /\.tsx?$/i.test(rel) ? (/\.tsx$/i.test(rel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS) : ts.ScriptKind.JSX;
    const sourceFile = ts.createSourceFile(rel, unit.text, ts.ScriptTarget.Latest, true, kind);
    parsed.push({
      rel,
      source,
      sourceFile,
      lineOffset: unit.lineOffset,
      consts: collectAllConsts(sourceFile),
      funcs: collectFunctions(sourceFile),
      line: (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 + unit.lineOffset,
    });
  }
  return parsed;
}

const reactUnits = reactFiles.flatMap(analyze);
const staticUnits = staticFiles.flatMap(analyze);

/* ────────────────────────────────────────────────────────────────────────────
   3. 게이트 호출부 발견 + resume 판정
   ──────────────────────────────────────────────────────────────────────────── */

function collectCallSites(units, gates) {
  const sites = [];
  for (const unit of units) {
    if (IMPLEMENTATION_FILES.has(unit.rel)) continue;
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const callee = calleeName(node);
        const positions = gates.get(callee);
        if (positions) {
          const enclosing = enclosingFunctionName(node);
          if (!FORWARDER_FUNCTIONS.has(enclosing) && enclosing !== callee) {
            let hasResume = false;
            let unparsed = true;
            for (const position of positions) {
              const arg = node.arguments[position];
              if (!arg) continue;
              if (POSITIONAL_DESCRIPTOR_GATES.has(callee)) {
                unparsed = false;
                const isNullish = arg.kind === ts.SyntaxKind.NullKeyword
                  || (ts.isIdentifier(arg) && arg.text === "undefined");
                if (!isNullish) hasResume = true;
                continue;
              }
              const objects = resolveArgObjects(arg, unit.consts, unit.funcs);
              if (objects.some(Boolean)) unparsed = false;
              if (objects.some((objectLiteral) => hasProperty(objectLiteral, "resume", unit.consts, unit.funcs))
                || assignsResumeLater(arg, node)) {
                hasResume = true;
              }
            }
            sites.push({ file: unit.rel, line: unit.line(node), callee, hasResume, unparsed });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(unit.sourceFile, visit);
  }
  return sites;
}

const reactSites = collectCallSites(reactUnits, REACT_GATES);
const staticSites = collectCallSites(staticUnits, STATIC_GATES);

// ① fail-closed: 축 하나라도 0개면 발견 로직이 죽은 것이다.
assert.ok(
  reactSites.length > 0,
  `React 유료 게이트 호출부를 하나도 찾지 못했습니다. REACT_GATES 의 함수 이름(${[...REACT_GATES.keys()].join(", ")})이 바뀌었는지 확인하세요 — 가드가 조용히 무력화된 상태입니다.`,
);
assert.ok(
  staticSites.length > 0,
  `정적 축 유료 게이트 호출부를 하나도 찾지 못했습니다. STATIC_GATES 의 함수 이름(${[...STATIC_GATES.keys()].join(", ")})이 바뀌었는지 확인하세요 — 가드가 조용히 무력화된 상태입니다.`,
);

/* ────────────────────────────────────────────────────────────────────────────
   4. kind ↔ 핸들러 짝맞춤 (정적 축)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * "등록기"의 고정점 — 첫 파라미터를 그대로 다른 등록기의 첫 인자로 넘기는 함수는 등록기다.
 * (`_seRegisterResumeHandler` · `syRegisterUnlockResumeHandler` · `_dpRegisterPaidResumeHandler`)
 */
function collectForwardingHelpers(units, rootNames, matchBody) {
  const names = new Set(rootNames);
  for (let pass = 0; pass < 4; pass += 1) {
    let grew = false;
    for (const unit of units) {
      for (const [name, fn] of unit.funcs) {
        if (names.has(name) || !fn.parameters?.length) continue;
        const firstParam = fn.parameters[0];
        if (!ts.isIdentifier(firstParam.name)) continue;
        if (matchBody(fn, firstParam.name.text, names)) {
          names.add(name);
          grew = true;
        }
      }
    }
    if (!grew) break;
  }
  return names;
}

function bodyForwardsToRegistrar(fn, paramName, registrars) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isCallExpression(node) && registrars.has(calleeName(node))) {
      const first = node.arguments[0];
      if (first && ts.isIdentifier(first) && first.text === paramName) found = true;
    }
    ts.forEachChild(node, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}

/** 첫 파라미터를 `kind:` 로 담은 객체를 만드는 함수 = 서술자 빌더(syBuildUnlockResumeDescriptor). */
function bodyBuildsDescriptor(fn, paramName) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isObjectLiteralExpression(node)) {
      const names = node.properties
        .filter((prop) => prop.name && ts.isIdentifier(prop.name))
        .map((prop) => prop.name.text);
      // 🔴 `{kind: p0}` 만으로는 서술자가 아니다 — 레벨 원장 등 다른 축의 `kind` 와 충돌한다.
      //    재개 서술자는 반드시 action 또는 args 를 함께 든다(checkout-entry sanitize 계약).
      const kindProp = !names.includes("action") && !names.includes("args") ? null : node.properties.find((prop) => (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop))
        && prop.name && ts.isIdentifier(prop.name) && prop.name.text === "kind");
      if (kindProp) {
        const value = ts.isPropertyAssignment(kindProp) ? kindProp.initializer : kindProp.name;
        if (value && ts.isIdentifier(value) && value.text === paramName) found = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}

const registrarNames = collectForwardingHelpers(staticUnits, ROOT_REGISTRARS, bodyForwardsToRegistrar);
const descriptorBuilderNames = collectForwardingHelpers(
  staticUnits,
  [],
  (fn, paramName) => bodyBuildsDescriptor(fn, paramName),
);

const registeredKinds = new Map(); // kind -> "file:line"
const describedKinds = new Map();
const unresolvedKinds = []; // {file, line, role}

for (const unit of staticUnits) {
  const note = (bucket, folded, node, role) => {
    if (folded) {
      if (!bucket.has(folded)) bucket.set(folded, `${unit.rel}:${unit.line(node)}`);
    } else {
      unresolvedKinds.push({ file: unit.rel, line: unit.line(node), role });
    }
  };
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = calleeName(node);
      const enclosing = enclosingFunctionName(node);
      const first = node.arguments[0];
      if (registrarNames.has(callee) && first && !registrarNames.has(enclosing)) {
        note(registeredKinds, constFoldString(first, unit.consts), node, "핸들러 등록");
      }
      if (descriptorBuilderNames.has(callee) && first && !descriptorBuilderNames.has(enclosing)) {
        note(describedKinds, constFoldString(first, unit.consts), node, "서술자 생성");
      }
    }
    // 파생 서술자 — `base.kind = SY_..._RESUME_KIND;` (기본 서술자를 복제해 kind 만 갈아 끼우는 형태).
    // 🔴 접히지 않는 값은 여기서 세지 않는다. 그러면 그 kind 의 핸들러가 ⑥ 로 잡히므로,
    //    fail-closed 방향(문자열 상수로 두라)으로 떨어진다.
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.name) && node.left.name.text === "kind") {
      const folded = constFoldString(node.right, unit.consts);
      if (folded && !describedKinds.has(folded)) describedKinds.set(folded, `${unit.rel}:${unit.line(node)}`);
    }
    // 서술자 객체 리터럴 — `{kind: ..., action: ...}` 또는 `{kind: ..., args: ...}`
    if (ts.isObjectLiteralExpression(node)) {
      const names = node.properties
        .filter((prop) => prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)))
        .map((prop) => prop.name.text);
      if (names.includes("kind") && (names.includes("action") || names.includes("args"))) {
        const kindProp = node.properties.find((prop) => prop.name
          && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) && prop.name.text === "kind");
        const value = ts.isPropertyAssignment(kindProp) ? kindProp.initializer : kindProp.name;
        const folded = constFoldString(value, unit.consts);
        // 파라미터를 그대로 담는 빌더 본문은 여기서 세지 않는다(호출부에서 이미 셌다).
        const isParamPassthrough = value && ts.isIdentifier(value) && !folded;
        if (!isParamPassthrough || folded) note(describedKinds, folded, node, "서술자 생성");
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(unit.sourceFile, visit);
}

/* ────────────────────────────────────────────────────────────────────────────
   5. 계약 정본이 살아 있는지 (배선이 끊기면 위 전부가 무의미하다)
   ──────────────────────────────────────────────────────────────────────────── */

{
  const entry = read("js/core/checkout-entry.js");
  for (const [marker, why] of [
    ["function registerPaidResumeHandler(", "재개 핸들러 레지스트리"],
    ["function readPaidResumeHandler(", "등록된 핸들러 조회(있으면 표면을 다시 열지 않는다)"],
    ["function runPaidResume(", "복귀 후 재개 실행 정본"],
    ["function sanitizePaidResumeDescriptor(", "서술자 직렬화 계약"],
  ]) {
    assert.ok(entry.includes(marker), `js/core/checkout-entry.js 에서 ${why}(${marker})를 찾지 못했습니다 — 재개 계약이 사라졌거나 이름이 바뀌었습니다.`);
  }
  assert.match(
    entry,
    /readPaidResumeHandler\(/,
    "runPaidResume 은 등록된 핸들러를 먼저 봐야 합니다(없으면 딥링크로 표면만 열려 이중 오픈이 납니다).",
  );

  const hook = read("app/hooks/usePaidResume.ts");
  assert.match(
    hook,
    /registerPaidResumeHandler\(/,
    "app/hooks/usePaidResume.ts 가 핸들러를 등록하지 않습니다 — React 축 서술자가 전부 '지금 열기' 카드로 떨어집니다.",
  );
  assert.match(
    hook,
    /kind,\s*action:\s*""/,
    "usePaidResume 의 서술자 action 은 빈 문자열이어야 합니다(React 라우트는 복귀 URL 이 자기 자신이라 딥링크를 넣으면 이중 이동이 납니다).",
  );

  // 복귀 처리가 서술자를 실제로 티켓에 싣는지 — 이 배선이 끊기면 호출부가 아무리 넘겨도 죽는다.
  const dp = read("js/destiny-profile.js");
  assert.match(
    dp,
    /_dpResumeDirectPaymentAfterRedirect/,
    "js/destiny-profile.js 의 리다이렉트 복귀 처리(_dpResumeDirectPaymentAfterRedirect)가 사라졌습니다.",
  );
  assert.match(
    dp,
    /_cdCoinGatePerUse[\s\S]{0,4000}?resume/,
    "_cdCoinGatePerUse 가 resume 서술자를 게이트로 넘기지 않습니다 — 축약형 호출부(타로 3종)의 서술자가 티켓에 실리지 않습니다.",
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   6. 판정
   ──────────────────────────────────────────────────────────────────────────── */

const backlogKey = (file, callee) => `${file}::${callee}`;
const backlog = new Map(UNWIRED_BACKLOG.map(([file, callee, why]) => [backlogKey(file, callee), why]));
const backlogHit = new Set();
const backlogWired = [];

const failures = [];
for (const site of [...reactSites, ...staticSites]) {
  const key = backlogKey(site.file, site.callee);
  if (site.hasResume) {
    // ③ 배선됐는데 아직 목록에 남아 있다 → 목록이 거짓말이 되기 전에 지운다.
    if (backlog.has(key)) {
      backlogHit.add(key);
      backlogWired.push(`${site.file}:${site.line} ${site.callee}() — 이미 resume 을 넘깁니다. UNWIRED_BACKLOG 에서 지우세요.`);
    }
    continue;
  }
  if (backlog.has(key)) {
    backlogHit.add(key);
    continue;
  }
  failures.push(
    `${site.file}:${site.line} ${site.callee}() — 결제 후 자동 재개(resume) 서술자를 넘기지 않습니다`
    + (site.unparsed ? " (인자를 정적으로 해석하지 못했습니다 — 게이트 인자를 같은 파일에서 조립하세요)" : "")
    + ".\n    모바일 PortOne 은 상위 프레임을 리다이렉트하므로 이대로 두면 결제 후 이 기능이 열리지 않고 메인 화면으로 갑니다."
    + "\n    배선: (React) app/hooks/usePaidResume.ts 의 usePaidResume(featureKey, handler) → resume 옵션."
    + "\n          (정적) checkoutEntry.registerPaidResumeHandler(kind, fn) + 게이트 옵션 resume:{kind,action,args}."
    + "\n    레시피와 사고 사례: docs/handoff/paid-feature-resume-2026-09-06.md",
  );
}

// ② 미분류 실패
assert.deepEqual(failures, [], `\n결제 후 자동 재개가 배선되지 않은 유료 게이트 호출부가 있습니다:\n\n${failures.join("\n\n")}\n`);

// ③ 낡은 선언(이미 배선됨)
assert.deepEqual(backlogWired, [], `\nUNWIRED_BACKLOG 가 낡았습니다:\n${backlogWired.join("\n")}\n`);

// ④ 죽은 선언(호출부 자체가 없음)
const staleBacklog = [];
for (const [key, why] of backlog) {
  if (!backlogHit.has(key)) staleBacklog.push(`${key} — 해당 호출부가 소스에 없습니다 (사유: ${why})`);
}
assert.deepEqual(staleBacklog, [], `\nUNWIRED_BACKLOG 에 죽은 선언이 있습니다. 목록이 거짓말이 되기 전에 지우세요:\n${staleBacklog.join("\n")}\n`);

// ⑤ 서술자만 있고 핸들러가 없는 kind
const orphanDescriptors = [...describedKinds]
  .filter(([kind]) => !registeredKinds.has(kind))
  .map(([kind, where]) => `${where} kind="${kind}" — 이 kind 로 등록된 재개 핸들러가 없습니다. 복귀하면 8초 폴링 뒤 '지금 열기' 카드로만 떨어집니다.`);
assert.deepEqual(orphanDescriptors, [], `\n재개 서술자의 kind 에 짝이 되는 핸들러가 없습니다:\n${orphanDescriptors.join("\n")}\n`);

// ⑥ 핸들러만 있고 아무도 안 쓰는 kind (리네임 뒤 남은 죽은 배선)
const orphanHandlers = [...registeredKinds]
  .filter(([kind]) => !describedKinds.has(kind))
  .map(([kind, where]) => `${where} kind="${kind}" — 이 kind 를 쓰는 재개 서술자가 없습니다(리네임 뒤 남은 죽은 배선이거나, 게이트 호출부가 서술자를 안 만듭니다).`);
assert.deepEqual(orphanHandlers, [], `\n등록됐지만 아무도 쓰지 않는 재개 핸들러가 있습니다:\n${orphanHandlers.join("\n")}\n`);

// kind 를 정적으로 못 푼 곳 — 선언되지 않았으면 실패다(fail-closed).
const allowedUnresolved = new Set(UNRESOLVED_STATIC_KINDS.map(([file, line]) => `${file}:${line}`));
const unexpectedUnresolved = unresolvedKinds
  .filter((item) => !allowedUnresolved.has(`${item.file}:${item.line}`))
  .map((item) => `${item.file}:${item.line} (${item.role}) — kind 를 정적으로 풀지 못했습니다. 같은 파일의 문자열 상수로 두세요(짝 대조가 통째로 빠집니다).`);
assert.deepEqual(unexpectedUnresolved, [], `\n재개 kind 를 정적으로 풀지 못한 곳이 있습니다:\n${unexpectedUnresolved.join("\n")}\n`);

/* ────────────────────────────────────────────────────────────────────────────
   7. 워크플로 배선 — 이 가드가 읽는 메커니즘 파일은 트리거 paths 에도 있어야 한다 (원칙 10)
   ──────────────────────────────────────────────────────────────────────────── */

{
  const workflow = read(".github/workflows/paid-flow-gates.yml");
  const MECHANISM_FILES = [
    "js/core/checkout-entry.js",
    "js/destiny-profile.js",
    "app/hooks/usePaidResume.ts",
    "js/saju-engine.js",
    "js/saju-engine-tarot-sukuyo-quantum.js",
    "js/entertain-engine.js",
    "js/sibyl-system.js",
    "js/iching-engine.js",
    "js/animal-totem-experience.js",
    "js/core/index-inline-runtime.js",
    "js/oracle-kcg.js",
  ];
  const missing = MECHANISM_FILES.filter((file) => !workflow.includes(`"${file}"`));
  assert.deepEqual(
    missing,
    [],
    `이 가드가 읽는 파일이 paid-flow-gates.yml 의 트리거 paths 에 없습니다 — 그 파일만 고친 PR 에서는 가드가 안 돕니다: ${missing.join(", ")}`,
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

const wiredReact = reactSites.filter((site) => site.hasResume).length;
const wiredStatic = staticSites.filter((site) => site.hasResume).length;
console.log(
  `[verify-paid-resume-wiring] PASS — 게이트 호출부 React ${wiredReact}/${reactSites.length} · 정적 ${wiredStatic}/${staticSites.length} 배선,`
  + ` 재개 kind ${registeredKinds.size}개가 핸들러와 짝을 이룹니다.`,
);
if (backlog.size > 0) {
  console.log(`  ⚠️ 미배선 후속 과제 ${backlog.size}건이 UNWIRED_BACKLOG 에 선언돼 있습니다 — 결제 후 그 화면은 스스로 열리지 않습니다:`);
  for (const [key, why] of backlog) console.log(`     · ${key} — ${why}`);
}
