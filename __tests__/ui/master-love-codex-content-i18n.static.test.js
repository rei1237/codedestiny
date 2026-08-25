const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertScopedCopyTranslated } = require("../fixtures/scoped-copy-i18n-guard");

/**
 * 마스터 인연의 서 **콘텐츠 본문**(프롤로그 대사·랜딩 마케팅 문구)이 12개 로케일 사전에
 * 전부 있는지 정적으로 확인한다. UI 크롬(`_lib/copy.ts` 의 로케일 표)은
 * `__tests__/ui/paid-result-locale-copy.test.js` 가 따로 본다 — 이 가드는 `data/` 콘텐츠 축이다.
 *
 * 발견·검사 규칙은 `__tests__/fixtures/scoped-copy-i18n-guard.js` 가 갖는다(운명의 찻집과 공유).
 * 컴포넌트를 새로 배선하면 자동으로 검사 대상이 되고, 번역을 빠뜨리면 그 자리에서 실패한다.
 */

const root = path.resolve(__dirname, "../..");
const featureDir = path.join(root, "src/features/master-love-codex");
const componentsDir = path.join(featureDir, "components");

test("마스터 인연의 서 콘텐츠가 12개 로케일 사전에 전부 있다", () => {
  const wired = assertScopedCopyTranslated({
    root,
    hookName: "useCodexContentCopy",
    namespace: "masterLoveCodex",
    featureDir,
    componentsDir,
  });
  // 🔴 개수를 찍는다. 배선이 조용히 하나로 줄어도 위 fail-closed(>0)만으로는 안 잡힌다
  //    — 지금 배선은 프롤로그 2(씬·선택지) + 랜딩 4(스펙·혜택·근거·신뢰) 다.
  const scopes = [...new Set(wired.map((entry) => entry.scope))].sort();
  assert.deepEqual(
    scopes,
    ["heroSpecs", "planBenefits", "prologueChoices", "prologueScenes", "trustPoints", "whyPremium"],
    "콘텐츠 배선 scope 집합이 달라졌다 — 배선을 지웠거나 새로 늘렸다면 이 목록도 함께 갱신할 것",
  );
});

test("콘텐츠 정본은 data/ 에 남아 있고 ko 는 소스와 일치한다", () => {
  // 🔴 ko 를 사전으로 옮기고 소스를 비우면 verify-master-love-codex-flow 가 읽는 한국어 마커가
  //    사라진다. 사전의 ko 는 소스의 사본이어야 하며, 어긋나면 한국어 화면만 바뀌고 나머지
  //    11개 로케일이 옛 문장을 계속 서빙한다.
  const authored = JSON.parse(
    fs.readFileSync(path.join(root, "i18n/authored/masterLoveCodex-01.json"), "utf8"),
  );
  const prologue = fs.readFileSync(path.join(featureDir, "data/prologue.ts"), "utf8");
  const premium = fs.readFileSync(path.join(featureDir, "data/premium.ts"), "utf8");
  const sources = `${prologue}\n${premium}`;

  let checked = 0;
  for (const [key, entry] of Object.entries(authored)) {
    if (key.startsWith("_")) continue;
    checked += 1;
    // 소스에는 개행이 \n 이스케이프로 들어 있다.
    const literal = entry.ko.replace(/\n/g, "\\n");
    assert.ok(
      sources.includes(literal),
      `${key}: 사전의 ko 가 data/ 소스에 없다 — 한쪽만 고친 것이다\n  ${entry.ko.slice(0, 40)}`,
    );
  }
  assert.ok(checked >= 80, `저작 항목을 ${checked}개밖에 못 읽었다 — 파일이 비었거나 형식이 바뀌었다`);
});
