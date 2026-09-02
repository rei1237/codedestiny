"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import { useLazySpriteSource, useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import type { FortuneTeaHouseConsultResponse, FortuneTeaHouseHoneyDropsState, FortuneTeaHouseHoneyLetter } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { getTeaHouseCupById, teaHouseCups } from "../data/teaCups";
import { majorArcanaCards } from "../data/tarotCards";
import { tenGodMetaMap } from "../data/tenGods";
import { sanitizeTeaHouseConsultResult } from "../lib/sanitizeConsultResult";
import { localizeConsultResult } from "../lib/localizeConsultResult";
import { tarotSpreadPositions } from "../lib/tarotAdapter";
import AssetImage from "./AssetImage";
import TarotAssetCard from "./TarotAssetCard";
import TeaCupVisual from "./TeaCupVisual";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import TeaHouseSajuResultPanel from "./TeaHouseSajuResultPanel";
import TeaHouseSajuCompatResultPanel from "./TeaHouseSajuCompatResultPanel";
import TeaHouseSukuyoResultPanel from "./TeaHouseSukuyoResultPanel";
import TenGodSymbolCard from "./TenGodSymbolCard";
import styles from "../styles/fortune-tea-house.module.css";

import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import { useLocale } from "@/lib/i18n/useT";
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
  "min-h-svh bg-[#210916] bg-[radial-gradient(circle_at_50%_-10%,rgba(255,236,244,0.2),transparent_34rem),radial-gradient(circle_at_12%_10%,rgba(179,25,85,0.18),transparent_30rem),radial-gradient(circle_at_90%_16%,rgba(234,208,137,0.14),transparent_28rem)] text-[#fff1f7] antialiased";
const resultSheetUi =
  "relative isolate overflow-hidden rounded-[26px] border border-[#f4bed1]/30 bg-[#24081a]/95 shadow-[0_42px_124px_rgba(31,3,18,0.58),0_0_74px_rgba(179,25,85,0.16),inset_0_1px_0_rgba(255,255,255,0.17)] ring-1 ring-white/10 backdrop-blur-2xl";
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

// 카드별 상세 해석 5항목. 순서와 라벨은 워커 프롬프트(tarotCardReadings)와 1:1로 맞춘다.
const tarotCardDetailFields = [
  { key: "coreMeaning", labelKey: "ki7hqs6v" as keyof typeof KO },
  { key: "currentSituation", labelKey: "kzqvnuoc" as keyof typeof KO },
  { key: "questionLink", labelKey: "kaxljiw2" as keyof typeof KO },
  { key: "advice", labelKey: "ksdv9yye" as keyof typeof KO },
  { key: "caution", labelKey: "ktw0azlc" as keyof typeof KO },
] as const;
const tarotCardPrimaryFields = tarotCardDetailFields.slice(0, 3);
const tarotCardActionFields = tarotCardDetailFields.slice(3);

// 값이 아니라 KO 의 키를 담는다 — 모듈 최상위라 훅을 못 부른다.
const tarotChoiceTitleByCupId: Record<string, keyof typeof KO> = {
  "lotus-moon": "kz5q84hf",
  "honey-peach": "ksigatsf",
  "star-black-tea": "k8pjt6np",
  "gold-cinnamon": "knggqolm",
  "white-lotus-healing": "kzpuejo8",
  "black-moon-brown-rice": "kmci2l4t",
};

function choiceCountLabel(count: number, copy: typeof KO) {
  if (count === 1) return copy.kttxsf1q;
  if (count === 2) return copy.kpvpeqg2;
  if (count === 3) return copy.kuwzgcrf;
  if (count === 4) return copy.k8ue7gye;
  return copy.countSuffix.replace("{count}", String(count));
}

