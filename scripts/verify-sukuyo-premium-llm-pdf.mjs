import {
  assertSukyoCompatibilityPdfComplete,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  validateSukyoPdfCompletionPayload,
} from "../worker/lib/sukuyo-premium-pdf-v2.js";

function assert(condition, message, detail = undefined) {
  if (condition) return;
  const error = new Error(message);
  if (detail !== undefined) error.detail = detail;
  throw error;
}

function extract(pattern, text) {
  return text.match(pattern)?.[1] || "";
}

const paragraph = [
  "두 사람의 본명숙은 서로의 반응 속도와 감정의 문턱을 다르게 비추고, 이 관계는 가까워질수록 말의 순서와 휴식의 약속이 중요해집니다.",
  "숙요점의 관계분류는 두 사람이 어떤 자리에서 서로를 살리고 어떤 자리에서 조율이 필요한지를 드러냅니다.",
  "상대의 리듬을 단정하지 않고 먼저 확인하면 감정의 온도가 안정되고, 작은 차이도 관계를 키우는 배움으로 이어집니다.",
].join(" ");

const promptChecks = [];
const env = {
  AI: {
    run: async (_model, payload) => {
      const prompt = payload.messages[payload.messages.length - 1].content;
      promptChecks.push({
        relationAxis: prompt.includes("관계분류 상담축"),
        chapterFocus: prompt.includes("전문 상담 초점"),
        forbiddenTone: prompt.includes("금지 문체"),
      });
      const id = extract(/<article data-chapter-id="([^"]+)">/, prompt);
      const title = extract(/<h1>([^<]+)<\/h1>/, prompt);
      const sections = [...prompt.matchAll(/<section><h2>([^<]+)<\/h2><p>\.\.\.<\/p><p>\.\.\.<\/p><\/section>/g)]
        .map((match) => match[1]);
      const html = [
        `<article data-chapter-id="${id}">`,
        `<h1>${title}</h1>`,
        ...sections.map((section) => `<section><h2>${section}</h2><p>${paragraph} ${paragraph}</p><p>${paragraph} ${paragraph}</p></section>`),
        "</article>",
      ].join("");
      return { response: html };
    },
  },
};

const seed = buildSukyoPdfSeed({
  reportId: "verify-sukuyo-premium-llm-pdf",
  requestId: "verify-sukuyo-premium-llm-pdf",
  userProfile: { name: "하린", birthYear: 1991, birthMonth: 5, birthDay: 14, gender: "여성" },
  partnerProfile: { name: "도윤", birthYear: 1989, birthMonth: 11, birthDay: 3, gender: "남성" },
});

seed.canonical = seed.canonical || {};
seed.canonical.compatibility = {
  ...(seed.canonical.compatibility || {}),
  forwardDistance: 3,
  reverseDistance: 24,
  shortestDistance: 3,
  compatibilityIndex: 83,
  magnetism: 91,
  temperature: 86,
  chemistryScore: 88,
  stabilityScore: 72,
  growthScore: 84,
  communicationScore: 76,
  conflictScore: 42,
};

const result = await generateSukyoPremiumReport(env, seed, { requestId: "verify-sukuyo-premium-llm-pdf" });
assert(result.ok === true, "숙요 PDF 생성이 ok=true를 반환해야 합니다.");
assert(result.chapters.length === 15, "15챕터가 모두 생성되어야 합니다.", result.chapters.length);
assert(promptChecks.length === 15, "15개 LLM 프롬프트가 호출되어야 합니다.", promptChecks.length);
assert(promptChecks.every((item) => item.relationAxis && item.chapterFocus && item.forbiddenTone), "모든 프롬프트에 숙요 전문축과 금지 문체가 포함되어야 합니다.", promptChecks);

assertSukyoCompatibilityPdfComplete({ chapters: result.chapters });
const completion = validateSukyoPdfCompletionPayload({ pdfReady: result.pdfReady, chapters: result.chapters });
assert(completion.ok === true, "PDF 완료 payload 검증이 통과해야 합니다.", completion.issues);

const html = String(result.pdfReady.html || "");
const requiredMarkers = [
  'class="calculation-dashboard"',
  'class="distance-graph"',
  'class="metric-grid"',
  'class="chapter-header__basis"',
  'class="score-summary-table"',
  "계산축",
  "제공 계산 지표",
  "끌림",
  "소통",
  "긴장 완화",
];
const missingMarkers = requiredMarkers.filter((marker) => !html.includes(marker));
assert(missingMarkers.length === 0, "계산 기반 시각화 마커가 누락되지 않아야 합니다.", missingMarkers);

const exactValueMarkers = [
  'data-relation="안괴"',
  'data-distance-label="근거리"',
  'data-forward-distance="3"',
  'data-reverse-distance="24"',
  'data-shortest-distance="3"',
  'data-metric="overall" data-score="83"',
  'data-metric="magnetism" data-score="91"',
  'data-metric="temperature" data-score="86"',
  'data-metric="stability" data-score="72"',
  'data-metric="growth" data-score="84"',
  'data-metric="communication" data-score="76"',
  'data-metric="tensionRelief" data-score="58"',
  'data-distance="3" data-fill="12"',
  'data-distance="24" data-fill="92"',
  'data-chapter-no="1" data-chapter-score="83" data-score-basis="종합 점수"',
  'data-chapter-no="4" data-chapter-score="91" data-score-basis="끌림"',
  'data-chapter-no="6" data-chapter-score="76" data-score-basis="소통"',
  'data-chapter-no="7" data-chapter-score="58" data-score-basis="긴장 완화"',
];
const missingExactValues = exactValueMarkers.filter((marker) => !html.includes(marker));
assert(missingExactValues.length === 0, "시각화 data 값이 입력 계산값과 정확히 일치해야 합니다.", missingExactValues);

const badCompletion = validateSukyoPdfCompletionPayload({
  pdfReady: { ...result.pdfReady, html: `${html}<p>localdraft 템플릿</p>` },
  chapters: result.chapters,
});
assert(
  badCompletion.issues.some((issue) => issue.includes("pdfReady.forbidden-token") && issue.includes("localdraft") && issue.includes("템플릿")),
  "로컬/제작 흔적 금칙어가 완료 검증에서 차단되어야 합니다.",
  badCompletion.issues,
);

console.log("[verify-sukuyo-premium-llm-pdf] ok", {
  chapters: result.chapters.length,
  htmlLength: html.length,
  promptChecks: promptChecks.length,
});
