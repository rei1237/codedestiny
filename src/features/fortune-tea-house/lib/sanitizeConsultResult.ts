import { toDisplayText } from "@/lib/llm-text";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { ensureFirstSpreadCardConsistency } from "./validateConsultResult";

// 이미 저장·캐시된 오염 결과(빈 문자열, 객체 값, "68%" 같은 문자열 퍼센트)도
// 결과 화면에서 React child 크래시/게이지 붕괴 없이 렌더되도록 표시용 필드를 1회 정규화한다.
// (서버 mergeLlmResult도 같은 보증을 하지만, 과거에 completed로 저장된 결과가 캐시로 재서빙된다.)

const text = (value: unknown): string => toDisplayText(value).trim();

function percent(value: unknown, fallback = 50): number {
  const numeric = Math.round(Number(String(value ?? "").replace(/[^\d.-]/g, "")));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, numeric));
}

function textList(values: unknown, maxItems = 12): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((item) => text(item)).filter(Boolean).slice(0, maxItems);
}

export function sanitizeTeaHouseConsultResult(result: FortuneTeaHouseConsultResponse): FortuneTeaHouseConsultResponse {
  const saju = result.saju
    ? {
        ...result.saju,
        title: text(result.saju.title),
        summary: text(result.saju.summary),
        keyPoints: textList(result.saju.keyPoints),
        caution: text(result.saju.caution) || undefined,
        cautionReading: text(result.saju.cautionReading) || undefined,
        actionPrescription: text(result.saju.actionPrescription) || undefined,
        oneLineAdvice: text(result.saju.oneLineAdvice) || undefined,
        deepSections: (result.saju.deepSections || [])
          .map((section) => ({ ...section, title: text(section.title), body: text(section.body) }))
          .filter((section) => section.body),
      }
    : result.saju;
  const tarot = {
    ...result.tarot,
    keywords: textList(result.tarot?.keywords),
    meaning: text(result.tarot?.meaning),
    reading: text(result.tarot?.reading),
  };
  const sukuyo = result.sukuyoCompatibility
    ? {
        ...result.sukuyoCompatibility,
        title: text(result.sukuyoCompatibility.title),
        summary: text(result.sukuyoCompatibility.summary),
        strengths: textList(result.sukuyoCompatibility.strengths),
        cautions: textList(result.sukuyoCompatibility.cautions),
        adviceKeywords: textList(result.sukuyoCompatibility.adviceKeywords),
        roleGuide: result.sukuyoCompatibility.roleGuide
          ? {
              userAction: text(result.sukuyoCompatibility.roleGuide.userAction),
              partnerAction: text(result.sukuyoCompatibility.roleGuide.partnerAction),
            }
          : undefined,
      }
    : result.sukuyoCompatibility;
  // sajuCompatibility는 텍스트 필드만 sanitize하고 user/partner 명식 구조는 보존한다(숙요와 동일 규칙).
  const sajuCompat = result.sajuCompatibility
    ? {
        ...result.sajuCompatibility,
        title: text(result.sajuCompatibility.title),
        summary: text(result.sajuCompatibility.summary),
        adviceKeywords: textList(result.sajuCompatibility.adviceKeywords),
        interaction: result.sajuCompatibility.interaction
          ? {
              ...result.sajuCompatibility.interaction,
              summary: text(result.sajuCompatibility.interaction.summary) || undefined,
              elementHarmony: text(result.sajuCompatibility.interaction.elementHarmony) || undefined,
              dayMasterRelation: text(result.sajuCompatibility.interaction.dayMasterRelation) || undefined,
              strengths: textList(result.sajuCompatibility.interaction.strengths),
              cautions: textList(result.sajuCompatibility.interaction.cautions),
            }
          : undefined,
      }
    : result.sajuCompatibility;
  return {
    ...result,
    sessionTitle: text(result.sessionTitle) || result.teaCup?.name || "운명의 찻집 상담",
    questionSummary: text(result.questionSummary),
    teaCup: {
      ...result.teaCup,
      name: text(result.teaCup?.name),
      topic: text(result.teaCup?.topic),
      reading: text(result.teaCup?.reading),
      resultPrelude: text(result.teaCup?.resultPrelude) || undefined,
    },
    saju,
    tarot,
    // 첫 스프레드 카드는 대표 카드(result.tarot)와 같은 정체성으로 노출되므로,
    // 과거 저장분의 헤더-본문 카드 불일치(P0)도 재서빙 시 여기서 함께 복구한다.
    tarotSpreadCards: ensureFirstSpreadCardConsistency(
      result.tarotSpreadCards?.map((card) => ({
        ...card,
        positionLabel: text(card.positionLabel),
        positionMeaning: text(card.positionMeaning),
        reading: text(card.reading) || undefined,
        keywords: textList(card.keywords),
      })),
      tarot,
    ),
    sukuyoCompatibility: sukuyo,
    sajuCompatibility: sajuCompat,
    emotionAnalysis: (result.emotionAnalysis || [])
      .map((item) => ({
        ...item,
        label: text(item?.label),
        value: percent(item?.value),
        description: text(item?.description),
      }))
      .filter((item) => item.label || item.description),
    yeoniReading: {
      intro: text(result.yeoniReading?.intro),
      main: text(result.yeoniReading?.main),
      advice: text(result.yeoniReading?.advice),
      caution: text(result.yeoniReading?.caution),
    },
    synthesis: result.synthesis
      ? {
          ...result.synthesis,
          title: text(result.synthesis.title),
          summary: text(result.synthesis.summary),
          sajuTarotBridge: text(result.synthesis.sajuTarotBridge),
        }
      : result.synthesis,
    choiceSimulation: (result.choiceSimulation || [])
      .map((choice, index) => ({
        ...choice,
        id: text(choice?.id) || `choice-${index + 1}`,
        title: text(choice?.title),
        subtitle: text(choice?.subtitle),
        result: text(choice?.result),
        caution: text(choice?.caution),
      }))
      .filter((choice) => choice.title || choice.result),
    actionPrescription: text(result.actionPrescription),
    luckyKeywords: textList(result.luckyKeywords, 8),
    honeyLetter: result.honeyLetter
      ? { ...result.honeyLetter, title: text(result.honeyLetter.title), body: text(result.honeyLetter.body) }
      : result.honeyLetter,
    closingLine: text(result.closingLine),
  };
}
