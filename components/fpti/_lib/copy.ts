// saju-fpti(별자리 성향 연구소 FPTI) UI 크롬 공용 카피.
// 심층 리포트 챕터/섹션 본문(lib/fpti/premium-report.ts 의 buildFptiDeepReport 생성물)과
// FPTI_DICTIONARY/FPTI_AXIS_GUIDE 데이터(lib/fpti/fpti-dictionary.ts)는 로케일 무관 콘텐츠 생성/데이터라 대상이 아니다.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getFptiSharedCopy()가 EN과 병합해 자동 폴백한다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface FptiSharedCopy {
  elementBalanceTitle: string;
  elementStrongLabel: string;
  elementWeakLabel: string;

  relationshipStyleTitlePrefix: string;
  goodMatchLabel: string;
  cautionMatchLabel: string;

  shareCardTitle: string;
  shareCardCaption: string;
  shareTypeDescLabel: string;
  shareCopyIdle: string;
  shareCopyDone: string;
  shareToFriendLabel: string;
  shareText: (code: string, typeName: string, oneLiner: string) => string;

  strategyTitle: string;

  loadingHeadline: string;

  dictionaryTitle: string;
  dictionarySubtitle: string;
  dictionaryIntro1: string;
  dictionaryIntro2: string;
  dictionaryIntro3: string;
  currentTypePrefix: string;
  dictionaryCodeNotePrefix: string;
  unknownCodeHeading: string;
  hintHeading: string;
  hintBody: string;
  openDictionaryButton: string;
  openDictionaryAria: string;
  findMyTypeButton: string;
  findMyTypeAria: string;
  axisGuideSrTitle: string;
  allTypesEyebrow: string;
  allTypesHeading: string;
  matchingCount: (n: number) => string;
  searchSrLabel: string;
  searchPlaceholder: string;
  filtersAriaLabel: string;
  emptyResultsMessage: string;
  resultCodeLabel: string;
  currentTypeBadge: string;
  growthDirectionLabel: string;
  detailButtonLabel: string;
  detailButtonAria: (code: string, name: string) => string;
  faqEyebrow: string;
  faqHeading: string;
  faqItems: [string, string][];
  modalLegacyNote: (legacyCode: string, code: string) => string;
  modalCloseAria: string;
  modalCoreHeading: string;
  modalStrengthsTitle: string;
  modalCautionsTitle: string;
  modalFieldLabels: { relationship: string; work: string; money: string; growth: string; routine: string };
  modalCompatibleTitle: string;
  modalElementToneTitle: string;

  yourCodeLabel: string;
  accuracyGuideLabel: string;
  qualityLabels: { full: string; partial: string; fallback: string };
  axisCardLabels: Record<string, string>;
  axisCardFallback: string;
  codeSlotLabel: (n: number) => string;
  axisEnergyLabel: string;
  axisJudgmentLabel: string;
  axisExecutionLabel: string;
  axisVisionLabel: string;
  coreInterpretationHeading: string;
  freeSummaryHeading: string;
  freeSummaryTypeLabel: string;
  freeSummaryLabels: {
    coreTrait: string;
    loveStyle: string;
    workTalent: string;
    moneyRhythm: string;
    caution: string;
    growthAdvice: string;
  };
  coreSummaryHeading: string;
  topStrengthsHeading: string;
  cautionPointsHeading: string;
  premiumHeading: string;
  premiumDescription: string;
  alreadyUnlockedButton: string;
  accessCheckingMessage: string;
  statusLabel: string;
  statusUnlockedValue: string;
  statusPreviewValue: string;
  deepNoticeAlreadyUnlocked: string;
  deepNoticeJustUnlocked: string;
  errorLoginRequired: string;
  errorInsufficientBalance: string;
  errorPaymentFailedDefault: string;
  errorUnlockException: string;
  purchaseReason: string;
  chapterLockedBadge: string;
  chapterOpenLabel: string;
  chapterCollapseLabel: string;
  untitledSectionFallback: string;
  chapterLockedNotice: string;
  firstChapterPreviewNotice: string;
  currentChapterProgress: (n: number, total: number) => string;
  /** 해금된 심층 리포트를 PDF 로 내려받는 보너스 버튼용 문구 — 추가 과금이 아니므로 가격·결제 표현을 쓰지 않는다. */
  pdfButtonLabel: string;
  pdfButtonBusyLabel: string;
  pdfSavedNotice: string;
  pdfFailedNotice: string;
  pdfCoverTitle: string;
  pdfFileName: (code: string, date: string) => string;
}

