// 태양 회복 타로(SunHealingTarot) UI 크롬 공용 카피 — 서버/AI가 채우는 reading.* 값,
// buildSunHealingAiPromptText()의 AI 프롬프트 본문, MAJOR_CARD_NAMES/SUIT_NAMES/RANK_NAMES
// (lib/tarot/tarot-cards.mjs와 동일해야 하는 카드 고유명사 데이터)는 대상이 아니다.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getSunHealingCopy()가 EN과 병합해 자동 폴백한다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface SunHealingTarotCopy {
  headerEyebrow: string;
  headerTitle: string;
  homeButton: string;

  introEyebrow: string;
  introHeadingLine1: string;
  introHeadingLine2: string;
  introDescription: string;
  startButton: string;
  preparingLabel: string;

  spreadEyebrow: string;
  spreadHeading: string;
  openReadingButton: string;
  interpretingLabel: string;

  sidebarEyebrow: string;
  sidebarReadyHeading: string;
  sidebarDescription: string;

  statusDone: string;
  statusInProgress: string;
  statusWaiting: string;

  cardBackLabel: string;
  positionLabels: [string, string, string, string];
  positionLabelsShort: [string, string, string, string];
  orientationLabel: (orientation: string | undefined) => string;
  cardFallbackTitle: (idx: number) => string;

  resultEyebrow: string;
  resultHeading: string;
  resultSubtitleFallback: string;
  todayLineLabel: string;

  shareButton: string;
  rereadButton: string;
  otherFortuneButton: string;

  adviceEyebrow: string;
  adviceHeading: string;
  adviceFallback: string;

  cardSummaryEyebrow: string;
  cardSummaryHeading: string;
  cardDetailEyebrow: string;
  cardDetailHeading: string;
  meaningLabel: string;
  shadowLabel: string;
  recoveryActionLabel: string;

  overallFlowTitle: string;
  routineEyebrow: string;
  routineHeading: string;
  affirmationLabel: string;
  qualityEnhancedNote: string;

  promptPanelKicker: string;
  promptPanelTitle: string;
  promptPanelLead: string;
  promptCopyButton: string;
  promptCopiedStatus: string;
  promptCopyManualStatus: string;

  loginRequiredAlert: string;
  delayedAlert: string;
  fetchErrorAlert: string;
  linkCopiedAlert: string;
  shareUnsupportedAlert: string;

  shareTitle: string;
  shareTextPrefix: string;
}

const SUN_HEALING_TAROT_COPY_EN: SunHealingTarotCopy = {
  headerEyebrow: "Sun Healing Reading",
  headerTitle: "Sun Healing Tarot",
  homeButton: "Home",

  introEyebrow: "A tarot room that warms the heart",
  introHeadingLine1: "We'll quietly light the place",
  introHeadingLine2: "where your heart will return",
  introDescription: "Four cards reveal, in turn, where your heart has grown tired, the temperature of your feelings, the clue to recovery, and a small action to start today. The reading doesn't state things flatly — it guides you toward trusting yourself again.",
  startButton: "Start the sun reading",
  preparingLabel: "Preparing…",

  spreadEyebrow: "The four-card sun spread",
  spreadHeading: "Open the cards one by one",
  openReadingButton: "Open the healing reading",
  interpretingLabel: "Reading…",

  sidebarEyebrow: "The place opening now",
  sidebarReadyHeading: "Consultation ready",
  sidebarDescription: "The order you open the cards mirrors the flow of your heart. Don't rush to a conclusion — accepting the feelings that surface one card at a time makes the reading clearer.",

  statusDone: "Done",
  statusInProgress: "In progress",
  statusWaiting: "Waiting",

  cardBackLabel: "Open the light",
  positionLabels: ["Where the heart grew tired", "The temperature of feeling", "A clue to recovery", "Today's recovery action"],
  positionLabelsShort: ["Place", "Temp.", "Clue", "Action"],
  orientationLabel: (orientation) => (orientation === "reversed" ? "Reversed" : "Upright"),
  cardFallbackTitle: (idx) => `Card ${idx + 1}`,

  resultEyebrow: "A dawn-light reading",
  resultHeading: "Today's sun reading",
  resultSubtitleFallback: "A reading that doesn't erase the marks left behind, but brings light back to that very place",
  todayLineLabel: "Today's sun sentence",

  shareButton: "Share",
  rereadButton: "Read again",
  otherFortuneButton: "See other readings",

  adviceEyebrow: "Dawn-light guidance",
  adviceHeading: "A reading that returns light to the marks on your heart",
  adviceFallback: "Instead of treating your current feelings as a problem, we translate the symbols the cards revealed into a recoverable scene and words.",

  cardSummaryEyebrow: "A four-card summary",
  cardSummaryHeading: "Four scenes reflected in your heart today",
  cardDetailEyebrow: "A recovery message per card",
  cardDetailHeading: "The recovery sentence each card offers",
  meaningLabel: "What the card reveals",
  shadowLabel: "Something to watch carefully",
  recoveryActionLabel: "Today's recovery action",

  overallFlowTitle: "Overall flow",
  routineEyebrow: "Today's recovery routine",
  routineHeading: "A recovery action you can start in 10 minutes",
  affirmationLabel: "A sentence for you today",
  qualityEnhancedNote: "The four sun messages have come together into a calmer whole.",

  promptPanelKicker: "A recovery question to continue",
  promptPanelTitle: "Reflect once more on what the sun left behind",
  promptPanelLead: "Pass the text below along as-is, and you can continue a deeper consultation grounded in today's cards and recovery routine.",
  promptCopyButton: "Copy consultation text",
  promptCopiedStatus: "Copied.",
  promptCopyManualStatus: "Please select and copy it manually.",

  loginRequiredAlert: "You need to log in to open a recovery reading. Please log in and try again.",
  delayedAlert: "Preparing the reading is taking longer than expected. Please refresh the page and check again.",
  fetchErrorAlert: "Something went wrong while loading the reading. Please try again shortly.",
  linkCopiedAlert: "Link copied.",
  shareUnsupportedAlert: "Sharing isn't supported in this environment.",

  shareTitle: "Sun Healing Tarot",
  shareTextPrefix: "A message from Sun Healing Tarot.\n\n",
};

