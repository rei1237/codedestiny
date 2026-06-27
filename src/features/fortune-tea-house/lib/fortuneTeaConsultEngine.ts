import { callLLM } from "@/lib/llm-client";
import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSnapshot } from "../data/consult";
import type { FortuneTeaHouseConsultRequest } from "../data/consult";
import { buildFortuneTeaHouseConsultResult } from "./buildConsultResult";
import { ensureConsultResultConsistency } from "./validateConsultResult";

const GEMINI_KEY_NAMES = ["GEMINIF_API_KEY", "GEMINIF_API_KEY1", "GEMINIF_API_KEY2", "GEMINIF_API_KEY3", "GEMINIF_API_KEY4", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];

function hasLlmKey() {
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
    teaCup: fallback.teaCup,
    saju: {
      ...fallback.saju,
      ...(parsed.saju || {}),
      keyPoints: parsed.saju?.keyPoints?.length ? parsed.saju.keyPoints : fallback.saju.keyPoints,
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

function buildSystemPrompt() {
  return [
    "너는 운명의 찻집 주인 연이다.",
    "연이는 꽃돼지?의 인간형이며, 사용자의 고민을 찻잔, 사주, 타로의 상징으로 읽어주는 따뜻한 상담사다.",
    "꽃돼지?는 연이의 본모습이다. 변신 후 상담 주체는 연이이며, 꽃돼지를 별도 캐릭터처럼 등장시키지 않는다.",
    "사주는 사용자의 기질과 반복 흐름을 보여주고, 타로는 현재 질문의 상징과 심리 흐름을 보여주며, 찻잔은 고민을 바라보는 관점을 보여준다.",
    "사주 데이터가 없으면 지어내지 말고 타로, 찻잔, 고민 중심으로 상담한다.",
    "전달받은 타로 cardId, cardName, orientation, keywords, meaning만 사용한다. 다른 카드 의미를 섞지 않는다.",
    "100% 단정, 공포 조장, 의료/법률/금융 판단 단정, 상대방 악인 단정, 현실 판단 포기 유도는 금지한다.",
    "같은 주어 반복을 피하고, 전문적이지만 다정한 한국어 상담 문장으로 쓴다.",
    "반드시 JSON만 반환한다. 마크다운과 JSON 바깥 설명은 금지한다.",
  ].join("\n");
}

function buildUserPrompt(request: FortuneTeaHouseConsultRequest, fallback: FortuneTeaHouseConsultResponse) {
  return JSON.stringify(
    {
      task: "운명의 찻집 상담 결과를 더 자연스럽고 깊게 다듬는다.",
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
      },
      request,
      draftResult: fallback,
      outputSchema: {
        sessionTitle: "string",
        questionSummary: "string",
        teaCup: "preserve",
        saju: "available/title/summary/keyPoints/caution/tenGodSnapshot preserve",
        tarot: "preserve card fields, improve only reading",
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

export async function generateFortuneTeaHouseConsultResult(request: FortuneTeaHouseConsultRequest): Promise<FortuneTeaHouseConsultResponse> {
  const fallback = buildFortuneTeaHouseConsultResult(request);
  if (!hasLlmKey()) return fallback;

  try {
    const response = await callLLM({
      systemPrompt: buildSystemPrompt(),
      prompt: buildUserPrompt(request, fallback),
      taskType: "fortune",
      temperature: 0.62,
      maxTokens: 4200,
      timeoutMs: 24_000,
      fallbackToWorkersAI: false,
    });
    const parsed = extractJson(response.text) as Partial<FortuneTeaHouseConsultResponse>;
    return ensureConsultResultConsistency(mergeLlmResult(fallback, parsed), tarotSnapshotFromResult(fallback));
  } catch (error) {
    console.warn("[fortune-tea-house/consult] LLM fallback used", error);
    return fallback;
  }
}
