"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { showToast } from "./Toast";
import { showSubscriptionIncludedNotice } from "./subscriptionNotice";
import { useCoinGate } from "../hooks/useCoinGate";
import { lookupServerCoinPrice } from "@/app/_lib/serviceCoinPrice";
import { hardNavigateToShellHome } from "@/lib/navigation/shellHome";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type DrawnCard = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: string;
};

const SPREAD_TYPE = "relationship_six_card";
const CATEGORY = "love";
const CARD_COUNT = 6;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

const LOVE_RELATIONSHIP_TAROT_TEXT_TRANSLATIONS = {
  ko: {
    drawFailed: "카드 뽑기 실패",
    invalidCards: "6카드 데이터가 올바르지 않습니다.",
    drawError: "카드 뽑기 중 오류가 발생했습니다.",
    paymentReason: "우리는 무슨 사이? 타로 리딩",
    subscriptionIncluded: "이용권 혜택이 적용되어 추가 결제 없이 열렸습니다.",
    subscriptionReason: "우리는 무슨 사이 타로",
    paymentApproved: (chargedCoins: number, balanceAfter: number) =>
      `우리는 무슨 사이? 타로 ${Math.max(0, chargedCoins * 100).toLocaleString("ko-KR")}원 결제가 승인되었습니다. 잔여 원화 가치: ${Math.max(0, balanceAfter * 100).toLocaleString("ko-KR")}원`,
    // 월정석 1개 = 10원(MEMBERSHIP_CREDIT_PER_COIN 10). 이용권과 다른 재화이므로 문구를 섞지 않는다.
    stoneOpened: (spentCredits: number, balanceCredits: number | null) =>
      `월정석 ${Math.max(0, spentCredits * 10).toLocaleString("ko-KR")}원 상당으로 우리는 무슨 사이? 타로가 열렸습니다.${typeof balanceCredits === "number" ? ` 남은 월정석: ${Math.max(0, balanceCredits * 10).toLocaleString("ko-KR")}원 상당` : ""}`,
    authRequired: "로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
    insufficientCoins: (requiredCoins: number) => `결제 가능 금액이 부족합니다. ${Math.max(0, requiredCoins * 100).toLocaleString("ko-KR")}원 결제가 필요합니다.`,
    refunded: "리딩 생성이 완료되지 않아 이번 결제가 환불되었습니다.",
    paymentUnconfirmed: "결제 확인이 완료되지 않았습니다.",
    readingError: "해석 생성 중 오류가 발생했습니다.",
    title: "우리는 무슨 사이? 연애 타로",
    home: "홈으로",
    intro: "관계 6카드 스프레드로 상대와의 흐름을 확인하는 독립 페이지 버전입니다.",
    preparing: "카드 준비 중...",
    startDraw: "6카드 뽑기 시작",
    spreadTitle: "관계 스프레드",
    revealCard: "클릭해서 카드 공개",
    revealPrevious: "이전 카드를 먼저 공개하세요",
    viewReading: "관계 해석 보기",
    revealProgress: "공개 진행",
    resultTitle: "관계 온도 리딩 결과",
    currentTemperature: "🌙 관계의 현재 온도",
    sixCardFlow: "6장 흐름:",
    firstToLast: "첫 카드 → 마지막 카드:",
    mismatchPoint: "🔍 마음이 엇갈리는 지점",
    projectionGap: "기대와 감정의 간격:",
    relationshipFrame: "관계의 속도 기준:",
    nextChoice: "🧭 현실 흐름과 다음 선택",
    blockToOutcome: "막힘과 가까운 흐름:",
    sevenDayRhythm: "7일의 리듬:",
    positionReading: "🃏 포지션별 관계 해석",
    positionFallback: (index: number) => `포지션 ${index + 1}`,
    keywords: "핵심 키워드:",
    coreSignal: "핵심 신호:",
    relationshipReading: "관계 해석:",
    relationshipPsychology: "관계 심리:",
    todayChoice: "오늘의 선택:",
    cautionFlow: "조심할 흐름:",
    flowConnection: "흐름 연결:",
    choiceToKeep: "🧭 지금 지킬 선택",
    instantMission: "⚡ 오늘 남길 한 문장:",
    conversationTip: "💬 대화의 온도:",
    boundary: "🛡️ 내가 지킬 선:",
    checklist: "✅ 실전 체크리스트:",
  },
  en: {
    drawFailed: "Card draw failed.",
    invalidCards: "The six-card data is not valid.",
    drawError: "An error occurred while drawing cards.",
    paymentReason: "What Are We? Tarot Reading",
    subscriptionIncluded: "Your pass benefit was applied, so it opened without an extra payment.",
    subscriptionReason: "What Are We Tarot",
    paymentApproved: (chargedCoins: number, balanceAfter: number) =>
      `What Are We? Tarot payment of ${Math.max(0, chargedCoins * 100).toLocaleString("en-US")} KRW was approved. Remaining KRW value: ${Math.max(0, balanceAfter * 100).toLocaleString("en-US")} KRW`,
    stoneOpened: (spentCredits: number, balanceCredits: number | null) =>
      `What Are We? Tarot opened with Moonlight Stones worth ${Math.max(0, spentCredits * 10).toLocaleString("en-US")} KRW.${typeof balanceCredits === "number" ? ` Remaining Moonlight Stones: ${Math.max(0, balanceCredits * 10).toLocaleString("en-US")} KRW value` : ""}`,
    authRequired: "Login is required. Please sign in and try again.",
    insufficientCoins: (requiredCoins: number) => `Your available payment balance is too low. ${Math.max(0, requiredCoins * 100).toLocaleString("en-US")} KRW is required.`,
    refunded: "The reading was not completed, so this payment has been refunded.",
    paymentUnconfirmed: "Payment confirmation has not been completed.",
    readingError: "An error occurred while creating the reading.",
    title: "What Are We? Love Tarot",
    home: "Home",
    intro: "A standalone page for checking your relationship flow with a six-card spread.",
    preparing: "Preparing cards...",
    startDraw: "Start the 6-card draw",
    spreadTitle: "Relationship Spread",
    revealCard: "Click to reveal the card",
    revealPrevious: "Reveal the previous card first",
    viewReading: "View Relationship Reading",
    revealProgress: "Reveal progress",
    resultTitle: "Relationship Temperature Reading",
    currentTemperature: "🌙 Current Relationship Temperature",
    sixCardFlow: "Six-card flow:",
    firstToLast: "First card → last card:",
    mismatchPoint: "🔍 Where Feelings Cross",
    projectionGap: "Expectation and emotion gap:",
    relationshipFrame: "Relationship pace standard:",
    nextChoice: "🧭 Real Flow and Next Choice",
    blockToOutcome: "Block and near-term flow:",
    sevenDayRhythm: "7-day rhythm:",
    positionReading: "🃏 Relationship Reading by Position",
    positionFallback: (index: number) => `Position ${index + 1}`,
    keywords: "Core keywords:",
    coreSignal: "Core signal:",
    relationshipReading: "Relationship reading:",
    relationshipPsychology: "Relationship psychology:",
    todayChoice: "Today’s choice:",
    cautionFlow: "Flow to watch:",
    flowConnection: "Flow connection:",
    choiceToKeep: "🧭 Choice to Keep Now",
    instantMission: "⚡ One sentence to leave today:",
    conversationTip: "💬 Conversation temperature:",
    boundary: "🛡️ Boundary to keep:",
    checklist: "✅ Practical checklist:",
  },
  ja: {
    drawFailed: "カードの抽出に失敗しました。",
    invalidCards: "6枚カードのデータが正しくありません。",
    drawError: "カード抽出中にエラーが発生しました。",
    paymentReason: "私たちはどんな関係？タロットリーディング",
    subscriptionIncluded: "利用券の特典が適用され、追加決済なしで開きました。",
    subscriptionReason: "私たちはどんな関係タロット",
    paymentApproved: (chargedCoins: number, balanceAfter: number) =>
      `私たちはどんな関係？タロット ${Math.max(0, chargedCoins * 100).toLocaleString("ja-JP")}ウォンの決済が承認されました。残りのウォン相当額: ${Math.max(0, balanceAfter * 100).toLocaleString("ja-JP")}ウォン`,
    stoneOpened: (spentCredits: number, balanceCredits: number | null) =>
      `月精石 ${Math.max(0, spentCredits * 10).toLocaleString("ja-JP")}ウォン相当で「私たちはどんな関係？タロット」が開きました。${typeof balanceCredits === "number" ? ` 残りの月精石: ${Math.max(0, balanceCredits * 10).toLocaleString("ja-JP")}ウォン相当` : ""}`,
    authRequired: "ログインが必要です。ログイン後にもう一度お試しください。",
    insufficientCoins: (requiredCoins: number) => `決済可能な残高が不足しています。${Math.max(0, requiredCoins * 100).toLocaleString("ja-JP")}ウォンの決済が必要です。`,
    refunded: "リーディングが完了しなかったため、今回の決済は返金されました。",
    paymentUnconfirmed: "決済確認が完了していません。",
    readingError: "解釈の生成中にエラーが発生しました。",
    title: "私たちはどんな関係？恋愛タロット",
    home: "ホームへ",
    intro: "関係の流れを6枚スプレッドで確認する独立ページです。",
    preparing: "カードを準備中...",
    startDraw: "6枚カードを引く",
    spreadTitle: "関係スプレッド",
    revealCard: "クリックしてカードを開く",
    revealPrevious: "前のカードを先に開いてください",
    viewReading: "関係解釈を見る",
    revealProgress: "公開進行",
    resultTitle: "関係温度リーディング結果",
    currentTemperature: "🌙 関係の現在温度",
    sixCardFlow: "6枚の流れ:",
    firstToLast: "最初のカード → 最後のカード:",
    mismatchPoint: "🔍 心がすれ違う場所",
    projectionGap: "期待と感情の間隔:",
    relationshipFrame: "関係の速度基準:",
    nextChoice: "🧭 現実の流れと次の選択",
    blockToOutcome: "停滞と近い流れ:",
    sevenDayRhythm: "7日間のリズム:",
    positionReading: "🃏 ポジション別関係解釈",
    positionFallback: (index: number) => `ポジション ${index + 1}`,
    keywords: "核心キーワード:",
    coreSignal: "核心サイン:",
    relationshipReading: "関係解釈:",
    relationshipPsychology: "関係心理:",
    todayChoice: "今日の選択:",
    cautionFlow: "注意する流れ:",
    flowConnection: "流れのつながり:",
    choiceToKeep: "🧭 今守る選択",
    instantMission: "⚡ 今日残す一文:",
    conversationTip: "💬 会話の温度:",
    boundary: "🛡️ 守る境界線:",
    checklist: "✅ 実践チェックリスト:",
  },
  "zh-CN": {
    drawFailed: "抽卡失败。",
    invalidCards: "6 张卡数据不正确。",
    drawError: "抽卡过程中发生错误。",
    paymentReason: "我们是什么关系？塔罗解读",
    subscriptionIncluded: "已应用使用券权益，无需额外付款即可开启。",
    subscriptionReason: "我们是什么关系塔罗",
    paymentApproved: (chargedCoins: number, balanceAfter: number) =>
      `我们是什么关系？塔罗 ${Math.max(0, chargedCoins * 100).toLocaleString("zh-CN")} 韩元付款已批准。剩余韩元价值：${Math.max(0, balanceAfter * 100).toLocaleString("zh-CN")} 韩元`,
    stoneOpened: (spentCredits: number, balanceCredits: number | null) =>
      `已使用价值 ${Math.max(0, spentCredits * 10).toLocaleString("zh-CN")} 韩元的月精石开启“我们是什么关系？塔罗”。${typeof balanceCredits === "number" ? ` 剩余月精石：${Math.max(0, balanceCredits * 10).toLocaleString("zh-CN")} 韩元价值` : ""}`,
    authRequired: "需要登录。请登录后重试。",
    insufficientCoins: (requiredCoins: number) => `可用付款余额不足。需要 ${Math.max(0, requiredCoins * 100).toLocaleString("zh-CN")} 韩元。`,
    refunded: "解读未完成，本次付款已退款。",
    paymentUnconfirmed: "付款确认尚未完成。",
    readingError: "生成解读时发生错误。",
    title: "我们是什么关系？恋爱塔罗",
    home: "返回首页",
    intro: "用 6 张关系牌阵确认彼此流向的独立页面。",
    preparing: "正在准备卡牌...",
    startDraw: "开始抽 6 张牌",
    spreadTitle: "关系牌阵",
    revealCard: "点击揭开卡牌",
    revealPrevious: "请先揭开上一张卡牌",
    viewReading: "查看关系解读",
    revealProgress: "揭示进度",
    resultTitle: "关系温度解读结果",
    currentTemperature: "🌙 关系当前温度",
    sixCardFlow: "6 张牌流向:",
    firstToLast: "第一张牌 → 最后一张牌:",
    mismatchPoint: "🔍 内心错位之处",
    projectionGap: "期待与情绪的距离:",
    relationshipFrame: "关系节奏标准:",
    nextChoice: "🧭 现实流向与下一步选择",
    blockToOutcome: "阻滞与近期流向:",
    sevenDayRhythm: "7 天节奏:",
    positionReading: "🃏 按位置解读关系",
    positionFallback: (index: number) => `位置 ${index + 1}`,
    keywords: "核心关键词:",
    coreSignal: "核心信号:",
    relationshipReading: "关系解读:",
    relationshipPsychology: "关系心理:",
    todayChoice: "今天的选择:",
    cautionFlow: "需要留意的流向:",
    flowConnection: "流向连接:",
    choiceToKeep: "🧭 此刻要守住的选择",
    instantMission: "⚡ 今天留下的一句话:",
    conversationTip: "💬 对话温度:",
    boundary: "🛡️ 我要守住的边界:",
    checklist: "✅ 实用检查清单:",
  },
  "zh-TW": {
    drawFailed: "抽牌失敗。",
    invalidCards: "6 張牌資料不正確。",
    drawError: "抽牌過程中發生錯誤。",
    paymentReason: "我們是什麼關係？塔羅解讀",
    subscriptionIncluded: "已套用使用券權益，無需額外付款即可開啟。",
    subscriptionReason: "我們是什麼關係塔羅",
    paymentApproved: (chargedCoins: number, balanceAfter: number) =>
      `我們是什麼關係？塔羅 ${Math.max(0, chargedCoins * 100).toLocaleString("zh-TW")} 韓元付款已核准。剩餘韓元價值：${Math.max(0, balanceAfter * 100).toLocaleString("zh-TW")} 韓元`,
    stoneOpened: (spentCredits: number, balanceCredits: number | null) =>
      `已使用價值 ${Math.max(0, spentCredits * 10).toLocaleString("zh-TW")} 韓元的月精石開啟「我們是什麼關係？塔羅」。${typeof balanceCredits === "number" ? ` 剩餘月精石：${Math.max(0, balanceCredits * 10).toLocaleString("zh-TW")} 韓元價值` : ""}`,
    authRequired: "需要登入。請登入後再試。",
    insufficientCoins: (requiredCoins: number) => `可用付款餘額不足。需要 ${Math.max(0, requiredCoins * 100).toLocaleString("zh-TW")} 韓元。`,
    refunded: "解讀未完成，本次付款已退款。",
    paymentUnconfirmed: "付款確認尚未完成。",
    readingError: "生成解讀時發生錯誤。",
    title: "我們是什麼關係？戀愛塔羅",
    home: "返回首頁",
    intro: "用 6 張關係牌陣確認彼此流向的獨立頁面。",
    preparing: "正在準備卡牌...",
    startDraw: "開始抽 6 張牌",
    spreadTitle: "關係牌陣",
    revealCard: "點擊揭開牌牌",
    revealPrevious: "請先揭開上一張牌",
    viewReading: "查看關係解讀",
    revealProgress: "揭示進度",
    resultTitle: "關係溫度解讀結果",
    currentTemperature: "🌙 關係當前溫度",
    sixCardFlow: "6 張牌流向:",
    firstToLast: "第一張牌 → 最後一張牌:",
    mismatchPoint: "🔍 內心錯位之處",
    projectionGap: "期待與情緒的距離:",
    relationshipFrame: "關係節奏標準:",
    nextChoice: "🧭 現實流向與下一步選擇",
    blockToOutcome: "阻滯與近期流向:",
    sevenDayRhythm: "7 天節奏:",
    positionReading: "🃏 按位置解讀關係",
    positionFallback: (index: number) => `位置 ${index + 1}`,
    keywords: "核心關鍵詞:",
    coreSignal: "核心訊號:",
    relationshipReading: "關係解讀:",
    relationshipPsychology: "關係心理:",
    todayChoice: "今天的選擇:",
    cautionFlow: "需要留意的流向:",
    flowConnection: "流向連接:",
    choiceToKeep: "🧭 此刻要守住的選擇",
    instantMission: "⚡ 今天留下的一句話:",
    conversationTip: "💬 對話溫度:",
    boundary: "🛡️ 我要守住的界線:",
    checklist: "✅ 實用檢查清單:",
  },
};

