import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLoveSecretReference } from "../worker/lib/love-secret-reference.js";
import { __loveSecretTestUtils as loveSecret } from "../worker/routes/saju-love-secret.js";

const loveSecretRouteSource = readFileSync(new URL("../worker/routes/saju-love-secret.js", import.meta.url), "utf8");

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
  yongshin: { usefulElements: ["목", "수"], cautionElements: ["금"] },
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
    yongshin: { usefulElements: ["금", "토"], cautionElements: ["화"] },
  },
};
base.loveSecretReference = buildLoveSecretReference(base);

const blockedExternalGenerationHosts = [
  "generativelanguage.googleapis.com",
  "vertexai.googleapis.com",
  "api.openai.com",
];
let externalGenerationFetchAttempts = 0;

function installLoveSecretExternalFetchGuard() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (blockedExternalGenerationHosts.some((host) => url.includes(host))) {
      externalGenerationFetchAttempts += 1;
      throw new Error(`LOVE_SECRET_EXTERNAL_GENERATION_FETCH_BLOCKED:${url}`);
    }
    if (typeof originalFetch === "function") return originalFetch(input, init);
    throw new Error(`UNEXPECTED_FETCH:${url}`);
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

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
    const categories = mode === "compatibility"
      ? Array.from(loveSecret.LOVE_SECRET_PHASE7_COMPAT_SECTIONS[chapterNo] || loveSecret.LOVE_SECRET_PHASE7_COMPAT_SECTIONS[1])
      : Array.from(loveSecret.LOVE_SECRET_PHASE6_SOLO_SECTIONS[chapterNo] || loveSecret.LOVE_SECRET_PHASE6_SOLO_SECTIONS[1]);
    const sections = categories.map((title, sectionIndex) => ({
      title,
      body: sectionBody({ mode, chapterNo, sectionNo: sectionIndex + 1, title, keywords }),
      sajuEvidence: [`${keywords[0]} 근거`, `${keywords[1]} 근거`],
      keyPoints: [`${keywords[2]} 포인트`, `${keywords[3]} 포인트`, `${keywords[4]} 포인트`],
      actionGuide: ["감정을 한 문장으로 확인하기", "작은 약속을 반복하기", "대화 시간을 미리 정하기"],
      checklist: ["반복되는 반응 확인하기", "상대의 속도 존중하기", "오늘의 실천 하나 정하기"],
      caution: ["결론을 서두르지 않기", "상대를 단정하지 않기", "없는 점수를 만들지 않기"],
    }));
    if ((mode === "solo" && chapterNo === 8) || (mode === "compatibility" && chapterNo === 9)) {
      sections[0].tableType = "monthly-love-flow";
      sections[0].tableTitle = "월별 연애운 표";
      sections[0].tableHeaders = ["월", "관계 흐름", "실천 조언"];
      sections[0].tableRows = Array.from({ length: 12 }, (_, monthIndex) => [`${monthIndex + 1}월`, "관계 흐름", "실천 조언"]);
    }
    if (chapterNo === 10) {
      sections[0].tableType = "thirty-day-routine";
      sections[0].tableTitle = "30일 루틴 표";
      sections[0].tableHeaders = ["기간", "주제", "실천법"];
      sections[0].tableRows = [
        ["1~5일", "감정 기록", "하루 한 문장 적기"],
        ["6~10일", "대화 정리", "확인 질문 연습"],
        ["11~15일", "관계 기준", "기준 세 가지 적기"],
        ["16~20일", "화해 연습", "멈춤 문장 정하기"],
        ["21~25일", "강점 강화", "좋았던 행동 반복"],
        ["26~30일", "선택 정리", "다음 원칙 합의"],
      ];
    }
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
  const masterJson = loveSecret.buildLoveSecretMasterJson({
    base,
    mode,
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
    targetYear: 2026,
  });
  const masterValidation = loveSecret.validateLoveSecretMasterJson(masterJson);
  assert.equal(masterValidation.ok, true, `${mode} master json validation ${JSON.stringify(masterValidation)}`);
  assert.equal(masterJson.mode, mode, `${mode} master mode`);
  assert.ok(Array.isArray(masterJson.consultationEvidence.sajuEvidence), `${mode} master evidence array`);
  assert.ok(masterJson.consultationEvidence.sajuEvidence.length >= 5, `${mode} master evidence count`);

  const chapters = buildChapters(mode, specs);
  const validation = loveSecret.validateLoveSecretManuscript({
    mode,
    chapters,
    config,
    minChapterChars: Number(config.chapterMinDefault || 2000),
  });
  assert.equal(validation.ok, true, `${mode} manuscript validation ${JSON.stringify(validation)}`);
  assert.equal(validation.lowSummaryChapters.length, 0, `${mode} phase8 summary validation`);
  assert.equal(validation.lowAdviceChapters.length, 0, `${mode} phase8 advice validation`);
  assert.equal(validation.lowChecklistChapters.length, 0, `${mode} phase8 checklist validation`);
  assert.ok(validation.cardSectionCount >= 8, `${mode} phase8 card validation`);
  assert.ok(validation.monthlyTableCount >= 1, `${mode} phase8 monthly table validation`);
  assert.ok(validation.routineTableCount >= 1, `${mode} phase8 routine table validation`);
  assert.equal(validation.duplicateSectionBlockCount, 0, `${mode} phase9 duplicate section validation`);
  assert.equal(validation.riskyAssertiveCount, 0, `${mode} phase9 assertive validation`);
  assert.equal(validation.explicitIntimacyCount, 0, `${mode} phase9 explicit validation`);
  assert.equal(validation.partnerBlameCount, 0, `${mode} phase9 blame validation`);

  const assembledChapters = loveSecret.buildLoveSecretAssembledChapters(chapters, base, mode);
  const pdfReady = loveSecret.buildLoveSecretPdfReady("https://example.test", `love_secret_${mode}_smoke`, chapters, base, mode);
  assert.equal(pdfReady.reportId, `love_secret_${mode}_smoke`, `${mode} report id`);
  assert.equal(pdfReady.mode, mode, `${mode} pdf mode`);
  assert.equal(pdfReady.title, mode === "compatibility" ? "궁합 비책" : "연애 비책", `${mode} pdf title`);
  assert.equal(pdfReady.chapterCount, expectedCount, `${mode} pdf chapter count`);
  assert.ok(Number(pdfReady.sectionCount || 0) >= expectedCount * 5, `${mode} pdf section count`);
  assert.ok(String(pdfReady.generatedAt || "").includes("T"), `${mode} generated timestamp`);
  assert.ok(String(pdfReady.html || "").includes("<div class=\"brand\">Code Destiny</div>"), `${mode} cover brand`);
  assert.ok(String(pdfReady.html || "").includes(mode === "compatibility" ? "<h1>궁합 비책</h1>" : "<h1>연애 비책</h1>"), `${mode} cover title`);
  assert.ok(String(pdfReady.html || "").includes("사주 구조로 읽는 사랑의 흐름과 실천 전략"), `${mode} cover subtitle`);
  assert.ok(String(pdfReady.html || "").includes(mode === "compatibility" ? "두 사람 궁합 리포트" : "개인 연애 리포트"), `${mode} cover mode`);
  assert.ok(String(pdfReady.html || "").includes("<nav class=\"toc\"><h2>목차</h2>"), `${mode} toc`);
  assert.ok(String(pdfReady.html || "").includes("CHAPTER"), `${mode} chapter marker`);
  const firstRenderedSection = String(assembledChapters[0]?.sections?.[0]?.title || "");
  assert.ok(firstRenderedSection && String(pdfReady.html || "").includes(firstRenderedSection), `${mode} first category section`);
  assert.ok(String(pdfReady.html || "").includes("사주 근거 해석"), `${mode} evidence section`);
  assert.ok(String(pdfReady.html || "").includes("실천 조언"), `${mode} action section`);
  assert.ok(String(pdfReady.html || "").includes("시기별 연애 흐름"), `${mode} timing table`);
  assert.ok(String(pdfReady.html || "").includes("30일"), `${mode} routine table`);
  assert.ok(String(pdfReady.html || "").includes("전체 요약"), `${mode} final summary`);
  assert.ok(String(pdfReady.html || "").includes("마지막 조언"), `${mode} final advice`);
  const pdfCompletionValidation = loveSecret.validateLoveSecretPdfCompletionPayload({ pdfReady, chapters: assembledChapters, mode });
  assert.equal(pdfCompletionValidation.ok, true, `${mode} assembled pdf completion validation ${JSON.stringify(pdfCompletionValidation)}`);
  assert.ok(String(pdfReady.html || "").length > 10000, `${mode} html length`);
  assert.ok(String(pdfReady.downloadUrl || "").includes("/api/premium/pdf-archive/"), `${mode} archive url`);
  assert.ok(String(pdfReady.downloadUrl || "").includes("format=pdf"), `${mode} document render url`);
  assert.ok(String(pdfReady.htmlUrl || "").includes("format=html"), `${mode} html render url`);
  assert.equal(pdfReady.documentUrl, pdfReady.downloadUrl, `${mode} document url`);
  assert.ok(String(pdfReady.archiveUrl || "").includes("/api/premium/pdf-archive/"), `${mode} raw archive url`);
  assert.equal(pdfReady.mimeType, "application/pdf", `${mode} archive mime`);
  assert.equal(pdfReady.contentType, "application/pdf", `${mode} content type`);
  assert.equal(pdfReady.renderFormat, "pdf-archive", `${mode} render format`);
}

