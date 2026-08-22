// /nakshatra 클러스터 전체가 공유하는 로케일 카피.
//
// 🔴 이 파일은 여러 컴포넌트가 공유하지만 그 컴포넌트들을 import 하지 않는 독립 모듈이다 —
//    순환참조 없이 어디서든 안전하게 가져다 쓸 수 있다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface NakshatraFormCopy {
  formAria: string;
  formTitle: string;
  formIntro: string;
  savedCardsLabel: string;
  birthDateLegend: string;
  solarTag: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  lunarConvertedNote: string;
  birthTimeLegend: string;
  birthTimeHint: string;
  hourLabel: string;
  minuteLabel: string;
  timeUnknownLabel: string;
  birthPlaceLegend: string;
  birthPlacePlaceholder: string;
  geocodingStatus: string;
  birthPlaceHintDefault: string;
  birthPlaceHintNote: string;
  cardMissingBirthDateError: string;
  invalidBirthDateError: string;
  resolveApiError: string;
  networkError: string;
  geoFallbackSeoulError: string;
  geoUnstableError: string;
  submitLoading: string;
  submitIdle: string;
  disclaimer: string;
}

export interface NakshatraPremiumPartsCopy {
  needBirthBodyLine1: string;
  needBirthBodyLine2: string;
  needBirthLinkLabel: string;
  unlockGateNote: string;
  genderPromptTitle: string;
  genderPromptDefaultNote: string;
  genderMale: string;
  genderFemale: string;
  errorLogin: string;
  errorDegraded: string;
  errorFailed: string;
  errorPayment: string;
}

export interface NakshatraLordReportCopy {
  backLink: string;
  title: string;
  lede: string;
  checkingStatus: string;
  priceLabelKo: string;
  priceLabelOther: string;
  buyButtonLoading: string;
  buyButtonIdle: string;
  loadingStatusReading: string;
  loadingStatusPreparing: string;
  metaTemplate: string;
  gateBullets: string[];
  crossSellTitle: string;
  crossSellText: string;
  crossSellCta: string;
  disclaimer: string;
}

export interface NakshatraDashaMapCopy {
  backLink: string;
  title: string;
  lede: string;
  checkingStatus: string;
  priceLabelKo: string;
  priceLabelOther: string;
  buyButtonLoading: string;
  buyButtonIdle: string;
  loadingStatusReading: string;
  loadingStatusPreparing: string;
  metaTemplate: string;
  gateBullets: string[];
  nowBadge: string;
  mapTitleTemplate: string;
  mapNoteBase: string;
  mapNoteNoGenderSuffix: string;
  crossSellTitle: string;
  crossSellText: string;
  crossSellCta: string;
  disclaimer: string;
}

export interface NakshatraVvipCopy {
  backLink: string;
  title: string;
  lede: string;
  genderPromptNote: string;
  gatePriceKo: string;
  gatePriceOther: string;
  gateNote: string;
  gateBullets: string[];
  buyButtonPaying: string;
  buyButtonBuilding: string;
  buyButtonIdle: string;
  retryButtonLoading: string;
  retryButtonIdle: string;
  errorLoginRequired: string;
  errorConnectionUnstableRetry: string;
  errorGenericFailed: string;
  errorPaymentFailed: string;
  errorPdfSaveFailed: string;
  tocAriaLabel: string;
  tocTitle: string;
  myPositionBadge: string;
  pdfButtonSaving: string;
  pdfButtonIdle: string;
  disclaimer: string;
  metaTemplate: string;
}

export interface NakshatraCompatCopy {
  myTitle: string;
  partnerTitle: string;
  invitedLockedBadge: string;
  namePlaceholder: string;
  yearPlaceholder: string;
  monthPlaceholder: string;
  dayPlaceholder: string;
  hourPlaceholder: string;
  minutePlaceholder: string;
  timeUnknownLabel: string;
  genderNotSet: string;
  genderMale: string;
  genderFemale: string;
  invalidBirthDatesError: string;
  paymentNotCompletedError: string;
  loginRequiredError: string;
  connectionUnstableRetryError: string;
  genericFailedError: string;
  needMyBirthDateError: string;
  retryButtonLoading: string;
  retryButtonIdle: string;
  submitButtonLoading: string;
  submitButtonVerifying: string;
  submitButtonIdleKo: string;
  submitButtonIdleOther: string;
  linkCopiedLabel: string;
  copyInviteLabel: string;
  footerNote: string;
  resultEyebrow: string;
  convergenceHeading: string;
  indiaHeading: string;
  easternHeading: string;
  chemistryLabel: string;
  stabilityLabel: string;
  conflictLabel: string;
  indiaScoreNote: string;
  resetButton: string;
  resultFooterNote: string;
}

export interface NakshatraResultPaidProductCopy {
  title: string;
  priceKo: string;
  priceOther: string;
  desc: string;
}

export interface NakshatraResultCopy {
  notFoundTitle: string;
  notFoundBody: string;
  notFoundLink: string;
  viewTabBoth: string;
  viewTabEast: string;
  viewTabIndia: string;
  viewTabUnified: string;
  viewSwitchAria: string;
  headerEyebrow: string;
  padaChipTemplate: string;
  padaChipUnknown: string;
  eastHeading: string;
  eastHeadingSuffix: string;
  indiaHeading: string;
  indiaHeadingSuffix: string;
  rowNatalName: string;
  rowDirection: string;
  rowSevenLuminary: string;
  rowSevenLuminaryHint: string;
  rowFourSymbol: string;
  strengthsLabel: string;
  shadowsLabel: string;
  easternExpertHeading: string;
  rowNakshatra: string;
  rowLord: string;
  rowLordHint: string;
  rowGana: string;
  rowGanaHint: string;
  rowYoni: string;
  rowYoniHint: string;
  rowNadi: string;
  rowNadiHint: string;
  rowMotive: string;
  rowMotiveHint: string;
  rowPada: string;
  rowPadaHint: string;
  rowPadaUnknown: string;
  rowCurrentDasha: string;
  rowCurrentDashaHint: string;
  indianExpertHeading: string;
  unifiedHeading: string;
  boundaryLabel: string;
  convergenceLabel: string;
  divergenceLabel: string;
  todayMoonHeading: string;
  calcBasisHeading: string;
  ayanamsaLabel: string;
  siderealMoonLabel: string;
  birthLabel: string;
  timeUnknownSuffix: string;
  padaFooterLabel: string;
  disclaimer: string;
  backLink: string;
  upsellHeading: string;
  upsellIntro: string;
  viewNowLabel: string;
  comingSoonLabel: string;
  paidProducts: {
    compat: NakshatraResultPaidProductCopy;
    lordReport: NakshatraResultPaidProductCopy;
    dashaMap: NakshatraResultPaidProductCopy;
    muhurta: NakshatraResultPaidProductCopy;
    ai: NakshatraResultPaidProductCopy;
    vvip: NakshatraResultPaidProductCopy;
  };
}

