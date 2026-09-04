#!/usr/bin/env node
/**
 * `cd:auth-changed` 리스너 **커버리지** 메타 가드.
 *
 * ## 왜 또 가드인가
 *
 * verify-auth-event-loop-guard 는 "이 파일들의 이 리스너에 필터가 있는가"를 본다. 대상이 **손으로 쓴
 * 목록**이라, 목록에 없는 파일에 리스너가 새로 생기면 가드는 그것을 보지 못한 채 초록불을 낸다.
 *
 * 그 사고가 이미 두 번 났다:
 *   · G-3 (2026-08-12) — 셸 미러 하나가 SHELLS 목록에서 빠져 있었다.
 *   · G-7 (2026-08-13) — js/destiny-profile.js 가 애초에 대상이 아니었다. 그 리스너만 source 필터가
 *     없어서, 이용권 갱신이 스스로 쏘는 되울림마다 프로필 카드가 로딩으로 되돌아갔다.
 *     카드 0장인 계정은 되돌아갈 캐시가 없어 사용자에게는 무한 로딩으로 보였다.
 *     실측: 되울림 2발 → 로딩 카드 재그림 3회 + /api/profile 3회.
 *
 * 두 번 다 원인은 같다 — **가드의 대상 목록이 현실과 어긋났고, 어긋난 것을 아무도 몰랐다.**
 * 목록을 한 번 더 손으로 늘리는 것은 세 번째 사고를 미루는 것일 뿐이다.
 *
 * ## 그래서 이 가드가 하는 일
 *
 * 목록을 신뢰하지 않는다. 소스에서 `cd:auth-changed` 리스너를 **전수 발견**한 뒤, 각각이 아래 둘 중
 * 하나임을 강제한다:
 *
 *   · filtered — 두 source(subscription-sync / membership-cache)를 거른다. 핸들러 본문을 실제로
 *     잘라내 확인한다(이름 grep 은 다른 곳의 우연한 일치에 속는다 — CLAUDE.md 원칙 6).
 *   · benign   — 필터가 필요 없는 이유를 **적어 두었다**. 네트워크도 렌더도 건드리지 않는 리스너다.
 *     가능하면 그 근거를 mustMatch 로 기계 검사한다.
 *
 * fail-closed 3방향(verify-guard-wiring 의 교훈을 그대로 따른다):
 *   ① 등록되지 않은 새 리스너      → 실패. **이것이 이 가드의 존재 이유다.**
 *   ② 등록됐는데 소스에 없는 항목  → 실패(낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다)
 *   ③ filtered 인데 필터가 없음    → 실패
 *
 * public/ 미러는 대상이 아니다 — 생성물이고 verify:public-parity 가 루트와의 동일성을 강제한다.
 *
 * 실행: npm run verify:auth-changed-coverage
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");

/** 루트 정본만 본다. 미러는 public-parity 담당. */
const SCAN_FILES = [
  "index.html",
  "js/destiny-profile.js",
  "js/core/access-store.js",
  "js/core/index-inline-runtime.js",
  "js/saju-engine.js",
  "js/share.js",
  // 🔴 빌드 도구가 아니라 앱에 실려 나가는 런타임이다(같은 이유로 custom-event-wiring 도 이 파일을
  //    스캔한다). 여기에 cd:auth-changed 리스너가 생긴 것은 Zero-Tap 해제(로그아웃 시 clear)부터다.
  "scripts/app-native-bridge.js",
];

/** verify-auth-event-loop-guard.mjs 의 SOURCE_FILTER 와 같은 뜻이어야 한다. */
const SOURCE_FILTER = /source\s*===\s*'subscription-sync'\s*\|\|\s*source\s*===\s*'membership-cache'/;

/**
 * 발견된 리스너의 판정표. 키는 `파일#파일내순번`.
 *
 * 🔴 여기에 항목을 추가하기 전에 먼저 물을 것: "이 리스너가 되울림에 반응하면 무엇이 일어나는가."
 * 네트워크가 나가거나 화면이 다시 그려지면 benign 이 아니다 — filtered 로 만들어야 한다.
 */