function assertSoloNormalizedData(data, label) {
  assert.equal(data.mode, "solo", `${label} normalized mode`);
  assert.ok(data.profile && typeof data.profile === "object", `${label} normalized profile`);
  assert.equal(typeof data.profile.birthDate, "string", `${label} birthDate string`);
  assert.ok(data.pillars && typeof data.pillars === "object", `${label} normalized pillars`);
  assert.equal(typeof data.pillars.year, "string", `${label} year pillar string`);
  assert.equal(typeof data.pillars.month, "string", `${label} month pillar string`);
  assert.equal(typeof data.pillars.day, "string", `${label} day pillar string`);
  assert.ok(data.dayMaster && typeof data.dayMaster === "object", `${label} normalized day master`);
  assert.equal(typeof data.dayMaster.stem, "string", `${label} day master stem string`);
  assert.equal(typeof data.dayMaster.element, "string", `${label} day master element string`);
  assert.equal(typeof data.dayMaster.yinYang, "string", `${label} day master yinYang string`);
  assert.ok(["weak", "balanced", "strong", undefined].includes(data.dayMaster.strength), `${label} day master strength enum`);
  assert.ok(data.fiveElements && typeof data.fiveElements === "object", `${label} normalized five elements`);
  ["wood", "fire", "earth", "metal", "water"].forEach((key) => {
    assert.equal(typeof data.fiveElements[key], "number", `${label} five element ${key} number`);
  });
  assert.ok(Array.isArray(data.fiveElements.strongest), `${label} strongest array`);
  assert.ok(Array.isArray(data.fiveElements.weakest), `${label} weakest array`);
  assert.equal(typeof data.fiveElements.balanceSummary, "string", `${label} balance summary string`);
  assert.ok(data.tenGods && typeof data.tenGods === "object", `${label} normalized ten gods`);
  assert.ok(data.tenGods.distribution && typeof data.tenGods.distribution === "object", `${label} ten god distribution`);
  assert.ok(Array.isArray(data.tenGods.dominant), `${label} dominant ten gods array`);
  assert.ok(Array.isArray(data.tenGods.weak), `${label} weak ten gods array`);
  assert.ok(data.lovePattern && typeof data.lovePattern === "object", `${label} normalized love pattern`);
  ["attractionStyle", "intimacyStyle", "communicationStyle", "conflictPattern", "emotionalNeeds", "cautionPoints"].forEach((key) => {
    assert.ok(Array.isArray(data.lovePattern[key]), `${label} lovePattern ${key} array`);
  });
  assert.ok(data.usefulGods && typeof data.usefulGods === "object", `${label} normalized useful gods`);
  assert.equal(typeof data.usefulGods.loveDirectionSummary, "string", `${label} useful gods summary string`);
  assert.ok(data.timing && typeof data.timing === "object", `${label} normalized timing`);
  assert.ok(Array.isArray(data.specialStars), `${label} special stars array`);
  assert.ok(Array.isArray(data.opportunities), `${label} opportunities array`);
  assert.ok(Array.isArray(data.risks), `${label} risks array`);
  assert.ok(!JSON.stringify(data).includes("[object Object]"), `${label} normalized data has no object string`);
}

