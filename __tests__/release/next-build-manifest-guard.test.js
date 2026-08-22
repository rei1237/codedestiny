/**
 * next build 를 감싸는 매니페스트 가드가 **Next 의 매니페스트를 덮어쓰지 않는지** 지킨다.
 *
 * 지키는 사고 (2026-08-22 run 32584030242): 스테이징 배포가
 * `out/404.html: framework default 404 was exported instead of the custom page` 로 죽었는데,
 * 같은 트리(76aef063d)의 PR CI 는 초록불이었다. 원인은 25ms 폴링 가드가 Next 가 쓰는 중인
 * `pages-manifest.json` 을 "비어 있다"로 읽고 `/404` 가 빠진 부분 매니페스트로 덮어쓴 것.
 * Next 는 그 파일을 빌드당 한 번만 읽으므로, 그 뒤로는 404 가 `_error` 로 렌더된다.
 *
 * 빌드가 5분 걸려 통합 테스트로는 못 잡는다. 그래서 ①순수 판정과 ②쓰기 지점의 배선을
 * 각각 본다. ②가 없으면 "판정 함수는 있는데 아무도 안 부르는" 상태가 조용히 만들어진다.
 *
 * 🔴 jest 가 아니라 node:test 다. jest 는 `npm test` = critical 티어에서만 도는데, 이 가드가
 * 지키는 파일(scripts/**)은 `tier=standard` 로 분류된다 — 그 자리에 두면 **정작 이 파일을
 * 고치는 PR 에서 이 테스트가 스킵된다**(실측: PR #988 의 Critical checks 가 3초 만에 스킵).
 * `test:node` 는 PR CI 의 fast 잡에 있어 티어와 무관하게 항상 돈다.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const GUARD_PATH = path.join(root, "scripts", "next-build-with-pages-manifest.mjs");
const MODULE_PATH = path.join(root, "scripts", "lib", "next-build-integrity.mjs");

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * 중괄호 균형으로 함수 본문을 잘라낸다 — 이름 grep 은 인접 함수를 섞어 읽는다.
 *
 * 🔴 인자 목록을 먼저 괄호 균형으로 건너뛴다. `function f({ a = 1 } = {}) {` 처럼 구조분해
 * 기본값이 있으면 "start 이후 첫 `{`" 가 **인자 패턴의 여는 중괄호**라, 거기서 균형을 세면
 * 본문 대신 인자 패턴만 잘라 온다. 그 상태에서는 검사가 조용히 아무 함수도 못 보게 된다
 * (실제로 이 파일의 가장 중요한 함수 ensurePagesManifest 가 그렇게 빠져 있었다).
 */
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return null;

  let index = source.indexOf("(", start);
  let parens = 0;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parens += 1;
    else if (char === ")") {
      parens -= 1;
      if (parens === 0) break;
    }
  }
  const open = source.indexOf("{", index);
  if (open < 0) return null;

  let depth = 0;
  for (let cursor = open; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
  }
  return null;
}

const guardSource = readSource(GUARD_PATH);

