"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Moon,
  Sparkles,
  Stars,
  UserRound,
  WalletCards,
} from "lucide-react";
import { PriceBadge } from "@/app/components/PriceBadge";
import { toDisplayText } from "@/lib/llm-text";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { useRouter } from "next/navigation";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { prepareLifeBook, runGenerateWave } from "./lifeBookApi";
import {
  FAILURE_COPY,
  MODE_FALLBACK_PRICE,
  MODE_FEATURE_KEY,
  PHASE_COPY,
  REASON_COPY,
  WRITING_STAGES,
  reasonCopy,
} from "./lifeBookCopy";
import { detectLocale } from "@/lib/i18n/dictionary";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "relationship" | "family" | "lifePurpose" | "turningPoint";
type FlowStatus = "idle" | "opening" | "payment" | "generating" | "navigating" | "completed" | "error";

type LifeBookMode = "lifeBook" | "lifeFortune";

type LifeBookCopy = {
  focusLabel: Record<FocusAreaType, string>;
  focusHint: Record<FocusAreaType, string>;
  previewChapters: string[];
  heroBadges: string[];
  birthTimeRequiredMessage: string;
  modeOptions: Record<LifeBookMode, { label: string; desc: string }>;
  genderFemale: string;
  genderMale: string;
  genderUnknown: string;
  genderUnselected: string;
  heroTitle: string;
  heroDescription: string;
  passCheckTitle: string;
  passCheckCompleteTitle: string;
  passCheckCompleteMessage: string;
  passCheckFailedTitle: string;
  readyCheckHeading: string;
  nameLabel: string;
  birthDateLabel: string;
  focusAreaLabel: string;
  notYetFilled: string;
  formHeading: string;
  formDescription: string;
  profileLoadAria: string;
  profileLoadCta: string;
  reportTypeAria: string;
  nameOrNicknameLabel: string;
  namePlaceholder: string;
  genderFieldLabel: string;
  birthDateFieldLabel: string;
  calendarFieldLabel: string;
  solarLabel: string;
  lunarLabel: string;
  birthTimeFieldLabel: string;
  birthTimeUnknownLabel: string;
  focusAreaFieldLabel: string;
  priceLabelPrefix: string;
  openingCta: string;
  openCta: (mode: LifeBookMode) => string;
  retryStoryLabel: string;
  retryGenerationAria: string;
  nextChapterWaitingHeading: string;
  nameMissing: string;
  notEntered: string;
  unknownLabel: string;
  generateCta: string;
  writingHeading: string;
  writingDescription: string;
  writingProgressAria: string;
  chapterCountUnit: (completed: number, total: number) => string;
  completedHeading: string;
  completedDescription: string;
  openResultCta: string;
  openNewTabCta: string;
};

const LIFE_BOOK_CLIENT_EN: LifeBookCopy = {
  focusLabel: {
    overall: "Overall Life Flow",
    love: "Love & Relationships",
    money: "Wealth & Reality",
    career: "Work & Talent",
    relationship: "Relationships",
    family: "Family & Roots",
    lifePurpose: "Life Purpose",
    turningPoint: "Turning Point",
  },
  focusHint: {
    overall: "A broad reading of the big scenes across your whole life.",
    love: "A deep look at how your heart opens and connects.",
    money: "Examines the flow of money and stability building up.",
    career: "Looks at your innate role and direction toward achievement.",
    relationship: "Sorts out the patterns that repeat between you and others.",
    family: "Reads your close bonds and long-held feelings.",
    lifePurpose: "Illuminates the attitude worth holding onto for the long run.",
    turningPoint: "Examines the timing of moving into the next chapter.",
  },
  previewChapters: [
    "Chapter 1 The Archetype of Your Innate Chart",
    "Chapter 2 Personality and Temperament",
    "Chapter 3 Talent and Direction of Work",
    "Chapter 4 Love and Relationships",
    "Chapter 5 Wealth and the Foundation of Reality",
    "Chapter 6 Relationships and Family",
    "Chapter 7 Health and the Balance of Elements",
    "Chapter 8 The Big Scenes of Life Seen Through Major Luck",
    "Chapter 9 Advice for the Near Future",
    "Chapter 10 The Final Sentence of the Book of Life",
  ],
  heroBadges: ["Innate Chart", "Major & Annual Luck", "Love & Relationships", "Wealth & Career", "Life Purpose", "Turning Point"],
  birthTimeRequiredMessage: "Please enter your birth time or select 'birth time unknown'.",
  modeOptions: {
    lifeBook: { label: "Book of Life", desc: "An emotional narrative report that reads your life like a book" },
    lifeFortune: { label: "Life Fortune", desc: "A precise diagnostic report centered on Day Master/Yongshin/Major Luck evidence (3x the length)" },
  },
  genderFemale: "Female",
  genderMale: "Male",
  genderUnknown: "Private",
  genderUnselected: "Not selected",
  heroTitle: "Book of Life Expert Reading",
  heroDescription: "We weave the sentences of your innate chart with the texture of time you've lived through, and read the scenes ahead of you like a book.",
  passCheckTitle: "Checking Pass",
  passCheckCompleteTitle: "Pass Check Complete",
  passCheckCompleteMessage: "Pass check complete. Preparing your Book of Life.",
  passCheckFailedTitle: "Pass Check Failed",
  readyCheckHeading: "What to Check Before Opening the Book",
  nameLabel: "Name:",
  birthDateLabel: "Birth Date:",
  focusAreaLabel: "Focus Area:",
  notYetFilled: "Not yet filled in",
  formHeading: "Information to Open Your Book of Life",
  formDescription: "This information is used to calculate the base chart for building your life interpretation book.",
  profileLoadAria: "Load birth info from your profile card",
  profileLoadCta: "Load from profile card",
  reportTypeAria: "Select report type",
  nameOrNicknameLabel: "Name or Nickname",
  namePlaceholder: "Name",
  genderFieldLabel: "Gender",
  birthDateFieldLabel: "Birth Date",
  calendarFieldLabel: "Calendar",
  solarLabel: "Solar",
  lunarLabel: "Lunar",
  birthTimeFieldLabel: "Birth Time",
  birthTimeUnknownLabel: "Birth time unknown",
  focusAreaFieldLabel: "Report Focus Area",
  priceLabelPrefix: "Reading price ",
  openingCta: "Opening the book...",
  openCta: (mode) => (mode === "lifeFortune" ? "Open Life Fortune" : "Open Book of Life"),
  retryStoryLabel: "Continue the Story Again",
  retryGenerationAria: "Retry generating the Book of Life",
  nextChapterWaitingHeading: "An Unwritten Next Chapter Awaits",
  nameMissing: "Name not entered",
  notEntered: "Not entered",
  unknownLabel: "Unknown",
  generateCta: "Generate Book of Life",
  writingHeading: "Your Book of Life Is Being Written",
  writingDescription: "We're weaving the frame of your chart with the flow of time to complete each chapter in turn.",
  writingProgressAria: "Book of Life writing progress",
  chapterCountUnit: (completed, total) => `${completed}/${total} chapters · `,
  completedHeading: "Your Completed Book of Life Has Opened",
  completedDescription: "If the screen didn't move automatically, use the button below to open the result page.",
  openResultCta: "Open the Completed Book of Life",
  openNewTabCta: "Open in a New Tab",
};

