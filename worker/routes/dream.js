import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";

let dreamGeminiCaller = callGeminiText;

function normalizeDreamText(payload) {
  const text = String(payload?.dreamText || "").trim();
  if (!text) return { ok: false, message: "꿈 내용을 입력해 주세요." };
  if (text.length < 8) return { ok: false, message: "꿈 내용을 조금 더 자세히 작성해 주세요. (최소 8자)" };
  if (text.length > 6000) return { ok: false, message: "꿈 내용이 너무 깁니다. 6000자 이하로 입력해 주세요." };
  return { ok: true, text };
}

function normalizePsychoIntake(payload) {
  const intake = payload && typeof payload === "object" ? payload : {};
  const emotionalState = String(intake.emotionalState || intake.currentEmotion || intake.emotion || "").trim().slice(0, 120);
  const recurringConcern = String(intake.recurringConcern || intake.mainConcern || "").trim().slice(0, 220);
  const recentStressContext = String(intake.recentStressContext || intake.stressContext || intake.recentEvents || "").trim().slice(0, 220);
  const desiredOutcome = String(intake.desiredOutcome || intake.goal || intake.userQuestion || "").trim().slice(0, 220);
  const relationshipContext = String(intake.relationshipContext || "").trim().slice(0, 220);
  const userQuestion = String(intake.userQuestion || intake.goal || "").trim().slice(0, 220);
  const createdAt = String(intake.createdAt || "").trim().slice(0, 60);

  const rawPeople = Array.isArray(intake.peopleInDream)
    ? intake.peopleInDream
    : String(intake.peopleInDream || "")
      .split(/[，,]/)
      .map((v) => v.trim())
      .filter(Boolean);

  const peopleInDream = rawPeople
    .map((v) => String(v || "").trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);

  return {
    emotion: emotionalState,
    emotionalState,
    recurringConcern,
    recentStressContext,
    desiredOutcome,
    peopleInDream,
    relationshipContext,
    recentEvents: recentStressContext,
    userQuestion,
    createdAt,
  };
}

function pickGeminiKeys(env) {
  return [
    env.GEMINIF_API_KEY1,
    env.GEMINIF_API_KEY2,
    env.GEMINIF_API_KEY3,
    env.GEMINIF_API_KEY4,
    env.GEMINIF_API_KEY5,
  ].map((v) => String(v || "").trim()).filter(Boolean);
}

function pickGeminiModels(env) {
  const primary = String(env.PSYCHO_ANALYSIS_GEMINI_MODEL || env.GEMINI_MODEL || "").trim();
  const defaults = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  return primary ? [primary, ...defaults.filter((m) => m !== primary)] : defaults;
}

const PSYCHO_TECH_BANNED_TOKENS = [
  "자동 정리됨",
  "정신분석 데이터 분석",
  "섹션 형식은 일부 자동 정리됨",
  "데이터 부족",
  "템플릿",
  "fallback",
  "json",
  "payload",
  "llm",
  "api",
  "내부 분석값",
  "debug",
  "undefined",
  "null",
];

const PSYCHO_REQUIRED_CHAPTERS = [
  {
    title: "Chapter 1. 꿈의 장면과 핵심 상징",
    categories: [
      "1. 꿈의 핵심 장면 요약",
      "2. 가장 강한 상징",
      "3. 꿈속 감정의 색깔",
      "4. 현실의 어떤 마음과 연결되는가",
      "5. 이 꿈이 남긴 첫 메시지",
    ],
  },
  {
    title: "Chapter 2. 정신분석적 해석 — 무의식의 소망과 갈등",
    categories: [
      "1. 프로이트식 소망 충족 관점",
      "2. 애착 욕구와 결핍의 신호",
      "3. 억눌린 감정 또는 말하지 못한 마음",
      "4. 반복되는 관계 패턴과의 연결",
      "5. 무의식이 이 장면을 선택한 이유",
    ],
  },
  {
    title: "Chapter 3. 융 심리학적 해석 — 내면의 원형과 통합",
    categories: [
      "1. 꿈속 인물이 상징하는 내면의 일부",
      "2. 결혼·만남·이별·죽음 등 주요 원형의 의미",
      "3. 그림자와 아니마/아니무스의 작용",
      "4. 내면 통합의 가능성",
      "5. 이 꿈이 보여주는 성장 방향",
    ],
  },
  {
    title: "Chapter 4. 영적 상징 해몽 — 꿈이 전하는 신비한 메시지",
    categories: [
      "1. 영혼의 언어로 본 꿈의 의미",
      "2. 인연과 카르마의 상징",
      "3. 꿈속 감정이 가진 영적 진동",
      "4. 현실에서 주의 깊게 볼 신호",
      "5. 이 꿈이 건네는 신비로운 문장",
    ],
  },
  {
    title: "Chapter 5. 현실 조언과 치유의 방향",
    categories: [
      "1. 이 꿈을 현실에서 어떻게 받아들일 것인가",
      "2. 지금 내 마음이 원하는 것",
      "3. 관계에서 조심해야 할 태도",
      "4. 오늘 할 수 있는 작은 행동",
      "5. 마지막 치유 메시지",
    ],
  },
];

