/**
 * /app 허브 마케팅 팝업(FeatureMarketingDetailModal)의 카피 출처와 사전 키를 정적 검증한다.
 *
 * 이 모달은 예전에 셸 카피를 **손으로 베낀 사본**(CATEGORY_COPY 8종 + EXPLICIT_COPY 9종)을
 * 들고 있었다. 셸이 141키를 저작하는 동안 그 17종만 갱신돼 같은 상품의 홈 시트와 허브 모달이
 * 서로 다른 말을 했다. 이제 `lib/marketing/feature-marketing-copy.generated.json`(셸 정본의
 * 기계 사본) 하나만 본다. 여기서 무는 것은 셋이다 —
 *   ① 손 포크가 되살아나지 않는가            (되살아나면 갈래가 다시 셋이 된다)
 *   ② 커버리지가 조용히 무너지지 않는가       (추출이 깨져도 화면은 카테고리 문구로 채워져 안 보인다)
 *   ③ 모달이 조회할 사전 키가 11개 로케일에 실재하는가
 *
 * ko.json 에는 `featureMarketing` 네임스페이스가 없다(한국어는 셸 소스가 정본). 그래서 모달은
 * `useT` 가 아니라 `useTPick`(값 없으면 원문 유지)을 쓴다. 팝업 섹션 제목 같은 `preview.*`
 * 크롬 라벨만 ko.json 에도 있어야 하며, 그건 마지막 test 가 따로 확인한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/components/FeatureMarketingDetailModal.tsx"), "utf8");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const book = JSON.parse(fs.readFileSync(path.join(root, "lib/marketing/feature-marketing-copy.generated.json"), "utf8"));

const HANGUL = /[가-힣]/;
const NON_KO_LOCALE_FILES = ["en", "ja", "zh-cn", "zh-tw", "vi", "hi", "es", "fr", "de", "nl", "ms"];

/* 저작 카피 하한. 2026-09-03 실측 항목 141개 / 고유 네임스페이스 93개다. 추출이 깨지면 모달은
   빈 화면이 아니라 **카테고리 템플릿 문구로 그럴듯하게 채워진 화면**이 되므로 눈으로는 안 잡힌다. */
const MIN_ITEMS = 120;
const MIN_AUTHORED_NAMESPACES = 60;

const dictionaries = new Map();
function loadDictionary(file) {
  if (!dictionaries.has(file)) {
    dictionaries.set(file, JSON.parse(fs.readFileSync(path.join(root, "public/i18n", `${file}.json`), "utf8")));
  }
  return dictionaries.get(file);
}

function valueAtPath(dictionary, keyPath) {
  return keyPath.split(".").reduce((node, key) => {
    if (!node || typeof node !== "object") return undefined;
    return node[key];
  }, dictionary);
}

test("손으로 베낀 카피 포크가 되살아나지 않는다", () => {
  for (const forked of ["CATEGORY_COPY", "EXPLICIT_COPY", "EXPLICIT_ALIAS", "EXPLICIT_DICT_NS", "SAFE_TRUST_NOTES", "CATEGORY_KEY_BY_KO"]) {
    assert.doesNotMatch(
      source,
      new RegExp(`\\bconst ${forked}\\b`),
      `${forked} 가 다시 들어왔습니다 — 카피 정본은 셸(index.html)이고, 모달은 생성 JSON 만 읽습니다.`,
    );
  }
  // 🔴 정적 import 금지 — 400KB 짜리 JSON 이 통째로 클라이언트 번들에 실린다.
  assert.doesNotMatch(
    source,
    /^import[^\n]*feature-marketing-copy\.generated/m,
    "생성 JSON 을 정적 import 하면 클라이언트 번들이 400KB 커집니다 — 동적 import 를 유지하세요.",
  );
  assert.match(
    source,
    /\bimport\("@\/lib\/marketing\/feature-marketing-copy\.generated\.json"\)/,
    "모달이 생성 JSON 을 동적 import 하지 않습니다 — 카피 출처가 다시 갈렸는지 확인하세요.",
  );
});

