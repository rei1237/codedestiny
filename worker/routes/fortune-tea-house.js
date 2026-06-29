import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { createHash } from "node:crypto";
import { getCurrentUser } from "../lib/auth.js";
import { connectDb, mongoose } from "../lib/db.js";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const requestBuckets = new Map();
const GEMINI_KEY_NAMES = ["GEMINIF_API_KEY", "GEMINIF_API_KEY1", "GEMINIF_API_KEY2", "GEMINIF_API_KEY3", "GEMINIF_API_KEY4", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];
const MECHANICAL_COPY_PATTERN = /이 기능은|이 결과는|분석 결과는|콘텐츠 블록|서비스 결과|API|JSON|payload|schema/i;

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultiline(value, maxLength) {
  return String(value || "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function readClientKey(request) {
  return cleanText(
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local",
    160,
  );
}

function checkRateLimit(request) {
  const key = readClientKey(request);
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function normalizeConsultationMode(value) {
  return value === "saju" ? "saju" : value === "sukuyo" ? "sukuyo" : "tarot";
}

function normalizeSukuyoPerson(value, fallbackName) {
  const source = value && typeof value === "object" ? value : {};
  return {
    name: cleanText(source.name || fallbackName, 40),
    birthDate: cleanText(source.birthDate, 20),
    calendarType: source.calendarType === "lunar" ? "lunar" : "solar",
    gender: cleanText(source.gender, 20),
  };
}

function normalizeSukuyoInput(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    user: normalizeSukuyoPerson(source.user, "나"),
    partner: normalizeSukuyoPerson(source.partner, "상대"),
    relationshipType: cleanText(source.relationshipType, 80),
    focus: cleanText(source.focus, 80),
    currentSituation: cleanMultiline(source.currentSituation, 800),
  };
}

function normalizeRequest(body) {
  const selectedTeaCupId = cleanText(body?.selectedTeaCupId, 80);
  const selectedTeaCupName = cleanText(body?.selectedTeaCupName, 80);
  const selectedTeaCupTopic = cleanText(body?.selectedTeaCupTopic, 80);
  const question = cleanMultiline(body?.question, 1200);
  const calendarType = body?.calendarType === "lunar" ? "lunar" : "solar";
  const consultationMode = normalizeConsultationMode(body?.consultationMode);

  if (!selectedTeaCupId || !selectedTeaCupName || !selectedTeaCupTopic) {
    const error = new Error("찻잔을 다시 골라 주세요.");
    error.status = 400;
    throw error;
  }
  if (question.length < 4) {
    const error = new Error("연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.");
    error.status = 400;
    throw error;
  }

  return {
    consultationMode,
    attemptId: cleanText(body?.attemptId, 180),
    resultId: cleanText(body?.resultId, 180),
    jobId: cleanText(body?.jobId, 180),
    selectedTeaCupId,
    selectedTeaCupName,
    selectedTeaCupTopic,
    question,
    nickname: cleanText(body?.nickname, 40),
    concernTopic: cleanText(body?.concernTopic, 80),
    birthInfo: cleanText(body?.birthInfo, 160),
    birthDate: cleanText(body?.birthDate, 20),
    birthTime: cleanText(body?.birthTime, 12),
    gender: cleanText(body?.gender, 20),
    calendarType,
    sukuyo: consultationMode === "sukuyo" ? normalizeSukuyoInput(body?.sukuyo) : undefined,
  };
}

function hasGeminiKey(env = {}) {
  return GEMINI_KEY_NAMES.some((key) => cleanText(env?.[key], 4000));
}

function extractJson(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("fortune tea house llm json parse failed");
  }
}

function textValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertText(value, label) {
  if (!textValue(value)) throw new Error(`fortune tea house quality failed: ${label}`);
}

