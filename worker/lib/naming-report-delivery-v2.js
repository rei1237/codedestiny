// 작명 v2 LLM 호출부(설계서 §9·§10). 후보·수치는 결정론 엔진이 정하고, 서술 검사·교정·웨이브 로직은
// worker/naming-engine/report.ts 에 있다. 이 파일은 호출 옵션·로케일만 고정한다 — v1 과 같은 1콜/요청·폴백 없음.
import { callGeminiText } from "./gemini.js";
import { runWithAiLocale } from "./ai-locale-context.js";
import { PAID_LLM_PARTS_PER_REQUEST } from "./sync-llm-timeout.js";
import { createHttpError } from "./http.js";
import { NAMING_CHAPTERS } from "./naming-report-delivery.js";
import {
  buildNamingV2Prompt, confirmedEmptyNamingFailureV2, generateNamingWaveV2, initialDeliveryV2, namingBasisV2,
  namingChaptersTextV2, namingReportCompleteV2, prepareNamingV2,
} from "../naming-engine/service.ts";

export {
  confirmedEmptyNamingFailureV2 as confirmedEmptyNamingFailure,
  namingChaptersTextV2 as namingChaptersText,
  namingReportCompleteV2 as namingReportComplete,
  initialDeliveryV2 as initialDelivery,
  buildNamingV2Prompt as buildNamingPrompt,
};

function engineHttpError(error) {
  if (error?.name !== "NamingEngineError") return error;
  if (error.code === "saju-unavailable") return createHttpError(422, "사주 계산 근거 확인이 필요합니다.", { code: "CALCULATION_UNAVAILABLE" });
  return createHttpError(400, "작명 입력값을 확인해 주세요.", { code: "NAMING_ENGINE_INPUT_INVALID", reason: String(error.code || "") });
}

/** 유료(12개) — 결과 레코드에 저장할 엔진 요약과 사주 근거. */
export function prepareNaming(input) {
  try { return prepareNamingV2(input); } catch (error) { throw engineHttpError(error); }
}

/** 무료(5개) — LLM 0회. */
export function namingBasis(input) {
  try { return namingBasisV2(input); } catch (error) { throw engineHttpError(error); }
}

export async function generateNamingWave(env, snapshot, checkpoint) {
  const call = (prompt, part, maxOutputTokens) => runWithAiLocale(snapshot.locale || "ko", () => callGeminiText(env, prompt, {
    maxProviderAttempts: 1, taskType: "fortune", temperature: 0.72, timeoutMs: 45000, maxOutputTokens, fallbackToWorkersAI: false,
    logContext: { sectionGroup: `v2:${part}` },
  }));
  return generateNamingWaveV2(snapshot, checkpoint, { call, partsPerRequest: PAID_LLM_PARTS_PER_REQUEST, chapterTitles: NAMING_CHAPTERS });
}
