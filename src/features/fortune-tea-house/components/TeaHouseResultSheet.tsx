"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useLazySpriteSource, useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import type { FortuneTeaHouseConsultResponse, FortuneTeaHouseHoneyDropsState, FortuneTeaHouseHoneyLetter } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { getTeaHouseCupById } from "../data/teaCups";
import { getTenGodMeta } from "../data/tenGods";
import AssetImage from "./AssetImage";
import TarotAssetCard from "./TarotAssetCard";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import TeaHouseSajuResultPanel from "./TeaHouseSajuResultPanel";
import TeaHouseSukuyoResultPanel from "./TeaHouseSukuyoResultPanel";
import TenGodSymbolCard from "./TenGodSymbolCard";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseResultSheetProps = {
  result: FortuneTeaHouseConsultResponse;
  onRestart: () => void;
  onShowTarot: () => void;
  onEditBirthInfo: () => void;
  honeyDrops: FortuneTeaHouseHoneyDropsState | null;
  onHoneyDropsChange: (honeyDrops: FortuneTeaHouseHoneyDropsState) => void;
  onResultUpdate: (result: FortuneTeaHouseConsultResponse) => void;
};

type HoneyLetterApiResponse = {
  success?: boolean;
  spent?: number;
  balance?: number;
  honeyDrops?: FortuneTeaHouseHoneyDropsState;
  honeyLetter?: FortuneTeaHouseHoneyLetter;
  alreadyApplied?: boolean;
  errorCode?: string;
  required?: number;
  current?: number;
};
const resultSceneUi =
  "min-h-svh bg-[#080511] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,250,244,0.18),transparent_34rem),radial-gradient(circle_at_12%_10%,rgba(206,196,255,0.16),transparent_30rem),radial-gradient(circle_at_90%_16%,rgba(246,223,183,0.12),transparent_28rem)] text-[#fff8df] antialiased";
const resultSheetUi =
  "relative isolate overflow-hidden rounded-[26px] border border-[#f6dfb7]/20 bg-gradient-to-br from-[#241337]/90 via-[#12091f]/90 to-[#080511]/95 shadow-[0_42px_124px_rgba(3,2,12,0.58),0_0_74px_rgba(206,196,255,0.13),inset_0_1px_0_rgba(255,255,255,0.17)] ring-1 ring-white/10 backdrop-blur-2xl";
const resultHeaderUi =
  "rounded-[22px] border border-[#f6dfb7]/20 bg-white/[0.065] shadow-[0_22px_64px_rgba(4,2,12,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-white/5 backdrop-blur-xl";
const resultGlassCardUi =
  "rounded-[18px] border border-[#f6dfb7]/20 bg-white/[0.06] shadow-[0_20px_58px_rgba(4,2,12,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/5 backdrop-blur-xl";
const resultLiftCardUi =
  "transition duration-300 hover:-translate-y-1 hover:border-[#ffe8a6]/50 hover:shadow-[0_28px_74px_rgba(4,2,12,0.34),0_0_42px_rgba(206,196,255,0.12)]";
const resultReadingCardUi =
  "rounded-2xl border border-[#f6dfb7]/20 bg-[#0e0719]/60 shadow-[0_18px_46px_rgba(4,2,12,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/5";
const resultActionUi =
  "rounded-2xl border border-[#f6dfb7]/20 bg-[#0e0719]/60 px-3 py-3 shadow-[0_18px_52px_rgba(4,2,12,0.24),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/5 backdrop-blur-xl";

const tarotChoiceTitleByCupId: Record<string, string> = {
  "lotus-moon": "7일 행동 플랜",
  "honey-peach": "7일 썸 리듬 플랜",
  "star-black-tea": "14일 실행 플랜",
  "gold-cinnamon": "30일 금전 회복 플랜",
  "white-lotus-healing": "7일 회복 루틴",
  "black-moon-brown-rice": "72시간 안정 플랜",
};

function choiceCountLabel(count: number) {
  if (count === 1) return "한 가지";
  if (count === 2) return "두 가지";
  if (count === 3) return "세 가지";
  if (count === 4) return "네 가지";
  return `${count}가지`;
}

function consultationModeLabel(mode?: string) {
  if (mode === "saju") return "사주 상담";
  if (mode === "sukuyo") return "숙요점 궁합 상담";
  return "타로 상담";
}

function safeFilePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48) || "fortune-tea-house";
}

