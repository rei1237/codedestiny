/**
 * 크론 DB op 커버리지 가드 — "크론에서 도달하는 DB 접촉은 activeMongoOps 안에 있어야 한다"
 *
 * 배경(2026-09-03 실사고):
 *   worker/lib/db.js 는 connectDb 호출마다 웜 커넥션을 ping 으로 재검증하고, 실패하면
 *   detachDeadWarmConnection() → MongoClient.close() 로 떼어 낸다. 그 close 가 activeSessions 를
 *   전부 끝내므로 **진행 중인 남의 op** 가 "Cannot use a session that has ended" 로 죽는다.
 *   그 파괴를 막는 장치는 딱 하나 — ping 실패 직후의 in-flight 가드다:
 *
 *     if (mongoose.connection.readyState === 1 && countActiveMongoOps() > activeOpsOwned) { ... 안 끊는다 }
 *
 *   그런데 activeMongoOps 에 등록하는 주체는 **withMongoRetry 뿐이다**. 크론 태스크들은 raw 모델 op 을
 *   직접 불렀으므로 설계상 그 보호 밖에 서 있었고, 22:00Z 에 크론 둘이 같은 아이솔레이트에서 겹치자
 *   6개 태스크 중 4개가 통째로 죽었다(SNS 일일 발행 성공 0건).
 *
 * 이 가드가 집행하는 계약(설계 규칙):
 *   크론에서 도달하는 모든 DB 접촉을, **외부 HTTP 를 포함하지 않는 가장 큰 호출 단위**로
 *   withMongoRetry(env, () => …) 안에 넣는다. 그 단위가 비멱등 쓰기($inc / .create( / insertMany()를
 *   포함하면 { retries: 0 } 을 명시한다.
 *   ("가장 큰 단위"는 ping 횟수를 줄이기 위한 것이지 감싸지 않아도 된다는 뜻이 아니다 —
 *    래핑은 호출 지점에서 하면 되므로 어떤 op 이든 감쌀 수 있다.)
 *
 * 손으로 쓴 파일 목록을 두지 않는다(CLAUDE.md 원칙 10):
 *   - 모델 식별자는 worker/lib/models.js 에서 전수 발견하고, 발견 수가 mongoose.model( 호출 수와
 *     어긋나면 실패한다(선언 형태가 바뀌어 조용히 빠지는 것을 막는다).
 *   - 크론 진입점은 worker/index.js 의 scheduled( 본문에서 전수 발견한다.
 *   - 거기서 도달하는 worker/** 모듈 그래프를 훑는다. 해석 못 한 진입점·동적 import 는 실패다.
 *   구간 파싱은 scripts/verify-no-nested-retry.mjs 가 이미 쓰는 괄호 매칭 기법을 그대로 쓴다.
 *
 * 🔴 UNCOVERED_BASELINE 은 **발견 목록이 아니라 부채 원장**이다.
 *   가드는 언제나 전수 발견하고 전수 신고한다. 원장은 "오늘 남아 있는 것"만 적어 두고,
 *   새 파일이 나타나거나 개수가 늘면 실패한다. 목록에 없는 파일은 0건이어야 한다.
 *   원장에 남은 28건은 전부 **결제 웹훅 정산 경로**(요청 핸들러 그래프)다. 크론이 그 경로를 타지만
 *   그 안을 감싸는 것은 결제 요청 경로의 동작 변화 + payments.js 줄 수 상한(1줄 여유) 문제라
 *   이 작업(크론 자동 발행 복구)의 범위를 벗어난다. 별도 작업으로 0 으로 내린다.
 *
 * 🔴 이 가드가 보지 못하는 것: worker/payments/** V2 는 별도 커넥션(paymentConn)의 네이티브
 *   컬렉션을 쓴다 — 기본 커넥션의 소켓 파괴와 무관하므로 모델 식별자 스캔에 안 걸리는 것이 정상이다.
 *
 * 실행: npm run verify:cron-mongo-op-coverage
 *       npm run verify:cron-mongo-op-coverage -- --self-test
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isBuildArtifactDir } from "./lib/source-scan-ignore.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** 🔴 부채 원장 — 2026-09-03 실측. **올리지 말 것.** 줄었으면 그만큼 낮춘다(가드가 숫자를 알려준다). */
const UNCOVERED_BASELINE = Object.freeze({
  "worker/routes/payments.js": 15,
  "worker/lib/content-unlocks.js": 4,
  "worker/lib/payment-refund.js": 2,
});