test("카피 커버리지가 바닥값 아래로 떨어지지 않는다", () => {
  const items = Object.keys(book.items);
  const namespaces = new Set(Object.values(book.items).map((entry) => entry.dictNs));
  assert.ok(items.length >= MIN_ITEMS, `카피 항목이 ${items.length}개입니다(하한 ${MIN_ITEMS}).`);
  assert.ok(
    namespaces.size >= MIN_AUTHORED_NAMESPACES,
    `저작 네임스페이스가 ${namespaces.size}종입니다(하한 ${MIN_AUTHORED_NAMESPACES}) — 별칭 해소나 추출이 깨졌는지 확인하세요.`,
  );
  assert.ok(Object.keys(book.templates).length >= 9, "카테고리 템플릿이 9종보다 적습니다.");
});

/** `if(/…/.test(raw))return 'x';` 쌍을 순서대로 뽑는다. 셸(작은따옴표)과 모달(큰따옴표) 둘 다. */
function templateBranches(text, from, quote) {
  const start = text.indexOf(from);
  assert.notEqual(start, -1, `${from} 를 찾지 못했습니다.`);
  const body = text.slice(start, start + 1600);
  return [...body.matchAll(new RegExp(`if\\s*\\(\\/(.+?)\\/\\.test\\(raw\\)\\)\\s*return ${quote}([a-z]+)${quote}`, "g"))]
    .map((match) => `${match[2]}: ${match[1]}`);
}

/**
 * 🔴 카테고리 추론이 셸과 어긋나면 같은 기능이 홈에서는 오라클, 허브에서는 사주 템플릿으로 떨어져
 * **두 화면의 문구가 다시 갈린다** — 손 포크를 없앤 의미가 사라지는 유일한 남은 경로다.
 * 정규식 문자열과 **순서**까지 같아야 한다(먼저 걸리는 가지가 이긴다).
 */
test("카테고리 추론 규칙이 셸 _inferMarketingTemplate 과 같다", () => {
  const fromShell = templateBranches(shell, "function _inferMarketingTemplate", "'");
  const fromModal = templateBranches(source, "function inferTemplate", '"');
  assert.ok(fromShell.length >= 8, `셸에서 추론 가지를 ${fromShell.length}개만 찾았습니다 — 파서를 확인하세요.`);
  assert.deepEqual(fromModal, fromShell, "모달의 카테고리 추론이 셸과 어긋납니다.");
});

/* 모달이 쓰는 (카피 필드 → 사전 필드) 표. 아래 test 가 모달 소스에서 같은 표를 다시 뽑아 대조하므로,
   모달에 필드를 추가하고 여기를 갱신하지 않으면 실패한다. */
const TEXT_FIELDS = { subheadline: "tagline", previewText: "premiumIntro", ctaNote: "ctaNote", ctaLabel: "fallbackCta" };
const LIST_FIELDS = { unlockBenefits: "premiumChapters", recommendedFor: "premiumAudience", answersQuestions: "answersQuestions" };

test("사전 필드 표가 모달 소스와 어긋나지 않는다", () => {
  const declared = (kind) =>
    Object.fromEntries([...source.matchAll(new RegExp(`\\b${kind}\\("([a-zA-Z]+)", "([a-zA-Z]+)"\\)`, "g"))].map((m) => [m[1], m[2]]));
  // `text("headline", "tagline")` 은 subheadline 이 없을 때의 폴백이라 같은 사전 키를 공유한다.
  const { headline: _fallback, ...text } = declared("text");
  assert.deepEqual(text, TEXT_FIELDS, "모달의 text() 조회 표가 이 테스트와 다릅니다.");
  assert.deepEqual(declared("list"), LIST_FIELDS, "모달의 list() 조회 표가 이 테스트와 다릅니다.");
});

/**
 * 🔴 아래 `lookupPlan` 은 모달의 출처 선택을 **다시 구현한 것**이라, 모달이 병합본을 ns 하나로
 * 조회하는 옛 모양으로 되돌아가도 그 자체로는 눈치채지 못한다. 그래서 여기서 소스를 직접 본다 —
 * 모든 `featureMarketing.` 조회의 네임스페이스는 **값과 함께 따라온 것**(`…ns` / `…dictNs`)이어야
 * 하고, 미리 정해 둔 변수 하나(`ns`)를 전 필드에 돌려 쓰면 실패한다. 그게 옛 버그의 모양이다.
 */
