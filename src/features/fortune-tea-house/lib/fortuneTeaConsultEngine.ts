import { callLLM } from "../../../../lib/llm-client";
import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSnapshot } from "../data/consult";
import type { FortuneTeaHouseConsultRequest } from "../data/consult";
import { buildFortuneTeaHouseConsultResult } from "./buildConsultResult";
import { ensureConsultResultConsistency } from "./validateConsultResult";

const GEMINI_KEY_NAMES = ["GEMINIF_API_KEY", "GEMINIF_API_KEY1", "GEMINIF_API_KEY2", "GEMINIF_API_KEY3", "GEMINIF_API_KEY4", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];
const MECHANICAL_COPY_PATTERN = /이 기능은|이 결과는|분석 결과는|콘텐츠 블록|서비스 결과|API|JSON|payload|schema/i;

export type FortuneTeaHouseGenerationMeta = {
  mode: "gemini" | "local_fallback";
  provider?: string;
  model?: string;
  reason?: string;
  generatedAt: string;
};

export type FortuneTeaHouseConsultGeneration = {
  result: FortuneTeaHouseConsultResponse;
  generationMeta: FortuneTeaHouseGenerationMeta;
};

function hasLlmKey(env?: Record<string, unknown>) {
  if (GEMINI_KEY_NAMES.some((key) => String(env?.[key] || "").trim())) return true;
  return GEMINI_KEY_NAMES.some((key) => String(process.env?.[key] || "").trim());
}

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("fortune tea house llm json parse failed");
  }
}

function tarotSnapshotFromResult(result: FortuneTeaHouseConsultResponse): FortuneTeaTarotSnapshot {
  return {
    cardId: result.tarot.cardId,
    number: result.tarot.number,
    nameKo: result.tarot.nameKo,
    nameEn: result.tarot.nameEn,
    orientation: result.tarot.orientation,
    keywords: result.tarot.keywords,
    meaning: result.tarot.meaning,
    source: "existing-ai-tarot",
  };
}