/** 분석기가 죽으면 위반 0으로 초록불이 된다 — 발견 수 하한으로 그 자살을 잡는다. */
const FLOORS = Object.freeze({ entries: 6, functions: 120, ops: 40, covered: 20 });

/* ────────────────────────── 파싱 유틸 (verify-no-nested-retry.mjs 와 동일 기법) ────────────────────────── */

function collectJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (isBuildArtifactDir(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectJsFiles(full, out);
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** from 위치의 여는 괄호부터 짝이 맞는 닫는 괄호까지의 인덱스(포함). 못 찾으면 -1. */
function matchBalanced(source, from, open, close) {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 선언부 뒤 첫 '{' 부터 중괄호 균형이 맞는 지점까지를 본문으로 잘라낸다(화살표 const 포함). */
function functionBody(source, name) {
  const escaped = escapeRe(name);
  const declaration = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\([^)]*\\)\\s*\\{`);
  const match = declaration.exec(source);
  if (match) {
    const end = matchBalanced(source, match.index + match[0].length - 1, "{", "}");
    return end < 0 ? null : source.slice(match.index, end + 1);
  }
  const arrow = new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\s*=\\s*(?:async\\s*)?\\(`);
  const arrowMatch = arrow.exec(source);
  if (!arrowMatch) return null;
  const parenOpen = source.indexOf("(", arrowMatch.index + arrowMatch[0].length - 1);
  const parenClose = matchBalanced(source, parenOpen, "(", ")");
  if (parenClose < 0) return null;
  const afterArrow = source.indexOf("=>", parenClose);
  if (afterArrow < 0) return null;
  let cursor = afterArrow + 2;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source[cursor] === "{") {
    const end = matchBalanced(source, cursor, "{", "}");
    return end < 0 ? null : source.slice(arrowMatch.index, end + 1);
  }
  const semi = source.indexOf(";", cursor);
  return source.slice(arrowMatch.index, semi < 0 ? source.length : semi + 1);
}

/** 소스에서 선언된 모든 함수 이름(함수 선언 + 화살표 const). */
function declaredFunctionNames(source) {
  const names = new Set();
  for (const m of source.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g)) names.add(m[1]);
  for (const m of source.matchAll(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g)) names.add(m[1]);
  return names;
}

