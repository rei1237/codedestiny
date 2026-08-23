#!/usr/bin/env node
/**
 * worker/wrangler.toml ↔ worker/wrangler.staging.toml 드리프트 차단.
 *
 * 왜 필요한가 — 스테이징은 프로덕션의 리허설이어야 의미가 있다. 두 설정이 조용히 갈라지면
 * "스테이징에서는 됐는데 프로덕션에서 안 되는" 변경이 통과하고, 그 순간 스테이징은 검증 도구가
 * 아니라 오해의 근원이 된다. wrangler 의 [env.*] 는 vars·r2_buckets·ai 를 상속하지 않아 어차피
 * 두 벌을 유지해야 하므로, 두 벌이 어긋나지 않게 만드는 것이 이 가드의 일이다.
 *
 * fail-closed 설계:
 *  - 검사 대상을 손으로 열거하지 않는다. 두 파일에서 키를 **전수 발견**하고, 아래 분류 중
 *    어디에도 속하지 않는 차이가 하나라도 있으면 실패한다(미분류 = 실패).
 *  - 파일이 없으면 skip 이 아니라 실패한다.
 *  - DIVERGENT 로 선언해 놓고 값이 같으면 실패한다. 낡은 허용목록은 허용목록이 아니다.
 *
 * 🔴 이 검사가 실패했을 때 worker/wrangler.toml 의 **구조**(라우트·크론·바인딩·compatibility_*)를
 *    고쳐서 맞추지 말 것 — CLAUDE.md 규칙 4 가 금지한다. 스테이징 파일을 고치거나, [vars] 라면
 *    양쪽에 같은 키를 넣어라.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[verify-worker-config-parity]";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PRODUCTION_CONFIG = "worker/wrangler.toml";
const STAGING_CONFIG = "worker/wrangler.staging.toml";

/**
 * 구조 키 — 반드시 동일해야 하고 허용목록으로 예외를 둘 수 없다.
 * 여기가 갈라지면 두 워커는 더 이상 같은 런타임이 아니다.
 */
const STRUCTURAL_KEYS = new Set([
  "main",
  "compatibility_date",
  "compatibility_flags",
  "minify",
  "workers_dev",
  "ai.binding",
]);

/**
 * 의도적으로 **달라야** 하는 키. 양쪽에 다 있어야 하고 값이 같으면 실패한다.
 * (같다 = 스테이징이 프로덕션 자원을 가리키고 있다는 뜻이다.)
 */
const MUST_DIFFER_KEYS = new Set([
  "name",
  "routes",
  "triggers.crons",
  "r2_buckets.FEEDBACK_IMAGES_BUCKET.bucket_name",
  "r2_buckets.INSIGHT_IMAGES_BUCKET.bucket_name",
  "vars.AUTH_FRONTEND_BASE_URL",
  "vars.SITE_BASE_URL",
  "vars.AUTH_API_BASE_URL",
  "vars.AUTH_URL",
  "vars.NEXTAUTH_URL",
  "vars.GOOGLE_OAUTH_CALLBACK",
  "vars.NAVER_OAUTH_CALLBACK",
  "vars.KAKAO_OAUTH_CALLBACK",
  "vars.MONGODB_DB_NAME",
  "vars.MONGO_APP_NAME",
  "vars.MONGO_PAYMENT_APP_NAME",
  // AI 실호출 차단 3종. 이 셋이 프로덕션과 같아지면 스테이징 테스트가 조용히 과금 경로를 탄다.
  // 🔴 "실제 잠금은 GEMINIF_API_KEY 미투입" 이라고 적혀 있었으나 사실이 아니었다 — Gemini 키를
  //    빼면 lib/llm-client.ts 의 폴백이 모든 요청을 env.AI.run 으로 내려보낸다. WORKERS_AI_ENABLED
  //    는 2026-08-23 까지 읽는 코드가 0건이라 그 폴백을 막지 못했고, isWorkersAiEnabled 로
  //    배선하면서 비로소 이 단언이 참이 됐다. 배선을 걷어내면 이 항목도 다시 거짓이 된다.
  "vars.WORKERS_AI_ENABLED",
  "vars.GUARDIAN_FORTUNE_LLM_PROVIDER",
  "vars.ENABLE_FUSION_FORTUNE_MOCK_FLOW",
]);

/** 스테이징에만 있어야 하는 키. 프로덕션에 나타나면 실패한다. */
const STAGING_ONLY_KEYS = new Set([
  "vars.APP_ENV",
  "vars.CORS_ORIGIN",
]);