function mergeLlmResult(fallback: FortuneTeaHouseConsultResponse, parsed: Partial<FortuneTeaHouseConsultResponse>): FortuneTeaHouseConsultResponse {
  return {
    ...fallback,
    ...parsed,
    consultationMode: fallback.consultationMode,
    teaCup: fallback.teaCup,
    saju: {
      ...fallback.saju,
      ...(parsed.saju || {}),
      keyPoints: parsed.saju?.keyPoints?.length ? parsed.saju.keyPoints : fallback.saju.keyPoints,
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
      ...(parsed.tarot || {}),
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
          ...(parsed.sukuyoCompatibility || {}),
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
          strengths: parsed.sukuyoCompatibility?.strengths?.length ? parsed.sukuyoCompatibility.strengths : fallback.sukuyoCompatibility.strengths,
          cautions: parsed.sukuyoCompatibility?.cautions?.length ? parsed.sukuyoCompatibility.cautions : fallback.sukuyoCompatibility.cautions,
          adviceKeywords: parsed.sukuyoCompatibility?.adviceKeywords?.length ? parsed.sukuyoCompatibility.adviceKeywords : fallback.sukuyoCompatibility.adviceKeywords,
        }
      : parsed.sukuyoCompatibility,
    emotionAnalysis: parsed.emotionAnalysis?.length ? parsed.emotionAnalysis : fallback.emotionAnalysis,
    yeoniReading: {
      ...fallback.yeoniReading,
      ...(parsed.yeoniReading || {}),
    },
    synthesis: {
      ...fallback.synthesis,
      ...(parsed.synthesis || {}),
    },
    choiceSimulation: parsed.choiceSimulation?.length ? parsed.choiceSimulation.slice(0, 3) : fallback.choiceSimulation,
    luckyKeywords: parsed.luckyKeywords?.length ? parsed.luckyKeywords : fallback.luckyKeywords,
  };
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function assertText(value: unknown, label: string) {
  if (!textValue(value)) throw new Error(`fortune tea house quality failed: ${label}`);
}

function assertNoMechanicalCopy(result: FortuneTeaHouseConsultResponse) {
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

function assertConsultQuality(result: FortuneTeaHouseConsultResponse, fallback: FortuneTeaHouseConsultResponse) {
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
    if (!Number.isFinite(Number(item.value)) || Number(item.value) < 0 || Number(item.value) > 100) {
      throw new Error("fortune tea house quality failed: emotion value");
    }
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
    "연이는 꽃돼지?의 인간형이며, 사용자의 고민을 찻잔과 손님이 고른 상담 방식의 상징으로 읽어주는 따뜻한 상담사다.",
    "상담자는 변신 후의 인간 상담사 연이다. 꽃돼지?는 변신 전 안내자이자 연이의 본모습일 뿐, 결과 상담을 진행하지 않는다.",
    "사용자는 타로, 사주, 숙요점 궁합 중 하나만 선택한다. consultationMode가 tarot이면 타로만, saju이면 사주만, sukuyo이면 숙요점 궁합만 상담의 근거로 삼는다.",
    "사주 상담에서 사주 데이터가 부족하면 지어내지 말고 확인된 출생정보와 질문 안에서만 말한다.",
    "타로 상담에서는 사주를 근거처럼 말하지 않는다. 사주 상담에서는 타로 카드나 카드 상징을 상담 근거처럼 말하지 않는다.",
    "전달받은 타로 cardId, cardName, orientation, keywords, meaning만 사용한다. 다른 카드 의미를 섞지 않고 cardId와 orientation을 절대 바꾸지 않는다.",
    "전달받은 십성만 사용한다. primaryTenGod이 없으면 십성 손님을 새로 만들지 않는다.",
    "숙요점 궁합에서는 전달받은 27숙, 관계 유형, 거리, 방향, 오행 조화, 영역 점수, 키워드만 사용한다. 없는 숙요 계산값과 상대의 속마음은 만들지 않는다.",
    "100% 단정, 공포 조장, 의료/법률/금융 판단 단정, 상대방 악인 단정, 현실 판단 포기 유도는 금지한다.",
    "같은 주어 반복을 피하고, 전문적이지만 다정한 한국어 상담 문장으로 쓴다.",
    "반드시 JSON만 반환한다. 마크다운과 JSON 바깥 설명은 금지한다.",
  ].join("\n");
}

function buildUserPrompt(request: FortuneTeaHouseConsultRequest, fallback: FortuneTeaHouseConsultResponse) {
  const consultationMode = request.consultationMode === "saju" ? "saju" : request.consultationMode === "sukuyo" ? "sukuyo" : "tarot";
  const focusRule =
    consultationMode === "saju"
      ? "사주 상담만 작성한다. 기존 사주 초안, 오행, 십성, 출생정보 안에서 확인되는 흐름만 말하고 타로 카드는 상담 근거로 쓰지 않는다."
      : consultationMode === "sukuyo"
        ? "숙요점 궁합 상담만 작성한다. 전달받은 기본 숙요점 계산 데이터인 27숙, 방향별 관계, 거리, 오행 조화, 영역 점수, 관계 맥락만 말하고 타로 카드와 사주 오행·십성은 상담 근거로 쓰지 않는다."
      : "타로 상담만 작성한다. 보존된 카드의 cardId, 방향, 키워드, 의미를 바꾸지 말고 현재 질문에 대한 카드 해석만 깊게 쓴다.";
  return JSON.stringify(
    {
      task: "운명의 찻집 상담 결과를 더 자연스럽고 깊게 다듬는다.",
      consultationMode,
      focusRule,
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
        emotionAnalysis: "4 items with label/value/description/tone",
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

export async function generateFortuneTeaHouseConsultGeneration(request: FortuneTeaHouseConsultRequest, env?: Record<string, unknown>): Promise<FortuneTeaHouseConsultGeneration> {
  const fallback = buildFortuneTeaHouseConsultResult(request);
  if (!hasLlmKey(env)) {
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
    const response = await callLLM({
      systemPrompt: buildSystemPrompt(),
      prompt: buildUserPrompt(request, fallback),
      taskType: "fortune",
      temperature: 0.62,
      maxTokens: 7600,
      timeoutMs: 75_000,
      fallbackToWorkersAI: false,
      responseMimeType: "application/json",
    }, env);
    const parsed = extractJson(response.text) as Partial<FortuneTeaHouseConsultResponse>;
    const result = ensureConsultResultConsistency(mergeLlmResult(fallback, parsed), tarotSnapshotFromResult(fallback));
    assertConsultQuality(result, fallback);
    return {
      result,
      generationMeta: {
        mode: "gemini",
        provider: response.provider,
        model: response.model,
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

export async function generateFortuneTeaHouseConsultResult(request: FortuneTeaHouseConsultRequest): Promise<FortuneTeaHouseConsultResponse> {
  const generated = await generateFortuneTeaHouseConsultGeneration(request);
  return generated.result;
}