function buildMinimalDraft(request) {
  const consultationMode = normalizeConsultationMode(request.consultationMode);
  const modeLabel = consultationMode === "saju" ? "사주" : consultationMode === "sukuyo" ? "숙요점 궁합" : "타로";
  const synthesisTitle = consultationMode === "saju" ? "연이가 읽은 사주의 결" : consultationMode === "sukuyo" ? "연이가 읽은 27숙 인연의 흐름" : "연이가 읽은 타로의 장면";
  const synthesisSummary =
    consultationMode === "saju"
      ? "오늘은 드러난 출생정보 안에서 확인되는 사주의 흐름만 차분히 살핍니다."
      : consultationMode === "sukuyo"
        ? "오늘은 두 사람의 27숙 인연의 흐름만 따라 관계의 온도를 살핍니다."
      : "오늘은 현재 질문과 카드의 상징만 따라가며 마음의 방향을 살핍니다.";
  const synthesisBridge =
    consultationMode === "saju"
      ? "비어 있는 시간이나 기운은 지어내지 않고, 확인된 사주의 결 안에서 오늘 붙잡을 기준을 읽어 봅니다."
      : consultationMode === "sukuyo"
        ? "비어 있는 숙요 계산값이나 상대의 속마음은 지어내지 않고, 확인된 두 사람의 정보와 질문만 따라 읽어 봅니다."
      : "사주를 근거로 삼지 않고, 찻잔 위에 떠오른 카드의 장면과 지금 질문만 따라 다음 한 걸음을 읽어 봅니다.";
  const sajuFallbackSummary =
    consultationMode === "saju"
      ? "드러난 출생정보가 충분한 자리까지만 살피고, 비어 있는 흐름은 지어내지 않습니다."
      : "오늘은 사주를 열지 않고, 찻잔과 타로 그리고 지금 적어 주신 질문의 기운을 중심으로 읽습니다.";
  const sajuFallbackPoint =
    consultationMode === "saju"
      ? "확인된 출생정보와 질문의 결 안에서 마음의 방향을 살핍니다."
      : "현재 질문과 찻잔의 결을 중심으로 마음의 방향을 살핍니다.";
  const teaCup = {
    id: request.selectedTeaCupId,
    name: request.selectedTeaCupName,
    topic: request.selectedTeaCupTopic,
    reading: `${request.selectedTeaCupName}은 ${request.selectedTeaCupTopic}의 결을 따라 지금 마음에 오래 머문 향을 비춥니다.`,
  };
  const sukuyo = request.sukuyo || {};
  const sukuyoCompatibility = consultationMode === "sukuyo"
    ? {
        available: false,
        title: "달빛 궁합의 방이 아직 조용히 닫혀 있어요",
        summary: "두 사람의 생년월일과 달력 기준이 모두 놓이면 연이가 27숙 인연의 흐름을 다시 펼쳐볼게요.",
        relationshipType: cleanText(sukuyo.relationshipType, 80),
        focus: cleanText(sukuyo.focus, 80),
        currentSituation: cleanText(sukuyo.currentSituation, 300),
        user: {
          name: cleanText(sukuyo.user?.name || "나", 40),
          birthDate: cleanText(sukuyo.user?.birthDate, 20),
          calendarType: sukuyo.user?.calendarType === "lunar" ? "lunar" : "solar",
          gender: cleanText(sukuyo.user?.gender, 20),
        },
        partner: {
          name: cleanText(sukuyo.partner?.name || "상대", 40),
          birthDate: cleanText(sukuyo.partner?.birthDate, 20),
          calendarType: sukuyo.partner?.calendarType === "lunar" ? "lunar" : "solar",
          gender: cleanText(sukuyo.partner?.gender, 20),
        },
        strengths: ["확인된 두 사람의 정보 위에서만 인연의 흐름을 살핍니다."],
        cautions: ["비어 있는 정보로 관계의 결말을 단정하지 않습니다."],
        adviceKeywords: ["생년월일 확인", "달력 기준", "관계의 온도"],
      }
    : undefined;

  return {
    consultationMode,
    sessionTitle: `${request.selectedTeaCupName}에 비친 오늘의 ${modeLabel} 상담`,
    questionSummary: request.question,
    teaCup,
    saju: {
      available: false,
      title: "사주가 열리지 않은 오늘의 흐름",
      summary: sajuFallbackSummary,
      keyPoints: [sajuFallbackPoint],
      tenGodSnapshot: { available: false, tenGodLabels: [], reason: "사주 초안이 전달되지 않았습니다.", source: "unavailable" },
    },
    tarot: {
      cardId: "major_18_moon",
      number: 18,
      nameEn: "The Moon",
      nameKo: "달",
      orientation: "upright",
      keywords: ["직감", "불안", "숨은 마음"],
      meaning: "아직 선명하지 않은 마음의 결을 조심스럽게 드러내는 카드입니다.",
      reading: "지금의 질문은 확신보다 감정의 결을 먼저 읽어야 하는 흐름을 비춥니다.",
    },
    sukuyoCompatibility,
    emotionAnalysis: [
      { label: "기대", value: 66, description: "아직 마음 한쪽에는 다시 부드럽게 열리고 싶은 빛이 남아 있습니다.", tone: "gold" },
      { label: "불안", value: 72, description: "작은 반응에도 마음이 크게 흔들릴 수 있는 흐름입니다.", tone: "purple" },
      { label: "미련", value: 61, description: "지나간 말과 장면이 아직 찻잔 바닥에 오래 남아 있습니다.", tone: "pink" },
      { label: "망설임", value: 58, description: "움직이고 싶은 마음과 스스로를 지키려는 마음이 함께 머뭅니다.", tone: "blue" },
    ],
    yeoniReading: {
      intro: "연이는 먼저 당신의 질문에 머문 온도를 차분히 읽어 봅니다.",
      main: "지금은 결론보다 마음의 방향을 먼저 확인해야 하는 때로 드러납니다.",
      advice: "오늘은 가장 작은 말 한 줄부터 부드럽게 정리해 보세요.",
      caution: "상대의 마음을 단정하기보다 확인할 수 있는 사실과 내 감정을 나누어 보아야 합니다.",
    },
    synthesis: {
      title: synthesisTitle,
      summary: synthesisSummary,
      sajuTarotBridge: synthesisBridge,
    },
    choiceSimulation: [
      { id: "speak", title: "작게 말을 건네는 길", subtitle: "부담 없는 한 문장", result: "감정의 온도를 확인할 수 있습니다.", caution: "한 번에 모든 결론을 묻지 마세요." },
      { id: "wait", title: "하루 더 바라보는 길", subtitle: "반응을 재촉하지 않기", result: "마음의 과속을 줄여 줍니다.", caution: "기다림이 회피가 되지 않도록 기한을 정해 두세요." },
      { id: "reset", title: "나를 먼저 돌보는 길", subtitle: "내 기준 회복", result: "선택의 중심이 조금 더 선명해집니다.", caution: "차가운 단절처럼 보이지 않게 최소한의 예의를 남기세요." },
    ],
    actionPrescription: "오늘은 마음에 숨은 말을 한 문장으로 적고, 그중 실제로 확인할 수 있는 것 하나만 골라 보세요.",
    luckyKeywords: consultationMode === "saju"
      ? [request.selectedTeaCupName, "기준", "흐름"]
      : consultationMode === "sukuyo"
        ? [request.selectedTeaCupName, "인연", "속도 확인"]
        : [request.selectedTeaCupName, "직감", "작은 대화"],
    closingLine: consultationMode === "sukuyo"
      ? "오늘 필요한 것은 관계의 결말을 서두르는 일보다 서로의 속도를 덜 다치게 확인하는 한 걸음입니다."
      : "오늘 필요한 것은 큰 결론보다 마음이 덜 다치게 하는 다음 한 걸음입니다.",
  };
}

