// `cd:*` 커스텀 이벤트의 배선 — **듣는 이름은 쏘는 곳이 있어야 한다.**
//
// 왜 이 축이 필요한가 (2026-09-03 실측):
//   로케일 갱신 이벤트가 세 이름으로 갈라져 있었다. 브리지는 `cd:locale-ready` 하나만
//   쏘는데, 48개 파일이 `document` 에 `cd:language-change` 를, 27개 파일이 `window` 에
//   `cd:locale-change` 를 걸고 있었다. 둘 다 dispatcher 0건이라 그 화면들은 로케일이
//   바뀌어도 영원히 다시 그려지지 않았고, 이름이 그럴듯해서 리뷰에서 세 번 살아남았다.
//   `cd:language-change` 는 `document` 에 걸려 있어 이름이 맞았더라도 못 받았을 것이다
//   (브리지는 `window.dispatchEvent` 를 쓴다 — window 이벤트는 document 로 안 내려간다).
//
// 🔴 대상은 손으로 적지 않는다 — 소스를 전수 훑어 발견하고, 못 찾으면 실패한다.
//    KNOWN_ORPHANS 는 면제 목록이 아니라 **줄어들어야 하는 미해결 원장**이다.
//    고친 뒤 목록에서 빼지 않으면 이 테스트가 그것도 실패시킨다.
//
// 🔴 jest 가 아니라 node:test 다 — `npm run test:node` 의 __tests__/ui/*.test.js 글롭이 집어 간다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

// public/** 은 sync:public 이 만드는 미러라 원본과 같은 이름을 두 번 센다.
// 🔴 scripts/ 는 빼지 않는다 — scripts/app-native-bridge.js 는 빌드 도구가 아니라
//    앱에 실려 나가는 런타임이고, cd:auth-cancelled 를 실제로 쏘는 유일한 곳이다.
// 🔴 __tests__/ 는 뺀다 — 테스트가 쏘는 것을 dispatcher 로 세면 프로덕션 고아가 가려진다
//    (실제로 cd:profile-changed 가 그 경우다).
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".wrangler", "dist", "out", "coverage",
  "public", "__tests__", "docs", "android", ".claude",
]);
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

// dispatcher 를 못 찾은 채 남아 있는 리스너. 로케일 축과 무관한 별건이라 이번에 손대지 않았다.
const KNOWN_ORPHANS = new Set([
  // AdvancedZiweiSectionV2.tsx 하나만 듣는다. 프로필 갱신 알림은 실제로는
  // 이름 없는 'destinyProfileChanged' 로 나가서 이 리스너에 도달하지 않는다.
  "cd:destiny-profile-updated",
  // js/core/access-store.js 가 듣지만 프로덕션에서 쏘는 곳이 없다.
  // 🔴 지우기 전에 __tests__/ui/access-store.static.test.js 를 먼저 재조준할 것 —
  //    그 스위트가 __testListeners 로 이 핸들러를 직접 구동한다.
  "cd:profile-changed",
]);

function collectSourceFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectSourceFiles(path.join(dir, entry.name), out);
    } else if (SOURCE_EXT.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function scanEventNames() {
  const listened = new Map();
  const dispatched = new Set();
  const listenRe = /addEventListener\(\s*["'](cd:[a-z0-9-]+)["']/g;
  const dispatchRe = /dispatchEvent\(\s*new\s+[\w.]*Event\(\s*["'](cd:[a-z0-9-]+)["']/g;
  const initRe = /initEvent\(\s*["'](cd:[a-z0-9-]+)["']/g;

  for (const file of collectSourceFiles(root, [])) {
    const source = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).replace(/\\/g, "/");
    for (const [, name] of source.matchAll(listenRe)) {
      if (!listened.has(name)) listened.set(name, new Set());
      listened.get(name).add(rel);
    }
    for (const [, name] of source.matchAll(dispatchRe)) dispatched.add(name);
    for (const [, name] of source.matchAll(initRe)) dispatched.add(name);
  }
  return { listened, dispatched };
}

const scan = scanEventNames();

test("이벤트 스캐너가 실제로 무언가를 찾는다 (정규식이 깨지면 여기서 멈춘다)", () => {
  assert.ok(
    scan.listened.size >= 10,
    `cd:* 리스너를 ${scan.listened.size}개만 찾았습니다 — 스캐너가 깨졌을 가능성이 큽니다(2026-09-03 실측 13개).`,
  );
  assert.ok(
    scan.dispatched.size >= 12,
    `cd:* dispatcher 를 ${scan.dispatched.size}개만 찾았습니다 — 스캐너가 깨졌을 가능성이 큽니다(2026-09-03 실측 16개).`,
  );
});

test("듣기만 하고 아무도 안 쏘는 cd:* 이벤트가 새로 생기지 않는다", () => {
  const orphans = [...scan.listened.keys()].filter((name) => !scan.dispatched.has(name)).sort();
  const unexpected = orphans.filter((name) => !KNOWN_ORPHANS.has(name));
  assert.deepEqual(
    unexpected,
    [],
    unexpected.map((name) => `${name} (리스너: ${[...scan.listened.get(name)].join(", ")}) — 쏘는 곳이 없습니다.`).join("\n"),
  );

  const stale = [...KNOWN_ORPHANS].filter((name) => !orphans.includes(name)).sort();
  assert.deepEqual(
    stale,
    [],
    `KNOWN_ORPHANS 가 낡았습니다 — 아래는 이미 배선됐거나 사라졌으니 목록에서 지우세요: ${stale.join(", ")}`,
  );
});

test("로케일 갱신은 cd:locale-ready 한 이름으로만 배선된다", () => {
  const localeNames = [...scan.listened.keys()].filter((name) => /locale|lang/.test(name)).sort();
  assert.deepEqual(
    localeNames,
    ["cd:locale-ready"],
    `로케일 이벤트 이름이 다시 갈라졌습니다: ${localeNames.join(", ")}. ` +
      "브리지가 쏘는 이름은 cd:locale-ready 하나뿐입니다(app/components/LocaleRuntimeBridge.tsx).",
  );
});

test("LocaleRuntimeBridge 가 cd:locale-ready 를 window 로 쏜다", () => {
  const bridge = fs.readFileSync(path.join(root, "app/components/LocaleRuntimeBridge.tsx"), "utf8");
  assert.match(
    bridge,
    /window\.dispatchEvent\(new CustomEvent\("cd:locale-ready"/,
    "LocaleRuntimeBridge 가 cd:locale-ready 를 window 로 쏘지 않습니다 — 리스너 전부가 죽습니다.",
  );
});

test("로케일 리스너는 window 에 건다 (document 로 걸면 브리지 이벤트를 못 받는다)", () => {
  const offenders = [];
  for (const file of collectSourceFiles(root, [])) {
    const source = fs.readFileSync(file, "utf8");
    if (!/document\.addEventListener\(\s*["']cd:locale-ready["']/.test(source)) continue;
    offenders.push(path.relative(root, file).replace(/\\/g, "/"));
  }
  assert.deepEqual(
    offenders,
    [],
    `cd:locale-ready 를 document 에 걸었습니다 — window.dispatchEvent 는 document 리스너에 도달하지 않습니다: ${offenders.join(", ")}`,
  );
});