export interface NakshatraAiCopy {
  generationFailedError: string;
  generationSlowError: string;
  loginRequiredError: string;
  readingInProgressStatus: string;
  connectionUnstableRetryStatus: string;
  checkingPassStatus: string;
  tryAgainShortlyError: string;
  checkingPaymentMethodStatus: string;
  paymentOrPassFailedError: string;
  networkFailedToStartError: string;
  needBirthTitle: string;
  needBirthBody: string;
  calculateMyStarLink: string;
  introEyebrowSuffix: string;
  introTitle: string;
  introBodyFallbackIdentity: string;
  introBodySuffix: string;
  questionLabel: string;
  questionOptionalHint: string;
  questionPlaceholder: string;
  baseChartLabel: string;
  baseChartTimeUnknownSuffix: string;
  startButtonLabel: string;
  passNote: string;
  stepAnalyzeNakshatra: string;
  stepAnalyzeSukuyo: string;
  stepFusionInterpretation: string;
  stepPracticalAdvice: string;
  headlinePayment: string;
  headlineChecking: string;
  headlineGenerating: string;
  waitingDefaultStatus: string;
  progressStepsAria: string;
  progressCountTemplate: string;
  progressIntro: string;
}

export interface NakshatraAiDecksCopy {
  fallbackTitle: string;
  scaleUnitSuffix: string;
  scaleCharsTemplate: string;
  splitSectionHeading: string;
  vedicDeckName: string;
  vedicDeckSub: string;
  sukuyoDeckName: string;
  sukuyoDeckSub: string;
  fusionSectionHeading: string;
  topInsightsHeading: string;
  footerNote: string;
}

export interface NakshatraCopy {
  form: NakshatraFormCopy;
  premium: NakshatraPremiumPartsCopy;
  lordReport: NakshatraLordReportCopy;
  dashaMap: NakshatraDashaMapCopy;
  vvip: NakshatraVvipCopy;
  compat: NakshatraCompatCopy;
  result: NakshatraResultCopy;
  ai: NakshatraAiCopy;
  aiDecks: NakshatraAiDecksCopy;
}