const DREAM_DIAGNOSIS_BANNED_PATTERNS = [
  /우울증입니다/gi,
  /불안장애입니다/gi,
  /집착입니다/gi,
  /진단/gi,
  /병명/gi,
  /약물 치료/gi,
  /처방/gi,
];

const DREAM_PROPHECY_BANNED_PATTERNS = [
  /반드시 결혼/gi,
  /확정된 미래/gi,
  /100%/gi,
  /예언/gi,
  /운명적으로 반드시/gi,
  /전생의 부부다/gi,
];

function inferDreamEmotionTone(dreamText, intake) {
  const bag = `${dreamText || ""} ${(intake && (intake.emotion || intake.emotionalState)) || ""}`.toLowerCase();

  const score = {
    happy: 0,
    sad: 0,
    fearful: 0,
    anxious: 0,
    nostalgic: 0,
    erotic: 0,
    mysterious: 0,
    confusing: 0,
    healing: 0,
  };

  const addScore = (tone, patterns, weight = 1) => {
    patterns.forEach((p) => {
      if (p.test(bag)) score[tone] += weight;
    });
  };

  addScore("happy", [/행복/, /기쁘/, /따뜻/, /설렘/, /웃/], 2);
  addScore("healing", [/회복/, /치유/, /안도/, /포근/, /허락/, /가능성/], 2);
  addScore("sad", [/슬픔/, /눈물/, /그리움/, /외로움/, /상실/], 2);
  addScore("fearful", [/무서/, /공포/, /쫓기/, /추락/, /죽/], 2);
  addScore("anxious", [/불안/, /초조/, /긴장/, /압박/, /걱정/], 2);
  addScore("nostalgic", [/옛날/, /추억/, /그때/, /어릴 적/], 2);
  addScore("erotic", [/입맞춤/, /키스/, /포옹/, /성적/, /관능/], 2);
  addScore("mysterious", [/신비/, /빛/, /상징/, /의식/, /영적/], 1);
  addScore("confusing", [/혼란/, /뒤섞/, /이상/, /낯설/, /알 수 없/], 1);

  if (/사랑/.test(bag) && /결혼/.test(bag)) {
    score.happy += 2;
    score.healing += 2;
  }

  const totalPositive = score.happy + score.healing;
  const totalNegative = score.sad + score.fearful + score.anxious;
  const ordered = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const top = ordered[0];
  const second = ordered[1];

  let primary = "mixed";
  if (top && top[1] > 0) {
    if (second && second[1] > 0 && Math.abs(top[1] - second[1]) <= 1) {
      primary = "mixed";
    } else {
      primary = top[0];
    }
  }

  if (totalPositive >= 3 && totalNegative === 0) {
    primary = score.healing >= score.happy ? "healing" : "happy";
  }
  if (totalPositive > 0 && totalNegative > 0 && Math.abs(totalPositive - totalNegative) <= 2) {
    primary = "mixed";
  }

  const tags = ordered.filter(([, v]) => v > 0).slice(0, 3).map(([k]) => k);
  if ((primary === "happy" || primary === "healing") && /사랑|결혼|허락|가능/.test(bag)) {
    tags.push("wish_fulfillment");
  }

  return {
    primary,
    tags: Array.from(new Set(tags)),
    positiveBias: totalPositive >= totalNegative,
  };
}

function inferDreamSymbols(dreamText, intake) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim();
  const symbols = [];
  const add = (cond, label) => {
    if (cond) symbols.push(label);
  };

  add(/사랑/.test(compact), "사랑하는 사람");
  add(/결혼/.test(compact), "결혼");
  add(/행복|기쁨|따뜻/.test(compact), "행복감");
  add(/허락|가능|이룰 수/.test(compact), "허락/가능성");
  add(/만나|재회/.test(compact), "관계의 결합");

  const people = Array.isArray(intake?.peopleInDream) ? intake.peopleInDream : [];
  return {
    compact,
    symbols: Array.from(new Set(symbols.concat(people))).slice(0, 8),
  };
}