const NON_IDEMPOTENT_RE = [/\$inc\s*:/, /\.create\s*\(/, /\binsertMany\s*\(/];
const hasNonIdempotentMarker = (text) => NON_IDEMPOTENT_RE.some((re) => re.test(text));

const empty = (problems, extra = {}) => ({
  problems,
  models: new Set(),
  entries: new Set(),
  uncovered: [],
  nonIdempotent: [],
  stats: { functions: 0, ops: 0, covered: 0 },
  ...extra,
});

/* ────────────────────────── 분석기 (self-test 가 같은 함수를 합성 소스로 부른다) ────────────────────────── */

/**
 * @param {Map<string,string>} sources 절대경로 → 소스. modelsFile·indexFile 은 이 맵 안에 있어야 한다.
 */
export function analyzeCronMongoCoverage({ sources, modelsFile, indexFile }) {
  const problems = [];
  const bodiesByFile = new Map();
  for (const [file, source] of sources) {
    const bodies = new Map();
    for (const name of declaredFunctionNames(source)) {
      const body = functionBody(source, name);
      if (body) bodies.set(name, body);
    }
    bodiesByFile.set(file, bodies);
  }

  const resolveSpec = (file, spec) => {
    if (!spec.startsWith(".")) return null;
    const target = resolve(file, "..", spec.endsWith(".js") ? spec : `${spec}.js`);
    return sources.has(target) ? target : null;
  };

  /** 이 파일이 이름으로 끌어온 함수 → 원본 파일. 정적 import + 동적 import 두 형태를 모두 본다. */
  const importOrigins = (file, source) => {
    const origins = new Map();
    for (const m of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
      const target = resolveSpec(file, m[2]);
      if (!target) continue;
      for (const part of m[1].split(",")) {
        const raw = part.trim();
        if (!raw) continue;
        const [orig, alias] = raw.split(/\s+as\s+/).map((s) => s.trim());
        origins.set(alias || orig, target);
      }
    }
    // const { runX } = await import("./x.js")
    for (const m of source.matchAll(/\{([^{}]+)\}\s*=\s*await\s+import\(\s*["']([^"']+)["']\s*\)/g)) {
      const target = resolveSpec(file, m[2]);
      if (!target) continue;
      for (const part of m[1].split(",")) {
        const raw = part.trim();
        if (!raw) continue;
        const [orig, alias] = raw.split(/\s*:\s*/).map((s) => s.trim());
        origins.set(alias || orig, target);
      }
    }
    // (await import("./x.js")…).runX(
    for (const m of source.matchAll(/await\s+import\(\s*["']([^"']+)["']\s*\)[^;\n]*?\)\s*\.\s*(\w+)\s*\(/g)) {
      const target = resolveSpec(file, m[1]);
      if (!target) continue;
      origins.set(m[2], target);
    }
    return origins;
  };
  const importOriginsByFile = new Map([...sources].map(([f, s]) => [f, importOrigins(f, s)]));

  /* ── 발견: 모델 ── */
  const modelsSource = sources.get(modelsFile);
  if (typeof modelsSource !== "string") return empty([...problems, `모델 정본을 못 읽었다: ${modelsFile}`]);
  const models = new Set();
  for (const m of modelsSource.matchAll(/export\s+const\s+(\w+)\s*=\s*mongoose\.models\.\w+/g)) models.add(m[1]);
  // 🔴 선언 형태가 바뀌면 그 모델의 op 이 통째로 스캔에서 빠지고 위반 0 으로 초록불이 된다.
  //    mongoose.model( 호출 수와 발견 수가 같아야 한다.
  const modelCtorCount = (modelsSource.match(/mongoose\.model\s*\(/g) || []).length;
  if (modelCtorCount !== models.size) {
    problems.push(`모델 발견 수(${models.size})가 mongoose.model( 호출 수(${modelCtorCount})와 다르다`
      + " — `export const X = mongoose.models.X || mongoose.model(\"X\", …)` 형태를 벗어난 선언이 있다.");
  }

  /* ── 발견: 크론 진입점 ── */
  const indexSource = sources.get(indexFile);
  if (typeof indexSource !== "string") return empty([...problems, `크론 진입 파일을 못 읽었다: ${indexFile}`], { models });
  const schedIdx = indexSource.indexOf("async scheduled(");
  if (schedIdx < 0) {
    return empty([...problems, "worker/index.js 에서 `async scheduled(` 를 못 찾았다 — 진입점 발견이 통째로 죽었다."], { models });
  }
  const schedOpen = indexSource.indexOf("{", indexSource.indexOf(")", schedIdx));
  const schedClose = matchBalanced(indexSource, schedOpen, "{", "}");
  if (schedClose < 0) return empty([...problems, "scheduled( 본문의 중괄호 짝을 못 맞췄다."], { models });
  const schedBody = indexSource.slice(schedOpen, schedClose + 1);

  const entries = new Set();
  for (const m of schedBody.matchAll(/\{([^{}]+)\}\s*=\s*await\s+import\(\s*["']([^"']+)["']\s*\)/g)) {
    const target = resolveSpec(indexFile, m[2]);
    if (!target) { problems.push(`scheduled( 안의 동적 import 를 해석하지 못했다: ${m[2]}`); continue; }
    for (const part of m[1].split(",")) entries.add(`${target}::${part.trim()}`);
  }
  for (const m of schedBody.matchAll(/await\s+import\(\s*["']([^"']+)["']\s*\)[^;\n]*?\)\s*\.\s*(\w+)\s*\(/g)) {
    const target = resolveSpec(indexFile, m[1]);
    if (!target) { problems.push(`scheduled( 안의 동적 import 를 해석하지 못했다: ${m[1]}`); continue; }
    entries.add(`${target}::${m[2]}`);
  }
  for (const key of entries) {
    const [file, name] = key.split("::");
    if (!bodiesByFile.get(file)?.get(name)) {
      problems.push("크론 진입점 본문을 잘라내지 못했다(동적 디스패치이거나 파서가 놓쳤다):"
        + ` ${relative(root, file).replace(/\\/g, "/")} → ${name}`);
    }
  }

  /* ── 비멱등 함수 집합(호출그래프 고정점) ── */
  const nonIdempotentFns = new Set();
  for (const [file, bodies] of bodiesByFile) {
    for (const [name, body] of bodies) if (hasNonIdempotentMarker(body)) nonIdempotentFns.add(`${file}::${name}`);
  }
  for (let pass = 0; pass < 24; pass += 1) {
    let grew = false;
    for (const [file, bodies] of bodiesByFile) {
      const imported = importOriginsByFile.get(file) || new Map();
      for (const [name, body] of bodies) {
        const key = `${file}::${name}`;
        if (nonIdempotentFns.has(key)) continue;
        for (const m of body.matchAll(/\b(\w+)\s*\(/g)) {
          const callee = m[1];
          if (callee === name) continue;
          const target = bodies.has(callee) ? file : imported.get(callee);
          if (!target || !nonIdempotentFns.has(`${target}::${callee}`)) continue;
          nonIdempotentFns.add(key);
          grew = true;
          break;
        }
      }
    }
    if (!grew) break;
  }

  /* ── 폐포를 훑으며 op 을 분류한다 ──
     covered=true 로 들어온 함수는 호출 지점이 이미 withMongoRetry 콜백 안이라는 뜻이다
     (opRecord 가 콜백 전 구간을 덮으므로 그 서브트리의 op 은 전부 등록돼 있다). */
  const opRe = models.size
    ? new RegExp(`\\b(${[...models].map(escapeRe).join("|")})\\s*\\.\\s*(\\w+)\\s*\\(`, "g")
    : null;
  const visited = new Set();
  const reached = new Set();
  const uncovered = [];
  const nonIdempotent = [];
  let scannedOps = 0;
  let coveredOps = 0;
  const queue = [...entries].map((key) => ({ key, covered: false }));
  while (queue.length) {
    const { key, covered } = queue.shift();
    const stamp = `${key}::${covered}`;
    if (visited.has(stamp)) continue;
    visited.add(stamp);
    const [file, name] = key.split("::");
    const body = bodiesByFile.get(file)?.get(name);
    if (!body) continue;
    reached.add(key);
    const rel = relative(root, file).replace(/\\/g, "/");
    const imported = importOriginsByFile.get(file) || new Map();
    const bodies = bodiesByFile.get(file);

    const regions = [];
    for (const m of body.matchAll(/withMongoRetry\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      const close = matchBalanced(body, open, "(", ")");
      if (close < 0) { problems.push(`withMongoRetry( 괄호 짝을 못 맞췄다: ${rel} → ${name}`); continue; }
      regions.push([m.index, close, body.slice(m.index, close + 1)]);
    }
    const inRegion = (i) => regions.some(([a, b]) => i >= a && i <= b);

    // 비멱등 축 — 콜백이 (전이적으로) $inc / .create( / insertMany( 를 품으면 retries: 0 이 필수다.
    if (!covered) {
      for (const [, , text] of regions) {
        let risky = hasNonIdempotentMarker(text);
        if (!risky) {
          for (const m of text.matchAll(/\b(\w+)\s*\(/g)) {
            const callee = m[1];
            const target = bodies.has(callee) ? file : imported.get(callee);
            if (target && nonIdempotentFns.has(`${target}::${callee}`)) { risky = true; break; }
          }
        }
        if (risky && !/\bretries\s*:\s*0\b/.test(text)) {
          nonIdempotent.push({ file: rel, name, snippet: text.replace(/\s+/g, " ").slice(0, 110) });
        }
      }
    }

    if (opRe) {
      for (const m of body.matchAll(opRe)) {
        scannedOps += 1;
        if (covered || inRegion(m.index)) coveredOps += 1;
        else uncovered.push({ file: rel, name, op: `${m[1]}.${m[2]}` });
      }
    }

    for (const m of body.matchAll(/\b(\w+)\s*\(/g)) {
      const callee = m[1];
      if (callee === name) continue;
      const next = covered || inRegion(m.index);
      if (bodies.has(callee)) queue.push({ key: `${file}::${callee}`, covered: next });
      else if (imported.has(callee)) {
        const target = imported.get(callee);
        if (bodiesByFile.get(target)?.has(callee)) queue.push({ key: `${target}::${callee}`, covered: next });
      }
    }
  }

  return {
    problems,
    models,
    entries,
    uncovered,
    nonIdempotent,
    stats: { functions: reached.size, ops: scannedOps, covered: coveredOps },
  };
}

/* ────────────────────────── self-test ────────────────────────── */

const FIXTURE_MODELS = [
  "import mongoose from \"mongoose\";",
  "export const User = mongoose.models.User || mongoose.model(\"User\", s);",
  "export const PointHistory = mongoose.models.PointHistory || mongoose.model(\"PointHistory\", s);",
  "",
].join("\n");

const FIXTURE_INDEX = [
  "export default {",
  "  async scheduled(event, env, ctx) {",
  "    const { runTask } = await import(\"./lib/task.js\");",
  "    ctx.waitUntil(runTask(env));",
  "  },",
  "};",
  "",
].join("\n");

function fixture(taskSource, { indexSource, modelsSource } = {}) {
  const base = "/fx";
  const sources = new Map([
    [resolve(base, "lib/models.js"), modelsSource ?? FIXTURE_MODELS],
    [resolve(base, "lib/task.js"), taskSource],
    [resolve(base, "index.js"), indexSource ?? FIXTURE_INDEX],
  ]);
  return analyzeCronMongoCoverage({
    sources,
    modelsFile: resolve(base, "lib/models.js"),
    indexFile: resolve(base, "index.js"),
  });
}

function runSelfTest() {
  const cases = [
    ["날 op 신고", () => {
      const r = fixture([
        "import { User } from \"./models.js\";",
        "export async function runTask(env) {",
        "  return User.find({ a: 1 }).lean();",
        "}",
        "",
      ].join("\n"));
      if (r.uncovered.length !== 1) return `미커버 1건이어야 하는데 ${r.uncovered.length}건`;
      if (r.uncovered[0].op !== "User.find") return `op 이 User.find 가 아니다: ${r.uncovered[0].op}`;
      return null;
    }],

    // 호출 지점에서 감싸면 그 서브트리 전체가 덮인다 — 이 전파가 깨지면 레포 전체가 오탐으로 뒤덮인다.
    ["호출 지점 래핑이 하위 함수까지 덮는다", () => {
      const r = fixture([
        "import { User } from \"./models.js\";",
        "import { withMongoRetry } from \"./db.js\";",
        "async function loadUsers() {",
        "  return User.find({ a: 1 }).lean();",
        "}",
        "export async function runTask(env) {",
        "  return withMongoRetry(env, () => loadUsers());",
        "}",
        "",
      ].join("\n"));
      if (r.uncovered.length !== 0) return `미커버 0건이어야 하는데 ${r.uncovered.length}건`;
      if (r.stats.covered < 1) return "감싼 op 을 하나도 못 셌다(분석기 사망)";
      return null;
    }],

    ["해석 불가한 크론 진입점 신고", () => {
      const r = fixture("export async function runTask(env) { return 1; }\n", {
        indexSource: FIXTURE_INDEX.replace(/runTask/g, "runGhost"),
      });
      if (!r.problems.some((p) => p.includes("runGhost"))) return `runGhost 미해결을 신고하지 않았다: ${JSON.stringify(r.problems)}`;
      return null;
    }],

    ["비멱등 콜백은 retries: 0 이 필수", () => {
      const body = (opts) => [
        "import { PointHistory } from \"./models.js\";",
        "import { withMongoRetry } from \"./db.js\";",
        "export async function runTask(env) {",
        `  return withMongoRetry(env, () => PointHistory.create({ a: 1 })${opts});`,
        "}",
        "",
      ].join("\n");
      const bad = fixture(body(""));
      if (bad.nonIdempotent.length !== 1) return `신고 1건이어야 하는데 ${bad.nonIdempotent.length}건`;
      const good = fixture(body(", { retries: 0 }"));
      if (good.nonIdempotent.length !== 0) return `retries:0 을 붙였는데 ${good.nonIdempotent.length}건 신고했다`;
      return null;
    }],

    // 모델 선언 형태가 바뀌면 그 모델 op 이 스캔에서 통째로 빠져 "위반 0" 이 된다.
    ["모델 선언 형태가 깨지면 신고", () => {
      const r = fixture([
        "import { User } from \"./models.js\";",
        "export async function runTask(env) { return User.find({ a: 1 }).lean(); }",
        "",
      ].join("\n"), {
        modelsSource: FIXTURE_MODELS.replace("export const User = mongoose.models.User", "const UserTmp = mongoose.models.User"),
      });
      if (!r.problems.some((p) => p.includes("mongoose.model("))) {
        return `모델 발견 수 불일치를 신고하지 않았다: ${JSON.stringify(r.problems)}`;
      }
      return null;
    }],
  ];

  let failed = 0;
  for (const [label, run] of cases) {
    const reason = run();
    if (reason) { failed += 1; console.error(`  ✗ ${label} — ${reason}`); }
    else console.log(`  ✓ ${label}`);
  }
  if (failed) {
    console.error(`\n❌ self-test 실패 ${failed}/${cases.length} — 분석기가 고장 났다. 본 검사 결과를 믿지 말 것.`);
    process.exit(1);
  }
  console.log(`\n✅ self-test 통과 (${cases.length}/${cases.length})`);
}

/* ────────────────────────── 본 실행 ────────────────────────── */

function runMain() {
  const workerRoot = resolve(root, "worker");
  const files = collectJsFiles(workerRoot);
  const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
  const report = analyzeCronMongoCoverage({
    sources,
    modelsFile: resolve(workerRoot, "lib/models.js"),
    indexFile: resolve(workerRoot, "index.js"),
  });

  console.log(`=== 크론 DB op 커버리지 (worker/*.js ${files.length}개) ===\n`);
  console.log(`모델 ${report.models.size}개 · 크론 진입점 ${report.entries.size}개 · 도달 함수 ${report.stats.functions}개`);
  console.log(`모델 op ${report.stats.ops}건 (withMongoRetry 안 ${report.stats.covered} · 밖 ${report.uncovered.length})\n`);

  const failures = [];

  // [0] 해석 불가 — 하나라도 있으면 아래 판정 전부를 믿을 수 없다.
  if (report.problems.length) {
    failures.push("[0] 해석 불가");
    console.error("[0] ❌ 소스를 해석하지 못한 지점이 있다 — 이 상태의 '위반 0건'은 증거가 아니다:");
    for (const p of report.problems) console.error(`      · ${p}`);
    console.error("");
  } else {
    console.log("[0] ✅ 모델 선언·크론 진입점·동적 import 를 전부 해석했다.");
  }

  // [1] 분석기 생존 — 발견 수 하한.
  const floorMisses = [];
  if (report.entries.size < FLOORS.entries) floorMisses.push(`진입점 ${report.entries.size} < ${FLOORS.entries}`);
  if (report.stats.functions < FLOORS.functions) floorMisses.push(`도달 함수 ${report.stats.functions} < ${FLOORS.functions}`);
  if (report.stats.ops < FLOORS.ops) floorMisses.push(`모델 op ${report.stats.ops} < ${FLOORS.ops}`);
  if (report.stats.covered < FLOORS.covered) floorMisses.push(`감싼 op ${report.stats.covered} < ${FLOORS.covered}`);
  if (floorMisses.length) {
    failures.push("[1] 분석기 생존");
    console.error("[1] ❌ 발견 수가 하한 아래다 — 분석기가 죽었거나 진입점이 사라졌다(초록불을 믿지 말 것):");
    for (const m of floorMisses) console.error(`      · ${m}`);
    console.error("      리팩터로 정말 줄었다면 FLOORS 를 근거(날짜·측정 명령)와 함께 낮춘다.\n");
  } else {
    console.log("[1] ✅ 발견 수가 전부 하한 이상이다.");
  }

  // [2] 부채 원장 대조 — 파일별로 늘었거나 원장에 없는 파일이 나타나면 실패.
  const byFile = new Map();
  for (const u of report.uncovered) {
    if (!byFile.has(u.file)) byFile.set(u.file, []);
    byFile.get(u.file).push(u);
  }
  const grown = [];
  const shrunk = [];
  for (const [file, list] of byFile) {
    const allowed = UNCOVERED_BASELINE[file] ?? 0;
    if (list.length > allowed) grown.push({ file, list, allowed });
  }
  for (const [file, allowed] of Object.entries(UNCOVERED_BASELINE)) {
    const now = byFile.get(file)?.length ?? 0;
    if (now < allowed) shrunk.push({ file, now, allowed });
  }
  if (grown.length) {
    failures.push("[2] 보호 밖 DB op");
    console.error("[2] ❌ 크론에서 도달하는데 withMongoRetry 밖에 있는 모델 op 이 늘었다:");
    for (const g of grown) {
      console.error(`    ${g.file} — ${g.list.length}건 (원장 ${g.allowed}건)`);
      for (const v of g.list) console.error(`      · ${v.name}(): ${v.op}`);
    }
    console.error("      고치는 법: 외부 HTTP 를 포함하지 않는 **가장 큰 호출 단위**를 호출 지점에서");
    console.error("      withMongoRetry(env, () => …) 로 감싼다. op 하나하나 감싸면 ping 이 그만큼 늘어난다.");
    console.error("      🔴 그 서브트리 안에 재시도를 새로 넣지 말 것 — verify:no-nested-retry 가 잡는다.\n");
  } else {
    console.log(`[2] ✅ 보호 밖 모델 op 이 부채 원장(${report.uncovered.length}건) 안에 있다.`);
  }
  if (shrunk.length) {
    console.log("      ↓ 원장을 조일 수 있다 — UNCOVERED_BASELINE 을 아래 값으로 낮춘다:");
    for (const s of shrunk) console.log(`        "${s.file}": ${s.now},   // 이전 ${s.allowed}`);
  }

  // [3] 비멱등 축.
  if (report.nonIdempotent.length) {
    failures.push("[3] 비멱등 재시도");
    console.error(`[3] ❌ 비멱등 쓰기($inc / .create( / insertMany()를 품은 콜백에 { retries: 0 } 이 없다 — ${report.nonIdempotent.length}건:`);
    for (const n of report.nonIdempotent) console.error(`      · ${n.file} → ${n.name}(): ${n.snippet}`);
    console.error("      재시도가 같은 지급·원장을 두 번 쓴다. withMongoRetry(env, cb, { retries: 0 }) 로 명시한다.\n");
  } else {
    console.log("[3] ✅ 비멱등 콜백은 전부 retries: 0 을 명시한다.");
  }

  if (failures.length) {
    console.error(`\n❌ 크론 DB op 커버리지 실패 — ${failures.join(" · ")}`);
    process.exit(1);
  }
  console.log("\n✅ 통과 — 크론 태스크의 모델 op 이 전부 withMongoRetry 안에 있다"
    + ` (남은 ${report.uncovered.length}건은 결제 웹훅 정산 경로, 원장으로 고정).`);
}

if (process.argv.includes("--self-test")) runSelfTest();
else runMain();