const NAKSHATRA_COPY_KO: NakshatraCopy = {
  form: {
    formAria: "나크샤트라 결정판 입력",
    formTitle: "생년월일로 내 별의 두 이름 보기",
    formIntro: "저장된 프로필 카드를 고르거나, 직접 입력하세요.",
    savedCardsLabel: "저장된 프로필 카드에서 불러오기",
    birthDateLegend: "생년월일",
    solarTag: "양력",
    yearLabel: "연도",
    monthLabel: "월",
    dayLabel: "일",
    lunarConvertedNote: "선택한 카드가 음력이라 양력으로 변환해 채웠어요.",
    birthTimeLegend: "태어난 시각",
    birthTimeHint: "모르면 정오 기준 · 파다 생략",
    hourLabel: "시 (0~23)",
    minuteLabel: "분 (0~59)",
    timeUnknownLabel: "태어난 시간을 몰라요",
    birthPlaceLegend: "태어난 지역",
    birthPlacePlaceholder: "예: 서울, 부산 해운대구, Tokyo, New York",
    geocodingStatus: "위치 확인 중…",
    birthPlaceHintDefault: "출생지를 적으면 정확한 타임존·경도로 별의 자리를 맞춥니다.",
    birthPlaceHintNote: "출생지의 정확한 타임존·경도로 달의 위치를 정밀 계산합니다. (해외 출생도 정확)",
    cardMissingBirthDateError: "이 프로필 카드에서 생년월일을 읽지 못했어요. 직접 입력해 주세요.",
    invalidBirthDateError: "생년월일을 정확히 입력해 주세요.",
    resolveApiError: "별의 위치를 계산하지 못했어요. 잠시 후 다시 시도해 주세요.",
    networkError: "네트워크 오류가 발생했어요. 연결을 확인하고 다시 시도해 주세요.",
    geoFallbackSeoulError: "출생지를 찾지 못해 서울 기준으로 계산합니다.",
    geoUnstableError: "위치 확인이 잠시 불안정해 서울 기준으로 계산합니다.",
    submitLoading: "별을 읽는 중…",
    submitIdle: "내 별의 두 이름 확인하기",
    disclaimer: "전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다.",
  },
  premium: {
    needBirthBodyLine1: "리포트를 열려면 먼저 별자리를 계산해야 해요.",
    needBirthBodyLine2: "생년월일과 태어난 시각을 넣으면 바로 이어집니다.",
    needBirthLinkLabel: "별자리 계산하러 가기",
    unlockGateNote: "한 번 열면 계속 다시 볼 수 있어요. 이용권이 있으면 무료로 열립니다.",
    genderPromptTitle: "동양 대운을 함께 보려면 성별이 필요해요",
    genderPromptDefaultNote: "대운은 절기까지의 거리와 성별로 순행·역행이 정해집니다. 근거 없이 한쪽을 고르면 열 개 구간이 통째로 어긋나므로 추측하지 않았어요. 인도 축(비쇼타리)은 성별을 쓰지 않아 지금도 온전히 보입니다.",
    genderMale: "남성",
    genderFemale: "여성",
    errorLogin: "로그인이 필요해요. 로그인 후 다시 시도해 주세요.",
    errorDegraded: "연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.",
    errorFailed: "리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
    errorPayment: "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
  },
  lordReport: {
    backLink: "← 나크샤트라 결정판",
    title: "지배성 심화 리포트",
    lede: "나크샤트라마다 그 자리를 다스리는 별이 따로 있습니다. 지배성과 파다·나바암샤가 만드는 성격·재능·그림자를 한 편으로 엮어 드립니다.",
    checkingStatus: "이용권을 확인하는 중이에요…",
    priceLabelKo: "10,000원 · 1회 해금",
    priceLabelOther: "₩10,000 · 1회 해금",
    buyButtonLoading: "결제 진행 중…",
    buyButtonIdle: "리포트 열기",
    loadingStatusReading: "지배성을 읽는 중이에요…",
    loadingStatusPreparing: "리포트를 준비하고 있어요…",
    metaTemplate: "{count}편 · {chars}자",
    gateBullets: [
      "당신의 별을 다스리는 지배성(그라하)의 초상 — 원형·재능·그림자",
      "파다와 나바암샤 — 겉으로 보이는 나와 혼자일 때의 나",
      "가나·나디·요니 세 축으로 읽는 기질과 관계 본능",
      "같은 주인을 둔 세 별 가운데 무엇이 나만의 몫인가",
      "지배성이 제 몫을 하는 나이, 그리고 지금 지나는 대주기",
      "요일·색·만트라·실천 3가지로 짜인 생활 처방",
    ],
    crossSellTitle: "언제 그것이 시험대에 오르는가",
    crossSellText: "이 리포트가 '누구인가'를 다뤘다면, 다샤 인생지도는 '언제인가'를 다룹니다. 비쇼타리 120년 주기와 동양 대운을 나란히 놓고 봅니다.",
    crossSellCta: "다샤 인생지도 보기",
    disclaimer: "이 리포트는 시데리얼(라히리) 기준 달의 위치와 27 나크샤트라 전통 속성으로 산출한 해석 자료입니다. 의료·법률·투자 판단의 근거로 쓰지 마세요.",
  },
  dashaMap: {
    backLink: "← 나크샤트라 결정판",
    title: "다샤 인생지도",
    lede: "태어날 때 달이 있던 자리에서 시작하는 120년의 시간표입니다. 아홉 그라하가 도는 인도의 시계와 열 살 단위로 흐르는 동양 대운을 같은 연도 축에 나란히 놓습니다.",
    checkingStatus: "이용권을 확인하는 중이에요…",
    priceLabelKo: "15,000원 · 1회 해금",
    priceLabelOther: "₩15,000 · 1회 해금",
    buyButtonLoading: "결제 진행 중…",
    buyButtonIdle: "인생지도 열기",
    loadingStatusReading: "120년의 시간표를 펼치는 중이에요…",
    loadingStatusPreparing: "지도를 준비하고 있어요…",
    metaTemplate: "{count}구간 · 안타르 {antardashaCount}",
    gateBullets: [
      "비쇼타리 120년 — 마하다샤 전 구간을 나이·연도와 함께",
      "각 대주기 안의 안타르다샤 9구간 전개(총 90구간)",
      "동양 사주 대운(절기 기준 10년)을 같은 연도 축에 병렬",
      "지금 지나는 구간이 무엇을 열고 무엇을 요구하는지",
      "무대가 바뀌는 해 — 대주기 전환 연표",
      "구간마다의 기회 · 요구 · 주의 항목",
    ],
    nowBadge: "지금",
    mapTitleTemplate: "120년 지도 — 마하다샤 {count}구간",
    mapNoteBase: "구간을 누르면 그 안의 안타르다샤 9개가 펼쳐집니다.",
    mapNoteNoGenderSuffix: " 성별을 포함해 다시 열면 동양 대운이 함께 표시됩니다.",
    crossSellTitle: "그 시기를 지나는 사람은 누구인가",
    crossSellText: "이 지도가 '언제인가'를 다뤘다면, 지배성 심화 리포트는 '누구인가'를 다룹니다. 같은 시기가 사람마다 다르게 흐르는 이유가 거기 있습니다.",
    crossSellCta: "지배성 심화 리포트 보기",
    disclaimer: "비쇼타리 다샤는 시데리얼(라히리) 기준 출생 시 달의 위치로 계산합니다. 출생 시각이 부정확하면 구간 경계가 밀릴 수 있습니다. 해석 자료이며 의료·법률·투자 판단의 근거로 쓰지 마세요.",
  },
  vvip: {
    backLink: "← 나크샤트라 결정판",
    title: "결정판 통합서",
    lede: "흩어져 있던 것을 한 권으로 묶습니다. 명식 총람부터 27수 전체 지형, 지배성 심화와 120년 다샤 지도까지 — PDF로 소장할 수 있는 한 권입니다.",
    genderPromptNote: "대운은 절기까지의 거리와 성별로 순행·역행이 정해집니다. 근거 없이 한쪽을 고르면 열 개 구간이 통째로 어긋나므로 추측하지 않아요. 지금 골라 두시면 제5장에 동양 대운이 함께 실립니다 — 고르지 않아도 나머지 네 장과 인도 축(비쇼타리)은 그대로 나옵니다.",
    gatePriceKo: "30,000원",
    gatePriceOther: "₩30,000",
    gateNote: "단품 지배성 리포트(10,000원)와 다샤 인생지도(10,000원)를 통째로 담고, 27수 전체 지형과 세 대가의 해설을 더한 소장본입니다.",
    gateBullets: [
      "제1장 명식 총람 — 숙요·나크샤트라·지배성·파다·기질 삼축을 한 면에",
      "제2장 세 대가의 목소리 — 숙요 대가 · 베다 대가 · 두 전통을 잇는 통합 해석",
      "제3장 27수 전체 지형 — 스물일곱 자리 전부와 나의 격각 관계(사람·날짜에 평생 쓰는 지도)",
      "제4장 지배성 심화 리포트 전문 (단품 10,000원)",
      "제5장 다샤 인생지도 전문 — 마하 전 구간 + 안타르다샤 90구간 (단품 10,000원)",
      "PDF 소장본 저장",
    ],
    buyButtonPaying: "결제 진행 중…",
    buyButtonBuilding: "한 권으로 엮는 중…",
    buyButtonIdle: "통합서 받기",
    retryButtonLoading: "다시 받는 중…",
    retryButtonIdle: "결제 없이 다시 받기",
    errorLoginRequired: "로그인이 필요해요. 로그인 후 다시 시도해 주세요.",
    errorConnectionUnstableRetry: "연결이 잠시 불안정해요. 결제는 그대로 남아 있으니 아래 버튼으로 다시 받아보세요.",
    errorGenericFailed: "통합서를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
    errorPaymentFailed: "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    errorPdfSaveFailed: "PDF 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    tocAriaLabel: "목차",
    tocTitle: "목차",
    myPositionBadge: "내 자리",
    pdfButtonSaving: "PDF 만드는 중…",
    pdfButtonIdle: "PDF로 소장하기",
    disclaimer: "시데리얼(라히리) 기준 달의 위치와 27수 전통 속성으로 산출한 해석 자료입니다. 출생 시각이 부정확하면 파다와 다샤 경계가 밀릴 수 있습니다. 의료·법률·투자 판단의 근거로 쓰지 마세요.",
    metaTemplate: "{count}장 · {chars}자",
  },
  compat: {
    myTitle: "나",
    partnerTitle: "상대",
    invitedLockedBadge: "(초대 고정)",
    namePlaceholder: "이름/별칭 (선택)",
    yearPlaceholder: "연도",
    monthPlaceholder: "월",
    dayPlaceholder: "일",
    hourPlaceholder: "시 (선택)",
    minutePlaceholder: "분 (선택)",
    timeUnknownLabel: "시간 모름 (정오)",
    genderNotSet: "성별 미입력",
    genderMale: "남성",
    genderFemale: "여성",
    invalidBirthDatesError: "두 사람의 생년월일을 정확히 입력해 주세요.",
    paymentNotCompletedError: "결제가 완료되지 않았어요.",
    loginRequiredError: "로그인이 필요해요. 로그인 후 다시 시도해 주세요.",
    connectionUnstableRetryError: "연결이 잠시 불안정해요. 결제는 그대로 남아 있으니 아래 버튼으로 다시 받아보세요.",
    genericFailedError: "궁합 계산에 실패했어요.",
    needMyBirthDateError: "먼저 나의 생년월일을 입력하면 초대 링크가 만들어져요.",
    retryButtonLoading: "다시 받는 중…",
    retryButtonIdle: "결제 없이 다시 받기",
    submitButtonLoading: "두 별을 겹쳐 보는 중…",
    submitButtonVerifying: "결제 확인 중…",
    submitButtonIdleKo: "동서 통합 궁합 보기 (10,000원)",
    submitButtonIdleOther: "동서 통합 궁합 보기 (₩10,000)",
    linkCopiedLabel: "링크가 복사됐어요 ✓",
    copyInviteLabel: "상대에게 초대 링크 보내기",
    footerNote: "내 정보를 담은 링크를 보내면, 상대는 자기 생년월일만 넣어 함께 결과를 볼 수 있어요. 전통 별자리 문화 콘텐츠이며 의료·법률·투자 판단의 근거로 쓸 수 없습니다.",
    resultEyebrow: "동서 통합 궁합",
    convergenceHeading: "⟡ 통합 총평",
    indiaHeading: "🕉 인도 아쉬타쿠타",
    easternHeading: "☯ 동양 숙요 격각",
    chemistryLabel: "끌림",
    stabilityLabel: "안정",
    conflictLabel: "갈등",
    indiaScoreNote: "인도 아쉬타쿠타 {indiaPct} · 동양 숙요 {eastPct}",
    resetButton: "다른 상대와 다시 보기",
    resultFooterNote: "아쉬타쿠타는 달 라시 기반 정통 8쿠타(36점), 격각은 숙요 27수 관계법으로 계산했습니다. 전통 별자리 문화 콘텐츠이며 의료·법률·투자 판단의 근거로 쓸 수 없습니다.",
  },
  result: {
    notFoundTitle: "결과를 찾을 수 없어요",
    notFoundBody: "생년월일을 다시 입력하면 내 별의 두 이름을 계산해 드릴게요.",
    notFoundLink: "다시 입력하기",
    viewTabBoth: "동시",
    viewTabEast: "☯ 동양",
    viewTabIndia: "🕉 인도",
    viewTabUnified: "⟡ 통합",
    viewSwitchAria: "관점 전환",
    headerEyebrow: "당신의 별자리",
    padaChipTemplate: "파다 {pada}",
    padaChipUnknown: "파다 미상",
    eastHeading: "숙요점 관점",
    eastHeadingSuffix: "(동양)",
    indiaHeading: "베다점 관점",
    indiaHeadingSuffix: "(인도)",
    rowNatalName: "본명수",
    rowDirection: "방위",
    rowSevenLuminary: "칠요(七曜)",
    rowSevenLuminaryHint: "일곱 빛(해·달·오행)의 배속",
    rowFourSymbol: "사신(四神)",
    strengthsLabel: "강점",
    shadowsLabel: "그림자",
    easternExpertHeading: "宿曜 전문가의 해설",
    rowNakshatra: "나크샤트라",
    rowLord: "지배성",
    rowLordHint: "비쇼타리 다샤의 기준 행성",
    rowGana: "가나",
    rowGanaHint: "데바·마누샤·라크샤사 기질 분류",
    rowYoni: "요니",
    rowYoniHint: "궁합에 쓰는 동물 본능 원형",
    rowNadi: "나디",
    rowNadiHint: "바타·피타·카파 체질 분류",
    rowMotive: "동기",
    rowMotiveHint: "이번 생의 근원 동기(푸루샤르타)",
    rowPada: "파다",
    rowPadaHint: "나크샤트라의 4분할(나바암샤 라시)",
    rowPadaUnknown: "시각 미상으로 생략",
    rowCurrentDasha: "현재 다샤",
    rowCurrentDashaHint: "지금 흐르는 대운/안타르다샤",
    indianExpertHeading: "Jyotish 전문가의 해설",
    unifiedHeading: "⟡ 통합 해석",
    boundaryLabel: "⟢ 경계일",
    convergenceLabel: "⟡ 두 전통이 만나는 지점 (수렴)",
    divergenceLabel: "⟢ 갈라지는 지점",
    todayMoonHeading: "🌙 오늘의 달",
    calcBasisHeading: "계산 근거",
    ayanamsaLabel: "아야남샤",
    siderealMoonLabel: "시데리얼 달 황경",
    birthLabel: "출생",
    timeUnknownSuffix: "(시각 미상)",
    padaFooterLabel: "파다",
    disclaimer: "본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다. 나크샤트라 속성은 전통 문헌 기반이며, 통합 해석은 Code Destiny의 창작입니다.",
    backLink: "← 다른 생일로 다시 보기",
    upsellHeading: "✦ 더 깊이 보기",
    upsellIntro: "여기까지는 무료예요. 아래는 두 전통을 더 깊게 펼치는 심화 상품입니다.",
    viewNowLabel: "지금 보기 →",
    comingSoonLabel: "준비 중",
    paidProducts: {
      compat: { title: "동서 통합 궁합", priceKo: "10,000원", priceOther: "₩10,000", desc: "인도 아쉬타쿠타 36점 × 동양 숙요 격각" },
      lordReport: { title: "지배성 심화 리포트", priceKo: "10,000원", priceOther: "₩10,000", desc: "지배성·파다·나바암샤 성격/재능/그림자 심층" },
      dashaMap: { title: "다샤 인생지도", priceKo: "10,000원", priceOther: "₩10,000", desc: "비쇼타리 120년 타임라인 + 동양 대운 병렬" },
      muhurta: { title: "택일(무후르타)", priceKo: "5,000원", priceOther: "₩5,000", desc: "목적별 길일 — 무후르타 × 숙요 길흉 교집합" },
      ai: { title: "전문가 심화 상담", priceKo: "30,000원", priceOther: "₩30,000", desc: "숙요·베다 두 대가가 각각 장문으로 (2관점 상담)" },
      vvip: { title: "VVIP 결정판 통합서", priceKo: "30,000원", priceOther: "₩30,000", desc: "전체 통합 + 서사 + PDF 소장본" },
    },
  },
  ai: {
    generationFailedError: "상담문 생성에 실패했어요. 이용권/결제 권한은 보존됩니다. 잠시 후 다시 시도해 주세요.",
    generationSlowError: "상담 생성이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도하면 이어서 받아볼 수 있어요.",
    loginRequiredError: "로그인이 필요해요. 로그인 후 다시 시도해 주세요.",
    readingInProgressStatus: "숙요·베다 두 대가가 당신의 별을 읽는 중이에요.",
    connectionUnstableRetryStatus: "연결이 잠시 불안정해요. 이어서 다시 시도하는 중입니다.",
    checkingPassStatus: "이용권을 확인하는 중이에요.",
    tryAgainShortlyError: "잠시 후 다시 시도해 주세요.",
    checkingPaymentMethodStatus: "결제 수단을 확인하는 중이에요.",
    paymentOrPassFailedError: "결제나 이용권 확인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    networkFailedToStartError: "네트워크 문제로 상담을 시작하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
    needBirthTitle: "먼저 별을 계산해 주세요",
    needBirthBody: "전문가 심화 상담은 당신의 숙요 본명수와 베다 나크샤트라를 근거로 진행돼요. 생년월일을 먼저 계산하면 두 대가가 이어서 상담해 드릴게요.",
    calculateMyStarLink: "내 별 계산하기",
    introEyebrowSuffix: "전문가 심화 상담",
    introTitle: "두 대가에게 두 번 물어보세요",
    introBodyFallbackIdentity: "당신의 명식",
    introBodySuffix: "을 근거로, 숙요 대가와 베다 대가가 각각 장문의 상담을 써 드려요.",
    questionLabel: "무엇이 궁금한가요?",
    questionOptionalHint: "(선택 — 비워두면 전반적인 흐름을 짚어 드려요)",
    questionPlaceholder: "예) 올해 이직을 고민 중인데 제 기질에 맞는 방향이 궁금해요.",
    baseChartLabel: "기준 명식",
    baseChartTimeUnknownSuffix: "(시각 미상 · 파다 생략)",
    startButtonLabel: "두 대가의 상담 받기",
    passNote: "이용권이 있으면 결제 없이 바로 진행돼요.",
    stepAnalyzeNakshatra: "나크샤트라 분석",
    stepAnalyzeSukuyo: "숙요 분석",
    stepFusionInterpretation: "융합 해석",
    stepPracticalAdvice: "실전 조언",
    headlinePayment: "결제 수단을 확인하는 중이에요",
    headlineChecking: "이용권을 확인하는 중이에요",
    headlineGenerating: "두 대가가 당신의 별을 읽는 중이에요",
    waitingDefaultStatus: "잠시만 기다려 주세요.",
    progressStepsAria: "상담 진행 단계",
    progressCountTemplate: "{total}편 중 {completed}편을 썼어요. 두 전통을 각각 읽은 뒤 겹쳐 읽는 순서라 조금 걸려요.",
    progressIntro: "숙요 5편 + 베다 6편 + 융합 10편, 총 21편의 상담을 정성껏 쓰는 중이라 조금 걸릴 수 있어요.",
  },
  aiDecks: {
    fallbackTitle: "두 대가의 심화 상담",
    scaleUnitSuffix: "편",
    scaleCharsTemplate: " · {chars}자",
    splitSectionHeading: "두 대가가 각각 읽은 당신의 별",
    vedicDeckName: "베다 대가의 상담",
    vedicDeckSub: "Jyotish · 지배성과 다샤",
    sukuyoDeckName: "숙요 대가의 상담",
    sukuyoDeckSub: "宿曜 · 칠요와 격각",
    fusionSectionHeading: "두 시선을 겹쳐 읽다 — 융합 해석",
    topInsightsHeading: "이 해석에서 가장 중요한 세 가지",
    footerNote: "본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다. 상담문은 계산된 명식(숙요 본명수·베다 나크샤트라)을 근거로 작성되었고, 융합 해석은 Code Destiny의 창작입니다.",
  },
};