const PRODUCTION_ORIGIN = "https://code-destiny.com";
const STAGING_ORIGIN = "https://staging.code-destiny.com";

// ── 최소 TOML 리더 ───────────────────────────────────────────────────────────
// 의존성을 늘리지 않기 위해 직접 읽는다(package-lock.json 은 수정 금지 대상이다).
// wrangler 설정이 쓰는 부분집합만 다룬다: 주석 · 문자열 · 불리언 · 정수 · 배열(다줄 포함) ·
// 인라인 테이블 · [table] · [[array of tables]].

function stripComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inString = !inString;
    if (ch === "#" && !inString) return line.slice(0, i);
  }
  return line;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' && text[i - 1] !== "\\") inString = !inString;
    if (!inString) {
      if (ch === "[" || ch === "{") depth += 1;
      if (ch === "]" || ch === "}") depth -= 1;
      if (ch === separator && depth === 0) {
        parts.push(current);
        current = "";
        continue;
      }
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function parseValue(raw) {
  const text = raw.trim();
  if (text.startsWith('"')) return JSON.parse(text);
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+$/.test(text)) return Number.parseInt(text, 10);
  if (text.startsWith("[")) {
    return splitTopLevel(text.slice(1, -1), ",").map(parseValue);
  }
  if (text.startsWith("{")) {
    const table = {};
    for (const pair of splitTopLevel(text.slice(1, -1), ",")) {
      const eq = pair.indexOf("=");
      table[pair.slice(0, eq).trim()] = parseValue(pair.slice(eq + 1));
    }
    return table;
  }
  throw new Error(`unsupported TOML value: ${text}`);
}

function parseToml(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  const arrays = {};
  let context = root;

  for (let i = 0; i < lines.length; i += 1) {
    const line = stripComment(lines[i]).trim();
    if (!line) continue;

    const arrayTable = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayTable) {
      const name = arrayTable[1].trim();
      if (!arrays[name]) arrays[name] = [];
      context = {};
      arrays[name].push(context);
      continue;
    }

    const table = line.match(/^\[([^\]]+)\]$/);
    if (table) {
      const name = table[1].trim();
      if (!root[name]) root[name] = {};
      context = root[name];
      continue;
    }

    const eq = line.indexOf("=");
    if (eq === -1) throw new Error(`unparsable TOML line ${i + 1}: ${line}`);
    const key = line.slice(0, eq).trim();
    let raw = line.slice(eq + 1).trim();

    // 다줄 배열: 대괄호 균형이 맞을 때까지 이어 붙인다.
    if (raw.startsWith("[")) {
      let depth = 0;
      const consume = (chunk) => {
        for (const ch of chunk) {
          if (ch === "[") depth += 1;
          if (ch === "]") depth -= 1;
        }
      };
      consume(raw);
      while (depth > 0 && i + 1 < lines.length) {
        i += 1;
        const next = stripComment(lines[i]).trim();
        raw += next;
        consume(next);
      }
    }

    context[key] = parseValue(raw);
  }

  return { root, arrays };
}

/** 설정을 `경로 → 값` 평면 맵으로 접는다. r2_buckets 는 순서가 아니라 binding 으로 키를 만든다. */
function flatten(text) {
  const { root, arrays } = parseToml(text);
  const flat = new Map();

  for (const [key, value] of Object.entries(root)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [child, childValue] of Object.entries(value)) {
        flat.set(`${key}.${child}`, childValue);
      }
      continue;
    }
    flat.set(key, value);
  }

  for (const [name, entries] of Object.entries(arrays)) {
    for (const entry of entries) {
      const binding = entry.binding;
      if (!binding) throw new Error(`[[${name}]] entry without a binding`);
      for (const [child, childValue] of Object.entries(entry)) {
        flat.set(`${name}.${binding}.${child}`, childValue);
      }
    }
  }

  return flat;
}

function render(value) {
  return JSON.stringify(value);
}

// ── 판정 ─────────────────────────────────────────────────────────────────────

/**
 * 파일 하나 안에서 지켜야 하는 불변식.
 *
 * 🔴 인증 쿠키는 Domain 속성 없이 SameSite=Lax 로 발급된다(worker/routes/auth.js appendAuthCookies).
 *    그래서 API 가 프론트와 다른 호스트에 있으면 교차 사이트가 되어 로그인 자체가 성립하지 않는다.
 *    "라우트가 프로덕션과 다르기만 하면 통과"로는 이걸 못 지킨다 — 스테이징 로그인이 조용히
 *    깨지는 가장 흔한 경로라 파일마다 따로 단언한다.
 */
