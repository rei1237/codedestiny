/**
 * 생성 카피 JSON 신선도 가드 (`sync:marketing-copy`)
 *
 * 왜 필요한가: `lib/marketing/feature-marketing-copy.generated.json` 은 정적 셸 index.html 의
 * `FEATURE_MARKETING_COPY` 를 기계로 옮긴 사본이다. 런타임(Workers/Pages)에는 셸을 파싱할
 * 자리가 없어 산출물을 커밋하는데, 그래서 **셸만 고치고 재생성을 잊으면 사본이 조용히 낡는다** —
 * 손으로 베낀 사본을 없애려고 만든 파이프라인이 다시 세 번째 갈래가 되는 셈이다.
 *
 * 🔴 이 가드가 여기(정적 테스트) 있는 이유: 계획서가 지목한 `verify:feature-marketing-schema` 는
 * `scripts/verify-guard-wiring.mjs` 에 "배선 후보(미승인)" 으로 선언돼 있어 CI 에서 돌지 않는다.
 * 거기 얹으면 단언이 영영 안 문다. `test:node` 는 pr-ci fast 잡에서 상시 돌고 index.html 을
 * 입력으로 선언하고 있으므로, 셸이 바뀌는 모든 PR 이 이 검사를 통과해야 한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const GENERATED_REL = "lib/marketing/feature-marketing-copy.generated.json";

/* 추출이 깨졌을 때 "0건 통과"가 되지 않도록 하는 바닥값. 2026-09-03 실측 141개/9종이고,
   줄이는 쪽으로 크게 움직이면 셸 구조가 바뀐 것이니 사람이 봐야 한다. */
const MIN_ITEMS = 120;
const MIN_TEMPLATES = 9;

let cached = null;
async function load() {
  if (cached) return cached;
  const lib = await import("../../scripts/lib/feature-marketing-extract.mjs");
  const expected = lib.serializeFeatureMarketingCopy(lib.buildFeatureMarketingCopy(lib.readShellHtml()));
  const actual = readFileSync(path.resolve(ROOT, GENERATED_REL), "utf8");
  cached = { lib, expected, actual, data: JSON.parse(actual) };
  return cached;
}

/** 첫 차이 지점만 짧게 보여준다 — 400KB 짜리 생성물이라 전문 비교 출력은 로그를 못 읽게 만든다. */
function firstDiff(actual, expected) {
  let i = 0;
  while (i < actual.length && i < expected.length && actual[i] === expected[i]) i++;
  const cut = (s) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 60));
  return `첫 차이 ${i}번째 문자 — 커밋본 ${cut(actual)} / 셸 기준 ${cut(expected)}`;
}

test("생성 JSON 이 index.html 과 같은 세대다", async () => {
  const { expected, actual } = await load();
  assert.ok(
    actual === expected,
    `${GENERATED_REL} 가 index.html 의 FEATURE_MARKETING_COPY 와 어긋납니다 — ` +
    "`npm run sync:marketing-copy` 를 돌리고 산출물을 같은 커밋에 담으세요.\n  " +
    firstDiff(actual, expected),
  );
});

test("추출 개수가 바닥값 아래로 떨어지지 않는다", async () => {
  const { data } = await load();
  const items = Object.keys(data.items || {}).length;
  const templates = Object.keys(data.templates || {}).length;
  assert.ok(items >= MIN_ITEMS, `카피 항목이 ${items}개입니다(하한 ${MIN_ITEMS}) — 추출이 깨졌는지 확인하세요.`);
  assert.ok(templates >= MIN_TEMPLATES, `카테고리 템플릿이 ${templates}종입니다(하한 ${MIN_TEMPLATES}).`);
});