function assertNormalizedData() {
  const soloMaster = loveSecret.buildLoveSecretMasterJson({ base, mode: "solo", targetYear: 2026 });
  assertSoloNormalizedData(soloMaster.normalizedLoveSecret, "solo");
  assert.ok(Array.isArray(soloMaster.normalizedLoveSecret.interpretationBlocks), "solo interpretation blocks array");
  assert.ok(soloMaster.normalizedLoveSecret.interpretationBlocks.length >= 10, "solo selected interpretation blocks");
  soloMaster.normalizedLoveSecret.interpretationBlocks.forEach((block, index) => assertLoveInterpretationBlock(block, `solo selected ${index}`));

  const coupleMaster = loveSecret.buildLoveSecretMasterJson({ base, mode: "compatibility", targetYear: 2026 });
  const couple = coupleMaster.normalizedLoveSecret;
  assert.equal(couple.mode, "compatibility", "compatibility normalized mode");
  assertSoloNormalizedData(couple.me, "compatibility me");
  assertSoloNormalizedData(couple.partner, "compatibility partner");
  assert.ok(couple.compatibility && typeof couple.compatibility === "object", "compatibility block");
  ["elementRelation", "dayMasterRelation", "dayBranchRelation", "tenGodRelation", "usefulGodRelation", "strengths", "conflictPoints", "reconciliationKeys", "longTermKeys"].forEach((key) => {
    assert.ok(Array.isArray(couple.compatibility[key]), `compatibility ${key} array`);
  });
  ["totalScore", "emotionalScore", "communicationScore", "attractionScore", "stabilityScore", "conflictScore"].forEach((key) => {
    assert.ok(typeof couple.compatibility[key] === "number" || couple.compatibility[key] === undefined, `compatibility ${key} optional number`);
  });
  assert.ok(couple.timing && typeof couple.timing === "object", "compatibility timing");
  assert.ok(Array.isArray(couple.timing.currentYearAdvice), "compatibility current year advice array");
  assert.ok(Array.isArray(couple.interpretationBlocks.me), "compatibility me interpretation blocks array");
  assert.ok(Array.isArray(couple.interpretationBlocks.partner), "compatibility partner interpretation blocks array");
  assert.ok(couple.interpretationBlocks.me.length >= 10, "compatibility me selected interpretation blocks");
  assert.ok(couple.interpretationBlocks.partner.length >= 10, "compatibility partner selected interpretation blocks");
  assert.ok(!JSON.stringify(couple).includes("[object Object]"), "compatibility normalized data has no object string");
}