test("사전 조회가 값과 함께 온 네임스페이스만 쓴다", () => {
  const namespaces = [...source.matchAll(/`featureMarketing\.\$\{([^}]+)\}/g)].map((match) => match[1]);
  assert.ok(namespaces.length >= 8, `featureMarketing 조회를 ${namespaces.length}건만 찾았습니다 — 파서를 확인하세요.`);
  const merged = namespaces.filter((expression) => !/\.(ns|dictNs)$/.test(expression.replace(/!/g, "")));
  assert.deepEqual(merged, [], "값의 출처와 무관한 네임스페이스로 사전을 조회합니다 — 남의 상품 번역이 붙거나 한국어가 남습니다.");
});

/**
 * 모달이 조회할 (네임스페이스, 사전 키) 전부. `buildMarketingCopy` 의 출처 선택과 같은 규칙이다 —
 * 값이 항목에 있으면 항목 ns, 없으면 카테고리 템플릿 ns.
 *
 * 🔴 이 "출처별 ns" 가 이 모달과 셸이 갈리는 유일한 지점이고, 의도된 것이다. 셸
 * `_localizeMarketingCopy` 는 병합된 객체 전체를 ns 하나로 조회해서, 카테고리에서 온 값을
 * 상품 사전에서 찾다가 못 찾고 한국어를 그대로 낸다(2026-09-03 en 기준 204건). 셸 수정은
 * 이 PR 범위(축2 — index.html 0-diff) 밖이라, 되풀이만 하지 않는다.
 */
function lookupPlan(item, template) {
  const plan = [];
  const from = (field) => {
    if (item && item.copy[field] !== undefined) return { ns: item.dictNs, value: item.copy[field] };
    if (template.copy[field] !== undefined) return { ns: template.dictNs, value: template.copy[field] };
    return null;
  };
  for (const [field, dictField] of Object.entries(TEXT_FIELDS)) {
    const source_ = from(field);
    if (source_) plan.push([source_.ns, dictField, source_.value]);
  }
  for (const [field, dictField] of Object.entries(LIST_FIELDS)) {
    const source_ = from(field);
    if (source_) source_.value.forEach((entry, i) => plan.push([source_.ns, `${dictField}.${i}`, entry]));
  }
  // feats 우선(#629) — 실제 기능 목록이 있으면 그것, 없을 때만 마케팅 문구(painPoints).
  const feats = item && item.copy.feats ? { ns: item.dictNs, value: item.copy.feats } : from("painPoints");
  if (feats) feats.value.forEach((entry, i) => plan.push([feats.ns, `feats.${i}`, entry]));

  const steps = from("analysisSteps");
  if (steps) {
    steps.value.forEach((step, i) => {
      plan.push([steps.ns, `analysisSteps.${i}.label`, step.label]);
      if (step.detail) plan.push([steps.ns, `analysisSteps.${i}.detail`, step.detail]);
    });
  }
  const compare = from("valueCompare");
  if (compare) {
    compare.value.rows.forEach((row, i) => {
      plan.push([compare.ns, `valueCompare.${i}.axis`, row.axis]);
      if (row.free) plan.push([compare.ns, `valueCompare.${i}.free`, row.free]);
      plan.push([compare.ns, `valueCompare.${i}.premium`, row.premium]);
    });
  }
  const faq = from("faq");
  if (faq) {
    faq.value.forEach((entry, i) => {
      plan.push([faq.ns, `faq.${i}.q`, entry.q]);
      plan.push([faq.ns, `faq.${i}.a`, entry.a]);
    });
  }
  // 신뢰 문구는 항목이 제 것을 가졌을 때만 상품 ns 를 탄다(기본값은 아래 공용 키 test 가 본다).
  if (item && item.copy.trustNotes) item.copy.trustNotes.forEach((entry, i) => plan.push([item.dictNs, `premiumOutcomes.${i}`, entry]));
  return plan;
}

test("모달이 조회할 사전 키가 11개 로케일에 전부 있다", () => {
  const templates = Object.values(book.templates);
  for (const file of NON_KO_LOCALE_FILES) {
    const dictionary = loadDictionary(file);
    const missing = [];
    const leaked = [];
    // 항목 × 카테고리 조합 전부를 본다 — 어떤 템플릿으로 떨어질지는 호출부 target 이 정하고,
    // 여기서는 그 조합 중 하나라도 한국어를 내지 않는다는 것을 단언한다.
    for (const item of [...Object.values(book.items), null]) {
      for (const template of templates) {
        for (const [ns, dictField] of lookupPlan(item, template)) {
          const value = valueAtPath(dictionary, `featureMarketing.${ns}.${dictField}`);
          if (typeof value !== "string" || !value) missing.push(`${ns}.${dictField}`);
          else if (HANGUL.test(value)) leaked.push(`${ns}.${dictField}`);
        }
      }
    }
    assert.deepEqual([...new Set(missing)].slice(0, 12), [], `${file}: 사전에 없는 키가 있습니다(한국어가 그대로 노출됩니다).`);
    assert.deepEqual([...new Set(leaked)].slice(0, 12), [], `${file}: 번역값에 한국어가 남아 있습니다.`);
  }
});

test("카테고리 칩·공용 신뢰 문구가 11개 로케일에 있다", () => {
  for (const file of NON_KO_LOCALE_FILES) {
    const dictionary = loadDictionary(file);
    for (const [ko, key] of Object.entries(book.categoryKeyByKo)) {
      const value = valueAtPath(dictionary, `featureMarketingCategory.${key}`);
      assert.ok(typeof value === "string" && value, `${file}: featureMarketingCategory.${key}(${ko}) 없음`);
      assert.doesNotMatch(value, HANGUL, `${file}: featureMarketingCategory.${key} 에 한국어`);
    }
    for (const tone of ["paid", "free"]) {
      book.trustNotes[tone].forEach((_note, i) => {
        const value = valueAtPath(dictionary, `featureMarketingTrust.${tone}.${i}`);
        assert.ok(typeof value === "string" && value, `${file}: featureMarketingTrust.${tone}.${i} 없음`);
      });
    }
  }
});

/**
 * badge·headline 은 셸이 렌더하지 않아 사전에 드문드문 있다(en 기준 항목 ns 282칸 중 242칸 없음).
 * 모달은 그때 카테고리 템플릿 ns 로 내려가므로, **템플릿 쪽에 구멍이 있는 만큼만** 한국어가 남는다.
 * 아래 목록은 그 구멍의 전량이고 축4 PR-6(문안 저작) 몫이다. 늘어나도, 채워져 목록이 낡아도 실패한다.
 */
const KNOWN_TONE_GAPS = ["template_music.badge", "template_music.headline"];

test("badge·headline 폴백 구멍이 알려진 목록 그대로다", () => {
  const dictionary = loadDictionary("en");
  const gaps = [];
  for (const [id, template] of Object.entries(book.templates)) {
    for (const field of ["badge", "headline"]) {
      if (template.copy[field] === undefined) continue;
      const value = valueAtPath(dictionary, `featureMarketing.template_${id}.${field}`);
      if (typeof value !== "string" || !value) gaps.push(`template_${id}.${field}`);
    }
  }
  assert.deepEqual(
    gaps.sort(),
    [...KNOWN_TONE_GAPS].sort(),
    "카테고리 템플릿의 badge·headline 번역 구멍이 바뀌었습니다 — 늘었으면 채우고, 채웠으면 이 목록에서 지우세요.",
  );
});

test("팝업 섹션 라벨은 ko 를 포함한 12개 로케일 전부에 있다", () => {
  // 🔴 이 키들만은 ko.json 에도 있어야 한다 — 모달이 `useT` 로 읽고,
  //    `useT` 는 키가 없으면 "번역을 준비 중입니다"를 돌려주기 때문이다.
  const chromeKeys = new Set([...source.matchAll(/"((?:preview|common)\.[a-zA-Z]+)"/g)].map((match) => match[1]));
  assert.ok(chromeKeys.size >= 20, `팝업 라벨 키를 찾지 못했다 (${chromeKeys.size}개)`);
  for (const file of ["ko", ...NON_KO_LOCALE_FILES]) {
    const dictionary = loadDictionary(file);
    for (const key of chromeKeys) {
      const value = valueAtPath(dictionary, key);
      assert.ok(typeof value === "string" && value, `${file}: ${key} 없음`);
      if (file !== "ko") assert.doesNotMatch(value, HANGUL, `${file}: ${key} 에 한국어가 남아 있다`);
    }
  }
});