const LIFE_BOOK_CLIENT_COPY: Partial<Record<LoadingLocale, LifeBookCopy>> = {
  ko: {
    focusLabel: {
      overall: "전체 인생 흐름",
      love: "사랑과 인연",
      money: "재물과 현실",
      career: "일과 재능",
      relationship: "인간관계",
      family: "가족과 뿌리",
      lifePurpose: "삶의 목적",
      turningPoint: "인생 전환점",
    },
    focusHint: {
      overall: "삶 전체의 큰 장면을 넓게 읽습니다.",
      love: "마음이 열리고 이어지는 방식을 깊게 봅니다.",
      money: "돈과 안정이 쌓이는 흐름을 살핍니다.",
      career: "타고난 역할과 성취의 방향을 봅니다.",
      relationship: "사람 사이에서 반복되는 결을 정리합니다.",
      family: "가까운 인연과 오래된 마음을 읽습니다.",
      lifePurpose: "오래 붙잡아야 할 태도를 비춥니다.",
      turningPoint: "다음 장으로 넘어가는 시기를 살핍니다.",
    },
    previewChapters: [
      "제1장 타고난 사주의 원형",
      "제2장 성격과 기질",
      "제3장 재능과 일의 방향",
      "제4장 사랑과 인연",
      "제5장 재물과 현실 기반",
      "제6장 인간관계와 가족의 장",
      "제7장 건강과 조후의 균형",
      "제8장 대운으로 보는 인생의 큰 장면",
      "제9장 가까운 시기의 세운 조언",
      "제10장 인생의 책 마지막 문장",
    ],
    heroBadges: ["타고난 사주", "대운과 세운", "사랑과 인연", "재물과 직업", "삶의 목적", "인생 전환점"],
    birthTimeRequiredMessage: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.",
    modeOptions: {
      lifeBook: { label: "인생의 책", desc: "삶을 한 권의 책으로 읽어 주는 감성 서사 리포트" },
      lifeFortune: { label: "인생 총운", desc: "일간·용신·대운 근거 중심의 정밀 진단 리포트 (분량 3배)" },
    },
    genderFemale: "여성",
    genderMale: "남성",
    genderUnknown: "비공개",
    genderUnselected: "미선택",
    heroTitle: "인생의 책 전문가 상담",
    heroDescription: "당신이 타고난 사주의 문장과 지나온 시간의 결을 엮어, 앞으로 펼쳐질 인생의 장면을 한 권의 책처럼 읽어드립니다.",
    passCheckTitle: "이용권 확인",
    passCheckCompleteTitle: "이용권 확인 완료",
    passCheckCompleteMessage: "이용권 확인이 끝났습니다. 인생의 책을 준비하고 있습니다.",
    passCheckFailedTitle: "이용권 확인 실패",
    readyCheckHeading: "책을 열기 전 확인할 것",
    nameLabel: "이름:",
    birthDateLabel: "생년월일:",
    focusAreaLabel: "강조 영역:",
    notYetFilled: "아직 비어 있습니다",
    formHeading: "인생의 책을 열기 위한 정보",
    formDescription: "이 정보는 한 권의 인생 해석서를 구성하기 위한 기본 명식 계산에 사용됩니다.",
    profileLoadAria: "프로필 카드에서 출생 정보 불러오기",
    profileLoadCta: "프로필 카드에서 불러오기",
    reportTypeAria: "리포트 형태 선택",
    nameOrNicknameLabel: "이름 또는 닉네임",
    namePlaceholder: "이름",
    genderFieldLabel: "성별",
    birthDateFieldLabel: "생년월일",
    calendarFieldLabel: "달력 기준",
    solarLabel: "양력",
    lunarLabel: "음력",
    birthTimeFieldLabel: "출생시간",
    birthTimeUnknownLabel: "출생시간 모름",
    focusAreaFieldLabel: "리포트 강조 영역",
    priceLabelPrefix: "상담 이용 가격 ",
    openingCta: "책을 여는 중...",
    openCta: (mode) => (mode === "lifeFortune" ? "인생 총운 펼치기" : "인생의 책 펼치기"),
    retryStoryLabel: "다시 이야기 이어가기",
    retryGenerationAria: "인생의 책 생성 다시 시도",
    nextChapterWaitingHeading: "아직 쓰이지 않은 다음 장이 기다리고 있습니다",
    nameMissing: "이름 미입력",
    notEntered: "미입력",
    unknownLabel: "모름",
    generateCta: "인생의 책 생성하기",
    writingHeading: "당신의 인생의 책을 집필하는 중입니다",
    writingDescription: "사주의 뼈대와 시간의 흐름을 엮어 각 장을 차례로 완성하고 있습니다.",
    writingProgressAria: "인생의 책 집필 진행률",
    chapterCountUnit: (completed, total) => `${completed}/${total}장 · `,
    completedHeading: "완성된 인생의 책이 열렸습니다",
    completedDescription: "화면이 자동으로 넘어가지 않았다면 아래 버튼으로 결과 페이지를 열어 주세요.",
    openResultCta: "완성된 인생의 책 열기",
    openNewTabCta: "새 탭에서 열기",
  },
  en: LIFE_BOOK_CLIENT_EN,
  ja: {
    focusLabel: {
      overall: "人生全体の流れ",
      love: "恋愛と縁",
      money: "財運と現実",
      career: "仕事と才能",
      relationship: "人間関係",
      family: "家族とルーツ",
      lifePurpose: "人生の目的",
      turningPoint: "人生の転機",
    },
    focusHint: {
      overall: "人生全体の大きな場面を広く読み解きます。",
      love: "心が開き、つながる仕方を深く見つめます。",
      money: "お金と安定が積み上がる流れを見ます。",
      career: "生まれ持った役割と成功の方向を見ます。",
      relationship: "人との間で繰り返されるパターンを整理します。",
      family: "近しい縁と長年の想いを読み解きます。",
      lifePurpose: "長く持ち続けるべき姿勢を照らします。",
      turningPoint: "次の章に進む時期を見ます。",
    },
    previewChapters: [
      "第1章 生まれ持った命式の原型",
      "第2章 性格と気質",
      "第3章 才能と仕事の方向",
      "第4章 恋愛と縁",
      "第5章 財運と現実の基盤",
      "第6章 人間関係と家族の章",
      "第7章 健康と調和のバランス",
      "第8章 大運で見る人生の大きな場面",
      "第9章 近い将来へのアドバイス",
      "第10章 人生の本 最後の一文",
    ],
    heroBadges: ["生まれ持った命式", "大運と歳運", "恋愛と縁", "財運と仕事", "人生の目的", "人生の転機"],
    birthTimeRequiredMessage: "出生時刻を入力するか、出生時刻不明を選択してください。",
    modeOptions: {
      lifeBook: { label: "人生の本", desc: "人生を一冊の本として読み解く感性的なストーリーレポート" },
      lifeFortune: { label: "人生総運", desc: "日干・用神・大運の根拠を中心にした精密診断レポート（分量3倍）" },
    },
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "非公開",
    genderUnselected: "未選択",
    heroTitle: "人生の本 専門家相談",
    heroDescription: "生まれ持った命式の文章と歩んできた時間の織りを編み込み、これから広がる人生の場面を一冊の本のように読み解きます。",
    passCheckTitle: "利用権確認",
    passCheckCompleteTitle: "利用権確認完了",
    passCheckCompleteMessage: "利用権の確認が終わりました。人生の本を準備しています。",
    passCheckFailedTitle: "利用権確認失敗",
    readyCheckHeading: "本を開く前に確認すること",
    nameLabel: "名前：",
    birthDateLabel: "生年月日：",
    focusAreaLabel: "強調領域：",
    notYetFilled: "まだ入力されていません",
    formHeading: "人生の本を開くための情報",
    formDescription: "この情報は、あなたの人生解釈書を構成するための基本命式計算に使用されます。",
    profileLoadAria: "プロフィールカードから出生情報を読み込む",
    profileLoadCta: "プロフィールカードから読み込む",
    reportTypeAria: "レポート形式を選択",
    nameOrNicknameLabel: "名前またはニックネーム",
    namePlaceholder: "名前",
    genderFieldLabel: "性別",
    birthDateFieldLabel: "生年月日",
    calendarFieldLabel: "暦の基準",
    solarLabel: "陽暦",
    lunarLabel: "陰暦",
    birthTimeFieldLabel: "出生時刻",
    birthTimeUnknownLabel: "出生時刻不明",
    focusAreaFieldLabel: "レポート強調領域",
    priceLabelPrefix: "相談利用価格 ",
    openingCta: "本を開いています...",
    openCta: (mode) => (mode === "lifeFortune" ? "人生総運を開く" : "人生の本を開く"),
    retryStoryLabel: "もう一度物語を続ける",
    retryGenerationAria: "人生の本の生成を再試行",
    nextChapterWaitingHeading: "まだ書かれていない次の章が待っています",
    nameMissing: "名前未入力",
    notEntered: "未入力",
    unknownLabel: "不明",
    generateCta: "人生の本を生成する",
    writingHeading: "あなたの人生の本を執筆しています",
    writingDescription: "命式の骨組みと時の流れを編み込み、各章を順に完成させています。",
    writingProgressAria: "人生の本 執筆進捗",
    chapterCountUnit: (completed, total) => `${completed}/${total}章 · `,
    completedHeading: "完成した人生の本が開きました",
    completedDescription: "画面が自動的に切り替わらなかった場合は、下のボタンで結果ページを開いてください。",
    openResultCta: "完成した人生の本を開く",
    openNewTabCta: "新しいタブで開く",
  },
  "zh-CN": {
    focusLabel: {
      overall: "整体人生走势",
      love: "爱情与缘分",
      money: "财富与现实",
      career: "事业与才能",
      relationship: "人际关系",
      family: "家庭与根源",
      lifePurpose: "人生目标",
      turningPoint: "人生转折点",
    },
    focusHint: {
      overall: "广泛解读人生整体的重大场景。",
      love: "深入探讨心扉打开与情感连接的方式。",
      money: "关注金钱与稳定累积的走势。",
      career: "审视天赋角色与成就方向。",
      relationship: "梳理人与人之间反复出现的模式。",
      family: "解读亲近的缘分与长久的情感。",
      lifePurpose: "照亮值得长久坚持的态度。",
      turningPoint: "审视迈向下一章的时机。",
    },
    previewChapters: [
      "第1章 与生俱来的命盘原型",
      "第2章 性格与气质",
      "第3章 才能与事业方向",
      "第4章 爱情与缘分",
      "第5章 财富与现实基础",
      "第6章 人际关系与家庭",
      "第7章 健康与五行平衡",
      "第8章 大运所见人生重大场景",
      "第9章 近期流年建议",
      "第10章 人生之书的最后一句",
    ],
    heroBadges: ["与生俱来的命盘", "大运与流年", "爱情与缘分", "财富与事业", "人生目标", "人生转折点"],
    birthTimeRequiredMessage: "请输入出生时间，或选择“出生时间不详”。",
    modeOptions: {
      lifeBook: { label: "人生之书", desc: "将人生解读为一本书的感性叙事报告" },
      lifeFortune: { label: "人生总运", desc: "以日干·用神·大运依据为核心的精密诊断报告（篇幅3倍）" },
    },
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公开",
    genderUnselected: "未选择",
    heroTitle: "人生之书 专家咨询",
    heroDescription: "将您与生俱来的命盘文字与走过的岁月纹理编织在一起，像一本书一样解读展开在您面前的人生场景。",
    passCheckTitle: "确认使用权",
    passCheckCompleteTitle: "使用权确认完成",
    passCheckCompleteMessage: "使用权确认已完成，正在为您准备人生之书。",
    passCheckFailedTitle: "使用权确认失败",
    readyCheckHeading: "打开这本书前请确认",
    nameLabel: "姓名：",
    birthDateLabel: "出生日期：",
    focusAreaLabel: "重点领域：",
    notYetFilled: "尚未填写",
    formHeading: "打开人生之书所需的信息",
    formDescription: "此信息将用于计算构成您人生解读书的基本命盘。",
    profileLoadAria: "从个人资料卡加载出生信息",
    profileLoadCta: "从个人资料卡加载",
    reportTypeAria: "选择报告类型",
    nameOrNicknameLabel: "姓名或昵称",
    namePlaceholder: "姓名",
    genderFieldLabel: "性别",
    birthDateFieldLabel: "出生日期",
    calendarFieldLabel: "历法基准",
    solarLabel: "阳历",
    lunarLabel: "阴历",
    birthTimeFieldLabel: "出生时间",
    birthTimeUnknownLabel: "出生时间不详",
    focusAreaFieldLabel: "报告重点领域",
    priceLabelPrefix: "咨询使用价格 ",
    openingCta: "正在打开书本...",
    openCta: (mode) => (mode === "lifeFortune" ? "展开人生总运" : "展开人生之书"),
    retryStoryLabel: "重新续写故事",
    retryGenerationAria: "重新生成人生之书",
    nextChapterWaitingHeading: "尚未书写的下一章正在等待",
    nameMissing: "姓名未填写",
    notEntered: "未填写",
    unknownLabel: "不详",
    generateCta: "生成人生之书",
    writingHeading: "正在为您撰写人生之书",
    writingDescription: "正在编织命盘的骨架与时间的流动，依次完成各章。",
    writingProgressAria: "人生之书撰写进度",
    chapterCountUnit: (completed, total) => `${completed}/${total}章 · `,
    completedHeading: "您完成的人生之书已开启",
    completedDescription: "如果画面没有自动跳转，请使用下方按钮打开结果页面。",
    openResultCta: "打开已完成的人生之书",
    openNewTabCta: "在新标签页中打开",
  },
  "zh-TW": {
    focusLabel: {
      overall: "整體人生走勢",
      love: "愛情與緣分",
      money: "財富與現實",
      career: "事業與才能",
      relationship: "人際關係",
      family: "家庭與根源",
      lifePurpose: "人生目標",
      turningPoint: "人生轉捩點",
    },
    focusHint: {
      overall: "廣泛解讀人生整體的重大場景。",
      love: "深入探討心扉打開與情感連結的方式。",
      money: "關注金錢與穩定累積的走勢。",
      career: "審視天賦角色與成就方向。",
      relationship: "梳理人與人之間反覆出現的模式。",
      family: "解讀親近的緣分與長久的情感。",
      lifePurpose: "照亮值得長久堅持的態度。",
      turningPoint: "審視邁向下一章的時機。",
    },
    previewChapters: [
      "第1章 與生俱來的命盤原型",
      "第2章 性格與氣質",
      "第3章 才能與事業方向",
      "第4章 愛情與緣分",
      "第5章 財富與現實基礎",
      "第6章 人際關係與家庭",
      "第7章 健康與五行平衡",
      "第8章 大運所見人生重大場景",
      "第9章 近期流年建議",
      "第10章 人生之書的最後一句",
    ],
    heroBadges: ["與生俱來的命盤", "大運與流年", "愛情與緣分", "財富與事業", "人生目標", "人生轉捩點"],
    birthTimeRequiredMessage: "請輸入出生時間，或選擇「出生時間不詳」。",
    modeOptions: {
      lifeBook: { label: "人生之書", desc: "將人生解讀為一本書的感性敘事報告" },
      lifeFortune: { label: "人生總運", desc: "以日干·用神·大運依據為核心的精密診斷報告（篇幅3倍）" },
    },
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公開",
    genderUnselected: "未選擇",
    heroTitle: "人生之書 專家諮詢",
    heroDescription: "將您與生俱來的命盤文字與走過的歲月紋理編織在一起，像一本書一樣解讀展開在您面前的人生場景。",
    passCheckTitle: "確認使用權",
    passCheckCompleteTitle: "使用權確認完成",
    passCheckCompleteMessage: "使用權確認已完成，正在為您準備人生之書。",
    passCheckFailedTitle: "使用權確認失敗",
    readyCheckHeading: "打開這本書前請確認",
    nameLabel: "姓名：",
    birthDateLabel: "出生日期：",
    focusAreaLabel: "重點領域：",
    notYetFilled: "尚未填寫",
    formHeading: "打開人生之書所需的資訊",
    formDescription: "此資訊將用於計算構成您人生解讀書的基本命盤。",
    profileLoadAria: "從個人資料卡載入出生資訊",
    profileLoadCta: "從個人資料卡載入",
    reportTypeAria: "選擇報告類型",
    nameOrNicknameLabel: "姓名或暱稱",
    namePlaceholder: "姓名",
    genderFieldLabel: "性別",
    birthDateFieldLabel: "出生日期",
    calendarFieldLabel: "曆法基準",
    solarLabel: "陽曆",
    lunarLabel: "陰曆",
    birthTimeFieldLabel: "出生時間",
    birthTimeUnknownLabel: "出生時間不詳",
    focusAreaFieldLabel: "報告重點領域",
    priceLabelPrefix: "諮詢使用價格 ",
    openingCta: "正在打開書本...",
    openCta: (mode) => (mode === "lifeFortune" ? "展開人生總運" : "展開人生之書"),
    retryStoryLabel: "重新續寫故事",
    retryGenerationAria: "重新生成人生之書",
    nextChapterWaitingHeading: "尚未書寫的下一章正在等待",
    nameMissing: "姓名未填寫",
    notEntered: "未填寫",
    unknownLabel: "不詳",
    generateCta: "生成人生之書",
    writingHeading: "正在為您撰寫人生之書",
    writingDescription: "正在編織命盤的骨架與時間的流動，依序完成各章。",
    writingProgressAria: "人生之書撰寫進度",
    chapterCountUnit: (completed, total) => `${completed}/${total}章 · `,
    completedHeading: "您完成的人生之書已開啟",
    completedDescription: "如果畫面沒有自動跳轉，請使用下方按鈕打開結果頁面。",
    openResultCta: "打開已完成的人生之書",
    openNewTabCta: "在新分頁中打開",
  },
  vi: {
    focusLabel: {
      overall: "Dòng chảy cuộc đời tổng thể",
      love: "Tình yêu và nhân duyên",
      money: "Tài lộc và hiện thực",
      career: "Công việc và tài năng",
      relationship: "Các mối quan hệ",
      family: "Gia đình và cội nguồn",
      lifePurpose: "Mục đích cuộc đời",
      turningPoint: "Bước ngoặt cuộc đời",
    },
    focusHint: {
      overall: "Đọc rộng những cảnh lớn xuyên suốt cuộc đời bạn.",
      love: "Nhìn sâu vào cách trái tim mở ra và kết nối.",
      money: "Xem xét dòng chảy tiền bạc và sự ổn định đang tích lũy.",
      career: "Xem xét vai trò bẩm sinh và hướng đi đến thành tựu.",
      relationship: "Sắp xếp những khuôn mẫu lặp lại giữa bạn và người khác.",
      family: "Đọc những mối duyên gần gũi và tình cảm lâu bền.",
      lifePurpose: "Soi sáng thái độ đáng gìn giữ lâu dài.",
      turningPoint: "Xem xét thời điểm bước sang chương tiếp theo.",
    },
    previewChapters: [
      "Chương 1 Nguyên mẫu lá số bẩm sinh của bạn",
      "Chương 2 Tính cách và khí chất",
      "Chương 3 Tài năng và hướng công việc",
      "Chương 4 Tình yêu và nhân duyên",
      "Chương 5 Tài lộc và nền tảng hiện thực",
      "Chương 6 Các mối quan hệ và gia đình",
      "Chương 7 Sức khỏe và sự cân bằng ngũ hành",
      "Chương 8 Những cảnh lớn của cuộc đời qua đại vận",
      "Chương 9 Lời khuyên cho thời gian sắp tới",
      "Chương 10 Câu cuối cùng của Cuốn Sách Cuộc Đời",
    ],
    heroBadges: ["Lá số bẩm sinh", "Đại vận và lưu niên", "Tình yêu và nhân duyên", "Tài lộc và sự nghiệp", "Mục đích cuộc đời", "Bước ngoặt cuộc đời"],
    birthTimeRequiredMessage: "Vui lòng nhập giờ sinh hoặc chọn 'không rõ giờ sinh'.",
    modeOptions: {
      lifeBook: { label: "Cuốn Sách Cuộc Đời", desc: "Báo cáo tường thuật cảm xúc đọc cuộc đời bạn như một cuốn sách" },
      lifeFortune: { label: "Vận Mệnh Cuộc Đời", desc: "Báo cáo chẩn đoán chính xác tập trung vào căn cứ Nhật Chủ/Dụng Thần/Đại Vận (dung lượng gấp 3 lần)" },
    },
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderUnknown: "Không công khai",
    genderUnselected: "Chưa chọn",
    heroTitle: "Tư vấn chuyên gia Cuốn Sách Cuộc Đời",
    heroDescription: "Chúng tôi đan kết những câu chữ từ lá số bẩm sinh của bạn với kết cấu thời gian bạn đã trải qua, đọc những cảnh phía trước như một cuốn sách.",
    passCheckTitle: "Đang kiểm tra thẻ sử dụng",
    passCheckCompleteTitle: "Kiểm tra thẻ sử dụng hoàn tất",
    passCheckCompleteMessage: "Đã hoàn tất kiểm tra thẻ sử dụng. Đang chuẩn bị Cuốn Sách Cuộc Đời của bạn.",
    passCheckFailedTitle: "Kiểm tra thẻ sử dụng thất bại",
    readyCheckHeading: "Những điều cần kiểm tra trước khi mở sách",
    nameLabel: "Tên:",
    birthDateLabel: "Ngày sinh:",
    focusAreaLabel: "Lĩnh vực trọng tâm:",
    notYetFilled: "Chưa điền",
    formHeading: "Thông tin để mở Cuốn Sách Cuộc Đời của bạn",
    formDescription: "Thông tin này được dùng để tính toán lá số cơ bản nhằm xây dựng cuốn sách diễn giải cuộc đời của bạn.",
    profileLoadAria: "Tải thông tin sinh từ thẻ hồ sơ",
    profileLoadCta: "Tải từ thẻ hồ sơ",
    reportTypeAria: "Chọn loại báo cáo",
    nameOrNicknameLabel: "Tên hoặc biệt danh",
    namePlaceholder: "Tên",
    genderFieldLabel: "Giới tính",
    birthDateFieldLabel: "Ngày sinh",
    calendarFieldLabel: "Loại lịch",
    solarLabel: "Dương lịch",
    lunarLabel: "Âm lịch",
    birthTimeFieldLabel: "Giờ sinh",
    birthTimeUnknownLabel: "Không rõ giờ sinh",
    focusAreaFieldLabel: "Lĩnh vực trọng tâm báo cáo",
    priceLabelPrefix: "Giá sử dụng tư vấn ",
    openingCta: "Đang mở sách...",
    openCta: (mode) => (mode === "lifeFortune" ? "Mở Vận Mệnh Cuộc Đời" : "Mở Cuốn Sách Cuộc Đời"),
    retryStoryLabel: "Tiếp tục câu chuyện lần nữa",
    retryGenerationAria: "Thử tạo lại Cuốn Sách Cuộc Đời",
    nextChapterWaitingHeading: "Chương tiếp theo chưa được viết đang chờ đợi",
    nameMissing: "Chưa nhập tên",
    notEntered: "Chưa nhập",
    unknownLabel: "Không rõ",
    generateCta: "Tạo Cuốn Sách Cuộc Đời",
    writingHeading: "Cuốn Sách Cuộc Đời của bạn đang được viết",
    writingDescription: "Chúng tôi đang đan kết khung lá số với dòng chảy thời gian để hoàn thành từng chương lần lượt.",
    writingProgressAria: "Tiến độ viết Cuốn Sách Cuộc Đời",
    chapterCountUnit: (completed, total) => `${completed}/${total} chương · `,
    completedHeading: "Cuốn Sách Cuộc Đời hoàn thành của bạn đã mở",
    completedDescription: "Nếu màn hình không tự động chuyển, hãy dùng nút bên dưới để mở trang kết quả.",
    openResultCta: "Mở Cuốn Sách Cuộc Đời đã hoàn thành",
    openNewTabCta: "Mở trong tab mới",
  },
  hi: {
    focusLabel: {
      overall: "समग्र जीवन प्रवाह",
      love: "प्रेम और संबंध",
      money: "धन और वास्तविकता",
      career: "कार्य और प्रतिभा",
      relationship: "पारस्परिक संबंध",
      family: "परिवार और जड़ें",
      lifePurpose: "जीवन का उद्देश्य",
      turningPoint: "जीवन का मोड़",
    },
    focusHint: {
      overall: "आपके पूरे जीवन के बड़े दृश्यों को व्यापक रूप से पढ़ता है।",
      love: "हृदय के खुलने और जुड़ने के तरीके को गहराई से देखता है।",
      money: "धन और स्थिरता के जमा होने के प्रवाह की जांच करता है।",
      career: "आपकी जन्मजात भूमिका और उपलब्धि की दिशा को देखता है।",
      relationship: "लोगों के बीच दोहराए जाने वाले पैटर्न को व्यवस्थित करता है।",
      family: "आपके करीबी रिश्तों और पुरानी भावनाओं को पढ़ता है।",
      lifePurpose: "लंबे समय तक थामे रखने योग्य दृष्टिकोण को रोशन करता है।",
      turningPoint: "अगले अध्याय में जाने के समय की जांच करता है।",
    },
    previewChapters: [
      "अध्याय 1 आपकी जन्मजात कुंडली का मूल रूप",
      "अध्याय 2 व्यक्तित्व और स्वभाव",
      "अध्याय 3 प्रतिभा और कार्य की दिशा",
      "अध्याय 4 प्रेम और संबंध",
      "अध्याय 5 धन और वास्तविकता की नींव",
      "अध्याय 6 पारस्परिक संबंध और परिवार",
      "अध्याय 7 स्वास्थ्य और संतुलन",
      "अध्याय 8 महादशा से देखे गए जीवन के बड़े दृश्य",
      "अध्याय 9 निकट भविष्य के लिए सलाह",
      "अध्याय 10 जीवन की पुस्तक का अंतिम वाक्य",
    ],
    heroBadges: ["जन्मजात कुंडली", "महादशा और वार्षिक भाग्य", "प्रेम और संबंध", "धन और करियर", "जीवन का उद्देश्य", "जीवन का मोड़"],
    birthTimeRequiredMessage: "कृपया अपना जन्म समय दर्ज करें या 'जन्म समय अज्ञात' चुनें।",
    modeOptions: {
      lifeBook: { label: "जीवन की पुस्तक", desc: "आपके जीवन को एक पुस्तक की तरह पढ़ने वाली भावनात्मक कथा रिपोर्ट" },
      lifeFortune: { label: "जीवन भाग्य", desc: "दिन स्वामी/योंगशिन/महादशा प्रमाण पर केंद्रित सटीक निदान रिपोर्ट (3 गुना लंबाई)" },
    },
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderUnknown: "निजी",
    genderUnselected: "चयनित नहीं",
    heroTitle: "जीवन की पुस्तक विशेषज्ञ परामर्श",
    heroDescription: "हम आपकी जन्मजात कुंडली के वाक्यों को आपके बिताए समय की बनावट के साथ बुनते हैं, और आपके आगे के दृश्यों को एक पुस्तक की तरह पढ़ते हैं।",
    passCheckTitle: "पास की जांच हो रही है",
    passCheckCompleteTitle: "पास जांच पूर्ण",
    passCheckCompleteMessage: "पास की जांच पूरी हो गई है। आपकी जीवन की पुस्तक तैयार की जा रही है।",
    passCheckFailedTitle: "पास जांच विफल",
    readyCheckHeading: "पुस्तक खोलने से पहले जांचने योग्य बातें",
    nameLabel: "नाम:",
    birthDateLabel: "जन्म तिथि:",
    focusAreaLabel: "मुख्य क्षेत्र:",
    notYetFilled: "अभी तक भरा नहीं गया",
    formHeading: "आपकी जीवन की पुस्तक खोलने के लिए जानकारी",
    formDescription: "यह जानकारी आपकी जीवन व्याख्या पुस्तक बनाने के लिए मूल कुंडली गणना में उपयोग की जाती है।",
    profileLoadAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    profileLoadCta: "प्रोफ़ाइल कार्ड से लोड करें",
    reportTypeAria: "रिपोर्ट प्रकार चुनें",
    nameOrNicknameLabel: "नाम या उपनाम",
    namePlaceholder: "नाम",
    genderFieldLabel: "लिंग",
    birthDateFieldLabel: "जन्म तिथि",
    calendarFieldLabel: "कैलेंडर आधार",
    solarLabel: "सौर",
    lunarLabel: "चंद्र",
    birthTimeFieldLabel: "जन्म समय",
    birthTimeUnknownLabel: "जन्म समय अज्ञात",
    focusAreaFieldLabel: "रिपोर्ट का मुख्य क्षेत्र",
    priceLabelPrefix: "परामर्श उपयोग मूल्य ",
    openingCta: "पुस्तक खोली जा रही है...",
    openCta: (mode) => (mode === "lifeFortune" ? "जीवन भाग्य खोलें" : "जीवन की पुस्तक खोलें"),
    retryStoryLabel: "कहानी फिर से जारी रखें",
    retryGenerationAria: "जीवन की पुस्तक फिर से बनाने का प्रयास करें",
    nextChapterWaitingHeading: "अलिखित अगला अध्याय प्रतीक्षा में है",
    nameMissing: "नाम दर्ज नहीं किया गया",
    notEntered: "दर्ज नहीं किया गया",
    unknownLabel: "अज्ञात",
    generateCta: "जीवन की पुस्तक बनाएं",
    writingHeading: "आपकी जीवन की पुस्तक लिखी जा रही है",
    writingDescription: "हम कुंडली की संरचना को समय के प्रवाह के साथ बुनकर प्रत्येक अध्याय को क्रमशः पूरा कर रहे हैं।",
    writingProgressAria: "जीवन की पुस्तक लेखन प्रगति",
    chapterCountUnit: (completed, total) => `${completed}/${total} अध्याय · `,
    completedHeading: "आपकी पूर्ण जीवन की पुस्तक खुल गई है",
    completedDescription: "यदि स्क्रीन स्वचालित रूप से नहीं बदली, तो नीचे दिए गए बटन से परिणाम पृष्ठ खोलें।",
    openResultCta: "पूर्ण जीवन की पुस्तक खोलें",
    openNewTabCta: "नए टैब में खोलें",
  },
  es: {
    focusLabel: {
      overall: "Flujo general de la vida",
      love: "Amor y relaciones",
      money: "Riqueza y realidad",
      career: "Trabajo y talento",
      relationship: "Relaciones",
      family: "Familia y raíces",
      lifePurpose: "Propósito de vida",
      turningPoint: "Punto de inflexión",
    },
    focusHint: {
      overall: "Una lectura amplia de las grandes escenas de toda tu vida.",
      love: "Una mirada profunda a cómo se abre y conecta tu corazón.",
      money: "Examina el flujo de dinero y la estabilidad que se acumula.",
      career: "Analiza tu rol innato y la dirección hacia el logro.",
      relationship: "Ordena los patrones que se repiten entre las personas.",
      family: "Lee tus vínculos cercanos y sentimientos duraderos.",
      lifePurpose: "Ilumina la actitud que vale la pena mantener a largo plazo.",
      turningPoint: "Examina el momento de avanzar al siguiente capítulo.",
    },
    previewChapters: [
      "Capítulo 1 El arquetipo de tu carta innata",
      "Capítulo 2 Personalidad y temperamento",
      "Capítulo 3 Talento y dirección profesional",
      "Capítulo 4 Amor y relaciones",
      "Capítulo 5 Riqueza y base de la realidad",
      "Capítulo 6 Relaciones y familia",
      "Capítulo 7 Salud y equilibrio de los elementos",
      "Capítulo 8 Las grandes escenas de la vida vistas a través de la Gran Fortuna",
      "Capítulo 9 Consejos para el futuro cercano",
      "Capítulo 10 La frase final del Libro de la Vida",
    ],
    heroBadges: ["Carta innata", "Gran fortuna y fortuna anual", "Amor y relaciones", "Riqueza y carrera", "Propósito de vida", "Punto de inflexión"],
    birthTimeRequiredMessage: "Introduce tu hora de nacimiento o selecciona 'hora de nacimiento desconocida'.",
    modeOptions: {
      lifeBook: { label: "Libro de la Vida", desc: "Un informe narrativo emocional que lee tu vida como un libro" },
      lifeFortune: { label: "Fortuna de Vida", desc: "Un informe de diagnóstico preciso centrado en evidencia del Maestro del Día/Yongshin/Gran Fortuna (3 veces más extenso)" },
    },
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderUnknown: "Privado",
    genderUnselected: "No seleccionado",
    heroTitle: "Consulta experta del Libro de la Vida",
    heroDescription: "Entrelazamos las frases de tu carta innata con la textura del tiempo que has vivido, y leemos las escenas por venir como un libro.",
    passCheckTitle: "Verificando el pase",
    passCheckCompleteTitle: "Verificación del pase completada",
    passCheckCompleteMessage: "Verificación del pase completada. Preparando tu Libro de la Vida.",
    passCheckFailedTitle: "Verificación del pase fallida",
    readyCheckHeading: "Qué verificar antes de abrir el libro",
    nameLabel: "Nombre:",
    birthDateLabel: "Fecha de nacimiento:",
    focusAreaLabel: "Área de enfoque:",
    notYetFilled: "Aún no completado",
    formHeading: "Información para abrir tu Libro de la Vida",
    formDescription: "Esta información se usa para calcular la carta base con la que se construye tu libro de interpretación de vida.",
    profileLoadAria: "Cargar información de nacimiento desde tu tarjeta de perfil",
    profileLoadCta: "Cargar desde la tarjeta de perfil",
    reportTypeAria: "Seleccionar tipo de informe",
    nameOrNicknameLabel: "Nombre o apodo",
    namePlaceholder: "Nombre",
    genderFieldLabel: "Género",
    birthDateFieldLabel: "Fecha de nacimiento",
    calendarFieldLabel: "Tipo de calendario",
    solarLabel: "Solar",
    lunarLabel: "Lunar",
    birthTimeFieldLabel: "Hora de nacimiento",
    birthTimeUnknownLabel: "Hora de nacimiento desconocida",
    focusAreaFieldLabel: "Área de enfoque del informe",
    priceLabelPrefix: "Precio de la consulta ",
    openingCta: "Abriendo el libro...",
    openCta: (mode) => (mode === "lifeFortune" ? "Abrir Fortuna de Vida" : "Abrir Libro de la Vida"),
    retryStoryLabel: "Continuar la historia de nuevo",
    retryGenerationAria: "Reintentar generar el Libro de la Vida",
    nextChapterWaitingHeading: "Un capítulo sin escribir te espera",
    nameMissing: "Nombre no ingresado",
    notEntered: "No ingresado",
    unknownLabel: "Desconocido",
    generateCta: "Generar Libro de la Vida",
    writingHeading: "Tu Libro de la Vida se está escribiendo",
    writingDescription: "Estamos entrelazando la estructura de tu carta con el flujo del tiempo para completar cada capítulo en orden.",
    writingProgressAria: "Progreso de escritura del Libro de la Vida",
    chapterCountUnit: (completed, total) => `${completed}/${total} capítulos · `,
    completedHeading: "Tu Libro de la Vida completado se ha abierto",
    completedDescription: "Si la pantalla no cambió automáticamente, usa el botón de abajo para abrir la página de resultados.",
    openResultCta: "Abrir el Libro de la Vida completado",
    openNewTabCta: "Abrir en una nueva pestaña",
  },
  fr: {
    focusLabel: {
      overall: "Flux général de la vie",
      love: "Amour et relations",
      money: "Richesse et réalité",
      career: "Travail et talent",
      relationship: "Relations",
      family: "Famille et racines",
      lifePurpose: "But de la vie",
      turningPoint: "Tournant de la vie",
    },
    focusHint: {
      overall: "Une lecture large des grandes scènes de toute votre vie.",
      love: "Un regard profond sur la façon dont votre cœur s'ouvre et se connecte.",
      money: "Examine le flux d'argent et la stabilité qui s'accumule.",
      career: "Examine votre rôle inné et la direction vers la réussite.",
      relationship: "Classe les schémas qui se répètent entre les personnes.",
      family: "Lit vos liens proches et vos sentiments de longue date.",
      lifePurpose: "Éclaire l'attitude à conserver sur le long terme.",
      turningPoint: "Examine le moment de passer au chapitre suivant.",
    },
    previewChapters: [
      "Chapitre 1 L'archétype de votre thème inné",
      "Chapitre 2 Personnalité et tempérament",
      "Chapitre 3 Talent et orientation professionnelle",
      "Chapitre 4 Amour et relations",
      "Chapitre 5 Richesse et fondation de la réalité",
      "Chapitre 6 Relations et famille",
      "Chapitre 7 Santé et équilibre des éléments",
      "Chapitre 8 Les grandes scènes de la vie vues à travers la Grande Fortune",
      "Chapitre 9 Conseils pour l'avenir proche",
      "Chapitre 10 La phrase finale du Livre de la Vie",
    ],
    heroBadges: ["Thème inné", "Grande fortune et fortune annuelle", "Amour et relations", "Richesse et carrière", "But de la vie", "Tournant de la vie"],
    birthTimeRequiredMessage: "Veuillez saisir votre heure de naissance ou sélectionner « heure de naissance inconnue ».",
    modeOptions: {
      lifeBook: { label: "Livre de la Vie", desc: "Un rapport narratif émotionnel qui lit votre vie comme un livre" },
      lifeFortune: { label: "Fortune de Vie", desc: "Un rapport de diagnostic précis centré sur les preuves du Maître du Jour/Yongshin/Grande Fortune (3 fois plus long)" },
    },
    genderFemale: "Femme",
    genderMale: "Homme",
    genderUnknown: "Privé",
    genderUnselected: "Non sélectionné",
    heroTitle: "Consultation experte du Livre de la Vie",
    heroDescription: "Nous tissons les phrases de votre thème inné avec la texture du temps que vous avez vécu, et lisons les scènes à venir comme un livre.",
    passCheckTitle: "Vérification du pass",
    passCheckCompleteTitle: "Vérification du pass terminée",
    passCheckCompleteMessage: "Vérification du pass terminée. Préparation de votre Livre de Vie.",
    passCheckFailedTitle: "Échec de la vérification du pass",
    readyCheckHeading: "À vérifier avant d'ouvrir le livre",
    nameLabel: "Nom :",
    birthDateLabel: "Date de naissance :",
    focusAreaLabel: "Domaine d'intérêt :",
    notYetFilled: "Pas encore rempli",
    formHeading: "Informations pour ouvrir votre Livre de la Vie",
    formDescription: "Ces informations sont utilisées pour calculer le thème de base afin de construire votre livre d'interprétation de vie.",
    profileLoadAria: "Charger les informations de naissance depuis votre carte de profil",
    profileLoadCta: "Charger depuis la carte de profil",
    reportTypeAria: "Sélectionner le type de rapport",
    nameOrNicknameLabel: "Nom ou surnom",
    namePlaceholder: "Nom",
    genderFieldLabel: "Genre",
    birthDateFieldLabel: "Date de naissance",
    calendarFieldLabel: "Type de calendrier",
    solarLabel: "Solaire",
    lunarLabel: "Lunaire",
    birthTimeFieldLabel: "Heure de naissance",
    birthTimeUnknownLabel: "Heure de naissance inconnue",
    focusAreaFieldLabel: "Domaine d'intérêt du rapport",
    priceLabelPrefix: "Prix de la consultation ",
    openingCta: "Ouverture du livre...",
    openCta: (mode) => (mode === "lifeFortune" ? "Ouvrir la Fortune de Vie" : "Ouvrir le Livre de la Vie"),
    retryStoryLabel: "Continuer l'histoire à nouveau",
    retryGenerationAria: "Réessayer de générer le Livre de la Vie",
    nextChapterWaitingHeading: "Un chapitre non écrit vous attend",
    nameMissing: "Nom non renseigné",
    notEntered: "Non renseigné",
    unknownLabel: "Inconnu",
    generateCta: "Générer le Livre de la Vie",
    writingHeading: "Votre Livre de la Vie est en cours d'écriture",
    writingDescription: "Nous tissons la structure de votre thème avec le flux du temps pour compléter chaque chapitre à tour de rôle.",
    writingProgressAria: "Progression de l'écriture du Livre de la Vie",
    chapterCountUnit: (completed, total) => `${completed}/${total} chapitres · `,
    completedHeading: "Votre Livre de la Vie terminé s'est ouvert",
    completedDescription: "Si l'écran n'a pas changé automatiquement, utilisez le bouton ci-dessous pour ouvrir la page de résultats.",
    openResultCta: "Ouvrir le Livre de la Vie terminé",
    openNewTabCta: "Ouvrir dans un nouvel onglet",
  },
  de: {
    focusLabel: {
      overall: "Allgemeiner Lebensfluss",
      love: "Liebe und Beziehungen",
      money: "Wohlstand und Realität",
      career: "Arbeit und Talent",
      relationship: "Beziehungen",
      family: "Familie und Wurzeln",
      lifePurpose: "Lebenszweck",
      turningPoint: "Wendepunkt des Lebens",
    },
    focusHint: {
      overall: "Ein umfassender Blick auf die großen Szenen Ihres ganzen Lebens.",
      love: "Ein tiefer Blick darauf, wie sich Ihr Herz öffnet und verbindet.",
      money: "Untersucht den Fluss von Geld und wachsender Stabilität.",
      career: "Betrachtet Ihre angeborene Rolle und Richtung zum Erfolg.",
      relationship: "Ordnet die Muster, die sich zwischen Menschen wiederholen.",
      family: "Liest Ihre engen Bindungen und langjährigen Gefühle.",
      lifePurpose: "Beleuchtet die Haltung, die es langfristig zu bewahren gilt.",
      turningPoint: "Untersucht den Zeitpunkt für den Übergang zum nächsten Kapitel.",
    },
    previewChapters: [
      "Kapitel 1 Der Archetyp Ihres angeborenen Charts",
      "Kapitel 2 Persönlichkeit und Temperament",
      "Kapitel 3 Talent und berufliche Richtung",
      "Kapitel 4 Liebe und Beziehungen",
      "Kapitel 5 Wohlstand und Grundlage der Realität",
      "Kapitel 6 Beziehungen und Familie",
      "Kapitel 7 Gesundheit und Elementebalance",
      "Kapitel 8 Die großen Szenen des Lebens durch das große Glück",
      "Kapitel 9 Rat für die nahe Zukunft",
      "Kapitel 10 Der letzte Satz des Lebensbuchs",
    ],
    heroBadges: ["Angeborenes Chart", "Großes und jährliches Glück", "Liebe und Beziehungen", "Wohlstand und Karriere", "Lebenszweck", "Wendepunkt des Lebens"],
    birthTimeRequiredMessage: "Bitte geben Sie Ihre Geburtszeit ein oder wählen Sie 'Geburtszeit unbekannt'.",
    modeOptions: {
      lifeBook: { label: "Lebensbuch", desc: "Ein emotionaler Erzählbericht, der Ihr Leben wie ein Buch liest" },
      lifeFortune: { label: "Lebensglück", desc: "Ein präziser Diagnosebericht, der sich auf Tagesherrscher/Yongshin/Glückszyklus-Belege konzentriert (3-fache Länge)" },
    },
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderUnknown: "Privat",
    genderUnselected: "Nicht ausgewählt",
    heroTitle: "Lebensbuch-Expertenberatung",
    heroDescription: "Wir verweben die Sätze Ihres angeborenen Charts mit der Textur der von Ihnen erlebten Zeit und lesen die vor Ihnen liegenden Szenen wie ein Buch.",
    passCheckTitle: "Pass wird überprüft",
    passCheckCompleteTitle: "Passüberprüfung abgeschlossen",
    passCheckCompleteMessage: "Passüberprüfung abgeschlossen. Ihr Lebensbuch wird vorbereitet.",
    passCheckFailedTitle: "Passüberprüfung fehlgeschlagen",
    readyCheckHeading: "Was vor dem Öffnen des Buches zu prüfen ist",
    nameLabel: "Name:",
    birthDateLabel: "Geburtsdatum:",
    focusAreaLabel: "Schwerpunktbereich:",
    notYetFilled: "Noch nicht ausgefüllt",
    formHeading: "Informationen zum Öffnen Ihres Lebensbuchs",
    formDescription: "Diese Informationen werden verwendet, um das Basis-Chart für Ihr Lebensinterpretationsbuch zu berechnen.",
    profileLoadAria: "Geburtsinformationen aus Ihrer Profilkarte laden",
    profileLoadCta: "Aus Profilkarte laden",
    reportTypeAria: "Berichtstyp auswählen",
    nameOrNicknameLabel: "Name oder Spitzname",
    namePlaceholder: "Name",
    genderFieldLabel: "Geschlecht",
    birthDateFieldLabel: "Geburtsdatum",
    calendarFieldLabel: "Kalenderbasis",
    solarLabel: "Solar",
    lunarLabel: "Lunar",
    birthTimeFieldLabel: "Geburtszeit",
    birthTimeUnknownLabel: "Geburtszeit unbekannt",
    focusAreaFieldLabel: "Schwerpunktbereich des Berichts",
    priceLabelPrefix: "Beratungspreis ",
    openingCta: "Buch wird geöffnet...",
    openCta: (mode) => (mode === "lifeFortune" ? "Lebensglück öffnen" : "Lebensbuch öffnen"),
    retryStoryLabel: "Geschichte erneut fortsetzen",
    retryGenerationAria: "Erstellung des Lebensbuchs erneut versuchen",
    nextChapterWaitingHeading: "Ein ungeschriebenes nächstes Kapitel wartet",
    nameMissing: "Name nicht eingegeben",
    notEntered: "Nicht eingegeben",
    unknownLabel: "Unbekannt",
    generateCta: "Lebensbuch erstellen",
    writingHeading: "Ihr Lebensbuch wird geschrieben",
    writingDescription: "Wir verweben das Gerüst Ihres Charts mit dem Zeitfluss, um jedes Kapitel der Reihe nach zu vollenden.",
    writingProgressAria: "Fortschritt beim Schreiben des Lebensbuchs",
    chapterCountUnit: (completed, total) => `${completed}/${total} Kapitel · `,
    completedHeading: "Ihr fertiges Lebensbuch wurde geöffnet",
    completedDescription: "Wenn sich der Bildschirm nicht automatisch geändert hat, öffnen Sie die Ergebnisseite über die Schaltfläche unten.",
    openResultCta: "Fertiges Lebensbuch öffnen",
    openNewTabCta: "In neuem Tab öffnen",
  },
  nl: {
    focusLabel: {
      overall: "Algemene levensstroom",
      love: "Liefde en relaties",
      money: "Rijkdom en realiteit",
      career: "Werk en talent",
      relationship: "Relaties",
      family: "Familie en wortels",
      lifePurpose: "Levensdoel",
      turningPoint: "Keerpunt in het leven",
    },
    focusHint: {
      overall: "Een brede lezing van de grote scènes in je hele leven.",
      love: "Een diepe blik op hoe je hart zich opent en verbindt.",
      money: "Onderzoekt de stroom van geld en opbouwende stabiliteit.",
      career: "Bekijkt je aangeboren rol en richting naar succes.",
      relationship: "Ordent de patronen die zich herhalen tussen mensen.",
      family: "Leest je nauwe banden en langgekoesterde gevoelens.",
      lifePurpose: "Belicht de houding die het waard is om lang vast te houden.",
      turningPoint: "Onderzoekt het moment om naar het volgende hoofdstuk te gaan.",
    },
    previewChapters: [
      "Hoofdstuk 1 Het archetype van je aangeboren horoscoop",
      "Hoofdstuk 2 Persoonlijkheid en temperament",
      "Hoofdstuk 3 Talent en werkrichting",
      "Hoofdstuk 4 Liefde en relaties",
      "Hoofdstuk 5 Rijkdom en fundament van de realiteit",
      "Hoofdstuk 6 Relaties en familie",
      "Hoofdstuk 7 Gezondheid en balans van elementen",
      "Hoofdstuk 8 De grote scènes van het leven gezien door Groot Geluk",
      "Hoofdstuk 9 Advies voor de nabije toekomst",
      "Hoofdstuk 10 De laatste zin van het Levensboek",
    ],
    heroBadges: ["Aangeboren horoscoop", "Groot en jaarlijks geluk", "Liefde en relaties", "Rijkdom en carrière", "Levensdoel", "Keerpunt in het leven"],
    birthTimeRequiredMessage: "Voer je geboortetijd in of selecteer 'geboortetijd onbekend'.",
    modeOptions: {
      lifeBook: { label: "Levensboek", desc: "Een emotioneel verhalend rapport dat je leven als een boek leest" },
      lifeFortune: { label: "Levensgeluk", desc: "Een nauwkeurig diagnostisch rapport gericht op Dagmeester/Yongshin/Groot-Geluk-bewijs (3x de lengte)" },
    },
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderUnknown: "Privé",
    genderUnselected: "Niet geselecteerd",
    heroTitle: "Levensboek-expertconsult",
    heroDescription: "We weven de zinnen van je aangeboren horoscoop samen met de textuur van de tijd die je hebt beleefd, en lezen de scènes voor je als een boek.",
    passCheckTitle: "Pas wordt gecontroleerd",
    passCheckCompleteTitle: "Pascontrole voltooid",
    passCheckCompleteMessage: "Pascontrole voltooid. Je Levensboek wordt voorbereid.",
    passCheckFailedTitle: "Pascontrole mislukt",
    readyCheckHeading: "Wat te controleren voordat je het boek opent",
    nameLabel: "Naam:",
    birthDateLabel: "Geboortedatum:",
    focusAreaLabel: "Focusgebied:",
    notYetFilled: "Nog niet ingevuld",
    formHeading: "Informatie om je Levensboek te openen",
    formDescription: "Deze informatie wordt gebruikt om de basishoroscoop te berekenen voor het samenstellen van je levensinterpretatieboek.",
    profileLoadAria: "Geboortegegevens laden vanuit je profielkaart",
    profileLoadCta: "Laden vanuit profielkaart",
    reportTypeAria: "Rapporttype selecteren",
    nameOrNicknameLabel: "Naam of bijnaam",
    namePlaceholder: "Naam",
    genderFieldLabel: "Geslacht",
    birthDateFieldLabel: "Geboortedatum",
    calendarFieldLabel: "Kalenderbasis",
    solarLabel: "Zonnekalender",
    lunarLabel: "Maankalender",
    birthTimeFieldLabel: "Geboortetijd",
    birthTimeUnknownLabel: "Geboortetijd onbekend",
    focusAreaFieldLabel: "Focusgebied van het rapport",
    priceLabelPrefix: "Consultprijs ",
    openingCta: "Boek wordt geopend...",
    openCta: (mode) => (mode === "lifeFortune" ? "Levensgeluk openen" : "Levensboek openen"),
    retryStoryLabel: "Verhaal opnieuw voortzetten",
    retryGenerationAria: "Opnieuw proberen het Levensboek te genereren",
    nextChapterWaitingHeading: "Een ongeschreven volgend hoofdstuk wacht",
    nameMissing: "Naam niet ingevuld",
    notEntered: "Niet ingevuld",
    unknownLabel: "Onbekend",
    generateCta: "Levensboek genereren",
    writingHeading: "Je Levensboek wordt geschreven",
    writingDescription: "We weven het raamwerk van je horoscoop samen met de tijdsstroom om elk hoofdstuk op zijn beurt te voltooien.",
    writingProgressAria: "Voortgang schrijven Levensboek",
    chapterCountUnit: (completed, total) => `${completed}/${total} hoofdstukken · `,
    completedHeading: "Je voltooide Levensboek is geopend",
    completedDescription: "Als het scherm niet automatisch is veranderd, gebruik dan de knop hieronder om de resultatenpagina te openen.",
    openResultCta: "Voltooid Levensboek openen",
    openNewTabCta: "Openen in nieuw tabblad",
  },
  ms: {
    focusLabel: {
      overall: "Aliran hidup keseluruhan",
      love: "Cinta dan hubungan",
      money: "Kekayaan dan realiti",
      career: "Kerja dan bakat",
      relationship: "Perhubungan",
      family: "Keluarga dan akar",
      lifePurpose: "Tujuan hidup",
      turningPoint: "Titik perubahan hidup",
    },
    focusHint: {
      overall: "Bacaan meluas tentang adegan besar sepanjang hidup anda.",
      love: "Melihat secara mendalam bagaimana hati anda terbuka dan berhubung.",
      money: "Meneliti aliran wang dan kestabilan yang terkumpul.",
      career: "Melihat peranan semula jadi dan hala tuju ke arah pencapaian.",
      relationship: "Menyusun corak yang berulang antara anda dan orang lain.",
      family: "Membaca ikatan rapat dan perasaan yang telah lama dipegang.",
      lifePurpose: "Menerangi sikap yang berbaloi dipegang dalam jangka panjang.",
      turningPoint: "Meneliti waktu untuk beralih ke bab seterusnya.",
    },
    previewChapters: [
      "Bab 1 Arketaip carta semula jadi anda",
      "Bab 2 Personaliti dan perwatakan",
      "Bab 3 Bakat dan hala tuju kerjaya",
      "Bab 4 Cinta dan hubungan",
      "Bab 5 Kekayaan dan asas realiti",
      "Bab 6 Perhubungan dan keluarga",
      "Bab 7 Kesihatan dan keseimbangan elemen",
      "Bab 8 Adegan besar kehidupan dilihat melalui Nasib Besar",
      "Bab 9 Nasihat untuk masa terdekat",
      "Bab 10 Ayat terakhir Buku Kehidupan",
    ],
    heroBadges: ["Carta semula jadi", "Nasib besar dan tahunan", "Cinta dan hubungan", "Kekayaan dan kerjaya", "Tujuan hidup", "Titik perubahan hidup"],
    birthTimeRequiredMessage: "Sila masukkan masa lahir anda atau pilih 'masa lahir tidak diketahui'.",
    modeOptions: {
      lifeBook: { label: "Buku Kehidupan", desc: "Laporan naratif emosi yang membaca kehidupan anda seperti sebuah buku" },
      lifeFortune: { label: "Nasib Kehidupan", desc: "Laporan diagnostik tepat berpusat pada bukti Tuan Hari/Yongshin/Nasib Besar (3x panjang)" },
    },
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderUnknown: "Peribadi",
    genderUnselected: "Tidak dipilih",
    heroTitle: "Perundingan pakar Buku Kehidupan",
    heroDescription: "Kami menganyam ayat-ayat carta semula jadi anda dengan tekstur masa yang telah anda lalui, dan membaca adegan di hadapan anda seperti sebuah buku.",
    passCheckTitle: "Menyemak pas",
    passCheckCompleteTitle: "Semakan pas selesai",
    passCheckCompleteMessage: "Semakan pas selesai. Sedang menyediakan Buku Kehidupan anda.",
    passCheckFailedTitle: "Semakan pas gagal",
    readyCheckHeading: "Perkara yang perlu disemak sebelum membuka buku",
    nameLabel: "Nama:",
    birthDateLabel: "Tarikh lahir:",
    focusAreaLabel: "Bidang tumpuan:",
    notYetFilled: "Belum diisi",
    formHeading: "Maklumat untuk membuka Buku Kehidupan anda",
    formDescription: "Maklumat ini digunakan untuk mengira carta asas bagi membina buku tafsiran kehidupan anda.",
    profileLoadAria: "Muatkan maklumat kelahiran daripada kad profil",
    profileLoadCta: "Muatkan daripada kad profil",
    reportTypeAria: "Pilih jenis laporan",
    nameOrNicknameLabel: "Nama atau nama panggilan",
    namePlaceholder: "Nama",
    genderFieldLabel: "Jantina",
    birthDateFieldLabel: "Tarikh lahir",
    calendarFieldLabel: "Asas kalendar",
    solarLabel: "Suria",
    lunarLabel: "Lunar",
    birthTimeFieldLabel: "Masa lahir",
    birthTimeUnknownLabel: "Masa lahir tidak diketahui",
    focusAreaFieldLabel: "Bidang tumpuan laporan",
    priceLabelPrefix: "Harga penggunaan perundingan ",
    openingCta: "Membuka buku...",
    openCta: (mode) => (mode === "lifeFortune" ? "Buka Nasib Kehidupan" : "Buka Buku Kehidupan"),
    retryStoryLabel: "Sambung semula cerita",
    retryGenerationAria: "Cuba jana semula Buku Kehidupan",
    nextChapterWaitingHeading: "Bab seterusnya yang belum ditulis sedang menunggu",
    nameMissing: "Nama tidak dimasukkan",
    notEntered: "Tidak dimasukkan",
    unknownLabel: "Tidak diketahui",
    generateCta: "Jana Buku Kehidupan",
    writingHeading: "Buku Kehidupan anda sedang ditulis",
    writingDescription: "Kami menganyam rangka carta anda dengan aliran masa untuk melengkapkan setiap bab secara bergilir.",
    writingProgressAria: "Kemajuan penulisan Buku Kehidupan",
    chapterCountUnit: (completed, total) => `${completed}/${total} bab · `,
    completedHeading: "Buku Kehidupan anda yang lengkap telah dibuka",
    completedDescription: "Jika skrin tidak bertukar secara automatik, gunakan butang di bawah untuk membuka halaman hasil.",
    openResultCta: "Buka Buku Kehidupan yang lengkap",
    openNewTabCta: "Buka dalam tab baharu",
  },
};