// 🔴 손으로 쓴 목록이 아니라 소스에서 전수 발견한다. 새 쓰기 지점을 추가하고 배선을
// 빠뜨리면 여기서 실패해야 한다(CLAUDE.md 코딩 원칙 10).
const writerNames = [...guardSource.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)]
  .map((match) => match[1])
  .filter((name) => {
    const body = functionBody(guardSource, name);
    return Boolean(body) && /writeJsonAtomic\(\s*(manifestPath|appManifestPath|buildManifestPath)\b/.test(body);
  });

test("매니페스트를 쓰는 함수를 소스에서 실제로 찾아낸다", () => {
  assert.ok(writerNames.length > 0, "쓰기 지점을 하나도 못 찾았다면 이 가드는 아무것도 지키지 않는다");
  // ensurePagesManifest 는 이 사고의 진원지다. 헬퍼가 그것을 놓치면 검사가 조용히 무력해진다.
  assert.ok(writerNames.includes("ensurePagesManifest"), "ensurePagesManifest 가 검사 대상에 있어야 한다");
});

// 안전한 형태는 둘 중 하나다.
//   ① 못 읽었으면(MANIFEST_UNREADABLE) 손을 뗀다 — 기존 내용을 병합해 다시 쓰는 함수들.
//   ② 파일이 이미 있으면 아예 쓰지 않는다 — 씨앗만 심는 함수들. 쓰는 중이라 잘려 있어도
//      existsSync 는 참이므로 덮어쓸 수가 없다.
// 🔴 새 쓰기 지점이 둘 중 어느 쪽도 아니면 여기서 실패한다. 그것이 이 테스트의 전부다.
for (const name of writerNames) {
  test(`${name} 는 Next 가 쓰는 중인 매니페스트를 덮어쓰지 않는다`, () => {
    const body = functionBody(guardSource, name);
    assert.ok(body, `${name} 본문을 잘라내지 못했다`);
    const bailsOnUnreadable = body.includes("MANIFEST_UNREADABLE");
    const skipsWhenPresent = /if\s*\(existsSync\([A-Za-z0-9_]+\)\)\s*return;/.test(body);
    assert.ok(bailsOnUnreadable || skipsWhenPresent, `${name} 가 못 읽은 매니페스트를 근거로 덮어쓸 수 있다`);
  });
}

test("export 된 404 가 프레임워크 기본이면 빌드를 실패로 만든다", () => {
  const body = functionBody(guardSource, "finishBuild");
  assert.ok(body);
  assert.match(body, /attempt\s*<\s*maxBuildAttempts/);
  assert.ok(body.includes("notFoundOk"), "재시도 판정에 404 무결성이 들어가 있어야 한다");
  assert.match(body, /if\s*\(!notFoundOk\)\s*\{\s*process\.exit\(1\);/);
});

test("스텁을 채울 때 로그를 남긴다 — 조용하면 다음 사고에서 또 원인을 못 찾는다", () => {
  const body = functionBody(guardSource, "ensurePageJsFallback");
  assert.ok(body);
  assert.match(body, /console\.(warn|error)\(/);
});

test("판정 문자열이 verify-adsense-readiness 와 같다", () => {
  // 🔴 두 파일이 다른 문자열을 쓰면 빌드는 통과시키고 배포 게이트만 막는, 가장 늦게 알게 되는
  // 조합이 된다.
  const gate = readSource(path.join(root, "scripts", "verify-adsense-readiness.mjs"));
  const integrity = readSource(MODULE_PATH);
  const marker = "404: This page could not be found";
  assert.ok(gate.includes(marker));
  assert.ok(integrity.includes(marker));
});

test("next-build-integrity 판정", async (t) => {
  const { readManifestObject, isFrameworkDefaultNotFound, MANIFEST_UNREADABLE } =
    await import(pathToFileURL(MODULE_PATH).href);

  const io = (files) => ({
    exists: (p) => Object.prototype.hasOwnProperty.call(files, p),
    read: (p) => {
      const value = files[p];
      if (value instanceof Error) throw value;
      return value;
    },
  });

  await t.test("파일이 없으면 빈 객체 — 씨앗을 심어도 되는 상태다", () => {
    assert.deepEqual(readManifestObject("/m.json", io({})), {});
  });

  await t.test("정상 매니페스트는 그대로 돌려준다", () => {
    assert.deepEqual(
      readManifestObject("/m.json", io({ "/m.json": '{"/404":"pages/404.js"}' })),
      { "/404": "pages/404.js" },
    );
  });

  // 🔴 아래 넷이 예전에는 전부 {} 로 접혔고, 그 {} 가 Next 의 매니페스트를 덮었다.
  const unreadable = [
    ['{"/404":"pages/4', "쓰는 중이라 잘린 JSON"],
    ["", "truncate 직후의 빈 파일"],
    ["[]", "배열은 매니페스트가 아니다"],
    ["null", "null 도 매니페스트가 아니다"],
  ];
  for (const [raw, label] of unreadable) {
    await t.test(`'비어 있다'가 아니라 '못 읽음'이다 — ${label}`, () => {
      assert.equal(readManifestObject("/m.json", io({ "/m.json": raw })), MANIFEST_UNREADABLE);
    });
  }

  await t.test("읽기 자체가 실패해도 '못 읽음'이다", () => {
    assert.equal(readManifestObject("/m.json", io({ "/m.json": new Error("EBUSY") })), MANIFEST_UNREADABLE);
  });

  await t.test("프레임워크 기본 404 를 판정한다", () => {
    assert.equal(isFrameworkDefaultNotFound("<title>404: This page could not be found</title>"), true);
    assert.equal(isFrameworkDefaultNotFound("<title>페이지를 찾을 수 없습니다 | Code Destiny</title>"), false);
    assert.equal(isFrameworkDefaultNotFound(null), false);
  });
});