function normalizeDraftResult(candidate, request) {
  const draft = candidate && typeof candidate === "object" ? candidate : buildMinimalDraft(request);
  const fallback = buildMinimalDraft(request);
  return {
    ...fallback,
    ...draft,
    consultationMode: request.consultationMode,
    teaCup: draft.teaCup && typeof draft.teaCup === "object" ? { ...fallback.teaCup, ...draft.teaCup } : fallback.teaCup,
    saju: draft.saju && typeof draft.saju === "object" ? { ...fallback.saju, ...draft.saju } : fallback.saju,
    tarot: draft.tarot && typeof draft.tarot === "object" ? { ...fallback.tarot, ...draft.tarot } : fallback.tarot,
    sukuyoCompatibility: draft.sukuyoCompatibility && typeof draft.sukuyoCompatibility === "object" ? { ...(fallback.sukuyoCompatibility || {}), ...draft.sukuyoCompatibility } : fallback.sukuyoCompatibility,
    emotionAnalysis: Array.isArray(draft.emotionAnalysis) && draft.emotionAnalysis.length ? draft.emotionAnalysis : fallback.emotionAnalysis,
    yeoniReading: draft.yeoniReading && typeof draft.yeoniReading === "object" ? { ...fallback.yeoniReading, ...draft.yeoniReading } : fallback.yeoniReading,
    synthesis: draft.synthesis && typeof draft.synthesis === "object" ? { ...fallback.synthesis, ...draft.synthesis } : fallback.synthesis,
    choiceSimulation: Array.isArray(draft.choiceSimulation) && draft.choiceSimulation.length ? draft.choiceSimulation.slice(0, 3) : fallback.choiceSimulation,
    luckyKeywords: Array.isArray(draft.luckyKeywords) && draft.luckyKeywords.length ? draft.luckyKeywords : fallback.luckyKeywords,
  };
}

