#!/usr/bin/env node
//
// 환경 키 정합성 게이트.
//
// 존재 이유: 이 저장소는 런타임 코드가 읽는 키와 실제로 선언된 키가 거의 겹치지 않는
// 상태로 오래 굴러왔다(2026-08 진단 시점: 직접 접근 159개 중 선언 일치 39개). 그래서
// MONGO_URI·JWT_ACCESS_SECRET 같은 키가 "어디에 넣어야 하는지" 아무 데도 적혀 있지 않고,
// 같은 값을 가리키는 이름이 최대 6종(오타 포함)까지 병존했다. 불일치는 런타임에서야
// 터지므로, 배포가 시작되기 전에 여기서 막는다.
//
// 정본은 config/env.contract.json 하나다. 이 파일은 키 '이름과 메타데이터'만 담으며
// 값은 절대 담지 않는다. 이 스크립트도 값은 읽지 않고 이름만 대조한다.
//
// 사용법:
//   node scripts/env-parity.mjs             기본 검사
//   node scripts/env-parity.mjs --strict    alias 사용을 경고가 아니라 실패로 처리
//   node scripts/env-parity.mjs --remote    Cloudflare 원격 시크릿 목록까지 대조
//   node scripts/env-parity.mjs --report    관측된 키 현황만 출력(계약 갱신용, 검사 안 함)

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isBuildArtifactDir } from "./lib/source-scan-ignore.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const remote = args.has("--remote");
const reportOnly = args.has("--report");

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const failures = [];
const warnings = [];
const infos = [];
const skips = [];

function fail(check, message) {
  failures.push({ check, message });
}
function warn(check, message) {
  warnings.push({ check, message });
}

// ─────────────────────────────────────────── 계약 로드

function loadContract() {
  const contractPath = resolve(repoRoot, "config/env.contract.json");
  if (!existsSync(contractPath)) {
    console.error("[env-parity] FAIL: config/env.contract.json not found.");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(contractPath, "utf8"));
  } catch (error) {
    console.error(`[env-parity] FAIL: could not parse config/env.contract.json — ${error.message}`);
    process.exit(1);
  }
  return {
    scanRoots: parsed.scanRoots || [],
    platformProvided: new Set(parsed.platformProvided || []),
    bindings: new Set(parsed.bindings || []),
    aliases: parsed.aliases || {},
    keys: parsed.keys || [],
  };
}

// ─────────────────────────────────────────── 소스 스캔

function collectSourceFiles(roots) {
  const files = [];
  const visit = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      // 점으로 시작하는 이름(.wrangler 등)은 이미 걸러지지만 build-cache·dist 는 아니었다.
      // 번들에는 env 참조가 전부 인라인돼 있어 계약 대조가 통째로 어긋난다.
      if (name.startsWith(".") || isBuildArtifactDir(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (SOURCE_EXTENSIONS.test(name)) files.push(full);
    }
  };
  for (const root of roots) {
    const full = resolve(repoRoot, root);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) visit(full);
    else files.push(full);
  }
  return files;
}