function checkOriginInvariants(label, flat) {
  const failures = [];
  const apiBase = flat.get("vars.AUTH_API_BASE_URL");
  const frontendBase = flat.get("vars.AUTH_FRONTEND_BASE_URL");
  const routes = flat.get("routes");

  if (typeof apiBase !== "string" || typeof frontendBase !== "string") {
    failures.push(`${label}: AUTH_API_BASE_URL / AUTH_FRONTEND_BASE_URL 이 문자열이 아니다.`);
    return failures;
  }

  let apiHost = "";
  let frontendHost = "";
  try {
    apiHost = new URL(apiBase).host;
    frontendHost = new URL(frontendBase).host;
  } catch {
    failures.push(`${label}: base URL 을 파싱하지 못했다 (api=${apiBase}, frontend=${frontendBase}).`);
    return failures;
  }

  if (apiHost !== frontendHost) {
    failures.push(`${label}: AUTH_API_BASE_URL(${apiHost}) 과 AUTH_FRONTEND_BASE_URL(${frontendHost}) 의 호스트가 다르다. 쿠키가 교차 사이트가 되어 로그인이 성립하지 않는다.`);
  }

  const patterns = Array.isArray(routes) ? routes.map((route) => String(route?.pattern || "")) : [];
  if (!patterns.includes(`${apiHost}/api/*`)) {
    failures.push(`${label}: 라우트에 ${apiHost}/api/* 가 없다. 존 라우트가 없으면 /api 가 같은 오리진으로 오지 않아 인증 쿠키가 전달되지 않는다 (현재 라우트: ${patterns.join(", ") || "없음"}).`);
  }

  return failures;
}

export function compareConfigs(productionText, stagingText) {
  const failures = [];
  const production = flatten(productionText);
  const staging = flatten(stagingText);
  failures.push(...checkOriginInvariants("프로덕션", production));
  failures.push(...checkOriginInvariants("스테이징", staging));
  const allKeys = new Set([...production.keys(), ...staging.keys()]);

  for (const key of [...allKeys].sort()) {
    const inProduction = production.has(key);
    const inStaging = staging.has(key);
    const stagingOnly = STAGING_ONLY_KEYS.has(key);

    if (stagingOnly) {
      if (inProduction) {
        failures.push(`${key}: 스테이징 전용 키인데 프로덕션 설정에도 있다. 둘 중 하나가 잘못됐다.`);
      }
      if (!inStaging) {
        failures.push(`${key}: 스테이징 전용 키인데 스테이징 설정에 없다.`);
      }
      continue;
    }

    if (!inStaging) {
      failures.push(`${key}: 프로덕션에만 있고 스테이징에 없다. 스테이징 설정에 같은 키를 넣어라.`);
      continue;
    }
    if (!inProduction) {
      failures.push(`${key}: 스테이징에만 있다. 프로덕션에도 넣거나 STAGING_ONLY_KEYS 에 선언하라 — "스테이징에서만 켜진 플래그"는 허용하지 않는다.`);
      continue;
    }

    const same = render(production.get(key)) === render(staging.get(key));

    if (STRUCTURAL_KEYS.has(key)) {
      if (!same) {
        failures.push(`${key}: 구조 키는 반드시 동일해야 한다 (프로덕션 ${render(production.get(key))} / 스테이징 ${render(staging.get(key))}). 허용목록으로 예외를 둘 수 없다.`);
      }
      continue;
    }

    if (MUST_DIFFER_KEYS.has(key)) {
      if (same) {
        failures.push(`${key}: 달라야 하는 키인데 값이 같다 (${render(production.get(key))}). 스테이징이 프로덕션 자원을 가리키고 있거나, 허용목록이 낡았다.`);
      }
      continue;
    }

    if (!same) {
      failures.push(`${key}: 값이 다른데 허용목록에 없다 (프로덕션 ${render(production.get(key))} / 스테이징 ${render(staging.get(key))}). 같게 맞추거나 MUST_DIFFER_KEYS 에 사유와 함께 선언하라.`);
    }
  }

  // 개별 단언 — "다르기만 하면 통과"로는 지킬 수 없는 것들.
  const crons = staging.get("triggers.crons");
  if (Array.isArray(crons) && crons.length > 0) {
    failures.push(`triggers.crons: 스테이징 크론은 비어 있어야 한다 (현재 ${render(crons)}). 같은 스케줄이 양쪽에서 돌면 일일 태스크와 결제 재조정이 이중 실행된다.`);
  }

  for (const key of MUST_DIFFER_KEYS) {
    const value = staging.get(key);
    if (typeof value !== "string") continue;
    if (value.includes(PRODUCTION_ORIGIN) && !value.includes(STAGING_ORIGIN)) {
      failures.push(`${key}: 스테이징 값이 프로덕션 오리진(${PRODUCTION_ORIGIN})을 가리킨다.`);
    }
  }

  return failures;
}

