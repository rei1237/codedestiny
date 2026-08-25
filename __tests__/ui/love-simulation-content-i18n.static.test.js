const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertScopedCopyTranslated } = require("../fixtures/scoped-copy-i18n-guard");

/**
 * 러브 시뮬레이션 **콘텐츠 본문**(사주 해석 엔진이 조립하는 문장)이 12개 로케일 사전에
 * 전부 있는지 정적으로 확인한다. UI 크롬(`LoveSimulationEngine.tsx` 의
 * `LOVE_SIMULATION_COPY_TRANSLATIONS`)은 이 가드가 보지 않는다 — 그 축은
 * `docs/handoff/locale-service-optimization-2026-08-25.md` 소관이다.
 *
 * 발견·검사 규칙은 `__tests__/fixtures/scoped-copy-i18n-guard.js` 가 갖는다(운명의 찻집·마스터
 * 인연의 서와 공유). 컴포넌트를 새로 배선하면 자동으로 검사 대상이 되고, 번역을 빠뜨리면
 * 그 자리에서 실패한다.
 */

const root = path.resolve(__dirname, "../..");
const featureDir = path.join(root, "app/saju/love-simulation");
const componentsDir = path.join(featureDir, "_components");

test("러브 시뮬레이션 콘텐츠가 12개 로케일 사전에 전부 있다", () => {
  const wired = assertScopedCopyTranslated({
    root,
    hookName: "useLoveSimCopy",
    namespace: "loveSimulation",
    featureDir,
    componentsDir,
  });
  // 🔴 개수를 찍는다. 배선이 조용히 하나로 줄어도 위 fail-closed(>0)만으로는 안 잡힌다
  //    — 지금 배선은 매칭 문장 하나다(`matching`).
  const scopes = [...new Set(wired.map((entry) => entry.scope))].sort();
  assert.deepEqual(
    scopes,
    ["matching"],
    "콘텐츠 배선 scope 집합이 달라졌다 — 배선을 지웠거나 새로 늘렸다면 이 목록도 함께 갱신할 것",
  );
});

test("콘텐츠 정본은 _utils 에 남아 있고 ko 는 소스와 일치한다", () => {
  // 🔴 ko 를 사전으로 옮기고 소스를 비우면 한국어 정본이 사라진다. 사전의 ko 는 소스의
  //    사본이어야 하며, 어긋나면 한국어 화면만 바뀌고 나머지 11개 로케일이 옛 문장을 계속 서빙한다.
  const authored = JSON.parse(fs.readFileSync(path.join(root, "i18n/authored/loveSimulation-01.json"), "utf8"));
  const source = fs.readFileSync(path.join(featureDir, "_utils/loveCharacterMatching.ts"), "utf8");

  let checked = 0;
  for (const [key, entry] of Object.entries(authored)) {
    if (key.startsWith("_")) continue;
    checked += 1;
    assert.ok(
      source.includes(entry.ko),
      `${key}: 사전의 ko 가 _utils 소스에 없다 — 한쪽만 고친 것이다\n  ${entry.ko.slice(0, 40)}`,
    );
  }
  assert.ok(checked >= 80, `저작 항목을 ${checked}개밖에 못 읽었다 — 파일이 비었거나 형식이 바뀌었다`);
});

test("자리표시자는 12개 로케일에서 같은 집합이다", () => {
  // 🔴 `formatTemplate` 은 채우지 못한 `{name}` 을 빈 문자열로 지운다. 번역이 자리표시자를
  //    빠뜨리면 화면에 값이 통째로 사라지고, 그건 렌더링만 봐서는 안 잡힌다.
  const authored = JSON.parse(fs.readFileSync(path.join(root, "i18n/authored/loveSimulation-01.json"), "utf8"));
  const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");

  for (const [key, entry] of Object.entries(authored)) {
    if (key.startsWith("_")) continue;
    const expected = placeholders(entry.ko);
    for (const [locale, value] of Object.entries(entry)) {
      assert.equal(placeholders(value), expected, `${key}: ${locale} 의 자리표시자가 ko 와 다르다`);
    }
  }
});
