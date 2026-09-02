/**
 * /app 허브 마케팅 팝업(FeatureMarketingDetailModal)의 사전 키가 실제로 해석되는지 정적 검증.
 *
 * 이 모달은 정적 셸(index.html)이 이미 번역해 둔 `featureMarketing.*` 네임스페이스를 재사용한다.
 * "재사용"은 셸의 한국어 원문과 이 파일의 한국어 리터럴이 같다는 전제 위에 서 있으므로,
 * 그 전제가 깨지면(한쪽만 문구를 고치면) 화면에 한국어가 그대로 남는다 — 그걸 여기서 잡는다.
 *
 * ko.json 에는 `featureMarketing` 네임스페이스가 없다(한국어는 이 소스가 정본). 그래서
 * 컴포넌트는 `useT` 가 아니라 `useTPick`(값 없으면 원문 유지)을 쓴다. 팝업 섹션 제목 같은
 * `preview.*` 크롬 라벨만 ko.json 에도 있어야 하며, 그건 별도로 확인한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/components/FeatureMarketingDetailModal.tsx"), "utf8");

const HANGUL = /[가-힣]/;
const NON_KO_LOCALE_FILES = ["en", "ja", "zh-cn", "zh-tw", "vi", "hi", "es", "fr", "de", "nl", "ms"];

/** `const NAME ... = { … }` 의 중괄호 균형을 세어 잘라 낸다(이름 grep 이 아니라 본문). */
function objectLiteral(name) {
  const start = source.indexOf(`const ${name}`);
  assert.notEqual(start, -1, `${name} 를 찾지 못했다`);
  const open = source.indexOf("{", source.indexOf("=", start));
  let depth = 0;
  let end = open;
  for (; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    else if (source[end] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return vm.runInNewContext(`(${source.slice(open, end + 1)})`, {
    SAFE_TRUST_NOTES: SAFE_TRUST_NOTES_PLACEHOLDER,
  });
}

const SAFE_TRUST_NOTES_PLACEHOLDER = ["__trust0__", "__trust1__", "__trust2__"];
const CATEGORY_COPY = objectLiteral("CATEGORY_COPY");
const EXPLICIT_COPY = objectLiteral("EXPLICIT_COPY");
const EXPLICIT_DICT_NS = objectLiteral("EXPLICIT_DICT_NS");

/** 컴포넌트가 실제로 조회하는 필드 → [공용 키, hub 키]. 아래 test 가 소스와 대조해 고정한다. */
const SIMPLE_FIELDS = { badge: ["badge", null], headline: ["headline", null], ctaNote: ["ctaNote", null] };
const MAPPED_TEXT = {
  subheadline: ["tagline", "hubTagline"],
  previewText: ["premiumIntro", "hubPremiumIntro"],
  ctaLabel: ["fallbackCta", "hubFallbackCta"],
};
const MAPPED_LIST = {
  painPoints: ["feats", "hubFeats"],
  unlockBenefits: ["premiumChapters", "hubPremiumChapters"],
  recommendedFor: ["premiumAudience", "hubPremiumAudience"],
  answersQuestions: ["answersQuestions", "hubAnswersQuestions"],
};

function valueAtPath(dictionary, keyPath) {
  return keyPath.split(".").reduce((node, key) => {
    if (!node || typeof node !== "object") return undefined;
    return node[key];
  }, dictionary);
}

/** 컴포넌트의 `pickText`/`pickList` 와 같은 순서: hub 키가 있으면 이기고, 없으면 공용 키. */
function lookup(dictionary, ns, shared, hub) {
  const hubValue = hub ? valueAtPath(dictionary, `${ns}.${hub}`) : undefined;
  if (typeof hubValue === "string" && hubValue) return hubValue;
  const value = valueAtPath(dictionary, `${ns}.${shared}`);
  return typeof value === "string" && value ? value : undefined;
}

/** 한 카피 객체가 조회할 (라벨, 공용 키, hub 키) 전부. 값이 없는 필드는 조회 자체를 안 한다. */
function expectedLookups(copy) {
  const lookups = [];
  const push = (shared, hub) => lookups.push([shared, hub]);

  for (const [field, [shared, hub]] of Object.entries({ ...SIMPLE_FIELDS, ...MAPPED_TEXT })) {
    if (typeof copy[field] === "string" && copy[field]) push(shared, hub);
  }
  for (const [field, [shared, hub]] of Object.entries(MAPPED_LIST)) {
    (copy[field] || []).forEach((_item, i) => push(`${shared}.${i}`, hub ? `${hub}.${i}` : null));
  }
  (copy.analysisSteps || []).forEach((step, i) => {
    push(`analysisSteps.${i}.label`, null);
    if (step.detail) push(`analysisSteps.${i}.detail`, null);
  });
  ((copy.valueCompare && copy.valueCompare.rows) || []).forEach((row, i) => {
    push(`valueCompare.${i}.axis`, null);
    if (row.free) push(`valueCompare.${i}.free`, null);
    push(`valueCompare.${i}.premium`, null);
  });
  (copy.faq || []).forEach((_item, i) => {
    push(`faq.${i}.q`, null);
    push(`faq.${i}.a`, null);
  });
  return lookups;
}

function loadDictionary(file) {
  return JSON.parse(fs.readFileSync(path.join(root, "public/i18n", `${file}.json`), "utf8"));
}

test("모달이 조회하는 필드 목록이 소스와 어긋나지 않는다", () => {
  // 컴포넌트에 필드를 추가하고 이 테이블을 갱신하지 않으면, 새 필드가 번역 없이 지나간다.
  const declared = [...source.matchAll(/set\("([a-zA-Z]+)",/g)].map((match) => match[1]);
  const covered = new Set([
    ...Object.keys(SIMPLE_FIELDS),
    ...Object.keys(MAPPED_TEXT),
    ...Object.keys(MAPPED_LIST),
    // sampleReport·resultPreview 는 없다 — 지어낸 결과 예시라 걷어냈고,
    // verify:feature-marketing-schema 가 이 파일에 다시 들어오는 것을 막는다.
    "category", "trustNotes", "analysisSteps", "valueCompare", "faq",
  ]);
  const uncovered = declared.filter((field) => !covered.has(field));
  assert.deepEqual(uncovered, [], `이 테스트가 모르는 필드: ${uncovered.join(", ")}`);
});

test("카테고리·상품 카피가 11개 로케일에서 한국어를 남기지 않는다", () => {
  const targets = [
    ...Object.entries(CATEGORY_COPY).map(([key, copy]) => [`featureMarketing.template_${key}`, copy]),
    ...Object.entries(EXPLICIT_COPY).map(([key, copy]) => [`featureMarketing.${EXPLICIT_DICT_NS[key] || key}`, copy]),
  ];
  for (const file of NON_KO_LOCALE_FILES) {
    const dictionary = loadDictionary(file);
    for (const [ns, copy] of targets) {
      for (const [shared, hub] of expectedLookups(copy)) {
        const value = lookup(dictionary, ns, shared, hub);
        assert.ok(value, `${file}: ${ns}.${shared} 가 사전에 없다 (한국어가 그대로 노출된다)`);
        assert.doesNotMatch(value, HANGUL, `${file}: ${ns}.${shared} 에 한국어가 남아 있다`);
      }
    }
  }
});

test("카테고리 배지·공용 신뢰 문구가 11개 로케일에 있다", () => {
  const categoryKeys = Object.values(CATEGORY_COPY).map((copy) => copy.category);
  for (const file of NON_KO_LOCALE_FILES) {
    const dictionary = loadDictionary(file);
    Object.keys(CATEGORY_COPY).forEach((key, index) => {
      const value = valueAtPath(dictionary, `featureMarketingCategory.${key}`);
      assert.ok(typeof value === "string" && value, `${file}: featureMarketingCategory.${key} 없음`);
      assert.doesNotMatch(value, HANGUL, `${file}: featureMarketingCategory.${key} 에 한국어`);
      assert.ok(categoryKeys[index], "CATEGORY_COPY 의 category 표기가 비어 있다");
    });
    SAFE_TRUST_NOTES_PLACEHOLDER.forEach((_note, i) => {
      const value = valueAtPath(dictionary, `featureMarketingTrust.paid.${i}`);
      assert.ok(typeof value === "string" && value, `${file}: featureMarketingTrust.paid.${i} 없음`);
    });
  }
});

test("팝업 섹션 라벨은 ko 를 포함한 12개 로케일 전부에 있다", () => {
  // 🔴 이 키들만은 ko.json 에도 있어야 한다 — 컴포넌트가 `useT` 로 읽고,
  //    `useT` 는 키가 없으면 "번역을 준비 중입니다"를 돌려주기 때문이다.
  const chromeKeys = [...source.matchAll(/t\("((?:preview|common)\.[a-zA-Z]+)"/g)].map((match) => match[1]);
  assert.ok(chromeKeys.length >= 15, `팝업 라벨 키를 찾지 못했다 (${chromeKeys.length}개)`);
  for (const file of ["ko", ...NON_KO_LOCALE_FILES]) {
    const dictionary = loadDictionary(file);
    for (const key of new Set(chromeKeys)) {
      const value = valueAtPath(dictionary, key);
      assert.ok(typeof value === "string" && value, `${file}: ${key} 없음`);
      if (file !== "ko") assert.doesNotMatch(value, HANGUL, `${file}: ${key} 에 한국어가 남아 있다`);
    }
  }
});