// ── self-test ────────────────────────────────────────────────────────────────

const BASE_PRODUCTION = [
  'name = "code-destiny-web"',
  'main = "index.js"',
  'minify = true',
  'routes = [',
  '  { pattern = "api.code-destiny.com", custom_domain = true },',
  '  { pattern = "code-destiny.com/api/*", zone_name = "code-destiny.com" },',
  ']',
  '',
  '[ai]',
  'binding = "AI"',
  '',
  '[[r2_buckets]]',
  'binding = "FEEDBACK_IMAGES_BUCKET"',
  'bucket_name = "bugs"',
  '',
  '[vars]',
  'NODE_ENV = "production"',
  'SITE_BASE_URL = "https://code-destiny.com"',
  'AUTH_API_BASE_URL = "https://code-destiny.com"',
  'AUTH_FRONTEND_BASE_URL = "https://code-destiny.com"',
  'WORKERS_AI_ENABLED = "true"',
  '',
  '[triggers]',
  'crons = ["0 22 * * *"]',
].join("\n");

const BASE_STAGING = [
  'name = "code-destiny-web-staging"',
  'main = "index.js"',
  'minify = true',
  'routes = [',
  '  { pattern = "staging-api.code-destiny.com", custom_domain = true },',
  '  { pattern = "staging.code-destiny.com/api/*", zone_name = "code-destiny.com" },',
  ']',
  '',
  '[ai]',
  'binding = "AI"',
  '',
  '[[r2_buckets]]',
  'binding = "FEEDBACK_IMAGES_BUCKET"',
  'bucket_name = "bugs-staging"',
  '',
  '[vars]',
  'NODE_ENV = "production"',
  'APP_ENV = "staging"',
  'SITE_BASE_URL = "https://staging.code-destiny.com"',
  'AUTH_API_BASE_URL = "https://staging.code-destiny.com"',
  'AUTH_FRONTEND_BASE_URL = "https://staging.code-destiny.com"',
  'WORKERS_AI_ENABLED = "false"',
  '',
  '[triggers]',
  'crons = []',
].join("\n");

/** 픽스처 [vars] 섹션에 줄을 하나 끼워 넣는다. 파일 끝에 붙이면 [triggers] 아래로 들어간다. */
function withExtraVar(fixture, line) {
  const anchor = 'NODE_ENV = "production"';
  if (!fixture.includes(anchor)) throw new Error("fixture anchor missing");
  return fixture.replace(anchor, `${anchor}\n${line}`);
}