test("별칭이 해소돼 inherit 이 남아 있지 않다", async () => {
  const { lib, data } = await load();
  const raw = lib.extractObjectLiteral(lib.readShellHtml(), "FEATURE_MARKETING_COPY");

  const aliases = Object.keys(raw).filter((key) => raw[key] && raw[key].inherit);
  assert.ok(aliases.length > 0, "셸에 inherit 별칭이 하나도 없습니다 — 해소 경로를 검사하지 못했습니다.");

  for (const [key, entry] of Object.entries(data.items)) {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(entry.copy, "inherit"),
      `${key}: 생성 JSON 에 inherit 이 남았습니다 — 소비자가 다시 해소해야 합니다.`,
    );
  }
  // 별칭이 원본 내용을 실제로 물려받았는지 — 껍데기만 남으면 소비자 화면이 빈다.
  for (const alias of aliases) {
    const entry = data.items[alias];
    assert.ok(entry, `${alias}: 별칭이 생성 JSON 에서 빠졌습니다.`);
    assert.ok(
      Object.keys(entry.copy).length > 1,
      `${alias}: 상속이 해소되지 않아 필드가 ${Object.keys(entry.copy).length}개뿐입니다.`,
    );
  }
});

test("dictNs 가 셸의 사전 조회 키와 같은 규칙을 따른다", async () => {
  const { lib, data } = await load();
  const raw = lib.extractObjectLiteral(lib.readShellHtml(), "FEATURE_MARKETING_COPY");
  for (const [key, entry] of Object.entries(data.items)) {
    assert.equal(
      entry.dictNs,
      lib.safeKey(lib.originMarketingKey(raw, key)),
      `${key}: dictNs 가 _pvwSafeKey(원본 키) 규칙과 다릅니다.`,
    );
    assert.match(entry.dictNs, /^[A-Za-z0-9_]+$/, `${key}: dictNs 에 사전 키로 못 쓰는 문자가 있습니다.`);
  }
  for (const [id, entry] of Object.entries(data.templates)) {
    assert.equal(entry.dictNs, `template_${id}`, `template ${id}: dictNs 가 셸 규칙(template_<카테고리>)과 다릅니다.`);
  }
});

/**
 * 🔴 `verify:feature-marketing-dictionary` 가 못 보는 축이다 — 그 가드는 별칭(`inherit`)을
 * 통째로 건너뛰므로, 별칭이 자기 이름으로 사전을 찾다가 못 찾는 상황을 잡지 못한다.
 * 여기서 "생성 JSON 의 모든 dictNs 가 en 사전에 실재한다"를 직접 문다.
 */
test("모든 dictNs 가 en 사전에 실재한다", async () => {
  const { data } = await load();
  const en = JSON.parse(readFileSync(path.resolve(ROOT, "public/i18n/en.json"), "utf8"));
  const dict = en.featureMarketing || {};
  assert.ok(Object.keys(dict).length > 0, "en.json 에 featureMarketing 네임스페이스가 없습니다.");

  const missing = [];
  for (const [key, entry] of Object.entries(data.items)) {
    if (!dict[entry.dictNs]) missing.push(`${key} → ${entry.dictNs}`);
  }
  assert.equal(
    missing.length,
    0,
    `사전에 없는 네임스페이스를 가리키는 카피 키가 있습니다(11개 로케일에 한국어가 그대로 나갑니다): ${missing.join(", ")}`,
  );
});

test("카테고리 표기표가 featureMarketingCategory 사전과 맞는다", async () => {
  const { data } = await load();
  const table = data.categoryKeyByKo || {};
  assert.ok(Object.keys(table).length >= 20, `카테고리 표기표가 ${Object.keys(table).length}건입니다 — 추출이 깨졌는지 확인하세요.`);

  const en = JSON.parse(readFileSync(path.resolve(ROOT, "public/i18n/en.json"), "utf8"));
  const dict = en.featureMarketingCategory || {};
  const missing = Object.entries(table).filter(([, key]) => typeof dict[key] !== "string" || !dict[key]);
  assert.equal(
    missing.length,
    0,
    `featureMarketingCategory 사전에 없는 키가 있습니다: ${missing.map(([ko, key]) => `${ko}→${key}`).join(", ")}`,
  );
});
