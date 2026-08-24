/**
 * 🔴 작명 무료 초안의 로케일 분기 가드.
 *
 * 지키는 것 셋:
 *  1) 비-ko 사용자가 결제 직전 화면에서 **한국 이름 후보**를 보지 않는다.
 *     (풀은 조합이 아니라 실재 이름 목록이어야 하고, 한글이 섞이면 안 된다)
 *  2) ko 는 기존 한글 조합 경로를 그대로 탄다 — resolveNamePoolBucket 이 ko/빈 값을 가로채면
 *     골든 동작이 조용히 바뀐다.
 *  3) 결과 화면의 장 제목 패턴이 로케일마다 자기 제목을 실제로 집어낸다.
 *
 * 🔴 검사 대상을 손으로 열거하지 않는다(CLAUDE.md 원칙 10). 버킷·로케일·카피 키는 전부
 *    모듈과 소스에서 전수 발견하고, 분류되지 않은 것이 나오면 실패시킨다. 목록을 박아 두면
 *    새 버킷이 추가됐을 때 가드가 통과한 채로 아무것도 지키지 않는다.
 *
 * 🔴 이 파일이 __tests__/lib/ 이 아니라 __tests__/ui/ 에 있는 이유: jest 는 이 레포에 TS 프리셋이
 *    없어 app/**\/*.ts 를 못 읽는다. node --test 는 런타임 타입 스트리핑으로 읽는다. 그리고
 *    test:node 는 PR CI 의 fast 잡이라 티어와 무관하게 항상 돈다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
const HANGUL = /[가-힣]/;

const poolsModule = import(
  require("node:url").pathToFileURL(path.join(root, "app/naming-ai/namingNamePools.ts")).href
);
const copyModule = import(
  require("node:url").pathToFileURL(path.join(root, "app/naming-ai/namingDraftCopy.ts")).href
);

// ── 1. 이름 풀 ────────────────────────────────────────────────────────────
test("모든 이름 풀 버킷이 5오행 × 남녀를 덮는다", async () => {
  const { NAME_POOLS } = await poolsModule;
  const buckets = Object.keys(NAME_POOLS);
  assert.ok(buckets.length >= 4, `버킷이 너무 적다: ${buckets.join(", ")}`);
  for (const bucket of buckets) {
    const { entries } = NAME_POOLS[bucket];
    for (const element of ELEMENTS) {
      for (const gender of ["M", "F"]) {
        // "N"(남녀 공용)은 그 자리를 대신 채울 수 있다 — 실제로 공용인 이름을 억지로 가르지 않는다.
        const hit = entries.filter(
          (entry) => entry.element === element && (entry.gender === gender || entry.gender === "N"),
        );
        assert.ok(hit.length > 0, `${bucket} 풀에 ${element}/${gender} 후보가 없다`);
      }
    }
  }
});

test("CJK 풀은 오행·성별마다 한 글자와 두 글자를 모두 갖는다", async () => {
  // 🔴 폼의 "이름 글자 수"가 먼저 걸러지므로, 어느 칸이 비면 그 길이에서는 요청한 오행·성별이
  //    통째로 사라지고 엉뚱한 것이 올라온다(실측: zh-CN 두 글자 후보가 木 뿐이라, 女·水 요청에
  //    男·木 이름이 상위에 올랐다).
  const { NAME_POOLS } = await poolsModule;
  for (const [bucket, pool] of Object.entries(NAME_POOLS)) {
    if (!pool.honorsNameLength) continue;
    for (const element of ELEMENTS) {
      for (const gender of ["M", "F"]) {
        for (const length of [1, 2]) {
          const hit = pool.entries.filter(
            (entry) =>
              entry.element === element &&
              (entry.gender === gender || entry.gender === "N") &&
              Array.from(entry.name).length === length,
          );
          assert.ok(hit.length > 0, `${bucket}: ${element}/${gender} 에 ${length}글자 후보가 없다`);
        }
      }
    }
  }
});

test("이름 풀 항목이 형식을 지킨다 — 중복 없음·뜻 있음·한글 없음", async () => {
  const { NAME_POOLS } = await poolsModule;
  for (const [bucket, pool] of Object.entries(NAME_POOLS)) {
    const seen = new Set();
    for (const entry of pool.entries) {
      assert.ok(entry.name, `${bucket}: 이름이 비어 있다`);
      assert.ok(!seen.has(entry.name), `${bucket}: 이름 중복 ${entry.name}`);
      seen.add(entry.name);
      assert.ok(ELEMENTS.includes(entry.element), `${bucket}/${entry.name}: 오행이 이상하다 ${entry.element}`);
      assert.ok(["M", "F", "N"].includes(entry.gender), `${bucket}/${entry.name}: 성별 태그가 이상하다 ${entry.gender}`);
      assert.ok(entry.meaning && entry.meaning.trim().length > 0, `${bucket}/${entry.name}: 뜻이 비어 있다`);
      // 🔴 비-ko 풀에 한글이 들어가면 그 순간 이 기능이 고치려던 문제가 그대로 돌아온다.
      assert.ok(!HANGUL.test(entry.name), `${bucket}/${entry.name}: 이름에 한글이 섞였다`);
      assert.ok(!HANGUL.test(entry.meaning), `${bucket}/${entry.name}: 뜻이 한국어로 적혔다`);
      if (pool.honorsNameLength) {
        assert.ok(entry.reading, `${bucket}/${entry.name}: CJK 이름에는 읽는 법이 있어야 한다`);
      } else {
        assert.equal(entry.reading, undefined, `${bucket}/${entry.name}: 라틴 이름에는 읽는 법을 따로 두지 않는다`);
      }
    }
  }
});

test("라틴권만 이름이 성 앞에 오고, 글자 수 조건을 적용하지 않는다", async () => {
  const { NAME_POOLS } = await poolsModule;
  for (const [bucket, pool] of Object.entries(NAME_POOLS)) {
    if (bucket === "latin") {
      assert.equal(pool.honorsNameLength, false, "라틴권 이름에는 글자 수 개념이 없다");
      assert.equal(pool.joinFullName("Kim", "Iris"), "Iris Kim");
      assert.equal(pool.joinFullName("", "Iris"), "Iris");
    } else {
      assert.equal(pool.honorsNameLength, true, `${bucket}: CJK 는 글자 수 조건을 적용한다`);
      assert.equal(pool.joinFullName("金", "樹"), "金樹");
    }
  }
});

test("ko 와 빈 로케일은 이름 풀을 타지 않는다(한글 조합 경로 보존)", async () => {
  const { NAME_POOLS, resolveNamePoolBucket } = await poolsModule;
  assert.equal(resolveNamePoolBucket("ko"), null);
  assert.equal(resolveNamePoolBucket(""), null);
  assert.equal(resolveNamePoolBucket(undefined), null);
  assert.equal(resolveNamePoolBucket("ja"), "ja");
  assert.equal(resolveNamePoolBucket("zh-CN"), "zh-CN");
  assert.equal(resolveNamePoolBucket("zh-TW"), "zh-TW");
  // 나머지는 전부 라틴 폴백이다 — 조용히 ko 로 새면 한국 이름이 다시 나간다.
  for (const locale of ["en", "vi", "hi", "es", "fr", "de", "nl", "ms"]) {
    assert.equal(resolveNamePoolBucket(locale), "latin", `${locale} 이 라틴 폴백이 아니다`);
  }
  // 버킷 이름이 늘어나면 위 대조가 낡는다 — 전수 발견으로 잡는다.
  assert.deepEqual(
    Object.keys(NAME_POOLS).sort(),
    ["ja", "latin", "zh-CN", "zh-TW"],
    "버킷이 바뀌었다. resolveNamePoolBucket 의 분기와 이 대조를 함께 갱신할 것",
  );
});

// ── 2. 초안 카피 ──────────────────────────────────────────────────────────
test("초안 카피가 en 을 기준으로 모든 로케일에서 채워져 있다", async () => {
  const { NAMING_DRAFT_COPY, NAMING_DRAFT_COPY_EN, getNamingDraftCopy } = await copyModule;
  const keys = Object.keys(NAMING_DRAFT_COPY_EN);
  assert.ok(keys.length > 10, "카피 키가 너무 적다 — 기준표를 잘못 잡았다");
  for (const [locale, copy] of Object.entries(NAMING_DRAFT_COPY)) {
    // 🔴 키를 손으로 열거하지 않고 en 에서 전수 발견한다. 새 키를 en 에만 넣고 나머지를
    //    잊으면 그 자리가 화면에서 undefined 로 새는데, 그것을 여기서 잡는다.
    assert.deepEqual(Object.keys(copy).sort(), keys.slice().sort(), `${locale}: 카피 키가 en 과 다르다`);
    for (const key of keys) {
      const value = copy[key];
      if (typeof value === "function") continue;
      if (typeof value === "string") {
        assert.ok(value.trim().length > 0, `${locale}.${key} 가 비어 있다`);
      } else if (Array.isArray(value)) {
        assert.ok(value.length > 0 && value.every((item) => item.trim()), `${locale}.${key} 가 비어 있다`);
      }
    }
    for (const element of ELEMENTS) {
      assert.ok(copy.elementLabels[element], `${locale}: ${element} 라벨이 없다`);
      assert.ok(copy.moodsByElement[element]?.length > 0, `${locale}: ${element} 분위기 문구가 없다`);
    }
    // 보간 함수가 인자를 실제로 끼워 넣는지 — 삼켜 버리면 "보완 오행"이 화면에서 사라진다.
    assert.ok(copy.supplements("SENTINEL").includes("SENTINEL"), `${locale}.supplements 가 인자를 버린다`);
    assert.ok(copy.statusWithElements("SENTINEL").includes("SENTINEL"), `${locale}.statusWithElements 가 인자를 버린다`);
    assert.ok(copy.statusAvoid("SENTINEL").includes("SENTINEL"), `${locale}.statusAvoid 가 인자를 버린다`);
    assert.ok(copy.statusLengthRelaxed(3).includes("3"), `${locale}.statusLengthRelaxed 가 인자를 버린다`);
    // reading 은 라틴권만 빈 문자열이 정본이다(표기가 곧 읽는 법).
    if (locale === "en") assert.equal(copy.reading("x"), "");
    else assert.ok(copy.reading("SENTINEL").includes("SENTINEL"), `${locale}.reading 이 인자를 버린다`);
  }
  // 저작 범위 밖의 로케일은 영어로 폴백한다 — ko 로 새면 한국어가 화면에 뜬다.
  for (const locale of ["vi", "hi", "es", "fr", "de", "nl", "ms", "ko"]) {
    assert.equal(getNamingDraftCopy(locale), NAMING_DRAFT_COPY_EN, `${locale} 폴백이 영어가 아니다`);
  }
});

// ── 3. 배선 ──────────────────────────────────────────────────────────────
test("추천 엔진과 입력 화면이 로케일을 실제로 넘긴다", () => {
  const recommendations = read("app/naming-ai/namingRecommendations.ts");
  for (const marker of ["resolveNamePoolBucket", "getNamePool", "getNamingDraftCopy", "buildLocaleBundle"]) {
    assert.ok(recommendations.includes(marker), `namingRecommendations.ts 에 ${marker} 가 없다`);
  }
  assert.ok(
    /buildRecommendationBundle\([\s\S]{0,400}?locale\?: string,/.test(recommendations),
    "buildRecommendationBundle 이 locale 인자를 받지 않는다",
  );

  const client = read("app/naming-ai/NamingAiClient.tsx");
  assert.ok(
    client.includes("buildRecommendationBundle(recInput, sajuHints, locale)"),
    "NamingAiClient 가 초안 생성에 로케일을 넘기지 않는다",
  );
  // 🔴 로케일이 결제 정체성에 새면 배포 전 결제자가 막히고 언어만 바꿔도 재청구된다.
  assert.ok(
    client.includes("locale: getCurrentLoadingLocale()"),
    "generate 요청의 locale 이 input 밖에 있어야 한다(inputHash 오염 방지)",
  );
});

// ── 4. 결과 화면 장 제목 패턴 ─────────────────────────────────────────────
/** resultCopy.ts 에서 로케일별 (제목 8개, 패턴) 짝을 소스 그대로 뽑는다. */
function readChapterPatterns() {
  const source = read("app/naming-ai/result/resultCopy.ts");
  const blockPattern = /chapterTitles:\s*\[([\s\S]*?)\],\s*chapterTitleKeywords:\s*\/((?:[^/\\\n]|\\.)+)\/([a-z]*),/g;
  const found = [];
  let match = blockPattern.exec(source);
  while (match) {
    const titles = (match[1].match(/"((?:[^"\\]|\\.)*)"/g) || []).map((raw) => JSON.parse(raw));
    found.push({ titles, pattern: new RegExp(match[2], match[3]) });
    match = blockPattern.exec(source);
  }
  // 🔴 전수 발견 — 제목 표를 가진 로케일 수와 짝의 수가 다르면 어느 로케일이 패턴 없이 남았다는 뜻이다.
  const tableCount = (source.match(/chapterTitles:\s*\[/g) || []).length;
  assert.equal(found.length, tableCount, `장 제목 표 ${tableCount}개 중 패턴이 붙은 것은 ${found.length}개뿐이다`);
  assert.ok(found.length >= 5, `로케일 수가 너무 적다: ${found.length}`);
  return found;
}

