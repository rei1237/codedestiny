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
      export { PHASE3_BATCH2_SLUGS } from "./app/insights/phase3-editorial-batch2.js";
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});

const { INSIGHT_SEED_ARTICLES, PHASE3_BATCH2_SLUGS, getPhase3HubGuide, getTopicKey, inferInsightTopic } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const bySlug = (slug) => INSIGHT_SEED_ARTICLES.find((article) => article.slug === slug);
const stripHtml = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const internalLinks = (value) => Array.from(
  new Set(Array.from(String(value || "").matchAll(/href="(\/[^"#?]+)[^\"]*"/g), (match) => match[1])),
);

test("후속 정정 원고는 체계 혼동과 현실 결과 단정을 다시 넣지 않는다", () => {
  const dictionary = bySlug("sukuyo-beginner-terms-easy-dictionary");
  const questions = bySlug("sukuyo-qa-most-asked-questions");
  const useo = bySlug("sukuyo-useo");
  const retrograde = bySlug("vedic-retrograde-planets-practical-decoding");
  const career = bySlug("career-luck-interview-exam-prep-strategy");

  for (const article of [dictionary, questions, useo, retrograde, career]) {
    assert.ok(article);
    assert.equal(article.contentSource, "authored", article.slug);
    assert.match(article.updatedAt, /^2026-09-26(?:T00:00:00\.000Z)?$/, article.slug);
    assert.ok(internalLinks(article.contentHtml).length >= 3, article.slug);
  }
  assert.doesNotMatch(dictionary.contentHtml, /월명숙은 외부 표현|숙요점에는 별의 상태를 표현하는 개념/);
  assert.doesNotMatch(questions.contentHtml, /월명숙은 현실에서 표현되는 모습|모순이 아니라 표현 차이/);
  assert.doesNotMatch(useo.contentHtml, /우쇠관계는 말 그대로.*성\(成\)|시간이 관계를 증명하는 사랑/);
  assert.match(useo.contentHtml, /우쇠\(友衰\).*벗 우\(友\)/);
  assert.doesNotMatch(retrograde.contentHtml, /라후와 케투는 반대로 언제나 역행|역행이 끝난 뒤로 미루고/);
  assert.match(retrograde.contentHtml, /평균 교점과.*진 교점은 같은 값이 아닙니다/);
  assert.doesNotMatch(career.contentHtml, /20~30%|관성이 힘을 받는.*합격.*잘 따라/);
  assert.doesNotMatch(career.title, /합격률 높이는/);
});

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

test("남은 우선 16편은 검증 근거와 공개 품질 기준을 충족한다", () => {
  const expectedMarkers = {
    "sukuyo-27-mansions": /27숙과 28수를 섞지 않는 체크표/,
    "sukuyo-compatibility-guide": /방향을 바꾸면 역할 이름이 달라지는 예시/,
    "sukuyo-ankai": /관찰과 해석을 분리하는 연습/,
    "sukuyo-antai": /상담 사례를 쓰지 않은 이유/,
    "ziwei-what-is": /자미두수가 제공하지 않는 증거/,
    "ziwei-life-palaces": /같은 부부궁 문장을 다시 쓰는 예/,
    "ziwei-star-brightness": /등급을 숫자로 바꾸지 않는 이유/,
    "nakshatra-what-is": /Code Destiny의 나크샤트라 계산을 재현하는 순서/,
    "vedic-lagna-what-is": /경계 부근의 가상 예시/,
    "vedic-astrology-navamsa-basics": /Code Destiny가 D9를 만드는 실제 규칙/,
    "how-we-calculate-saju": /현재 구현에서 확인한 입력별 영향 범위/,
    "ten-gods-beginner-map": /<td>갑목<\/td>[\s\S]*?<td>식신<\/td>[\s\S]*?<td>경금<\/td>[\s\S]*?<td>편관<\/td>/,
    "five-elements-ohang-complete-guide": /많음과 부족을 한 문장으로 단정하지 않는 표/,
    "tarot-major-arcana-22-complete-meanings": /카드 뜻을 질문으로 바꾸는 세 칸/,
    "astrology-birth-chart-guide": /같은 태양궁의 다른 맥락/,
    "astrology-houses-what-is": /하우스 체계가 바뀌면 생기는 차이/,
  };

  assert.equal(PHASE3_BATCH2_SLUGS.length, 16);
  assert.deepEqual(new Set(PHASE3_BATCH2_SLUGS), new Set(Object.keys(expectedMarkers)));

  for (const slug of PHASE3_BATCH2_SLUGS) {
    const article = bySlug(slug);
    assert.ok(article, slug);
    assert.match(article.contentHtml, expectedMarkers[slug], slug);
    assert.match(article.updatedAt, /^2026-09-26(?:T00:00:00\.000Z)?$/, slug);
    const bodyChars = stripHtml(article.contentHtml).replace(/\s+/g, "").length;
    assert.ok(bodyChars >= 2500, `${slug}: ${bodyChars}`);
    assert.ok(internalLinks(article.contentHtml).length >= 3, slug);
  }

  assert.doesNotMatch(bySlug("sukuyo-ankai").contentHtml, /둘이 협력하면 매우 뛰어난 성과/);
  assert.doesNotMatch(bySlug("sukuyo-antai").contentHtml, /실제 사례로 보는 업태관계/);
  assert.doesNotMatch(bySlug("ziwei-life-palaces").contentHtml, /좋은 별이 있으면 평생 귀인/);
  assert.doesNotMatch(bySlug("ziwei-what-is").contentHtml, /송대의 도사 진단/);
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