function psychoPrompt(dreamText, intake, tone, symbols) {
  const intakeBlock = [
    `- 감정 단서: ${intake.emotion || "미입력"}`,
    `- 꿈에 등장한 인물: ${(intake.peopleInDream || []).join(", ") || "미입력"}`,
    `- 관계 맥락: ${intake.relationshipContext || "미입력"}`,
    `- 최근 사건: ${intake.recentEvents || "미입력"}`,
    `- 사용자가 묻는 질문: ${intake.userQuestion || intake.desiredOutcome || "미입력"}`,
    `- 작성 시각: ${intake.createdAt || "미입력"}`,
    `- 기존 고민 단서: ${intake.recurringConcern || "미입력"}`,
  ].join("\n");

  const chapterGuide = PSYCHO_REQUIRED_CHAPTERS
    .map((chapter) => [
      `## ${chapter.title}`,
      ...chapter.categories.map((category) => `### ${category}`),
    ].join("\n"))
    .join("\n\n");

  return [
    "당신은 정신분석, 임상 심리, 융 심리학, 애착 심리, 꿈 상징 해석, 영적 해몽을 통합해 꿈을 해석하는 전문 상담가입니다.",
    "반드시 한국어로 답하세요.",
    "진단명/병명/약물/치료 지시를 금지합니다.",
    "예언처럼 단정하지 마세요.",
    "꿈 원문을 최우선 근거로 삼고, 꿈에 없는 불안·회피·위험 신호를 자동 삽입하지 마세요.",
    "행복/치유 톤이면 소망 충족, 애착, 결합, 회복 가능성을 중심으로 쓰세요.",
    "불안 톤이면 보호 욕구와 갈등을 안전하게 해석하되 공포를 과장하지 마세요.",
    "기술 용어(JSON, payload, fallback, LLM, API, debug 등)를 절대 쓰지 마세요.",
    "",
    "아래 5챕터와 세부 카테고리를 그대로 유지해 작성하세요.",
    chapterGuide,
    "",
    "모든 카테고리는 2~4문장으로 구체적으로 작성하세요.",
    "Chapter 1에서는 꿈 원문의 핵심 단어를 최소 3개 이상 그대로 인용하세요.",
    "마지막 Chapter 5의 4번 카테고리는 오늘 바로 실행 가능한 행동 1~3개를 제시하세요.",
    "사용자가 심각한 고통·자해 충동·현실 기능 저하를 직접 언급한 경우에만 전문가 상담 권유 문장을 1개 추가하세요.",
    "",
    "[꿈 감정 톤 추정]",
    `- primary: ${tone.primary}`,
    `- tags: ${tone.tags.join(", ") || "none"}`,
    `- positiveBias: ${tone.positiveBias ? "yes" : "no"}`,
    "",
    "[상징 단서]",
    `- 핵심 상징 후보: ${(symbols.symbols || []).join(", ") || "없음"}`,
    "",
    "[상담 인테이크]",
    intakeBlock,
    "",
    "[꿈 원문]",
    dreamText,
  ].join("\n");
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => String(part?.text || "")).join("\n").trim();
}

function removePsychoTechTokens(text) {
  let out = String(text || "");
  PSYCHO_TECH_BANNED_TOKENS.forEach((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "");
  });
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function getDreamKeywords(dreamText) {
  return String(dreamText || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length >= 2)
    .slice(0, 12);
}