const FPTI_SHARED_COPY_EN: FptiSharedCopy = {
  elementBalanceTitle: "Five-Element Energy Balance",
  elementStrongLabel: "Strongest element",
  elementWeakLabel: "Weakest element",

  relationshipStyleTitlePrefix: "How you relate to people",
  goodMatchLabel: "Great FPTI matches",
  cautionMatchLabel: "FPTI to be mindful of",

  shareCardTitle: "Share card",
  shareCardCaption: "Single SVG symbol card for your type",
  shareTypeDescLabel: "Type description:",
  shareCopyIdle: "Save my FPTI card",
  shareCopyDone: "Copied",
  shareToFriendLabel: "Share with a friend",
  shareText: (code, typeName, oneLiner) => `My Saju FPTI is ${code} (${typeName})!\n${oneLiner}\n#SajuFPTI #CodeDestiny`,

  strategyTitle: "Action strategy for growing your luck",

  loadingHeadline: "Interpreting your constellation temperament",

  dictionaryTitle: "FPTI Codex",
  dictionarySubtitle: "Your destiny pattern read through a four-letter temperament code",
  dictionaryIntro1: "FPTI is Code Destiny's temperament index — based on the flow of your Saju, it sums up your choice style, emotional response, relationship management, and how you handle reality into a four-letter temperament code.",
  dictionaryIntro2: "For example, AHFV reads as outward-moving energy, heart-centered judgment, a flexible flow, and a future-oriented outlook.",
  dictionaryIntro3: "This codex is a guide to help you understand your report more easily. Your actual result is interpreted in more detail together with the Saju flow calculated from your birth date and time.",
  currentTypePrefix: "My FPTI:",
  dictionaryCodeNotePrefix: "Shown in the codex as",
  unknownCodeHeading: "This temperament code is not yet registered in the codex.",
  hintHeading: "New to FPTI? Open the codex first.",
  hintBody: "Each code is built by combining your energy direction, judgment center, movement style, and how you handle reality.",
  openDictionaryButton: "Open FPTI Codex",
  openDictionaryAria: "Jump to the FPTI codex card grid",
  findMyTypeButton: "Find my type",
  findMyTypeAria: "Find my FPTI type card",
  axisGuideSrTitle: "How to read the 4-letter FPTI code",
  allTypesEyebrow: "Full FPTI Type Codex",
  allTypesHeading: "16 starlit coordinates",
  matchingCount: (n) => `${n} types found`,
  searchSrLabel: "Search by FPTI code, type name, or keyword",
  searchPlaceholder: "Search the codex by code, type name, or keyword",
  filtersAriaLabel: "FPTI codex filters",
  emptyResultsMessage: "No matching code found in the codex yet. Try observing with a different keyword.",
  resultCodeLabel: "Result code",
  currentTypeBadge: "My current type",
  growthDirectionLabel: "Growth direction:",
  detailButtonLabel: "View details",
  detailButtonAria: (code, name) => `View details for ${code} ${name}`,
  faqEyebrow: "FPTI FAQ",
  faqHeading: "What is FPTI?",
  faqItems: [
    ["Is FPTI the same as MBTI?", "No. FPTI is a destiny-temperament code Code Destiny built to make Saju-based temperament easy to understand."],
    ["Is my FPTI result fixed?", "Your base temperament is calculated from your birth details, but how it shows up in real life can shift with your environment and choices."],
    ["Is the codex description different from my actual report?", "The codex is a basic guide to help you understand the type. Your actual report is interpreted in more detail together with your own Saju flow."],
  ],
  modalLegacyNote: (legacyCode, code) => `Result code ${legacyCode} connects to the same energy direction as ${code} in the codex.`,
  modalCloseAria: "Close FPTI detail view",
  modalCoreHeading: "One-line summary",
  modalStrengthsTitle: "Strengths",
  modalCautionsTitle: "Things to watch",
  modalFieldLabels: {
    relationship: "Relationship style",
    work: "Work / business style",
    money: "Money sense",
    growth: "Growth advice",
    routine: "Recommended routine",
  },
  modalCompatibleTitle: "Compatible codes",
  modalElementToneTitle: "Five-element sense",

  yourCodeLabel: "Your FPTI Code",
  accuracyGuideLabel: "Accuracy guide",
  qualityLabels: {
    full: "Precise analysis",
    partial: "Partial precise analysis",
    fallback: "Basic pattern analysis",
  },
  axisCardLabels: {
    A: "Outward Expression",
    M: "Inward Accumulation",
    H: "Empathic Response",
    L: "Structural Judgment",
    F: "Free Exploration",
    B: "Order Building",
    R: "Grounded Realism",
    V: "Visionary Intuition",
  },
  axisCardFallback: "Composite meaning",
  codeSlotLabel: (n) => `Code ${n}`,
  axisEnergyLabel: "Energy axis",
  axisJudgmentLabel: "Judgment axis",
  axisExecutionLabel: "Execution axis",
  axisVisionLabel: "Vision axis",
  coreInterpretationHeading: "Core temperament interpretation",
  freeSummaryHeading: "Free Report Summary",
  freeSummaryTypeLabel: "Type",
  freeSummaryLabels: {
    coreTrait: "Core trait",
    loveStyle: "Love style",
    workTalent: "Work & talent",
    moneyRhythm: "Money rhythm",
    caution: "Watch out for",
    growthAdvice: "Growth advice",
  },
  coreSummaryHeading: "Core interpretation summary",
  topStrengthsHeading: "Top 3 strengths",
  cautionPointsHeading: "Points to watch",
  premiumHeading: "Unlock FPTI Deep Report (₩20,000)",
  premiumDescription: "Shows a preview before payment, then all 7 chapters after payment.",
  alreadyUnlockedButton: "Already unlocked",
  accessCheckingMessage: "Quickly checking your unlock status..",
  statusLabel: "Status:",
  statusUnlockedValue: "Full access",
  statusPreviewValue: "Preview",
  deepNoticeAlreadyUnlocked: "This report is already unlocked. Showing the full content.",
  deepNoticeJustUnlocked: "Unlock complete. All 7 chapters are now available.",
  errorLoginRequired: "Login required. Please log in and try again.",
  errorInsufficientBalance: "Insufficient balance for payment. Unlocking the deep report requires ₩20,000.",
  errorPaymentFailedDefault: "Payment processing failed. Please try again shortly.",
  errorUnlockException: "Something went wrong while unlocking the deep report. Please try again shortly.",
  purchaseReason: "FPTI Premium Report Generation",
  chapterLockedBadge: "Locked",
  chapterOpenLabel: "Open",
  chapterCollapseLabel: "Collapse",
  untitledSectionFallback: "Untitled",
  chapterLockedNotice: "🔒 This chapter is locked. Unlock the FPTI Deep Report to read the full text.",
  firstChapterPreviewNotice: "Chapter 1 is offered as a 1-2 sentence preview. Unlocking opens all 7 chapters.",
  currentChapterProgress: (n, total) => `Chapter ${n} of ${total}`,
  pdfButtonLabel: "Save as PDF",
  pdfButtonBusyLabel: "Preparing PDF…",
  pdfSavedNotice: "Your deep report has been saved as a PDF.",
  pdfFailedNotice: "We couldn't create the PDF. Please try again in a moment.",
  pdfCoverTitle: "Saju FPTI Deep Report",
  pdfFileName: (code, date) => `saju-fpti-${code}-${date}.pdf`,
};