function mergeLlmResult(fallback, parsed) {
  const safeParsed = parsed && typeof parsed === "object" ? parsed : {};
  return {
    ...fallback,
    ...safeParsed,
    consultationMode: fallback.consultationMode,
    teaCup: fallback.teaCup,
    saju: {
      ...fallback.saju,
      ...(safeParsed.saju || {}),
      keyPoints: safeParsed.saju?.keyPoints?.length ? safeParsed.saju.keyPoints : fallback.saju.keyPoints,
      birthSummary: fallback.saju.birthSummary,
      dayMaster: fallback.saju.dayMaster,
      dominantElements: fallback.saju.dominantElements,
      pillars: fallback.saju.pillars,
      fiveElements: fallback.saju.fiveElements,
      primaryTenGod: fallback.saju.primaryTenGod,
      secondaryTenGods: fallback.saju.secondaryTenGods,
      cautionReading: fallback.saju.cautionReading,
      actionPrescription: fallback.saju.actionPrescription,
      tarotBridgeReady: fallback.saju.tarotBridgeReady,
      tenGodSnapshot: fallback.saju.tenGodSnapshot,
    },
    tarot: {
      ...fallback.tarot,
      ...(safeParsed.tarot || {}),
      cardId: fallback.tarot.cardId,
      number: fallback.tarot.number,
      nameKo: fallback.tarot.nameKo,
      nameEn: fallback.tarot.nameEn,
      orientation: fallback.tarot.orientation,
      keywords: fallback.tarot.keywords,
      meaning: fallback.tarot.meaning,
    },
    sukuyoCompatibility: fallback.sukuyoCompatibility
      ? {
          ...fallback.sukuyoCompatibility,
          ...(safeParsed.sukuyoCompatibility || {}),
          user: fallback.sukuyoCompatibility.user,
          partner: fallback.sukuyoCompatibility.partner,
          calculationSource: fallback.sukuyoCompatibility.calculationSource,
          calculationBasis: fallback.sukuyoCompatibility.calculationBasis,
          relationDetail: fallback.sukuyoCompatibility.relationDetail,
          relationType: fallback.sukuyoCompatibility.relationType,
          relationTypeHan: fallback.sukuyoCompatibility.relationTypeHan,
          distanceLabel: fallback.sukuyoCompatibility.distanceLabel,
          distanceTier: fallback.sukuyoCompatibility.distanceTier,
          forwardDistance: fallback.sukuyoCompatibility.forwardDistance,
          reverseDistance: fallback.sukuyoCompatibility.reverseDistance,
          shortestDistance: fallback.sukuyoCompatibility.shortestDistance,
          compatibilityIndex: fallback.sukuyoCompatibility.compatibilityIndex,
          scores: fallback.sukuyoCompatibility.scores,
          elementHarmony: fallback.sukuyoCompatibility.elementHarmony,
          direction: fallback.sukuyoCompatibility.direction,
          strengths: safeParsed.sukuyoCompatibility?.strengths?.length ? safeParsed.sukuyoCompatibility.strengths : fallback.sukuyoCompatibility.strengths,
          cautions: safeParsed.sukuyoCompatibility?.cautions?.length ? safeParsed.sukuyoCompatibility.cautions : fallback.sukuyoCompatibility.cautions,
          adviceKeywords: safeParsed.sukuyoCompatibility?.adviceKeywords?.length ? safeParsed.sukuyoCompatibility.adviceKeywords : fallback.sukuyoCompatibility.adviceKeywords,
        }
      : safeParsed.sukuyoCompatibility,
    emotionAnalysis: safeParsed.emotionAnalysis?.length ? safeParsed.emotionAnalysis : fallback.emotionAnalysis,
    yeoniReading: {
      ...fallback.yeoniReading,
      ...(safeParsed.yeoniReading || {}),
    },
    synthesis: {
      ...fallback.synthesis,
      ...(safeParsed.synthesis || {}),
    },
    choiceSimulation: safeParsed.choiceSimulation?.length ? safeParsed.choiceSimulation.slice(0, 3) : fallback.choiceSimulation,
    luckyKeywords: safeParsed.luckyKeywords?.length ? safeParsed.luckyKeywords : fallback.luckyKeywords,
  };
}

function assertNoMechanicalCopy(result) {
  const joined = [
    result.sessionTitle,
    result.questionSummary,
    result.saju?.title,
    result.saju?.summary,
    result.saju?.caution,
    result.tarot?.reading,
    result.sukuyoCompatibility?.title,
    result.sukuyoCompatibility?.summary,
    result.synthesis?.title,
    result.synthesis?.summary,
    result.synthesis?.sajuTarotBridge,
    result.yeoniReading?.intro,
    result.yeoniReading?.main,
    result.yeoniReading?.advice,
    result.yeoniReading?.caution,
    result.actionPrescription,
    result.closingLine,
    ...(result.saju?.keyPoints || []),
    ...(result.sukuyoCompatibility?.strengths || []),
    ...(result.sukuyoCompatibility?.cautions || []),
    ...(result.sukuyoCompatibility?.adviceKeywords || []),
    ...(result.luckyKeywords || []),
    ...(result.emotionAnalysis || []).flatMap((item) => [item.label, item.description]),
    ...(result.choiceSimulation || []).flatMap((item) => [item.title, item.subtitle, item.result, item.caution]),
  ].join("\n");
  if (MECHANICAL_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: mechanical copy");
  }
}