const POSITION_LABELS: Record<string, string> = {
  self_view_of_other: "내가 바라보는 상대",
  other_view_of_relationship: "상대가 관계 전체를 보는 시각",
  other_feeling_toward_me: "상대가 나를 바라보는 마음",
  other_romantic_will: "상대의 연애 의지와 열망",
  core_block: "관계를 가로막는 핵심 요인",
  short_term_outcome: "앞으로 펼쳐질 단기적 결말",
  position_1: "내가 바라보는 상대",
  position_2: "상대가 관계 전체를 보는 시각",
  position_3: "상대가 나를 바라보는 마음",
  position_4: "상대의 연애 의지와 열망",
  position_5: "관계를 가로막는 핵심 요인",
  position_6: "앞으로 펼쳐질 단기적 결말",
};

function isPositionBreakdownItem(value: unknown): value is {
  positionTitle?: string;
  positionKey?: string;
  positionOrder?: number;
  cardName?: string;
  cardNameEn?: string;
  cardId?: string;
  suit?: string;
  rank?: string;
  isMajor?: boolean;
  isCourt?: boolean;
  orientation?: string;
  orientationLabel?: string;
  keywords?: string[];
  headline?: string;
  summary?: string;
  detail?: string;
  relationshipInsight?: string;
  advice?: string;
  caution?: string;
  rawCardMeaning?: string;
  orderConnection?: string;
  title?: string;
  card?: string;
} {
  if (!value || typeof value !== "object") return false;
  return "title" in value || "card" in value || "summary" in value || "positionTitle" in value || "cardName" in value;
}

