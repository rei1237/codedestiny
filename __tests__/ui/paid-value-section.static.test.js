/**
 * 유료 랜딩 공용 가치 섹션(`app/components/PaidValueSection.tsx`)의 계약을 고정한다.
 *
 * 왜 필요한가: 이 섹션이 읽는 것은 **생성 JSON 의 키**와 **사전 키**이고 둘 다 타입 검사가
 * 안 닿는다(`tsconfig` strict:false + JSON 은 resolveJsonModule 로 통째 any). 셸 카피 키가
 * 바뀌거나 사전에 없는 `preview.*` 키를 쓰면 lint·typecheck 는 전부 초록인 채로 화면에서만
 * 섹션이 사라지거나 "번역을 준비 중입니다" 가 제목 자리에 박힌다.
 *
 * 🔴 가드 자리: `test:node` 의 `__tests__/ui/*.test.js` 글롭이 pr-ci fast 잡에서 상시 돈다
 * (선례: `fusion-value-preview.static.test.js`). 별도 verify 배선이 필요 없다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SECTION_REL = "app/components/PaidValueSection.tsx";
const HOST_REL = "app/nakshatra/ai/NakshatraAiClient.tsx";
const COPY_KEY = "nakshatra-ai-consultation";

const section = readFileSync(path.resolve(ROOT, SECTION_REL), "utf8");
const host = readFileSync(path.resolve(ROOT, HOST_REL), "utf8");
const book = JSON.parse(readFileSync(path.resolve(ROOT, "lib/marketing/feature-marketing-copy.generated.json"), "utf8"));
const entry = book.items[COPY_KEY];

/* 짧은 조각은 무관한 문장에도 흔히 들어간다. 사본 재발만 보려는 것이라 문장 길이 이상만 본다. */
const SENTENCE_MIN = 12;

test("셸 카피 항목이 섹션이 그리는 다섯 필드를 채우고 있다", () => {
  assert.ok(entry, `${COPY_KEY}: 생성 JSON 에 카피 항목이 없습니다 — 셸 키가 바뀌었는지 확인하세요.`);
  const copy = entry.copy || {};
  const fields = {
    feats: copy.feats || [],
    answersQuestions: copy.answersQuestions || [],
    trustNotes: copy.trustNotes || [],
    faq: copy.faq || [],
    "valueCompare.rows": (copy.valueCompare || {}).rows || [],
  };
  for (const [name, value] of Object.entries(fields)) {
    assert.ok(value.length > 0, `${COPY_KEY}.${name} 가 비었습니다 — 그 블록이 랜딩에서 통째로 사라집니다.`);
  }
});

test("섹션이 모달과 같은 공용 훅으로 카피를 읽는다", () => {
  assert.match(
    section,
    /import\s*\{[^}]*useFeatureMarketingCopy[^}]*\}\s*from\s*"\.\/FeatureMarketingDetailModal"/,
    `${SECTION_REL} 가 useFeatureMarketingCopy 를 쓰지 않습니다 — 문구·로케일 처리가 모달과 갈라집니다.`,
  );
  assert.ok(
    !/feature-marketing-copy\.generated\.json/.test(section),
    `${SECTION_REL} 가 생성 JSON 을 직접 import 합니다 — 클라이언트 컴포넌트라 400KB 가 그대로 번들에 실립니다.`,
  );
});

test("사전이 오기 전에는 제목을 그리지 않는다", () => {
  assert.match(
    section,
    /pick\(\s*"preview\.[A-Za-z]+"\s*,\s*DICTIONARY_PROBE\s*\)\s*!==\s*DICTIONARY_PROBE/,
    `${SECTION_REL} 의 사전 도착 게이트가 없어졌습니다 — useT 가 제목 자리에 "번역을 준비 중입니다" 를 그립니다.`,
  );
});

