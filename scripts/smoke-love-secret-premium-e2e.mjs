import assert from "node:assert/strict";
import { buildLoveSecretReference } from "../worker/lib/love-secret-reference.js";
import { __loveSecretTestUtils as loveSecret } from "../worker/routes/saju-love-secret.js";

const TOPIC_KEYWORDS = Object.freeze({
  solo: {
    1: ["사랑", "기질", "일간", "일지", "월지", "관계"],
    2: ["끌림", "배우자성", "오행", "매력", "인연", "조건"],
    3: ["패턴", "거리", "상처", "습관", "반복", "조절"],
    4: ["소통", "말", "침묵", "오해", "대화", "표현"],
    5: ["불안", "안정감", "믿음", "애착", "회복", "루틴"],
    6: ["결혼", "배우자", "현실", "책임", "장기", "조건"],
    7: ["이별", "재회", "미련", "정리", "회복", "신호"],
    8: ["조후", "친밀감", "속궁합", "온도", "리듬", "거리"],
    9: ["연애운", "만남", "시기", "대운", "세운", "선택"],
    10: ["비책", "습관", "태도", "선택", "실천", "사랑"],
  },
  compatibility: {
    1: ["궁합", "일간", "일지", "관계", "끌림", "조율"],
    2: ["사랑", "방어", "서운함", "조건", "태도", "관계"],
    3: ["상대", "사랑", "방어", "이해", "안심", "실천"],
    4: ["일간", "기질", "호감", "매력", "상처", "태도"],
    5: ["일지", "배우자궁", "생활", "습관", "일상", "궁합"],
    6: ["배우자성", "기대", "역할", "설렘", "부담", "약속"],
    7: ["오행", "보완", "과잉", "감정", "균형", "안정감"],
    8: ["조후", "친밀감", "속궁합", "온도", "리듬", "거리"],
    9: ["소통", "말", "침묵", "감정", "대화", "회복"],
    10: ["갈등", "충돌", "상처", "화해", "회복력", "약속"],
    11: ["이별", "재회", "위험", "신호", "선택", "관계"],
    12: ["결혼", "장기", "가족", "일", "돈", "약속"],
    13: ["현실", "돈", "일", "가족", "생활", "조율"],
    14: ["연애운", "전환점", "대운", "세운", "성장", "행동"],
    15: ["궁합", "비책", "태도", "습관", "루틴", "관계"],
  },
});

const base = {
  user: { name: "테스트", birthDate: "1994-08-16", birthTime: "09:00", gender: "F" },
  pillars: {
    year: { gan: "甲", zhi: "戌", raw: "甲戌" },
    month: { gan: "壬", zhi: "申", raw: "壬申" },
    day: { gan: "甲", zhi: "子", raw: "甲子" },
    hour: { gan: "己", zhi: "巳", raw: "己巳" },
  },
  core: { dayMaster: "甲", dayBranch: "子", monthBranch: "申" },
  elementBalance: {
    dominant: "wood",
    deficient: "water",
    balanceScore: 78,
    counts: { wood: 3, fire: 1, earth: 2, metal: 1, water: 1 },
  },
  tenGods: { dominantTenGod: "식신", counts: { 식신: 3, 정관: 2, 정재: 1, 편인: 1 } },
  strength: { isStrong: true, label: "신강" },
  specialStars: { tao: 55, yeokma: 20, hwa: 15, gwimun: false },
  partner: {
    user: { name: "상대", birthDate: "1992-02-03", birthTime: "21:00", gender: "M" },
    birthDate: "1992-02-03",
    birthTime: "21:00",
    pillars: {
      year: { gan: "辛", zhi: "未", raw: "辛未" },
      month: { gan: "辛", zhi: "丑", raw: "辛丑" },
      day: { gan: "辛", zhi: "丑", raw: "辛丑" },
      hour: { gan: "己", zhi: "亥", raw: "己亥" },
    },
    core: { dayMaster: "辛", dayBranch: "丑", monthBranch: "丑" },
    elementBalance: {
      dominant: "metal",
      deficient: "wood",
      balanceScore: 74,
      counts: { wood: 1, fire: 1, earth: 2, metal: 3, water: 1 },
    },
    tenGods: { dominantTenGod: "정관", counts: { 정관: 3, 정재: 2, 식신: 1, 편인: 1 } },
  },
};
base.loveSecretReference = buildLoveSecretReference(base);

function repeated(seed, count) {
  return Array.from({ length: count }, (_, idx) => `${seed} ${idx + 1}`).join(" ");
}

function sectionBody({ mode, chapterNo, sectionNo, title, keywords }) {
  const lead = `${mode} ${chapterNo}장 ${sectionNo}절 ${title}에서는 ${keywords.join(" ")}의 흐름을 사주 근거로 차분히 읽습니다.`;
  const parts = [
    lead,
    `A 관점은 사랑받고 싶은 마음을 숨기지 않되 품격 있는 태도로 표현하는 데 있습니다. ${repeated(`감정선${chapterNo}${sectionNo}A`, 38)}`,
    `B 관점은 상대가 안심하는 속도와 말의 온도를 존중하는 데 있습니다. ${repeated(`관계결${chapterNo}${sectionNo}B`, 38)}`,
    `관계 역학은 설렘과 현실 조율이 함께 움직일 때 가장 부드럽게 살아납니다. ${repeated(`궁합빛${chapterNo}${sectionNo}C`, 38)}`,
    `궁합 전략은 짧은 확인 대화, 작은 약속, 반복되는 배려를 통해 사랑의 온도를 지키는 것입니다. ${repeated(`비책향${chapterNo}${sectionNo}D`, 38)}`,
  ];
  return parts.join("\n\n");
}