function consultationModeLabel(mode: string | undefined, copy: typeof KO) {
  if (mode === "saju") return copy.kqntggo7;
  if (mode === "sukuyo") return copy.kfngvjey;
  return copy.k5lsiszf;
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

// 사용자가 복사·저장하는 공유 텍스트다. 화면 문구와 같은 성격이라 로케일을 따른다.
function buildFortuneTeaHouseResultText(result: FortuneTeaHouseConsultResponse, copy: typeof KO, locale: string) {
  const mode = result.consultationMode || "tarot";
  const lines = [
    copy.k2mxkfg0,
    "",
    copy.shareCup.replace("{title}", result.sessionTitle),
    copy.shareTime.replace("{time}", new Date().toLocaleString(locale)),
    copy.shareSeat.replace("{mode}", consultationModeLabel(mode, copy)),
    copy.shareQuestion.replace("{question}", result.questionSummary),
    copy.shareChosenCup.replace("{cup}", result.teaCup.name).replace("{topic}", result.teaCup.topic),
  ];

  appendTextBlock(lines, copy.ka47r65q, result.teaCup.reading);

  if (mode === "tarot") {
    const direction = result.tarot.orientation === "upright" ? copy.ko8qlqfx : copy.k2jfbomz;
    appendTextBlock(lines, copy.klnt7csr, `${result.tarot.nameKo} · ${direction} · ${result.tarot.keywords.join(" · ")}\n${result.tarot.reading}`);
    if (result.tarotSpreadCards?.length) {
      lines.push("", copy.ky0fmfv5);
      result.tarotSpreadCards.forEach((card, index) => {
        lines.push(`${index + 1}. ${card.positionLabel} - ${card.nameKo} (${card.orientation === "upright" ? copy.upright : copy.reversed})`);
        if (card.positionMeaning) lines.push(card.positionMeaning);
        if (card.detail) {
          tarotCardDetailFields.forEach((field) => {
            const value = card.detail?.[field.key];
            if (value) lines.push(`- ${copy[field.labelKey]}: ${value}`);
          });
        } else if (card.reading) {
          lines.push(card.reading);
        }
        lines.push("");
      });
    }
    if (result.cardInteractions?.length) {
      lines.push("", copy.k3leg4rw);
      result.cardInteractions.forEach((interaction) => {
        lines.push(`- ${interaction.pair}: ${interaction.insight}`);
      });
    }
    if (result.heartScent?.name) {
      appendTextBlock(
        lines,
        copy.kuw6bcuo,
        `${result.heartScent.name}${result.heartScent.category ? ` ${copy.scentCategory.replace("{category}", result.heartScent.category)}` : ""}\n${result.heartScent.reason}`,
      );
    }
  }

  if (mode === "saju") {
    appendTextBlock(lines, result.saju.title || copy.kmzndx3y, result.saju.summary);
    appendListBlock(lines, copy.k2l0bmt8, result.saju.keyPoints);
    if (result.saju.deepSections?.length) {
      lines.push("", copy.kbat7tsb);
      result.saju.deepSections.forEach((section, index) => {
        lines.push(`${index + 1}. ${section.title}`, section.body, "");
      });
    }
    appendTextBlock(lines, copy.kec2xdxn, result.saju.cautionReading || result.saju.caution);
    appendTextBlock(lines, copy.ksb1sui4, result.saju.actionPrescription || result.saju.oneLineAdvice);
  }

  if (mode === "sukuyo" && result.sukuyoCompatibility) {
    const sukuyo = result.sukuyoCompatibility;
    appendTextBlock(lines, sukuyo.title || copy.kmayyz6o, sukuyo.summary);
    appendListBlock(lines, copy.kdif4ckr, sukuyo.strengths);
    appendListBlock(lines, copy.knczo1x5, sukuyo.cautions);
    appendListBlock(lines, copy.kbps8xvk, sukuyo.adviceKeywords);
    if (sukuyo.roleGuide) {
      appendTextBlock(lines, copy.kjkazywc, `${copy.roleMine.replace("{action}", sukuyo.roleGuide.userAction)}\n${copy.rolePartner.replace("{action}", sukuyo.roleGuide.partnerAction)}`);
    }
  }

  appendTextBlock(lines, result.synthesis.title, `${result.synthesis.summary}\n${result.synthesis.sajuTarotBridge}`);
  appendTextBlock(lines, copy.khyilnqh, [result.yeoniReading.intro, result.yeoniReading.main, result.yeoniReading.advice, result.yeoniReading.caution].filter(Boolean).join("\n\n"));

  if (result.choiceSimulation.length) {
    lines.push("", copy.klhtmvkl);
    result.choiceSimulation.forEach((choice, index) => {
      lines.push(`${index + 1}. ${choice.title} - ${choice.subtitle}`, choice.result, copy.shareCaution.replace("{caution}", choice.caution), "");
    });
  }

  appendTextBlock(lines, copy.ksfdsbyx, result.actionPrescription);
  appendListBlock(lines, copy.k38h08or, result.luckyKeywords);
  if (result.honeyLetter) appendTextBlock(lines, result.honeyLetter.title || copy.kykvjtg8, result.honeyLetter.body);
  appendTextBlock(lines, copy.kqhu9dwn, result.closingLine);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

/** 십성 데이터에서 사전이 덮으면 안 되는 필드. id 는 판별자, colorTone 은 CSS 토큰이다. */
const TEN_GOD_SKIP_KEYS = ["id", "colorTone"];
/* 찻잔 상수의 id·CSS 토큰은 문구가 아니다. 배선 목록은 docs/handoff/fortune-tea-house-i18n.md 함정 9 참고. */
const CUP_SKIP_KEYS = ["id", "particleTone", "accent"];
/* 카드 정체성(id·영문명)과 주제 매칭용 힌트는 화면 문구가 아니다 — nameKo·keywords·meaning 만 사전을 탄다. */
const CONSULT_CARD_SKIP_KEYS = ["id", "nameEn", "topicHints"];
const SPREAD_POSITION_SKIP_KEYS = ["positionId"];

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const KO = {
  cardOrdinal: "{index}번째 카드 ·",
  choicePathTitle: "지금 선택할 수 있는 {count} 길",
  countSuffix: "{count}가지",
  cupLensSaju: "{cup}은 {topic}의 관점에서 질문을 바라보게 합니다. 연이는 그 향 위에 타로를 올리지 않고, 사주의 기본 흐름만 차분히 펼쳤습니다.",
  cupLensSukuyo: "{cup}은 {topic}의 관점에서 두 사람의 질문을 바라보게 합니다. 연이는 그 향 위에 타로와 사주를 올리지 않고, 27숙 인연의 흐름만 차분히 펼쳤습니다.",
  cupLensTarot: "{cup}은 {topic}의 관점에서 질문을 바라보게 합니다. 연이는 그 향 위에 사주를 올리지 않고, 타로의 현재 상징만 깊게 읽었습니다.",
  downloadFileName: "운명의-찻집-{title}-{date}.txt",
  honeyBalanceLine: "보유 꿀방울: {count}개",
  honeyCount: "{count}개",
  k18rmff7: "대표 카드",
  k1wxcqdd: "연이가 읽은 타로의 장면",
  k1yctvqg: "가까워지는 속도와 회복 간격을 함께 살핍니다.",
  k258gcap: "사주 정보 없음",
  k2dheb5q: "찻잔과 27숙의 거리가 두 사람 사이의 흐름을 비춥니다.",
  k2jfbomz: "역방향",
  k2l0bmt8: "사주 핵심",
  k2mxkfg0: "운명의 찻집에서 연이가 남긴 말",
  k2sy0hhr: "마음의 향을 맡는 꽃돼지 연이",
  k2xzjg8o: "오늘의 기준",
  k38h08or: "오늘의 키워드",
  k3k21kkw: "연이가 읽은 마음의 결",
  k3k8dasb: "거리감",
  k3leg4rw: "[카드가 서로에게 건네는 말]",
  k3zbz4mk: "지금 질문에 먼저 떠오른 카드입니다.",
  k5lsiszf: "타로 상담",
  k6eloopo: "카드가 서로에게 건네는 말",
  k6pvwcnm: "카드가 권한 다음 행동 플랜",
  k70ozsbh: "꿀방울이 조금 부족해요. 운명의 찻집 상담을 더 열어보면 꿀방울을 모을 수 있어요.",
  k8pjt6np: "14일 실행 플랜",
  k8ue7gye: "네 가지",
  k9ad09zt: "상담 결과 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
  k9yumrok: "두 사람의 본명숙과 관계 거리를 중심으로 읽습니다.",
  ka47r65q: "찻잔의 향",
  kaenglpz: "상담 방식",
  kajgl3vw: "이 카드의 조언과 주의점 더 보기",
  katfuayw: "오늘은 숙요점 궁합의 확인된 결을 중심으로, 두 사람이 덜 다치게 가까워지는 다음 한 걸음을 살핍니다.",
  kaxljiw2: "질문과의 연결",
  kbat7tsb: "[사주 깊은 흐름]",
  kbjbxpri: "연이가 읽은 사주의 결",
  kbjwmh4s: "오늘 함께 찻잔을 열어줘서 고마워요.\n필요한 순간에 이 말만 조용히 떠올려 주세요.",
  kbps8xvk: "숙요 조언 키워드",
  kbsnqume: "관계 유형",
  kcepagod: "두 사람의 본명숙을 확인합니다.",
  kcsdr29w: "핵심 기운",
  kcvmzreq: "카드는 한 장씩 볼 때와 겹쳐 볼 때 다른 이야기를 합니다. 두 장이 만났을 때만 드러나는 결을 함께 읽었어요.",
  kd74esn1: "달빛 거리",
  kdaff0ix: "인간 상담사 연이가 읽어 준 오늘의 찻잔",
  kdbdx9nr: "연이가 꿀방울을 모아 편지를 쓰는 중이에요.",
  kdfxgroy: "사주의 중심 상징",
  kdif4ckr: "인연의 힘",
  kdo9dh9f: "연이가 꿀방울을 톡톡 모아, 오늘의 상담 끝에 손님 마음으로만 닿는 편지를 써줄게요.",
  kec2xdxn: "주의할 결",
  kedjmzci: "오늘의 작은 처방",
  kenztqzw: "27숙 거리와 관계 리듬 중심",
  ketc5uik: "선택된 카드와 현재 질문 중심",
  kf6jifh5: "연이가 타로를 섞지 않고, 사주의 드러난 흐름만 따라 상담을 펼쳤습니다.",
  kfngvjey: "숙요점 궁합 상담",
  kfo31gf6: "사주의 중심 기운",
  kfqrxlz3: "오늘은 사주의 확인된 결을 중심으로, 마음이 덜 다치게 움직일 수 있는 다음 한 걸음을 살핍니다.",
  kft10a9l: "두 사람의 숙요 거리를 조용히 살핍니다.",
  kgadbuzz: "두 사람의 명식 대조 중심",
  kgmrpa72: "연이가 편지를 쓰는 중이에요",
  kgvbkgor: "카드 상징",
  kgzwphxn: "사주 궁합",
  khebg0os: "로그인하면 꿀방울을 모아 연이의 꿀편지를 받을 수 있어요.",
  khnbjp0r: "연이의 꿀편지가 도착했어요.",
  khvssutl: "사주",
  khvyisuj: "결과 저장",
  khyilnqh: "연이가 건넨 말",
  ki7hqs6v: "핵심 의미",
  kj7r9fgs: "상담을 마치고 감사 인사를 건네는 연이",
  kjkazywc: "두 사람의 작은 역할",
  kjloqzzq: "연이가 편지를 끝까지 묶지 못했어요. 꿀방울은 그대로 지켜둘게요.",
  kjwi7efm: "연이가 사주를 섞지 않고, 카드와 지금 적어주신 질문의 향을 한 장의 상담 기록으로 엮었습니다.",
  kkn8datm: "숙요점 궁합",
  kl1lj6o9: "출생정보와 기본 기운 중심",
  klemgto9: "세부 사주 흐름은 만들지 않고 현재 질문 중심으로 읽습니다.",
  klfpmjsj: "대표",
  klhtmvkl: "[지금 선택할 수 있는 길]",
  klnt7csr: "타로가 보여준 지금의 장면",
  klx2uhdh: "오늘 붙잡을 말",
  km4yfhh5: "선택된 타로 카드",
  kmayyz6o: "27숙 인연의 흐름",
  kmci2l4t: "72시간 안정 플랜",
  kmwzacvr: "바로 할 일",
  kmzndx3y: "사주가 말하는 흐름",
  knczo1x5: "조심할 결",
  knfcqar0: "출생정보 없음",
  knggqolm: "30일 금전 회복 플랜",
  kno9czau: "입력 정보 기준",
  ko5toogb: "사주가 말하는 기본 흐름",
  ko7hwtgc: "오늘은 현재 고민과 카드의 상징을 중심으로, 마음이 덜 다치게 움직일 수 있는 다음 한 걸음을 살핍니다.",
  ko8qlqfx: "정방향",
  kp3udmzq: "다시 상담하기",
  kpmsdgrf: "오늘 먼저 붙잡을 것",
  kpvpeqg2: "두 가지",
  kq4huqsk: "타로의 중심 상징",
  kqhu9dwn: "마지막 한마디",
  kqntggo7: "사주 상담",
  krcu0fyn: "배열 흐름",
  ks0lanlt: "연이가 이어 읽은 타로의 결",
  ksb1sui4: "사주 행동 처방",
  ksb3xyuj: "결과에 놓인 타로 카드",
  ksdv9yye: "조언",
  ksezsmsq: "질문의 중심",
  ksfdsbyx: "행동 처방",
  ksigatsf: "7일 썸 리듬 플랜",
  ksnr4vsd: "27숙 관계",
  kst4ojam: "연이가 이어 읽은 사주의 결",
  ktcuqb8w: "상담 결과를 텍스트 파일로 저장했어요.",
  kts5mr5k: "이 자리는 지금 질문에서 가장 먼저 살필 장면을 가리킵니다.",
  kttxsf1q: "한 가지",
  ktw0azlc: "주의할 점",
  kublwiza: "꿀방울 10개로 연이의 꿀편지 받기",
  kuc2fthf: "확인된 사주 정보 안에서 오늘의 기준을 읽습니다.",
  kuw6bcuo: "오늘 당신의 마음의 향",
  kuwufcwj: "연이가 이어 읽은 인연의 결",
  kuwzgcrf: "세 가지",
  kvfqzxf5: "찻잔이 먼저 말한 것",
  kvihkyt0: "연이가 타로와 사주를 섞지 않고, 두 사람의 27숙 인연의 흐름만 따라 상담을 펼쳤습니다.",
  kvsndfs4: "연이가 이미 편지를 쓰고 있어요. 잠시만 기다려 주세요.",
  kvtknz3h: "찻잔과 사주의 드러난 흐름이 오늘 붙잡을 기준을 비춥니다.",
  kwh1jimt: "출생정보가 충분하지 않아 오늘은 보이는 정보와 지금 적어주신 고민의 결만 차분히 살핍니다.",
  kwhmd4k8: "관계 조율",
  kwtrvys7: "찻잔과 카드의 상징이 지금 마음의 방향을 비춥니다.",
  kwxbfnz8: "선택한 찻잔",
  kxej1zgo: "거리 확인",
  ky0fmfv5: "[펼쳐진 타로 스프레드]",
  kyj3pk8r: "타로",
  kykvjtg8: "연이의 꿀편지",
  kythmj75: "숙요점 궁합의 중심 상징",
  kytzswpf: "연이가 맡은 마음의 향",
  kyv3bqjg: "연이의 꿀편지를 다시 펼쳤어요.",
  kz0araih: "연이가 읽은 27숙 인연의 흐름",
  kz5q84hf: "7일 행동 플랜",
  kzfpztzp: "인연",
  kzgth9gl: "확인된 정보와 현재 질문의 결을 중심으로 읽었습니다.",
  kzpuejo8: "7일 회복 루틴",
  kzqvnuoc: "현재 상황에서의 의미",
  kzr8vqho: "입력된 출생정보 안에서 보이는 흐름만 읽습니다.",
  pdfButton: "PDF 저장",
  pdfButtonBusy: "PDF 만드는 중…",
  pdfFailed: "PDF 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
  pdfFileName: "운명의-찻집-{title}-{date}.pdf",
  pdfSaved: "상담 결과를 PDF로 저장했어요.",
  relationTemp: "{percent}%의 관계 온도",
  reversed: "역방향",
  roleMine: "나: {action}",
  rolePartner: "상대: {action}",
  scentCategory: "({category}의 결)",
  scentCategoryLabel: "{category}의 결",
  shareCaution: "조심할 점: {caution}",
  shareChosenCup: "선택한 찻잔: {cup} · {topic}",
  shareCup: "오늘의 찻잔: {title}",
  shareQuestion: "손님이 건넨 질문: {question}",
  shareSeat: "연이가 펼친 자리: {mode}",
  shareTime: "차를 따른 시간: {time}",
  spreadCount: "{count}장 리딩",
  upright: "정방향",
};

export default function TeaHouseResultSheet({
  result: rawResult,
  onRestart,
  onShowTarot,
  onEditBirthInfo,
  honeyDrops,
  onHoneyDropsChange,
  onResultUpdate,
}: TeaHouseResultSheetProps) {
  const copy = useTeaHouseCopy("resultSheet", KO);
  const tenGodMeta = useTeaHouseCopy("tenGods", tenGodMetaMap, { skipKeys: TEN_GOD_SKIP_KEYS });
  const locale = useLocale();
  const cups = useTeaHouseCopy("teaCups", teaHouseCups, { skipKeys: CUP_SKIP_KEYS });
  const consultCards = useTeaHouseCopy("consultTarotCards", majorArcanaCards, { skipKeys: CONSULT_CARD_SKIP_KEYS });
  const spreadPositions = useTeaHouseCopy("tarotSpreadPositions", tarotSpreadPositions, { skipKeys: SPREAD_POSITION_SKIP_KEYS });
  // 저장/캐시된 오염 결과(객체 값·빈 문자열·문자열 퍼센트)도 크래시 없이 렌더되도록 1회 정규화하고,
  // 이어서 결정론 조각(찻잔·카드 정체성·스프레드 위치)을 사전 값으로 갈아끼운다.
  // 🔴 payload 는 그대로 둔다 — 저장·공유·워커 프롬프트의 정본은 계속 한국어 id 데이터다.
  const result = useMemo(
    () => localizeConsultResult(sanitizeTeaHouseConsultResult(rawResult), {
      cups,
      cards: consultCards,
      positions: spreadPositions,
      representativePosition: { positionLabel: copy.klfpmjsj, positionMeaning: copy.k3zbz4mk },
    }),
    [rawResult, cups, consultCards, spreadPositions, copy.klfpmjsj, copy.k3zbz4mk],
  );
  const [honeyLetterLoading, setHoneyLetterLoading] = useState(false);
  const [honeyLetterMessage, setHoneyLetterMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const resultSheetRef = useRef<HTMLElement>(null);
  const [activeTarotCardIndex, setActiveTarotCardIndex] = useState(0);
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
  // 스프라이트 로딩 전에도 빈 무대 대신 정적 컷아웃을 먼저 보여준다 (로딩 지연 시 공백 방지).
  const resultYeoniSpriteSource = resultYeoniProbe.isLoaded
    ? resultYeoniProbe.resolvedSrc
    : fortuneTeaHouseAssets.yeoni.transparent.bust;
  const resultPigSpriteSource = resultPigProbe.isLoaded
    ? resultPigProbe.resolvedSrc
    : fortuneTeaHouseAssets.cutout.flowerPig;
  const consultationMode = result.consultationMode || "tarot";
  const isTarotMode = consultationMode === "tarot";
  const isSajuCompatMode = consultationMode === "sajuCompatibility";
  // 사주 궁합은 사주 딥리딩 chrome을 그대로 공유한다(사주 계열). 궁합 전용 구조는 isSajuCompatMode로 추가한다.
  const isSajuMode = consultationMode === "saju" || isSajuCompatMode;
  const isSukuyoMode = consultationMode === "sukuyo";
  const direction = result.tarot.orientation === "upright" ? copy.ko8qlqfx : copy.k2jfbomz;
  const tarotSpreadCards = result.tarotSpreadCards?.length
    ? result.tarotSpreadCards
    : [
        {
          ...result.tarot,
          positionId: "representative",
          positionLabel: copy.klfpmjsj,
          positionMeaning: copy.k3zbz4mk,
          reading: result.tarot.reading,
        },
      ];
  const visibleTarotCardIndex = Math.min(activeTarotCardIndex, tarotSpreadCards.length - 1);
  const cardInteractions = isTarotMode ? result.cardInteractions || [] : [];
  const heartScent = isTarotMode ? result.heartScent : undefined;
  const selectedCup = getTeaHouseCupById(result.teaCup.id);
  const resultPrelude = result.teaCup.resultPrelude || selectedCup?.resultPrelude || result.teaCup.reading;
  const yeoniOpening = isSajuMode
    ? copy.kf6jifh5
    : isSukuyoMode
      ? copy.kvihkyt0
    : selectedCup?.resultPrelude || copy.kjwi7efm;
  const saju = result.saju || {
    available: false,
    title: copy.ko5toogb,
    summary: copy.kwh1jimt,
    keyPoints: [copy.kzgth9gl],
  };
  const sukuyo = result.sukuyoCompatibility;
  const synthesis = result.synthesis || {
    title: isSajuMode ? copy.kbjbxpri : isSukuyoMode ? copy.kz0araih : copy.k1wxcqdd,
    summary: isSajuMode
      ? copy.kvtknz3h
      : isSukuyoMode
        ? copy.k2dheb5q
        : copy.kwtrvys7,
    sajuTarotBridge: isSajuMode
      ? copy.kfqrxlz3
      : isSukuyoMode
        ? copy.katfuayw
      : copy.ko7hwtgc,
  };
  const tenGodSnapshot = saju.tenGodSnapshot;
  const primaryTenGodId = saju.primaryTenGod?.id || (tenGodSnapshot?.available ? tenGodSnapshot.primaryTenGod : undefined);
  const primaryTenGodMeta = primaryTenGodId ? tenGodMeta[primaryTenGodId] : null;
  const honeyLetter = result.honeyLetter;
  const honeyBalance = honeyDrops?.currentHoneyDrops ?? honeyDrops?.balance ?? 0;
  const canRequestHoneyLetter = Boolean(result.resultId && honeyDrops?.authenticated && honeyBalance >= 10 && !honeyLetter && !honeyLetterLoading);
  const previewKeywords = result.luckyKeywords.slice(0, 3);
  const resultThanksLine = copy.kbjwmh4s;
  const choiceSimulationTitle = isTarotMode
    ? copy[tarotChoiceTitleByCupId[result.teaCup.id]] || copy.k6pvwcnm
    : copy.choicePathTitle.replace("{count}", choiceCountLabel(result.choiceSimulation.length, copy));
  const firstChoice = result.choiceSimulation[0];
  const priorityCards = isSajuMode
    ? [
        {
          label: copy.kcsdr29w,
          title: saju.dayMaster || primaryTenGodMeta?.nameKo || copy.kno9czau,
          body: primaryTenGodMeta?.roleInTeaHouse || saju.summary || copy.kuc2fthf,
        },
        {
          label: copy.k2xzjg8o,
          title: result.luckyKeywords[0] || result.teaCup.topic,
          body: saju.oneLineAdvice || result.closingLine,
        },
        {
          label: copy.kmwzacvr,
          title: firstChoice?.title || copy.kedjmzci,
          body: firstChoice?.result || result.actionPrescription,
        },
      ]
    : isSukuyoMode
      ? [
          {
            label: copy.kbsnqume,
            title: sukuyo?.relationType || copy.kzfpztzp,
            body: sukuyo?.summary || copy.k9yumrok,
          },
          {
            label: copy.k3k8dasb,
            title: sukuyo?.distanceLabel || copy.kd74esn1,
            body: sukuyo?.relationDetail?.typeAToB || sukuyo?.cautions?.[0] || copy.k1yctvqg,
          },
          {
            label: copy.kmwzacvr,
            title: firstChoice?.title || copy.kwhmd4k8,
            body: firstChoice?.result || result.actionPrescription,
          },
        ]
      : [
          {
            label: copy.kgvbkgor,
            title: `${result.tarot.nameKo} · ${direction}`,
            body: result.tarot.keywords.join(" · "),
          },
          {
            label: tarotSpreadCards.length > 1 ? copy.krcu0fyn : copy.ksezsmsq,
            title: tarotSpreadCards.length > 1 ? copy.spreadCount.replace("{count}", String(tarotSpreadCards.length)) : tarotSpreadCards[0]?.positionLabel || copy.k18rmff7,
            body: tarotSpreadCards.length > 1 ? tarotSpreadCards.map((card) => card.positionLabel).join(" · ") : result.tarot.reading,
          },
          {
            label: copy.kmwzacvr,
            title: firstChoice?.title || copy.kedjmzci,
            body: firstChoice?.result || result.actionPrescription,
          },
        ];

  async function requestHoneyLetter() {
    if (!result.resultId || honeyLetterLoading) return;
    setHoneyLetterLoading(true);
    setHoneyLetterMessage(copy.kdbdx9nr);
    try {
      const idempotencyKey = `yeoni-honey-letter:${result.resultId}`;
      const response = await authFetch("/api/fortune-tea-house/results/honey-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: result.resultId, idempotencyKey }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as HoneyLetterApiResponse;
      if (!response.ok || !payload.success || !payload.honeyLetter) {
        if (payload.errorCode === "INSUFFICIENT_TEA_HOUSE_HONEY_DROPS") {
          setHoneyLetterMessage(copy.k70ozsbh);
          return;
        }
        if (payload.errorCode === "UNAUTHORIZED") {
          setHoneyLetterMessage(copy.khebg0os);
          return;
        }
        if (payload.errorCode === "YEONI_HONEY_LETTER_IN_PROGRESS") {
          setHoneyLetterMessage(copy.kvsndfs4);
          return;
        }
        setHoneyLetterMessage(copy.kjloqzzq);
        return;
      }
      if (payload.honeyDrops) onHoneyDropsChange(payload.honeyDrops);
      onResultUpdate({ ...result, honeyLetter: payload.honeyLetter });
      setHoneyLetterMessage(payload.alreadyApplied ? copy.kyv3bqjg : copy.khnbjp0r);
    } catch {
      setHoneyLetterMessage(copy.kjloqzzq);
    } finally {
      setHoneyLetterLoading(false);
    }
  }

  function saveResultAsTextFile() {
    try {
      const text = buildFortuneTeaHouseResultText(result, copy, locale);
      const blob = new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = copy.downloadFileName.replace("{title}", safeFilePart(result.sessionTitle)).replace("{date}", date);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setSaveStatus(copy.ktcuqb8w);
    } catch {
      setSaveStatus(copy.k9ad09zt);
    }
  }

  // 이미 결제가 끝난 상담 결과를 그대로 내려받는 무료 부가기능이다 — 버튼에 가격·결제 문구를 붙이지 않는다.
  // 캡처 대상은 마커(data-tea-pdf-section)를 붙인 본문 섹션뿐이라 하단 버튼 줄과 꿀편지 CTA는 빠진다.
  // 접힌 영역이 없어 펼치기·rAF 대기가 필요 없고, data-export 는 게이지 등장 애니메이션만 끈다
  // (html2canvas 는 클론 문서에서 @keyframes 를 t=0 부터 다시 시작해 `both` 의 0% 프레임을 찍는다).
  async function saveResultAsPdf() {
    const sheet = resultSheetRef.current;
    if (!sheet || pdfBusy) return;
    setPdfBusy(true);
    sheet.setAttribute("data-export", "true");
    try {
      const date = new Date().toISOString().slice(0, 10);
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["[data-tea-pdf-section]"],
        fileName: copy.pdfFileName.replace("{title}", safeFilePart(result.sessionTitle)).replace("{date}", date),
        backgroundColor: "#1a102c",
        cover: {
          title: result.sessionTitle,
          subtitle: result.questionSummary,
          date,
        },
      });
      setSaveStatus(copy.pdfSaved);
    } catch {
      setSaveStatus(copy.pdfFailed);
    } finally {
      sheet.removeAttribute("data-export");
      setPdfBusy(false);
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
            "--result-yeoni-bg-size": resultYeoniGate.isMobile || !resultYeoniProbe.isLoaded ? "contain" : "400% 200%",
            "--result-yeoni-bg-position": resultYeoniGate.isMobile || !resultYeoniProbe.isLoaded ? "center" : "0% 0%",
          } as CSSProperties}
          role="img"
          aria-label={copy.kj7r9fgs}
        />
        <TeaHouseDialogueBox speaker="연이" text={resultThanksLine} />
      </aside>

      <article
        ref={resultSheetRef}
        className={`${styles.resultSheet} ${resultSheetUi}`}
        data-mode={consultationMode}
      >
        <header className={`${styles.resultHeader} ${resultHeaderUi}`} data-tea-pdf-section>
          <picture className={styles.resultHeroArtwork} aria-hidden="true">
            <source media="(max-width: 640px)" srcSet={fortuneTeaHouseAssets.premium.resultReadingMobile} />
            <img src={fortuneTeaHouseAssets.premium.resultReadingDesktop} alt="" loading="eager" decoding="async" />
          </picture>
          {selectedCup ? <TeaCupVisual cup={selectedCup} state="selected" size="large" className={styles.resultHeaderCup} /> : null}
          <p className={styles.sceneEyebrow}>{selectedCup?.eyebrow || copy.kdaff0ix}</p>
          <h2 id="teaResultTitle">{result.sessionTitle}</h2>
          {result.questionSummary ? <p>{result.questionSummary}</p> : null}
          <strong className={styles.resultYeoniOpening}>{yeoniOpening}</strong>
          {result.yeoniReading.intro ? (
            <div className={styles.resultHeroGreeting}>
              <LlmParagraphs text={result.yeoniReading.intro} />
            </div>
          ) : null}
        </header>

        <div className={styles.resultSummaryGrid} data-tea-pdf-section>
          <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
            <span>{copy.kwxbfnz8}</span>
            <strong>{result.teaCup.name}</strong>
            <p>{result.teaCup.topic}</p>
          </div>
          <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
            <span>{copy.kaenglpz}</span>
            <strong>
              {isSajuCompatMode ? copy.kgzwphxn : isSajuMode ? copy.khvssutl : isSukuyoMode ? copy.kkn8datm : copy.kyj3pk8r}
            </strong>
            <p>{isSajuCompatMode ? copy.kgadbuzz : isSajuMode ? copy.kl1lj6o9 : isSukuyoMode ? copy.kenztqzw : copy.ketc5uik}</p>
          </div>
          {isTarotMode ? (
            <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
              <span>{copy.km4yfhh5}</span>
              <strong>
                {result.tarot.nameKo} · {direction}
              </strong>
              <p>{result.tarot.keywords.join(" · ")}</p>
            </div>
          ) : isSukuyoMode ? (
            <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
              <span>{copy.ksnr4vsd}</span>
              <strong>{sukuyo?.relationType || copy.kzfpztzp} · {sukuyo?.distanceLabel || copy.kxej1zgo}</strong>
              <p>{[sukuyo?.user.sukuyoName, sukuyo?.partner.sukuyoName].filter(Boolean).join(" · ") || copy.kcepagod}</p>
            </div>
          ) : (
            <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
              <span>{copy.kfo31gf6}</span>
              <strong>{primaryTenGodMeta ? primaryTenGodMeta.nameKo : copy.k258gcap}</strong>
              <p>{primaryTenGodMeta ? primaryTenGodMeta.roleInTeaHouse : copy.kzr8vqho}</p>
            </div>
          )}
          <div className={`${resultGlassCardUi} ${resultLiftCardUi}`}>
            <span>{copy.klx2uhdh}</span>
            <strong>{previewKeywords.slice(0, 2).join(" · ")}</strong>
            <p>{previewKeywords.slice(2).join(" · ") || previewKeywords.join(" · ")}</p>
          </div>
        </div>

        <section className={`${styles.resultPriorityStrip} ${resultGlassCardUi}`} aria-labelledby="resultPriorityTitle" data-tea-pdf-section>
          <h3 id="resultPriorityTitle">{copy.kpmsdgrf}</h3>
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

        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="teaCupTopicTitle" data-tea-pdf-section>
          <h3 id="teaCupTopicTitle">{copy.kvfqzxf5}</h3>
          <LlmParagraphs text={resultPrelude} pClassName={styles.sajuSummary} />
          <p className={styles.sajuCaution}>
            {isSajuMode
              ? copy.cupLensSaju.replace("{cup}", result.teaCup.name).replace("{topic}", result.teaCup.topic)
              : isSukuyoMode
                ? copy.cupLensSukuyo.replace("{cup}", result.teaCup.name).replace("{topic}", result.teaCup.topic)
              : copy.cupLensTarot.replace("{cup}", result.teaCup.name).replace("{topic}", result.teaCup.topic)}
          </p>
        </section>

        {isSajuCompatMode ? <TeaHouseSajuCompatResultPanel result={result} /> : null}
        {isSajuMode ? <TeaHouseSajuResultPanel result={result} onShowTarot={onShowTarot} onEditBirthInfo={onEditBirthInfo} showTarotAction={false} /> : null}
        {isSukuyoMode ? <TeaHouseSukuyoResultPanel result={result} /> : null}

        {isTarotMode ? (
        <section className={`${styles.resultBlock} ${styles.resultTarotShowcase} ${resultGlassCardUi}`} aria-labelledby="tarotResultTitle">
          <h3 id="tarotResultTitle">{copy.klnt7csr}</h3>
          <div className={styles.resultTarotGallery} aria-label={copy.ksb3xyuj}>
            {tarotSpreadCards.map((card, index) => (
              <article
                className={`${styles.resultTarotGalleryCard} ${resultLiftCardUi}`}
                key={`${card.positionId}-${card.cardId}`}
                data-active={index === visibleTarotCardIndex}
                role="button"
                aria-pressed={index === visibleTarotCardIndex}
                tabIndex={0}
                onClick={() => setActiveTarotCardIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveTarotCardIndex(index);
                  }
                }}
                aria-label={`${card.positionLabel} ${card.nameKo} ${card.orientation === "upright" ? copy.upright : copy.reversed}`}
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
            {tarotSpreadCards.map((card, index) => (
              <article
                className={`${styles.resultTarotReadingCard} ${resultReadingCardUi}`}
                data-active={index === visibleTarotCardIndex}
                key={`${card.positionId}-${card.cardId}-reading`}
              >
                <span>{copy.cardOrdinal.replace("{index}", String(index + 1))} {card.positionLabel}</span>
                <strong>{card.nameKo} · {card.orientation === "upright" ? copy.ko8qlqfx : copy.k2jfbomz}</strong>
                <p>{card.positionMeaning || copy.kts5mr5k}</p>
                {card.detail ? (
                  <dl className={styles.resultTarotDetailList}>
                    {tarotCardPrimaryFields.map((field) =>
                      card.detail?.[field.key] ? (
                        <div className={styles.resultTarotDetailItem} data-field={field.key} key={field.key}>
                          <dt>{copy[field.labelKey]}</dt>
                          <dd><LlmParagraphs text={card.detail[field.key]} /></dd>
                        </div>
                      ) : null,
                    )}
                    {tarotCardActionFields.some((field) => card.detail?.[field.key]) ? (
                      <details className={styles.resultTarotDetailDisclosure}>
                        <summary>{copy.kajgl3vw}</summary>
                        {tarotCardActionFields.map((field) =>
                          card.detail?.[field.key] ? (
                            <div className={styles.resultTarotDetailItem} data-field={field.key} key={field.key}>
                              <dt>{copy[field.labelKey]}</dt>
                              <dd><LlmParagraphs text={card.detail[field.key]} /></dd>
                            </div>
                          ) : null,
                        )}
                      </details>
                    ) : null}
                  </dl>
                ) : (
                  // 카드별 상세 해석이 도입되기 전에 저장된 결과의 폴백.
                  <LlmParagraphs text={card.reading || result.tarot.reading} />
                )}
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {isTarotMode && cardInteractions.length ? (
        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="tarotInteractionTitle">
          <h3 id="tarotInteractionTitle">{copy.k6eloopo}</h3>
          <p className={styles.resultInteractionLead}>
            
            {copy.kcvmzreq}
          </p>
          <div className={styles.resultInteractionList}>
            {cardInteractions.map((interaction, index) => (
              <article className={`${styles.resultInteractionCard} ${resultReadingCardUi}`} key={`${interaction.pair}-${index}`}>
                <strong>{interaction.pair}</strong>
                <LlmParagraphs text={interaction.insight} />
              </article>
            ))}
          </div>
        </section>
        ) : null}

        <section className={`${styles.resultBlock} ${styles.synthesisBlock} ${resultGlassCardUi}`} aria-labelledby="synthesisResultTitle" data-tea-pdf-section>
          <h3 id="synthesisResultTitle">{synthesis.title}</h3>
          <div className={styles.synthesisVisualPair} aria-label={isSajuMode ? copy.kdfxgroy : isSukuyoMode ? copy.kythmj75 : copy.kq4huqsk}>
            {isSukuyoMode ? (
              <div className={styles.synthesisSukuyo}>
                <AssetImage src={fortuneTeaHouseAssets.consultModes.sukuyo} alt={copy.kmayyz6o} />
                <div>
                  <span>{sukuyo?.relationType || copy.kzfpztzp}</span>
                  <strong>{sukuyo?.distanceLabel || copy.kd74esn1}</strong>
                  <p>{sukuyo?.compatibilityIndex ? copy.relationTemp.replace("{percent}", String(sukuyo.compatibilityIndex)) : copy.kft10a9l}</p>
                </div>
              </div>
            ) : null}
            {isSajuMode && primaryTenGodId ? (
              <TenGodSymbolCard tenGodId={primaryTenGodId} size="sm" showDescription={false} selected />
            ) : isSajuMode ? (
              <div className={styles.synthesisUnavailableSaju}>
                <span>{copy.khvssutl}</span>
                <strong>{copy.knfcqar0}</strong>
                <p>{copy.klemgto9}</p>
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
          <LlmParagraphs text={synthesis.summary} />
          {synthesis.sajuTarotBridge ? <strong>{synthesis.sajuTarotBridge}</strong> : null}
        </section>

        <section className={styles.resultBlock} aria-labelledby="emotionResultTitle" data-tea-pdf-section>
          <h3 id="emotionResultTitle">{copy.kytzswpf}</h3>
          <div className={styles.resultEmotionPigStage}>
            <span className={styles.resultEmotionPigGlow} aria-hidden />
            <span
              ref={resultPigGate.ref}
              className={styles.resultEmotionPigSprite}
              data-playback={resultPigGate.canAnimate && !resultPigGate.isMobile && resultPigProbe.isLoaded ? "animated" : "static"}
              data-sprite-status={resultPigProbe.status}
              style={{
                "--result-pig-sprite": resultPigSpriteSource ? `url("${resultPigSpriteSource}")` : "none",
                "--result-pig-bg-size": resultPigGate.isMobile || !resultPigProbe.isLoaded ? "contain" : "400% 400%",
                "--result-pig-bg-position": resultPigGate.isMobile || !resultPigProbe.isLoaded ? "center" : "0% 0%",
              } as CSSProperties}
              role="img"
              aria-label={copy.k2sy0hhr}
            />
          </div>
          {heartScent?.name ? (
            <article className={`${styles.resultScentCard} ${resultReadingCardUi}`}>
              <span>{copy.kuw6bcuo}</span>
              <strong>{heartScent.name}</strong>
              {heartScent.category ? <em className={styles.resultScentCategory}>{copy.scentCategoryLabel.replace("{category}", heartScent.category)}</em> : null}
              <LlmParagraphs text={heartScent.reason} />
            </article>
          ) : null}
          {heartScent?.name ? <h4 className={styles.resultEmotionSubTitle}>{copy.k3k21kkw}</h4> : null}
          <div className={styles.resultEmotionList}>
            {result.emotionAnalysis.map((item, index) => (
              <div className={styles.resultEmotionItem} data-tone={item.tone} key={item.label || String(index)}>
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

        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="yeoniReadingTitle" data-tea-pdf-section>
          <h3 id="yeoniReadingTitle">{isSajuMode ? copy.kst4ojam : isSukuyoMode ? copy.kuwufcwj : copy.ks0lanlt}</h3>
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
            {result.yeoniReading.main ? (
              <div className={styles.yeoniReadingItem}>
                <LlmParagraphs text={result.yeoniReading.main} />
              </div>
            ) : null}
            <AssetImage
              className={styles.resultSectionMascot}
              src={fortuneTeaHouseAssets.pig.transparent.base2}
              fallbackSrc={fortuneTeaHouseAssets.cutout.flowerPig}
              alt=""
            />
            {result.yeoniReading.advice ? (
              <div className={styles.yeoniReadingItem}>
                <LlmParagraphs text={result.yeoniReading.advice} />
              </div>
            ) : null}
            {result.yeoniReading.caution ? (
              <div className={styles.yeoniReadingItem}>
                <LlmParagraphs text={result.yeoniReading.caution} />
              </div>
            ) : null}
          </div>
        </section>

        <section className={styles.resultBlock} aria-labelledby="choiceSimulationTitle" data-tea-pdf-section>
          <h3 id="choiceSimulationTitle">{choiceSimulationTitle}</h3>
          <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.cutout.flowerPig} alt="" />
          <div className={styles.choiceGrid}>
            {result.choiceSimulation.map((choice) => (
              <article className={`${styles.choiceCard} ${resultReadingCardUi} ${resultLiftCardUi}`} key={choice.id || choice.title}>
                {choice.subtitle ? <span>{choice.subtitle}</span> : null}
                <h4>{choice.title}</h4>
                <LlmParagraphs text={choice.result} />
                {choice.caution ? <strong>{choice.caution}</strong> : null}
              </article>
            ))}
          </div>
        </section>

        {result.actionPrescription || previewKeywords.length ? (
        <section className={`${styles.actionPrescription} ${resultGlassCardUi}`} aria-labelledby="actionPrescriptionTitle" data-tea-pdf-section>
          <h3 id="actionPrescriptionTitle">{copy.kedjmzci}</h3>
          <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.consultModes[consultationMode] || fortuneTeaHouseAssets.cutout.flowerPig} alt="" />
          {result.actionPrescription ? (
            <div className={styles.yeoniReadingItem}>
              <LlmParagraphs text={result.actionPrescription} />
            </div>
          ) : null}
          {previewKeywords.length ? (
            <div className={styles.luckyKeywordList}>
              {previewKeywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          ) : null}
        </section>
        ) : null}

        <section className={`${styles.resultBlock} ${styles.honeyLetterBlock}`} aria-labelledby="honeyLetterTitle">
          <div className={styles.honeyLetterLayout}>
            <div className={styles.honeyLetterMascotWrap} aria-hidden>
              <AssetImage className={styles.honeyLetterMascot} src={fortuneTeaHouseAssets.rewards.flowerPigHoneyHug} alt="" />
              <span className={styles.honeyLetterBalance}>
                <AssetImage className={styles.honeyLetterIcon} src={fortuneTeaHouseAssets.rewards.honeyDrop} fallbackSrc={fortuneTeaHouseAssets.rewards.honeyDrop2} alt="" />
                {copy.honeyCount.replace("{count}", String(honeyBalance))}
              </span>
            </div>
            <div className={styles.honeyLetterContent}>
              <div className={styles.honeyLetterHeader}>
                <div>
                  <span>{copy.honeyBalanceLine.replace("{count}", String(honeyBalance))}</span>
                  <h3 id="honeyLetterTitle">{copy.kykvjtg8}</h3>
                </div>
              </div>

              {/* 마커는 받은 편지에만 붙인다 — 아래 꿀 CTA(재화 안내)는 PDF 에 담지 않는다. */}
              {honeyLetter ? (
                <article className={styles.honeyLetterCard} aria-live="polite" data-tea-pdf-section>
                  <h4>{honeyLetter.title || copy.kykvjtg8}</h4>
                  {/* 편지는 문단 분할 없이 원문 개행 그대로 (white-space: pre-line) */}
                  <p>{honeyLetter.body}</p>
                </article>
              ) : (
                <div className={styles.honeyLetterCta}>
                  <p>
                    
                    {copy.kdo9dh9f}
                  </p>
                  <TeaHouseButton onClick={requestHoneyLetter} disabled={!canRequestHoneyLetter}>
                    {honeyLetterLoading ? copy.kgmrpa72 : copy.kublwiza}
                  </TeaHouseButton>
                  {!honeyDrops?.authenticated ? (
                    <small>{copy.khebg0os}</small>
                  ) : honeyBalance < 10 ? (
                    <small>{copy.k70ozsbh}</small>
                  ) : null}
                </div>
              )}

              {honeyLetterMessage ? <strong className={styles.honeyLetterStatus}>{honeyLetterMessage}</strong> : null}
            </div>
          </div>
        </section>

        {result.closingLine ? (
        <section className={`${styles.resultBlock} ${resultGlassCardUi}`} aria-labelledby="closingResultTitle" data-tea-pdf-section>
          <h3 id="closingResultTitle">{copy.kqhu9dwn}</h3>
          <AssetImage className={styles.resultSectionMascot} src={fortuneTeaHouseAssets.yeoni.transparent.bust} alt="" />
          <div className={styles.yeoniReadingItem}>
            <LlmParagraphs text={result.closingLine} pClassName={styles.sajuSummary} />
          </div>
        </section>
        ) : null}

        <div className={`${styles.resultActions} ${resultActionUi}`}>
          <TeaHouseButton onClick={onRestart}>{copy.kp3udmzq}</TeaHouseButton>
          <TeaHouseButton variant="secondary" onClick={saveResultAsTextFile}>
            
            {copy.khvyisuj}
          </TeaHouseButton>
          {/* 타로는 앨범(DestinyCafeTarotAlbum)이 자체 PDF 를 갖고 있어 여기서 버튼을 세우지 않는다. */}
          {isTarotMode ? null : (
            <TeaHouseButton variant="secondary" onClick={saveResultAsPdf} loading={pdfBusy}>
              {pdfBusy ? copy.pdfButtonBusy : copy.pdfButton}
            </TeaHouseButton>
          )}
        </div>
        {saveStatus ? <strong className={styles.honeyLetterStatus} aria-live="polite">{saveStatus}</strong> : null}
      </article>
    </section>
  );
}
