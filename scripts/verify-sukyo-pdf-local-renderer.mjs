import { readFileSync } from "node:fs";
import { buildSukyoPdfSeed, generateSukyoPremiumReport } from "../worker/lib/sukyo-pdf.js";

const forbiddenSearch = [
  ["open", "ai"].join(""),
  ["anth", "ropic"].join(""),
  ["gem", "ini"].join(""),
  ["workers", "-", "ai"].join(""),
  ["l", "lm"].join(""),
  ["chat", ".", "completions"].join(""),
  ["generate", "Text"].join(""),
  ["stream", "Text"].join(""),
];

const scopedFiles = [
  "worker/lib/sukyo-pdf.js",
  "worker/routes/sukuyo.js",
  "worker/pdf-v2/sukuyo-local-pdf.js",
];

for (const file of scopedFiles) {
  const source = readFileSync(file, "utf8").toLowerCase();
  const found = forbiddenSearch.filter((term) => source.includes(term.toLowerCase()));
  if (found.length) {
    throw new Error(`[Sukyo PDF] AI call token found in ${file}: ${found.join(", ")}`);
  }
}

const forbiddenPhrases = [
  ["달빛을 한 번 ", "짚으면"].join(""),
  ["숙요 신호가 현실의 말투와 선택으로 ", "내려와요"].join(""),
  ["실宿의 ", "창업"].join(""),
  ["삼宿의 ", "변화"].join(""),
  ["충돌", "를"].join(""),
  ["마무리 약함", "를"].join(""),
  ["생길", "어요"].join(""),
  ["패밀리 테스트", "은"].join(""),
];

const cases = [
  { label: "angoe-near-fire-water", a: ["박병하", "묘숙", "昴", "화"], b: ["손서연", "삼숙", "參", "수"], relation: "안괴", distance: "근거리", score: 58 },
  { label: "yeongchin-middle-wood-fire", a: ["김도윤", "실숙", "室", "목"], b: ["이하린", "벽숙", "壁", "화"], relation: "영친", distance: "중거리", score: 76 },
  { label: "eoptae-far-water-earth", a: ["최서준", "위숙", "危", "수"], b: ["윤지아", "항숙", "亢", "토"], relation: "업태", distance: "원거리", score: 63 },
  { label: "wiseong-near-metal-wood", a: ["한지후", "각숙", "角", "금"], b: ["오서윤", "정숙", "井", "목"], relation: "위성", distance: "근거리", score: 69 },
  { label: "seongwi-middle-earth-metal", a: ["정민재", "저숙", "底", "토"], b: ["강나은", "귀숙", "鬼", "금"], relation: "성위", distance: "중거리", score: 61 },
  { label: "myeong-near-water-water", a: ["문시온", "심숙", "心", "수"], b: ["배유나", "심숙", "心", "수"], relation: "명", distance: "근거리", score: 72 },
  { label: "usoe-far-fire-earth", a: ["서이준", "성숙", "星", "화"], b: ["임하율", "두숙", "斗", "토"], relation: "우쇠", distance: "원거리", score: 55 },
];