// process.env.X / env.X / process.env["X"] / env["X"]
const DIRECT_ACCESS = /(?:process\.env|(?<![\w$.])env)\s*(?:\.([A-Z][A-Z0-9_]{2,})|\[\s*["'`]([A-Z][A-Z0-9_]{2,})["'`]\s*\])/g;
// 키 이름을 배열로 늘어놓고 순회하는 폴백 코드(worker/lib/gemini.js 등)를 놓치지 않기 위한 보조 신호.
const STRING_LITERAL = /["'`]([A-Z][A-Z0-9_]{3,})["'`]/g;

function scanUsage(roots) {
  const direct = new Map();
  const literal = new Map();
  for (const file of collectSourceFiles(roots)) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rel = relative(repoRoot, file).replace(/\\/g, "/");
    for (const match of text.matchAll(DIRECT_ACCESS)) {
      const key = match[1] || match[2];
      if (!direct.has(key)) direct.set(key, new Set());
      direct.get(key).add(rel);
    }
    for (const match of text.matchAll(STRING_LITERAL)) {
      const key = match[1];
      if (!literal.has(key)) literal.set(key, new Set());
      literal.get(key).add(rel);
    }
  }
  return { direct, literal };
}

// ─────────────────────────────────────────── 선언 파일 읽기 (이름만)

function envFileKeys(relPath) {
  const full = resolve(repoRoot, relPath);
  if (!existsSync(full)) return null;
  const keys = new Set();
  for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.add(match[1].replace(/-/g, "_").toUpperCase());
  }
  return keys;
}

function wranglerVars(relPath) {
  const full = resolve(repoRoot, relPath);
  if (!existsSync(full)) return new Set();
  const text = readFileSync(full, "utf8");
  const start = text.indexOf("[vars]");
  if (start < 0) return new Set();
  const rest = text.slice(start + "[vars]".length);
  const end = rest.search(/^\[/m);
  const block = end < 0 ? rest : rest.slice(0, end);
  const keys = new Set();
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

// ─────────────────────────────────────────── 원격 시크릿 목록 (이름만)

function remoteSecretNames(label, wranglerArgs) {
  // Node 20+ refuses to spawn .cmd shims without a shell, so Windows needs shell: true.
  const onWindows = process.platform === "win32";
  const result = spawnSync(onWindows ? "npx.cmd" : "npx", ["wrangler", ...wranglerArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    shell: onWindows,
    timeout: 120_000,
  });
  if (result.status !== 0) {
    const reason = String(result.stderr || result.error?.message || "unknown error").trim().split(/\r?\n/)[0];
    skips.push(`remote:${label} — ${reason || "wrangler call failed"}`);
    return null;
  }
  const text = String(result.stdout || "");
  const names = new Set();
  // `wrangler secret list` returns JSON; `wrangler pages secret list` prints
  // "  - NAME: Value Encrypted" lines. Both are name-only — no value is ever read.
  try {
    for (const entry of JSON.parse(text)) {
      if (entry?.name) names.add(String(entry.name).toUpperCase());
    }
    return names;
  } catch {
    for (const match of text.matchAll(/^\s*-\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)) {
      names.add(match[1].toUpperCase());
    }
    // An empty environment is a legitimate answer, not a parse failure: the list
    // header is the signal that wrangler answered at all.
    if (names.size === 0 && !/following secrets/i.test(text)) {
      skips.push(`remote:${label} — could not parse wrangler output`);
      return null;
    }
    return names;
  }
}

// ─────────────────────────────────────────── 실행

const contract = loadContract();
const { direct, literal } = scanUsage(contract.scanRoots);

const contractKeys = new Map(contract.keys.map((entry) => [entry.name, entry]));
const aliasToCanonical = new Map();
for (const [canonical, aliases] of Object.entries(contract.aliases)) {
  for (const alias of aliases) aliasToCanonical.set(alias, canonical);
}

const isKnown = (key) =>
  contractKeys.has(key)
  || aliasToCanonical.has(key)
  || contract.platformProvided.has(key)
  || contract.bindings.has(key);

if (reportOnly) {
  const unknown = [...direct.keys()].filter((key) => !isKnown(key)).sort();
  console.log(`[env-parity] --report (검사 아님)`);
  console.log(`- 직접 접근 키: ${direct.size} / 계약 등재: ${contractKeys.size} / alias: ${aliasToCanonical.size}`);
  console.log(`- 계약에 없는 직접 접근 키 ${unknown.length}개:`);
  for (const key of unknown) {
    console.log(`    ${key}  ←  ${[...direct.get(key)].slice(0, 3).join(", ")}`);
  }
  process.exit(0);
}

// [1] 코드가 읽는데 계약에 없음
for (const [key, consumers] of direct) {
  if (isKnown(key)) continue;
  fail("undeclared-usage", `${key} is read by ${[...consumers].slice(0, 3).join(", ")} but is absent from the contract.`);
}

// [2] 계약에 있으나 소비처 없음.
// 자동 스캔이 놓치는 읽기 방식이 있다(worker/lib/portone.js 의 getExactEnvWithAlias 처럼
// 키 이름을 헬퍼에 넘기는 경우, 특히 이름이 짧으면 리터럴 스캔에도 안 걸린다). 그래서
// consumers 를 직접 적어두는 것을 인정하되, 그 파일이 실재하고 그 안에 키 이름이 실제로
// 있는지까지 확인한다. 그래야 consumers 가 낡아도 조용히 통과하지 않는다.
const consumerTextCache = new Map();
function consumerMentionsKey(relPath, key) {
  if (!consumerTextCache.has(relPath)) {
    const full = resolve(repoRoot, relPath);
    consumerTextCache.set(relPath, existsSync(full) ? readFileSync(full, "utf8") : null);
  }
  const text = consumerTextCache.get(relPath);
  return text === null ? null : text.includes(key);
}

for (const entry of contract.keys) {
  const declared = entry.consumers || [];

  // consumers 는 이 계약을 읽는 사람이 "어디를 열어보면 되는지" 믿는 지도다. 스캐너가
  // 키를 따로 찾아냈든 아니든 항상 검증한다. 낡은 경로를 조용히 두면 지도가 거짓이 된다.
  for (const relPath of declared) {
    const mentions = consumerMentionsKey(relPath, entry.name);
    if (mentions === null) {
      fail("stale-consumer", `${entry.name} lists consumer ${relPath}, which does not exist.`);
    } else if (!mentions) {
      fail("stale-consumer", `${entry.name} lists consumer ${relPath}, which never mentions the key.`);
    }
  }

  if (entry.deprecated) continue;
  if (direct.has(entry.name) || literal.has(entry.name)) continue;
  if (declared.some((relPath) => consumerMentionsKey(relPath, entry.name))) continue;
  fail("unused-declaration", `${entry.name} is declared in the contract but no source file reads it. Remove it or mark "deprecated": true.`);
}

// [3] scope 와 NEXT_PUBLIC_ 접두사 일치
for (const entry of contract.keys) {
  const isPublicName = entry.name.startsWith("NEXT_PUBLIC_");
  if (entry.scope === "client" && !isPublicName) {
    fail("client-prefix", `${entry.name} has scope "client" but lacks the NEXT_PUBLIC_ prefix, so Next will not expose it to the browser.`);
  }
  if (entry.scope !== "client" && isPublicName) {
    fail("client-prefix", `${entry.name} carries the NEXT_PUBLIC_ prefix but is declared scope "${entry.scope}". Next inlines it into the client bundle regardless.`);
  }
}

// [4] 시크릿이 클라이언트로 새지 않는지
for (const entry of contract.keys) {
  if (entry.secret && entry.name.startsWith("NEXT_PUBLIC_")) {
    fail("secret-leak", `${entry.name} is marked secret but the NEXT_PUBLIC_ prefix inlines it into the client bundle.`);
  }
}
// alias 쪽 누출은 코드 수정이 필요해 경고로 남긴다(막으면 정리 전까지 배포가 멈춘다).
for (const [canonical, aliases] of Object.entries(contract.aliases)) {
  const entry = contractKeys.get(canonical);
  if (!entry?.secret) continue;
  for (const alias of aliases) {
    if (!alias.startsWith("NEXT_PUBLIC_")) continue;
    if (!direct.has(alias) && !literal.has(alias)) continue;
    warn("secret-leak", `${alias} is a NEXT_PUBLIC_ alias of the secret ${canonical}; setting it would publish the value in the client bundle.`);
  }
}

// [5] 시크릿이 wrangler [vars] 에 평문으로 있는지
const pagesVars = wranglerVars("wrangler.toml");
const workerVars = wranglerVars("worker/wrangler.toml");
for (const entry of contract.keys) {
  if (!entry.secret) continue;
  if (pagesVars.has(entry.name)) {
    fail("plaintext-var", `${entry.name} is secret but declared in wrangler.toml [vars], which ships as plaintext.`);
  }
  if (workerVars.has(entry.name)) {
    fail("plaintext-var", `${entry.name} is secret but declared in worker/wrangler.toml [vars], which ships as plaintext.`);
  }
}

// [6] 은 실제로 '설정된' 별칭만 잡는다. 아래 remote 수집이 끝난 뒤 실행한다.
// 코드가 폴백으로 별칭 이름을 나열하는 것(worker/lib/portone.js) 자체는 문제가 아니다.
// 문제는 한 값에 두 이름이 동시에 저장돼 있어 한쪽만 갱신되는 상황이다.
const configuredAliasLocations = new Map();
function noteConfigured(name, where) {
  const key = name.toUpperCase();
  if (!configuredAliasLocations.has(key)) configuredAliasLocations.set(key, new Set());
  configuredAliasLocations.get(key).add(where);
}

// [7] 로컬 필수 키가 .env.local 에 이름으로 존재하는지
const localKeys = envFileKeys(".env.local");
if (!localKeys) {
  skips.push("local — .env.local not present (expected in CI)");
} else {
  for (const key of localKeys) noteConfigured(key, ".env.local");
  for (const entry of contract.keys) {
    if (!entry.required_in?.includes("local")) continue;
    const aliases = contract.aliases[entry.name] || [];
    const satisfied = [entry.name, ...aliases].some((name) => localKeys.has(name.replace(/-/g, "_").toUpperCase()));
    if (!satisfied) {
      fail("local-missing", `${entry.name} is required in local but is not declared in .env.local.`);
    }
  }
  const contractNames = new Set([...contractKeys.keys(), ...aliasToCanonical.keys()].map((n) => n.toUpperCase()));
  const orphans = [...localKeys].filter(
    (key) => !contractNames.has(key) && !contract.platformProvided.has(key) && !direct.has(key) && !literal.has(key),
  ).sort();
  if (orphans.length) {
    infos.push(`.env.local holds ${orphans.length} key(s) that no source file reads and the contract does not track: ${orphans.join(", ")}`);
  }
}

// .env.example 드리프트는 보고만 한다 — CLAUDE.md Forbidden 이 .env* 수정을 금지한다.
const exampleKeys = envFileKeys(".env.example");
if (exampleKeys) {
  const stale = [...exampleKeys].filter((key) => !contractKeys.has(key) && !aliasToCanonical.has(key)).sort();
  if (stale.length) {
    infos.push(`.env.example lists ${stale.length} key(s) absent from the contract: ${stale.join(", ")}`);
  }
}

// [8] 원격 시크릿 목록 대조
if (remote) {
  const trackedUpper = new Set([...contractKeys.keys(), ...aliasToCanonical.keys()].map((name) => name.toUpperCase()));

  // 타깃별 워커 설정. 스테이징 잡이 프로덕션 워커의 시크릿을 검사하면, 정작 스테이징 워커는
  // 무검증으로 남아 "프로덕션에는 없는 런타임 실패"가 배포 뒤에야 드러난다.
  const workerConfigPath = process.argv.includes("--target=staging")
    ? "worker/wrangler.staging.toml"
    : "worker/wrangler.toml";
  const workerSecrets = remoteSecretNames("worker", ["secret", "list", "--config", workerConfigPath]);
  if (workerSecrets) {
    for (const entry of contract.keys) {
      if (!entry.secret || !entry.targets?.includes("worker")) continue;
      if (!entry.required_in?.includes("production")) continue;
      const aliases = contract.aliases[entry.name] || [];
      const satisfied = [entry.name, ...aliases].some((name) => workerSecrets.has(name.toUpperCase()));
      if (!satisfied) fail("remote-missing", `${entry.name} is required in production but is not set as a Worker secret.`);
    }
    for (const name of workerSecrets) noteConfigured(name, "Worker secrets");
    const untracked = [...workerSecrets].filter((name) => !trackedUpper.has(name)).sort();
    if (untracked.length) {
      infos.push(`Worker holds ${untracked.length} secret(s) the contract does not track: ${untracked.join(", ")}`);
    }
  }

  const project = String(process.env.CF_PAGES_PROJECT_NAME || "").trim();
  if (!project) {
    skips.push("remote:pages — CF_PAGES_PROJECT_NAME is not set");
  } else {
    const prod = remoteSecretNames("pages/production", ["pages", "secret", "list", "--project-name", project]);
    const preview = remoteSecretNames("pages/preview", ["pages", "secret", "list", "--project-name", project, "--env", "preview"]);
    // Pages secret presence is deliberately not enforced. This project's Pages build is a
    // static export (`output: "export"`, no Functions) produced by GitHub Actions, so a
    // Pages secret is never read at runtime or build time — requiring one would encode a
    // belief that is simply false. Only the Worker store above is load-bearing.
    if (prod) {
      for (const name of prod) noteConfigured(name, "Pages production");
      const untracked = [...prod].filter((name) => !trackedUpper.has(name)).sort();
      if (untracked.length) {
        infos.push(`Pages production holds ${untracked.length} secret(s) the contract does not track: ${untracked.join(", ")}`);
      }
    }
    // Pages here is a pure static export (wrangler.toml has no Functions), so preview
    // secrets are inert today and a drift failure would block releases for no runtime
    // gain. Promote these to fail() the moment Pages Functions are introduced.
    if (prod && preview) {
      const onlyProd = [...prod].filter((key) => !preview.has(key)).sort();
      const onlyPreview = [...preview].filter((key) => !prod.has(key)).sort();
      if (onlyProd.length) warn("env-drift", `Pages production has ${onlyProd.length} key(s) preview lacks: ${onlyProd.join(", ")}`);
      if (onlyPreview.length) warn("env-drift", `Pages preview has ${onlyPreview.length} key(s) production lacks: ${onlyPreview.join(", ")}`);
    }
  }
} else {
  skips.push("remote — not requested (pass --remote)");
}

// [6] 한 값에 두 이름이 동시에 저장돼 있는 경우.
for (const [canonical, aliases] of Object.entries(contract.aliases)) {
  const canonicalUpper = canonical.toUpperCase();
  const canonicalWhere = configuredAliasLocations.get(canonicalUpper);
  // 별칭 목록에는 PORTONE_webhook / PORTONE_WEBHOOK 처럼 대소문자만 다른 항목이 섞여 있다.
  // 저장소(.env.local, wrangler)는 키를 대문자로 정규화해 다루므로 같은 사실을 두 번
  // 보고하지 않도록 대문자 기준으로 묶는다.
  for (const aliasUpper of new Set(aliases.map((alias) => alias.toUpperCase()))) {
    if (aliasUpper === canonicalUpper) continue;
    const aliasWhere = configuredAliasLocations.get(aliasUpper);
    if (!aliasWhere) continue;
    const where = [...aliasWhere].join(", ");
    const message = canonicalWhere
      ? `${aliasUpper} and ${canonical} are both configured (${where}). One value under two names drifts the moment only one is rotated.`
      : `${aliasUpper} is configured (${where}) but the canonical ${canonical} is not. Rename it before the fallback is removed.`;
    if (strict) fail("alias-usage", message);
    else warn("alias-usage", message);
  }
}

// ─────────────────────────────────────────── 출력

console.log(`[env-parity] contract keys=${contractKeys.size} aliases=${aliasToCanonical.size} | source keys read=${direct.size}`);

for (const skip of skips) console.log(`  SKIPPED  ${skip}`);
for (const info of infos) console.log(`  INFO     ${info}`);
for (const item of warnings) console.log(`  WARN     [${item.check}] ${item.message}`);
for (const item of failures) console.error(`  FAIL     [${item.check}] ${item.message}`);

if (failures.length) {
  console.error(`[env-parity] FAIL: ${failures.length} mismatch(es).`);
  process.exit(1);
}
console.log(`[env-parity] PASS${warnings.length ? ` (${warnings.length} warning(s))` : ""}`);