function validatePsychoQuality(markdown, dreamText, tone) {
  const text = String(markdown || "");
  const chapter1Text = sectionText(text, PSYCHO_REQUIRED_CHAPTERS[0].title);
  const checks = {
    chapters: true,
    categories: true,
    reflectsDreamKeywords: false,
    chapter1AnchoredToDream: false,
    noOppositeToneTemplate: true,
    noDiagnosis: true,
    noProphecy: true,
    noTechPhrase: true,
  };

  PSYCHO_REQUIRED_CHAPTERS.forEach((chapter) => {
    if (!text.includes(`## ${chapter.title}`)) checks.chapters = false;
    chapter.categories.forEach((category) => {
      if (!text.includes(`### ${category}`)) checks.categories = false;
    });
  });

  const dreamKeywords = getDreamKeywords(dreamText);
  checks.reflectsDreamKeywords = dreamKeywords.length
    ? dreamKeywords.some((kw) => text.includes(kw))
    : text.length > 80;

  const anchorTargets = dreamKeywords.slice(0, 6);
  const anchorMatched = anchorTargets.filter((kw) => chapter1Text.includes(kw)).length;
  checks.chapter1AnchoredToDream = anchorTargets.length ? anchorMatched >= Math.min(3, anchorTargets.length) : chapter1Text.length > 40;

  if (tone && (tone.primary === "happy" || tone.primary === "healing")) {
    const strongNegativeTemplate = /(회피 신호|위험 신호|불안을 통제하지 못할)/i;
    const positiveAnchor = /(행복|소망|치유|회복|결합|희망)/i;
    if (strongNegativeTemplate.test(text) && !positiveAnchor.test(text)) {
      checks.noOppositeToneTemplate = false;
    }

    const negativeHits = (text.match(/불안|회피|위협|공포|파국|붕괴|통제하지 못할/g) || []).length;
    const positiveHits = (text.match(/행복|소망|치유|회복|결합|희망|안정|허락/g) || []).length;
    if (negativeHits >= 4 && positiveHits <= 2) {
      checks.noOppositeToneTemplate = false;
    }
  }

  checks.noDiagnosis = !DREAM_DIAGNOSIS_BANNED_PATTERNS.some((re) => re.test(text));
  checks.noProphecy = !DREAM_PROPHECY_BANNED_PATTERNS.some((re) => re.test(text));
  checks.noTechPhrase = !PSYCHO_TECH_BANNED_TOKENS.some((token) => new RegExp(token, "i").test(text));

  const ok = Object.values(checks).every(Boolean);
  return { ok, checks };
}