function assertConsultQuality(result, fallback) {
  assertText(result.sessionTitle, "sessionTitle");
  assertText(result.questionSummary, "questionSummary");
  assertText(result.saju?.title, "saju.title");
  assertText(result.saju?.summary, "saju.summary");
  assertText(result.tarot?.reading, "tarot.reading");
  assertText(result.synthesis?.title, "synthesis.title");
  assertText(result.synthesis?.summary, "synthesis.summary");
  assertText(result.synthesis?.sajuTarotBridge, "synthesis.sajuTarotBridge");
  assertText(result.yeoniReading?.intro, "yeoniReading.intro");
  assertText(result.yeoniReading?.main, "yeoniReading.main");
  assertText(result.yeoniReading?.advice, "yeoniReading.advice");
  assertText(result.yeoniReading?.caution, "yeoniReading.caution");
  assertText(result.actionPrescription, "actionPrescription");
  assertText(result.closingLine, "closingLine");

  if (result.tarot.cardId !== fallback.tarot.cardId || result.tarot.orientation !== fallback.tarot.orientation) {
    throw new Error("fortune tea house quality failed: tarot identity changed");
  }
  if (result.tarot.nameKo !== fallback.tarot.nameKo || result.tarot.nameEn !== fallback.tarot.nameEn) {
    throw new Error("fortune tea house quality failed: tarot name changed");
  }
  if (fallback.consultationMode === "sukuyo") {
    assertText(result.sukuyoCompatibility?.title, "sukuyoCompatibility.title");
    assertText(result.sukuyoCompatibility?.summary, "sukuyoCompatibility.summary");
    assertText(result.sukuyoCompatibility?.user?.name, "sukuyoCompatibility.user.name");
    assertText(result.sukuyoCompatibility?.partner?.name, "sukuyoCompatibility.partner.name");
    if (fallback.sukuyoCompatibility?.available) {
      if (result.sukuyoCompatibility?.relationType !== fallback.sukuyoCompatibility.relationType) {
        throw new Error("fortune tea house quality failed: sukuyo relation changed");
      }
      if (result.sukuyoCompatibility?.user?.sukuyoName !== fallback.sukuyoCompatibility.user.sukuyoName) {
        throw new Error("fortune tea house quality failed: user sukuyo changed");
      }
      if (result.sukuyoCompatibility?.partner?.sukuyoName !== fallback.sukuyoCompatibility.partner.sukuyoName) {
        throw new Error("fortune tea house quality failed: partner sukuyo changed");
      }
      if (result.sukuyoCompatibility?.scores?.total !== fallback.sukuyoCompatibility.scores?.total) {
        throw new Error("fortune tea house quality failed: sukuyo score changed");
      }
      if (result.sukuyoCompatibility?.relationDetail?.typeAToB !== fallback.sukuyoCompatibility.relationDetail?.typeAToB) {
        throw new Error("fortune tea house quality failed: sukuyo directional relation changed");
      }
    }
  }
  if (!Array.isArray(result.emotionAnalysis) || result.emotionAnalysis.length < 4) {
    throw new Error("fortune tea house quality failed: emotionAnalysis");
  }
  result.emotionAnalysis.forEach((item, index) => {
    assertText(item.label, `emotionAnalysis.${index}.label`);
    assertText(item.description, `emotionAnalysis.${index}.description`);
    const value = Number(item.value);
    if (!Number.isFinite(value)) throw new Error("fortune tea house quality failed: emotion value");
    item.value = Math.max(0, Math.min(100, Math.round(value)));
  });
  if (!Array.isArray(result.choiceSimulation) || result.choiceSimulation.length < 3) {
    throw new Error("fortune tea house quality failed: choiceSimulation");
  }
  result.choiceSimulation.slice(0, 3).forEach((choice, index) => {
    assertText(choice.title, `choiceSimulation.${index}.title`);
    assertText(choice.subtitle, `choiceSimulation.${index}.subtitle`);
    assertText(choice.result, `choiceSimulation.${index}.result`);
    assertText(choice.caution, `choiceSimulation.${index}.caution`);
  });
  if (!Array.isArray(result.luckyKeywords) || result.luckyKeywords.length < 2) {
    throw new Error("fortune tea house quality failed: luckyKeywords");
  }
  assertNoMechanicalCopy(result);
}