function isFinalAdvice(value: unknown): value is {
  instantMission?: string;
  conversationTip?: string;
  relationshipBoundary?: string;
  nextSevenDays?: string;
  checklist?: string[];
} {
  if (!value || typeof value !== "object") return false;
  return "instantMission" in value || "conversationTip" in value || "relationshipBoundary" in value || "nextSevenDays" in value;
}

const TAROT_IMAGE_MAP: Record<string, string> = {
  M00:"thefool.webp",M01:"themagician.webp",M02:"thehighpriestess.webp",M03:"theempress.webp",
  M04:"theemperor.webp",M05:"thehierophant.webp",M06:"TheLovers.webp",M07:"thechariot.webp",
  M08:"thestrength.webp",M09:"thehermit.webp",M10:"wheeloffortune.webp",M11:"justice.webp",
  M12:"thehangedman.webp",M13:"death.webp",M14:"temperance.webp",M15:"thedevil.webp",
  M16:"thetower.webp",M17:"thestar.webp",M18:"themoon.webp",M19:"thesun.webp",
  M20:"judgement.webp",M21:"theworld.webp",
  W01:"aceofwands.webp",W02:"twoofwands.webp",W03:"threeofwands.webp",W04:"fourofwands.webp",
  W05:"fiveofwands.webp",W06:"sixofwands.webp",W07:"sevenofwands.webp",W08:"eightofwands.webp",
  W09:"nineofwands.webp",W10:"tenofwands.webp",W11:"pageofwands.webp",W12:"knightofwands.webp",
  W13:"queenofwands.webp",W14:"kingofwands.webp",
  C01:"aceofcups.webp",C02:"twoofcups.webp",C03:"threeofcups.webp",C04:"fourofcups.webp",
  C05:"fiveofcups.webp",C06:"sixofcups.webp",C07:"sevenofcups.webp",C08:"eightofcups.webp",
  C09:"nineofcups.webp",C10:"tenofcups.webp",C11:"pageofcups.webp",C12:"knightofcups.webp",
  C13:"queenofcups.webp",C14:"kingofcups.webp",
  S01:"aceofswords.webp",S02:"twoofswords.webp",S03:"threeofswords.webp",S04:"fourofswords.webp",
  S05:"fiveofswords.webp",S06:"sixofswords.webp",S07:"sevenofswords.webp",S08:"eightofswords.webp",
  S09:"nineofswords.webp",S10:"tenofswords.webp",S11:"pageofswords.webp",S12:"knightofswords.webp",
  S13:"queenofswords.webp",S14:"kingofswords.webp",
  P01:"aceofpentacles.webp",P02:"twoofpentacles.webp",P03:"threeofpentacles.webp",P04:"fourofpentacles.webp",
  P05:"fiveofpentacles.webp",P06:"sixofpentacles.webp",P07:"sevenofpentacles.webp",P08:"eightofpentacles.webp",
  P09:"nineofpentacles.webp",P10:"tenofpentacles.webp",P11:"pageofpentacles.webp",P12:"knightofpentacles.webp",
  P13:"queenofpentacles.webp",P14:"kingofpentacles.webp",
};