function buildPsychoFiveChapterFallback(dreamText, intake, tone, symbols) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim();
  const symbolLine = (symbols.symbols || []).join(", ") || "핵심 장면, 감정의 여운, 관계적 단서";
  const toneLine = tone.primary === "happy" || tone.primary === "healing"
    ? "행복과 회복의 결"
    : tone.primary === "mixed"
      ? "양가감정의 결"
      : "긴장과 보호 욕구의 결";

  const chapter4Signal = tone.primary === "happy" || tone.primary === "healing"
    ? "지금의 따뜻한 감각을 성급한 결론으로 소비하지 말고, 삶의 안정 루틴으로 변환할수록 이 꿈의 빛이 오래 남습니다."
    : "강한 감정이 올라올 때 즉시 결론을 내리기보다 감정의 파고를 관찰하면, 꿈이 남긴 경고를 삶의 균형 신호로 바꿀 수 있습니다.";

  return [
    `## ${PSYCHO_REQUIRED_CHAPTERS[0].title}`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[0].categories[0]}`,
    `이 꿈의 중심 장면은 "${compact.slice(0, 220)}"로 요약됩니다. 짧은 문장 안에서도 관계와 감정이 동시에 완성되는 장면이 선명하게 드러납니다.`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[0].categories[1]}`,
    `${symbolLine}이 가장 강한 상징으로 읽힙니다. 특히 꿈속 사건은 단순 사실 재현이 아니라 마음이 중요하게 붙잡고 있는 의미를 압축해 보여줍니다.`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[0].categories[2]}`,
    `감정의 색깔은 ${toneLine}에 가깝습니다. 이 정서는 꿈 전체의 해석 방향을 정하는 핵심 단서입니다.`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[0].categories[3]}`,
    `현실에서는 관계적 안정, 선택의 확신, 정서적 소속감에 대한 마음과 연결될 가능성이 큽니다. 꿈은 말로 다루기 어려운 바람을 장면으로 번역해 보여줍니다.`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[0].categories[4]}`,
    `이 꿈의 첫 메시지는 "당신의 마음이 무엇을 진짜 소중하게 여기는지 이미 알고 있다"는 점입니다.`,
    "",
    `## ${PSYCHO_REQUIRED_CHAPTERS[1].title}`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[1].categories[0]}`,
    "정신분석적으로 이 꿈은 현실에서 완결되지 않은 바람을 상징적으로 완성해 보는 소망 충족의 성격을 가질 수 있습니다. 이는 병리 신호가 아니라 마음이 균형을 회복하려는 자연스러운 작용으로 볼 수 있습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[1].categories[1]}`,
    "꿈에 나타난 결합과 안정의 이미지는 애착 욕구, 즉 안전하게 머물 수 있는 관계에 대한 필요를 비춥니다. 동시에 내가 어떤 방식으로 사랑받고 싶은지를 알려주는 단서가 됩니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[1].categories[2]}`,
    "평소 표현되지 못한 감정은 꿈에서 더 선명한 장면으로 떠오르기 쉽습니다. 그래서 꿈의 행복감은 단순 기분이 아니라 오래 기다려온 심리적 허용의 감각일 수 있습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[1].categories[3]}`,
    `반복되는 관계 패턴이 있다면, 이 꿈은 갈등 자체보다 관계가 이루어질 때의 안정감을 우선적으로 보여줍니다. 관계 맥락(${intake.relationshipContext || "미입력"})과 함께 보면 해석이 더 구체화됩니다.`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[1].categories[4]}`,
    "무의식은 논리보다 상징을 사용합니다. 그래서 이 장면은 마음이 지금 가장 지키고 싶은 가치와 방향을 한 번에 보여주기 위해 선택된 것으로 해석할 수 있습니다.",
    "",
    `## ${PSYCHO_REQUIRED_CHAPTERS[2].title}`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[2].categories[0]}`,
    "꿈속 인물은 실제 그 사람일 수도 있고, 동시에 내 안의 특정 자질을 상징할 수도 있습니다. 따뜻함, 신뢰, 선택받고 싶은 마음이 한 인물 안에 응축되어 나타나는 경우가 많습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[2].categories[1]}`,
    "융 심리학에서 결혼과 만남은 실제 사건의 예고라기보다 내면의 결합, 즉 분리된 감정과 의지가 다시 합쳐지는 원형으로 읽힙니다. 이는 삶의 다음 단계로 이동하려는 준비 신호가 될 수 있습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[2].categories[2]}`,
    "그림자는 억눌린 두려움만이 아니라, 아직 충분히 사용되지 않은 생명력도 포함합니다. 아니마/아니무스의 상호작용은 관계 안에서 나의 균형감을 회복하려는 움직임으로 나타날 수 있습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[2].categories[3]}`,
    "이 꿈은 내면 통합의 가능성을 높게 보여줍니다. 감정과 이성이 서로 대립하기보다 같은 방향을 향해 정렬되는 징후를 담고 있습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[2].categories[4]}`,
    "성장 방향은 관계를 붙잡는 조급함이 아니라, 관계를 감당할 수 있는 내적 안정의 확장에 있습니다. 스스로를 돌보는 선택이 곧 관계의 질을 바꿉니다.",
    "",
    `## ${PSYCHO_REQUIRED_CHAPTERS[3].title}`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[3].categories[0]}`,
    "영적 언어로 보면 이 꿈은 마음이 가장 진실한 소원을 은유로 건네는 순간입니다. 꿈은 결과를 확정하는 문장이 아니라, 살아 있는 의미를 비추는 거울에 가깝습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[3].categories[1]}`,
    "인연과 카르마의 관점에서 이 장면은 누군가와의 연결이 내 삶의 가치 체계에 깊이 닿아 있음을 시사합니다. 다만 이것을 현실 사건의 단정으로 읽기보다 내면의 약속으로 다루는 것이 안전합니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[3].categories[2]}`,
    "꿈에서 느낀 감정은 당신의 영적 진동 상태를 보여줍니다. 따뜻함이 강했다면 치유 에너지가 회복되는 흐름, 긴장이 강했다면 보호 경계를 세우라는 흐름으로 읽을 수 있습니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[3].categories[3]}`,
    chapter4Signal,
    `### ${PSYCHO_REQUIRED_CHAPTERS[3].categories[4]}`,
    "이 꿈은 말합니다. 당신의 마음에는 아직 사랑하고 연결될 힘이 남아 있으며, 그 힘을 오늘의 삶으로 옮길 준비가 되어 있다고.",
    "",
    `## ${PSYCHO_REQUIRED_CHAPTERS[4].title}`,
    `### ${PSYCHO_REQUIRED_CHAPTERS[4].categories[0]}`,
    "이 꿈을 현실에서 다루는 핵심은 장면의 감각을 보존하면서도 성급한 결론을 피하는 것입니다. 꿈의 메시지를 행동 계획으로 번역할 때 해석의 가치가 커집니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[4].categories[1]}`,
    "지금 마음이 원하는 것은 관계의 속도보다 안정의 질일 가능성이 큽니다. 내가 원하는 사랑의 형태를 문장으로 명확히 하면 감정의 흔들림이 줄어듭니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[4].categories[2]}`,
    "관계에서 조심할 태도는 과잉 해석과 충동적 확인입니다. 상대의 반응을 서둘러 결론 내리기보다, 내 감정과 사실을 분리해 대화 준비를 먼저 하는 편이 안전합니다.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[4].categories[3]}`,
    "1) 오늘 꿈에서 가장 행복했던 문장을 3줄로 기록하세요.",
    "2) 그 장면이 상징하는 안정감을 현실 루틴 1개(수면, 산책, 대화 준비)로 연결하세요.",
    "3) 관계 행동은 오늘 결론 대신 질문 1개를 준비하는 수준에서 멈추세요.",
    `### ${PSYCHO_REQUIRED_CHAPTERS[4].categories[4]}`,
    "당신의 꿈은 끝난 감정의 잔상이 아니라, 다시 연결되고 회복될 수 있는 마음의 능력을 조용히 증명하고 있습니다.",
  ].join("\n");
}