function buildSystemPrompt() {
  return [
    "너는 운명의 찻집 주인 연이다.",
    "연이는 꿈결처럼 따뜻하지만, 사용자의 고민을 찻잔과 손님이 고른 상담 방식의 상징으로 읽어 주는 숙련된 상담사다.",
    "사용자는 타로, 사주, 숙요점 궁합 중 하나만 선택한다. consultationMode가 tarot이면 타로만, saju이면 사주만, sukuyo이면 숙요점 궁합만 상담의 근거로 삼는다.",
    "상담문은 베타 안내나 결과 설명이 아니라, 연이가 바로 앞에서 조용히 말해 주는 상담처럼 쓴다.",
    "사주는 전달받은 기존 엔진 초안과 오행, 십성 흐름만 사용하고 없는 정보는 만들지 않는다.",
    "사주 상담에서 사주 정보가 부족하면 지어내지 말고 확인된 출생정보와 질문 안에서만 말한다.",
    "타로 상담에서는 사주를 근거처럼 말하지 않는다. 사주 상담에서는 타로 카드나 카드 상징을 상담 근거처럼 말하지 않는다.",
    "전달받은 타로 cardId, nameKo, nameEn, orientation, keywords, meaning은 절대 바꾸지 않는다.",
    "전달받은 십성만 사용한다. primaryTenGod이 없으면 십성 이름을 새로 만들지 않는다.",
    "숙요점 궁합에서는 전달받은 27숙, 관계 유형, 거리, 방향, 오행 조화, 영역 점수, 키워드만 사용한다. 없는 숙요 계산값과 상대의 속마음은 만들지 않는다.",
    "100% 확정, 공포 조장, 의료/법률/금융 판단, 상대방 속마음 단정, 현실 판단 흐리기 유도는 금지한다.",
    "같은 주어 반복을 줄이고 전문적이지만 다정한 한국어 상담 문장으로 쓴다.",
    "반드시 JSON만 반환한다. 마크다운과 JSON 밖 설명은 쓰지 않는다.",
  ].join("\n");
}

function buildUserPrompt(request, fallback) {
  const consultationMode = normalizeConsultationMode(request.consultationMode);
  const focusRule =
    consultationMode === "saju"
      ? "사주 상담만 작성한다. 기존 사주 초안, 오행, 십성, 출생정보 안에서 확인되는 흐름만 말하고 타로 카드는 상담 근거로 쓰지 않는다."
      : consultationMode === "sukuyo"
        ? "숙요점 궁합 상담만 작성한다. 전달받은 기본 숙요점 계산 데이터인 27숙, 방향별 관계, 거리, 오행 조화, 영역 점수, 관계 맥락만 말하고 타로 카드와 사주 오행·십성은 상담 근거로 쓰지 않는다."
      : "타로 상담만 작성한다. 보존된 카드의 cardId, 방향, 키워드, 의미를 바꾸지 말고 현재 질문에 대한 카드 해석만 깊게 쓴다.";
  const bridgeRule =
    consultationMode === "saju"
      ? "synthesis.sajuTarotBridge는 이름과 달라도 사주-only 요약으로 쓴다. 타로, 카드, card라는 단어를 상담 근거처럼 쓰지 않는다."
      : consultationMode === "sukuyo"
        ? "synthesis.sajuTarotBridge는 이름과 달라도 숙요점 궁합-only 요약으로 쓴다. 타로, 카드, 사주, 오행, 십성을 상담 근거처럼 쓰지 않는다."
      : "synthesis.sajuTarotBridge는 이름과 달라도 타로-only 요약으로 쓴다. 사주, 오행, 십성을 상담 근거처럼 쓰지 않는다.";
  return JSON.stringify(
    {
      task: "운명의 찻집 상담 결과를 연이의 목소리로 자연스럽고 깊게 다듬는다.",
      consultationMode,
      focusRule,
      bridgeRule,
      preserveExactly: {
        teaCup: fallback.teaCup,
        sajuAvailability: fallback.saju.available,
        tarot: {
          cardId: fallback.tarot.cardId,
          number: fallback.tarot.number,
          nameKo: fallback.tarot.nameKo,
          nameEn: fallback.tarot.nameEn,
          orientation: fallback.tarot.orientation,
          keywords: fallback.tarot.keywords,
          meaning: fallback.tarot.meaning,
        },
        sukuyoCompatibility: fallback.sukuyoCompatibility,
      },
      request,
      draftResult: fallback,
      outputSchema: {
        consultationMode: "preserve",
        sessionTitle: "string",
        questionSummary: "string",
        teaCup: "preserve",
        saju: "available/title/summary/keyPoints/caution/primaryTenGod preserve/secondaryTenGods preserve/tenGodSnapshot preserve",
        tarot: "preserve card fields, improve only reading",
        sukuyoCompatibility: "preserve user/partner/calculationBasis/relationDetail/relation/distance/scores/elementHarmony/index fields, improve only title/summary/strengths/cautions/adviceKeywords",
        emotionAnalysis: "4-5 items with label/value/description/tone",
        yeoniReading: "intro/main/advice/caution",
        synthesis: "title/summary/sajuTarotBridge",
        choiceSimulation: "3 choices",
        actionPrescription: "string",
        luckyKeywords: "string[]",
        closingLine: "string",
      },
    },
    null,
    2,
  );
}

