"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AlertCircle, ArrowLeft, BookOpen, ChevronDown, Download, Lightbulb, Loader2, ScrollText, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import PagedResultViewer, { usePagedViewerMode, type ResultViewerPage } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { FAILURE_COPY, reasonCopy } from "../lifeBookCopy";
import { useTypewriter } from "./useTypewriter";
import BookOpenCover from "./_components/BookOpenCover";
import ResultActionDock from "./_components/ResultActionDock";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { readDevPreviewState, buildDevPreviewResponse } from "@/lib/dev-preview/core";
import { buildLifeBookPreviewPayload } from "@/lib/dev-preview/fixtures/life-book";
import SajuPillarTable from "@/components/fortune/SajuPillarTable";
import { splitGanji, tenGodOfStem, FIVE_ELEMENT_TOKENS, type FiveElement } from "@/lib/five-element-colors";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import styles from "./LifeBookAiResultClient.module.css";

type LifeBookMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type SajuResult = {
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  dayMaster?: string;
  fiveElements?: Record<string, number> | null;
  tenGods?: Record<string, number> | null;
  strength?: string;
  usefulGod?: string;
  unfavorableGod?: string;
  majorLuck?: unknown;
  yearlyLuck?: unknown;
  calculationMeta?: Record<string, unknown> | null;
};

type LifeBookResult = {
  ok?: boolean;
  sessionId?: string;
  consultationId?: string;
  idempotencyKey?: string;
  accessType?: string;
  status?: string;
  title?: string;
  topic?: string;
  birthInfo?: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    birthTimeUnknown?: boolean;
    calendarType?: string;
  } | null;
  sajuResult?: SajuResult | null;
  messages?: LifeBookMessage[];
  reportJson?: LifeBookReportJson | null;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  reason?: string;
};

type LifeBookChapter = {
  chapterNumber?: number;
  title?: string;
  summary?: string;
  content?: string;
  advice?: string[];
};

type LifeBookExpertReading = {
  title?: string;
  content?: string;
  guidance?: string[];
};

type LifeBookReportJson = {
  title?: string;
  subtitle?: string;
  profileSummary?: Record<string, string>;
  coreSummary?: {
    oneLine?: string;
    lifeTheme?: string;
    strongestElement?: string;
    neededBalance?: string;
  };
  chapters?: LifeBookChapter[];
  expertReadings?: LifeBookExpertReading[];
  finalMessage?: string;
};

// 십성을 5개 카테고리(비겁/식상/재성/관성/인성)로 묶어 시각적으로 군집화한다.
// 키(members)는 서버 계산 엔진이 반환하는 고정 한국어 태그다 — saju.tenGods 조회에 그대로 쓰이므로
// 로케일과 무관하게 유지하고, 화면 표시값만 LifeBookResultCopy.tenGodLabel 로 번역한다.
const TEN_GOD_GROUPS: Array<{ label: string; members: string[] }> = [
  { label: "비겁", members: ["비견", "겁재"] },
  { label: "식상", members: ["식신", "상관"] },
  { label: "재성", members: ["편재", "정재"] },
  { label: "관성", members: ["편관", "정관"] },
  { label: "인성", members: ["편인", "정인"] },
];

const FIVE_ELEMENT_ORDER: FiveElement[] = ["목", "화", "토", "금", "수"];