const SUN_HEALING_TAROT_COPY: Partial<Record<LoadingLocale, SunHealingTarotCopy>> = {
  ko: {
    headerEyebrow: "태양 회복 리딩",
    headerTitle: "태양 회복 타로",
    homeButton: "홈",

    introEyebrow: "마음을 데우는 타로 방",
    introHeadingLine1: "마음이 돌아올 자리를",
    introHeadingLine2: "조용히 밝혀드립니다",
    introDescription: "네 장의 카드는 마음이 지친 자리, 감정의 온도, 회복의 단서, 오늘 시작할 작은 행동을 차례로 비춥니다. 해석은 단정하지 않고, 마음이 스스로를 다시 믿을 수 있는 방향으로 안내합니다.",
    startButton: "태양 리딩 시작",
    preparingLabel: "준비 중…",

    spreadEyebrow: "네 장의 태양 스프레드",
    spreadHeading: "카드를 하나씩 열어보세요",
    openReadingButton: "회복 리딩 열기",
    interpretingLabel: "해석 중…",

    sidebarEyebrow: "지금 열리는 자리",
    sidebarReadyHeading: "상담 준비 완료",
    sidebarDescription: "카드를 여는 순서는 마음의 흐름과 같습니다. 급하게 결론으로 뛰어가지 않고, 지금 드러난 감정을 한 장씩 받아들이면 리딩이 더 선명해집니다.",

    statusDone: "완료",
    statusInProgress: "진행",
    statusWaiting: "대기",

    cardBackLabel: "빛을 열기",
    positionLabels: ["마음이 지친 자리", "감정의 온도", "회복의 단서", "오늘의 회복 행동"],
    positionLabelsShort: ["자리", "온도", "단서", "행동"],
    orientationLabel: (orientation) => (orientation === "reversed" ? "역방향" : "정방향"),
    cardFallbackTitle: (idx) => `카드 ${idx + 1}`,

    resultEyebrow: "새벽빛 리딩",
    resultHeading: "오늘의 태양 리딩",
    resultSubtitleFallback: "마음의 흔적을 지우지 않고, 그 자리에 다시 빛을 들이는 리딩",
    todayLineLabel: "오늘의 태양 한 문장",

    shareButton: "공유",
    rereadButton: "다시 리딩하기",
    otherFortuneButton: "다른 운세 보기",

    adviceEyebrow: "새벽빛 조언",
    adviceHeading: "마음의 흔적 위에 빛을 돌려놓는 해석",
    adviceFallback: "지금의 마음을 문제로 만들지 않고, 카드가 비춘 상징을 회복 가능한 장면과 말로 정리합니다.",

    cardSummaryEyebrow: "4장 카드 요약",
    cardSummaryHeading: "오늘 마음에 비친 네 장면",
    cardDetailEyebrow: "카드별 회복 메시지",
    cardDetailHeading: "각 카드가 건네는 회복 문장",
    meaningLabel: "카드가 비춘 의미",
    shadowLabel: "조심히 살필 부분",
    recoveryActionLabel: "오늘의 회복 행동",

    overallFlowTitle: "종합 흐름",
    routineEyebrow: "오늘의 회복 루틴",
    routineHeading: "10분 안에 시작하는 회복 행동",
    affirmationLabel: "오늘 나에게 건네는 문장",
    qualityEnhancedNote: "네 장의 태양 메시지가 한결 차분한 결로 모였습니다.",

    promptPanelKicker: "이어 볼 회복 질문",
    promptPanelTitle: "태양이 남긴 문장을 한 번 더 비추기",
    promptPanelLead: "아래 문장을 그대로 전하면, 오늘 펼쳐진 카드의 온기와 회복 루틴을 바탕으로 더 깊은 상담을 이어갈 수 있습니다.",
    promptCopyButton: "상담 문장 복사",
    promptCopiedStatus: "복사되었습니다.",
    promptCopyManualStatus: "직접 선택해 복사해 주세요.",

    loginRequiredAlert: "회복 리딩을 열려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
    delayedAlert: "해석 준비가 지연되고 있습니다. 페이지를 새로고침한 뒤 다시 확인해 주세요.",
    fetchErrorAlert: "해석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    linkCopiedAlert: "링크를 복사했습니다.",
    shareUnsupportedAlert: "공유를 지원하지 않는 환경입니다.",

    shareTitle: "태양 회복 타로",
    shareTextPrefix: "태양 회복 타로가 건넨 메시지입니다.\n\n",
  },
  ja: {
    headerEyebrow: "太陽回復リーディング",
    headerTitle: "太陽回復タロット",
    homeButton: "ホーム",

    introEyebrow: "心を温めるタロットの部屋",
    introHeadingLine1: "心が戻る場所を",
    introHeadingLine2: "静かに照らします",
    introDescription: "4枚のカードは、心が疲れた場所、感情の温度、回復の手がかり、今日から始める小さな行動を順に映し出します。解釈は断定せず、心が再び自分を信じられる方向へ導きます。",
    startButton: "太陽リーディングを始める",
    preparingLabel: "準備中…",

    spreadEyebrow: "4枚の太陽スプレッド",
    spreadHeading: "カードを一枚ずつ開いてみましょう",
    openReadingButton: "回復リーディングを開く",
    interpretingLabel: "解読中…",

    sidebarEyebrow: "今開かれている場所",
    sidebarReadyHeading: "相談の準備完了",
    sidebarDescription: "カードを開く順序は心の流れと同じです。急いで結論に飛びつかず、今現れた感情を一枚ずつ受け入れると、リーディングがより鮮明になります。",

    statusDone: "完了",
    statusInProgress: "進行中",
    statusWaiting: "待機",

    cardBackLabel: "光を開く",
    positionLabels: ["心が疲れた場所", "感情の温度", "回復の手がかり", "今日の回復行動"],
    positionLabelsShort: ["場所", "温度", "手がかり", "行動"],
    orientationLabel: (orientation) => (orientation === "reversed" ? "逆位置" : "正位置"),
    cardFallbackTitle: (idx) => `カード${idx + 1}`,

    resultEyebrow: "夜明けの光のリーディング",
    resultHeading: "今日の太陽リーディング",
    resultSubtitleFallback: "心の跡を消すのではなく、その場所にもう一度光を灯すリーディング",
    todayLineLabel: "今日の太陽の一文",

    shareButton: "共有",
    rereadButton: "もう一度リーディングする",
    otherFortuneButton: "他の占いを見る",

    adviceEyebrow: "夜明けの光の助言",
    adviceHeading: "心の跡の上に光を取り戻す解釈",
    adviceFallback: "今の気持ちを問題にするのではなく、カードが映した象徴を回復可能な場面と言葉に整理します。",

    cardSummaryEyebrow: "4枚のカードまとめ",
    cardSummaryHeading: "今日心に映った4つの場面",
    cardDetailEyebrow: "カードごとの回復メッセージ",
    cardDetailHeading: "各カードが贈る回復の言葉",
    meaningLabel: "カードが映した意味",
    shadowLabel: "注意して見守るべきこと",
    recoveryActionLabel: "今日の回復行動",

    overallFlowTitle: "総合的な流れ",
    routineEyebrow: "今日の回復ルーティン",
    routineHeading: "10分で始められる回復行動",
    affirmationLabel: "今日の自分に贈る言葉",
    qualityEnhancedNote: "4つの太陽のメッセージが、より落ち着いた形にまとまりました。",

    promptPanelKicker: "続けて見る回復の質問",
    promptPanelTitle: "太陽が残した言葉をもう一度照らす",
    promptPanelLead: "以下の文章をそのまま伝えると、今日開かれたカードの温もりと回復ルーティンをもとに、より深い相談を続けられます。",
    promptCopyButton: "相談文をコピー",
    promptCopiedStatus: "コピーしました。",
    promptCopyManualStatus: "直接選択してコピーしてください。",

    loginRequiredAlert: "回復リーディングを開くにはログインが必要です。ログイン後、もう一度お試しください。",
    delayedAlert: "解読の準備に時間がかかっています。ページを更新してもう一度ご確認ください。",
    fetchErrorAlert: "解読の読み込み中に問題が発生しました。しばらくしてからもう一度お試しください。",
    linkCopiedAlert: "リンクをコピーしました。",
    shareUnsupportedAlert: "この環境では共有がサポートされていません。",

    shareTitle: "太陽回復タロット",
    shareTextPrefix: "太陽回復タロットが贈ったメッセージです。\n\n",
  },
  "zh-CN": {
    headerEyebrow: "太阳疗愈解读",
    headerTitle: "太阳疗愈塔罗",
    homeButton: "首页",

    introEyebrow: "温暖心灵的塔罗房间",
    introHeadingLine1: "为心灵归处",
    introHeadingLine2: "静静点亮一盏灯",
    introDescription: "四张牌依次映照出心灵疲惫之处、情绪的温度、疗愈的线索，以及今天可以开始的小行动。解读不做断言，而是引导心灵重新相信自己。",
    startButton: "开始太阳解读",
    preparingLabel: "准备中…",

    spreadEyebrow: "四张太阳牌阵",
    spreadHeading: "逐一翻开卡牌",
    openReadingButton: "开启疗愈解读",
    interpretingLabel: "解读中…",

    sidebarEyebrow: "此刻正在开启的位置",
    sidebarReadyHeading: "咨询已准备就绪",
    sidebarDescription: "翻牌的顺序如同心灵的流动。不要急于下结论，一张一张接纳此刻浮现的情绪，解读会更加清晰。",

    statusDone: "已完成",
    statusInProgress: "进行中",
    statusWaiting: "等待中",

    cardBackLabel: "开启光芒",
    positionLabels: ["心灵疲惫之处", "情绪的温度", "疗愈的线索", "今日的疗愈行动"],
    positionLabelsShort: ["位置", "温度", "线索", "行动"],
    orientationLabel: (orientation) => (orientation === "reversed" ? "逆位" : "正位"),
    cardFallbackTitle: (idx) => `第${idx + 1}张牌`,

    resultEyebrow: "晨光解读",
    resultHeading: "今日的太阳解读",
    resultSubtitleFallback: "不抹去心灵的痕迹，而是在那个位置重新点亮光芒的解读",
    todayLineLabel: "今日太阳箴言",

    shareButton: "分享",
    rereadButton: "重新解读",
    otherFortuneButton: "查看其他运势",

    adviceEyebrow: "晨光建议",
    adviceHeading: "在心灵的痕迹上重新点亮光芒的解读",
    adviceFallback: "不将此刻的心情视为问题，而是把卡牌映照出的象征整理成可以疗愈的场景与话语。",

    cardSummaryEyebrow: "四张牌摘要",
    cardSummaryHeading: "今日映照在心中的四个场景",
    cardDetailEyebrow: "每张牌的疗愈讯息",
    cardDetailHeading: "每张牌传递的疗愈话语",
    meaningLabel: "卡牌映照的含义",
    shadowLabel: "需要谨慎留意之处",
    recoveryActionLabel: "今日的疗愈行动",

    overallFlowTitle: "综合流向",
    routineEyebrow: "今日的疗愈日常",
    routineHeading: "10分钟内就能开始的疗愈行动",
    affirmationLabel: "今天想对自己说的话",
    qualityEnhancedNote: "四条太阳讯息汇聚成了更为沉稳的整体。",

    promptPanelKicker: "可以延续的疗愈问题",
    promptPanelTitle: "再次映照太阳留下的话语",
    promptPanelLead: "原样传达以下文字，即可基于今日展开的卡牌和疗愈日常，继续更深入的咨询。",
    promptCopyButton: "复制咨询文本",
    promptCopiedStatus: "已复制。",
    promptCopyManualStatus: "请手动选择并复制。",

    loginRequiredAlert: "开启疗愈解读需要先登录，请登录后重试。",
    delayedAlert: "解读准备时间较长，请刷新页面后再次确认。",
    fetchErrorAlert: "加载解读时出现问题，请稍后再试。",
    linkCopiedAlert: "已复制链接。",
    shareUnsupportedAlert: "当前环境不支持分享。",

    shareTitle: "太阳疗愈塔罗",
    shareTextPrefix: "太阳疗愈塔罗传递的讯息。\n\n",
  },
  "zh-TW": {
    headerEyebrow: "太陽療癒解讀",
    headerTitle: "太陽療癒塔羅",
    homeButton: "首頁",

    introEyebrow: "溫暖心靈的塔羅房間",
    introHeadingLine1: "為心靈歸處",
    introHeadingLine2: "靜靜點亮一盞燈",
    introDescription: "四張牌依序映照出心靈疲憊之處、情緒的溫度、療癒的線索，以及今天可以開始的小行動。解讀不做斷言，而是引導心靈重新相信自己。",
    startButton: "開始太陽解讀",
    preparingLabel: "準備中…",

    spreadEyebrow: "四張太陽牌陣",
    spreadHeading: "逐一翻開卡牌",
    openReadingButton: "開啟療癒解讀",
    interpretingLabel: "解讀中…",

    sidebarEyebrow: "此刻正在開啟的位置",
    sidebarReadyHeading: "諮詢已準備就緒",
    sidebarDescription: "翻牌的順序如同心靈的流動。不要急於下結論，一張一張接納此刻浮現的情緒，解讀會更加清晰。",

    statusDone: "已完成",
    statusInProgress: "進行中",
    statusWaiting: "等待中",

    cardBackLabel: "開啟光芒",
    positionLabels: ["心靈疲憊之處", "情緒的溫度", "療癒的線索", "今日的療癒行動"],
    positionLabelsShort: ["位置", "溫度", "線索", "行動"],
    orientationLabel: (orientation) => (orientation === "reversed" ? "逆位" : "正位"),
    cardFallbackTitle: (idx) => `第${idx + 1}張牌`,

    resultEyebrow: "晨光解讀",
    resultHeading: "今日的太陽解讀",
    resultSubtitleFallback: "不抹去心靈的痕跡，而是在那個位置重新點亮光芒的解讀",
    todayLineLabel: "今日太陽箴言",

    shareButton: "分享",
    rereadButton: "重新解讀",
    otherFortuneButton: "查看其他運勢",

    adviceEyebrow: "晨光建議",
    adviceHeading: "在心靈的痕跡上重新點亮光芒的解讀",
    adviceFallback: "不將此刻的心情視為問題，而是把卡牌映照出的象徵整理成可以療癒的場景與話語。",

    cardSummaryEyebrow: "四張牌摘要",
    cardSummaryHeading: "今日映照在心中的四個場景",
    cardDetailEyebrow: "每張牌的療癒訊息",
    cardDetailHeading: "每張牌傳遞的療癒話語",
    meaningLabel: "卡牌映照的含義",
    shadowLabel: "需要謹慎留意之處",
    recoveryActionLabel: "今日的療癒行動",

    overallFlowTitle: "綜合流向",
    routineEyebrow: "今日的療癒日常",
    routineHeading: "10分鐘內就能開始的療癒行動",
    affirmationLabel: "今天想對自己說的話",
    qualityEnhancedNote: "四條太陽訊息匯聚成了更為沉穩的整體。",

    promptPanelKicker: "可以延續的療癒問題",
    promptPanelTitle: "再次映照太陽留下的話語",
    promptPanelLead: "原樣傳達以下文字，即可基於今日展開的卡牌和療癒日常，繼續更深入的諮詢。",
    promptCopyButton: "複製諮詢文本",
    promptCopiedStatus: "已複製。",
    promptCopyManualStatus: "請手動選擇並複製。",

    loginRequiredAlert: "開啟療癒解讀需要先登入，請登入後重試。",
    delayedAlert: "解讀準備時間較長，請重新整理頁面後再次確認。",
    fetchErrorAlert: "載入解讀時出現問題，請稍後再試。",
    linkCopiedAlert: "已複製連結。",
    shareUnsupportedAlert: "目前環境不支援分享。",

    shareTitle: "太陽療癒塔羅",
    shareTextPrefix: "太陽療癒塔羅傳遞的訊息。\n\n",
  },
  en: SUN_HEALING_TAROT_COPY_EN,
};

export function getSunHealingTarotCopy(locale: LoadingLocale): SunHealingTarotCopy {
  return { ...SUN_HEALING_TAROT_COPY_EN, ...(SUN_HEALING_TAROT_COPY[locale] || {}) };
}

export function useSunHealingTarotCopy(): SunHealingTarotCopy {
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
  return getSunHealingTarotCopy(locale);
}
