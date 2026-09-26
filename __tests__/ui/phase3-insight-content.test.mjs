import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `
      export { INSIGHT_SEED_ARTICLES } from "./app/insights/seed-articles.js";
      export { getTopicKey } from "./app/insights/articles.js";
      export { inferInsightTopic } from "./app/insights/insight-topic.js";
      export { getPhase3HubGuide } from "./app/insights/phase3-editorial-content.js";
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});

const { INSIGHT_SEED_ARTICLES, getPhase3HubGuide, getTopicKey, inferInsightTopic } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const bySlug = (slug) => INSIGHT_SEED_ARTICLES.find((article) => article.slug === slug);
const stripHtml = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const internalLinks = (value) => Array.from(
  new Set(Array.from(String(value || "").matchAll(/href="(\/[^"#?]+)[^\"]*"/g), (match) => match[1])),
);

test("명시 카테고리가 비교 키워드보다 먼저 적용된다", () => {
  const astrology = bySlug("astrology-birth-chart-guide");
  const nakshatra = bySlug("nakshatra-what-is");

  assert.equal(astrology.category, "점성술");
  assert.equal(getTopicKey(astrology), "astrology");
  assert.equal(nakshatra.category, "베다점");
  assert.equal(getTopicKey(nakshatra), "vedic");

  assert.ok(!INSIGHT_SEED_ARTICLES.filter((article) => getTopicKey(article) === "vedic").includes(astrology));
  assert.ok(!INSIGHT_SEED_ARTICLES.filter((article) => getTopicKey(article) === "sukuyo").includes(nakshatra));
  assert.equal(inferInsightTopic({ categoryLabel: "기타", category: "점성술", keywords: ["베다 점성술 비교"] }), "astrology");
});

test("우선 네 편은 검수 초안 전문과 실제 수정일을 사용한다", () => {
  const expected = {
    "sukuyo-bonmyeongsuk-how-to-find": /전통 날짜표와 현재 서비스 계산/,
    "sukuyo-what-is": /숙요 궁합의 여섯 관계군/,
    "ziwei-14-main-stars-complete-guide": /같은 무곡성도 궁에 따라 질문이 달라집니다/,
    "tarot-practical-reading-casebook-by-question": /교육용 가상 예시/,
  };

  for (const [slug, marker] of Object.entries(expected)) {
    const article = bySlug(slug);
    assert.ok(article, slug);
    assert.match(article.contentHtml, marker, slug);
    assert.match(article.updatedAt, /^2026-09-26(?:T00:00:00\.000Z)?$/, slug);
    const bodyChars = stripHtml(article.contentHtml).replace(/\s+/g, "").length;
    assert.ok(bodyChars >= 2500, `${slug}: ${bodyChars}`);
    assert.ok(internalLinks(article.contentHtml).length >= 3, slug);
  }

  assert.doesNotMatch(bySlug("sukuyo-bonmyeongsuk-how-to-find").contentHtml, /대부분의 경우 생년월일만으로/);
  assert.doesNotMatch(bySlug("tarot-practical-reading-casebook-by-question").contentHtml, /어머니의 잔소리는.*미움이 아니라/);
});

test("우선 네 편의 긴 본문 문단은 서로 완전 중복되지 않는다", () => {
  const slugs = [
    "sukuyo-bonmyeongsuk-how-to-find",
    "sukuyo-what-is",
    "ziwei-14-main-stars-complete-guide",
    "tarot-practical-reading-casebook-by-question",
  ];
  const owners = new Map();

  for (const slug of slugs) {
    const paragraphs = Array.from(bySlug(slug).contentHtml.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g), (match) => stripHtml(match[1]))
      .filter((paragraph) => paragraph.length >= 50);
    for (const paragraph of new Set(paragraphs)) {
      const previous = owners.get(paragraph);
      assert.equal(previous, undefined, `${slug} duplicates ${previous}: ${paragraph.slice(0, 80)}`);
      owners.set(paragraph, slug);
    }
  }
});

test("공개 인사이트 전체의 긴 본문 문단은 서로 완전 중복되지 않는다", () => {
  const owners = new Map();
  for (const article of INSIGHT_SEED_ARTICLES) {
    const paragraphs = Array.from(String(article.contentHtml || "").matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g), (match) => stripHtml(match[1]))
      .filter((paragraph) => paragraph.length >= 50);
    for (const paragraph of new Set(paragraphs)) {
      const previous = owners.get(paragraph);
      assert.equal(previous, undefined, `${article.slug} duplicates ${previous}: ${paragraph.slice(0, 80)}`);
      owners.set(paragraph, article.slug);
    }
  }
});

test("여섯 허브가 계산·해석·한계를 분리한 안내를 제공한다", () => {
  const expected = {
    saju: /용신은 단순히 부족한 오행을 채우는 말이 아니며/,
    ziwei: /명궁 한 곳이나 주성 하나가 사람 전체를 결정한다고 보지 않고/,
    sukuyo: /명·업태·영친·우쇠·안괴·성위 여섯 관계군/,
    tarot: /타인의 속마음, 재회 여부, 질병, 법률 결론, 투자 수익/,
    astrology: /행성은 무엇이 작동하는지, 사인은 어떻게, 하우스는 어디에서/,
    vedic: /역사적 동일성의 증거가 아닙니다/,
  };

  for (const [topic, marker] of Object.entries(expected)) {
    const guide = getPhase3HubGuide(topic);
    assert.ok(guide?.heading, topic);
    assert.equal(guide.paragraphs.length, 3, topic);
    assert.match(guide.paragraphs.join(" "), marker, topic);
  }
});