function fallbackMarkdown(dreamText, intake, tone, symbols) {
  return buildPsychoFiveChapterFallback(dreamText, intake, tone, symbols);
}

function normalizeConsultTone(value) {
  const tone = String(value || "comfort").trim().toLowerCase();
  if (tone === "motivation" || tone === "coaching") return tone;
  return "comfort";
}

function normalizeConsultCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const normalized = list
    .slice(0, 3)
    .map((item, idx) => {
      const name = String(item?.name || item?.card_name || `카드 ${idx + 1}`).trim();
      const orientation = String(item?.orientation || "upright").toLowerCase() === "reversed" ? "reversed" : "upright";
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 5)
        : [];
      return { name, orientation, keywords };
    })
    .filter((item) => item.name);

  if (!normalized.length) {
    return { ok: false, message: "카드 정보가 필요합니다." };
  }

  return { ok: true, cards: normalized };
}

function consultToneGuide(tone) {
  if (tone === "motivation") {
    return "따뜻하지만 추진력 있는 드림 타로 리더처럼 말하고, 꿈이 남긴 에너지를 오늘 움직일 수 있는 작고 선명한 선택으로 내려놓으세요.";
  }
  if (tone === "coaching") {
    return "질문형 리딩 톤으로 말하고, 꿈의 장면, 감정의 잔향, 오늘의 선택을 차례로 짚어 주는 체크포인트를 제시하세요.";
  }
  return "정서적 안정감을 주는 드림 타로 리더 톤으로 말하고, 불안을 키우지 않으면서 마음을 정리하는 작은 회복 행동을 제시하세요.";
}

function tarotConsultPrompt({ dreamText, cards, tone, summary }) {
  const cardLines = cards.map((card, idx) => {
    const orient = card.orientation === "reversed" ? "역방향" : "정방향";
    const keywords = card.keywords.length ? card.keywords.join(", ") : "키워드 없음";
    return `- ${idx + 1}번 카드: ${card.name} (${orient}) | 키워드: ${keywords}`;
  });

  return [
    "당신은 꿈의 잔향을 세 장의 타로 카드로 읽는 한국어 드림 타로 리더입니다.",
    consultToneGuide(tone),
    "과장된 예언이나 단정은 금지하고, 꿈의 상징, 깨어난 뒤의 감정, 카드의 방향을 연결해 신비롭지만 현실적인 조언을 제공합니다.",
    "각 문단은 꿈을 해부하는 설명문이 아니라, 사용자가 자기 마음을 안전하게 알아차리도록 돕는 리딩 문장으로 작성하세요.",
    "기술 용어, API, 모델, 데이터, fallback, JSON 같은 표현은 절대 쓰지 마세요.",
    "출력은 반드시 아래 형식 그대로 작성하세요.",
    "",
    "## 꿈의 문을 여는 카드",
    "3~4문장. 꿈 원문에서 가장 선명한 장면과 세 카드 이름을 자연스럽게 엮어, 이 꿈이 어떤 문을 열었는지 읽으세요.",
    "",
    "## 마음 아래 흐르는 감정",
    "3~4문장. 꿈이 남긴 감정의 잔향과 카드의 정방향/역방향 흐름을 함께 읽고, 불안을 단정하지 말고 감정의 이름을 부드럽게 붙이세요.",
    "",
    "## 오늘의 작은 선택 3가지",
    "- 꿈의 장면을 현실에서 안전하게 다루는 작은 행동 1",
    "- 관계나 일에서 바로 확인할 수 있는 작은 행동 1",
    "- 잠들기 전 마음을 봉인하는 회복 행동 1",
    "",
    "## 관계/일/회복의 길",
    "- 관계: 상대를 단정하기보다 내 감정과 필요를 정리하는 방향으로 쓰세요.",
    "- 일/돈: 큰 결론보다 오늘 줄일 수 있는 부담과 현실적 우선순위를 쓰세요.",
    "- 회복: 수면, 호흡, 기록처럼 오늘 밤 반복 가능한 회복 루틴을 쓰세요.",
    "",
    "## 봉인 문장",
    "한 줄. 꿈의 빛을 오늘의 선택으로 옮기는 신비롭고 단정한 문장으로 마무리하세요.",
    "",
    "[사용자 꿈 원문]",
    dreamText,
    "",
    "[카드 정보]",
    ...cardLines,
    "",
    "[사전 요약 참고]",
    String(summary || "없음"),
  ].join("\n");
}