test("각 로케일의 제목 패턴이 그 로케일의 8장 제목을 전부 집어낸다", () => {
  for (const { titles, pattern } of readChapterPatterns()) {
    assert.equal(titles.length, 8, `장 제목이 8개가 아니다: ${titles.join(" / ")}`);
    for (const title of titles) {
      assert.ok(pattern.test(title), `패턴 ${pattern} 이 "${title}" 를 못 잡는다`);
    }
  }
});

test("제목 패턴이 다른 로케일의 제목까지 삼키지 않는다", () => {
  const locales = readChapterPatterns();
  for (let index = 0; index < locales.length; index += 1) {
    for (let other = 0; other < locales.length; other += 1) {
      if (index === other) continue;
      const matched = locales[other].titles.filter((title) => locales[index].pattern.test(title));
      // 번체·간체는 겹치는 제목이 실제로 있다(예: "取名原則"). 통째로 겹치는 것만 막는다.
      assert.ok(
        matched.length < 8,
        `패턴 ${locales[index].pattern} 이 다른 로케일의 8장을 통째로 잡는다`,
      );
    }
  }
});

test("결과 화면이 로케일 패턴을 쓰고 한국어 정규식을 남겨 두지 않는다", () => {
  const resultClient = read("app/naming-ai/result/NamingAiResultClient.tsx");
  assert.ok(
    resultClient.includes("const SECTION_TITLE_KEYWORDS = COPY.chapterTitleKeywords;"),
    "결과 화면이 로케일별 장 제목 패턴을 쓰지 않는다",
  );
  assert.ok(
    !/const SECTION_TITLE_KEYWORDS = \//.test(resultClient),
    "결과 화면에 하드코딩된 장 제목 정규식이 남아 있다",
  );
});