function makeSeed(testCase) {
  const [aName, aSyuku, aHan, aElement] = testCase.a;
  const [bName, bSyuku, bHan, bElement] = testCase.b;
  return buildSukyoPdfSeed({
    userProfile: {
      name: aName,
      birthDate: "1990-01-01",
      calendarType: "solar",
      birthTime: "09:00",
      gender: "male",
    },
    partnerProfile: {
      name: bName,
      birthDate: "1992-05-15",
      calendarType: "solar",
      birthTime: "11:30",
      gender: "female",
    },
    userSukyo: {
      index: 1,
      nameKo: aSyuku,
      nameHan: aHan,
      element: aElement,
      keywords: ["감응", "관계", "리듬"],
    },
    partnerSukyo: {
      index: 2,
      nameKo: bSyuku,
      nameHan: bHan,
      element: bElement,
      keywords: ["변화", "선택", "온도"],
    },
    compatibility: {
      relationType: testCase.relation,
      distanceLabel: testCase.distance,
      score: testCase.score,
      compatibilityIndex: testCase.score,
      temperature: Math.min(92, testCase.score + 10),
      chemistryScore: Math.min(95, testCase.score + 8),
      communicationScore: Math.max(42, testCase.score - 2),
      stabilityScore: Math.max(40, testCase.score - 4),
      growthScore: Math.min(90, testCase.score + 1),
      conflictScore: Math.max(35, 100 - testCase.score),
      elementHarmony: {
        aElement,
        bElement,
        harmonyScore: Math.max(35, Math.min(90, testCase.score)),
      },
      enhanced: {
        chemistry: {
          emotional: Math.min(94, testCase.score + 7),
          communication: Math.max(42, testCase.score - 2),
          recoveryPotential: Math.max(35, testCase.score - 10),
          dailyLife: Math.max(40, testCase.score - 3),
          longTermPotential: Math.max(40, testCase.score - 1),
          physical: Math.min(92, testCase.score + 5),
        },
      },
    },
  });
}

const results = [];

for (const testCase of cases) {
  const result = await generateSukyoPremiumReport({ NODE_ENV: "development" }, makeSeed(testCase));
  const chapters = result.chapters || [];
  const html = result.payload?.pdfReady?.html || result.pdfReady?.html || "";
  const generatedText = `${html}\n${chapters.map((chapter) => [
    chapter.title,
    chapter.summary,
    chapter.prescription?.lead,
    ...(chapter.prescription?.actions || []),
    ...(chapter.sections || []).map((section) => section.body),
  ].flat().join("\n")).join("\n")}`;

  if (chapters.length !== 15) throw new Error(`[${testCase.label}] Expected 15 chapters, got ${chapters.length}`);
  for (const chapter of chapters) {
    if (!chapter.summary) throw new Error(`[${testCase.label}] Missing chapter summary: ${chapter.order}`);
    if (!chapter.prescription?.lead || chapter.prescription.actions?.length !== 3) throw new Error(`[${testCase.label}] Missing chapter prescription: ${chapter.order}`);
    if (chapter.sections?.length !== 5) throw new Error(`[${testCase.label}] Expected 5 sections in chapter ${chapter.order}, got ${chapter.sections?.length}`);
    if (chapter.summary.trim() === chapter.sections[0].body.trim()) throw new Error(`[${testCase.label}] Summary duplicated first section: ${chapter.order}`);
    const prescriptionText = [chapter.prescription.lead, ...chapter.prescription.actions].join(" ").trim();
    if (prescriptionText === chapter.sections[4].body.trim()) throw new Error(`[${testCase.label}] Prescription duplicated last section: ${chapter.order}`);
  }

  const forbidden = forbiddenPhrases.filter((phrase) => generatedText.includes(phrase));
  if (forbidden.length) throw new Error(`[${testCase.label}] Forbidden phrase found: ${forbidden.join(", ")}`);
  const [aName, aSyuku,, aElement] = testCase.a;
  const [bName, bSyuku,, bElement] = testCase.b;
  for (const required of [aName, bName, aSyuku.replace(/숙$/, "宿"), bSyuku.replace(/숙$/, "宿"), aElement, bElement, testCase.relation, testCase.distance]) {
    if (!generatedText.includes(required)) throw new Error(`[${testCase.label}] Required signal missing: ${required}`);
  }

  results.push({
    label: testCase.label,
    chapterCount: chapters.length,
    sectionCount: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
    htmlLength: html.length,
    totalLength: result.payload?.manuscriptValidation?.totalLength,
  });
}

console.log(JSON.stringify({
  ok: true,
  caseCount: results.length,
  noAiCalls: true,
  results,
}, null, 2));