function appendTextBlock(lines: string[], title: string, value?: string) {
  const text = String(value || "").trim();
  if (!text) return;
  lines.push("", `[${title}]`, text);
}

function appendListBlock(lines: string[], title: string, values?: string[]) {
  const items = (values || []).map((item) => String(item || "").trim()).filter(Boolean);
  if (!items.length) return;
  lines.push("", `[${title}]`, ...items.map((item) => `- ${item}`));
}

function buildFortuneTeaHouseResultText(result: FortuneTeaHouseConsultResponse) {
  const mode = result.consultationMode || "tarot";
  const lines = [
    "운명의 찻집에서 연이가 남긴 말",
    "",
    `오늘의 찻잔: ${result.sessionTitle}`,
    `차를 따른 시간: ${new Date().toLocaleString("ko-KR")}`,
    `연이가 펼친 자리: ${consultationModeLabel(mode)}`,
    `손님이 건넨 질문: ${result.questionSummary}`,
    `선택한 찻잔: ${result.teaCup.name} · ${result.teaCup.topic}`,
  ];

  appendTextBlock(lines, "찻잔의 향", result.teaCup.reading);

  if (mode === "tarot") {
    const direction = result.tarot.orientation === "upright" ? "정방향" : "역방향";
    appendTextBlock(lines, "타로가 보여준 지금의 장면", `${result.tarot.nameKo} · ${direction} · ${result.tarot.keywords.join(" · ")}\n${result.tarot.reading}`);
    if (result.tarotSpreadCards?.length) {
      lines.push("", "[펼쳐진 타로 스프레드]");
      result.tarotSpreadCards.forEach((card, index) => {
        lines.push(`${index + 1}. ${card.positionLabel} - ${card.nameKo} (${card.orientation === "upright" ? "정방향" : "역방향"})`);
        if (card.positionMeaning) lines.push(card.positionMeaning);
        if (card.reading) lines.push(card.reading);
        lines.push("");
      });
    }
  }

  if (mode === "saju") {
    appendTextBlock(lines, result.saju.title || "사주가 말하는 흐름", result.saju.summary);
    appendListBlock(lines, "사주 핵심", result.saju.keyPoints);
    if (result.saju.deepSections?.length) {
      lines.push("", "[사주 깊은 흐름]");
      result.saju.deepSections.forEach((section, index) => {
        lines.push(`${index + 1}. ${section.title}`, section.body, "");
      });
    }
    appendTextBlock(lines, "주의할 결", result.saju.cautionReading || result.saju.caution);
    appendTextBlock(lines, "사주 행동 처방", result.saju.actionPrescription || result.saju.oneLineAdvice);
  }

  if (mode === "sukuyo" && result.sukuyoCompatibility) {
    const sukuyo = result.sukuyoCompatibility;
    appendTextBlock(lines, sukuyo.title || "27숙 인연의 흐름", sukuyo.summary);
    appendListBlock(lines, "인연의 힘", sukuyo.strengths);
    appendListBlock(lines, "조심할 결", sukuyo.cautions);
    appendListBlock(lines, "숙요 조언 키워드", sukuyo.adviceKeywords);
    if (sukuyo.roleGuide) {
      appendTextBlock(lines, "두 사람의 작은 역할", `나: ${sukuyo.roleGuide.userAction}\n상대: ${sukuyo.roleGuide.partnerAction}`);
    }
  }

  appendTextBlock(lines, result.synthesis.title, `${result.synthesis.summary}\n${result.synthesis.sajuTarotBridge}`);
  appendTextBlock(lines, "연이가 건넨 말", [result.yeoniReading.intro, result.yeoniReading.main, result.yeoniReading.advice, result.yeoniReading.caution].filter(Boolean).join("\n\n"));

  if (result.choiceSimulation.length) {
    lines.push("", "[지금 선택할 수 있는 길]");
    result.choiceSimulation.forEach((choice, index) => {
      lines.push(`${index + 1}. ${choice.title} - ${choice.subtitle}`, choice.result, `조심할 점: ${choice.caution}`, "");
    });
  }

  appendTextBlock(lines, "행동 처방", result.actionPrescription);
  appendListBlock(lines, "오늘의 키워드", result.luckyKeywords);
  if (result.honeyLetter) appendTextBlock(lines, result.honeyLetter.title || "연이의 꿀편지", result.honeyLetter.body);
  appendTextBlock(lines, "마지막 한마디", result.closingLine);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export default function TeaHouseResultSheet({
  result,
  onRestart,
  onShowTarot,
  onEditBirthInfo,
  honeyDrops,
  onHoneyDropsChange,
  onResultUpdate,
}: TeaHouseResultSheetProps) {
  const [honeyLetterLoading, setHoneyLetterLoading] = useState(false);
  const [honeyLetterMessage, setHoneyLetterMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const resultYeoniGate = useSpritePlaybackGate<HTMLSpanElement>();
  const resultPigGate = useSpritePlaybackGate<HTMLSpanElement>();
  const resultYeoniSprite = resultYeoniGate.isMobile
    ? fortuneTeaHouseAssets.yeoni.transparent.yeoniThanksStillMobile
    : fortuneTeaHouseAssets.yeoni.transparent.yeoniSprite2Thanks;
  const resultPigSprite = resultPigGate.isMobile
    ? fortuneTeaHouseAssets.yeoni.transparent.flowerPigResultStillMobile
    : fortuneTeaHouseAssets.yeoni.transparent.flowerPig5Sprite;
  const resultYeoniProbe = useLazySpriteSource(resultYeoniSprite, resultYeoniGate.canLoad);
  const resultPigProbe = useLazySpriteSource(resultPigSprite, resultPigGate.canLoad);
  const resultYeoniSpriteSource = resultYeoniProbe.isLoaded
    ? resultYeoniProbe.resolvedSrc
    : resultYeoniProbe.isFailed
      ? fortuneTeaHouseAssets.yeoni.transparent.bust
      : "";
  const resultPigSpriteSource = resultPigProbe.isLoaded
    ? resultPigProbe.resolvedSrc
    : resultPigProbe.isFailed
      ? fortuneTeaHouseAssets.cutout.flowerPig
      : "";
  const consultationMode = result.consultationMode || "tarot";
  const isTarotMode = consultationMode === "tarot";
  const isSajuMode = consultationMode === "saju";
  const isSukuyoMode = consultationMode === "sukuyo";
  const direction = result.tarot.orientation === "upright" ? "정방향" : "역방향";
  const tarotSpreadCards = result.tarotSpreadCards?.length
    ? result.tarotSpreadCards
    : [
        {
          ...result.tarot,
          positionId: "representative",
          positionLabel: "대표",
          positionMeaning: "지금 질문에 먼저 떠오른 카드입니다.",
          reading: result.tarot.reading,
        },
      ];
  const selectedCup = getTeaHouseCupById(result.teaCup.id);
  const resultPrelude = result.teaCup.resultPrelude || selectedCup?.resultPrelude || result.teaCup.reading;
  const yeoniOpening = isSajuMode
    ? "연이가 타로를 섞지 않고, 사주의 드러난 흐름만 따라 상담을 펼쳤습니다."
    : isSukuyoMode
      ? "연이가 타로와 사주를 섞지 않고, 두 사람의 27숙 인연의 흐름만 따라 상담을 펼쳤습니다."
    : selectedCup?.resultPrelude || "연이가 사주를 섞지 않고, 카드와 지금 적어주신 질문의 향을 한 장의 상담 기록으로 엮었습니다.";
  const saju = result.saju || {
    available: false,
    title: "사주가 말하는 기본 흐름",
    summary: "출생정보가 충분하지 않아 오늘은 보이는 정보와 지금 적어주신 고민의 결만 차분히 살핍니다.",
    keyPoints: ["확인된 정보와 현재 질문의 결을 중심으로 읽었습니다."],
  };
  const sukuyo = result.sukuyoCompatibility;
  const synthesis = result.synthesis || {
    title: isSajuMode ? "연이가 읽은 사주의 결" : isSukuyoMode ? "연이가 읽은 27숙 인연의 흐름" : "연이가 읽은 타로의 장면",
    summary: isSajuMode
      ? "찻잔과 사주의 드러난 흐름이 오늘 붙잡을 기준을 비춥니다."
      : isSukuyoMode
        ? "찻잔과 27숙의 거리가 두 사람 사이의 흐름을 비춥니다."
        : "찻잔과 카드의 상징이 지금 마음의 방향을 비춥니다.",
    sajuTarotBridge: isSajuMode
      ? "오늘은 사주의 확인된 결을 중심으로, 마음이 덜 다치게 움직일 수 있는 다음 한 걸음을 살핍니다."
      : isSukuyoMode
        ? "오늘은 숙요점 궁합의 확인된 결을 중심으로, 두 사람이 덜 다치게 가까워지는 다음 한 걸음을 살핍니다."
      : "오늘은 현재 고민과 카드의 상징을 중심으로, 마음이 덜 다치게 움직일 수 있는 다음 한 걸음을 살핍니다.",
  };
  const tenGodSnapshot = saju.tenGodSnapshot;
  const primaryTenGodId = saju.primaryTenGod?.id || (tenGodSnapshot?.available ? tenGodSnapshot.primaryTenGod : undefined);
  const primaryTenGodMeta = primaryTenGodId ? getTenGodMeta(primaryTenGodId) : null;
  const honeyLetter = result.honeyLetter;
  const honeyBalance = honeyDrops?.currentHoneyDrops ?? honeyDrops?.balance ?? 0;
  const canRequestHoneyLetter = Boolean(result.resultId && honeyDrops?.authenticated && honeyBalance >= 10 && !honeyLetter && !honeyLetterLoading);
  const previewKeywords = result.luckyKeywords.slice(0, 3);
  const resultThanksLine = "오늘 함께 찻잔을 열어줘서 고마워요.\n필요한 순간에 이 말만 조용히 떠올려 주세요.";
  const choiceSimulationTitle = isTarotMode
    ? tarotChoiceTitleByCupId[result.teaCup.id] || "카드가 권한 다음 행동 플랜"
    : `지금 선택할 수 있는 ${choiceCountLabel(result.choiceSimulation.length)} 길`;
  const firstChoice = result.choiceSimulation[0];
  const priorityCards = isSajuMode
    ? [
        {
          label: "핵심 기운",
          title: saju.dayMaster || primaryTenGodMeta?.nameKo || "입력 정보 기준",
          body: primaryTenGodMeta?.roleInTeaHouse || saju.summary || "확인된 사주 정보 안에서 오늘의 기준을 읽습니다.",
        },
        {
          label: "오늘의 기준",
          title: result.luckyKeywords[0] || result.teaCup.topic,
          body: saju.oneLineAdvice || result.closingLine,
        },
        {
          label: "바로 할 일",
          title: firstChoice?.title || "오늘의 작은 처방",
          body: firstChoice?.result || result.actionPrescription,
        },
      ]
    : isSukuyoMode
      ? [
          {
            label: "관계 유형",
            title: sukuyo?.relationType || "인연",
            body: sukuyo?.summary || "두 사람의 본명숙과 관계 거리를 중심으로 읽습니다.",
          },
          {
            label: "거리감",
            title: sukuyo?.distanceLabel || "달빛 거리",
            body: sukuyo?.relationDetail?.typeAToB || sukuyo?.cautions?.[0] || "가까워지는 속도와 회복 간격을 함께 살핍니다.",
          },
          {
            label: "바로 할 일",
            title: firstChoice?.title || "관계 조율",
            body: firstChoice?.result || result.actionPrescription,
          },
        ]
      : [
          {
            label: "카드 상징",
            title: `${result.tarot.nameKo} · ${direction}`,
            body: result.tarot.keywords.join(" · "),
          },
          {
            label: tarotSpreadCards.length > 1 ? "배열 흐름" : "질문의 중심",
            title: tarotSpreadCards.length > 1 ? `${tarotSpreadCards.length}장 리딩` : tarotSpreadCards[0]?.positionLabel || "대표 카드",
            body: tarotSpreadCards.length > 1 ? tarotSpreadCards.map((card) => card.positionLabel).join(" · ") : result.tarot.reading,
          },
          {
            label: "바로 할 일",
            title: firstChoice?.title || "오늘의 작은 처방",
            body: firstChoice?.result || result.actionPrescription,
          },
        ];

  async function requestHoneyLetter() {
    if (!result.resultId || honeyLetterLoading) return;
    setHoneyLetterLoading(true);
    setHoneyLetterMessage("연이가 꿀방울을 모아 편지를 쓰는 중이에요.");
    try {
      const idempotencyKey = `yeoni-honey-letter:${result.resultId}`;
      const response = await fetch("/api/fortune-tea-house/results/honey-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: result.resultId, idempotencyKey }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as HoneyLetterApiResponse;
      if (!response.ok || !payload.success || !payload.honeyLetter) {
        if (payload.errorCode === "INSUFFICIENT_TEA_HOUSE_HONEY_DROPS") {
          setHoneyLetterMessage("꿀방울이 조금 부족해요. 운명의 찻집 상담을 더 열어보면 꿀방울을 모을 수 있어요.");
          return;
        }
        if (payload.errorCode === "UNAUTHORIZED") {
          setHoneyLetterMessage("로그인하면 꿀방울을 모아 연이의 꿀편지를 받을 수 있어요.");
          return;
        }
        if (payload.errorCode === "YEONI_HONEY_LETTER_IN_PROGRESS") {
          setHoneyLetterMessage("연이가 이미 편지를 쓰고 있어요. 잠시만 기다려 주세요.");
          return;
        }
        setHoneyLetterMessage("연이가 편지를 끝까지 묶지 못했어요. 꿀방울은 그대로 지켜둘게요.");
        return;
      }
      if (payload.honeyDrops) onHoneyDropsChange(payload.honeyDrops);
      onResultUpdate({ ...result, honeyLetter: payload.honeyLetter });
      setHoneyLetterMessage(payload.alreadyApplied ? "연이의 꿀편지를 다시 펼쳤어요." : "연이의 꿀편지가 도착했어요.");
    } catch {
      setHoneyLetterMessage("연이가 편지를 끝까지 묶지 못했어요. 꿀방울은 그대로 지켜둘게요.");
    } finally {
      setHoneyLetterLoading(false);
    }
  }

  function saveResultAsTextFile() {
    try {
      const text = buildFortuneTeaHouseResultText(result);
      const blob = new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `운명의-찻집-${safeFilePart(result.sessionTitle)}-${date}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setSaveStatus("상담 결과를 텍스트 파일로 저장했어요.");
    } catch {
      setSaveStatus("상담 결과 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  }
  return (
    <section
      className={`${styles.resultScene} ${resultSceneUi}`}
      data-accent={selectedCup?.accent || "pink"}
      data-mode={consultationMode}
      aria-labelledby="teaResultTitle"
    >
      <aside className={styles.resultYeoniPanel}>
        <span
          ref={resultYeoniGate.ref}
          className={styles.resultThanksYeoniSprite}
          data-playback={resultYeoniGate.canAnimate && !resultYeoniGate.isMobile && resultYeoniProbe.isLoaded ? "animated" : "static"}
          data-sprite-status={resultYeoniProbe.status}
          style={{
            "--result-yeoni-sprite": resultYeoniSpriteSource ? `url("${resultYeoniSpriteSource}")` : "none",
            "--result-yeoni-bg-size": resultYeoniGate.isMobile || resultYeoniProbe.isFailed ? "contain" : "400% 200%",
            "--result-yeoni-bg-position": resultYeoniGate.isMobile || resultYeoniProbe.isFailed ? "center" : "0% 0%",
          } as CSSProperties}
          role="img"
          aria-label="상담을 마치고 감사 인사를 건네는 연이"
        />
        <TeaHouseDialogueBox speaker="연이" text={resultThanksLine} />
      </aside>

      <article
        className={`${styles.resultSheet} ${resultSheetUi}`}
        data-mode={consultationMode}
      >
        <header className={`${styles.resultHeader} ${resultHeaderUi}`}>
          {selectedCup ? <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.resultHeaderCup} /> : null}
          <p className={styles.sceneEyebrow}>{selectedCup?.eyebrow || "인간 상담사 연이가 읽어 준 오늘의 찻잔"}</p>
          <h2 id="teaResultTitle">{result.sessionTitle}</h2>
          <p>{result.questionSummary}</p>
          <strong className={styles.resultYeoniOpening}>{yeoniOpening}</strong>
        </header>

        <div className={styles.resultSummaryGrid}>
          <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
            <span>선택한 찻잔</span>
            <strong>{result.teaCup.name}</strong>
            <p>{result.teaCup.topic}</p>
          </div>
          <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
            <span>상담 방식</span>
            <strong>
              {isSajuMode ? "사주" : isSukuyoMode ? "숙요점 궁합" : "타로"}
            </strong>
            <p>{isSajuMode ? "출생정보와 기본 기운 중심" : isSukuyoMode ? "27숙 거리와 관계 리듬 중심" : "선택된 카드와 현재 질문 중심"}</p>
          </div>
          {isTarotMode ? (
            <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
              <span>선택된 타로 카드</span>
              <strong>
                {result.tarot.nameKo} · {direction}
              </strong>
              <p>{result.tarot.keywords.join(" · ")}</p>
            </div>
          ) : isSukuyoMode ? (
            <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
              <span>27숙 관계</span>
              <strong>{sukuyo?.relationType || "인연"} · {sukuyo?.distanceLabel || "거리 확인"}</strong>
              <p>{[sukuyo?.user.sukuyoName, sukuyo?.partner.sukuyoName].filter(Boolean).join(" · ") || "두 사람의 본명숙을 확인합니다."}</p>
            </div>
          ) : (
            <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
              <span>사주의 중심 기운</span>
              <strong>{primaryTenGodMeta ? primaryTenGodMeta.nameKo : "사주 정보 없음"}</strong>
              <p>{primaryTenGodMeta ? primaryTenGodMeta.roleInTeaHouse : "입력된 출생정보 안에서 보이는 흐름만 읽습니다."}</p>
            </div>
          )}
          <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
            <span>오늘 붙잡을 말</span>
            <strong>{previewKeywords.slice(0, 2).join(" · ")}</strong>
            <p>{previewKeywords.slice(2).join(" · ") || previewKeywords.join(" · ")}</p>
          </div>
        </div>

        <section className={`${styles.resultPriorityStrip} ${resultGlassCardUi}`} aria-labelledby="resultPriorityTitle">
          <h3 id="resultPriorityTitle">오늘 먼저 붙잡을 것</h3>
          <div className={styles.resultPriorityGrid}>
            {priorityCards.map((item) => (
              <article className={`${styles.resultPriorityCard} ${resultReadingCardUi} ${resultLiftCardUi}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="teaCupTopicTitle">
          <h3 id="teaCupTopicTitle">찻잔이 먼저 말한 것</h3>
          <p className={styles.sajuSummary}>{resultPrelude}</p>
          <p className={styles.sajuCaution}>
            {isSajuMode
              ? `${result.teaCup.name}은 ${result.teaCup.topic}의 관점에서 질문을 바라보게 합니다. 연이는 그 향 위에 타로를 올리지 않고, 사주의 기본 흐름만 차분히 펼쳤습니다.`
              : isSukuyoMode
                ? `${result.teaCup.name}은 ${result.teaCup.topic}의 관점에서 두 사람의 질문을 바라보게 합니다. 연이는 그 향 위에 타로와 사주를 올리지 않고, 27숙 인연의 흐름만 차분히 펼쳤습니다.`
              : `${result.teaCup.name}은 ${result.teaCup.topic}의 관점에서 질문을 바라보게 합니다. 연이는 그 향 위에 사주를 올리지 않고, 타로의 현재 상징만 깊게 읽었습니다.`}
          </p>
        </section>

        {isSajuMode ? <TeaHouseSajuResultPanel result={result} onShowTarot={onShowTarot} onEditBirthInfo={onEditBirthInfo} showTarotAction={false} /> : null}
        {isSukuyoMode ? <TeaHouseSukuyoResultPanel result={result} /> : null}

        {isTarotMode ? (
        <section className={`${styles.resultBlock} ${styles.resultTarotShowcase} ${resultGlassCardUi}`} aria-labelledby="tarotResultTitle">
          <h3 id="tarotResultTitle">타로가 보여준 지금의 장면</h3>
          <div className={styles.resultTarotGallery} aria-label="결과에 놓인 타로 카드">
            {tarotSpreadCards.map((card) => (
              <article
                className={`${styles.resultTarotGalleryCard} ${resultLiftCardUi}`}
                key={`${card.positionId}-${card.cardId}`}
                aria-label={`${card.positionLabel} ${card.nameKo} ${card.orientation === "upright" ? "정방향" : "역방향"}`}
              >
                <TarotAssetCard
                  cardId={card.cardId}
                  number={card.number}
                  nameKo={card.nameKo}
                  nameEn={card.nameEn}
                  orientation={card.orientation}
                  keywords={card.keywords}
                  meaning={card.meaning}
                  size="lg"
                  compact
                  visualOnly
                />
              </article>
            ))}
          </div>
          <div className={styles.resultTarotReadingFlow}>
            {tarotSpreadCards.map((card) => (
              <article className={`${styles.resultTarotReadingCard} ${resultReadingCardUi}`} key={`${card.positionId}-${card.cardId}-reading`}>
                <span>{card.positionLabel}</span>
                <strong>{card.nameKo} · {card.orientation === "upright" ? "정방향" : "역방향"}</strong>
                <p>{card.positionMeaning || "이 자리는 지금 질문에서 가장 먼저 살필 장면을 가리킵니다."}</p>
                <p>{card.reading || result.tarot.reading}</p>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        <section className={`${styles.resultBlock} ${styles.synthesisBlock} ${resultGlassCardUi}`} aria-labelledby="synthesisResultTitle">
          <h3 id="synthesisResultTitle">{synthesis.title}</h3>
          <div className={styles.synthesisVisualPair} aria-label={isSajuMode ? "사주의 중심 상징" : isSukuyoMode ? "숙요점 궁합의 중심 상징" : "타로의 중심 상징"}>
            {isSukuyoMode ? (
              <div className={styles.synthesisSukuyo}>
                <AssetImage src={fortuneTeaHouseAssets.consultModes.sukuyo} alt="27숙 인연의 흐름" />
                <div>
                  <span>{sukuyo?.relationType || "인연"}</span>
                  <strong>{sukuyo?.distanceLabel || "달빛 거리"}</strong>
                  <p>{sukuyo?.compatibilityIndex ? `${sukuyo.compatibilityIndex}%의 관계 온도` : "두 사람의 숙요 거리를 조용히 살핍니다."}</p>
                </div>
              </div>
            ) : null}
            {isSajuMode && primaryTenGodId ? (
              <TenGodSymbolCard tenGodId={primaryTenGodId} size="sm" showDescription={false} selected />
            ) : isSajuMode ? (
              <div className={styles.synthesisUnavailableSaju}>
                <span>사주</span>
                <strong>출생정보 없음</strong>
                <p>세부 사주 흐름은 만들지 않고 현재 질문 중심으로 읽습니다.</p>
              </div>
            ) : null}
            {isTarotMode ? (
            <TarotAssetCard
              cardId={result.tarot.cardId}
              number={result.tarot.number}
              nameKo={result.tarot.nameKo}
              nameEn={result.tarot.nameEn}
              orientation={result.tarot.orientation}
              keywords={result.tarot.keywords.slice(0, 2)}
              size="sm"
              visualOnly
            />
            ) : null}
          </div>
          <p>{synthesis.summary}</p>
          <strong>{synthesis.sajuTarotBridge}</strong>
        </section>

        <section className={styles.resultBlock} aria-labelledby="emotionResultTitle">
          <h3 id="emotionResultTitle">연이가 맡은 마음의 향</h3>
          <div className={styles.resultEmotionPigStage}>
            <span className={styles.resultEmotionPigGlow} aria-hidden />
            <span
              ref={resultPigGate.ref}
              className={styles.resultEmotionPigSprite}
              data-playback={resultPigGate.canAnimate && !resultPigGate.isMobile && resultPigProbe.isLoaded ? "animated" : "static"}
              data-sprite-status={resultPigProbe.status}
              style={{
                "--result-pig-sprite": resultPigSpriteSource ? `url("${resultPigSpriteSource}")` : "none",
                "--result-pig-bg-size": resultPigGate.isMobile || resultPigProbe.isFailed ? "contain" : "400% 400%",
                "--result-pig-bg-position": resultPigGate.isMobile || resultPigProbe.isFailed ? "center" : "0% 0%",
              } as CSSProperties}
              role="img"
              aria-label="마음의 향을 맡는 꽃돼지 연이"
            />
          </div>
          <div className={styles.resultEmotionList}>
            {result.emotionAnalysis.map((item) => (
              <div className={styles.resultEmotionItem} data-tone={item.tone} key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value}%</span>
                </div>
                <div className={styles.resultGaugeTrack}>
                  <span style={{ "--gauge-value": `${item.value}%` } as CSSProperties} />
                </div>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="yeoniReadingTitle">
          <h3 id="yeoniReadingTitle">{isSajuMode ? "연이가 이어 읽은 사주의 결" : isSukuyoMode ? "연이가 이어 읽은 인연의 결" : "연이가 이어 읽은 타로의 결"}</h3>
          {isTarotMode ? (
            <TarotAssetCard
              className={styles.resultSectionTarotCard}
              cardId={result.tarot.cardId}
              number={result.tarot.number}
              nameKo={result.tarot.nameKo}
              nameEn={result.tarot.nameEn}
              orientation={result.tarot.orientation}
              size="sm"
              visualOnly
            />
          ) : (
            <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.yeoni.transparent.bust} alt="" />
          )}
          <div className={styles.yeoniReadingGrid}>
            <p>{result.yeoniReading.intro}</p>
            <p>{result.yeoniReading.main}</p>
            <p>{result.yeoniReading.advice}</p>
            <p>{result.yeoniReading.caution}</p>
          </div>
        </section>

        <section className={styles.resultBlock} aria-labelledby="choiceSimulationTitle">
          <h3 id="choiceSimulationTitle">{choiceSimulationTitle}</h3>
          <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.pig.transparent.base4} alt="" />
          <div className={styles.choiceGrid}>
            {result.choiceSimulation.map((choice) => (
              <article className={`${styles.choiceCard} ${resultReadingCardUi} ${resultLiftCardUi}`} key={choice.id}>
                <span>{choice.subtitle}</span>
                <h4>{choice.title}</h4>
                <p>{choice.result}</p>
                <strong>{choice.caution}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.actionPrescription} ${resultGlassCardUi}`} aria-labelledby="actionPrescriptionTitle">
          <h3 id="actionPrescriptionTitle">오늘의 작은 처방</h3>
          <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.pig.transparent.base2} alt="" />
          <p>{result.actionPrescription}</p>
          <div className={styles.luckyKeywordList}>
            {previewKeywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </section>

        <section className={`${styles.resultBlock} ${styles.honeyLetterBlock}`} aria-labelledby="honeyLetterTitle">
          <div className={styles.honeyLetterLayout}>
            <div className={styles.honeyLetterMascotWrap} aria-hidden>
              <AssetImage className={styles.honeyLetterMascot} src={fortuneTeaHouseAssets.rewards.flowerPigHoneyHug} alt="" />
              <span className={styles.honeyLetterBalance}>
                <AssetImage className={styles.honeyLetterIcon} src={fortuneTeaHouseAssets.rewards.honeyDrop} fallbackSrc={fortuneTeaHouseAssets.rewards.honeyDrop2} alt="" />
                {honeyBalance}개
              </span>
            </div>
            <div className={styles.honeyLetterContent}>
              <div className={styles.honeyLetterHeader}>
                <div>
                  <span>보유 꿀방울: {honeyBalance}개</span>
                  <h3 id="honeyLetterTitle">연이의 꿀편지</h3>
                </div>
              </div>

              {honeyLetter ? (
                <article className={styles.honeyLetterCard} aria-live="polite">
                  <h4>{honeyLetter.title || "연이의 꿀편지"}</h4>
                  <p>{honeyLetter.body}</p>
                </article>
              ) : (
                <div className={styles.honeyLetterCta}>
                  <p>
                    연이가 꿀방울을 톡톡 모아, 오늘의 상담 끝에 손님 마음으로만 닿는 편지를 써줄게요.
                  </p>
                  <TeaHouseButton onClick={requestHoneyLetter} disabled={!canRequestHoneyLetter}>
                    {honeyLetterLoading ? "연이가 편지를 쓰는 중이에요" : "꿀방울 10개로 연이의 꿀편지 받기"}
                  </TeaHouseButton>
                  {!honeyDrops?.authenticated ? (
                    <small>로그인하면 꿀방울을 모아 연이의 꿀편지를 받을 수 있어요.</small>
                  ) : honeyBalance < 10 ? (
                    <small>꿀방울이 조금 부족해요. 운명의 찻집 상담을 더 열어보면 꿀방울을 모을 수 있어요.</small>
                  ) : null}
                </div>
              )}

              {honeyLetterMessage ? <strong className={styles.honeyLetterStatus}>{honeyLetterMessage}</strong> : null}
            </div>
          </div>
        </section>

        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="closingResultTitle">
          <h3 id="closingResultTitle">마지막 한마디</h3>
          <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.yeoni.transparent.full} alt="" />
          <p className={styles.sajuSummary}>{result.closingLine}</p>
        </section>

        <div className={`${styles.resultActions} ${resultActionUi}`}>
          <TeaHouseButton onClick={onRestart}>다시 상담하기</TeaHouseButton>
          <TeaHouseButton variant="secondary" onClick={saveResultAsTextFile}>
            결과 저장
          </TeaHouseButton>
        </div>
        {saveStatus ? <strong className={styles.honeyLetterStatus} aria-live="polite">{saveStatus}</strong> : null}
      </article>
    </section>
  );
}