test("섹션이 쓰는 preview.* 키가 12개 로케일 사전에 모두 있다", () => {
  // 🔴 `t("...")` 만 보면 삼항(`t(a ? "preview.featuresLabel" : "preview.painPointsLabel")`)을
  //    놓친다. 문자열 리터럴을 전부 걷는다 — 사전 게이트가 쓰는 키도 같은 사전에 있어야 한다.
  const keys = [...new Set([...section.matchAll(/"(preview\.[A-Za-z]+)"/g)].map((m) => m[1]))];
  assert.ok(keys.length >= 8, `${SECTION_REL} 에서 preview.* 키를 ${keys.length}개밖에 못 찾았습니다 — 이 검사가 무의미해집니다.`);
  const dir = path.resolve(ROOT, "public/i18n");
  const locales = readdirSync(dir).filter((name) => name.endsWith(".json"));
  assert.ok(locales.length >= 12, `사전 파일이 ${locales.length}개뿐입니다 — 로케일 디렉터리가 바뀌었는지 확인하세요.`);
  const missing = [];
  for (const name of locales) {
    const dict = JSON.parse(readFileSync(path.resolve(dir, name), "utf8"));
    for (const key of keys) {
      const value = (dict[key.split(".")[0]] || {})[key.split(".")[1]];
      if (typeof value !== "string" || !value) missing.push(`${name}:${key}`);
    }
  }
  assert.deepEqual(missing, [], `사전에 없는 키를 그립니다(그 자리가 "번역을 준비 중입니다" 로 덮입니다): ${missing.join(" / ")}`);
});

test("섹션에 셸 카피 문장 사본이 박혀 있지 않다", () => {
  const copy = (entry || {}).copy || {};
  const rows = (copy.valueCompare || {}).rows || [];
  const sentences = [
    copy.previewText,
    ...(copy.feats || []),
    ...(copy.answersQuestions || []),
    ...(copy.trustNotes || []),
    ...(copy.faq || []).flatMap((item) => [item.q, item.a]),
    ...rows.flatMap((row) => [row.axis, row.free, row.premium]),
  ].filter((line) => typeof line === "string" && line.length >= SENTENCE_MIN);
  assert.ok(sentences.length > 0, "대조할 셸 문장을 하나도 못 모았습니다 — 이 검사가 무의미해집니다.");
  const inlined = sentences.filter((line) => section.includes(line));
  assert.deepEqual(inlined, [], `${SECTION_REL} 에 셸 카피가 축자로 박혔습니다(셸만 고치면 안 바뀝니다): ${inlined.join(" / ")}`);
});

test("나크샤트라 랜딩이 가치 섹션과 가격 배지를 배선한다", () => {
  assert.match(host, /<PaidValueSection\s+target=\{MARKETING_TARGET\}\s*\/>/, `${HOST_REL} 가 PaidValueSection 을 렌더하지 않습니다.`);
  assert.match(host, /<PriceBadge\s+featureKey=\{FEATURE_KEY\}\s*\/>/, `${HOST_REL} 가 PriceBadge 를 렌더하지 않습니다.`);
  assert.match(
    host,
    /const MARKETING_TARGET[\s\S]{0,300}?accessType:\s*"paid"/,
    `${HOST_REL} 의 MARKETING_TARGET 에 accessType:"paid" 가 없습니다 — 무료로 판정돼 무료/유료 비교표가 사라집니다.`,
  );
  assert.ok(
    host.includes(`featureKey: FEATURE_KEY`),
    `${HOST_REL} 의 MARKETING_TARGET 이 FEATURE_KEY 로 카피를 찾지 않습니다 — 키가 갈리면 조용히 빈 섹션이 됩니다.`,
  );
});

test("표시 가격은 레지스트리에서 오고 결제 호출부 금액은 그대로다", () => {
  assert.match(
    host,
    /\{copy\.aiSubmitButtonPrefix\}\{price\.label \|\| formatPaymentWon\(PRICE_KRW\)\}/,
    `${HOST_REL} 의 CTA 가 레지스트리 라벨을 안 씁니다 — formatPaymentWon 은 "원" 을 박아 비한국어 화면에도 원화 접미가 나갑니다.`,
  );
  for (const field of ["cost: COIN_PRICE", "coinPrice: COIN_PRICE", "amountKRW: PRICE_KRW", "paymentAmount: PRICE_KRW"]) {
    assert.ok(host.includes(field), `${HOST_REL} 의 결제 호출부에서 \`${field}\` 가 사라졌습니다 — 표시 변경이 결제 금액을 건드렸습니다.`);
  }
});