function assertNoUnsafeRenderedText(chapters, label) {
  const text = (chapters || []).map((chapter) => String(chapter?.text || "")).join("\n");
  ["[object Object]", "undefined", "null", "NaN", "준비중", "생성 실패", "스켈레톤"].forEach((token) => {
    assert.ok(!text.includes(token), `${label} rendered text excludes ${token}`);
  });
}

function uniqueListCount(chapter, keys) {
  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  const items = [
    ...keys.flatMap((key) => Array.isArray(chapter?.[key]) ? chapter[key] : []),
    ...sections.flatMap((section) => keys.flatMap((key) => Array.isArray(section?.[key]) ? section[key] : [])),
  ].map((item) => String(item || "").trim()).filter(Boolean);
  return new Set(items).size;
}

function assertPhase8ContentStandards(chapters, label) {
  assert.ok(Array.isArray(chapters) && chapters.length > 0, `${label} phase8 chapters exist`);
  chapters.forEach((chapter, index) => {
    const bodyLength = String(chapter?.text || "").replace(/\s+/g, "").length;
    assert.ok(bodyLength >= 1800, `${label} phase8 chapter ${index + 1} body length`);
    assert.ok(uniqueListCount(chapter, ["summaryCards", "keyPoints"]) >= 3, `${label} phase8 chapter ${index + 1} summaries`);
    assert.ok(uniqueListCount(chapter, ["actionItems", "actionGuide", "advice"]) >= 3, `${label} phase8 chapter ${index + 1} advice`);
    assert.ok(uniqueListCount(chapter, ["checklist"]) >= 3, `${label} phase8 chapter ${index + 1} checklist`);
  });
  const sections = chapters.flatMap((chapter) => Array.isArray(chapter?.sections) ? chapter.sections : []);
  const cardSections = sections.filter((section) => {
    const cardItems = ["keyPoints", "actionGuide", "checklist", "caution"].reduce((sum, key) => (
      sum + (Array.isArray(section?.[key]) ? section[key].filter(Boolean).length : 0)
    ), 0);
    return cardItems >= 3;
  });
  assert.ok(cardSections.length >= 8, `${label} phase8 card section count`);
  assert.ok(sections.some((section) => section?.tableType === "monthly-love-flow" && Array.isArray(section?.tableRows) && section.tableRows.length >= 12), `${label} phase8 monthly table`);
  assert.ok(sections.some((section) => section?.tableType === "thirty-day-routine" && Array.isArray(section?.tableRows) && section.tableRows.length >= 6), `${label} phase8 routine table`);
}

function assertPhase9SentenceRules(chapters, label) {
  const text = (chapters || []).map((chapter) => [
    chapter?.text,
    ...(Array.isArray(chapter?.sections) ? chapter.sections.flatMap((section) => [
      section?.body,
      ...(Array.isArray(section?.keyPoints) ? section.keyPoints : []),
      ...(Array.isArray(section?.actionGuide) ? section.actionGuide : []),
      ...(Array.isArray(section?.checklist) ? section.checklist : []),
      ...(Array.isArray(section?.caution) ? section.caution : []),
    ]) : []),
  ].filter(Boolean).join("\n")).join("\n");
  [
    /무조건/,
    /반드시\s*결혼/,
    /반드시\s*헤어/,
    /반드시\s*재회/,
    /100\s*%/,
    /운명의\s*상대다/,
    /절대\s*안\s*맞는다/,
    /성행위|섹스|삽입|성기|노골적|음란|애무|체위|오르가즘|자위/,
    /집착이\s*심하다|바람기가\s*있다|배신할\s*사람|문제\s*있는\s*상대|위험한\s*사람|나쁜\s*상대/,
  ].forEach((pattern) => {
    assert.ok(!pattern.test(text), `${label} phase9 excludes ${pattern}`);
  });
  const sectionPrefixes = (chapters || [])
    .flatMap((chapter) => Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => String(section?.body || "").replace(/\s+/g, " ").trim().slice(0, 180))
    .filter(Boolean);
  assert.equal(new Set(sectionPrefixes).size, sectionPrefixes.length, `${label} phase9 no repeated section block`);
  assert.ok(text.includes("작동 원리") || text.includes("참고점"), `${label} phase9 relation management wording`);
  assert.ok(text.includes("정서적 거리감") || text.includes("스킨십 속도") || text.includes("친밀감의 속도"), `${label} phase9 intimacy wording`);
}