async function generateConsultResult(request, fallback, env) {
  if (!hasGeminiKey(env)) {
    return {
      result: fallback,
      generationMeta: {
        mode: "local_fallback",
        reason: "missing_gemini_key",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const ai = await callGeminiText(env, buildUserPrompt(request, fallback), {
      systemPrompt: buildSystemPrompt(),
      taskType: "fortune",
      temperature: 0.62,
      maxOutputTokens: 4200,
      timeoutMs: 24000,
      fallbackToWorkersAI: false,
    });

    if (!ai.ok) throw new Error(ai.message || ai.error || "gemini_failed");
    const parsed = extractJson(ai.text);
    const result = mergeLlmResult(fallback, parsed);
    assertConsultQuality(result, fallback);

    return {
      result,
      generationMeta: {
        mode: "gemini",
        provider: ai.provider || "gemini",
        model: ai.model,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.warn("[fortune-tea-house/consult] LLM fallback used", error);
    return {
      result: fallback,
      generationMeta: {
        mode: "local_fallback",
        reason: error instanceof Error ? error.message : "llm_failed",
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

function buildHoneyResultId(body, consultRequest) {
  const explicit = cleanText(body?.resultId || body?.jobId || body?.attemptId || consultRequest.resultId || consultRequest.jobId || consultRequest.attemptId, 180);
  if (explicit) return `fortune-tea-house:${explicit}`;
  const digest = createHash("sha256")
    .update(JSON.stringify({
      consultationMode: consultRequest.consultationMode,
      selectedTeaCupId: consultRequest.selectedTeaCupId,
      selectedTeaCupTopic: consultRequest.selectedTeaCupTopic,
      question: consultRequest.question,
      birthDate: consultRequest.birthDate,
      birthTime: consultRequest.birthTime,
      sukuyo: consultRequest.sukuyo,
    }))
    .digest("hex")
    .slice(0, 24);
  return `fortune-tea-house:${digest}`;
}

function honeyStatePayload(doc, extra = {}) {
  const currentHoneyDrops = Math.max(0, Number(doc?.currentHoneyDrops || 0));
  const totalHoneyDrops = Math.max(0, Number(doc?.totalHoneyDrops || 0));
  const lastEarnedAt = doc?.lastEarnedAt instanceof Date
    ? doc.lastEarnedAt.toISOString()
    : (doc?.lastEarnedAt ? new Date(doc.lastEarnedAt).toISOString() : undefined);
  return {
    currentHoneyDrops,
    totalHoneyDrops,
    lastEarnedAt,
    unlocked: currentHoneyDrops >= 10,
    authenticated: true,
    ...extra,
  };
}

async function readHoneyDropsState(request, env) {
  const auth = await getCurrentUser(request, env);
  if (!auth?.userId) {
    return {
      currentHoneyDrops: 0,
      totalHoneyDrops: 0,
      unlocked: false,
      authenticated: false,
    };
  }

  try {
    await connectDb(env);
    const collection = mongoose.connection.db.collection("fortune_tea_honey_states");
    const doc = await collection.findOne({ userId: String(auth.userId) });
    return honeyStatePayload(doc, { authenticated: true });
  } catch (error) {
    console.warn("[fortune-tea-house/honey-drops] disabled", error);
    return {
      currentHoneyDrops: 0,
      totalHoneyDrops: 0,
      unlocked: false,
      authenticated: true,
      disabled: true,
      reason: "honey_storage_unavailable",
    };
  }
}

async function grantHoneyDropReward(request, env, resultId, consultationMode) {
  const auth = await getCurrentUser(request, env);
  if (!auth?.userId) return null;

  try {
    await connectDb(env);
    const userId = String(auth.userId);
    const now = new Date();
    const states = mongoose.connection.db.collection("fortune_tea_honey_states");
    const logs = mongoose.connection.db.collection("fortune_tea_honey_reward_logs");
    let earnedThisResult = false;

    try {
      await logs.insertOne({
        _id: `${userId}:${resultId}`,
        userId,
        resultId,
        consultationMode: cleanText(consultationMode, 20),
        rewardType: "honey_drop",
        amount: 1,
        createdAt: now,
      });
      earnedThisResult = true;
    } catch (error) {
      if (Number(error?.code) !== 11000) throw error;
    }

    if (earnedThisResult) {
      await states.updateOne(
        { userId },
        {
          $inc: { currentHoneyDrops: 1, totalHoneyDrops: 1 },
          $set: { lastEarnedAt: now, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    }

    const stateDoc = await states.findOne({ userId });
    return honeyStatePayload(stateDoc, {
      resultId,
      earnedThisResult,
      duplicateResult: !earnedThisResult,
    });
  } catch (error) {
    console.warn("[fortune-tea-house/honey-drops] reward disabled", error);
    return {
      currentHoneyDrops: 0,
      totalHoneyDrops: 0,
      resultId,
      earnedThisResult: false,
      duplicateResult: false,
      unlocked: false,
      authenticated: true,
      disabled: true,
      reason: "honey_reward_unavailable",
    };
  }
}

function buildLocalHoneyBonusAdvice(result) {
  const mode = normalizeConsultationMode(result?.consultationMode);
  const action =
    mode === "saju"
      ? "오늘은 내 속도를 지키는 약속 하나만 정해 보세요."
      : mode === "sukuyo"
        ? "오늘은 상대에게 확인하고 싶은 마음을 한 문장으로만 부드럽게 건네 보세요."
        : "오늘은 카드가 건넨 키워드 하나를 적고, 지금 할 수 있는 가장 작은 행동을 골라 보세요.";
  return {
    title: "연이의 따뜻한 조언",
    message: "꿀방울이 충분히 모였어요. 지금 마음을 급하게 결론내리기보다, 먼저 스스로에게 다정한 쪽을 골라 주세요. 흔들림이 있더라도 오늘의 작은 선택 하나가 내일의 온도를 조금 바꿔 줄 거예요.",
    action,
    source: "local_fallback",
  };
}

function parseHoneyAdvice(text, fallback) {
  try {
    const parsed = extractJson(text);
    const message = cleanMultiline(parsed?.message, 420);
    const action = cleanText(parsed?.action, 140);
    if (!message || !action) return fallback;
    return {
      title: cleanText(parsed?.title, 60) || "연이의 따뜻한 조언",
      message,
      action,
      source: "gemini",
    };
  } catch {
    return fallback;
  }
}

async function generateHoneyBonusAdvice(result, env) {
  const fallback = buildLocalHoneyBonusAdvice(result);
  if (!hasGeminiKey(env)) return fallback;

  try {
    const prompt = JSON.stringify({
      task: "운명의 찻집 결과 하단에 붙일 짧은 보너스 조언을 연이의 따뜻한 상담체로 작성한다.",
      rules: [
        "기존 결과를 대체하지 않는다.",
        "과장된 예언체를 쓰지 않는다.",
        "현실적인 위로, 감정 정리, 오늘 할 수 있는 작은 행동을 포함한다.",
        "JSON만 반환한다.",
      ],
      resultSummary: {
        consultationMode: result.consultationMode,
        questionSummary: result.questionSummary,
        teaCup: result.teaCup,
        tarot: result.consultationMode === "tarot" ? result.tarot : undefined,
        saju: result.consultationMode === "saju" ? result.saju : undefined,
        sukuyoCompatibility: result.consultationMode === "sukuyo" ? result.sukuyoCompatibility : undefined,
        yeoniReading: result.yeoniReading,
      },
      outputSchema: {
        title: "연이의 따뜻한 조언",
        message: "string",
        action: "string",
      },
    });
    const ai = await callGeminiText(env, prompt, {
      systemPrompt: "너는 운명의 찻집 상담사 연이다. 따뜻하지만 현실적인 한마디만 더한다.",
      taskType: "fortune",
      temperature: 0.58,
      maxOutputTokens: 900,
      timeoutMs: 12000,
      fallbackToWorkersAI: false,
    });
    if (!ai.ok) return fallback;
    return parseHoneyAdvice(ai.text, fallback);
  } catch (error) {
    console.warn("[fortune-tea-house/honey-drops] bonus advice fallback used", error);
    return fallback;
  }
}

async function handleConsult(request, env) {
  if (!checkRateLimit(request)) {
    return json(
      { ok: false, message: "찻잔이 잠시 뜨거워졌어요. 잠시 후 다시 건네주세요." },
      { status: 429 },
    );
  }

  const body = await readJson(request);
  const consultRequest = normalizeRequest(body);
  const fallback = normalizeDraftResult(body?.draftResult, consultRequest);
  const generated = await generateConsultResult(consultRequest, fallback, env);
  const resultId = buildHoneyResultId(body, consultRequest);
  const honeyDrops = await grantHoneyDropReward(request, env, resultId, consultRequest.consultationMode);
  const result = {
    ...generated.result,
    resultId,
  };

  if (honeyDrops?.unlocked) {
    result.honeyDropBonusAdvice = await generateHoneyBonusAdvice(result, env);
  }

  return json({
    ok: true,
    result,
    honeyDrops,
    generationMeta: generated.generationMeta,
  });
}

export async function handleFortuneTeaHouseRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/fortune-tea-house");
    if (method === "GET" && path === "/honey-drops") {
      return json({ ok: true, honeyDrops: await readHoneyDropsState(request, env) });
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    if (path !== "/consult") return notFound();

    return await handleConsult(request, env);
  } catch (error) {
    if (Number.isFinite(Number(error?.status))) {
      return json({ ok: false, message: String(error?.message || "상담 내용을 다시 확인해 주세요.") }, { status: Number(error.status) });
    }
    return handleRouteError(error, { request, env, trace: { route: "fortune-tea-house", method: request.method, requestPath: new URL(request.url).pathname } });
  }
}