const REGISTRY = {
  "index.html#0": {
    expr: "function (event) {",
    verdict: "filtered",
    why: "세션 fetch 캐시 무효화. 되울림마다 4종 캐시를 통째로 버리면 진입 팬아웃이 배가된다.",
  },
  "index.html#1": {
    expr: "__cdHeaderAuthSync.onAuthChanged",
    verdict: "filtered",
    why: "헤더 사용자 카드. 되울림마다 __cdAuthState() 가 /api/subscription/status 를 다시 쏜다.",
  },
  "index.html#2": {
    expr: "window.__cdMembershipAuthEvents.onAuthChanged",
    verdict: "benign",
    why: "syncMembershipStatus() 는 getActiveSubscription() 로컬 값으로 DOM 문구만 바꾼다. fetch 없음.",
    mustMatch: /syncMembershipStatus\(\)/,
  },
  "index.html#3": {
    expr: "function(event) {",
    verdict: "benign",
    why: "event 화이트리스트(logout/login/auth/account)로 subscription 되울림을 이미 무시한다.",
    mustMatch: /'logout'|"logout"/,
  },
  "index.html#4": {
    expr: "window.__cdGoldenBalanceAuthEvents.onAuthChanged",
    verdict: "benign",
    why: "monthlystonebalance/monthlycredits 이벤트에만 반응해 배지 숫자를 쓴다. fetch 없음.",
    mustMatch: /monthlystonebalance/,
  },
  "index.html#5": {
    expr: "window.__cdUnlockAuthEvents.onAuthChanged",
    verdict: "benign",
    why: "event 화이트리스트(login/logout/auth/account)로 게이트. subscription 되울림에는 무반응.",
    mustMatch: /'logout'|"logout"/,
  },
  "js/destiny-profile.js#0": {
    expr: "function(event) {",
    verdict: "benign",
    why: "레벨 동기화. CD_LEVEL_IDENTITY_SOURCES 허용목록이 force 만 정하고, 그 외 source 는 60초 쿨다운을 지킨다.",
    mustMatch: /CD_LEVEL_IDENTITY_SOURCES/,
  },
  "js/destiny-profile.js#1": {
    expr: "function(event) {",
    verdict: "filtered",
    // 리스너는 detail 을 넘기기만 하고 판정은 위임한다. 위임 대상까지 따라가 확인한다 —
    // 안 그러면 "필터는 있는데 호출되지 않는" 상태를 통과시킨다.
    filterIn: "function _dpIsEntitlementEchoAuthEvent",
    mustMatch: /_dpScheduleAuthScopeRefresh\(\s*event\s*&&\s*event\.detail\s*\)/,
    why: "프로필 카드 갱신. 필터가 없어 되울림마다 스코프를 버리고 로딩 카드를 다시 그렸다(G-7).",
  },
  "js/core/access-store.js#0": {
    expr: "function (event) {",
    verdict: "filtered",
    /* 🔴 여기는 정본과 **철자가 다르다**: source 가 아니라 authEvent/authSource 로 쓰고,
       subscription 은 event 축으로 거른다. 의미는 같지만 정본 정규식으로는 잡히지 않는다.
       (이 사실은 이 가드를 처음 돌렸을 때 드러났다 — 기존 가드는 이 파일을 보지 않았다.)
       철자를 통일하는 것은 이 PR 범위 밖이라, 실제 조건을 그대로 고정한다. */
    filterPattern: /authEvent\s*===\s*'subscription'\s*\|\|\s*authSource\s*===\s*'membership-cache'/,
    why: "자격 스토어 무효화. 되울림에 반응하면 자기가 유발한 갱신에 다시 반응한다.",
  },
  "js/core/index-inline-runtime.js#0": {
    expr: "__cdInlineRuntimeEvents.authChangedForTileLocks",
    verdict: "filtered",
    why: "타일 잠금. 되울림마다 /api/billing/balance 가 따라 나간다.",
  },
  "js/saju-engine.js#0": {
    expr: "clear",
    verdict: "benign",
    why: "이전 사용자의 결제 증거를 메모리에서 지우는 것뿐. 되울림에 돌아도 부작용이 없고, 안 도는 것이 오히려 위험하다.",
  },
  "js/share.js#0": {
    expr: "function(){",
    verdict: "benign",
    why: "sessionStorage 추천 파라미터 정리 + 로컬 재프라임. fetch 없음.",
  },
  "scripts/app-native-bridge.js#0": {
    expr: "function (event) {",
    verdict: "benign",
    why: "Zero-Tap 자격증명 해제. event === 'logout' 게이트가 먼저라 두 되울림에는 아예 진입하지 않는다. fetch 없음(네이티브 clear 1회).",
    mustMatch: /"logout"/,
  },
};

const failures = [];
const fail = (message) => failures.push(message);