function runSelfTest() {
  const cases = [
    {
      name: "baseline passes",
      production: BASE_PRODUCTION,
      staging: BASE_STAGING,
      expectFailure: false,
    },
    {
      name: "프로덕션에만 있는 키를 잡는다",
      production: withExtraVar(BASE_PRODUCTION, 'EXTRA_KNOB = "1"'),
      staging: BASE_STAGING,
      expectFailure: /프로덕션에만 있고/,
    },
    {
      name: "스테이징에만 있는 키를 잡는다",
      production: BASE_PRODUCTION,
      staging: withExtraVar(BASE_STAGING, 'EXTRA_KNOB = "1"'),
      expectFailure: /스테이징에만 있다/,
    },
    {
      name: "허용목록 밖 값 차이를 잡는다",
      production: BASE_PRODUCTION.replace('NODE_ENV = "production"', 'NODE_ENV = "production"\nPDF_DEBUG_MODE = "true"'),
      staging: BASE_STAGING.replace('NODE_ENV = "production"', 'NODE_ENV = "production"\nPDF_DEBUG_MODE = "false"'),
      expectFailure: /허용목록에 없다/,
    },
    {
      name: "달라야 하는데 같으면 잡는다 (낡은 허용목록)",
      production: BASE_PRODUCTION,
      staging: BASE_STAGING.replace('SITE_BASE_URL = "https://staging.code-destiny.com"', 'SITE_BASE_URL = "https://code-destiny.com"'),
      expectFailure: /값이 같다|프로덕션 오리진/,
    },
    {
      name: "구조 키 차이는 허용목록 불가",
      production: BASE_PRODUCTION,
      staging: BASE_STAGING.replace("minify = true", "minify = false"),
      expectFailure: /구조 키는 반드시 동일/,
    },
    {
      name: "스테이징 크론이 비어 있지 않으면 잡는다",
      production: BASE_PRODUCTION,
      staging: BASE_STAGING.replace("crons = []", 'crons = ["*/10 * * * *"]'),
      expectFailure: /크론은 비어 있어야/,
    },
    {
      name: "존 라우트가 없으면 잡는다 (쿠키 교차 사이트)",
      production: BASE_PRODUCTION,
      staging: BASE_STAGING.replace('  { pattern = "staging.code-destiny.com/api/*", zone_name = "code-destiny.com" },\n', ""),
      expectFailure: /staging\.code-destiny\.com\/api\/\* 가 없다/,
    },
    {
      name: "프론트와 API 호스트가 갈리면 잡는다",
      production: BASE_PRODUCTION,
      staging: BASE_STAGING.replace('AUTH_FRONTEND_BASE_URL = "https://staging.code-destiny.com"', 'AUTH_FRONTEND_BASE_URL = "https://staging-front.code-destiny.com"'),
      expectFailure: /호스트가 다르다/,
    },
    {
      name: "스테이징 전용 키가 프로덕션에 새면 잡는다",
      production: withExtraVar(BASE_PRODUCTION, 'APP_ENV = "staging"'),
      staging: BASE_STAGING,
      expectFailure: /스테이징 전용 키인데 프로덕션 설정에도 있다/,
    },
  ];

  let failed = 0;
  for (const testCase of cases) {
    const failures = compareConfigs(testCase.production, testCase.staging);
    const joined = failures.join(" | ");
    if (!testCase.expectFailure) {
      if (failures.length > 0) {
        console.error(`${TAG} self-test FAIL (${testCase.name}): 통과해야 하는데 실패했다 — ${joined}`);
        failed += 1;
      }
      continue;
    }
    if (!testCase.expectFailure.test(joined)) {
      console.error(`${TAG} self-test FAIL (${testCase.name}): 기대한 실패가 안 나왔다 — ${joined || "(실패 없음)"}`);
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`${TAG} self-test 실패 ${failed}건.`);
    process.exit(1);
  }
  console.log(`${TAG} self-test passed (${cases.length} cases).`);
}

// ── 진입점 ───────────────────────────────────────────────────────────────────

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const productionPath = join(REPO_ROOT, PRODUCTION_CONFIG);
  const stagingPath = join(REPO_ROOT, STAGING_CONFIG);

  for (const [label, path] of [["프로덕션", productionPath], ["스테이징", stagingPath]]) {
    if (!existsSync(path)) {
      console.error(`${TAG} FAIL: ${label} 설정이 없다 — ${path}`);
      console.error(`${TAG} 검사 대상이 없을 때 통과하는 가드는 가드가 아니다.`);
      process.exit(1);
    }
  }

  let failures;
  try {
    failures = compareConfigs(readFileSync(productionPath, "utf8"), readFileSync(stagingPath, "utf8"));
  } catch (error) {
    console.error(`${TAG} FAIL: 설정을 읽지 못했다 — ${error.message}`);
    process.exit(1);
  }

  if (failures.length > 0) {
    console.error(`${TAG} FAIL: ${PRODUCTION_CONFIG} ↔ ${STAGING_CONFIG} 가 어긋났다 (${failures.length}건).`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error("");
    console.error(`${TAG} 🔴 ${PRODUCTION_CONFIG} 의 구조(라우트·크론·바인딩·compatibility_*)를 고쳐서 맞추지 말 것 — CLAUDE.md 규칙 4.`);
    process.exit(1);
  }

  console.log(`${TAG} OK — ${PRODUCTION_CONFIG} 와 ${STAGING_CONFIG} 의 차이가 전부 선언된 범위 안에 있다.`);
}

main();

export { STRUCTURAL_KEYS, MUST_DIFFER_KEYS, STAGING_ONLY_KEYS };