function fallbackTarotConsultMarkdown({ dreamText, cards }) {
  const compact = String(dreamText || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const cardLine = cards.map((card) => card.name).join(" · ");
  return [
    "## 꿈의 문을 여는 카드",
    `${cardLine || "오늘의 카드"} 조합은 꿈속 장면("${compact}")이 단순한 잔상이 아니라, 지금 마음이 붙잡고 있는 문을 비추고 있음을 보여줍니다. 이 문은 불안을 키우기 위한 것이 아니라, 아직 이름 붙이지 못한 감정과 필요를 조용히 드러내는 통로에 가깝습니다.`,
    "당장 결론을 내리기보다, 오늘 다룰 수 있는 한 장면만 골라 현실의 작은 행동으로 옮길 때 꿈의 파장이 안정됩니다.",
    "",
    "## 마음 아래 흐르는 감정",
    "지금 감정의 중심에는 두려움 자체보다, 내가 놓치고 싶지 않은 안정과 확인받고 싶은 마음이 함께 흐릅니다. 그래서 생각은 많아지지만, 실제 행동은 늦어지는 패턴이 나타날 수 있습니다.",
    "지금 필요한 것은 완벽한 해답이 아니라, 깨어난 뒤 남은 감정을 사실과 분리해 적어보는 짧은 정리입니다. 감정의 이름을 붙이는 순간 꿈은 막연한 예감이 아니라 나를 돌보는 언어가 됩니다.",
    "",
    "## 오늘의 작은 선택 3가지",
    "- 꿈에서 가장 선명했던 장면 하나를 적고, 그때의 감정을 한 단어로 봉인하기",
    "- 관계나 일에서 미뤄 둔 확인 하나를 오늘 가능한 가장 작은 방식으로 정리하기",
    "- 잠들기 전 5분 동안 조명을 낮추고, 오늘의 감정을 세 문장으로 내려놓기",
    "",
    "## 관계/일/회복의 길",
    "- 관계: 상대의 마음을 단정하기보다, 내가 바라는 안정과 거리감을 먼저 한 문장으로 정리하세요.",
    "- 일/돈: 큰 결정보다 이번 주 부담을 줄이는 작은 실행을 우선하면 흐름이 맑아집니다.",
    "- 회복: 회복 루틴은 길이보다 반복이 중요합니다. 짧은 기록과 호흡만으로도 밤의 파장이 낮아집니다.",
    "",
    "## 봉인 문장",
    "나는 꿈이 남긴 잔향을 오늘의 작고 안전한 선택으로 봉인한다.",
  ].join("\n");
}

function sectionText(markdown, heading) {
  const source = String(markdown || "");
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`##\\s*${escaped}\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const found = source.match(pattern);
  return found ? String(found[1] || "").trim() : "";
}

function firstMeaningfulLine(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => String(line || "").replace(/^[-*]\s*/, "").trim())
    .find(Boolean) || "";
}

function extractActionPlan(markdown) {
  const section = sectionText(markdown, "오늘의 작은 선택 3가지");
  const lines = section
    .split(/\n+/)
    .map((line) => String(line || "").trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  return lines.slice(0, 3);
}

async function handleTarotConsult(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const cards = normalizeConsultCards(body?.cards);
  if (!cards.ok) {
    return json({ ok: false, message: cards.message }, { status: 400 });
  }

  const tone = normalizeConsultTone(body?.tone);
  const prompt = tarotConsultPrompt({
    dreamText: normalized.text,
    cards: cards.cards,
    tone,
    summary: String(body?.summary || "").trim(),
  });

  const ai = await dreamGeminiCaller(env, prompt, {
    keyEnvKeys: ["DREAM_TAROT_GEMINI_API_KEY", "PSYCHO_ANALYSIS_GEMINI_API_KEY"],
    modelEnvKeys: ["DREAM_TAROT_GEMINI_MODEL", "PSYCHO_ANALYSIS_GEMINI_MODEL"],
    temperature: 0.84,
    topP: 0.93,
    maxOutputTokens: 4096,
    timeoutMs: Number(env.DREAM_TAROT_GEMINI_TIMEOUT_MS || env.PSYCHO_ANALYSIS_PROVIDER_TIMEOUT_MS || 45000),
  });

  let markdown = "";
  let formatWarning = false;

  if (ai.ok) {
    markdown = String(ai.text || "").trim();
    formatWarning = !/^##\s+/m.test(markdown);
    if (formatWarning) {
      markdown = `## 꿈의 문을 여는 카드\n${markdown}`;
    }
  } else {
    markdown = fallbackTarotConsultMarkdown({ dreamText: normalized.text, cards: cards.cards });
    formatWarning = true;
  }

  const summary = firstMeaningfulLine(sectionText(markdown, "꿈의 문을 여는 카드"));
  const goldenAdvice = firstMeaningfulLine(sectionText(markdown, "마음 아래 흐르는 감정"));
  const actionPlan = extractActionPlan(markdown);

  return json({
    ok: true,
    cached: false,
    formatWarning,
    record: {
      id: `dream-tarot-consult-${Date.now()}`,
      consultingText: markdown,
      summary,
      goldenAdvice,
      actionPlan,
      source: ai.ok ? "gemini" : "fallback",
      model: ai.ok ? ai.model : "fallback/local",
      createdAt: new Date().toISOString(),
    },
    message: ai.ok ? "ok" : ai.message,
  });
}