const LISTENER_RE = /addEventListener\(\s*(['"])cd:auth-changed\1\s*,\s*/g;

/** 등록 지점의 핸들러 표현식을 읽는다(인라인이면 `function ... {` 까지). */
function readHandlerExpr(source, afterIndex) {
  const rest = source.slice(afterIndex, afterIndex + 200);
  const inline = rest.match(/^function\s*\([^)]*\)\s*\{/);
  if (inline) return inline[0].replace(/\s+/g, " ").replace(/\(\s*/, "(").replace(/\s*\)/, ")");
  const ident = rest.match(/^([A-Za-z_$][\w$.]*)/);
  return ident ? ident[1] : "";
}

/** 핸들러 본문을 잘라낸다. 인라인이면 그 자리, 이름 참조면 정의부를 찾아간다(별칭 1단계까지). */
function resolveHandlerBody(source, file, afterIndex, expr) {
  if (expr.startsWith("function")) {
    try {
      return sliceFunction(source.slice(afterIndex), "function", `${file} inline`);
    } catch { return null; }
  }
  const bare = expr.replace(/^window\./, "");
  const candidates = [`${expr} = function`, `window.${bare} = function`, `${bare} = function`];
  for (const marker of candidates) {
    if (source.includes(marker)) {
      try { return sliceFunction(source, marker, `${file} ${expr}`); } catch { /* 다음 후보 */ }
    }
  }
  // 별칭: `X = someFunction;` → `function someFunction`
  for (const assign of [`${expr} = `, `window.${bare} = `, `${bare} = `]) {
    const at = source.indexOf(assign);
    if (at < 0) continue;
    const alias = source.slice(at + assign.length, at + assign.length + 120).match(/^([A-Za-z_$][\w$]*)\s*;/);
    if (alias && source.includes(`function ${alias[1]}`)) {
      try { return sliceFunction(source, `function ${alias[1]}`, `${file} ${alias[1]}`); } catch { /* 아래로 */ }
    }
  }
  const last = bare.split(".").pop();
  if (source.includes(`function ${last}`)) {
    try { return sliceFunction(source, `function ${last}`, `${file} ${last}`); } catch { /* 없음 */ }
  }
  return null;
}

const seen = new Set();

for (const file of SCAN_FILES) {
  if (!existsSync(resolve(repoRoot, file))) {
    fail(`${file}: 스캔 대상 파일이 없다`);
    continue;
  }
  const source = read(file);
  let match;
  let ordinal = 0;
  LISTENER_RE.lastIndex = 0;
  while ((match = LISTENER_RE.exec(source)) !== null) {
    const key = `${file}#${ordinal}`;
    ordinal += 1;
    const afterIndex = match.index + match[0].length;
    const expr = readHandlerExpr(source, afterIndex);
    const entry = REGISTRY[key];
    seen.add(key);

    if (!entry) {
      fail(
        `${key}: 새 cd:auth-changed 리스너가 판정표에 없다 (핸들러: ${expr || "?"})\n`
        + `      → 되울림(subscription-sync / membership-cache)에 반응하면 무엇이 일어나는지 먼저 답하고,\n`
        + `        네트워크·렌더가 걸리면 filtered 로 만들고, 아니면 benign 으로 사유와 함께 등록하세요.`,
      );
      continue;
    }
    if (entry.expr !== expr) {
      fail(
        `${key}: 등록된 핸들러와 실제가 다르다 (등록: ${entry.expr} / 실제: ${expr || "?"})\n`
        + `      → 같은 파일에 리스너가 추가·삭제되어 순번이 밀렸을 수 있습니다. 판정표를 다시 맞추세요.`,
      );
      continue;
    }

    const body = resolveHandlerBody(source, file, afterIndex, expr);

    // 리스너가 판정을 다른 함수에 위임하면 그 함수 본문에서 필터를 찾는다.
    let filterBody = body;
    if (entry.filterIn) {
      try {
        filterBody = sliceFunction(source, entry.filterIn, `${file} ${entry.filterIn}`);
      } catch {
        fail(`${key}: 위임 대상 ${entry.filterIn} 을 찾을 수 없다 — 필터가 사라졌다`);
        continue;
      }
    }

    if (entry.verdict === "filtered") {
      if (!filterBody) { fail(`${key}: 핸들러 본문을 찾지 못해 필터를 확인할 수 없다`); continue; }
      const pattern = entry.filterPattern || SOURCE_FILTER;
      if (!pattern.test(stripComments(filterBody))) {
        fail(`${key}: filtered 로 선언됐는데 두 source 를 거르지 않는다 — ${entry.why}`);
      }
    }

    // mustMatch 는 항상 **등록 지점의 본문**에 건다. 위임형은 이것으로 배선까지 확인한다
    // (필터가 있어도 호출되지 않으면 무효이므로).
    if (entry.mustMatch) {
      const haystack = body ? stripComments(body) : "";
      if (!entry.mustMatch.test(haystack)) {
        fail(`${key}: 등록 지점 근거가 더 이상 성립하지 않는다 (${entry.mustMatch}) — ${entry.why}`);
      }
    }
  }
}

for (const key of Object.keys(REGISTRY)) {
  if (!seen.has(key)) {
    fail(`${key}: 판정표에 있는데 소스에서 찾을 수 없다 — 리스너가 사라졌다면 항목도 지우세요`);
  }
}

/* 🔴 "가드는 검사하는데 CI 가 깨어나지 않는" 구조를 막는다.
   이 가드를 부르는 워크플로의 트리거 paths 에 스캔 대상이 없으면, 그 파일만 고친 PR 에서는
   가드가 아예 돌지 않는다 — 검사 대상 목록이 현실과 어긋나는 것과 정확히 같은 종류의 구멍이고,
   실제로 이 가드를 처음 붙였을 때 3개 파일이 그 상태였다(index-inline-runtime 은 형제 가드가
   이미 검사하고 있었는데도 트리거에 없었다). 둘 중 하나를 강제한다: paths 에 넣거나, 스캔에서 빼거나. */
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
if (existsSync(resolve(repoRoot, GATE_WORKFLOW))) {
  const workflow = read(GATE_WORKFLOW);
  const triggerBlock = workflow.slice(0, workflow.indexOf("\njobs:"));
  const declaredPaths = new Set(
    Array.from(triggerBlock.matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)).map((m) => m[1]),
  );
  /* 🔴 주석은 배선이 아니다. 2026-08-16 에 스위트가 러너(scripts/run-paid-gate-suite.mjs) 한 벌로
     모이면서 이 YAML 에서 스텝 이름이 사라졌는데, 정작 이 검사는 **설명 주석**에 적힌 가드 이름에
     걸려 초록불을 냈다 — 실행되는 것이 하나도 없어도 통과하는 상태였다. 주석을 걷어낸 본문과,
     그 본문이 실제로 실행하는 스크립트까지 함께 본다. */
  const gateSources = [workflow.replace(/^[ \t]*#.*$/gm, "")];
  for (const match of gateSources[0].matchAll(/scripts\/[A-Za-z0-9/._-]+\.mjs/g)) {
    const runnerPath = resolve(repoRoot, match[0]);
    if (!existsSync(runnerPath)) continue;
    gateSources.push(
      readFileSync(runnerPath, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1"),
    );
  }
  if (!gateSources.some((source) => source.includes("verify:auth-changed-coverage"))) {
    fail(`${GATE_WORKFLOW}: 이 가드를 부르는 스텝이 없다 — 배선되지 않은 가드는 가드가 아니다`);
  }
  for (const file of SCAN_FILES) {
    if (!declaredPaths.has(file)) {
      fail(
        `${GATE_WORKFLOW}: 트리거 paths 에 ${file} 이(가) 없다 — 그 파일만 고친 PR 에서는 이 가드가 돌지 않는다\n`
        + `      → paths 에 추가하거나, SCAN_FILES 에서 빼세요(빼면 그 파일의 리스너는 아무도 안 봅니다).`,
      );
    }
  }
}

if (failures.length) {
  console.error("[verify-auth-changed-listener-coverage] FAIL\n");
  for (const line of failures) console.error("  - " + line);
  console.error(
    "\n배경: 이 가드는 '필터가 있는가'가 아니라 '모든 리스너가 분류돼 있는가'를 본다.\n"
    + "손으로 쓴 대상 목록이 현실과 어긋나 사고가 두 번(G-3·G-7) 났기 때문이다.\n",
  );
  process.exit(1);
}

const filtered = Object.values(REGISTRY).filter((e) => e.verdict === "filtered").length;
console.log(
  `[verify-auth-changed-listener-coverage] PASS `
  + `(리스너 ${seen.size}개 전수 분류: filtered ${filtered} / benign ${seen.size - filtered})`,
);