interface PillarLabels { year: string; month: string; day: string; hour: string }
const PILLAR_LABEL_EN: PillarLabels = { year: "Year Pillar", month: "Month Pillar", day: "Day Pillar", hour: "Hour Pillar" };
const PILLAR_LABEL_COPY: Partial<Record<LoadingLocale, PillarLabels>> = {
  ko: { year: "년주", month: "월주", day: "일주", hour: "시주" },
  ja: { year: "年柱", month: "月柱", day: "日柱", hour: "時柱" },
  "zh-CN": { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" },
  "zh-TW": { year: "年柱", month: "月柱", day: "日柱", hour: "時柱" },
  vi: { year: "Trụ Năm", month: "Trụ Tháng", day: "Trụ Ngày", hour: "Trụ Giờ" },
  hi: { year: "वर्ष स्तंभ", month: "मास स्तंभ", day: "दिन स्तंभ", hour: "घंटा स्तंभ" },
  es: { year: "Pilar del Año", month: "Pilar del Mes", day: "Pilar del Día", hour: "Pilar de la Hora" },
  fr: { year: "Pilier de l'Année", month: "Pilier du Mois", day: "Pilier du Jour", hour: "Pilier de l'Heure" },
  de: { year: "Jahressäule", month: "Monatssäule", day: "Tagessäule", hour: "Stundensäule" },
  nl: { year: "Jaarpijler", month: "Maandpijler", day: "Dagpijler", hour: "Uurpijler" },
  ms: { year: "Tiang Tahun", month: "Tiang Bulan", day: "Tiang Hari", hour: "Tiang Jam" },
};
function getPillarLabels(locale: LoadingLocale): PillarLabels {
  return PILLAR_LABEL_COPY[locale] || PILLAR_LABEL_EN;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function toRoman(num: number) {
  return ROMAN_NUMERALS[num - 1] || String(num);
}

function fiveElementDistribution(record?: Record<string, unknown> | null) {
  const entries = FIVE_ELEMENT_ORDER.map((element) => ({
    element,
    value: Number(record?.[element]) || 0,
  }));
  const max = Math.max(1, ...entries.map((entry) => entry.value));
  return entries.map((entry) => ({ ...entry, ratio: entry.value / max }));
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function safeFilePart(value: string) {
  return (value || "life-book").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 80);
}

interface LifeBookResultCopy {
  loadingDefault: string;
  loadingPendingWait: string;
  resultLinkMissing: string;
  preparingBook: string;
  loadFailed: string;
  cannotOpenResult: string;
  newBookCta: string;
  writingHeadline: string;
  writingBody: string;
  progressAriaLabel: (percent: number) => string;
  pdfQuickSave: string;
  reportKicker: string;
  reportSubtitleDefault: string;
  fieldName: string;
  fieldBirthDate: string;
  fieldBirthTime: string;
  fieldCreatedAt: string;
  fieldGender: string;
  fieldCalendar: string;
  fieldDayMaster: string;
  fieldFocusArea: string;
  notEntered: string;
  unknown: string;
  checking: string;
  genderFemale: string;
  genderMale: string;
  genderPrivate: string;
  calendarLunar: string;
  calendarSolar: string;
  calcLimited: string;
  birthTimeUnknown: string;
  focusAreaDefault: string;
  tocLabel: string;
  tocNavAriaLabel: string;
  chapterJumpAriaLabel: (index: number, title: string) => string;
  basicChartHeading: string;
  dayMasterPrefix: string;
  fiveElementHeading: string;
  fiveElementLimited: string;
  tenGodHeading: string;
  tenGodLimited: string;
  tenGodNoneSr: string;
  coreSummaryHeadlineDefault: string;
  coreSummaryThemeDefault: string;
  coreSummaryStrongPrefix: string;
  coreSummaryStrongDefault: string;
  coreSummaryBalancePrefix: string;
  coreSummaryBalanceDefault: string;
  chapterPageLabel: (n: number) => string;
  deckLabel: string;
  bookmarkNote: string;
  deepReadingHeading: string;
  deepReadingFallbackTitle: (n: number) => string;
  finalMessageHeading: string;
  finalChapterEyebrow: string;
  finalChapterBody: (name: string) => string;
  sealBookButton: string;
  openLovedOneBookLink: string;
  shareKicker: string;
  pdfCoverTitle: (name: string) => string;
  pdfSaveError: string;
  defaultUserName: string;
  fallbackChapters: string[];
  fiveElementLegend: Record<FiveElement, string>;
  tenGodGroupLabel: Record<string, string>;
  tenGodLabel: Record<string, string>;
}

const LIFE_BOOK_RESULT_EN: LifeBookResultCopy = {
  loadingDefault: "Loading your Life Book.",
  loadingPendingWait: "Waiting for the finished book.",
  resultLinkMissing: "Couldn't confirm the result link.",
  preparingBook: "Preparing your Life Book.",
  loadFailed: "Couldn't load the saved Life Book.",
  cannotOpenResult: "Can't open the result",
  newBookCta: "Create a new Life Book",
  writingHeadline: "The fortune master is writing your book",
  writingBody: "Weaving your chart's foundation with the flow of time to complete each chapter in turn. You don't need to keep this window open — the first chapter will open soon.",
  progressAriaLabel: (percent) => `Reading progress ${percent}%`,
  pdfQuickSave: "Quick-save as PDF",
  reportKicker: "Life Book Expert Consultation Report",
  reportSubtitleDefault: "Scenes of life read through your innate chart and the flow of time",
  fieldName: "Name",
  fieldBirthDate: "Birth date",
  fieldBirthTime: "Birth time",
  fieldCreatedAt: "Created",
  fieldGender: "Gender",
  fieldCalendar: "Calendar",
  fieldDayMaster: "Day Master",
  fieldFocusArea: "Focus area",
  notEntered: "Not entered",
  unknown: "Unknown",
  checking: "Checking",
  genderFemale: "Female",
  genderMale: "Male",
  genderPrivate: "Private",
  calendarLunar: "Lunar",
  calendarSolar: "Solar",
  calcLimited: "Calculation limited",
  birthTimeUnknown: "Birth time unknown",
  focusAreaDefault: "Whole-life flow",
  tocLabel: "Contents",
  tocNavAriaLabel: "Chapter contents",
  chapterJumpAriaLabel: (index, title) => `Go to chapter ${index}, ${title}`,
  basicChartHeading: "Basic Chart",
  dayMasterPrefix: "Day Master ",
  fiveElementHeading: "Five Element Distribution",
  fiveElementLimited: "The calculable Five Element values are limited.",
  tenGodHeading: "Ten God Distribution",
  tenGodLimited: "The calculable Ten God values are limited.",
  tenGodNoneSr: "None",
  coreSummaryHeadlineDefault: "The core sentence of your life",
  coreSummaryThemeDefault: "Your life theme reveals itself calmly.",
  coreSummaryStrongPrefix: "Strongest energy: ",
  coreSummaryStrongDefault: "Calculation-based reading",
  coreSummaryBalancePrefix: "Needs balance: ",
  coreSummaryBalanceDefault: "A flow worth watching for balance",
  chapterPageLabel: (n) => `Ch. ${n}`,
  deckLabel: "Turn the pages of your Life Book",
  bookmarkNote: "This is a chapter you bookmarked.",
  deepReadingHeading: "Deeper Readings of Your Chart",
  deepReadingFallbackTitle: (n) => `Deep Reading ${n}`,
  finalMessageHeading: "Final Words",
  finalChapterEyebrow: "— Final Chapter —",
  finalChapterBody: (name) => `${name}'s book closes here for now, but the story continues with today's choices. If a chapter stayed with you, seal this book and keep it.`,
  sealBookButton: "Seal and keep this book",
  openLovedOneBookLink: "Open a book for someone you love, too",
  shareKicker: "Life Book",
  pdfCoverTitle: (name) => `${name}'s Life Book`,
  pdfSaveError: "Couldn't save as PDF. Please try again shortly.",
  defaultUserName: "You",
  fallbackChapters: [
    "The Archetype of Your Birth Chart",
    "Personality and How Your Inner World Works",
    "Talent and Career Direction",
    "Love and Relationships",
    "Wealth and Material Foundations",
    "Relationships and Family",
    "Health and Seasonal Balance",
    "The Big Scenes of Life Seen Through Major Luck Cycles",
    "Advice for the Near-Term Yearly Cycle",
    "The Life Book's Final Sentence",
  ],
  fiveElementLegend: { 목: "Wood", 화: "Fire", 토: "Earth", 금: "Metal", 수: "Water" },
  tenGodGroupLabel: { 비겁: "Companions", 식상: "Output", 재성: "Wealth", 관성: "Officer", 인성: "Resource" },
  tenGodLabel: {
    비견: "Companion", 겁재: "Rival", 식신: "Output God", 상관: "Hurting Officer",
    편재: "Indirect Wealth", 정재: "Direct Wealth", 편관: "Seven Killings", 정관: "Direct Officer",
    편인: "Indirect Resource", 정인: "Direct Resource",
  },
};

const LIFE_BOOK_RESULT_COPY: Partial<Record<LoadingLocale, LifeBookResultCopy>> = {
  ko: {
    loadingDefault: "인생의 책을 불러오고 있습니다.",
    loadingPendingWait: "완성된 책을 기다리고 있습니다.",
    resultLinkMissing: "결과 링크를 확인하지 못했습니다.",
    preparingBook: "인생의 책을 준비하고 있습니다.",
    loadFailed: "저장된 인생의 책을 불러오지 못했습니다.",
    cannotOpenResult: "결과를 열 수 없습니다",
    newBookCta: "새로운 인생의 책 만들기",
    writingHeadline: "명리학자가 당신의 책을 집필하는 중입니다",
    writingBody: "사주의 뼈대와 시간의 흐름을 엮어 각 장을 차례로 완성하고 있습니다. 이 창은 닫지 않아도 곧 첫 장이 열립니다.",
    progressAriaLabel: (percent) => `책 진도 ${percent}%`,
    pdfQuickSave: "PDF로 빠르게 저장",
    reportKicker: "인생의 책 전문가 상담 리포트",
    reportSubtitleDefault: "타고난 사주와 시간의 흐름으로 읽는 삶의 장면",
    fieldName: "이름",
    fieldBirthDate: "생년월일",
    fieldBirthTime: "출생시간",
    fieldCreatedAt: "생성일",
    fieldGender: "성별",
    fieldCalendar: "달력 기준",
    fieldDayMaster: "일간",
    fieldFocusArea: "강조 영역",
    notEntered: "미입력",
    unknown: "모름",
    checking: "확인 중",
    genderFemale: "여성",
    genderMale: "남성",
    genderPrivate: "비공개",
    calendarLunar: "음력",
    calendarSolar: "양력",
    calcLimited: "계산 제한",
    birthTimeUnknown: "출생시간 모름",
    focusAreaDefault: "전체 인생 흐름",
    tocLabel: "차례",
    tocNavAriaLabel: "장 목차",
    chapterJumpAriaLabel: (index, title) => `${index}장 ${title}(으)로 이동`,
    basicChartHeading: "기본 명식",
    dayMasterPrefix: "일간 ",
    fiveElementHeading: "오행 분포",
    fiveElementLimited: "계산 가능한 오행 값이 제한되어 있습니다.",
    tenGodHeading: "십성 분포",
    tenGodLimited: "계산 가능한 십성 값이 제한되어 있습니다.",
    tenGodNoneSr: "해당 없음",
    coreSummaryHeadlineDefault: "삶의 중심 문장",
    coreSummaryThemeDefault: "삶의 주제가 차분히 드러납니다.",
    coreSummaryStrongPrefix: "강한 기운: ",
    coreSummaryStrongDefault: "계산 기반 해석",
    coreSummaryBalancePrefix: "보완점: ",
    coreSummaryBalanceDefault: "균형을 살피는 흐름",
    chapterPageLabel: (n) => `${n}장`,
    deckLabel: "인생의 책 장 넘기기",
    bookmarkNote: "책갈피를 꽂아 둔 장입니다.",
    deepReadingHeading: "명식의 깊은 판독",
    deepReadingFallbackTitle: (n) => `깊은 판독 ${n}`,
    finalMessageHeading: "마지막 문장",
    finalChapterEyebrow: "— 마지막 장 —",
    finalChapterBody: (name) => `${name}님의 책은 여기서 잠시 덮이지만, 이야기는 오늘의 선택에서 다시 이어집니다. 마음에 남는 장이 있다면 이 책을 봉인해 간직해 두세요.`,
    sealBookButton: "이 책을 봉인해 간직하기",
    openLovedOneBookLink: "소중한 사람의 책도 열어 보기",
    shareKicker: "인생의 책",
    pdfCoverTitle: (name) => `${name}님의 인생의 책`,
    pdfSaveError: "PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    defaultUserName: "당신",
    fallbackChapters: [
      "타고난 사주의 원형",
      "성격과 내면의 작동 방식",
      "재능과 일의 방향",
      "사랑과 인연",
      "재물과 현실 기반",
      "인간관계와 가족의 장",
      "건강과 조후의 균형",
      "대운으로 보는 인생의 큰 장면",
      "가까운 시기의 세운 조언",
      "인생의 책 마지막 문장",
    ],
    fiveElementLegend: { 목: "목", 화: "화", 토: "토", 금: "금", 수: "수" },
    tenGodGroupLabel: { 비겁: "비겁", 식상: "식상", 재성: "재성", 관성: "관성", 인성: "인성" },
    tenGodLabel: {
      비견: "비견", 겁재: "겁재", 식신: "식신", 상관: "상관",
      편재: "편재", 정재: "정재", 편관: "편관", 정관: "정관",
      편인: "편인", 정인: "정인",
    },
  },
  ja: {
    loadingDefault: "人生の本を読み込んでいます。",
    loadingPendingWait: "完成した本をお待ちしています。",
    resultLinkMissing: "結果リンクを確認できませんでした。",
    preparingBook: "人生の本を準備しています。",
    loadFailed: "保存された人生の本を読み込めませんでした。",
    cannotOpenResult: "結果を開けません",
    newBookCta: "新しい人生の本を作る",
    writingHeadline: "命理学者があなたの本を執筆中です",
    writingBody: "四柱の骨格と時の流れを織り交ぜて各章を順に完成させています。このウィンドウを閉じなくても、まもなく最初の章が開きます。",
    progressAriaLabel: (percent) => `読書進捗 ${percent}%`,
    pdfQuickSave: "PDFで素早く保存",
    reportKicker: "人生の本 専門家相談レポート",
    reportSubtitleDefault: "生まれ持った四柱と時の流れで読む人生の情景",
    fieldName: "名前",
    fieldBirthDate: "生年月日",
    fieldBirthTime: "出生時刻",
    fieldCreatedAt: "作成日",
    fieldGender: "性別",
    fieldCalendar: "暦の基準",
    fieldDayMaster: "日干",
    fieldFocusArea: "重点領域",
    notEntered: "未入力",
    unknown: "不明",
    checking: "確認中",
    genderFemale: "女性",
    genderMale: "男性",
    genderPrivate: "非公開",
    calendarLunar: "陰暦",
    calendarSolar: "陽暦",
    calcLimited: "計算制限",
    birthTimeUnknown: "出生時刻不明",
    focusAreaDefault: "人生全体の流れ",
    tocLabel: "目次",
    tocNavAriaLabel: "章の目次",
    chapterJumpAriaLabel: (index, title) => `第${index}章 ${title}へ移動`,
    basicChartHeading: "基本命式",
    dayMasterPrefix: "日干 ",
    fiveElementHeading: "五行分布",
    fiveElementLimited: "計算可能な五行の値が制限されています。",
    tenGodHeading: "十星分布",
    tenGodLimited: "計算可能な十星の値が制限されています。",
    tenGodNoneSr: "該当なし",
    coreSummaryHeadlineDefault: "人生の中心となる一文",
    coreSummaryThemeDefault: "人生のテーマが静かに現れます。",
    coreSummaryStrongPrefix: "強い気運: ",
    coreSummaryStrongDefault: "計算に基づく解釈",
    coreSummaryBalancePrefix: "補うべき点: ",
    coreSummaryBalanceDefault: "バランスを見る流れ",
    chapterPageLabel: (n) => `第${n}章`,
    deckLabel: "人生の本のページをめくる",
    bookmarkNote: "しおりを挟んだ章です。",
    deepReadingHeading: "命式の深い読み解き",
    deepReadingFallbackTitle: (n) => `深い読み解き ${n}`,
    finalMessageHeading: "最後の一文",
    finalChapterEyebrow: "— 最終章 —",
    finalChapterBody: (name) => `${name}様の本はここで一旦閉じますが、物語は今日の選択でまた続きます。心に残る章があれば、この本を封印して大切に保管してください。`,
    sealBookButton: "この本を封印して保管する",
    openLovedOneBookLink: "大切な人の本も開いてみる",
    shareKicker: "人生の本",
    pdfCoverTitle: (name) => `${name}様の人生の本`,
    pdfSaveError: "PDFとして保存できませんでした。しばらくしてからもう一度お試しください。",
    defaultUserName: "あなた",
    fallbackChapters: [
      "生まれ持った四柱の原型",
      "性格と内面の働き方",
      "才能と仕事の方向性",
      "恋愛と縁",
      "財と現実の基盤",
      "人間関係と家族の章",
      "健康と調候のバランス",
      "大運で見る人生の大きな場面",
      "近い時期の歳運アドバイス",
      "人生の本 最後の一文",
    ],
    fiveElementLegend: { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" },
    tenGodGroupLabel: { 비겁: "比劫", 식상: "食傷", 재성: "財星", 관성: "官星", 인성: "印星" },
    tenGodLabel: {
      비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
      편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
      편인: "偏印", 정인: "正印",
    },
  },
  "zh-CN": {
    loadingDefault: "正在加载人生之书。",
    loadingPendingWait: "正在等待完成的书。",
    resultLinkMissing: "无法确认结果链接。",
    preparingBook: "正在准备人生之书。",
    loadFailed: "无法加载已保存的人生之书。",
    cannotOpenResult: "无法打开结果",
    newBookCta: "创建新的人生之书",
    writingHeadline: "命理学家正在为你撰写这本书",
    writingBody: "正将四柱的骨架与时间的流动交织，依次完成各章。无需一直开着此窗口，第一章很快就会打开。",
    progressAriaLabel: (percent) => `阅读进度 ${percent}%`,
    pdfQuickSave: "快速保存为PDF",
    reportKicker: "人生之书 专家咨询报告",
    reportSubtitleDefault: "以你天生的四柱与时间的流动解读人生场景",
    fieldName: "姓名",
    fieldBirthDate: "出生日期",
    fieldBirthTime: "出生时间",
    fieldCreatedAt: "生成日期",
    fieldGender: "性别",
    fieldCalendar: "历法基准",
    fieldDayMaster: "日干",
    fieldFocusArea: "重点领域",
    notEntered: "未填写",
    unknown: "不详",
    checking: "确认中",
    genderFemale: "女性",
    genderMale: "男性",
    genderPrivate: "不公开",
    calendarLunar: "农历",
    calendarSolar: "阳历",
    calcLimited: "计算受限",
    birthTimeUnknown: "出生时间不详",
    focusAreaDefault: "整体人生走向",
    tocLabel: "目录",
    tocNavAriaLabel: "章节目录",
    chapterJumpAriaLabel: (index, title) => `跳转到第${index}章 ${title}`,
    basicChartHeading: "基本命式",
    dayMasterPrefix: "日干 ",
    fiveElementHeading: "五行分布",
    fiveElementLimited: "可计算的五行数值有限。",
    tenGodHeading: "十神分布",
    tenGodLimited: "可计算的十神数值有限。",
    tenGodNoneSr: "无对应项",
    coreSummaryHeadlineDefault: "人生的核心句子",
    coreSummaryThemeDefault: "你的人生主题正静静浮现。",
    coreSummaryStrongPrefix: "最强能量：",
    coreSummaryStrongDefault: "基于计算的解读",
    coreSummaryBalancePrefix: "需要补足：",
    coreSummaryBalanceDefault: "值得关注的平衡走向",
    chapterPageLabel: (n) => `第${n}章`,
    deckLabel: "翻阅人生之书的书页",
    bookmarkNote: "这是你标记书签的章节。",
    deepReadingHeading: "命式的深度解读",
    deepReadingFallbackTitle: (n) => `深度解读 ${n}`,
    finalMessageHeading: "最后一句",
    finalChapterEyebrow: "— 最终章 —",
    finalChapterBody: (name) => `${name}的这本书暂时在此合上，但故事会在今天的选择中继续。若有一章留在你心里，请将这本书封存珍藏。`,
    sealBookButton: "封存珍藏这本书",
    openLovedOneBookLink: "也为重要的人打开一本书",
    shareKicker: "人生之书",
    pdfCoverTitle: (name) => `${name}的人生之书`,
    pdfSaveError: "无法保存为PDF，请稍后重试。",
    defaultUserName: "你",
    fallbackChapters: [
      "天生四柱的原型",
      "性格与内心的运作方式",
      "才能与事业方向",
      "爱情与缘分",
      "财富与现实基础",
      "人际关系与家庭篇章",
      "健康与调候的平衡",
      "透过大运看人生的重大场景",
      "近期流年的建议",
      "人生之书的最后一句",
    ],
    fiveElementLegend: { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" },
    tenGodGroupLabel: { 비겁: "比劫", 식상: "食伤", 재성: "财星", 관성: "官星", 인성: "印星" },
    tenGodLabel: {
      비견: "比肩", 겁재: "劫财", 식신: "食神", 상관: "伤官",
      편재: "偏财", 정재: "正财", 편관: "偏官", 정관: "正官",
      편인: "偏印", 정인: "正印",
    },
  },
  "zh-TW": {
    loadingDefault: "正在載入人生之書。",
    loadingPendingWait: "正在等待完成的書。",
    resultLinkMissing: "無法確認結果連結。",
    preparingBook: "正在準備人生之書。",
    loadFailed: "無法載入已保存的人生之書。",
    cannotOpenResult: "無法開啟結果",
    newBookCta: "建立新的人生之書",
    writingHeadline: "命理學家正在為你撰寫這本書",
    writingBody: "正將四柱的骨架與時間的流動交織，依序完成各章。無需一直開著此視窗，第一章很快就會開啟。",
    progressAriaLabel: (percent) => `閱讀進度 ${percent}%`,
    pdfQuickSave: "快速儲存為PDF",
    reportKicker: "人生之書 專家諮詢報告",
    reportSubtitleDefault: "以你天生的四柱與時間的流動解讀人生場景",
    fieldName: "姓名",
    fieldBirthDate: "出生日期",
    fieldBirthTime: "出生時間",
    fieldCreatedAt: "產生日期",
    fieldGender: "性別",
    fieldCalendar: "曆法基準",
    fieldDayMaster: "日干",
    fieldFocusArea: "重點領域",
    notEntered: "未填寫",
    unknown: "不詳",
    checking: "確認中",
    genderFemale: "女性",
    genderMale: "男性",
    genderPrivate: "不公開",
    calendarLunar: "農曆",
    calendarSolar: "陽曆",
    calcLimited: "計算受限",
    birthTimeUnknown: "出生時間不詳",
    focusAreaDefault: "整體人生走向",
    tocLabel: "目錄",
    tocNavAriaLabel: "章節目錄",
    chapterJumpAriaLabel: (index, title) => `跳轉到第${index}章 ${title}`,
    basicChartHeading: "基本命式",
    dayMasterPrefix: "日干 ",
    fiveElementHeading: "五行分布",
    fiveElementLimited: "可計算的五行數值有限。",
    tenGodHeading: "十神分布",
    tenGodLimited: "可計算的十神數值有限。",
    tenGodNoneSr: "無對應項",
    coreSummaryHeadlineDefault: "人生的核心句子",
    coreSummaryThemeDefault: "你的人生主題正靜靜浮現。",
    coreSummaryStrongPrefix: "最強能量：",
    coreSummaryStrongDefault: "基於計算的解讀",
    coreSummaryBalancePrefix: "需要補足：",
    coreSummaryBalanceDefault: "值得關注的平衡走向",
    chapterPageLabel: (n) => `第${n}章`,
    deckLabel: "翻閱人生之書的書頁",
    bookmarkNote: "這是你標記書籤的章節。",
    deepReadingHeading: "命式的深度解讀",
    deepReadingFallbackTitle: (n) => `深度解讀 ${n}`,
    finalMessageHeading: "最後一句",
    finalChapterEyebrow: "— 最終章 —",
    finalChapterBody: (name) => `${name}的這本書暫時在此闔上，但故事會在今天的選擇中繼續。若有一章留在你心裡，請將這本書封存珍藏。`,
    sealBookButton: "封存珍藏這本書",
    openLovedOneBookLink: "也為重要的人開啟一本書",
    shareKicker: "人生之書",
    pdfCoverTitle: (name) => `${name}的人生之書`,
    pdfSaveError: "無法儲存為PDF，請稍後重試。",
    defaultUserName: "你",
    fallbackChapters: [
      "天生四柱的原型",
      "性格與內心的運作方式",
      "才能與事業方向",
      "愛情與緣分",
      "財富與現實基礎",
      "人際關係與家庭篇章",
      "健康與調候的平衡",
      "透過大運看人生的重大場景",
      "近期流年的建議",
      "人生之書的最後一句",
    ],
    fiveElementLegend: { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" },
    tenGodGroupLabel: { 비겁: "比劫", 식상: "食傷", 재성: "財星", 관성: "官星", 인성: "印星" },
    tenGodLabel: {
      비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
      편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
      편인: "偏印", 정인: "正印",
    },
  },
  vi: {
    loadingDefault: "Đang tải Cuốn Sách Cuộc Đời của bạn.",
    loadingPendingWait: "Đang chờ cuốn sách hoàn thành.",
    resultLinkMissing: "Không xác nhận được liên kết kết quả.",
    preparingBook: "Đang chuẩn bị Cuốn Sách Cuộc Đời của bạn.",
    loadFailed: "Không thể tải Cuốn Sách Cuộc Đời đã lưu.",
    cannotOpenResult: "Không thể mở kết quả",
    newBookCta: "Tạo Cuốn Sách Cuộc Đời mới",
    writingHeadline: "Chuyên gia mệnh lý đang viết cuốn sách của bạn",
    writingBody: "Đang đan xen khung lá số với dòng chảy thời gian để hoàn thành từng chương. Bạn không cần giữ cửa sổ này mở — chương đầu sẽ mở ra ngay thôi.",
    progressAriaLabel: (percent) => `Tiến độ đọc ${percent}%`,
    pdfQuickSave: "Lưu nhanh dưới dạng PDF",
    reportKicker: "Báo Cáo Tư Vấn Chuyên Gia Cuốn Sách Cuộc Đời",
    reportSubtitleDefault: "Những cảnh đời được đọc qua lá số bẩm sinh và dòng chảy thời gian",
    fieldName: "Họ tên",
    fieldBirthDate: "Ngày sinh",
    fieldBirthTime: "Giờ sinh",
    fieldCreatedAt: "Ngày tạo",
    fieldGender: "Giới tính",
    fieldCalendar: "Loại lịch",
    fieldDayMaster: "Nhật Chủ",
    fieldFocusArea: "Lĩnh vực trọng tâm",
    notEntered: "Chưa nhập",
    unknown: "Không rõ",
    checking: "Đang xác nhận",
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderPrivate: "Không công khai",
    calendarLunar: "Âm lịch",
    calendarSolar: "Dương lịch",
    calcLimited: "Tính toán giới hạn",
    birthTimeUnknown: "Không rõ giờ sinh",
    focusAreaDefault: "Toàn bộ dòng chảy cuộc đời",
    tocLabel: "Mục lục",
    tocNavAriaLabel: "Mục lục chương",
    chapterJumpAriaLabel: (index, title) => `Đi tới chương ${index}, ${title}`,
    basicChartHeading: "Lá Số Cơ Bản",
    dayMasterPrefix: "Nhật Chủ ",
    fiveElementHeading: "Phân Bố Ngũ Hành",
    fiveElementLimited: "Các giá trị Ngũ Hành có thể tính toán bị giới hạn.",
    tenGodHeading: "Phân Bố Thập Thần",
    tenGodLimited: "Các giá trị Thập Thần có thể tính toán bị giới hạn.",
    tenGodNoneSr: "Không có",
    coreSummaryHeadlineDefault: "Câu văn trung tâm của cuộc đời bạn",
    coreSummaryThemeDefault: "Chủ đề cuộc đời bạn hiện ra một cách nhẹ nhàng.",
    coreSummaryStrongPrefix: "Năng lượng mạnh nhất: ",
    coreSummaryStrongDefault: "Diễn giải dựa trên tính toán",
    coreSummaryBalancePrefix: "Cần bổ sung: ",
    coreSummaryBalanceDefault: "Dòng chảy cần theo dõi để cân bằng",
    chapterPageLabel: (n) => `Chương ${n}`,
    deckLabel: "Lật trang Cuốn Sách Cuộc Đời",
    bookmarkNote: "Đây là chương bạn đã đánh dấu.",
    deepReadingHeading: "Luận Giải Sâu Về Lá Số",
    deepReadingFallbackTitle: (n) => `Luận Giải Sâu ${n}`,
    finalMessageHeading: "Lời Cuối",
    finalChapterEyebrow: "— Chương Cuối —",
    finalChapterBody: (name) => `Cuốn sách của ${name} khép lại ở đây trong chốc lát, nhưng câu chuyện vẫn tiếp tục qua những lựa chọn hôm nay. Nếu có một chương đọng lại trong lòng bạn, hãy niêm phong và gìn giữ cuốn sách này.`,
    sealBookButton: "Niêm phong và gìn giữ cuốn sách này",
    openLovedOneBookLink: "Mở một cuốn sách cho người bạn yêu thương",
    shareKicker: "Cuốn Sách Cuộc Đời",
    pdfCoverTitle: (name) => `Cuốn Sách Cuộc Đời của ${name}`,
    pdfSaveError: "Không thể lưu dưới dạng PDF. Vui lòng thử lại sau.",
    defaultUserName: "Bạn",
    fallbackChapters: [
      "Nguyên Mẫu Lá Số Bẩm Sinh",
      "Tính Cách và Cách Nội Tâm Vận Hành",
      "Tài Năng và Hướng Sự Nghiệp",
      "Tình Yêu và Duyên Phận",
      "Tài Lộc và Nền Tảng Thực Tế",
      "Các Mối Quan Hệ và Gia Đình",
      "Sức Khỏe và Sự Cân Bằng Theo Mùa",
      "Những Cảnh Lớn Của Cuộc Đời Qua Đại Vận",
      "Lời Khuyên Cho Lưu Niên Gần Đây",
      "Câu Văn Cuối Của Cuốn Sách Cuộc Đời",
    ],
    fiveElementLegend: { 목: "Mộc", 화: "Hỏa", 토: "Thổ", 금: "Kim", 수: "Thủy" },
    tenGodGroupLabel: { 비겁: "Tỷ Kiếp", 식상: "Thực Thương", 재성: "Tài Tinh", 관성: "Quan Tinh", 인성: "Ấn Tinh" },
    tenGodLabel: {
      비견: "Tỷ Kiên", 겁재: "Kiếp Tài", 식신: "Thực Thần", 상관: "Thương Quan",
      편재: "Thiên Tài", 정재: "Chính Tài", 편관: "Thiên Quan", 정관: "Chính Quan",
      편인: "Thiên Ấn", 정인: "Chính Ấn",
    },
  },
  hi: {
    loadingDefault: "आपकी जीवन की पुस्तक लोड हो रही है।",
    loadingPendingWait: "पूर्ण पुस्तक की प्रतीक्षा की जा रही है।",
    resultLinkMissing: "परिणाम लिंक की पुष्टि नहीं हो सकी।",
    preparingBook: "आपकी जीवन की पुस्तक तैयार की जा रही है।",
    loadFailed: "सहेजी गई जीवन की पुस्तक लोड नहीं हो सकी।",
    cannotOpenResult: "परिणाम नहीं खोला जा सका",
    newBookCta: "नई जीवन की पुस्तक बनाएं",
    writingHeadline: "ज्योतिषी आपकी पुस्तक लिख रहे हैं",
    writingBody: "साजू की संरचना को समय के प्रवाह से बुनते हुए प्रत्येक अध्याय को क्रम से पूरा किया जा रहा है। इस विंडो को खुला रखने की आवश्यकता नहीं है — जल्द ही पहला अध्याय खुलेगा।",
    progressAriaLabel: (percent) => `पठन प्रगति ${percent}%`,
    pdfQuickSave: "PDF के रूप में त्वरित सहेजें",
    reportKicker: "जीवन की पुस्तक विशेषज्ञ परामर्श रिपोर्ट",
    reportSubtitleDefault: "जन्मजात साजू और समय के प्रवाह से पढ़े गए जीवन के दृश्य",
    fieldName: "नाम",
    fieldBirthDate: "जन्म तिथि",
    fieldBirthTime: "जन्म समय",
    fieldCreatedAt: "बनाई गई तिथि",
    fieldGender: "लिंग",
    fieldCalendar: "कैलेंडर आधार",
    fieldDayMaster: "डे मास्टर",
    fieldFocusArea: "फोकस क्षेत्र",
    notEntered: "दर्ज नहीं किया गया",
    unknown: "अज्ञात",
    checking: "जांच की जा रही है",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderPrivate: "निजी",
    calendarLunar: "चंद्र कैलेंडर",
    calendarSolar: "सौर कैलेंडर",
    calcLimited: "गणना सीमित",
    birthTimeUnknown: "जन्म समय अज्ञात",
    focusAreaDefault: "संपूर्ण जीवन प्रवाह",
    tocLabel: "विषय-सूची",
    tocNavAriaLabel: "अध्याय सूची",
    chapterJumpAriaLabel: (index, title) => `अध्याय ${index}, ${title} पर जाएं`,
    basicChartHeading: "मूल कुंडली",
    dayMasterPrefix: "डे मास्टर ",
    fiveElementHeading: "पंच तत्व वितरण",
    fiveElementLimited: "गणना योग्य पंच तत्व मान सीमित हैं।",
    tenGodHeading: "टेन गॉड वितरण",
    tenGodLimited: "गणना योग्य टेन गॉड मान सीमित हैं।",
    tenGodNoneSr: "कोई नहीं",
    coreSummaryHeadlineDefault: "आपके जीवन का केंद्रीय वाक्य",
    coreSummaryThemeDefault: "आपका जीवन विषय शांति से प्रकट होता है।",
    coreSummaryStrongPrefix: "सबसे प्रबल ऊर्जा: ",
    coreSummaryStrongDefault: "गणना-आधारित व्याख्या",
    coreSummaryBalancePrefix: "संतुलन की आवश्यकता: ",
    coreSummaryBalanceDefault: "संतुलन के लिए ध्यान देने योग्य प्रवाह",
    chapterPageLabel: (n) => `अध्याय ${n}`,
    deckLabel: "जीवन की पुस्तक के पन्ने पलटें",
    bookmarkNote: "यह वह अध्याय है जिसे आपने बुकमार्क किया है।",
    deepReadingHeading: "कुंडली का गहन विश्लेषण",
    deepReadingFallbackTitle: (n) => `गहन विश्लेषण ${n}`,
    finalMessageHeading: "अंतिम शब्द",
    finalChapterEyebrow: "— अंतिम अध्याय —",
    finalChapterBody: (name) => `${name} की पुस्तक यहां फिलहाल बंद होती है, लेकिन कहानी आज के चुनावों के साथ आगे बढ़ती रहती है। यदि कोई अध्याय आपके मन में बसा है, तो इस पुस्तक को सुरक्षित रखें।`,
    sealBookButton: "इस पुस्तक को सुरक्षित रखें",
    openLovedOneBookLink: "अपने प्रियजन के लिए भी एक पुस्तक खोलें",
    shareKicker: "जीवन की पुस्तक",
    pdfCoverTitle: (name) => `${name} की जीवन की पुस्तक`,
    pdfSaveError: "PDF के रूप में सहेजा नहीं जा सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    defaultUserName: "आप",
    fallbackChapters: [
      "जन्मजात कुंडली का आद्यरूप",
      "व्यक्तित्व और आंतरिक कार्यप्रणाली",
      "प्रतिभा और करियर दिशा",
      "प्रेम और संबंध",
      "धन और वास्तविक आधार",
      "रिश्ते और परिवार का अध्याय",
      "स्वास्थ्य और ऋतु संतुलन",
      "महादशा से देखे गए जीवन के बड़े दृश्य",
      "निकट भविष्य के वार्षिक चक्र की सलाह",
      "जीवन की पुस्तक का अंतिम वाक्य",
    ],
    fiveElementLegend: { 목: "लकड़ी", 화: "अग्नि", 토: "पृथ्वी", 금: "धातु", 수: "जल" },
    tenGodGroupLabel: { 비겁: "साथी वर्ग", 식상: "निर्गम वर्ग", 재성: "धन वर्ग", 관성: "अधिकारी वर्ग", 인성: "संसाधन वर्ग" },
    tenGodLabel: {
      비견: "साथी", 겁재: "प्रतिद्वंद्वी", 식신: "निर्गम देवता", 상관: "आहत अधिकारी",
      편재: "अप्रत्यक्ष धन", 정재: "प्रत्यक्ष धन", 편관: "सप्त वध", 정관: "प्रत्यक्ष अधिकारी",
      편인: "अप्रत्यक्ष संसाधन", 정인: "प्रत्यक्ष संसाधन",
    },
  },
  es: {
    loadingDefault: "Cargando tu Libro de la Vida.",
    loadingPendingWait: "Esperando el libro terminado.",
    resultLinkMissing: "No se pudo confirmar el enlace del resultado.",
    preparingBook: "Preparando tu Libro de la Vida.",
    loadFailed: "No se pudo cargar el Libro de la Vida guardado.",
    cannotOpenResult: "No se puede abrir el resultado",
    newBookCta: "Crear un nuevo Libro de la Vida",
    writingHeadline: "El maestro de fortuna está escribiendo tu libro",
    writingBody: "Está entrelazando la base de tu carta con el flujo del tiempo para completar cada capítulo por turno. No necesitas mantener esta ventana abierta — el primer capítulo se abrirá pronto.",
    progressAriaLabel: (percent) => `Progreso de lectura ${percent}%`,
    pdfQuickSave: "Guardar rápido como PDF",
    reportKicker: "Informe de Consulta Experta del Libro de la Vida",
    reportSubtitleDefault: "Escenas de la vida leídas a través de tu carta innata y el flujo del tiempo",
    fieldName: "Nombre",
    fieldBirthDate: "Fecha de nacimiento",
    fieldBirthTime: "Hora de nacimiento",
    fieldCreatedAt: "Creado",
    fieldGender: "Género",
    fieldCalendar: "Calendario",
    fieldDayMaster: "Maestro del Día",
    fieldFocusArea: "Área de enfoque",
    notEntered: "No ingresado",
    unknown: "Desconocido",
    checking: "Verificando",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderPrivate: "Privado",
    calendarLunar: "Lunar",
    calendarSolar: "Solar",
    calcLimited: "Cálculo limitado",
    birthTimeUnknown: "Hora de nacimiento desconocida",
    focusAreaDefault: "Flujo de vida completo",
    tocLabel: "Índice",
    tocNavAriaLabel: "Índice de capítulos",
    chapterJumpAriaLabel: (index, title) => `Ir al capítulo ${index}, ${title}`,
    basicChartHeading: "Carta Básica",
    dayMasterPrefix: "Maestro del Día ",
    fiveElementHeading: "Distribución de los Cinco Elementos",
    fiveElementLimited: "Los valores calculables de los Cinco Elementos son limitados.",
    tenGodHeading: "Distribución de los Diez Dioses",
    tenGodLimited: "Los valores calculables de los Diez Dioses son limitados.",
    tenGodNoneSr: "Ninguno",
    coreSummaryHeadlineDefault: "La frase central de tu vida",
    coreSummaryThemeDefault: "El tema de tu vida se revela con calma.",
    coreSummaryStrongPrefix: "Energía más fuerte: ",
    coreSummaryStrongDefault: "Lectura basada en cálculo",
    coreSummaryBalancePrefix: "Necesita equilibrio: ",
    coreSummaryBalanceDefault: "Un flujo a observar para el equilibrio",
    chapterPageLabel: (n) => `Cap. ${n}`,
    deckLabel: "Pasar las páginas de tu Libro de la Vida",
    bookmarkNote: "Este es un capítulo que marcaste.",
    deepReadingHeading: "Lecturas Profundas de tu Carta",
    deepReadingFallbackTitle: (n) => `Lectura Profunda ${n}`,
    finalMessageHeading: "Palabras Finales",
    finalChapterEyebrow: "— Capítulo Final —",
    finalChapterBody: (name) => `El libro de ${name} se cierra aquí por ahora, pero la historia continúa con las decisiones de hoy. Si un capítulo te quedó grabado, sella y guarda este libro.`,
    sealBookButton: "Sellar y guardar este libro",
    openLovedOneBookLink: "Abre también un libro para alguien que quieras",
    shareKicker: "Libro de la Vida",
    pdfCoverTitle: (name) => `El Libro de la Vida de ${name}`,
    pdfSaveError: "No se pudo guardar como PDF. Inténtalo de nuevo en unos momentos.",
    defaultUserName: "Tú",
    fallbackChapters: [
      "El Arquetipo de tu Carta Natal",
      "Personalidad y Cómo Funciona tu Mundo Interior",
      "Talento y Dirección Profesional",
      "Amor y Relaciones",
      "Riqueza y Bases Materiales",
      "Relaciones y Familia",
      "Salud y Equilibrio Estacional",
      "Las Grandes Escenas de la Vida Vistas a Través de los Ciclos de la Suerte Mayor",
      "Consejos para el Ciclo Anual Cercano",
      "La Frase Final del Libro de la Vida",
    ],
    fiveElementLegend: { 목: "Madera", 화: "Fuego", 토: "Tierra", 금: "Metal", 수: "Agua" },
    tenGodGroupLabel: { 비겁: "Compañeros", 식상: "Producción", 재성: "Riqueza", 관성: "Oficial", 인성: "Recurso" },
    tenGodLabel: {
      비견: "Compañero", 겁재: "Rival", 식신: "Dios de la Producción", 상관: "Oficial Dañino",
      편재: "Riqueza Indirecta", 정재: "Riqueza Directa", 편관: "Siete Muertes", 정관: "Oficial Directo",
      편인: "Recurso Indirecto", 정인: "Recurso Directo",
    },
  },
  fr: {
    loadingDefault: "Chargement de votre Livre de Vie.",
    loadingPendingWait: "En attente du livre terminé.",
    resultLinkMissing: "Impossible de confirmer le lien du résultat.",
    preparingBook: "Préparation de votre Livre de Vie.",
    loadFailed: "Impossible de charger le Livre de Vie enregistré.",
    cannotOpenResult: "Impossible d'ouvrir le résultat",
    newBookCta: "Créer un nouveau Livre de Vie",
    writingHeadline: "Le maître de la destinée rédige votre livre",
    writingBody: "La structure de votre thème est tissée avec le flux du temps pour compléter chaque chapitre à tour de rôle. Vous n'avez pas besoin de garder cette fenêtre ouverte — le premier chapitre s'ouvrira bientôt.",
    progressAriaLabel: (percent) => `Progression de lecture ${percent}%`,
    pdfQuickSave: "Enregistrement rapide en PDF",
    reportKicker: "Rapport de Consultation Experte du Livre de Vie",
    reportSubtitleDefault: "Des scènes de vie lues à travers votre thème inné et le flux du temps",
    fieldName: "Nom",
    fieldBirthDate: "Date de naissance",
    fieldBirthTime: "Heure de naissance",
    fieldCreatedAt: "Créé le",
    fieldGender: "Genre",
    fieldCalendar: "Calendrier",
    fieldDayMaster: "Maître du Jour",
    fieldFocusArea: "Domaine d'attention",
    notEntered: "Non renseigné",
    unknown: "Inconnu",
    checking: "Vérification",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderPrivate: "Privé",
    calendarLunar: "Lunaire",
    calendarSolar: "Solaire",
    calcLimited: "Calcul limité",
    birthTimeUnknown: "Heure de naissance inconnue",
    focusAreaDefault: "Flux de vie complet",
    tocLabel: "Sommaire",
    tocNavAriaLabel: "Sommaire des chapitres",
    chapterJumpAriaLabel: (index, title) => `Aller au chapitre ${index}, ${title}`,
    basicChartHeading: "Thème de Base",
    dayMasterPrefix: "Maître du Jour ",
    fiveElementHeading: "Répartition des Cinq Éléments",
    fiveElementLimited: "Les valeurs calculables des Cinq Éléments sont limitées.",
    tenGodHeading: "Répartition des Dix Dieux",
    tenGodLimited: "Les valeurs calculables des Dix Dieux sont limitées.",
    tenGodNoneSr: "Aucun",
    coreSummaryHeadlineDefault: "La phrase centrale de votre vie",
    coreSummaryThemeDefault: "Le thème de votre vie se révèle calmement.",
    coreSummaryStrongPrefix: "Énergie la plus forte : ",
    coreSummaryStrongDefault: "Lecture basée sur le calcul",
    coreSummaryBalancePrefix: "Besoin d'équilibre : ",
    coreSummaryBalanceDefault: "Un flux à surveiller pour l'équilibre",
    chapterPageLabel: (n) => `Chap. ${n}`,
    deckLabel: "Tourner les pages de votre Livre de Vie",
    bookmarkNote: "Voici un chapitre que vous avez marqué.",
    deepReadingHeading: "Lectures Approfondies de Votre Thème",
    deepReadingFallbackTitle: (n) => `Lecture Approfondie ${n}`,
    finalMessageHeading: "Derniers Mots",
    finalChapterEyebrow: "— Chapitre Final —",
    finalChapterBody: (name) => `Le livre de ${name} se referme ici pour un moment, mais l'histoire se poursuit avec les choix d'aujourd'hui. Si un chapitre vous a marqué, scellez et conservez ce livre.`,
    sealBookButton: "Sceller et conserver ce livre",
    openLovedOneBookLink: "Ouvrir aussi un livre pour un proche",
    shareKicker: "Livre de Vie",
    pdfCoverTitle: (name) => `Le Livre de Vie de ${name}`,
    pdfSaveError: "Impossible d'enregistrer en PDF. Veuillez réessayer dans un instant.",
    defaultUserName: "Vous",
    fallbackChapters: [
      "L'Archétype de Votre Thème de Naissance",
      "Personnalité et Fonctionnement de Votre Monde Intérieur",
      "Talent et Orientation Professionnelle",
      "Amour et Relations",
      "Richesse et Fondations Matérielles",
      "Relations et Famille",
      "Santé et Équilibre Saisonnier",
      "Les Grandes Scènes de la Vie Vues à Travers les Cycles de Grande Chance",
      "Conseils pour le Cycle Annuel Proche",
      "La Phrase Finale du Livre de Vie",
    ],
    fiveElementLegend: { 목: "Bois", 화: "Feu", 토: "Terre", 금: "Métal", 수: "Eau" },
    tenGodGroupLabel: { 비겁: "Compagnons", 식상: "Production", 재성: "Richesse", 관성: "Officier", 인성: "Ressource" },
    tenGodLabel: {
      비견: "Compagnon", 겁재: "Rival", 식신: "Dieu de Production", 상관: "Officier Blessant",
      편재: "Richesse Indirecte", 정재: "Richesse Directe", 편관: "Sept Tueries", 정관: "Officier Direct",
      편인: "Ressource Indirecte", 정인: "Ressource Directe",
    },
  },
  de: {
    loadingDefault: "Dein Lebensbuch wird geladen.",
    loadingPendingWait: "Warten auf das fertige Buch.",
    resultLinkMissing: "Der Ergebnislink konnte nicht bestätigt werden.",
    preparingBook: "Dein Lebensbuch wird vorbereitet.",
    loadFailed: "Das gespeicherte Lebensbuch konnte nicht geladen werden.",
    cannotOpenResult: "Ergebnis kann nicht geöffnet werden",
    newBookCta: "Neues Lebensbuch erstellen",
    writingHeadline: "Der Schicksalsmeister schreibt gerade dein Buch",
    writingBody: "Das Gerüst deines Charts wird mit dem Fluss der Zeit verwoben, um jedes Kapitel nacheinander zu vollenden. Du musst dieses Fenster nicht offen halten — das erste Kapitel öffnet sich bald.",
    progressAriaLabel: (percent) => `Lesefortschritt ${percent}%`,
    pdfQuickSave: "Schnell als PDF speichern",
    reportKicker: "Lebensbuch Experten-Beratungsbericht",
    reportSubtitleDefault: "Lebensszenen, gelesen durch dein angeborenes Chart und den Fluss der Zeit",
    fieldName: "Name",
    fieldBirthDate: "Geburtsdatum",
    fieldBirthTime: "Geburtszeit",
    fieldCreatedAt: "Erstellt am",
    fieldGender: "Geschlecht",
    fieldCalendar: "Kalender",
    fieldDayMaster: "Tagesmeister",
    fieldFocusArea: "Schwerpunktbereich",
    notEntered: "Nicht angegeben",
    unknown: "Unbekannt",
    checking: "Wird geprüft",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderPrivate: "Privat",
    calendarLunar: "Mondkalender",
    calendarSolar: "Sonnenkalender",
    calcLimited: "Berechnung begrenzt",
    birthTimeUnknown: "Geburtszeit unbekannt",
    focusAreaDefault: "Gesamter Lebensfluss",
    tocLabel: "Inhalt",
    tocNavAriaLabel: "Kapitelverzeichnis",
    chapterJumpAriaLabel: (index, title) => `Zu Kapitel ${index}, ${title} springen`,
    basicChartHeading: "Grundlegendes Chart",
    dayMasterPrefix: "Tagesmeister ",
    fiveElementHeading: "Verteilung der Fünf Elemente",
    fiveElementLimited: "Die berechenbaren Werte der Fünf Elemente sind begrenzt.",
    tenGodHeading: "Verteilung der Zehn Götter",
    tenGodLimited: "Die berechenbaren Werte der Zehn Götter sind begrenzt.",
    tenGodNoneSr: "Keine",
    coreSummaryHeadlineDefault: "Der zentrale Satz deines Lebens",
    coreSummaryThemeDefault: "Dein Lebensthema offenbart sich ruhig.",
    coreSummaryStrongPrefix: "Stärkste Energie: ",
    coreSummaryStrongDefault: "Berechnungsbasierte Deutung",
    coreSummaryBalancePrefix: "Benötigt Ausgleich: ",
    coreSummaryBalanceDefault: "Ein Fluss, den man für Ausgleich beobachten sollte",
    chapterPageLabel: (n) => `Kap. ${n}`,
    deckLabel: "Die Seiten deines Lebensbuchs umblättern",
    bookmarkNote: "Dies ist ein Kapitel, das du mit einem Lesezeichen versehen hast.",
    deepReadingHeading: "Tiefere Deutungen deines Charts",
    deepReadingFallbackTitle: (n) => `Tiefere Deutung ${n}`,
    finalMessageHeading: "Letzte Worte",
    finalChapterEyebrow: "— Letztes Kapitel —",
    finalChapterBody: (name) => `Das Buch von ${name} schließt sich hier vorerst, aber die Geschichte geht mit den Entscheidungen von heute weiter. Wenn dir ein Kapitel im Gedächtnis geblieben ist, versiegle und bewahre dieses Buch.`,
    sealBookButton: "Dieses Buch versiegeln und aufbewahren",
    openLovedOneBookLink: "Auch ein Buch für einen geliebten Menschen öffnen",
    shareKicker: "Lebensbuch",
    pdfCoverTitle: (name) => `${name}s Lebensbuch`,
    pdfSaveError: "Konnte nicht als PDF gespeichert werden. Bitte versuchen Sie es später erneut.",
    defaultUserName: "Du",
    fallbackChapters: [
      "Der Archetyp deines Geburtscharts",
      "Persönlichkeit und wie deine innere Welt funktioniert",
      "Talent und Karriererichtung",
      "Liebe und Beziehungen",
      "Reichtum und materielle Grundlagen",
      "Beziehungen und Familie",
      "Gesundheit und saisonales Gleichgewicht",
      "Die großen Lebensszenen, gesehen durch die großen Glückszyklen",
      "Ratschläge für den nahen Jahreszyklus",
      "Der letzte Satz des Lebensbuchs",
    ],
    fiveElementLegend: { 목: "Holz", 화: "Feuer", 토: "Erde", 금: "Metall", 수: "Wasser" },
    tenGodGroupLabel: { 비겁: "Gefährten", 식상: "Ausgabe", 재성: "Reichtum", 관성: "Beamter", 인성: "Ressource" },
    tenGodLabel: {
      비견: "Gefährte", 겁재: "Rivale", 식신: "Ausgabegott", 상관: "Verletzender Beamter",
      편재: "Indirekter Reichtum", 정재: "Direkter Reichtum", 편관: "Sieben Tötungen", 정관: "Direkter Beamter",
      편인: "Indirekte Ressource", 정인: "Direkte Ressource",
    },
  },
  nl: {
    loadingDefault: "Je Levensboek wordt geladen.",
    loadingPendingWait: "Wachten op het voltooide boek.",
    resultLinkMissing: "Kon de resultaatlink niet bevestigen.",
    preparingBook: "Je Levensboek wordt voorbereid.",
    loadFailed: "Kon het opgeslagen Levensboek niet laden.",
    cannotOpenResult: "Kan het resultaat niet openen",
    newBookCta: "Nieuw Levensboek maken",
    writingHeadline: "De lotsmeester schrijft je boek",
    writingBody: "Het raamwerk van je chart wordt verweven met de stroom van de tijd om elk hoofdstuk op zijn beurt te voltooien. Je hoeft dit venster niet open te houden — het eerste hoofdstuk opent binnenkort.",
    progressAriaLabel: (percent) => `Leesvoortgang ${percent}%`,
    pdfQuickSave: "Snel opslaan als PDF",
    reportKicker: "Levensboek Expertconsult Rapport",
    reportSubtitleDefault: "Levensscènes gelezen door je aangeboren chart en de stroom van de tijd",
    fieldName: "Naam",
    fieldBirthDate: "Geboortedatum",
    fieldBirthTime: "Geboortetijd",
    fieldCreatedAt: "Aangemaakt op",
    fieldGender: "Geslacht",
    fieldCalendar: "Kalender",
    fieldDayMaster: "Dagmeester",
    fieldFocusArea: "Focusgebied",
    notEntered: "Niet ingevoerd",
    unknown: "Onbekend",
    checking: "Wordt gecontroleerd",
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderPrivate: "Privé",
    calendarLunar: "Maankalender",
    calendarSolar: "Zonkalender",
    calcLimited: "Berekening beperkt",
    birthTimeUnknown: "Geboortetijd onbekend",
    focusAreaDefault: "Volledige levensstroom",
    tocLabel: "Inhoud",
    tocNavAriaLabel: "Hoofdstukoverzicht",
    chapterJumpAriaLabel: (index, title) => `Ga naar hoofdstuk ${index}, ${title}`,
    basicChartHeading: "Basischart",
    dayMasterPrefix: "Dagmeester ",
    fiveElementHeading: "Verdeling van de Vijf Elementen",
    fiveElementLimited: "De berekenbare waarden van de Vijf Elementen zijn beperkt.",
    tenGodHeading: "Verdeling van de Tien Goden",
    tenGodLimited: "De berekenbare waarden van de Tien Goden zijn beperkt.",
    tenGodNoneSr: "Geen",
    coreSummaryHeadlineDefault: "De kernzin van je leven",
    coreSummaryThemeDefault: "Je levensthema onthult zich rustig.",
    coreSummaryStrongPrefix: "Sterkste energie: ",
    coreSummaryStrongDefault: "Op berekening gebaseerde duiding",
    coreSummaryBalancePrefix: "Behoefte aan balans: ",
    coreSummaryBalanceDefault: "Een stroom om in de gaten te houden voor balans",
    chapterPageLabel: (n) => `Hfst. ${n}`,
    deckLabel: "Blader door de pagina's van je Levensboek",
    bookmarkNote: "Dit is een hoofdstuk dat je hebt gemarkeerd.",
    deepReadingHeading: "Diepere Duidingen van Je Chart",
    deepReadingFallbackTitle: (n) => `Diepere Duiding ${n}`,
    finalMessageHeading: "Laatste Woorden",
    finalChapterEyebrow: "— Laatste Hoofdstuk —",
    finalChapterBody: (name) => `Het boek van ${name} sluit hier voor nu, maar het verhaal gaat verder met de keuzes van vandaag. Als een hoofdstuk je is bijgebleven, verzegel en bewaar dit boek.`,
    sealBookButton: "Verzegel en bewaar dit boek",
    openLovedOneBookLink: "Open ook een boek voor iemand die je dierbaar is",
    shareKicker: "Levensboek",
    pdfCoverTitle: (name) => `Het Levensboek van ${name}`,
    pdfSaveError: "Kon niet als PDF worden opgeslagen. Probeer het later opnieuw.",
    defaultUserName: "Jij",
    fallbackChapters: [
      "Het Archetype van Je Geboortechart",
      "Persoonlijkheid en Hoe Je Innerlijke Wereld Werkt",
      "Talent en Carrièrerichting",
      "Liefde en Relaties",
      "Rijkdom en Materiële Basis",
      "Relaties en Familie",
      "Gezondheid en Seizoensbalans",
      "De Grote Scènes van het Leven Gezien Door Grote Gelukscycli",
      "Advies voor de Nabije Jaarcyclus",
      "De Laatste Zin van het Levensboek",
    ],
    fiveElementLegend: { 목: "Hout", 화: "Vuur", 토: "Aarde", 금: "Metaal", 수: "Water" },
    tenGodGroupLabel: { 비겁: "Metgezellen", 식상: "Uitvoer", 재성: "Rijkdom", 관성: "Ambtenaar", 인성: "Hulpbron" },
    tenGodLabel: {
      비견: "Metgezel", 겁재: "Rivaal", 식신: "Uitvoergod", 상관: "Kwetsende Ambtenaar",
      편재: "Indirecte Rijkdom", 정재: "Directe Rijkdom", 편관: "Zeven Dodingen", 정관: "Directe Ambtenaar",
      편인: "Indirecte Hulpbron", 정인: "Directe Hulpbron",
    },
  },
  ms: {
    loadingDefault: "Buku Kehidupan anda sedang dimuatkan.",
    loadingPendingWait: "Menunggu buku yang telah siap.",
    resultLinkMissing: "Tidak dapat mengesahkan pautan keputusan.",
    preparingBook: "Buku Kehidupan anda sedang disediakan.",
    loadFailed: "Tidak dapat memuatkan Buku Kehidupan yang disimpan.",
    cannotOpenResult: "Tidak dapat membuka keputusan",
    newBookCta: "Cipta Buku Kehidupan baharu",
    writingHeadline: "Pakar nasib sedang menulis buku anda",
    writingBody: "Rangka carta anda sedang dijalin dengan aliran masa untuk melengkapkan setiap bab secara bergilir. Anda tidak perlu membiarkan tetingkap ini terbuka — bab pertama akan dibuka tidak lama lagi.",
    progressAriaLabel: (percent) => `Kemajuan bacaan ${percent}%`,
    pdfQuickSave: "Simpan pantas sebagai PDF",
    reportKicker: "Laporan Konsultasi Pakar Buku Kehidupan",
    reportSubtitleDefault: "Babak kehidupan yang dibaca melalui carta semula jadi anda dan aliran masa",
    fieldName: "Nama",
    fieldBirthDate: "Tarikh lahir",
    fieldBirthTime: "Masa lahir",
    fieldCreatedAt: "Dicipta pada",
    fieldGender: "Jantina",
    fieldCalendar: "Asas kalendar",
    fieldDayMaster: "Tuan Hari",
    fieldFocusArea: "Bidang tumpuan",
    notEntered: "Tidak dimasukkan",
    unknown: "Tidak diketahui",
    checking: "Sedang disahkan",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderPrivate: "Peribadi",
    calendarLunar: "Kalendar Lunar",
    calendarSolar: "Kalendar Solar",
    calcLimited: "Pengiraan terhad",
    birthTimeUnknown: "Masa lahir tidak diketahui",
    focusAreaDefault: "Aliran kehidupan keseluruhan",
    tocLabel: "Kandungan",
    tocNavAriaLabel: "Kandungan bab",
    chapterJumpAriaLabel: (index, title) => `Pergi ke bab ${index}, ${title}`,
    basicChartHeading: "Carta Asas",
    dayMasterPrefix: "Tuan Hari ",
    fiveElementHeading: "Taburan Lima Unsur",
    fiveElementLimited: "Nilai Lima Unsur yang boleh dikira adalah terhad.",
    tenGodHeading: "Taburan Sepuluh Dewa",
    tenGodLimited: "Nilai Sepuluh Dewa yang boleh dikira adalah terhad.",
    tenGodNoneSr: "Tiada",
    coreSummaryHeadlineDefault: "Ayat teras kehidupan anda",
    coreSummaryThemeDefault: "Tema kehidupan anda terungkap dengan tenang.",
    coreSummaryStrongPrefix: "Tenaga terkuat: ",
    coreSummaryStrongDefault: "Tafsiran berasaskan pengiraan",
    coreSummaryBalancePrefix: "Memerlukan keseimbangan: ",
    coreSummaryBalanceDefault: "Aliran yang perlu diperhatikan untuk keseimbangan",
    chapterPageLabel: (n) => `Bab ${n}`,
    deckLabel: "Selak halaman Buku Kehidupan anda",
    bookmarkNote: "Ini adalah bab yang anda tandakan.",
    deepReadingHeading: "Bacaan Mendalam Carta Anda",
    deepReadingFallbackTitle: (n) => `Bacaan Mendalam ${n}`,
    finalMessageHeading: "Kata-kata Akhir",
    finalChapterEyebrow: "— Bab Terakhir —",
    finalChapterBody: (name) => `Buku ${name} ditutup di sini buat sementara, tetapi kisah ini berterusan dengan pilihan hari ini. Jika ada bab yang tinggal di hati anda, meterai dan simpan buku ini.`,
    sealBookButton: "Meterai dan simpan buku ini",
    openLovedOneBookLink: "Buka juga sebuah buku untuk orang yang anda sayangi",
    shareKicker: "Buku Kehidupan",
    pdfCoverTitle: (name) => `Buku Kehidupan ${name}`,
    pdfSaveError: "Tidak dapat menyimpan sebagai PDF. Sila cuba lagi sebentar lagi.",
    defaultUserName: "Anda",
    fallbackChapters: [
      "Arketaip Carta Kelahiran Anda",
      "Personaliti dan Cara Dunia Dalaman Anda Berfungsi",
      "Bakat dan Hala Tuju Kerjaya",
      "Cinta dan Perhubungan",
      "Kekayaan dan Asas Realiti",
      "Perhubungan dan Keluarga",
      "Kesihatan dan Keseimbangan Musim",
      "Babak Besar Kehidupan Dilihat Melalui Kitaran Nasib Besar",
      "Nasihat untuk Kitaran Tahunan Terdekat",
      "Ayat Terakhir Buku Kehidupan",
    ],
    fiveElementLegend: { 목: "Kayu", 화: "Api", 토: "Bumi", 금: "Logam", 수: "Air" },
    tenGodGroupLabel: { 비겁: "Rakan-rakan", 식상: "Output", 재성: "Kekayaan", 관성: "Pegawai", 인성: "Sumber" },
    tenGodLabel: {
      비견: "Rakan", 겁재: "Pesaing", 식신: "Dewa Output", 상관: "Pegawai Mencederakan",
      편재: "Kekayaan Tidak Langsung", 정재: "Kekayaan Langsung", 편관: "Tujuh Pembunuhan", 정관: "Pegawai Langsung",
      편인: "Sumber Tidak Langsung", 정인: "Sumber Langsung",
    },
  },
};

function getLifeBookResultCopy(locale: LoadingLocale): LifeBookResultCopy {
  return LIFE_BOOK_RESULT_COPY[locale] || LIFE_BOOK_RESULT_EN;
}

function useLifeBookResultCopy(): LifeBookResultCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getLifeBookResultCopy(locale);
}

function formatGender(value: string | undefined, copy: LifeBookResultCopy) {
  if (value === "female") return copy.genderFemale;
  if (value === "male") return copy.genderMale;
  if (value === "unknown") return copy.genderPrivate;
  return copy.notEntered;
}

function formatCalendar(value: string | undefined, copy: LifeBookResultCopy) {
  return value === "lunar" ? copy.calendarLunar : copy.calendarSolar;
}

function formatSajuValue(value: unknown, fallback: string) {
  return toText(value) || fallback;
}

function extractJsonReport(content: string): LifeBookReportJson | null {
  const raw = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed as LifeBookReportJson : null;
  } catch {
    return null;
  }
}

function splitMarkdownChapters(content: string, copy: LifeBookResultCopy): LifeBookChapter[] {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const chapters: LifeBookChapter[] = [];
  let current: LifeBookChapter | null = null;
  const headingPattern = /^(?:#{1,4}\s*)?(?:제?\s*\d{1,2}\s*장[.)]?\s*)?(.+?)\s*$/;
  const chapterFallback = (index: number) => copy.fallbackChapters[index] || `${copy.shareKicker} ${index + 1}`;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^#{2,4}\s+(.+)$/) || line.match(/^제\s*\d{1,2}\s*장[.)]?\s*(.+)$/);
    if (heading) {
      if (current?.content?.trim()) chapters.push({ ...current, content: current.content.trim() });
      const title = toText(heading[1]).replace(/^[-:：\s]+/, "") || chapterFallback(chapters.length);
      current = { chapterNumber: chapters.length + 1, title, content: "" };
      continue;
    }
    if (!current && line) {
      const first = line.match(headingPattern);
      current = { chapterNumber: 1, title: first?.[1]?.slice(0, 40) || chapterFallback(0), content: "" };
    }
    if (current) current.content = `${current.content || ""}${current.content ? "\n" : ""}${line}`;
  }

  if (current?.content?.trim()) chapters.push({ ...current, content: current.content.trim() });
  if (chapters.length >= 3) return chapters;

  const paragraphs = String(content || "").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.slice(0, 10).map((paragraph, index) => ({
    chapterNumber: index + 1,
    title: chapterFallback(index),
    content: paragraph,
  }));
}

function getAssistantContent(result: LifeBookResult | null) {
  return result?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
}

function buildReport(result: LifeBookResult | null, copy: LifeBookResultCopy) {
  const content = getAssistantContent(result);
  const parsed = result?.reportJson || extractJsonReport(content);
  // 잘린(degrade) 응답이 유효한 JSON으로 파싱되지 않을 때, 원시 중괄호/키를 그대로 문단화하지 않도록
  // 다른 6개 기능과 동일하게 사람이 읽을 수 있는 문장만 복원한 뒤 챕터로 쪼갠다.
  const fallbackContent = !parsed && looksLikeRawJson(content) ? extractReadableTextFromJsonLike(content) || content : content;
  const chapters = parsed?.chapters?.length
    ? parsed.chapters.map((chapter, index) => ({
      ...chapter,
      chapterNumber: chapter.chapterNumber || index + 1,
      title: toText(chapter.title) || copy.fallbackChapters[index] || `${copy.shareKicker} ${index + 1}`,
      content: toText(chapter.content || chapter.summary),
    }))
    : splitMarkdownChapters(fallbackContent, copy);
  return {
    title: parsed?.title || result?.title || copy.reportKicker,
    subtitle: parsed?.subtitle || copy.reportSubtitleDefault,
    coreSummary: parsed?.coreSummary || null,
    expertReadings: Array.isArray(parsed?.expertReadings) ? parsed.expertReadings.filter((reading) => toText(reading?.title || reading?.content)) : [],
    finalMessage: parsed?.finalMessage || "",
    chapters,
  };
}

function LoadingState({ message }: { message?: string }) {
  const copy = useLifeBookResultCopy();
  const resolvedMessage = message ?? copy.loadingDefault;
  return (
    <main className="grid min-h-screen place-items-center bg-[#050407] px-4 text-amber-50">
      <div className="rounded-3xl border border-amber-200/20 bg-amber-50/10 p-8 text-center shadow-2xl backdrop-blur-xl">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-200" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-[#eadbb9]">{resolvedMessage}</p>
      </div>
    </main>
  );
}

// 재시도해도 결과가 바뀌지 않는 확정 실패. 이 3개만 조기 종료하고 나머지 503 은 폴링이 흡수한다.
const TERMINAL_RESULT_REASONS = new Set([
  "GENERATION_STALLED",
  "LLM_ERROR",
  "GENERATION_ALREADY_FAILED",
]);

/**
 * 장 본문. 폴링으로 방금 도착한 마지막 장만 타이프라이터로 연출한다.
 * 시각 연출(typed)은 aria-hidden, 스크린리더에는 전문을 한 번만 준다.
 */
function ChapterProse({ value = "", live, className }: { value?: string; live: boolean; className?: string }) {
  const { typed, isTyping } = useTypewriter(value, live);
  if (!live) return <AiResultProse value={value} className={className} />;
  return (
    <>
      <div aria-hidden="true">
        <AiResultProse value={typed} className={className} />
        {isTyping && <span className={styles.typingCaret} aria-hidden="true" />}
      </div>
      <div className="sr-only">{value}</div>
    </>
  );
}

function LifeBookResultContent() {
  const copy = useLifeBookResultCopy();
  const params = useSearchParams();
  const attemptId = toText(params?.get("attemptId") || params?.get("sessionId") || "");
  const pending = params?.get("pending") === "1";
  const [result, setResult] = useState<LifeBookResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [viewAll, setViewAll] = usePagedViewerMode("lifeBookViewerModeV1");
  const [exportExpand, setExportExpand] = useState(false);
  const [chapterPage, setChapterPage] = useState(0);
  const [bookmarks, setBookmarks] = useState<Set<number>>(() => new Set());
  const documentHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  // 서버 최악(본 생성 180s + 완성 repair 180s ≈ 360s)보다 짧으면 완료·저장된 유료 결과에
  // 거짓 "지연 실패"가 뜬다(버그). 상한을 넘겨 폴링(3.2s 간격이라 CF rate-limit 여유 큼).
  const maxPollAttempts = 125; // 3.2s * 125 ≈ 400s 상한 — terminal 종료 유지
  const pollIntervalMs = 3200;
  // 429 응답 연속 횟수 — CF rate-limit(10초당 100회) 회피용 지수 백오프 계수
  const rateLimitStreakRef = useRef(0);

  const loadResult = useCallback(async () => {
    if (!attemptId) {
      setError(copy.resultLinkMissing);
      setLoading(false);
      return;
    }
    try {
      const previewState = readDevPreviewState();
      const response = previewState
        ? buildDevPreviewResponse(buildLifeBookPreviewPayload(previewState), previewState === "failed" ? 503 : 200)
        : await authFetch(`/api/life-book-ai/result?attemptId=${encodeURIComponent(attemptId)}`);
      const payload = await response.json().catch(() => ({})) as LifeBookResult;
      if (pending && response.status === 404) {
        setResult({ status: "generating", message: copy.preparingBook });
        setError("");
        setLoading(false);
        return;
      }
      if (response.status === 429) {
        // rate limit — 에러로 처리하지 않고 백오프 후 재시도
        rateLimitStreakRef.current += 1;
        setLoading(false);
        return;
      }
      rateLimitStreakRef.current = 0;
      // 🔴 확정 실패는 isRetriableResultPollFailure 보다 **먼저** 판정한다.
      //    그 공용 함수는 503 을 무조건 재시도로 보기 때문에, 확정 실패가 폴링 상한 400초를 다 태운 뒤에야
      //    사용자에게 보였다. 공용 파일은 건드리지 않고(다른 기능 회귀 0) 호출부에서 화이트리스트로 끊는다.
      //    DB_DEGRADED / AUTH_REFRESH_TEMPORARY_FAILURE / ACCESS_CHECK_DEGRADED / PASS_CHECK_BUDGET_EXCEEDED 는
      //    자가 복구 가능한 일시 장애이므로 여기 넣지 않는다.
      const terminalReason = toText(payload?.reason).toUpperCase();
      if (TERMINAL_RESULT_REASONS.has(terminalReason)) {
        setError(reasonCopy(terminalReason, toText(payload?.message)));
        setLoading(false);
        return;
      }
      if (response.status === 202 && payload?.status === "generating") {
        setResult(payload);
        setError("");
        setLoading(false);
        return;
      }
      if (isRetriableResultPollFailure(response.status, payload)) {
        // 일시적 DB/인증 장애 — 하드 종료하지 말고 "생성 중"으로 두어 폴링이 계속 재시도(자가 복구)하게 한다.
        setResult((prev) => prev ?? { status: "generating", message: copy.preparingBook });
        setError("");
        setLoading(false);
        return;
      }
      if (!response.ok || payload?.ok === false) {
        throw new Error(toText(payload?.message) || copy.loadFailed);
      }
      setResult(payload);
      setError("");
      setPollAttempts(0);
    } catch (caught) {
      setError(friendlyErrorMessage(caught, copy.loadFailed));
    } finally {
      setLoading(false);
    }
  }, [attemptId, pending, copy]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  useEffect(() => {
    // status가 generating일 때만 폴링한다. pending 플래그를 함께 보면 completed가 된 뒤에도
    // 폴링이 멈추지 않고, loadResult 성공 시 setPollAttempts(0) 리셋과 맞물려 상한이 무력화된다.
    if (result?.status !== "generating") return;
    if (pollAttempts >= maxPollAttempts) {
      setError(FAILURE_COPY.exhausted);
      return;
    }
    const backoffFactor = Math.min(8, 2 ** rateLimitStreakRef.current);
    // 첫 폴은 빠르게(0.8s) 프로브해 조기 완료를 즉시 잡고, 이후 3.2s 간격으로 최악치까지 커버한다.
    const effectiveIntervalMs = (pollAttempts === 0 ? 800 : pollIntervalMs) * backoffFactor;
    const timer = window.setInterval(() => {
      setPollAttempts((prev) => prev + 1);
      void loadResult();
    }, effectiveIntervalMs);
    return () => window.clearInterval(timer);
  }, [loadResult, result?.status, pollAttempts, maxPollAttempts]);

  // 책 진도: 스크롤 위치를 독서 진행률로 표시
  const [readProgress, setReadProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setReadProgress(max > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [result?.status]);

  const report = useMemo(() => buildReport(result, copy), [result, copy]);
  // 서버가 웨이브마다 부분 조립본을 올려 주므로 chapters 가 늘어난다. 방금 늘어난 장만 연출 대상이다.
  // 서버가 부분 배열을 주지 않으면(한 번에 10장) "완료 직후 마지막 장만 타이프라이터"로 자연히 강등된다.
  const chapterCount = report.chapters.length;
  const revealedCountRef = useRef(chapterCount);
  const [freshChapterIndex, setFreshChapterIndex] = useState(-1);
  useEffect(() => {
    if (chapterCount > revealedCountRef.current) setFreshChapterIndex(chapterCount - 1);
    revealedCountRef.current = Math.max(revealedCountRef.current, chapterCount);
  }, [chapterCount]);
  const isStreamingIn = result?.status === "generating";
  const birth = result?.birthInfo || {};
  const saju = result?.sajuResult || null;
  const generatedAt = toText(result?.updatedAt || result?.createdAt);
  const userName = toText(birth.name) || copy.defaultUserName;
  const bookmarkStorageKey = `lifeBookBookmarksV1:${attemptId}`;

  useEffect(() => {
    if (!attemptId) return;
    try {
      const raw = window.localStorage.getItem(bookmarkStorageKey);
      if (raw) setBookmarks(new Set(JSON.parse(raw) as number[]));
    } catch {
      // 저장소 접근 불가 시 책갈피만 비활성 — 본문 열람에는 영향 없다.
    }
  }, [attemptId, bookmarkStorageKey]);

  const toggleBookmark = useCallback(() => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(chapterPage)) next.delete(chapterPage);
      else next.add(chapterPage);
      try {
        window.localStorage.setItem(bookmarkStorageKey, JSON.stringify([...next]));
      } catch {
        // best-effort
      }
      return next;
    });
  }, [bookmarkStorageKey, chapterPage]);

  // 표지가 걷힌 뒤 포커스를 본문 제목으로 옮긴다(키보드·스크린리더 사용자가 표지 뒤에 갇히지 않게).
  const handleCoverOpened = useCallback(() => {
    window.requestAnimationFrame(() => documentHeadingRef.current?.focus());
  }, []);
  const isGenerating = result?.status === "generating";
  const pillarLabels = getPillarLabels(getCurrentLoadingLocale());
  const dayStem = splitGanji(formatSajuValue(saju?.dayPillar, copy.calcLimited)).stem;
  const tenGodOf = (ganji: string) => {
    const stem = splitGanji(ganji).stem;
    if (!stem || !dayStem) return undefined;
    const raw = tenGodOfStem(dayStem, stem);
    return raw ? copy.tenGodLabel[raw] || raw : undefined;
  };
  const pillarRows = [
    { label: pillarLabels.year, ganji: formatSajuValue(saju?.yearPillar, copy.calcLimited), tenGod: tenGodOf(formatSajuValue(saju?.yearPillar, copy.calcLimited)) },
    { label: pillarLabels.month, ganji: formatSajuValue(saju?.monthPillar, copy.calcLimited), tenGod: tenGodOf(formatSajuValue(saju?.monthPillar, copy.calcLimited)) },
    { label: pillarLabels.day, ganji: formatSajuValue(saju?.dayPillar, copy.calcLimited), emphasis: true, tenGod: copy.fieldDayMaster },
    { label: pillarLabels.hour, ganji: formatSajuValue(saju?.hourPillar, birth.birthTimeUnknown ? copy.birthTimeUnknown : copy.calcLimited), tenGod: tenGodOf(formatSajuValue(saju?.hourPillar, copy.calcLimited)) },
  ];
  const dayMasterValue = formatSajuValue(saju?.dayMaster, copy.calcLimited);
  const hasFiveElements = Boolean(saju?.fiveElements && Object.keys(saju.fiveElements).length);
  const elementDistribution = fiveElementDistribution(saju?.fiveElements);
  const hasTenGods = Boolean(saju?.tenGods && Object.keys(saju.tenGods).length);

  async function handlePdfDownload() {
    const element = document.getElementById("life-book-result-document");
    if (!element || pdfLoading) return;
    setPdfLoading(true);
    setPdfError("");
    // 페이지 뷰어가 숨긴 장(display:none)은 html2canvas에서 빈 캔버스가 되므로 전부 펼친 뒤 캡처한다.
    setExportExpand(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const date = new Date().toISOString().slice(0, 10);
      await exportResultPdf({
        captureTargets: ["#life-book-result-document [data-life-book-pdf-page]"],
        fileName: `life-book-reading-${safeFilePart(attemptId)}.pdf`,
        backgroundColor: "#100a08",
        cover: {
          title: copy.pdfCoverTitle(userName),
          subtitle: result?.topic || copy.focusAreaDefault,
          name: userName,
          date,
        },
      });
    } catch {
      setPdfError(copy.pdfSaveError);
    } finally {
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  if (loading) return <LoadingState message={pending ? copy.loadingPendingWait : copy.loadingDefault} />;

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050407] px-4 text-amber-50">
        <div className="max-w-md rounded-3xl border border-rose-200/25 bg-rose-950/30 p-7 text-center shadow-2xl backdrop-blur-xl">
          <AlertCircle className="mx-auto h-9 w-9 text-rose-200" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black">{copy.cannotOpenResult}</h1>
          <p className="mt-3 text-sm leading-6 text-rose-100">{error}</p>
          <Link href="/life-book-ai" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 font-black text-[#171007]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.newBookCta}
          </Link>
        </div>
      </main>
    );
  }

  if (isGenerating) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050407] px-4 text-amber-50">
        <div className="max-w-lg rounded-3xl border border-amber-200/20 bg-amber-50/10 p-8 text-center shadow-2xl backdrop-blur-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-200" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-black">{copy.writingHeadline}</h1>
          <p className="mt-3 text-sm leading-7 text-[#eadbb9]">
            {copy.writingBody}
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-[72%] animate-pulse rounded-full bg-gradient-to-r from-[#b47b25] via-[#f2d07a] to-[#fff3b0]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#060912] text-amber-50 [font-family:var(--font-body)]">
      <BookOpenCover
        attemptId={attemptId}
        title={report.title}
        subtitle={report.subtitle}
        ownerName={userName}
        onOpened={handleCoverOpened}
      />
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-black/40" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-[#b47b25] via-[#f2d07a] to-[#fff3b0] transition-[width] duration-150" style={{ width: `${readProgress}%` }} />
      </div>
      <div className="fixed right-3 top-2 z-50 rounded-full border border-amber-200/25 bg-black/55 px-2.5 py-0.5 text-[11px] font-black text-amber-100" aria-label={copy.progressAriaLabel(readProgress)}>
        {readProgress}%
      </div>
      {/* 밤하늘 아래 놓인 양장본 — 바깥 배경만 남색 계열로 두고 금박 글로우를 얹는다. */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,198,98,0.20),transparent_36%),radial-gradient(circle_at_18%_28%,rgba(87,101,190,0.22),transparent_32%),linear-gradient(135deg,#0a0f24,#131a38_46%,#060912)]" />
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,226,169,.58)_1px,transparent_1px),radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-position:0_0,38px_46px] [background-size:96px_96px,138px_138px]" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/life-book-ai" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200/20 bg-black/20 px-4 text-sm font-bold text-amber-50 transition hover:bg-amber-50/10">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.newBookCta}
          </Link>
          {/* 빠른 저장(보조) — 봉인 CTA는 마지막 장에 별도로 있다 */}
          <button
            type="button"
            onClick={() => void handlePdfDownload()}
            disabled={pdfLoading}
            aria-label={copy.pdfQuickSave}
            title={copy.pdfQuickSave}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/25 bg-black/20 text-amber-100 transition hover:bg-amber-50/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {pdfError && <div className="mb-4 rounded-2xl border border-rose-200/25 bg-rose-950/30 px-4 py-3 text-sm font-bold text-rose-100">{pdfError}</div>}

        <article id="life-book-result-document" className="rounded-3xl border border-amber-200/20 bg-amber-50/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <header data-life-book-pdf-page className={`relative overflow-hidden rounded-3xl border border-amber-200/20 bg-[#100a08]/80 p-5 sm:p-7 ${styles.leatherTexture}`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#b47b25] via-[#f2d07a] to-[#b47b25]" aria-hidden="true" />
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-50/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {copy.reportKicker}
            </p>
            <h1 ref={documentHeadingRef} tabIndex={-1} className={`mt-5 text-3xl font-black leading-tight text-amber-50 outline-none sm:text-5xl ${styles.chapterTitle}`}>{report.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#eadbb9]">{report.subtitle}</p>
            <p className="mt-4 text-sm font-black tracking-[0.22em] text-amber-100">主人公 · {userName}</p>
            <dl className="mt-5 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [copy.fieldName, userName],
                [copy.fieldBirthDate, birth.birthDate || copy.notEntered],
                [copy.fieldBirthTime, birth.birthTimeUnknown ? copy.unknown : birth.birthTime || copy.notEntered],
                [copy.fieldCreatedAt, generatedAt ? generatedAt.slice(0, 10) : copy.checking],
                [copy.fieldGender, formatGender(birth.gender, copy)],
                [copy.fieldCalendar, formatCalendar(birth.calendarType, copy)],
                [copy.fieldDayMaster, saju?.dayMaster || copy.calcLimited],
                [copy.fieldFocusArea, result?.topic || copy.focusAreaDefault],
              ].map(([label, value], index) => (
                <div key={`${label}-${index}`}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-200/70">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-amber-50">{value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
            <aside className={`h-fit rounded-3xl border border-amber-200/20 bg-[#100a08]/75 p-4 lg:sticky lg:top-6 ${styles.leatherTexture}`}>
              <details className={styles.tocAccordion} open>
                <summary>
                  <span className="flex items-center gap-2 text-sm font-black text-amber-200">
                    <ScrollText className="h-4 w-4" aria-hidden="true" />
                    {copy.tocLabel}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-amber-200/70 ${styles.tocChevron}`} aria-hidden="true" />
                </summary>
                <div className={styles.tocAccordionBody}>
                  <nav className={styles.tocList} aria-label={copy.tocNavAriaLabel}>
                    {report.chapters.map((chapter, index) => {
                      const active = !viewAll && index === chapterPage;
                      return (
                        <button
                          type="button"
                          key={`${chapter.title}-${index}`}
                          aria-label={copy.chapterJumpAriaLabel(index + 1, chapter.title || "")}
                          aria-current={active ? "true" : undefined}
                          data-active={active ? "true" : "false"}
                          onClick={() => {
                            if (viewAll) {
                              document.getElementById(`chapter-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              return;
                            }
                            setChapterPage(index);
                            document.getElementById("life-book-chapter-deck")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={styles.tocRow}
                        >
                          <span className={styles.tocNum}>{String(index + 1).padStart(2, "0")}</span>
                          <span className={styles.tocTitle}>{chapter.title}</span>
                          <span className={styles.tocLeader} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </details>
            </aside>

            <section className="grid gap-4">
              <section data-life-book-pdf-page className={`rounded-3xl border border-amber-200/20 bg-[#100a08]/80 p-5 ${styles.leatherTexture}`}>
                <div className="flex items-center gap-2 text-amber-200">
                  <ScrollText className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-xl font-black">{copy.basicChartHeading}</h2>
                </div>
                <SajuPillarTable className="mt-4 sm:grid-cols-4" pillars={pillarRows} />
                <p className="mt-3 text-xs font-bold text-amber-200">{copy.dayMasterPrefix}{dayMasterValue}</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200/15 bg-black/20 p-4">
                    <h3 className="text-sm font-black text-amber-200">{copy.fiveElementHeading}</h3>
                    {hasFiveElements ? (
                      <div className="mt-3 grid gap-2">
                        {elementDistribution.map((entry) => {
                          const token = FIVE_ELEMENT_TOKENS[entry.element];
                          return (
                            <div key={entry.element} className={styles.elementBarRow}>
                              <span className="text-sm font-black" style={{ color: token.color }}>{token.hanja}</span>
                              <div className={styles.elementBarTrack}>
                                <div
                                  className={styles.elementBarFill}
                                  style={{ "--fill-ratio": entry.ratio, background: token.color } as CSSProperties}
                                />
                              </div>
                              <span className="text-right text-xs font-bold text-[#f4e6cb]">{entry.value}</span>
                            </div>
                          );
                        })}
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-amber-200/60">
                          {FIVE_ELEMENT_ORDER.map((element) => (
                            <span key={element} className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full" style={{ background: FIVE_ELEMENT_TOKENS[element].color }} aria-hidden="true" />
                              {copy.fiveElementLegend[element]}
                            </span>
                          ))}
                        </p>
                      </div>
                    ) : <p className="mt-3 text-sm text-[#eadbb9]">{copy.fiveElementLimited}</p>}
                  </div>
                  <div className="rounded-2xl border border-amber-200/15 bg-black/20 p-4">
                    <h3 className="text-sm font-black text-amber-200">{copy.tenGodHeading}</h3>
                    {hasTenGods ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {TEN_GOD_GROUPS.map((group) => {
                          const present = group.members.filter((name) => Number(saju?.tenGods?.[name]) > 0);
                          return (
                            <div key={group.label} className={styles.tenGodGroup}>
                              <p className={styles.tenGodGroupLabel}>{copy.tenGodGroupLabel[group.label] || group.label}</p>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {group.members.map((name) => {
                                  const count = Number(saju?.tenGods?.[name]) || 0;
                                  const active = count > 0;
                                  return (
                                    <span
                                      key={name}
                                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${active ? "border-amber-200/35 bg-amber-100/15 text-amber-50" : "border-amber-100/10 bg-transparent text-[rgba(232,218,190,0.4)]"}`}
                                    >
                                      {copy.tenGodLabel[name] || name}{active ? ` ${count}` : ""}
                                    </span>
                                  );
                                })}
                              </div>
                              {!present.length && <span className="sr-only">{copy.tenGodNoneSr}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="mt-3 text-sm text-[#eadbb9]">{copy.tenGodLimited}</p>}
                  </div>
                </div>
              </section>

              {report.coreSummary && (
                <section data-life-book-pdf-page className={`rounded-3xl p-5 ${styles.paperPage} ${styles.paperTexture}`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${styles.paperAccent}`}>Core Summary</p>
                  <h2 className={`mt-2 text-2xl font-black ${styles.chapterTitle}`}>{report.coreSummary.oneLine || copy.coreSummaryHeadlineDefault}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className={`rounded-2xl border p-3 text-sm ${styles.paperMuted} ${styles.paperDivider}`}>{report.coreSummary.lifeTheme || copy.coreSummaryThemeDefault}</div>
                    <div className={`rounded-2xl border p-3 text-sm ${styles.paperMuted} ${styles.paperDivider}`}>{copy.coreSummaryStrongPrefix}{report.coreSummary.strongestElement || copy.coreSummaryStrongDefault}</div>
                    <div className={`rounded-2xl border p-3 text-sm ${styles.paperMuted} ${styles.paperDivider}`}>{copy.coreSummaryBalancePrefix}{report.coreSummary.neededBalance || copy.coreSummaryBalanceDefault}</div>
                  </div>
                </section>
              )}

              <div id="life-book-chapter-deck" className={`scroll-mt-6 ${styles.bookStage}`}>
                <PagedResultViewer
                  pageClassName={styles.bookPage}
                  pages={report.chapters.map((chapter, index): ResultViewerPage => ({
                    id: `chapter-page-${index + 1}`,
                    label: copy.chapterPageLabel(chapter.chapterNumber || index + 1),
                    content: (
                      <section id={`chapter-${index + 1}`} data-life-book-pdf-page className={`scroll-mt-6 rounded-3xl p-5 sm:p-7 ${styles.paperPage} ${styles.paperTexture}`}>
                        <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-4" style={{ borderColor: "rgba(43,28,16,0.16)" }}>
                          <span className={styles.chapterNumeral} aria-hidden="true">{toRoman(chapter.chapterNumber || index + 1)}</span>
                          <h2 className={`text-2xl font-black leading-snug ${styles.chapterTitle}`}>{chapter.title}</h2>
                        </div>
                        {chapter.summary && (
                          <p className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${styles.paperDivider}`} style={{ background: "rgba(43,28,16,0.05)" }}>
                            {toText(chapter.summary)}
                          </p>
                        )}
                        <ChapterProse
                          value={chapter.content}
                          live={isStreamingIn && index === freshChapterIndex}
                          className={styles.chapterProse}
                        />
                        {Array.isArray(chapter.advice) && chapter.advice.length > 0 && (
                          <div className="mt-5 grid gap-2">
                            {chapter.advice.map((advice, adviceIndex) => (
                              <div key={`advice-${adviceIndex}`} className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold ${styles.paperDivider}`} style={{ background: "rgba(43,28,16,0.05)" }}>
                                <Lightbulb className={`mt-0.5 h-4 w-4 shrink-0 ${styles.paperAccent}`} aria-hidden="true" />
                                <span>{toText(advice)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    ),
                  }))}
                  deckLabel={copy.deckLabel}
                  viewAll={viewAll}
                  onViewAllChange={setViewAll}
                  expandForExport={exportExpand}
                  activePage={chapterPage}
                  onPageChange={setChapterPage}
                  renderPageExtras={(index) => (bookmarks.has(index) ? (
                    <p className={styles.bookmarkNote}>{copy.bookmarkNote}</p>
                  ) : null)}
                />
              </div>

              {report.expertReadings.length > 0 && (
                <section data-life-book-pdf-page className={`rounded-3xl p-5 sm:p-7 ${styles.paperPage} ${styles.paperTexture}`}>
                  <div className={`flex items-center gap-2 ${styles.paperAccent}`}>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    <h2 className={`text-xl font-black ${styles.chapterTitle}`}>{copy.deepReadingHeading}</h2>
                  </div>
                  <div className="mt-4 grid gap-5">
                    {report.expertReadings.map((reading, index) => (
                      <div key={`${reading.title || "reading"}-${index}`} className={`rounded-2xl border p-4 ${styles.paperDivider}`} style={{ background: "rgba(43,28,16,0.04)" }}>
                        <h3 className={`text-lg font-black ${styles.chapterTitle}`}>{reading.title || copy.deepReadingFallbackTitle(index + 1)}</h3>
                        <AiResultProse value={reading.content} className="mt-3" />
                        {Array.isArray(reading.guidance) && reading.guidance.length > 0 && (
                          <div className="mt-4 grid gap-2">
                            {reading.guidance.map((guide, guideIndex) => (
                              <div key={`${guide}-${guideIndex}`} className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold ${styles.paperDivider}`} style={{ background: "rgba(43,28,16,0.06)" }}>
                                <Lightbulb className={`mt-0.5 h-4 w-4 shrink-0 ${styles.paperAccent}`} aria-hidden="true" />
                                <span>{guide}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {report.finalMessage && (
                <section data-life-book-pdf-page className={`rounded-3xl p-5 sm:p-7 ${styles.paperPage} ${styles.paperTexture}`}>
                  <div className={`flex items-center gap-2 ${styles.paperAccent}`}>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    <h2 className={`text-xl font-black ${styles.chapterTitle}`}>{copy.finalMessageHeading}</h2>
                  </div>
                  <AiResultProse value={report.finalMessage} className="mt-3" />
                </section>
              )}

              <section className={`rounded-3xl border border-amber-200/20 bg-[#100a08]/70 p-6 text-center ${styles.leatherTexture}`}>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">{copy.finalChapterEyebrow}</p>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-[#eadbb9]">
                  {copy.finalChapterBody(userName)}
                </p>
                <div className="mt-5 flex flex-col items-center gap-3">
                  <button type="button" onClick={() => void handlePdfDownload()} disabled={pdfLoading} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#f2d07a] to-[#b47b25] px-7 text-[15px] font-black text-[#171007] shadow-lg shadow-black/30 transition hover:-translate-y-0.5 disabled:opacity-60">
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
                    {copy.sealBookButton}
                  </button>
                  <Link href="/life-book-ai" className="text-xs font-bold text-amber-100 underline decoration-dotted underline-offset-4 transition hover:text-amber-50">
                    {copy.openLovedOneBookLink}
                  </Link>
                </div>
              </section>
            </section>
          </div>
        </article>

        {/* 🔴 공유·이미지 저장 대상. 본문이 아니라 이 카드만 캡처한다 — 생년월일은 넣지 않는다.
            backdrop-filter 는 html-to-image 가 재현하지 못하므로 단색·그라디언트만 쓴다. */}
        <div className={styles.shareCardHost} aria-hidden="true">
          <div id="life-book-share-card" className={styles.shareCard}>
            <p className={styles.shareKicker}>{copy.shareKicker}</p>
            <p className={styles.shareTitle}>{report.title}</p>
            <p className={styles.shareSubtitle}>{report.subtitle}</p>
            <p className={styles.shareLine}>{toText(report.coreSummary?.oneLine)}</p>
            <p className={styles.shareOwner}>主人公 · {userName}</p>
          </div>
        </div>

        <ResultActionDock
          pdfLoading={pdfLoading}
          onDownloadPdf={() => void handlePdfDownload()}
          shareCardId="life-book-share-card"
          fileName={`life-book-cover-${safeFilePart(attemptId)}`}
          bookmarked={bookmarks.has(chapterPage)}
          onToggleBookmark={toggleBookmark}
          onRegenerate={() => { window.location.href = "/life-book-ai"; }}
        />
      </section>
    </main>
  );
}

export default function LifeBookAiResultClient() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LifeBookResultContent />
    </Suspense>
  );
}
