/**
 * `?action=` 딥링크 진입의 정합성 가드.
 *
 * 왜 필요한가 (2026-08-23 실사고):
 *   랜딩(app/components/FeatureLandingPage.tsx)과 홈 허브(HomeServiceSections.tsx)의 기능 링크는
 *   `/index.html?action=<name>` 형태다. 이 URL 을 해석하는 디스패처가 셸에 두 개 있다.
 *     ① js/core/index-inline-runtime.js 의 __cdRunRouteActionOnce  (DOMContentLoaded+0, 타일 경유)
 *     ② js/inline/legacy-action-launcher.js                        (load+0, 전역 함수 직접 호출)
 *   ②에 "action -> 라우트" 하드 이동 표(flowerRouteMap)가 있으면 랜딩이 내보낸 action 이 다시
 *   랜딩으로 되던져져 **무한 왕복**이 된다 — 운명의 꽃 4종이 그렇게 실행 불가였다. 그 표는
 *   76fcc0ca5 에서 한 번 지워졌다가 ee4cb8fd2 에서 되살아났다(같은 실수 2회).
 *   같은 커밋이 ②의 정규식에서 `^start...` 도 떨궈 startCrystalSoulTarot·startIjikTarot 은
 *   ①②  어느 쪽도 잡지 않는 **미디스패치** 상태가 됐다(눌러도 홈에 머문다).
 *
 * fail-closed: 검사 대상을 손으로 열거하지 않고 소스에서 전수 추출한다. 추출이 0건이면 실패한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const LAUNCHER_REL = "js/inline/legacy-action-launcher.js";
const RUNTIME_REL = "js/core/index-inline-runtime.js";
const HUB_REL = "app/components/HomeServiceSections.tsx";
const LANDING_REL = "app/components/FeatureLandingPage.tsx";

const launcher = read(LAUNCHER_REL);
const runtime = read(RUNTIME_REL);
const hub = read(HUB_REL);
const landing = read(LANDING_REL);

/** `const <name> ... {` 부터 첫 `\n};` 까지의 본문. 못 찾으면 던진다(가드가 조용히 통과하지 않게). */
function objectBody(source, declaration, label) {
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `${label}: "${declaration}" 를 찾지 못했다 — 선언이 바뀌었으면 이 가드도 고칠 것`);
  const end = source.indexOf("\n};", start);
  assert.ok(end > start, `${label}: "${declaration}" 의 끝(\\n};)을 찾지 못했다`);
  return source.slice(start, end);
}

function stringPairs(body) {
  return [...body.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]);
}

/** 홈 허브: 카드 href -> 이동 대상. 대상이 `?action=` 이면 그 카드가 액션을 내보낸다. */
const hubPairs = stringPairs(objectBody(hub, "const MAIN_ACTION_ROUTE_MAP", HUB_REL));
/** 랜딩: 라우트 -> 그 라우트의 실행 CTA 가 내보내는 액션. */
const landingPairs = stringPairs(objectBody(landing, "const ACTION_MAP", LANDING_REL));

/** 액션 -> 그 액션을 내보내는 라우트 집합. */
const emitters = new Map();
function addEmitter(action, route) {
  if (!emitters.has(action)) emitters.set(action, new Set());
  emitters.get(action).add(route);
}
for (const [route, target] of hubPairs) {
  const match = /[?&]action=([A-Za-z0-9_]+)/.exec(target);
  if (match) addEmitter(match[1], route);
}
for (const [route, action] of landingPairs) addEmitter(action, route);

/** 셸 런타임 허용목록(① 이 잡는 액션). */
const allowBody = objectBody(runtime, "var __cdRouteActionAllowList", RUNTIME_REL);
const allowList = new Set(
  [...allowBody.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*true/gm)].map((m) => m[1]),
);

/** 런처가 실제로 쓰는 정규식(② 가 잡는 액션). 하드코딩하지 않고 소스에서 읽는다. */
const launcherOpenRe = (() => {
  const m = /var isOpenAction = \/(.+?)\/\.test\(action\)/.exec(launcher);
  assert.ok(m, `${LAUNCHER_REL}: isOpenAction 정규식을 찾지 못했다`);
  return new RegExp(m[1]);
})();

test("진입 액션 표가 실제로 추출된다 (fail-closed)", () => {
  assert.ok(hubPairs.length > 30, `홈 허브 라우트 표 추출 ${hubPairs.length}건 — 파서가 빗나갔다`);
  assert.ok(landingPairs.length > 20, `랜딩 ACTION_MAP 추출 ${landingPairs.length}건 — 파서가 빗나갔다`);
  assert.ok(allowList.size > 20, `허용목록 추출 ${allowList.size}건 — 파서가 빗나갔다`);
  assert.ok(emitters.size > 20, `진입 액션 추출 ${emitters.size}건 — 파서가 빗나갔다`);
});

test("허브·랜딩이 내보내는 모든 action 은 디스패처가 잡는다", () => {
  const undispatched = [...emitters.keys()]
    .filter((action) => !allowList.has(action) && !launcherOpenRe.test(action))
    .sort();
  assert.deepEqual(
    undispatched,
    [],
    `어느 디스패처도 잡지 않는 진입 액션이 있다(홈 셸에 도착해도 아무 것도 열리지 않는다). ` +
      `${RUNTIME_REL} 의 __cdRouteActionAllowList 에 추가할 것 — ` +
      `런처 정규식을 넓히는 방식은 __cdRequireTileLockGate 를 건너뛰므로 유료 기능에 쓰지 말 것: ${undispatched.join(", ")}`,
  );
});

test("런처는 action 을 그 action 의 출처 라우트로 되돌리지 않는다 (왕복 금지)", () => {
  const offenders = [];
  for (const [action, routes] of emitters) {
    for (const route of routes) {
      const normalized = route.replace(/\/$/, "");
      const literals = [`"${route}"`, `'${route}'`, `"${normalized}"`, `'${normalized}'`];
      if (literals.some((literal) => launcher.includes(literal))) {
        offenders.push(`${action} -> ${route}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `${LAUNCHER_REL} 이 진입 액션의 출처 라우트를 문자열로 들고 있다. ` +
      `그 라우트로 되던지면 랜딩 <-> 셸 무한 왕복이 된다(과거 flowerRouteMap): ${offenders.join(", ")}`,
  );
});

test("런처는 셸 런타임이 이미 잡은 action 을 다시 실행하지 않는다 (단일비행)", () => {
  assert.match(
    launcher,
    /if \(window\.__cdRouteActionHandled\) return;/,
    `${LAUNCHER_REL}: 단일비행 가드가 없다 — 런타임과 런처가 같은 action 을 두 번 실행해 결제 게이트가 두 번 뜬다`,
  );
  assert.match(
    runtime,
    /window\.__cdRouteActionHandled = action;/,
    `${RUNTIME_REL}: __cdRouteActionHandled 를 세우지 않으면 런처의 단일비행 가드가 죽는다`,
  );
});