function assertChapterRequiredFields(chapters, label) {
  assert.ok(Array.isArray(chapters) && chapters.length === 10, `${label} 10 chapters`);
  chapters.forEach((chapter, index) => {
    assert.ok(String(chapter?.title || "").trim(), `${label} chapter ${index + 1} title`);
    assert.ok(uniqueListCount(chapter, ["summaryCards", "keyPoints"]) >= 3, `${label} chapter ${index + 1} summary`);
    assert.ok(String(chapter?.text || "").trim().length >= 1800, `${label} chapter ${index + 1} body`);
    assert.ok(uniqueListCount(chapter, ["actionItems", "actionGuide", "advice"]) >= 3, `${label} chapter ${index + 1} advice`);
    assert.ok(uniqueListCount(chapter, ["checklist"]) >= 3, `${label} chapter ${index + 1} checklist`);
  });
}

function assertPaymentFlowGuards() {
  assert.match(loveSecretRouteSource, /async function authorizeLoveSecret/, "love secret has authz helper");
  assert.match(loveSecretRouteSource, /requirePremiumReportAccess/, "love secret requires premium access before generation");
  assert.match(loveSecretRouteSource, /if \(!authz\.ok\) return authz\.response;/, "generation stops before PDF work when access fails");
  assert.match(loveSecretRouteSource, /PAYMENT_CONFIRMED_BUT_ACCESS_MISSING/, "payment binding missing case preserved");
  assert.match(loveSecretRouteSource, /startPremiumPdfExecution/, "premium execution start preserved");
  assert.match(loveSecretRouteSource, /completePremiumPdfExecution/, "premium execution completion preserved");
  assert.match(loveSecretRouteSource, /failPremiumPdfExecution/, "premium execution failure path preserved");
  assert.match(loveSecretRouteSource, /existingJob && clean\(existingJob\.status\) === "completed"/, "completed async job reused on refresh");
  assert.match(loveSecretRouteSource, /fromCache: true/, "completed result reports cache reuse");
  assert.match(loveSecretRouteSource, /cacheKey: pdfCacheKey/, "content cache key stored on job");
  assert.match(loveSecretRouteSource, /buildLoveSecretVerifiedLocalPremiumPdf/, "local premium PDF verification uses shared pipeline");
  assert.equal((loveSecretRouteSource.match(/generateLoveSecretLocalPdf\(/g) || []).length, 1, "local premium PDF generator is called only by shared pipeline");
  assert.doesNotMatch(loveSecretRouteSource, /async-job-db-fallback|prepare-fallback|대기열 저장소 문제/, "direct local premium path is not named as fallback");
}

function assertPhase6SoloChapterStructure(chapters, label) {
  const expectedTitles = loveSecret.LOVE_SECRET_PHASE6_SOLO_CHAPTERS.map((chapter) => chapter.title);
  assert.equal(chapters.length, 10, `${label} phase6 solo chapter count`);
  chapters.forEach((chapter, index) => {
    const expectedSections = loveSecret.LOVE_SECRET_PHASE6_SOLO_SECTIONS[index + 1];
    assert.equal(chapter.title, expectedTitles[index], `${label} phase6 chapter ${index + 1} title`);
    assert.ok(Array.isArray(chapter.sections), `${label} phase6 chapter ${index + 1} sections`);
    assert.deepEqual(chapter.sections.map((section) => section.title), expectedSections, `${label} phase6 chapter ${index + 1} section titles`);
    expectedSections.forEach((sectionTitle) => {
      assert.ok(String(chapter.text || "").includes(sectionTitle), `${label} phase6 chapter ${index + 1} includes ${sectionTitle}`);
    });
  });
}

function assertPhase7CompatibilityChapterStructure(chapters, label) {
  const expectedTitles = loveSecret.LOVE_SECRET_PHASE7_COMPAT_CHAPTERS.map((chapter) => chapter.title);
  assert.equal(chapters.length, 10, `${label} phase7 compatibility chapter count`);
  chapters.forEach((chapter, index) => {
    const expectedSections = loveSecret.LOVE_SECRET_PHASE7_COMPAT_SECTIONS[index + 1];
    assert.equal(chapter.title, expectedTitles[index], `${label} phase7 chapter ${index + 1} title`);
    assert.ok(Array.isArray(chapter.sections), `${label} phase7 chapter ${index + 1} sections`);
    assert.deepEqual(chapter.sections.map((section) => section.title), expectedSections, `${label} phase7 chapter ${index + 1} section titles`);
    expectedSections.forEach((sectionTitle) => {
      assert.ok(String(chapter.text || "").includes(sectionTitle), `${label} phase7 chapter ${index + 1} includes ${sectionTitle}`);
    });
  });
}

function assertLoveInterpretationBlock(block, label) {
  assert.equal(typeof block.id, "string", `${label} block id`);
  assert.ok(Array.isArray(block.tags), `${label} block tags`);
  assert.equal(typeof block.weight, "number", `${label} block weight`);
  assert.equal(typeof block.title, "string", `${label} block title`);
  assert.equal(typeof block.summary, "string", `${label} block summary`);
  ["body", "advice", "caution", "checklist"].forEach((key) => {
    assert.ok(Array.isArray(block[key]), `${label} block ${key}`);
    assert.ok(block[key].every((item) => typeof item === "string" && item.trim()), `${label} block ${key} strings`);
  });
  assert.ok(!JSON.stringify(block).includes("[object Object]"), `${label} block has no object string`);
}

function assertLoveInterpretationBlocks() {
  const db = loveSecret.LOVE_INTERPRETATION_BLOCK_DB;
  assert.equal(Object.keys(db.dayMaster).length, 10, "day master block count");
  assert.ok(Object.keys(db.fiveElements).length >= 11, "five element block count");
  assert.equal(Object.keys(db.tenGods).length, 10, "ten god block count");
  assert.ok(Array.isArray(db.relationship) && db.relationship.length >= 2, "relationship block count");
  assert.ok(Object.keys(db.specialStars).length >= 4, "special star block count");
  assert.ok(Object.keys(db.style).length >= 7, "style block count");

  Object.entries(db.dayMaster).forEach(([key, block]) => assertLoveInterpretationBlock(block, `day master ${key}`));
  Object.entries(db.fiveElements).forEach(([key, block]) => assertLoveInterpretationBlock(block, `five element ${key}`));
  Object.entries(db.tenGods).forEach(([key, block]) => assertLoveInterpretationBlock(block, `ten god ${key}`));
  db.relationship.forEach((block, index) => assertLoveInterpretationBlock(block, `relationship ${index}`));
  Object.entries(db.specialStars).forEach(([key, block]) => assertLoveInterpretationBlock(block, `special star ${key}`));
  Object.entries(db.style).forEach(([key, block]) => assertLoveInterpretationBlock(block, `style ${key}`));
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

function assertLoveSecretPdfCache() {
  const soloKeyA = loveSecret.buildLoveSecretPdfCacheKey(base, "solo", { requestId: "a", reportId: "r1" });
  const soloKeyB = loveSecret.buildLoveSecretPdfCacheKey(base, "solo", { requestId: "b", reportId: "r2" });
  const coupleKeyA = loveSecret.buildLoveSecretPdfCacheKey(base, "compatibility", { requestId: "a", reportId: "r1" });
  const coupleKeyB = loveSecret.buildLoveSecretPdfCacheKey(base, "compatibility", { requestId: "b", reportId: "r2" });
  assert.equal(soloKeyA, soloKeyB, "solo pdf cache key ignores volatile request ids");
  assert.equal(coupleKeyA, coupleKeyB, "compatibility pdf cache key ignores volatile request ids");
  assert.notEqual(soloKeyA, coupleKeyA, "solo and compatibility cache keys differ");

  const payload = {
    ok: true,
    reportId: "cached-love-secret",
    pdfReady: loveSecret.buildLoveSecretPdfReady("https://example.test", "cached-love-secret", buildChapters("solo", loveSecret.LOVE_SECRET_PHASE6_SOLO_CHAPTERS), base, "solo"),
    chapters: buildChapters("solo", loveSecret.LOVE_SECRET_PHASE6_SOLO_CHAPTERS),
  };
  loveSecret.setLoveSecretPdfMemoryCache(soloKeyA, { payload });
  const cached = loveSecret.getLoveSecretPdfMemoryCache(soloKeyA);
  assert.ok(cached?.payload, "pdf memory cache hit");
  const cachedText = JSON.stringify(cached.payload);
  ["[object Object]", "undefined", "NaN"].forEach((token) => {
    assert.ok(!cachedText.includes(token), `cached pdf excludes ${token}`);
  });
}

async function assertLocalAssemblyScaffold() {
  externalGenerationFetchAttempts = 0;
  assert.deepEqual(loveSecret.LOVE_SECRET_PDF_CONFIG, {
    generationMode: "local-premium",
    provider: "saju-premium-local-engine",
    templateVersion: "love-secret-local-premium-v1",
    qualityMode: "premium-local",
  }, "love secret pdf config is local premium");

  const restoreFetch = installLoveSecretExternalFetchGuard();
  try {
    const soloConfig = loveSecret.safeModeChapterConfig("solo");
    const coupleConfig = loveSecret.safeModeChapterConfig("compatibility");
    const soloMasterA = loveSecret.buildLoveSecretMasterJson({ base, mode: "solo", targetYear: 2026 });
    const soloMasterB = loveSecret.buildLoveSecretMasterJson({ base, mode: "solo", targetYear: 2026 });
    const coupleMasterA = loveSecret.buildLoveSecretMasterJson({ base, mode: "compatibility", targetYear: 2026 });
    const coupleMasterB = loveSecret.buildLoveSecretMasterJson({ base, mode: "compatibility", targetYear: 2026 });
    const soloFactsA = loveSecret.buildLoveSecretFacts(soloMasterA);
    const soloFactsB = loveSecret.buildLoveSecretFacts(soloMasterB);
    const coupleFactsA = loveSecret.buildLoveSecretFacts(coupleMasterA);
    const coupleFactsB = loveSecret.buildLoveSecretFacts(coupleMasterB);

    assert.deepEqual(soloFactsA, soloFactsB, "solo facts deterministic");
    assert.deepEqual(coupleFactsA, coupleFactsB, "couple facts deterministic");
    assert.equal(soloFactsA.productId, "love_secret", "solo facts product id");
    assert.equal(soloFactsA.mode, "solo", "solo facts mode");
    assert.equal(coupleFactsA.mode, "couple", "couple facts mode");
    assert.ok(coupleFactsA.partnerDayMaster, "couple partner day master");

    const soloPlans = loveSecret.buildLoveSecretChapterPlans({
      mode: "solo",
      config: soloConfig,
      chapters: buildChapters("solo", loveSecret.SOLO_LOVE_CHAPTER_SPECS),
      loveSecretFacts: soloFactsA,
    });
    const couplePlans = loveSecret.buildLoveSecretChapterPlans({
      mode: "compatibility",
      config: coupleConfig,
      chapters: buildChapters("compatibility", loveSecret.LOVE_SECRET_PHASE7_COMPAT_CHAPTERS),
      loveSecretFacts: coupleFactsA,
    });
    assert.equal(soloPlans.length, 10, "solo chapter plan count");
    assert.equal(couplePlans.length, 10, "couple chapter plan count");
    assert.ok(soloPlans.every((plan) => Array.isArray(plan.lockedFacts) && plan.lockedFacts.length > 0), "solo plans carry locked facts");
    assert.ok(couplePlans.every((plan) => Array.isArray(plan.lockedFacts) && plan.lockedFacts.length > 0), "couple plans carry locked facts");

    const generated = await loveSecret.buildLoveSecretChapters({
      LOVE_SECRET_PDF_GENERATION_MODE: "local-premium",
      LOVE_SECRET_EXTERNAL_GENERATION_ENABLED: "true",
    }, {
      base,
      mode: "solo",
      config: soloConfig,
      body: { requestId: "smoke-local-assembly-solo" },
      requestId: "smoke-local-assembly-solo",
    });
    assert.equal(generated.manuscriptSource, "local-premium", "solo uses local premium manuscript");
    assert.equal(generated.localAssembly.enabled, true, "solo local premium enabled");
    assert.equal(generated.localAssembly.externalCallsAllowed, false, "solo external generation calls blocked");
    assert.equal(generated.localAssembly.externalGeneration, false, "solo external generation blocked");
    assert.equal(generated.localAssembly.templateVersion, "love-secret-local-premium-v1", "solo local premium template version");
    assert.equal(generated.localAssembly.qualityMode, "premium-local", "solo local premium quality mode");
    assert.equal(generated.localAssembly.fallbackUsed, false, "solo local premium fallback unused");
    assert.equal(generated.localAssembly.chapterCount, 10, "solo local premium chapter count");
    assert.equal(generated.localAssembly.expectedChapterCount, 10, "solo local premium expected chapter count");
    assert.equal(externalGenerationFetchAttempts, 0, "solo external generation fetch attempts");
    assert.equal(generated.chapters.length, 10, "solo generated chapter count");
    assert.ok(generated.chapters.every((chapter) => String(chapter.text || "").trim().length > 0), "solo has no empty chapter");
    assert.ok(generated.chapters.every((chapter) => chapter.qualityMode === "premium-local" && chapter.fallbackUsed === false), "solo chapters carry local premium quality marker");
    assertChapterRequiredFields(generated.chapters, "solo local premium");
    assertPhase6SoloChapterStructure(generated.chapters, "solo local premium");
    assertPhase8ContentStandards(generated.chapters, "solo local premium");
    assertPhase9SentenceRules(generated.chapters, "solo local premium");
    assertNoUnsafeRenderedText(generated.chapters, "solo local premium");
    assert.ok(generated.loveSecretChapterPlans.every((plan) => Array.isArray(plan.lockedFacts) && plan.lockedFacts.length > 0), "generated chapter plans carry locked facts");

    const variantBase = structuredClone(base);
    variantBase.user = { ...variantBase.user, name: "Variant User", birthDate: "1988-11-22", birthTime: "18:30" };
    variantBase.core = { ...variantBase.core, dayMaster: "VariantMetal", dayBranch: "VariantBranch", monthBranch: "VariantMonth" };
    variantBase.elementBalance = {
      dominant: "fire",
      deficient: "metal",
      balanceScore: 42,
      counts: { wood: 1, fire: 4, earth: 1, metal: 0, water: 2 },
    };
    variantBase.yongshin = { usefulElements: ["metal", "water"], cautionElements: ["fire"] };
    variantBase.specialStars = { tao: 10, yeokma: 75, hwa: 40, gwimun: true };
    variantBase.loveSecretReference = buildLoveSecretReference(variantBase);
    const variantGenerated = await loveSecret.buildLoveSecretChapters({
      LOVE_SECRET_PDF_GENERATION_MODE: "local-premium",
    }, {
      base: variantBase,
      mode: "solo",
      config: soloConfig,
      body: { requestId: "smoke-local-assembly-variant" },
      requestId: "smoke-local-assembly-variant",
    });
    assert.notDeepEqual(generated.loveSecretFacts, variantGenerated.loveSecretFacts, "different local inputs produce distinct facts");
    assert.notEqual(generated.chapters[0].text, variantGenerated.chapters[0].text, "different local inputs produce distinct chapter text");

    const generatedCompatibility = await loveSecret.buildLoveSecretChapters({
      LOVE_SECRET_PDF_GENERATION_MODE: "local-premium",
      LOVE_SECRET_EXTERNAL_GENERATION_ENABLED: "true",
    }, {
      base,
      mode: "compatibility",
      config: coupleConfig,
      body: { requestId: "smoke-local-assembly-compatibility" },
      requestId: "smoke-local-assembly-compatibility",
    });
    assert.equal(generatedCompatibility.manuscriptSource, "local-premium", "compatibility uses local premium manuscript");
    assert.equal(generatedCompatibility.localAssembly.enabled, true, "compatibility local premium enabled");
    assert.equal(generatedCompatibility.localAssembly.externalCallsAllowed, false, "compatibility external generation calls blocked");
    assert.equal(generatedCompatibility.localAssembly.externalGeneration, false, "compatibility external generation blocked");
    assert.equal(generatedCompatibility.localAssembly.templateVersion, "love-secret-local-premium-v1", "compatibility local premium template version");
    assert.equal(generatedCompatibility.localAssembly.qualityMode, "premium-local", "compatibility local premium quality mode");
    assert.equal(generatedCompatibility.localAssembly.fallbackUsed, false, "compatibility local premium fallback unused");
    assert.equal(generatedCompatibility.localAssembly.chapterCount, 10, "compatibility local premium chapter count");
    assert.equal(generatedCompatibility.localAssembly.expectedChapterCount, 10, "compatibility local premium expected chapter count");
    assert.equal(externalGenerationFetchAttempts, 0, "compatibility external generation fetch attempts");
    assert.equal(generatedCompatibility.chapters.length, 10, "compatibility generated chapter count");
    assert.ok(generatedCompatibility.chapters.every((chapter) => String(chapter.text || "").trim().length > 0), "compatibility has no empty chapter");
    assert.ok(generatedCompatibility.chapters.every((chapter) => chapter.qualityMode === "premium-local" && chapter.fallbackUsed === false), "compatibility chapters carry local premium quality marker");
    assertChapterRequiredFields(generatedCompatibility.chapters, "compatibility local premium");
    assertPhase7CompatibilityChapterStructure(generatedCompatibility.chapters, "compatibility local premium");
    assertPhase8ContentStandards(generatedCompatibility.chapters, "compatibility local premium");
    assertPhase9SentenceRules(generatedCompatibility.chapters, "compatibility local premium");
    assertNoUnsafeRenderedText(generatedCompatibility.chapters, "compatibility local premium");
  } finally {
    restoreFetch();
  }
}

assert.ok(base.loveSecretReference.compatibility, "compatibility reference should exist");
assert.ok(base.loveSecretReference.compatibility.feminineAppealFocus, "compatibility appeal focus should exist");

assertLoveInterpretationBlocks();
assertSoloQualityGuides();
assertLoveSecretPdfCache();
assertPaymentFlowGuards();
assertMode("solo", loveSecret.LOVE_SECRET_PHASE6_SOLO_CHAPTERS, 10);
assertMode("compatibility", loveSecret.LOVE_SECRET_PHASE7_COMPAT_CHAPTERS, 10);
assertNormalizedData();
await assertLocalAssemblyScaffold();

console.log("[smoke-love-secret-premium-e2e] ok");