const FPTI_SHARED_COPY: Partial<Record<LoadingLocale, FptiSharedCopy>> = {
  ko: {
    elementBalanceTitle: "오행 에너지 밸런스",
    elementStrongLabel: "강한 오행",
    elementWeakLabel: "부족한 오행",

    relationshipStyleTitlePrefix: "사람을 대하는 방식",
    goodMatchLabel: "잘 맞는 FPTI",
    cautionMatchLabel: "주의할 FPTI",

    shareCardTitle: "공유 카드",
    shareCardCaption: "유형 상징 SVG 단일 카드",
    shareTypeDescLabel: "유형 설명:",
    shareCopyIdle: "내 FPTI 카드 저장하기",
    shareCopyDone: "복사 완료",
    shareToFriendLabel: "친구에게 공유하기",
    shareText: (code, typeName, oneLiner) => `내 사주 FPTI는 ${code} (${typeName})!\n${oneLiner}\n#사주FPTI #코드데스티니`,

    strategyTitle: "운을 키우는 실행 전략",

    loadingHeadline: "별자리 성향을 해석 중입니다",

    dictionaryTitle: "FPTI 도감",
    dictionarySubtitle: "네 글자 성향 코드로 읽는 나의 운명 패턴",
    dictionaryIntro1: "FPTI는 사주의 흐름을 바탕으로 사람의 선택 방식, 감정 반응, 관계 운영, 현실 대응 방식을 네 글자의 성향 코드로 정리한 코드 데스티니식 운명 성향 지표입니다.",
    dictionaryIntro2: "예를 들어 AHFV는 밖으로 움직이는 에너지, 마음 중심 판단, 유연한 흐름, 미래 가능성을 가진 경향으로 읽습니다.",
    dictionaryIntro3: "이 도감은 결과 리포트의 해석을 더 쉽게 이해하기 위한 안내서입니다. 실제 결과에서는 생년월일시에서 계산된 사주 흐름과 함께 더 구체적으로 해석됩니다.",
    currentTypePrefix: "내 FPTI:",
    dictionaryCodeNotePrefix: "도감 표기",
    unknownCodeHeading: "아직 도감에 등록되지 않은 성향 코드입니다.",
    hintHeading: "FPTI가 낯설다면 먼저 도감을 열어보세요.",
    hintBody: "각 코드는 에너지 방향, 판단 중심, 움직임 방식, 현실 대응 방식을 조합해 만들어집니다.",
    openDictionaryButton: "FPTI 도감 열기",
    openDictionaryAria: "FPTI 도감 카드 그리드로 이동",
    findMyTypeButton: "내 유형 찾아보기",
    findMyTypeAria: "내 FPTI 유형 카드 찾아보기",
    axisGuideSrTitle: "FPTI 4글자 코드 읽는 법",
    allTypesEyebrow: "FPTI 전체 유형 도감",
    allTypesHeading: "16개의 별빛 좌표",
    matchingCount: (n) => `${n}개 유형 관측 중`,
    searchSrLabel: "FPTI 코드, 유형 이름, 키워드 검색",
    searchPlaceholder: "코드, 유형 이름, 키워드로 별자리 도감 검색",
    filtersAriaLabel: "FPTI 도감 필터",
    emptyResultsMessage: "아직 별자리 도감에서 해당 코드를 찾지 못했어요. 다른 키워드로 다시 관측해볼까요?",
    resultCodeLabel: "결과 코드",
    currentTypeBadge: "현재 나의 유형",
    growthDirectionLabel: "성장 방향:",
    detailButtonLabel: "자세히 보기",
    detailButtonAria: (code, name) => `${code} ${name} 자세히 보기`,
    faqEyebrow: "FPTI FAQ",
    faqHeading: "FPTI란?",
    faqItems: [
      ["FPTI는 MBTI와 같은 건가요?", "아닙니다. FPTI는 코드 데스티니에서 사주 흐름을 바탕으로 성향을 쉽게 이해하도록 만든 운명 성향 코드입니다."],
      ["FPTI 결과는 고정인가요?", "기본 성향은 출생 정보 기반으로 계산되지만, 실제 삶에서는 환경과 선택에 따라 표현 방식이 달라질 수 있습니다."],
      ["도감 설명과 실제 리포트는 다른가요?", "도감은 유형을 쉽게 이해하기 위한 기본 설명이고, 실제 리포트는 사용자의 사주 흐름과 함께 더 구체적으로 해석됩니다."],
    ],
    modalLegacyNote: (legacyCode, code) => `기존 결과 코드 ${legacyCode}는 도감의 ${code}와 같은 에너지 방향으로 연결됩니다.`,
    modalCloseAria: "FPTI 상세 설명 닫기",
    modalCoreHeading: "한 줄 핵심",
    modalStrengthsTitle: "강점",
    modalCautionsTitle: "주의할 점",
    modalFieldLabels: {
      relationship: "관계 스타일",
      work: "일/사업 스타일",
      money: "재물 감각",
      growth: "성장 조언",
      routine: "어울리는 루틴",
    },
    modalCompatibleTitle: "잘 맞는 코드",
    modalElementToneTitle: "오행 감각",

    yourCodeLabel: "당신의 FPTI 코드",
    accuracyGuideLabel: "정확도 가이드",
    qualityLabels: {
      full: "정밀 분석",
      partial: "부분 정밀 분석",
      fallback: "기본 패턴 분석",
    },
    axisCardLabels: {
      A: "외향 발산형",
      M: "내면 축적형",
      H: "감응 공감형",
      L: "구조 판단형",
      F: "자유 탐색형",
      B: "질서 구축형",
      R: "현실 감각형",
      V: "비전 직관형",
    },
    axisCardFallback: "복합 의미",
    codeSlotLabel: (n) => `코드 ${n}`,
    axisEnergyLabel: "에너지축",
    axisJudgmentLabel: "판단축",
    axisExecutionLabel: "실행축",
    axisVisionLabel: "전망축",
    coreInterpretationHeading: "운명 성향 핵심 해석",
    freeSummaryHeading: "무료 리포트 요약",
    freeSummaryTypeLabel: "유형",
    freeSummaryLabels: {
      coreTrait: "핵심 성향",
      loveStyle: "연애 스타일",
      workTalent: "일과 재능",
      moneyRhythm: "돈의 리듬",
      caution: "주의 약점",
      growthAdvice: "성장 조언",
    },
    coreSummaryHeading: "핵심 해석 요약",
    topStrengthsHeading: "핵심 성향 3가지",
    cautionPointsHeading: "주의 포인트",
    premiumHeading: "FPTI 심층 리포트 잠금 해제 (20,000원)",
    premiumDescription: "결제 전 미리보기, 결제 후 7개 챕터 전체 열람으로 동작합니다.",
    alreadyUnlockedButton: "이미 잠금 해제됨",
    accessCheckingMessage: "빠르게 잠금 해제 권한을 확인 중입니다..",
    statusLabel: "상태:",
    statusUnlockedValue: "전체 열람 가능",
    statusPreviewValue: "미리보기",
    deepNoticeAlreadyUnlocked: "이미 잠금 해제된 리포트입니다. 전체 내용을 표시합니다.",
    deepNoticeJustUnlocked: "잠금 해제가 완료되었습니다. 7개 챕터 전체를 열람할 수 있습니다.",
    errorLoginRequired: "로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
    errorInsufficientBalance: "결제 가능 금액이 부족합니다. 심층 리포트 잠금 해제에는 20,000원이 필요합니다.",
    errorPaymentFailedDefault: "결제 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    errorUnlockException: "심층 리포트 잠금 해제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    purchaseReason: "FPTI 프리미엄 리포트 생성",
    chapterLockedBadge: "잠금",
    chapterOpenLabel: "열기",
    chapterCollapseLabel: "접기",
    untitledSectionFallback: "제목 없음",
    chapterLockedNotice: "🔒 이 챕터는 잠금 상태입니다. FPTI 심층 리포트 잠금 해제 후 전체 본문을 볼 수 있습니다.",
    firstChapterPreviewNotice: "1챕터는 1~2문장 미리보기로 제공됩니다. 잠금 해제 시 7개 챕터 전체가 열립니다.",
    currentChapterProgress: (n, total) => `현재 ${n}/${total}장`,
    pdfButtonLabel: "PDF 저장",
    pdfButtonBusyLabel: "PDF 만드는 중…",
    pdfSavedNotice: "심층 리포트를 PDF로 저장했어요.",
    pdfFailedNotice: "PDF를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
    pdfCoverTitle: "사주 FPTI 심층 리포트",
    pdfFileName: (code, date) => `사주-FPTI-심층리포트-${code}-${date}.pdf`,
  },
  ja: {
    elementBalanceTitle: "五行エネルギーバランス",
    elementStrongLabel: "強い五行",
    elementWeakLabel: "不足している五行",

    relationshipStyleTitlePrefix: "人との関わり方",
    goodMatchLabel: "相性の良いFPTI",
    cautionMatchLabel: "注意したいFPTI",

    shareCardTitle: "シェアカード",
    shareCardCaption: "タイプ象徴のSVG単体カード",
    shareTypeDescLabel: "タイプ説明:",
    shareCopyIdle: "自分のFPTIカードを保存",
    shareCopyDone: "コピー完了",
    shareToFriendLabel: "友達にシェアする",
    shareText: (code, typeName, oneLiner) => `私の四柱推命FPTIは${code}(${typeName})！\n${oneLiner}\n#四柱推命FPTI #コードデスティニー`,

    strategyTitle: "運を伸ばす実行戦略",

    loadingHeadline: "星座の性向を解釈しています",

    dictionaryTitle: "FPTI図鑑",
    dictionarySubtitle: "4文字の性向コードで読む私の運命パターン",
    dictionaryIntro1: "FPTIは四柱推命の流れをもとに、選択の仕方、感情反応、関係の築き方、現実への対応方式を4文字の性向コードにまとめたコードデスティニー独自の運命性向指標です。",
    dictionaryIntro2: "例えばAHFVは、外向きに動くエネルギー、心を中心にした判断、柔軟な流れ、未来志向の傾向として読み取れます。",
    dictionaryIntro3: "この図鑑は結果レポートの解釈をより理解しやすくするためのガイドです。実際の結果では、生年月日時から計算された四柱の流れとあわせてより具体的に解釈されます。",
    currentTypePrefix: "私のFPTI:",
    dictionaryCodeNotePrefix: "図鑑表記",
    unknownCodeHeading: "まだ図鑑に登録されていない性向コードです。",
    hintHeading: "FPTIが初めてなら、まず図鑑を開いてみましょう。",
    hintBody: "各コードはエネルギーの方向、判断の中心、動き方、現実への対応方式を組み合わせて作られます。",
    openDictionaryButton: "FPTI図鑑を開く",
    openDictionaryAria: "FPTI図鑑カードグリッドへ移動",
    findMyTypeButton: "自分のタイプを探す",
    findMyTypeAria: "自分のFPTIタイプカードを探す",
    axisGuideSrTitle: "FPTI 4文字コードの読み方",
    allTypesEyebrow: "FPTI全タイプ図鑑",
    allTypesHeading: "16の星の座標",
    matchingCount: (n) => `${n}タイプ観測中`,
    searchSrLabel: "FPTIコード、タイプ名、キーワードで検索",
    searchPlaceholder: "コード、タイプ名、キーワードで星座図鑑を検索",
    filtersAriaLabel: "FPTI図鑑フィルター",
    emptyResultsMessage: "星座図鑑でまだ該当のコードが見つかりませんでした。別のキーワードで観測してみましょう。",
    resultCodeLabel: "結果コード",
    currentTypeBadge: "現在の私のタイプ",
    growthDirectionLabel: "成長の方向:",
    detailButtonLabel: "詳しく見る",
    detailButtonAria: (code, name) => `${code} ${name} を詳しく見る`,
    faqEyebrow: "FPTI FAQ",
    faqHeading: "FPTIとは？",
    faqItems: [
      ["FPTIはMBTIと同じですか？", "いいえ。FPTIはコードデスティニーが四柱推命の流れをもとに性向を理解しやすくするために作った運命性向コードです。"],
      ["FPTIの結果は固定ですか？", "基本的な性向は出生情報をもとに計算されますが、実際の人生では環境や選択によって表れ方が変わることがあります。"],
      ["図鑑の説明と実際のレポートは違いますか？", "図鑑はタイプを理解しやすくするための基本説明で、実際のレポートはあなたの四柱の流れとあわせてより具体的に解釈されます。"],
    ],
    modalLegacyNote: (legacyCode, code) => `既存の結果コード${legacyCode}は、図鑑の${code}と同じエネルギー方向につながります。`,
    modalCloseAria: "FPTI詳細説明を閉じる",
    modalCoreHeading: "ひと言サマリー",
    modalStrengthsTitle: "強み",
    modalCautionsTitle: "注意点",
    modalFieldLabels: {
      relationship: "関係スタイル",
      work: "仕事・ビジネススタイル",
      money: "お金の感覚",
      growth: "成長アドバイス",
      routine: "おすすめルーティン",
    },
    modalCompatibleTitle: "相性の良いコード",
    modalElementToneTitle: "五行の感覚",

    yourCodeLabel: "あなたのFPTIコード",
    accuracyGuideLabel: "精度ガイド",
    qualityLabels: {
      full: "精密分析",
      partial: "部分精密分析",
      fallback: "基本パターン分析",
    },
    axisCardLabels: {
      A: "外向発散型",
      M: "内面蓄積型",
      H: "感応共感型",
      L: "構造判断型",
      F: "自由探索型",
      B: "秩序構築型",
      R: "現実感覚型",
      V: "ビジョン直観型",
    },
    axisCardFallback: "複合的な意味",
    codeSlotLabel: (n) => `コード${n}`,
    axisEnergyLabel: "エネルギー軸",
    axisJudgmentLabel: "判断軸",
    axisExecutionLabel: "実行軸",
    axisVisionLabel: "展望軸",
    coreInterpretationHeading: "運命性向の核心解釈",
    freeSummaryHeading: "無料レポート要約",
    freeSummaryTypeLabel: "タイプ",
    freeSummaryLabels: {
      coreTrait: "核心の性向",
      loveStyle: "恋愛スタイル",
      workTalent: "仕事と才能",
      moneyRhythm: "お金のリズム",
      caution: "注意すべき弱点",
      growthAdvice: "成長アドバイス",
    },
    coreSummaryHeading: "核心解釈まとめ",
    topStrengthsHeading: "核心的な強み3つ",
    cautionPointsHeading: "注意ポイント",
    premiumHeading: "FPTI深層レポートのロック解除（20,000ウォン）",
    premiumDescription: "決済前はプレビュー、決済後は7章すべてを閲覧できます。",
    alreadyUnlockedButton: "ロック解除済み",
    accessCheckingMessage: "ロック解除権限を素早く確認しています..",
    statusLabel: "状態:",
    statusUnlockedValue: "全文閲覧可能",
    statusPreviewValue: "プレビュー",
    deepNoticeAlreadyUnlocked: "このレポートはすでにロック解除済みです。全文を表示します。",
    deepNoticeJustUnlocked: "ロック解除が完了しました。7章すべてを閲覧できます。",
    errorLoginRequired: "ログインが必要です。ログイン後にもう一度お試しください。",
    errorInsufficientBalance: "決済可能な金額が不足しています。深層レポートのロック解除には20,000ウォンが必要です。",
    errorPaymentFailedDefault: "決済処理に失敗しました。しばらくしてからもう一度お試しください。",
    errorUnlockException: "深層レポートのロック解除処理中に問題が発生しました。しばらくしてからもう一度お試しください。",
    purchaseReason: "FPTIプレミアムレポート生成",
    chapterLockedBadge: "ロック中",
    chapterOpenLabel: "開く",
    chapterCollapseLabel: "閉じる",
    untitledSectionFallback: "タイトルなし",
    chapterLockedNotice: "🔒 この章はロックされています。FPTI深層レポートのロック解除後に全文を読めます。",
    firstChapterPreviewNotice: "1章は1〜2文のプレビューとして提供されます。ロック解除で7章すべてが開きます。",
    currentChapterProgress: (n, total) => `現在 ${n}/${total}章`,
    pdfButtonLabel: "PDFで保存",
    pdfButtonBusyLabel: "PDFを作成中…",
    pdfSavedNotice: "詳細レポートをPDFで保存しました。",
    pdfFailedNotice: "PDFを作成できませんでした。しばらくしてからもう一度お試しください。",
    pdfCoverTitle: "四柱推命FPTI 詳細レポート",
    pdfFileName: (code, date) => `saju-fpti-${code}-${date}.pdf`,
  },
  "zh-CN": {
    elementBalanceTitle: "五行能量平衡",
    elementStrongLabel: "最强五行",
    elementWeakLabel: "最弱五行",

    relationshipStyleTitlePrefix: "待人方式",
    goodMatchLabel: "契合的 FPTI",
    cautionMatchLabel: "需留意的 FPTI",

    shareCardTitle: "分享卡片",
    shareCardCaption: "类型象征单张 SVG 卡片",
    shareTypeDescLabel: "类型说明：",
    shareCopyIdle: "保存我的 FPTI 卡片",
    shareCopyDone: "已复制",
    shareToFriendLabel: "分享给朋友",
    shareText: (code, typeName, oneLiner) => `我的八字 FPTI 是 ${code}（${typeName}）！\n${oneLiner}\n#八字FPTI #CodeDestiny`,

    strategyTitle: "提升运势的行动策略",

    loadingHeadline: "正在解读你的星座性向",

    dictionaryTitle: "FPTI 图鉴",
    dictionarySubtitle: "用四字性向代码解读我的命运模式",
    dictionaryIntro1: "FPTI 是 Code Destiny 基于八字流转，将选择方式、情绪反应、关系经营与现实应对方式归纳为四字性向代码的命运性向指标。",
    dictionaryIntro2: "例如 AHFV 可解读为向外发散的能量、以内心为中心的判断、灵活的流动性以及面向未来的倾向。",
    dictionaryIntro3: "本图鉴是帮助你更容易理解结果报告的指南。实际结果会结合出生日期与时间计算出的八字流转进行更具体的解读。",
    currentTypePrefix: "我的 FPTI：",
    dictionaryCodeNotePrefix: "图鉴标记为",
    unknownCodeHeading: "该性向代码尚未收录于图鉴中。",
    hintHeading: "第一次接触 FPTI？先打开图鉴看看吧。",
    hintBody: "每个代码都是由能量方向、判断中心、行动方式和现实应对方式组合而成。",
    openDictionaryButton: "打开 FPTI 图鉴",
    openDictionaryAria: "跳转到 FPTI 图鉴卡片网格",
    findMyTypeButton: "查找我的类型",
    findMyTypeAria: "查找我的 FPTI 类型卡片",
    axisGuideSrTitle: "如何解读 4 字 FPTI 代码",
    allTypesEyebrow: "FPTI 全类型图鉴",
    allTypesHeading: "16 个星光坐标",
    matchingCount: (n) => `找到 ${n} 个类型`,
    searchSrLabel: "按 FPTI 代码、类型名称或关键词搜索",
    searchPlaceholder: "按代码、类型名称或关键词搜索星座图鉴",
    filtersAriaLabel: "FPTI 图鉴筛选",
    emptyResultsMessage: "在星座图鉴中暂未找到对应代码，换个关键词再观测看看吧。",
    resultCodeLabel: "结果代码",
    currentTypeBadge: "我的当前类型",
    growthDirectionLabel: "成长方向：",
    detailButtonLabel: "查看详情",
    detailButtonAria: (code, name) => `查看 ${code} ${name} 的详情`,
    faqEyebrow: "FPTI 常见问题",
    faqHeading: "什么是 FPTI？",
    faqItems: [
      ["FPTI 和 MBTI 一样吗？", "不一样。FPTI 是 Code Destiny 基于八字流转打造的命运性向代码，旨在让人更容易理解自己的性向。"],
      ["FPTI 的结果是固定的吗？", "基础性向是根据出生信息计算得出的，但在实际生活中会随环境与选择而呈现不同的表现方式。"],
      ["图鉴说明和实际报告一样吗？", "图鉴是帮助理解类型的基础说明，实际报告会结合你的八字流转进行更具体的解读。"],
    ],
    modalLegacyNote: (legacyCode, code) => `原结果代码 ${legacyCode} 与图鉴中的 ${code} 指向相同的能量方向。`,
    modalCloseAria: "关闭 FPTI 详情说明",
    modalCoreHeading: "一句话核心",
    modalStrengthsTitle: "优势",
    modalCautionsTitle: "需要注意的地方",
    modalFieldLabels: {
      relationship: "关系风格",
      work: "工作/事业风格",
      money: "金钱观",
      growth: "成长建议",
      routine: "推荐routine",
    },
    modalCompatibleTitle: "契合的代码",
    modalElementToneTitle: "五行感",

    yourCodeLabel: "你的 FPTI 代码",
    accuracyGuideLabel: "准确度指南",
    qualityLabels: {
      full: "精密分析",
      partial: "部分精密分析",
      fallback: "基础模式分析",
    },
    axisCardLabels: {
      A: "外向发散型",
      M: "内在积累型",
      H: "感应共情型",
      L: "结构判断型",
      F: "自由探索型",
      B: "秩序建构型",
      R: "现实感知型",
      V: "愿景直觉型",
    },
    axisCardFallback: "复合含义",
    codeSlotLabel: (n) => `代码 ${n}`,
    axisEnergyLabel: "能量轴",
    axisJudgmentLabel: "判断轴",
    axisExecutionLabel: "执行轴",
    axisVisionLabel: "愿景轴",
    coreInterpretationHeading: "命运性向核心解读",
    freeSummaryHeading: "免费报告摘要",
    freeSummaryTypeLabel: "类型",
    freeSummaryLabels: {
      coreTrait: "核心性向",
      loveStyle: "恋爱风格",
      workTalent: "工作与才能",
      moneyRhythm: "金钱节奏",
      caution: "需注意的弱点",
      growthAdvice: "成长建议",
    },
    coreSummaryHeading: "核心解读摘要",
    topStrengthsHeading: "三大核心优势",
    cautionPointsHeading: "注意要点",
    premiumHeading: "解锁 FPTI 深度报告（20,000韩元）",
    premiumDescription: "付款前提供预览，付款后可阅读全部 7 个章节。",
    alreadyUnlockedButton: "已解锁",
    accessCheckingMessage: "正在快速确认解锁权限..",
    statusLabel: "状态：",
    statusUnlockedValue: "可完整阅读",
    statusPreviewValue: "预览",
    deepNoticeAlreadyUnlocked: "该报告已解锁，正在显示全部内容。",
    deepNoticeJustUnlocked: "解锁完成，现在可以阅读全部 7 个章节。",
    errorLoginRequired: "需要登录，请登录后重试。",
    errorInsufficientBalance: "可用支付余额不足，解锁深度报告需要 20,000 韩元。",
    errorPaymentFailedDefault: "支付处理失败，请稍后重试。",
    errorUnlockException: "解锁深度报告时出现问题，请稍后重试。",
    purchaseReason: "FPTI 高级报告生成",
    chapterLockedBadge: "已锁定",
    chapterOpenLabel: "展开",
    chapterCollapseLabel: "收起",
    untitledSectionFallback: "无标题",
    chapterLockedNotice: "🔒 本章节已锁定。解锁 FPTI 深度报告后可阅读全文。",
    firstChapterPreviewNotice: "第 1 章以 1-2 句预览形式提供，解锁后即可查看全部 7 个章节。",
    currentChapterProgress: (n, total) => `当前第 ${n}/${total} 章`,
    pdfButtonLabel: "保存为 PDF",
    pdfButtonBusyLabel: "正在生成 PDF…",
    pdfSavedNotice: "已将深度报告保存为 PDF。",
    pdfFailedNotice: "PDF 生成失败，请稍后再试。",
    pdfCoverTitle: "四柱 FPTI 深度报告",
    pdfFileName: (code, date) => `saju-fpti-${code}-${date}.pdf`,
  },
  "zh-TW": {
    elementBalanceTitle: "五行能量平衡",
    elementStrongLabel: "最強五行",
    elementWeakLabel: "最弱五行",

    relationshipStyleTitlePrefix: "待人方式",
    goodMatchLabel: "契合的 FPTI",
    cautionMatchLabel: "需留意的 FPTI",

    shareCardTitle: "分享卡片",
    shareCardCaption: "類型象徵單張 SVG 卡片",
    shareTypeDescLabel: "類型說明：",
    shareCopyIdle: "儲存我的 FPTI 卡片",
    shareCopyDone: "已複製",
    shareToFriendLabel: "分享給朋友",
    shareText: (code, typeName, oneLiner) => `我的八字 FPTI 是 ${code}（${typeName}）！\n${oneLiner}\n#八字FPTI #CodeDestiny`,

    strategyTitle: "提升運勢的行動策略",

    loadingHeadline: "正在解讀你的星座性向",

    dictionaryTitle: "FPTI 圖鑑",
    dictionarySubtitle: "用四字性向代碼解讀我的命運模式",
    dictionaryIntro1: "FPTI 是 Code Destiny 基於八字流轉，將選擇方式、情緒反應、關係經營與現實應對方式歸納為四字性向代碼的命運性向指標。",
    dictionaryIntro2: "例如 AHFV 可解讀為向外發散的能量、以內心為中心的判斷、靈活的流動性以及面向未來的傾向。",
    dictionaryIntro3: "本圖鑑是幫助你更容易理解結果報告的指南。實際結果會結合出生日期與時間計算出的八字流轉進行更具體的解讀。",
    currentTypePrefix: "我的 FPTI：",
    dictionaryCodeNotePrefix: "圖鑑標記為",
    unknownCodeHeading: "該性向代碼尚未收錄於圖鑑中。",
    hintHeading: "第一次接觸 FPTI？先打開圖鑑看看吧。",
    hintBody: "每個代碼都是由能量方向、判斷中心、行動方式和現實應對方式組合而成。",
    openDictionaryButton: "打開 FPTI 圖鑑",
    openDictionaryAria: "跳轉到 FPTI 圖鑑卡片網格",
    findMyTypeButton: "查找我的類型",
    findMyTypeAria: "查找我的 FPTI 類型卡片",
    axisGuideSrTitle: "如何解讀 4 字 FPTI 代碼",
    allTypesEyebrow: "FPTI 全類型圖鑑",
    allTypesHeading: "16 個星光座標",
    matchingCount: (n) => `找到 ${n} 個類型`,
    searchSrLabel: "按 FPTI 代碼、類型名稱或關鍵字搜尋",
    searchPlaceholder: "按代碼、類型名稱或關鍵字搜尋星座圖鑑",
    filtersAriaLabel: "FPTI 圖鑑篩選",
    emptyResultsMessage: "在星座圖鑑中暫未找到對應代碼，換個關鍵字再觀測看看吧。",
    resultCodeLabel: "結果代碼",
    currentTypeBadge: "我的目前類型",
    growthDirectionLabel: "成長方向：",
    detailButtonLabel: "查看詳情",
    detailButtonAria: (code, name) => `查看 ${code} ${name} 的詳情`,
    faqEyebrow: "FPTI 常見問題",
    faqHeading: "什麼是 FPTI？",
    faqItems: [
      ["FPTI 和 MBTI 一樣嗎？", "不一樣。FPTI 是 Code Destiny 基於八字流轉打造的命運性向代碼，旨在讓人更容易理解自己的性向。"],
      ["FPTI 的結果是固定的嗎？", "基礎性向是根據出生資訊計算得出的，但在實際生活中會隨環境與選擇而呈現不同的表現方式。"],
      ["圖鑑說明和實際報告一樣嗎？", "圖鑑是幫助理解類型的基礎說明，實際報告會結合你的八字流轉進行更具體的解讀。"],
    ],
    modalLegacyNote: (legacyCode, code) => `原結果代碼 ${legacyCode} 與圖鑑中的 ${code} 指向相同的能量方向。`,
    modalCloseAria: "關閉 FPTI 詳情說明",
    modalCoreHeading: "一句話核心",
    modalStrengthsTitle: "優勢",
    modalCautionsTitle: "需要注意的地方",
    modalFieldLabels: {
      relationship: "關係風格",
      work: "工作/事業風格",
      money: "金錢觀",
      growth: "成長建議",
      routine: "推薦習慣",
    },
    modalCompatibleTitle: "契合的代碼",
    modalElementToneTitle: "五行感",

    yourCodeLabel: "你的 FPTI 代碼",
    accuracyGuideLabel: "準確度指南",
    qualityLabels: {
      full: "精密分析",
      partial: "部分精密分析",
      fallback: "基礎模式分析",
    },
    axisCardLabels: {
      A: "外向發散型",
      M: "內在累積型",
      H: "感應共情型",
      L: "結構判斷型",
      F: "自由探索型",
      B: "秩序建構型",
      R: "現實感知型",
      V: "願景直覺型",
    },
    axisCardFallback: "複合含義",
    codeSlotLabel: (n) => `代碼 ${n}`,
    axisEnergyLabel: "能量軸",
    axisJudgmentLabel: "判斷軸",
    axisExecutionLabel: "執行軸",
    axisVisionLabel: "願景軸",
    coreInterpretationHeading: "命運性向核心解讀",
    freeSummaryHeading: "免費報告摘要",
    freeSummaryTypeLabel: "類型",
    freeSummaryLabels: {
      coreTrait: "核心性向",
      loveStyle: "戀愛風格",
      workTalent: "工作與才能",
      moneyRhythm: "金錢節奏",
      caution: "需注意的弱點",
      growthAdvice: "成長建議",
    },
    coreSummaryHeading: "核心解讀摘要",
    topStrengthsHeading: "三大核心優勢",
    cautionPointsHeading: "注意要點",
    premiumHeading: "解鎖 FPTI 深度報告（20,000韓元）",
    premiumDescription: "付款前提供預覽，付款後可閱讀全部 7 個章節。",
    alreadyUnlockedButton: "已解鎖",
    accessCheckingMessage: "正在快速確認解鎖權限..",
    statusLabel: "狀態：",
    statusUnlockedValue: "可完整閱讀",
    statusPreviewValue: "預覽",
    deepNoticeAlreadyUnlocked: "該報告已解鎖，正在顯示全部內容。",
    deepNoticeJustUnlocked: "解鎖完成，現在可以閱讀全部 7 個章節。",
    errorLoginRequired: "需要登入，請登入後重試。",
    errorInsufficientBalance: "可用支付餘額不足，解鎖深度報告需要 20,000 韓元。",
    errorPaymentFailedDefault: "支付處理失敗，請稍後重試。",
    errorUnlockException: "解鎖深度報告時發生問題，請稍後重試。",
    purchaseReason: "FPTI 高級報告生成",
    chapterLockedBadge: "已鎖定",
    chapterOpenLabel: "展開",
    chapterCollapseLabel: "收起",
    untitledSectionFallback: "無標題",
    chapterLockedNotice: "🔒 本章節已鎖定。解鎖 FPTI 深度報告後可閱讀全文。",
    firstChapterPreviewNotice: "第 1 章以 1-2 句預覽形式提供，解鎖後即可查看全部 7 個章節。",
    currentChapterProgress: (n, total) => `目前第 ${n}/${total} 章`,
    pdfButtonLabel: "儲存為 PDF",
    pdfButtonBusyLabel: "正在產生 PDF…",
    pdfSavedNotice: "已將深度報告儲存為 PDF。",
    pdfFailedNotice: "PDF 產生失敗，請稍後再試。",
    pdfCoverTitle: "四柱 FPTI 深度報告",
    pdfFileName: (code, date) => `saju-fpti-${code}-${date}.pdf`,
  },
  en: FPTI_SHARED_COPY_EN,
};

export function getFptiSharedCopy(locale: LoadingLocale): FptiSharedCopy {
  return { ...FPTI_SHARED_COPY_EN, ...(FPTI_SHARED_COPY[locale] || {}) };
}

export function useFptiSharedCopy(): FptiSharedCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("cd:locale-change", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
      window.removeEventListener("cd:locale-change", sync);
    };
  }, []);
  return getFptiSharedCopy(locale);
}