function getLifeBookClientCopy(locale: LoadingLocale): LifeBookCopy {
  return LIFE_BOOK_CLIENT_COPY[locale] || LIFE_BOOK_CLIENT_EN;
}

function useLifeBookClientCopy(): LifeBookCopy {
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
  return getLifeBookClientCopy(locale);
}

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  focusArea: FocusAreaType;
  mode: LifeBookMode;
};

type PrepareResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload?: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

const FEATURE_KEY = "life-book-ai-consultation";
const ROUTE = "/life-book-ai";
// 클라가 /generate 를 반복 호출해 웨이브를 진행시킨다(master-love-codex runBatches 패턴).
// 총운 15섹션 ÷ 웨이브당 4 = 4웨이브 + 재시도 여유. 서버 MAX_GENERATION_WAVES(8)보다 넉넉히.
const MAX_GENERATE_WAVES = 12;
const WAVE_LOCK_RETRY_DELAY_MS = 4000;

const FOCUS_AREA_VALUES: FocusAreaType[] = [
  "overall", "love", "money", "career", "relationship", "family", "lifePurpose", "turningPoint",
];

// 결제 payload 의 topic 필드는 화면에 보이지 않는 메타데이터/AI 프롬프트 컨텍스트일 뿐이라
// 로케일과 무관하게 고정한다(표시용 라벨은 useLifeBookClientCopy().focusLabel 을 쓴다).
const FOCUS_TOPIC_KO: Record<FocusAreaType, string> = {
  overall: "전체 인생 흐름",
  love: "사랑과 인연",
  money: "재물과 현실 기반",
  career: "일과 재능",
  relationship: "인간관계",
  family: "가족과 뿌리",
  lifePurpose: "삶의 목적",
  turningPoint: "인생 전환점",
};