function cardImageUrl(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  const fn = TAROT_IMAGE_MAP[key];
  return fn ? `/tarot-cards/${fn}` : `/tarot-cards/thefool.webp`;
}

function safeCardName(card?: DrawnCard, idx?: number) {
  const title = (card?.nameKr || card?.name || "").trim();
  if (title) return title;
  return `카드 ${typeof idx === "number" ? idx + 1 : ""}`.trim();
}

export default function LoveRelationshipTarot() {
  const { ensurePaidAccess } = useCoinGate();
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingRaw, setReadingRaw] = useState<any>(null);
  // 결제 확인이 끝난 뒤 리딩 생성이 실패했을 때, 재시도에서 중복 과금을 막는 세션 플래그.
  const paidAccessGrantedRef = useRef(false);

  const canRead = cards.length === CARD_COUNT && revealedCount === CARD_COUNT && !loading;
  const copy = LOVE_RELATIONSHIP_TAROT_TEXT_TRANSLATIONS[locale] || LOVE_RELATIONSHIP_TAROT_TEXT_TRANSLATIONS.ko;

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  async function startDraw() {
    setLoading(true);
    setError("");
    setReadingRaw(null);
    setCards([]);
    setRevealedCount(0);
    try {
      const res = await fetch("/api/tarot/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadType: SPREAD_TYPE }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || copy.drawFailed);
      }
      const nextCards = Array.isArray(data?.cards) ? (data.cards as DrawnCard[]) : [];
      const sliced = nextCards.slice(0, CARD_COUNT);
      if (sliced.length !== CARD_COUNT) {
        throw new Error(copy.invalidCards);
      }
      setCards(sliced);
    } catch (e: any) {
      setError(e?.message || copy.drawError);
    } finally {
      setLoading(false);
    }
  }

  async function loadReading() {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const isAdminLikeUser = () => {
        if (typeof window === "undefined") return false;
        try {
          if (String(sessionStorage.getItem("flower_admin_password_ok") || "") !== "1") return false;
        } catch (_) {}
        try {
          const sTok = String(sessionStorage.getItem("flower_admin_token") || "");
          if (FLOWER_ADMIN_TOKEN_RE.test(sTok)) return true;
        } catch (_) {}
        try {
          const lTok = String(localStorage.getItem("flower_admin_token") || "");
          if (FLOWER_ADMIN_TOKEN_RE.test(lTok)) return true;
        } catch (_) {}
        return false;
      };

      const isFlowerAdminMode = isAdminLikeUser();

      const payloadCards = cards.map((c) => ({
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      }));

      const executeReading = async () => {
        // 서버는 42s 데드라인에 로컬 폴백으로라도 확정 응답을 준다. 연결이 끊겨 무한 대기(정적 스피너)로
        // 멈추지 않도록 55s(서버 42s + 여유)에 중단한다 — 중단돼도 paidAccessGrantedRef가 남아 재시도는 무과금.
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 55000);
        let res: Response;
        try {
          res = await fetch("/api/tarot/love-reading", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cards: payloadCards,
              locale,
            }),
            signal: controller.signal,
          });
        } catch (err: any) {
          if (err?.name === "AbortError") throw new Error(copy.readingError);
          throw err;
        } finally {
          window.clearTimeout(timeoutId);
        }
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.message || copy.readingError);
        }
        setReadingRaw(data?.reading ?? data);
      };

      if (isFlowerAdminMode) {
        await executeReading();
        return;
      }

      // 직전 제출에서 결제가 이미 확인된 재시도라면 게이트를 건너뛰고 리딩만 다시 생성한다(중복 과금 방지).
      if (paidAccessGrantedRef.current) {
        await executeReading();
        paidAccessGrantedRef.current = false;
        return;
      }

      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-love-relationship",
        cost: lookupServerCoinPrice("tarot-love-relationship"),
        reason: copy.paymentReason,
        requestId: `tarot-love-relationship:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        // 이용권/결제 확인 단계에서는 과금 안내만 처리한다 — LLM 생성은 게이트가 닫힌 뒤 진행.
        onPaid: ({ chargedCoins, accessSource, monthlyCreditsSpent, monthlyBalanceAfter, balanceAfter }) => {
          // 🔴 판정은 accessSource 로만 한다. chargedCoins 는 이용권·월정석·재열람 모두 0 이라
          // (useCoinGate 의 chargedCoins 계산) 이용권 여부를 가릴 수 없다.
          if (accessSource === "subscription") {
            showSubscriptionIncludedNotice({
              message: copy.subscriptionIncluded,
              reason: copy.subscriptionReason,
            });
            return;
          }
          if (accessSource === "moonlight_stone") {
            showToast(copy.stoneOpened(monthlyCreditsSpent, monthlyBalanceAfter), "info");
            return;
          }
          if (chargedCoins > 0) {
            showToast(copy.paymentApproved(chargedCoins, balanceAfter), "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError(copy.authRequired);
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") {
          setError(copy.insufficientCoins(paymentResult.requiredCoins));
          return;
        }
        if (paymentResult.code === "FEATURE_EXECUTION_FAILED" && paymentResult.refunded) {
          showToast(copy.refunded, "info");
        }
        if (!paymentResult.ok) {
          setError(String(paymentResult.message || copy.paymentUnconfirmed));
          return;
        }
      }

      // 게이트(이용권/결제 확인)가 닫힌 뒤에 리딩을 생성한다 — 실패 시 플래그가 남아 재시도는 무과금.
      paidAccessGrantedRef.current = true;
      await executeReading();
      paidAccessGrantedRef.current = false;
    } catch (e: any) {
      setError(e?.message || copy.readingError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-2xl border border-pink-500/30 bg-pink-950/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">{copy.title}</h1>
            <button
              type="button"
              onClick={() => hardNavigateToShellHome()}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
            >
              {copy.home}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {copy.intro}
          </p>
          <button
            type="button"
            onClick={startDraw}
            disabled={loading}
            className="mt-4 rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? copy.preparing : copy.startDraw}
          </button>
        </section>

        {cards.length > 0 ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
            <h2 className="mb-3 text-lg font-semibold">{copy.spreadTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card, idx) => {
                const isRevealed = idx < revealedCount;
                const canReveal = idx === revealedCount && revealedCount < CARD_COUNT;
                const posLabel = POSITION_LABELS[card.position || ""] || copy.positionFallback(idx);
                return (
                  <button
                    key={`${card.cardId}-${idx}`}
                    type="button"
                    onClick={() => canReveal && setRevealedCount((prev) => prev + 1)}
                    disabled={!canReveal}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left"
                  >
                    {isRevealed ? (
                      <>
                        <Image
                          src={cardImageUrl(card.cardId)}
                          alt={safeCardName(card, idx)}
                          fill
                          sizes="(max-width: 1024px) 45vw, 240px"
                          className="object-cover"
                        />
                        <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                          <div className="font-semibold">{safeCardName(card, idx)}</div>
                          <div className="opacity-90">{posLabel}</div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-300">
                        {canReveal ? copy.revealCard : copy.revealPrevious}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={loadReading}
                disabled={!canRead}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? copy.preparing : copy.viewReading}
              </button>
              <span className="text-xs text-slate-400">
                {copy.revealProgress}: {revealedCount}/{CARD_COUNT}
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</section>
        ) : null}

        {readingRaw ? (
          <section className="rounded-2xl border border-emerald-600/35 bg-emerald-950/20 p-5">
            <h2 className="mb-3 text-lg font-semibold">{copy.resultTitle}</h2>
            <div className="space-y-3 text-sm leading-7 text-slate-100">
              <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                <h3 className="mb-2 text-sm font-semibold text-emerald-300">{copy.currentTemperature}</h3>
                {readingRaw?.overallVibe ? <p className="text-sm text-slate-100">{String(readingRaw.overallVibe)}</p> : null}
                {readingRaw?.relationshipMatrix?.sequenceFlow ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>{copy.sixCardFlow}</strong> {String(readingRaw.relationshipMatrix.sequenceFlow)}</p>
                ) : null}
                {Array.isArray(readingRaw?.positionBreakdown) && readingRaw.positionBreakdown.length >= 2 ? (
                  <p className="mt-2 text-sm text-slate-100">
                    <strong>{copy.firstToLast}</strong> {String(readingRaw.positionBreakdown[0]?.cardName || "")} {String(readingRaw.positionBreakdown[0]?.orientationLabel || "")} → {String(readingRaw.positionBreakdown[readingRaw.positionBreakdown.length - 1]?.cardName || "")} {String(readingRaw.positionBreakdown[readingRaw.positionBreakdown.length - 1]?.orientationLabel || "")}
                  </p>
                ) : null}
              </article>

              <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                <h3 className="mb-2 text-sm font-semibold text-emerald-300">{copy.mismatchPoint}</h3>
                {readingRaw?.deepReading ? <p className="text-sm text-slate-100">{String(readingRaw.deepReading)}</p> : null}
                {readingRaw?.relationshipMatrix?.projectionGap ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>{copy.projectionGap}</strong> {String(readingRaw.relationshipMatrix.projectionGap)}</p>
                ) : null}
                {readingRaw?.relationshipMatrix?.relationshipFrame ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>{copy.relationshipFrame}</strong> {String(readingRaw.relationshipMatrix.relationshipFrame)}</p>
                ) : null}
              </article>

              <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                <h3 className="mb-2 text-sm font-semibold text-emerald-300">{copy.nextChoice}</h3>
                {readingRaw?.realityAndFuture ? <p className="text-sm text-slate-100">{String(readingRaw.realityAndFuture)}</p> : null}
                {readingRaw?.relationshipMatrix?.blockToOutcome ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>{copy.blockToOutcome}</strong> {String(readingRaw.relationshipMatrix.blockToOutcome)}</p>
                ) : null}
                {readingRaw?.finalAdvice?.nextSevenDays ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>{copy.sevenDayRhythm}</strong> {String(readingRaw.finalAdvice.nextSevenDays)}</p>
                ) : null}
              </article>

              {Array.isArray(readingRaw?.positionBreakdown) ? (
                <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-emerald-300">{copy.positionReading}</h3>
                  <div className="space-y-2">
                    {readingRaw.positionBreakdown.filter(isPositionBreakdownItem).map((row, idx) => (
                      <div key={`position-${idx}`} className="rounded-md border border-emerald-900/70 bg-slate-900/50 p-2">
                        <p className="text-xs font-semibold text-emerald-200">{row.positionOrder ? `${row.positionOrder}. ` : ""}{row.positionTitle || row.title || copy.positionFallback(idx)}</p>
                        <p className="text-xs text-slate-300">{(row.cardName || row.card || "") + (row.orientationLabel ? ` · ${row.orientationLabel}` : "")}</p>
                        {Array.isArray(row.keywords) && row.keywords.length ? (
                          <p className="mt-1 text-xs text-slate-300"><strong>{copy.keywords}</strong> {row.keywords.join(" · ")}</p>
                        ) : null}
                        {(row.headline || row.summary) ? <p className="mt-1 text-sm text-slate-100"><strong>{copy.coreSignal}</strong> {row.headline || row.summary}</p> : null}
                        {row.detail ? <p className="mt-1 text-sm text-slate-100"><strong>{copy.relationshipReading}</strong> {row.detail}</p> : null}
                        {row.relationshipInsight ? <p className="mt-1 text-sm text-slate-100"><strong>{copy.relationshipPsychology}</strong> {row.relationshipInsight}</p> : null}
                        {row.advice ? <p className="mt-1 text-sm text-slate-100"><strong>{copy.todayChoice}</strong> {row.advice}</p> : null}
                        {row.caution ? <p className="mt-1 text-sm text-slate-100"><strong>{copy.cautionFlow}</strong> {row.caution}</p> : null}
                        {row.orderConnection ? <p className="mt-1 text-sm text-slate-100"><strong>{copy.flowConnection}</strong> {row.orderConnection}</p> : null}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {isFinalAdvice(readingRaw?.finalAdvice) ? (
                <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-emerald-300">{copy.choiceToKeep}</h3>
                  <div className="space-y-2 text-sm text-slate-100">
                    {readingRaw.finalAdvice.instantMission ? <p><strong>{copy.instantMission}</strong> {readingRaw.finalAdvice.instantMission}</p> : null}
                    {readingRaw.finalAdvice.conversationTip ? <p><strong>{copy.conversationTip}</strong> {readingRaw.finalAdvice.conversationTip}</p> : null}
                    {readingRaw.finalAdvice.relationshipBoundary ? <p><strong>{copy.boundary}</strong> {readingRaw.finalAdvice.relationshipBoundary}</p> : null}
                    {readingRaw.finalAdvice.nextSevenDays ? <p><strong>{copy.sevenDayRhythm}</strong> {readingRaw.finalAdvice.nextSevenDays}</p> : null}
                    {Array.isArray(readingRaw.finalAdvice.checklist) && readingRaw.finalAdvice.checklist.length ? (
                      <div>
                        <p><strong>{copy.checklist}</strong></p>
                        <ul className="ml-4 list-disc">
                          {readingRaw.finalAdvice.checklist.map((line, idx) => (
                            <li key={`check-${idx}`}>{String(line)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