const NAKSHATRA_COPY_EN: NakshatraCopy = {
  form: {
    formAria: "Nakshatra Deluxe input",
    formTitle: "Find your star's two names from your birth date",
    formIntro: "Choose a saved profile card, or enter your details directly.",
    savedCardsLabel: "Load from a saved profile card",
    birthDateLegend: "Date of birth",
    solarTag: "Solar",
    yearLabel: "Year",
    monthLabel: "Month",
    dayLabel: "Day",
    lunarConvertedNote: "The selected card used the lunar calendar, so we converted it to solar for you.",
    birthTimeLegend: "Birth time",
    birthTimeHint: "If unknown, we use noon and skip the pada",
    hourLabel: "Hour (0-23)",
    minuteLabel: "Minute (0-59)",
    timeUnknownLabel: "I don't know my birth time",
    birthPlaceLegend: "Birthplace",
    birthPlacePlaceholder: "e.g. Seoul, Busan Haeundae-gu, Tokyo, New York",
    geocodingStatus: "Checking location…",
    birthPlaceHintDefault: "Enter your birthplace so we can match your star's position with the precise timezone and longitude.",
    birthPlaceHintNote: "We precisely calculate the moon's position using your birthplace's exact timezone and longitude. (Accurate for overseas births too)",
    cardMissingBirthDateError: "We couldn't read a birth date from this profile card. Please enter it directly.",
    invalidBirthDateError: "Please enter your birth date accurately.",
    resolveApiError: "We couldn't calculate your star's position. Please try again shortly.",
    networkError: "A network error occurred. Please check your connection and try again.",
    geoFallbackSeoulError: "We couldn't find that birthplace, so we're calculating based on Seoul.",
    geoUnstableError: "Location lookup was briefly unstable, so we're calculating based on Seoul.",
    submitLoading: "Reading the stars…",
    submitIdle: "Check my star's two names",
    disclaimer: "This is traditional astrology culture content and cannot be used as a basis for medical, legal, or investment decisions.",
  },
  premium: {
    needBirthBodyLine1: "To open this report, we first need to calculate your star chart.",
    needBirthBodyLine2: "Enter your birth date and time and it continues right away.",
    needBirthLinkLabel: "Go calculate your star chart",
    unlockGateNote: "Once unlocked, you can view it again anytime. It opens for free if you have a pass.",
    genderPromptTitle: "We need your gender to also show your Eastern great-fortune cycle",
    genderPromptDefaultNote: "The great-fortune cycle's forward or reverse direction is determined by the distance to the solar term and by gender. Guessing without a basis would throw off all ten segments, so we didn't assume. The Indian axis (Vimshottari) doesn't use gender, so it's still fully visible now.",
    genderMale: "Male",
    genderFemale: "Female",
    errorLogin: "Login is required. Please log in and try again.",
    errorDegraded: "The connection is briefly unstable. Please try again shortly.",
    errorFailed: "We couldn't load the report. Please try again shortly.",
    errorPayment: "The payment wasn't completed. Please try again shortly.",
  },
  lordReport: {
    backLink: "← Nakshatra Deluxe",
    title: "Ruling Planet Deep-Dive Report",
    lede: "Each nakshatra has its own ruling star. We weave together the personality, talent, and shadow shaped by your ruling planet, pada, and navamsa into one report.",
    checkingStatus: "Checking your pass…",
    priceLabelKo: "10,000원 · 1회 해금",
    priceLabelOther: "₩10,000 · one-time unlock",
    buyButtonLoading: "Processing payment…",
    buyButtonIdle: "Open the report",
    loadingStatusReading: "Reading your ruling planet…",
    loadingStatusPreparing: "Preparing your report…",
    metaTemplate: "{count} sections · {chars} characters",
    gateBullets: [
      "A portrait of the ruling planet (graha) that governs your star — archetype, talent, and shadow",
      "Pada and navamsa — the self you show and the self you are alone",
      "Temperament and relationship instinct read through the three axes of gana, nadi, and yoni",
      "Among three stars sharing the same lord, which portion is uniquely yours",
      "The age when your ruling planet comes into its own, and the great cycle you're passing through now",
      "A life prescription woven from weekday, color, mantra, and one practice",
    ],
    crossSellTitle: "When it's put to the test",
    crossSellText: "If this report covered \"who,\" the Dasha Life Map covers \"when.\" It places the 120-year Vimshottari cycle side by side with your Eastern great-fortune cycle.",
    crossSellCta: "See the Dasha Life Map",
    disclaimer: "This report is interpretive material calculated from the moon's position (sidereal, Lahiri) and the traditional attributes of the 27 nakshatras. Do not use it as a basis for medical, legal, or investment decisions.",
  },
  dashaMap: {
    backLink: "← Nakshatra Deluxe",
    title: "Dasha Life Map",
    lede: "A 120-year timetable starting from where the moon stood at your birth. It places the Indian clock of nine grahas side by side with your Eastern great-fortune cycle, which flows in ten-year units, on the same year axis.",
    checkingStatus: "Checking your pass…",
    priceLabelKo: "15,000원 · 1회 해금",
    priceLabelOther: "₩15,000 · one-time unlock",
    buyButtonLoading: "Processing payment…",
    buyButtonIdle: "Open the life map",
    loadingStatusReading: "Unfolding your 120-year timetable…",
    loadingStatusPreparing: "Preparing your map…",
    metaTemplate: "{count} periods · {antardashaCount} antardashas",
    gateBullets: [
      "Vimshottari 120 years — every mahadasha period with age and year",
      "All 9 antardasha sub-periods within each great cycle (90 total)",
      "Your Eastern great-fortune cycle (10-year, solar-term-based) placed on the same year axis",
      "What the period you're passing through now opens up and what it demands",
      "The years the stage changes — a timeline of great-cycle transitions",
      "Opportunity, demand, and caution notes for every period",
    ],
    nowBadge: "Now",
    mapTitleTemplate: "120-Year Map — {count} Mahadasha Periods",
    mapNoteBase: "Tap a period to expand its 9 antardashas.",
    mapNoteNoGenderSuffix: " Reopen this after including your gender to also see your Eastern great-fortune cycle.",
    crossSellTitle: "Who is the one passing through that time",
    crossSellText: "If this map covered \"when,\" the Ruling Planet Deep-Dive Report covers \"who.\" That's why the same period flows differently for different people.",
    crossSellCta: "See the Ruling Planet Deep-Dive Report",
    disclaimer: "The Vimshottari dasha is calculated from the moon's position at birth (sidereal, Lahiri). If your birth time is inaccurate, period boundaries may shift. This is interpretive material — do not use it as a basis for medical, legal, or investment decisions.",
  },
  vvip: {
    backLink: "← Nakshatra Deluxe",
    title: "Deluxe Codex",
    lede: "Brings everything scattered together into one volume. From your full chart overview to the entire 27-nakshatra terrain, your ruling-planet deep dive, and the 120-year dasha map — one volume you can keep as a PDF.",
    genderPromptNote: "The great-fortune cycle's forward or reverse direction is determined by the distance to the solar term and by gender. Guessing without a basis would throw off all ten segments, so we don't assume. Choose it now and Chapter 5 will include your Eastern great-fortune cycle — even without choosing, the other four chapters and the Indian axis (Vimshottari) come through as-is.",
    gatePriceKo: "30,000원",
    gatePriceOther: "₩30,000",
    gateNote: "This keepsake volume bundles the standalone Ruling Planet Report (₩10,000) and Dasha Life Map (₩10,000) in full, plus the entire 27-nakshatra terrain and commentary from three masters.",
    gateBullets: [
      "Chapter 1: Full chart overview — sukuyo, nakshatra, ruling planet, pada, and the three axes of temperament, all on one page",
      "Chapter 2: The voice of three masters — sukuyo master, Vedic master, and a unified interpretation bridging both traditions",
      "Chapter 3: The full terrain of all 27 nakshatras — every one of the twenty-seven positions and your relationship to each (a map for a lifetime of people and dates)",
      "Chapter 4: The full Ruling Planet Deep-Dive Report (₩10,000 standalone)",
      "Chapter 5: The full Dasha Life Map — every mahadasha period plus all 90 antardashas (₩10,000 standalone)",
      "Save as a keepsake PDF",
    ],
    buyButtonPaying: "Processing payment…",
    buyButtonBuilding: "Binding it into one volume…",
    buyButtonIdle: "Get the codex",
    retryButtonLoading: "Fetching again…",
    retryButtonIdle: "Get it again without paying",
    errorLoginRequired: "Login is required. Please log in and try again.",
    errorConnectionUnstableRetry: "The connection is briefly unstable. Your payment is still on record, so try fetching it again with the button below.",
    errorGenericFailed: "We couldn't build your codex. Please try again shortly.",
    errorPaymentFailed: "The payment wasn't completed. Please try again shortly.",
    errorPdfSaveFailed: "Failed to save the PDF. Please try again shortly.",
    tocAriaLabel: "Table of contents",
    tocTitle: "Table of contents",
    myPositionBadge: "My position",
    pdfButtonSaving: "Building PDF…",
    pdfButtonIdle: "Save as PDF",
    disclaimer: "This is interpretive material calculated from the moon's position (sidereal, Lahiri) and the traditional attributes of the 27 nakshatras. If your birth time is inaccurate, the pada and dasha boundaries may shift. Do not use it as a basis for medical, legal, or investment decisions.",
    metaTemplate: "{count} chapters · {chars} characters",
  },
  compat: {
    myTitle: "Me",
    partnerTitle: "Partner",
    invitedLockedBadge: "(fixed from invite)",
    namePlaceholder: "Name/nickname (optional)",
    yearPlaceholder: "Year",
    monthPlaceholder: "Month",
    dayPlaceholder: "Day",
    hourPlaceholder: "Hour (optional)",
    minutePlaceholder: "Minute (optional)",
    timeUnknownLabel: "Unknown time (noon)",
    genderNotSet: "Gender not set",
    genderMale: "Male",
    genderFemale: "Female",
    invalidBirthDatesError: "Please enter both people's birth dates accurately.",
    paymentNotCompletedError: "The payment wasn't completed.",
    loginRequiredError: "Login is required. Please log in and try again.",
    connectionUnstableRetryError: "The connection is briefly unstable. Your payment is still on record, so try fetching it again with the button below.",
    genericFailedError: "We couldn't calculate your compatibility.",
    needMyBirthDateError: "Enter your own birth date first to create an invite link.",
    retryButtonLoading: "Fetching again…",
    retryButtonIdle: "Get it again without paying",
    submitButtonLoading: "Overlaying the two stars…",
    submitButtonVerifying: "Confirming payment…",
    submitButtonIdleKo: "동서 통합 궁합 보기 (10,000원)",
    submitButtonIdleOther: "See the East-West unified compatibility (₩10,000)",
    linkCopiedLabel: "Link copied ✓",
    copyInviteLabel: "Send an invite link to your partner",
    footerNote: "Send a link with your info, and your partner only has to enter their own birth date to see the result together. This is traditional astrology culture content and cannot be used as a basis for medical, legal, or investment decisions.",
    resultEyebrow: "East-West Unified Compatibility",
    convergenceHeading: "⟡ Overall Verdict",
    indiaHeading: "🕉 Indian Ashtakuta",
    easternHeading: "☯ Eastern Sukuyo Compatibility",
    chemistryLabel: "Chemistry",
    stabilityLabel: "Stability",
    conflictLabel: "Conflict",
    indiaScoreNote: "Indian Ashtakuta {indiaPct} · Eastern Sukuyo {eastPct}",
    resetButton: "Check with someone else",
    resultFooterNote: "Ashtakuta is calculated from the traditional 8-kuta moon-rashi system (36 points); the sukuyo compatibility uses the 27-mansion relationship method. This is traditional astrology culture content and cannot be used as a basis for medical, legal, or investment decisions.",
  },
  result: {
    notFoundTitle: "We couldn't find a result",
    notFoundBody: "Enter your birth date again and we'll calculate your star's two names.",
    notFoundLink: "Enter again",
    viewTabBoth: "Both",
    viewTabEast: "☯ Eastern",
    viewTabIndia: "🕉 Indian",
    viewTabUnified: "⟡ Unified",
    viewSwitchAria: "Switch perspective",
    headerEyebrow: "Your star",
    padaChipTemplate: "Pada {pada}",
    padaChipUnknown: "Pada unknown",
    eastHeading: "Sukuyo perspective",
    eastHeadingSuffix: "(Eastern)",
    indiaHeading: "Vedic perspective",
    indiaHeadingSuffix: "(Indian)",
    rowNatalName: "Natal star",
    rowDirection: "Direction",
    rowSevenLuminary: "Seven Luminaries",
    rowSevenLuminaryHint: "The assignment of the seven lights (sun, moon, five elements)",
    rowFourSymbol: "Four Symbols",
    strengthsLabel: "Strengths",
    shadowsLabel: "Shadows",
    easternExpertHeading: "Sukuyo expert's commentary",
    rowNakshatra: "Nakshatra",
    rowLord: "Ruling planet",
    rowLordHint: "The reference planet for the Vimshottari dasha",
    rowGana: "Gana",
    rowGanaHint: "Temperament classification: deva, manusha, or rakshasa",
    rowYoni: "Yoni",
    rowYoniHint: "The animal-instinct archetype used in compatibility",
    rowNadi: "Nadi",
    rowNadiHint: "Constitution classification: vata, pitta, or kapha",
    rowMotive: "Motive",
    rowMotiveHint: "The root motive of this life (purushartha)",
    rowPada: "Pada",
    rowPadaHint: "The nakshatra's quarter division (navamsa rashi)",
    rowPadaUnknown: "Omitted — birth time unknown",
    rowCurrentDasha: "Current dasha",
    rowCurrentDashaHint: "The mahadasha/antardasha currently flowing",
    indianExpertHeading: "Jyotish expert's commentary",
    unifiedHeading: "⟡ Unified interpretation",
    boundaryLabel: "⟢ Boundary day",
    convergenceLabel: "⟡ Where the two traditions meet (convergence)",
    divergenceLabel: "⟢ Where they diverge",
    todayMoonHeading: "🌙 Today's moon",
    calcBasisHeading: "Calculation basis",
    ayanamsaLabel: "Ayanamsa",
    siderealMoonLabel: "Sidereal moon longitude",
    birthLabel: "Birth",
    timeUnknownSuffix: "(time unknown)",
    padaFooterLabel: "Pada",
    disclaimer: "This service is traditional astrology culture content and cannot be used as a basis for medical, legal, or investment decisions. Nakshatra attributes are based on traditional texts, and the unified interpretation is Code Destiny's own composition.",
    backLink: "← Check again with a different birthday",
    upsellHeading: "✦ Go deeper",
    upsellIntro: "Everything up to here is free. Below are deeper premium products for both traditions.",
    viewNowLabel: "View now →",
    comingSoonLabel: "Coming soon",
    paidProducts: {
      compat: { title: "East-West Unified Compatibility", priceKo: "10,000원", priceOther: "₩10,000", desc: "36-point Indian Ashtakuta × Eastern sukuyo compatibility" },
      lordReport: { title: "Ruling Planet Deep-Dive Report", priceKo: "10,000원", priceOther: "₩10,000", desc: "In-depth personality/talent/shadow from ruling planet, pada, navamsa" },
      dashaMap: { title: "Dasha Life Map", priceKo: "10,000원", priceOther: "₩10,000", desc: "120-year Vimshottari timeline + Eastern great-fortune cycle side by side" },
      muhurta: { title: "Muhurta (Auspicious Timing)", priceKo: "5,000원", priceOther: "₩5,000", desc: "Auspicious dates by purpose — the intersection of muhurta and sukuyo fortune" },
      ai: { title: "Expert Deep-Dive Consultation", priceKo: "30,000원", priceOther: "₩30,000", desc: "Two masters, sukuyo and Vedic, each writing in depth (two perspectives)" },
      vvip: { title: "VVIP Deluxe Codex", priceKo: "30,000원", priceOther: "₩30,000", desc: "Full integration + narrative + keepsake PDF" },
    },
  },
  ai: {
    generationFailedError: "We couldn't generate your reading. Your pass/payment access is preserved. Please try again shortly.",
    generationSlowError: "Generating your reading is taking longer than expected. Try again shortly to pick up where it left off.",
    loginRequiredError: "Login is required. Please log in and try again.",
    readingInProgressStatus: "The two masters, sukuyo and Vedic, are reading your star.",
    connectionUnstableRetryStatus: "The connection is briefly unstable. Retrying automatically.",
    checkingPassStatus: "Checking your pass.",
    tryAgainShortlyError: "Please try again shortly.",
    checkingPaymentMethodStatus: "Checking your payment method.",
    paymentOrPassFailedError: "We couldn't confirm your payment or pass. Please try again shortly.",
    networkFailedToStartError: "A network problem kept us from starting your consultation. Please check your connection and try again.",
    needBirthTitle: "Please calculate your star first",
    needBirthBody: "The expert deep-dive consultation is based on your sukuyo natal star and Vedic nakshatra. Calculate your birth date first and the two masters will consult you next.",
    calculateMyStarLink: "Calculate my star",
    introEyebrowSuffix: "Expert Deep-Dive Consultation",
    introTitle: "Ask two masters, twice",
    introBodyFallbackIdentity: "Your chart",
    introBodySuffix: " as the basis, the sukuyo master and the Vedic master will each write you a long-form consultation.",
    questionLabel: "What are you curious about?",
    questionOptionalHint: "(Optional — leave it blank and we'll cover the overall flow)",
    questionPlaceholder: "e.g. I'm considering a job change this year and want to know what direction suits my temperament.",
    baseChartLabel: "Reference chart",
    baseChartTimeUnknownSuffix: "(time unknown · pada omitted)",
    startButtonLabel: "Get the two masters' consultation",
    passNote: "If you have a pass, this proceeds right away without payment.",
    stepAnalyzeNakshatra: "Nakshatra analysis",
    stepAnalyzeSukuyo: "Sukuyo analysis",
    stepFusionInterpretation: "Fusion interpretation",
    stepPracticalAdvice: "Practical advice",
    headlinePayment: "Checking your payment method",
    headlineChecking: "Checking your pass",
    headlineGenerating: "The two masters are reading your star",
    waitingDefaultStatus: "Please wait a moment.",
    progressStepsAria: "Consultation progress steps",
    progressCountTemplate: "Written {completed} of {total} sections. Reading both traditions separately and then together takes a little while.",
    progressIntro: "Carefully writing 21 sections in total — 5 sukuyo, 6 Vedic, and 10 fusion — so it may take a little while.",
  },
  aiDecks: {
    fallbackTitle: "Deep-dive consultation from two masters",
    scaleUnitSuffix: " sections",
    scaleCharsTemplate: " · {chars} characters",
    splitSectionHeading: "Your star, as read separately by two masters",
    vedicDeckName: "The Vedic master's consultation",
    vedicDeckSub: "Jyotish · Ruling planet and dasha",
    sukuyoDeckName: "The sukuyo master's consultation",
    sukuyoDeckSub: "Sukuyo · Seven luminaries and compatibility",
    fusionSectionHeading: "Reading the two perspectives together — fusion interpretation",
    topInsightsHeading: "The three most important points in this reading",
    footerNote: "This service is traditional astrology culture content and cannot be used as a basis for medical, legal, or investment decisions. The consultation is written based on your calculated chart (sukuyo natal star, Vedic nakshatra), and the fusion interpretation is Code Destiny's own composition.",
  },
};

const NAKSHATRA_COPY: Partial<Record<LoadingLocale, NakshatraCopy>> = {
  ko: NAKSHATRA_COPY_KO,
  en: NAKSHATRA_COPY_EN,
};

export function getNakshatraCopy(locale: LoadingLocale): NakshatraCopy {
  return NAKSHATRA_COPY[locale] || NAKSHATRA_COPY_EN;
}

export function useNakshatraCopy(): NakshatraCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return getNakshatraCopy(locale);
}

export function getNakshatraNumberLocaleTag(locale: LoadingLocale): string {
  switch (locale) {
    case "ko": return "ko-KR";
    case "ja": return "ja-JP";
    case "zh-CN": return "zh-CN";
    case "zh-TW": return "zh-TW";
    case "vi": return "vi-VN";
    case "hi": return "hi-IN";
    case "es": return "es-ES";
    case "fr": return "fr-FR";
    case "de": return "de-DE";
    case "nl": return "nl-NL";
    case "ms": return "ms-MY";
    default: return "en-US";
  }
}