const GENERATION_STEPS = WRITING_STAGES;

const LOGIN_REQUIRED_MESSAGE = REASON_COPY.LOGIN_REQUIRED;
const PAYMENT_REQUIRED_MESSAGE = REASON_COPY.PAYMENT_REQUIRED;
const PAYMENT_VERIFY_FAILED_MESSAGE = REASON_COPY.PAYMENT_VERIFY_FAILED;
const PAYMENT_CANCELLED_MESSAGE = REASON_COPY.PAYMENT_CANCELLED;
const PRICE_NOT_FOUND_MESSAGE = REASON_COPY.PRICE_NOT_FOUND;
const INVALID_INPUT_MESSAGE = REASON_COPY.INVALID_INPUT;
const SERVER_ERROR_MESSAGE = REASON_COPY.SERVER_ERROR;
const LLM_ERROR_MESSAGE = REASON_COPY.LLM_ERROR;
const NETWORK_ERROR_MESSAGE = REASON_COPY.NETWORK;

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  focusArea: "overall",
  mode: "lifeBook",
});

const MODE_VALUES: LifeBookMode[] = ["lifeBook", "lifeFortune"];

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined) {
    return form;
  }
  return {
    ...form,
    name: profile.name || form.name,
    gender: (profile.gender as ConsultationForm["gender"]) || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime: profile.birthTimeUnknown === true ? "" : (profile.birthTime || form.birthTime),
    calendarType: profile.calendarType || form.calendarType,
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `lbai-${crypto.randomUUID()}`;
  return `lbai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function maskBirthDate(value: string) {
  const year = value.match(/^(\d{4})-/)?.[1];
  return year ? `${year}-**-**` : "";
}

function formatGender(value: GenderType, copy: LifeBookCopy) {
  if (value === "female") return copy.genderFemale;
  if (value === "male") return copy.genderMale;
  if (value === "unknown") return copy.genderUnknown;
  return copy.genderUnselected;
}

function buildResultUrl(attemptId: string, pending = false) {
  const params = new URLSearchParams({ attemptId });
  if (pending) params.set("pending", "1");
  return `/life-book-ai/result?${params.toString()}`;
}

function buildConsultationPayload(form: ConsultationForm, requestId: string) {
  const topic = FOCUS_TOPIC_KO[form.focusArea];
  const mode = form.mode || "lifeBook";
  return {
    serviceType: MODE_FEATURE_KEY[mode],
    consultationType: mode,
    userName: form.name.trim(),
    gender: form.gender || "unknown",
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    focusArea: form.focusArea,
    locale: detectLocale(),
    requestId,
    idempotencyKey: requestId,
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender || "unknown",
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
    },
    topic,
  };
}

function validateForm(form: ConsultationForm, copy: LifeBookCopy) {
  if (!form.gender || !form.birthDate || !form.calendarType || !form.focusArea) return INVALID_INPUT_MESSAGE;
  if (!form.birthTimeUnknown && !form.birthTime) return copy.birthTimeRequiredMessage;
  if (!form.birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) return copy.birthTimeRequiredMessage;
  return "";
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string, mode: LifeBookMode, copy: LifeBookCopy) {
  const modeFeatureKey = MODE_FEATURE_KEY[mode];
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, 0);
  const amountKRW = toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, 0);
  const membershipCreditCost = toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, 0);
  if (cost <= 0 || amountKRW <= 0 || membershipCreditCost <= 0) {
    throw new Error(PRICE_NOT_FOUND_MESSAGE);
  }
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || modeFeatureKey,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || modeFeatureKey,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || copy.modeOptions[mode].label,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || "life-book-ai",
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || "life-book-ai",
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || modeFeatureKey,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `life-book-ai:${idempotencyKey}`,
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost,
  };
}

export default function LifeBookAiClient() {
  const copy = useLifeBookClientCopy();
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [waveProgress, setWaveProgress] = useState<{ completed: number; total: number } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [refunded, setRefunded] = useState(false);
  const startLockRef = useRef(false);
  const retryRef = useRef<{ payload: ReturnType<typeof buildConsultationPayload>; requestId: string; access: Record<string, unknown> | null; mode: LifeBookMode } | null>(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const router = useRouter();
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function loadFormFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }

  useEffect(() => {
    console.info("[LifeBook AI Page Enter]", { route: ROUTE });
    console.info("[LifeBook AI Initial Render Success]", { route: ROUTE, serviceType: FEATURE_KEY });
  }, []);

  const isBusy = status === "opening" || status === "payment" || status === "generating" || status === "navigating";
  const validationMessage = useMemo(() => validateForm(form, copy), [form, copy]);
  const isReadyToGenerate = !validationMessage;

  // 🔴 예전 activeStep = tick % 8 은 11초마다 1단계로 되돌아갔다(사용자에겐 "멈춘 것"처럼 보인다).
  //    서버가 주는 progress(completed/total)를 1순위로 쓰고, 없을 때만 경과 시간 기반 점근선을 쓴다.
  //    점근선은 단조 증가하며 100에 닿지 않는다.
  const progress = useMemo(() => {
    if (status === "completed" || status === "navigating") return 100;
    if (!isBusy) return 0;
    if (status === "opening") return 12;
    if (status === "payment") return 26;
    if (waveProgress && waveProgress.total > 0) {
      return Math.min(97, 45 + Math.round((waveProgress.completed / waveProgress.total) * 52));
    }
    return Math.min(96, Math.round(45 + 50 * (1 - Math.exp(-elapsedMs / 90000))));
  }, [status, isBusy, waveProgress, elapsedMs]);

  const activeStep = useMemo(() => {
    if (status !== "generating") return 0;
    if (waveProgress && waveProgress.total > 0) {
      const ratio = waveProgress.completed / waveProgress.total;
      return Math.min(GENERATION_STEPS.length - 1, Math.floor(ratio * GENERATION_STEPS.length));
    }
    return Math.min(GENERATION_STEPS.length - 1, Math.floor(elapsedMs / 30000));
  }, [status, waveProgress, elapsedMs]);

  useEffect(() => {
    if (!isBusy || !startedAt) return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, [isBusy, startedAt]);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    retryRef.current = null;
    setResultUrl("");
    setWaveProgress(null);
    setStartedAt(0);
    setElapsedMs(0);
    setRefunded(false);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = useCallback(<K extends keyof ConsultationForm>(field: K, value: ConsultationForm[K]) => {
    formTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
    }));
    resetAttempt();
  }, [resetAttempt]);

  // 🔴 결과는 같은 탭에서 연다. 팝업(window.open)은 별도 document 라 게이트 오버레이·세션 캐시가
  //    인계되지 않았고, 차단돼도 결제/생성이 그대로 진행돼 사용자가 빈 화면에 남았다.
  const goToResult = useCallback((attemptId: string) => {
    const finalUrl = buildResultUrl(attemptId);
    setResultUrl(finalUrl);
    setStatus("navigating");
    router.push(finalUrl);
  }, [router]);

  /**
   * 워커의 웨이브를 완료까지 반복 호출한다.
   * 🔴 매 호출이 같은 idempotencyKey 를 쓴다 — 새 키를 만들면 이중 결제가 된다.
   */
  const runGeneration = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: Record<string, unknown>,
  ) => {
    setStatus("generating");
    // 다음 화면(집필 중 상태)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);

    for (let wave = 0; wave < MAX_GENERATE_WAVES; wave += 1) {
      const outcome = await runGenerateWave(payload, idempotencyKey, access, () => {
        setNotice(FAILURE_COPY.retrying);
      });

      if (outcome.status === "completed") {
        setNotice("");
        setError("");
        setStatus("completed");
        setWaveProgress({ completed: 1, total: 1 });
        goToResult(idempotencyKey);
        return;
      }
      if (outcome.status === "failed") {
        const error = new Error(reasonCopy(outcome.reason, outcome.message || LLM_ERROR_MESSAGE));
        (error as Error & { refunded?: boolean }).refunded = outcome.data?.refunded === true;
        throw error;
      }
      if (outcome.progress) setWaveProgress(outcome.progress);
      setNotice("");
      // 다른 웨이브가 락을 쥐고 있으면 잠깐 기다렸다 이어받는다.
      if (outcome.httpStatus === 409) {
        await new Promise((resolve) => setTimeout(resolve, WAVE_LOCK_RETRY_DELAY_MS));
      }
    }
    // 웨이브 상한을 다 써도 안 끝났다면 결과 화면이 폴링으로 이어받는다(서버가 stale 을 확정 실패로 승격한다).
    goToResult(idempotencyKey);
  }, [goToResult]);

  const submit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (startLockRef.current || isBusy) return;

    const requestId = idempotencyKeyRef.current;
    const currentValidation = validateForm(form, copy);
    const mode: LifeBookMode = form.mode || "lifeBook";
    const modeFeatureKey = MODE_FEATURE_KEY[mode];
    console.info("[LifeBook AI Submit Start]", {
      route: ROUTE,
      requestId,
      serviceType: modeFeatureKey,
      focusArea: form.focusArea,
      validation: currentValidation ? "failed" : "passed",
      birthDate: maskBirthDate(form.birthDate),
    });

    if (currentValidation) {
      setError(currentValidation);
      setStatus("error");
      return;
    }

    startLockRef.current = true;
    const payload = buildConsultationPayload(form, requestId);
    setError("");
    setNotice("");
    setStartedAt(Date.now());
    setWaveProgress(null);
    setStatus("opening");
    beginPaidFeatureGateCheck({
      featureKey: modeFeatureKey,
      requestId,
      title: copy.passCheckTitle,
      reason: copy.modeOptions[mode].label,
    });
    // 확인 완료 후 다음 화면(집필 중 상태)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 runGeneration의 setStatus("generating")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId, maxMs: 8000 });

    try {
      // 🔴 일시 장애 재시도는 공용 헬퍼가 전담한다(4회/15초 예산). 그 위에 또 감싸지 않는다.
      const prepared = await prepareLifeBook<PrepareResult>(payload, requestId);
      const access = prepared.data;
      retryRef.current = { payload, requestId, access: null, mode };

      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: modeFeatureKey,
          requestId,
          title: copy.passCheckCompleteTitle,
          reason: copy.modeOptions[mode].label,
          message: copy.passCheckCompleteMessage,
        });
        retryRef.current = { payload, requestId, access: { accessToken: access.accessToken }, mode };
        await runGeneration(payload, requestId, { accessToken: access.accessToken });
        return;
      }

      const denied = access as Exclude<PrepareResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") {
        setError(denied.message || LOGIN_REQUIRED_MESSAGE);
        setStatus("error");
        return;
      }
      if (denied.reason === "INVALID_INPUT") {
        setError(denied.message || INVALID_INPUT_MESSAGE);
        setStatus("error");
        return;
      }
      // 이용권 확인 앞단의 일시 장애(degraded)면 dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 확인 실패 시 무조건 결제창).
      const passGateDegraded = (denied as Record<string, unknown>).retryable === true
        || String(denied.reason) === "DB_DEGRADED"
        || prepared.httpStatus >= 500;
      if (denied.reason === "PAYMENT_REQUIRED" || passGateDegraded) {
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        // degrade면 서버 paymentPayload가 없어 buildBillingGateInput의 가격검증(cost>0)에서 throw되므로,
        // 서버 레지스트리와 동일한 폴백 가격을 주입한다(🔴 모드별로 갈라야 총운에 오과금이 안 난다).
        // 실제 금액은 runBillingCoinGate→billing.js coin-gate가 featureKey로 재확정한다.
        const fallback = MODE_FALLBACK_PRICE[mode];
        const degradedFallbackPayload = {
          runtimeGate: {
            cost: fallback.coinPrice,
            coinPrice: fallback.coinPrice,
            amountKRW: fallback.amountKRW,
            membershipCreditCost: fallback.membershipCreditCost,
          },
        };
        const gatePayloadSource = "paymentPayload" in denied ? denied.paymentPayload : (passGateDegraded ? degradedFallbackPayload : undefined);
        const billingInput = buildBillingGateInput(asRecord(gatePayloadSource), requestId, mode, copy);
        const gate = await runBillingCoinGate(billingInput);
        if (!gate.ok || !gate.data) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
          if (code === "PAYMENT_CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
          throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
        }
        console.info("[LifeBook AI Payment Success]", {
          route: ROUTE,
          requestId,
          serviceType: modeFeatureKey,
          focusArea: form.focusArea,
        });
        retryRef.current = { payload, requestId, access: { billingGate: gate.data as Record<string, unknown> }, mode };
        await runGeneration(payload, requestId, { billingGate: gate.data as Record<string, unknown> });
        return;
      }
      throw new Error(("message" in denied && denied.message) ? denied.message : SERVER_ERROR_MESSAGE);
    } catch (err) {
      // 🔴 개발자 문구가 화면에 뜨지 않게 마지막 안전망을 통과시킨다(한글 없는 메시지는 콘솔로만 간다).
      const raw = err instanceof TypeError
        ? NETWORK_ERROR_MESSAGE
        : err instanceof Error
          ? err.message
          : SERVER_ERROR_MESSAGE;
      const message = friendlyErrorMessage(raw, SERVER_ERROR_MESSAGE);
      const paymentCancelled = message === PAYMENT_CANCELLED_MESSAGE;
      setRefunded((err as { refunded?: boolean })?.refunded === true);
      setError(message);
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: modeFeatureKey,
        requestId,
        title: copy.passCheckFailedTitle,
        reason: copy.modeOptions[mode].label,
        message,
        cancelled: paymentCancelled,
      });
    } finally {
      startLockRef.current = false;
    }
  }, [form, runGeneration, isBusy, copy]);

  // 확정 실패 후 사용자가 직접 누르는 재시도. 이미 환불이 끝난 세션은 새 키(=새 결제)로 다시 연다.
  const handleRetry = useCallback(async () => {
    if (startLockRef.current || isBusy) return;
    const stashed = retryRef.current;
    setRefunded(false);
    setError("");
    setNotice(FAILURE_COPY.retrying);
    if (!stashed?.access) {
      // 결제 증거가 없으면 처음부터 다시 — 새 키가 발급된다.
      idempotencyKeyRef.current = createIdempotencyKey();
      retryRef.current = null;
      await submit();
      return;
    }
    startLockRef.current = true;
    try {
      await runGeneration(stashed.payload, stashed.requestId, stashed.access);
    } catch (err) {
      const message = friendlyErrorMessage(err instanceof Error ? err.message : SERVER_ERROR_MESSAGE, SERVER_ERROR_MESSAGE);
      setError(message);
      setStatus("error");
    } finally {
      startLockRef.current = false;
    }
  }, [isBusy, runGeneration, submit]);
  const statusLabel = useMemo(() => {
    if (status === "generating") return GENERATION_STEPS[activeStep] || GENERATION_STEPS[0];
    return PHASE_COPY[status] || PHASE_COPY.idle;
  }, [status, activeStep]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050407] text-amber-50 [font-family:var(--font-body)]">
      <section className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(244,198,98,0.26),transparent_32%),radial-gradient(circle_at_16%_26%,rgba(120,43,38,0.20),transparent_30%),linear-gradient(135deg,#1b120b,#2a1a10_44%,#050407)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(250,226,169,.62)_1px,transparent_1px),radial-gradient(rgba(255,255,255,.16)_1px,transparent_1px)] [background-position:0_0,38px_46px] [background-size:96px_96px,138px_138px]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          {/* 상단 패딩: 전역 고정 "홈" 칩(left-3 / 124x44)이 이 카드 좌상단을 덮어 eyebrow 가 읽히지 않았다.
              모바일에서만 그 높이(+안전영역)만큼 비운다. 높이는 100vh 대신 dvh 로 — 주소창 노출 시 잘림 방지. */}
          <aside className="relative isolate flex min-h-[calc(100dvh-48px)] flex-col justify-between overflow-hidden rounded-3xl border border-amber-200/20 bg-white/[0.08] p-5 pt-[calc(64px+env(safe-area-inset-top,0px))] shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-7 sm:pt-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 bg-cover bg-[70%_center] opacity-55"
              style={{ backgroundImage: "url('/fuctionassets/life-book-reading-room-v1.webp')" }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(5,8,14,.86)_0%,rgba(5,8,14,.7)_42%,rgba(5,8,14,.96)_100%)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-50/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                <Stars className="h-4 w-4" aria-hidden="true" />
                Book of Life · AI Destiny Reading
              </div>
              <h2 className="mt-5 max-w-[12ch] text-4xl font-black leading-tight tracking-normal text-amber-50 sm:text-5xl">
                {copy.heroTitle}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#f0dec0]">
                {copy.heroDescription}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {copy.heroBadges.map((badge) => (
                  <span key={badge} className="rounded-full border border-amber-200/20 bg-amber-50/10 px-3 py-1 text-xs font-bold text-amber-100">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-8 rounded-3xl border border-amber-200/20 bg-[#100a08cc] p-4 shadow-inner shadow-amber-200/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Ready Check</p>
                  <h2 className="mt-1 text-xl font-black text-amber-50">{copy.readyCheckHeading}</h2>
                </div>
                {isReadyToGenerate && <CheckCircle2 className="h-6 w-6 shrink-0 text-amber-200" aria-hidden="true" />}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#eadbb9]">
                <span className="rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3">{copy.nameLabel} {form.name.trim() || copy.notYetFilled}</span>
                <span className="rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3">{copy.birthDateLabel} {form.birthDate || copy.notYetFilled}</span>
                <span className="rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3">{copy.focusAreaLabel} {copy.focusLabel[form.focusArea]}</span>
              </div>
              <div className="mt-4 grid gap-2">
                {copy.previewChapters.slice(0, 4).map((chapter, index) => (
                  <div key={chapter} className="rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] px-4 py-3 text-sm font-bold text-[#f5dfb7]">
                    <span className="mr-2 text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                    {chapter}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="grid content-start gap-4">
            <form onSubmit={submit} className="rounded-3xl border border-amber-200/20 bg-amber-50/10 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Golden Life Book</p>
                  <h2 className="mt-1 text-2xl font-black text-amber-50">{copy.formHeading}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e7d2b5]">
                    {copy.formDescription}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadFormFromProfileCard}
                  className="shrink-0 rounded-lg border border-amber-200/30 bg-amber-50/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-100/20"
                  aria-label={copy.profileLoadAria}
                >
                  {copy.profileLoadCta}
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/20 px-3 py-1 text-sm font-bold text-amber-100">
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
                  {statusLabel}
                </div>
              </div>

              <div className="mb-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={copy.reportTypeAria}>
                {MODE_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={form.mode === value}
                    onClick={() => updateField("mode", value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${form.mode === value ? "border-amber-200 bg-amber-200/15" : "border-amber-100/15 bg-[#0b1020cc] hover:border-amber-200/45"}`}
                  >
                    <span className={`block text-sm font-black ${form.mode === value ? "text-amber-100" : "text-[#f4dfbd]"}`}>{copy.modeOptions[value].label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#e7d2b5]">{copy.modeOptions[value].desc}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><UserRound className="h-4 w-4" aria-hidden="true" /> {copy.nameOrNicknameLabel}</span>
                  <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="min-h-11 rounded-2xl border border-amber-100/15 bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" placeholder={copy.namePlaceholder} />
                </label>

                <div className="grid gap-2 text-sm font-bold">
                  <span className="text-[#f6e6c4]">{copy.genderFieldLabel}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["female", copy.genderFemale],
                      ["male", copy.genderMale],
                      ["unknown", copy.genderUnknown],
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => updateField("gender", value)} className={`min-h-11 rounded-full border px-3 text-sm font-black transition ${form.gender === value ? "border-amber-200 bg-amber-200 text-[#160e08]" : "border-amber-100/15 bg-[#0b1020cc] text-[#f4dfbd] hover:border-amber-200/45"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {copy.birthDateFieldLabel}</span>
                  <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => updateField("birthDate", nextBirthDate))} className="min-h-11 rounded-2xl border border-amber-100/15 bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" />
                </label>

                <div className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><Moon className="h-4 w-4" aria-hidden="true" /> {copy.calendarFieldLabel}</span>
                  <div className="grid grid-cols-2 rounded-full border border-amber-100/15 bg-[#0b1020cc] p-1">
                    {([
                      ["solar", copy.solarLabel],
                      ["lunar", copy.lunarLabel],
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => updateField("calendarType", value)} className={`min-h-11 rounded-full text-sm font-black transition ${form.calendarType === value ? "bg-amber-200 text-[#160e08]" : "text-[#f4dfbd] hover:bg-amber-50/10"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><Clock3 className="h-4 w-4" aria-hidden="true" /> {copy.birthTimeFieldLabel}</span>
                  <input type="time" value={form.birthTime} onChange={(event) => updateField("birthTime", event.target.value)} disabled={form.birthTimeUnknown} className="min-h-11 rounded-2xl border border-amber-100/15 bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33] disabled:opacity-50" />
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-full border border-amber-100/15 bg-[#0b1020cc] px-4 text-sm font-bold text-[#eadfc9]">
                  <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => updateField("birthTimeUnknown", event.target.checked)} className="h-4 w-4 accent-[#e7bd62]" />
                  {copy.birthTimeUnknownLabel}
                </label>
              </div>

              <div className="mt-4 grid gap-2">
                <span className="text-sm font-bold text-[#f6e6c4]">{copy.focusAreaFieldLabel}</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FOCUS_AREA_VALUES.map((value) => (
                    <button key={value} type="button" onClick={() => updateField("focusArea", value)} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${form.focusArea === value ? "border-amber-200/55 bg-amber-100/15 shadow-lg shadow-amber-200/10" : "border-amber-100/15 bg-[#0b1020aa]"}`}>
                      <span className="block text-sm font-black text-amber-50">{copy.focusLabel[value]}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#d8c6a7]">{copy.focusHint[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <PriceBadge featureKey={MODE_FEATURE_KEY[form.mode || "lifeBook"]} prefix={copy.priceLabelPrefix} />
              </div>
              <button type="submit" disabled={isBusy} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c68d31] via-[#f2d07a] to-[#b47b25] px-5 font-black text-[#171007] shadow-lg shadow-[#f0c66a22] transition hover:-translate-y-0.5 hover:shadow-[#f0c66a40] disabled:cursor-not-allowed disabled:opacity-60">
                {isBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <WalletCards className="h-5 w-5" aria-hidden="true" />}
                {isBusy ? copy.openingCta : copy.openCta(form.mode || "lifeBook")}
              </button>

              {(notice || error) && (
                <div
                  role={error ? "alert" : "status"}
                  aria-live="polite"
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-[#fb718540] bg-[#3b111bcc] text-[#fecdd3]" : "border-[#f4d27a38] bg-[#302513cc] text-[#ffe8b0]"}`}
                >
                  {error ? (
                    <>
                      <p className="font-black text-[#ffd8de]">{FAILURE_COPY.headline}</p>
                      <p className="mt-1 leading-6">{error}</p>
                      {refunded && <p className="mt-1 leading-6 text-[#fecdd3]/85">{FAILURE_COPY.refunded}</p>}
                      <button
                        type="button"
                        onClick={() => void handleRetry()}
                        disabled={isBusy}
                        aria-label={copy.retryGenerationAria}
                        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#fecdd3]/40 bg-[#fecdd3]/10 px-5 font-black text-[#ffe4e8] transition hover:bg-[#fecdd3]/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        {copy.retryStoryLabel}
                      </button>
                    </>
                  ) : notice}
                </div>
              )}
            </form>

            {!isBusy && status !== "completed" && (
              <section className="rounded-3xl border border-amber-200/20 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Table of Contents</p>
                    <h2 className="mt-1 text-2xl font-black text-amber-50">{copy.nextChapterWaitingHeading}</h2>
                  </div>
                  {isReadyToGenerate && <CheckCircle2 className="h-6 w-6 text-amber-200" aria-hidden="true" />}
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl border border-amber-200/15 bg-black/20 p-4 text-sm text-[#eadbb9] sm:grid-cols-2">
                  <span>{copy.nameLabel} {form.name.trim() || copy.nameMissing}</span>
                  <span>{copy.genderFieldLabel}: {formatGender(form.gender, copy)}</span>
                  <span>{copy.birthDateLabel} {form.birthDate || copy.notEntered}</span>
                  <span>{copy.calendarFieldLabel}: {form.calendarType === "lunar" ? copy.lunarLabel : copy.solarLabel}</span>
                  <span>{copy.birthTimeFieldLabel}: {form.birthTimeUnknown ? copy.unknownLabel : form.birthTime || copy.notEntered}</span>
                  <span>{copy.focusAreaLabel} {copy.focusLabel[form.focusArea]}</span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {copy.previewChapters.map((chapter, index) => (
                    <div key={chapter} className="rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] px-4 py-3 text-sm font-bold text-[#f5dfb7]">
                      <span className="mr-2 text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                      {chapter}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => void submit()} disabled={!isReadyToGenerate || isBusy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-amber-200/35 bg-amber-50/10 px-5 font-black text-amber-50 transition hover:-translate-y-0.5 hover:bg-amber-100/20 disabled:cursor-not-allowed disabled:opacity-50">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  {copy.generateCta}
                </button>
              </section>
            )}

            {isBusy && (
              <section className="rounded-3xl border border-amber-200/20 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Writing in Progress</p>
                <h2 className="mt-1 text-2xl font-black text-amber-50">{copy.writingHeading}</h2>
                <p className="mt-2 text-sm leading-6 text-[#e7d2b5]">
                  {copy.writingDescription}
                </p>

                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={statusLabel}
                  aria-label={copy.writingProgressAria}
                  className="mt-5 overflow-hidden rounded-full border border-amber-200/20 bg-black/30"
                >
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#9f6b24] via-[#f2d07a] to-[#fff3b0] transition-all duration-700 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                </div>
                {/* ⚠️ 진행률 숫자는 aria-live 에 넣지 않는다 — 1초마다 숫자를 읽어 스크린리더 사용이 불가능해진다. */}
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-amber-100">
                  <span aria-live="polite" aria-atomic="true">{statusLabel}</span>
                  <span aria-hidden="true">
                    {waveProgress ? copy.chapterCountUnit(waveProgress.completed, waveProgress.total) : ""}{progress}%
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {GENERATION_STEPS.slice(0, 4).map((step, index) => (
                    <div key={step} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${index <= activeStep ? "border-amber-200/30 bg-amber-50/10 text-amber-50" : "border-amber-100/10 bg-black/20 text-[#bda988]"}`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full border border-amber-200/25 text-xs">{index + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-28 animate-pulse rounded-2xl border border-amber-200/15 bg-gradient-to-br from-amber-100/15 to-black/20 motion-reduce:animate-none" />
                  ))}
                </div>
              </section>
            )}

            {status === "completed" && resultUrl && (
              <section className="rounded-3xl border border-amber-200/25 bg-amber-50/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Completed</p>
                <h2 className="mt-1 text-2xl font-black text-amber-50">{copy.completedHeading}</h2>
                <p className="mt-2 text-sm leading-6 text-[#e7d2b5]">
                  {copy.completedDescription}
                </p>
                <a href={resultUrl} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 font-black text-[#171007] transition hover:-translate-y-0.5">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  {copy.openResultCta}
                </a>
                <a href={resultUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200/30 px-5 text-sm font-black text-amber-100 transition hover:bg-amber-50/10">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {copy.openNewTabCta}
                </a>
              </section>
            )}

          </section>
        </div>
      </section>
    </main>
  );
}