function buildChapters(mode, specs) {
  return specs.map((spec, index) => {
    const chapterNo = index + 1;
    const keywords = TOPIC_KEYWORDS[mode][chapterNo];
    const categories = Array.isArray(spec.categories) && spec.categories.length
      ? spec.categories.slice(0, 5)
      : ["핵심 성향", "감정 흐름", "사주 근거", "관계 전략", "실천 비책"];
    const sections = categories.map((title, sectionIndex) => ({
      title,
      body: sectionBody({ mode, chapterNo, sectionNo: sectionIndex + 1, title, keywords }),
      sajuEvidence: [`${keywords[0]} 근거`, `${keywords[1]} 근거`],
      keyPoints: [`${keywords[2]} 포인트`, `${keywords[3]} 포인트`],
      actionGuide: ["감정을 한 문장으로 확인하기", "작은 약속을 반복하기"],
      caution: ["결론을 서두르지 않기", "상대를 단정하지 않기"],
    }));
    return {
      chapter: chapterNo,
      chapterNumber: spec.number,
      title: spec.title,
      subtitle: `${keywords.slice(0, 4).join(" · ")} 중심 리딩`,
      sections,
      text: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n"),
      source: "smoke",
    };
  });
}

function assertMode(mode, specs, expectedCount) {
  const config = loveSecret.safeModeChapterConfig(mode);
  assert.equal(config.totalChapters, expectedCount, `${mode} config totalChapters`);
  assert.equal(specs.length, expectedCount, `${mode} spec count`);
  assert.equal(config.chapters.length, expectedCount, `${mode} config chapter metadata count`);

  const chapters = buildChapters(mode, specs);
  const validation = loveSecret.validateLoveSecretManuscript({
    mode,
    chapters,
    config,
    minChapterChars: Number(config.chapterMinDefault || 2000),
  });
  assert.equal(validation.ok, true, `${mode} manuscript validation ${JSON.stringify(validation)}`);

  const pdfReady = loveSecret.buildLoveSecretPdfReady("https://example.test", `love_secret_${mode}_smoke`, chapters, base, mode);
  assert.equal(pdfReady.reportId, `love_secret_${mode}_smoke`, `${mode} report id`);
  assert.equal(pdfReady.mode, mode, `${mode} pdf mode`);
  assert.equal(pdfReady.title, mode === "compatibility" ? "사주 궁합 비책" : "사주 연애 비책", `${mode} pdf title`);
  assert.equal(pdfReady.chapterCount, expectedCount, `${mode} pdf chapter count`);
  assert.ok(Number(pdfReady.sectionCount || 0) >= expectedCount * 5, `${mode} pdf section count`);
  assert.ok(String(pdfReady.generatedAt || "").includes("T"), `${mode} generated timestamp`);
  assert.ok(String(pdfReady.html || "").includes(mode === "compatibility" ? "궁합 비책 PDF" : "연애 비책 PDF"), `${mode} html title`);
  assert.ok(String(pdfReady.html || "").length > 10000, `${mode} html length`);
  assert.ok(String(pdfReady.downloadUrl || "").includes("/api/premium/pdf-archive/"), `${mode} archive url`);
  assert.ok(String(pdfReady.downloadUrl || "").includes("format=html"), `${mode} document render url`);
  assert.equal(pdfReady.documentUrl, pdfReady.downloadUrl, `${mode} document url`);
  assert.ok(String(pdfReady.archiveUrl || "").includes("/api/premium/pdf-archive/"), `${mode} raw archive url`);
  assert.equal(pdfReady.mimeType, "text/html", `${mode} archive mime`);
  assert.equal(pdfReady.contentType, "text/html; charset=UTF-8", `${mode} content type`);
  assert.equal(pdfReady.renderFormat, "html-printable", `${mode} render format`);
}

function assertSoloQualityGuides() {
  const allGuides = loveSecret.SOLO_LOVE_CHAPTER_QUALITY_GUIDES || {};
  assert.equal(Object.keys(allGuides).length, 10, "solo quality guide count");
  loveSecret.SOLO_LOVE_CHAPTER_SPECS.forEach((spec) => {
    const guide = loveSecret.getSoloLoveChapterQualityGuide(spec);
    assert.equal(guide.chapterNumber, spec.number, `${spec.number} guide chapter number`);
    assert.equal(guide.chapterTitle, spec.title, `${spec.number} guide chapter title`);
    assert.ok(String(guide.readerQuestion || "").includes("?"), `${spec.number} guide reader question`);
    assert.ok(String(guide.emotionalHook || "").length >= 6, `${spec.number} guide emotional hook`);
    assert.ok(Array.isArray(guide.mustAnswer) && guide.mustAnswer.length >= 4, `${spec.number} guide must answer`);
    assert.ok(String(guide.premiumPromise || "").includes("독자"), `${spec.number} guide premium promise`);
  });

  const guideText = JSON.stringify(allGuides);
  assert.ok(guideText.includes("사랑받"), "solo guide love appeal keyword");
  assert.ok(guideText.includes("상대가 나에게 끌리는"), "solo guide attraction keyword");
  assert.ok(guideText.includes("90일"), "solo guide action plan keyword");
}

assert.ok(base.loveSecretReference.compatibility, "compatibility reference should exist");
assert.ok(base.loveSecretReference.compatibility.feminineAppealFocus, "compatibility appeal focus should exist");

assertSoloQualityGuides();
assertMode("solo", loveSecret.SOLO_LOVE_CHAPTER_SPECS, 10);
assertMode("compatibility", loveSecret.COMPATIBILITY_LOVE_CHAPTER_SPECS, 15);

console.log("[smoke-love-secret-premium-e2e] ok");