async function callGemini(env, prompt) {
  return dreamGeminiCaller(env, prompt, {
    keyEnvKeys: ["PSYCHO_ANALYSIS_GEMINI_API_KEY", "DREAM_TAROT_GEMINI_API_KEY"],
    modelEnvKeys: ["PSYCHO_ANALYSIS_GEMINI_MODEL"],
    temperature: 0.88,
    topP: 0.95,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.PSYCHO_ANALYSIS_PROVIDER_TIMEOUT_MS || 45000),
  });
}

async function handlePsychoAnalysis(request, env) {
  const body = await readJson(request);
  const normalized = normalizeDreamText(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const intake = normalizePsychoIntake(body?.intake || body);
  const tone = inferDreamEmotionTone(normalized.text, intake);
  const symbols = inferDreamSymbols(normalized.text, intake);
  const prompt = psychoPrompt(normalized.text, intake, tone, symbols);
  const ai = await callGemini(env, prompt);

  let markdown = "";
  let formatWarning = false;
  let quality = null;

  if (ai.ok) {
    markdown = removePsychoTechTokens(String(ai.text || "").trim());
    quality = validatePsychoQuality(markdown, normalized.text, tone);
    formatWarning = !quality.ok;
    if (!quality.ok) {
      markdown = fallbackMarkdown(normalized.text, intake, tone, symbols);
      quality = validatePsychoQuality(markdown, normalized.text, tone);
    }
  } else {
    markdown = fallbackMarkdown(normalized.text, intake, tone, symbols);
    quality = validatePsychoQuality(markdown, normalized.text, tone);
    formatWarning = true;
  }

  return json({
    ok: true,
    cached: false,
    formatWarning,
    quality: quality || undefined,
    tone,
    llm: {
      used: Boolean(ai.ok),
      source: ai.ok ? "gemini" : "fallback",
      model: ai.ok ? String(ai.model || "gemini") : "fallback/local",
      error: ai.ok ? "" : String(ai.message || ""),
    },
    record: {
      id: `psycho-${Date.now()}`,
      markdown,
      source: ai.ok ? "gemini" : "fallback",
      model: ai.ok ? ai.model : "fallback/local",
      createdAt: new Date().toISOString(),
    },
    message: ai.ok ? "ok" : "해몽 결과를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  });
}

export function __setDreamGeminiCallerForTest(fn) {
  if (typeof fn === "function") {
    dreamGeminiCaller = fn;
  }
}

export function __resetDreamGeminiCallerForTest() {
  dreamGeminiCaller = callGeminiText;
}

export async function handleDreamRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const path = getRoutePath(request, "/api/dream");
    if (path === "/psycho-analysis") {
      return await handlePsychoAnalysis(request, env);
    }
    if (path === "/tarot-consult") {
      return await handleTarotConsult(request, env);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
