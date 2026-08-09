"use client";

import { AnimatePresence, m } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { showToast } from "../../components/Toast";
import { getSubscriptionTierLabel, showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { useCoinGate } from "../../hooks/useCoinGate";
import { fetchPaymentEligibility } from "@/app/_lib/billing-client";
import { lookupServerCoinPrice } from "@/app/_lib/serviceCoinPrice";
import {
  buildLocalizedRecommendedQuestionsForSpread,
  DIFFICULTY_LABEL,
  findLocalizedSpreadById,
  getLocalizedPromptMakerData,
  getLocalizedSpreadLibrary,
  SPREAD_LIBRARY,
} from "./data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotCardOrientation, TarotSpread, TarotSpreadCategory } from "./types";
import { detectTarotCategory, recommendSpreads } from "./utils/classifyTarotQuestion";
import type { buildOraclePrompt as buildOraclePromptFn } from "./utils/buildOraclePrompt";

type Stage = "question" | "draw" | "prompt";
type OracleDeckMode = "tarot" | "lenormand";

type TarotCardSource = {
  code?: string;
  nameKo?: string;
  nameEn?: string;
  keywords?: string[];
  focus?: string;
};

type PromptResult = ReturnType<typeof buildOraclePromptFn>;

type BillingSnapshot = {
  requiredCoins: number;
  canAccess: boolean;
  freeBySubscription: boolean;
  canUseByPass: boolean;
  subscriptionTier: string;
  accessReason: string;
};

type OracleCardPick = {
  cardCode: string;
  cardNameKo: string;
  cardNameEn: string;
  keywords: string[];
  focus: string;
  image: string;
};

type PromptMakerFeedbackCopy = {
  free: string;
  oneTimePrice: string;
  lenormandFree: string;
  passAvailable: string;
  instantUse: string;
  paymentRequired: string;
  checking: string;
  disconnected: string;
  lenormandQuestionReady: string;
  lenormandQuestionEmpty: string;
  quickQuestionStatus: string;
  recommendedQuestionStatus: string;
  askQuestionFirst: string;
  spreadNeedAll: (count: number) => string;
  lenormandCompleteToast: string;
  subscriptionPromptComplete: string;
  subscriptionReason: string;
  passBenefit: string;
  passRemaining: (amount: string) => string;
  passOpened: (spent: string, balance: string) => string;
  paidApproved: (balance: string) => string;
  loginRequired: string;
  insufficientCoins: (amount: string) => string;
  priceNotFound: string;
  serverConfigError: string;
  refunded: string;
  paymentIncomplete: string;
  promptError: string;
  lenormandCopied: string;
  tarotCopied: string;
  copyFailed: string;
  cardSelectionIncomplete: string;
  lenormandRegenerated: string;
  tarotRegenerated: string;
  tuneAlready: string;
  tuneAdded: (label: string) => string;
  lenormandDefaultStatus: string;
  categoryDefaultStatus: string;
  copiedDone: string;
  copyPrompt: string;
  generating: string;
};

type QuestionQualityNoticeCopy = {
  empty: (categoryName: string) => string;
  tooShort: string;
  tooLong: string;
  addDirection: string;
  ready: string;
};

type PromptMakerUiCopy = {
  heroBadge: string;
  heroSteps: [string, string, string];
  questionTitle: { tarot: string; lenormand: string };
  questionDescription: { tarot: string; lenormand: string };
  categoryTitle: string;
  autoDetected: (categoryName: string) => string;
  autoDetectButton: string;
  selectedSpread: string;
  cardCount: (count: number) => string;
  consultationCategory: (categoryName: string) => string;
  changeSpread: string;
  recommendedQuestions: string;
  applyFirstQuestion: string;
  lenormandFreeTitle: string;
  lenormandFreeDescription: string;
  defaultQuestionButton: { tarot: string; lenormand: string };
  completeSuffix: string;
  includeReversed: string;
  backToQuestion: string;
  resetStart: string;
  otherSpread: string;
  spreadBoardHint: string;
  combinationReading: string;
  positionMeaning: string;
  drawCard: { tarot: string; lenormand: string };
  fullDeck: { open: string; close: string };
  selectedCards: string;
  lenormandLabel: string;
  changeDirection: string;
  notSelected: string;
  promptMap: { tarot: string; lenormand: string };
  oracleMap: string;
  outputTitle: { tarot: string; lenormand: string };
  tune: {
    consultLabel: string;
    consultInstruction: string;
    practicalLabel: string;
    practicalInstruction: string;
    warmLabel: string;
    warmInstruction: string;
  };
  regenerateSameCards: string;
  redrawCards: string;
  chooseAnotherSpread: string;
  restartFromBeginning: string;
  guideArticles: Array<{ title: string; paragraphs: string[] }>;
  spreadLibraryTitle: string;
  close: string;
  spreadSearchPlaceholder: string;
  recommendedTheme: (categoryName: string) => string;
  countAll: string;
  recommendedBadge: string;
  noSpreads: string;
  subscriptionPassLabel: (tier: string) => string;
  currency: (amount: number) => string;
  creditValue: (amount: number) => string;
};

type CardFlowCopy = {
  orientation: Record<TarotCardOrientation, string>;
  waiting: string[];
  flow: (first: string, firstOrientation: string, middle: string, middleOrientation: string, lastPosition: string, last: string, uprightCount: number, reversedCount: number) => string[];
};

const PROMPT_MAKER_FEEDBACK_COPY: Record<LoadingLocale, PromptMakerFeedbackCopy> = {
  ko: {
    free: "무료",
    oneTimePrice: "1회 5,000원",
    lenormandFree: "레노먼드 무료",
    passAvailable: "이용권 적용 가능",
    instantUse: "즉시 이용",
    paymentRequired: "결제 필요",
    checking: "확인 중",
    disconnected: "미연동",
    lenormandQuestionReady: "질문 흐름이 잡혔습니다. 6장 레노먼드 카드로 반복 신호와 행동 단서를 엮습니다.",
    lenormandQuestionEmpty: "지금 보고 싶은 상황이나 질문을 한 문장으로 적어주세요.",
    quickQuestionStatus: "빠른 질문으로 상담 초점을 잡았습니다.",
    recommendedQuestionStatus: "추천 질문으로 상담 초점을 다듬었습니다.",
    askQuestionFirst: "질문을 먼저 입력해 주세요. 짧아도 괜찮아요.",
    spreadNeedAll: (count) => `이 스프레드는 ${count}장을 모두 뽑아야 합니다.`,
    lenormandCompleteToast: "무료 레노먼드 프롬프트가 완성되었습니다.",
    subscriptionPromptComplete: "이용권 혜택이 적용되어 타로 프롬프트 라이브러리가 열렸습니다. 달빛의 흐름 안에서 AI 오라클 프롬프트가 완성되었습니다.",
    subscriptionReason: "타로 프롬프트 라이브러리",
    passBenefit: "보유 이용권 혜택",
    passRemaining: (amount) => ` 남은 이용권 혜택: ${amount}`,
    passOpened: (spent, balance) => `이용권 혜택 ${spent}으로 타로 프롬프트 라이브러리가 열렸습니다.${balance}`,
    paidApproved: (balance) => `타로 프롬프트 라이브러리 이용이 승인되었습니다. 잔여 원화 가치: ${balance}`,
    loginRequired: "로그인이 필요합니다.",
    insufficientCoins: (amount) => `결제 가능 금액이 부족합니다. ${amount} 결제가 필요합니다.`,
    priceNotFound: "서비스 이용 조건을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    serverConfigError: "결제 확인이 잠시 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    refunded: "AI 오라클 프롬프트가 완성되지 않아 이번 결제가 환불되었습니다.",
    paymentIncomplete: "결제 확인이 완료되지 않았습니다.",
    promptError: "AI 오라클 프롬프트를 엮는 중 문제가 발생했습니다.",
    lenormandCopied: "레노먼드 프롬프트가 복사되었습니다.",
    tarotCopied: "AI 오라클 프롬프트가 복사되었습니다.",
    copyFailed: "클립보드 복사에 실패했습니다.",
    cardSelectionIncomplete: "카드 선택이 완료된 뒤 다시 생성할 수 있습니다.",
    lenormandRegenerated: "같은 레노먼드 카드 조합으로 프롬프트를 다시 정리했습니다.",
    tarotRegenerated: "같은 카드 조합으로 AI 오라클 프롬프트를 다시 정리했습니다.",
    tuneAlready: "이미 반영된 조율입니다.",
    tuneAdded: (label) => `${label} 조율 문장을 더했습니다.`,
    lenormandDefaultStatus: "레노먼드 기본 질문으로 흐름을 맞췄습니다.",
    categoryDefaultStatus: "카테고리 기본 질문으로 상담 방향을 맞췄습니다.",
    copiedDone: "✓ 복사 완료",
    copyPrompt: "📋 프롬프트 복사",
    generating: "✦ 프롬프트 조율 중...",
  },
  en: {
    free: "Free",
    oneTimePrice: "One use KRW 5,000",
    lenormandFree: "Lenormand free",
    passAvailable: "Pass available",
    instantUse: "Ready now",
    paymentRequired: "Payment required",
    checking: "Checking",
    disconnected: "Not connected",
    lenormandQuestionReady: "The question flow is set. Six Lenormand cards will weave repeated signs and action clues.",
    lenormandQuestionEmpty: "Write the situation or question you want to examine in one sentence.",
    quickQuestionStatus: "A quick question set the consultation focus.",
    recommendedQuestionStatus: "The recommended question refined the consultation focus.",
    askQuestionFirst: "Please enter a question first. A short one is fine.",
    spreadNeedAll: (count) => `This spread needs all ${count} cards drawn.`,
    lenormandCompleteToast: "Your free Lenormand prompt is ready.",
    subscriptionPromptComplete: "Your pass benefit opened the Tarot Prompt Library. The AI oracle prompt is complete in the moonlit flow.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "available pass benefit",
    passRemaining: (amount) => ` Remaining pass benefit: ${amount}`,
    passOpened: (spent, balance) => `The Tarot Prompt Library opened with ${spent}.${balance}`,
    paidApproved: (balance) => `Tarot Prompt Library access was approved. Remaining KRW value: ${balance}`,
    loginRequired: "Login is required.",
    insufficientCoins: (amount) => `Your available balance is not enough. ${amount} is required.`,
    priceNotFound: "Could not confirm the service terms. Please try again shortly.",
    serverConfigError: "Payment confirmation is delayed. Please try again shortly.",
    refunded: "This payment was refunded because the AI oracle prompt was not completed.",
    paymentIncomplete: "Payment confirmation was not completed.",
    promptError: "A problem occurred while weaving the AI oracle prompt.",
    lenormandCopied: "Lenormand prompt copied.",
    tarotCopied: "AI oracle prompt copied.",
    copyFailed: "Could not copy to clipboard.",
    cardSelectionIncomplete: "You can regenerate after card selection is complete.",
    lenormandRegenerated: "The prompt was reorganized with the same Lenormand card combination.",
    tarotRegenerated: "The AI oracle prompt was reorganized with the same card combination.",
    tuneAlready: "This tuning has already been applied.",
    tuneAdded: (label) => `${label} tuning was added.`,
    lenormandDefaultStatus: "The Lenormand default question set the flow.",
    categoryDefaultStatus: "The category default question set the consultation direction.",
    copiedDone: "✓ Copied",
    copyPrompt: "📋 Copy prompt",
    generating: "✦ Tuning the prompt...",
  },
  ja: {
    free: "無料",
    oneTimePrice: "1回 5,000ウォン",
    lenormandFree: "ルノルマン無料",
    passAvailable: "利用券を適用できます",
    instantUse: "すぐ利用可能",
    paymentRequired: "決済が必要です",
    checking: "確認中",
    disconnected: "未連携",
    lenormandQuestionReady: "質問の流れが整いました。6枚のルノルマンカードで、繰り返すサインと行動の手がかりを結びます。",
    lenormandQuestionEmpty: "今見たい状況や質問を一文で入力してください。",
    quickQuestionStatus: "クイック質問で相談の焦点を整えました。",
    recommendedQuestionStatus: "おすすめ質問で相談の焦点を磨きました。",
    askQuestionFirst: "先に質問を入力してください。短くても大丈夫です。",
    spreadNeedAll: (count) => `このスプレッドは${count}枚すべてを引く必要があります。`,
    lenormandCompleteToast: "無料ルノルマンプロンプトが完成しました。",
    subscriptionPromptComplete: "利用券特典が適用され、タロットプロンプトライブラリが開きました。月明かりの流れの中でAIオラクルプロンプトが完成しました。",
    subscriptionReason: "タロットプロンプトライブラリ",
    passBenefit: "保有中の利用券特典",
    passRemaining: (amount) => ` 残り利用券特典: ${amount}`,
    passOpened: (spent, balance) => `利用券特典 ${spent} でタロットプロンプトライブラリが開きました。${balance}`,
    paidApproved: (balance) => `タロットプロンプトライブラリの利用が承認されました。残りウォン価値: ${balance}`,
    loginRequired: "ログインが必要です。",
    insufficientCoins: (amount) => `決済可能な残高が不足しています。${amount} の決済が必要です。`,
    priceNotFound: "サービス利用条件を確認できませんでした。しばらくしてからもう一度お試しください。",
    serverConfigError: "決済確認が一時的に遅れています。しばらくしてからもう一度お試しください。",
    refunded: "AIオラクルプロンプトが完成しなかったため、今回の決済は返金されました。",
    paymentIncomplete: "決済確認が完了しませんでした。",
    promptError: "AIオラクルプロンプトを編む途中で問題が発生しました。",
    lenormandCopied: "ルノルマンプロンプトをコピーしました。",
    tarotCopied: "AIオラクルプロンプトをコピーしました。",
    copyFailed: "クリップボードへのコピーに失敗しました。",
    cardSelectionIncomplete: "カード選択が完了してから再生成できます。",
    lenormandRegenerated: "同じルノルマンカードの組み合わせでプロンプトを整え直しました。",
    tarotRegenerated: "同じカードの組み合わせでAIオラクルプロンプトを整え直しました。",
    tuneAlready: "この調整はすでに反映されています。",
    tuneAdded: (label) => `${label}の調整文を追加しました。`,
    lenormandDefaultStatus: "ルノルマン基本質問で流れを整えました。",
    categoryDefaultStatus: "カテゴリ基本質問で相談の方向を整えました。",
    copiedDone: "✓ コピー完了",
    copyPrompt: "📋 プロンプトをコピー",
    generating: "✦ プロンプトを調整中...",
  },
  "zh-CN": {
    free: "免费",
    oneTimePrice: "单次 5,000韩元",
    lenormandFree: "雷诺曼免费",
    passAvailable: "可使用通行权益",
    instantUse: "可立即使用",
    paymentRequired: "需要支付",
    checking: "确认中",
    disconnected: "未连接",
    lenormandQuestionReady: "问题流向已成形。6张雷诺曼牌将整理重复信号与行动线索。",
    lenormandQuestionEmpty: "请用一句话写下想查看的状况或问题。",
    quickQuestionStatus: "已用快捷问题确定咨询焦点。",
    recommendedQuestionStatus: "已用推荐问题细化咨询焦点。",
    askQuestionFirst: "请先输入问题。简短也可以。",
    spreadNeedAll: (count) => `这个牌阵需要抽满 ${count} 张牌。`,
    lenormandCompleteToast: "免费雷诺曼提示词已完成。",
    subscriptionPromptComplete: "已应用通行权益并开启塔罗提示词库。AI神谕提示词已在月光流动中完成。",
    subscriptionReason: "塔罗提示词库",
    passBenefit: "持有的通行权益",
    passRemaining: (amount) => ` 剩余通行权益：${amount}`,
    passOpened: (spent, balance) => `已使用通行权益 ${spent} 开启塔罗提示词库。${balance}`,
    paidApproved: (balance) => `塔罗提示词库使用已通过。剩余韩元价值：${balance}`,
    loginRequired: "需要登录。",
    insufficientCoins: (amount) => `可支付余额不足。需要支付 ${amount}。`,
    priceNotFound: "未能确认服务使用条件。请稍后再试。",
    serverConfigError: "支付确认暂时延迟。请稍后再试。",
    refunded: "AI神谕提示词未完成，本次支付已退款。",
    paymentIncomplete: "支付确认未完成。",
    promptError: "编织AI神谕提示词时出现问题。",
    lenormandCopied: "雷诺曼提示词已复制。",
    tarotCopied: "AI神谕提示词已复制。",
    copyFailed: "复制到剪贴板失败。",
    cardSelectionIncomplete: "卡牌选择完成后才能重新生成。",
    lenormandRegenerated: "已用同一组雷诺曼牌重新整理提示词。",
    tarotRegenerated: "已用同一组牌重新整理AI神谕提示词。",
    tuneAlready: "该调整已应用。",
    tuneAdded: (label) => `已添加${label}调整句。`,
    lenormandDefaultStatus: "已用雷诺曼默认问题调整流向。",
    categoryDefaultStatus: "已用分类默认问题调整咨询方向。",
    copiedDone: "✓ 已复制",
    copyPrompt: "📋 复制提示词",
    generating: "✦ 正在调整提示词...",
  },
  "zh-TW": {
    free: "免費",
    oneTimePrice: "單次 5,000韓元",
    lenormandFree: "雷諾曼免費",
    passAvailable: "可使用通行權益",
    instantUse: "可立即使用",
    paymentRequired: "需要付款",
    checking: "確認中",
    disconnected: "未連接",
    lenormandQuestionReady: "問題流向已成形。6張雷諾曼牌將整理重複訊號與行動線索。",
    lenormandQuestionEmpty: "請用一句話寫下想查看的狀況或問題。",
    quickQuestionStatus: "已用快捷問題確定諮詢焦點。",
    recommendedQuestionStatus: "已用推薦問題細化諮詢焦點。",
    askQuestionFirst: "請先輸入問題。簡短也可以。",
    spreadNeedAll: (count) => `這個牌陣需要抽滿 ${count} 張牌。`,
    lenormandCompleteToast: "免費雷諾曼提示詞已完成。",
    subscriptionPromptComplete: "已套用通行權益並開啟塔羅提示詞庫。AI神諭提示詞已在月光流動中完成。",
    subscriptionReason: "塔羅提示詞庫",
    passBenefit: "持有的通行權益",
    passRemaining: (amount) => ` 剩餘通行權益：${amount}`,
    passOpened: (spent, balance) => `已使用通行權益 ${spent} 開啟塔羅提示詞庫。${balance}`,
    paidApproved: (balance) => `塔羅提示詞庫使用已通過。剩餘韓元價值：${balance}`,
    loginRequired: "需要登入。",
    insufficientCoins: (amount) => `可付款餘額不足。需要支付 ${amount}。`,
    priceNotFound: "未能確認服務使用條件。請稍後再試。",
    serverConfigError: "付款確認暫時延遲。請稍後再試。",
    refunded: "AI神諭提示詞未完成，本次付款已退款。",
    paymentIncomplete: "付款確認未完成。",
    promptError: "編織AI神諭提示詞時出現問題。",
    lenormandCopied: "雷諾曼提示詞已複製。",
    tarotCopied: "AI神諭提示詞已複製。",
    copyFailed: "複製到剪貼簿失敗。",
    cardSelectionIncomplete: "卡牌選擇完成後才能重新生成。",
    lenormandRegenerated: "已用同一組雷諾曼牌重新整理提示詞。",
    tarotRegenerated: "已用同一組牌重新整理AI神諭提示詞。",
    tuneAlready: "該調整已套用。",
    tuneAdded: (label) => `已加入${label}調整句。`,
    lenormandDefaultStatus: "已用雷諾曼預設問題調整流向。",
    categoryDefaultStatus: "已用分類預設問題調整諮詢方向。",
    copiedDone: "✓ 已複製",
    copyPrompt: "📋 複製提示詞",
    generating: "✦ 正在調整提示詞...",
  },
  vi: {
    free: "Miễn phí",
    oneTimePrice: "Một lần 5.000 KRW",
    lenormandFree: "Lenormand miễn phí",
    passAvailable: "Có thể dùng quyền lợi",
    instantUse: "Dùng ngay",
    paymentRequired: "Cần thanh toán",
    checking: "Đang kiểm tra",
    disconnected: "Chưa kết nối",
    lenormandQuestionReady: "Dòng câu hỏi đã rõ. 6 lá Lenormand sẽ kết lại tín hiệu lặp lại và manh mối hành động.",
    lenormandQuestionEmpty: "Hãy viết tình huống hoặc câu hỏi bạn muốn xem trong một câu.",
    quickQuestionStatus: "Câu hỏi nhanh đã đặt trọng tâm tư vấn.",
    recommendedQuestionStatus: "Câu hỏi gợi ý đã tinh chỉnh trọng tâm tư vấn.",
    askQuestionFirst: "Vui lòng nhập câu hỏi trước. Ngắn cũng được.",
    spreadNeedAll: (count) => `Trải bài này cần rút đủ ${count} lá.`,
    lenormandCompleteToast: "Prompt Lenormand miễn phí đã hoàn tất.",
    subscriptionPromptComplete: "Quyền lợi đã được áp dụng và Tarot Prompt Library đã mở. Prompt AI oracle đã hoàn tất trong dòng trăng.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "quyền lợi hiện có",
    passRemaining: (amount) => ` Quyền lợi còn lại: ${amount}`,
    passOpened: (spent, balance) => `Tarot Prompt Library đã mở bằng quyền lợi ${spent}.${balance}`,
    paidApproved: (balance) => `Quyền dùng Tarot Prompt Library đã được duyệt. Giá trị KRW còn lại: ${balance}`,
    loginRequired: "Cần đăng nhập.",
    insufficientCoins: (amount) => `Số dư khả dụng không đủ. Cần thanh toán ${amount}.`,
    priceNotFound: "Không thể xác nhận điều kiện sử dụng dịch vụ. Vui lòng thử lại sau.",
    serverConfigError: "Xác nhận thanh toán đang bị chậm. Vui lòng thử lại sau.",
    refunded: "Thanh toán lần này đã được hoàn vì prompt AI oracle chưa hoàn tất.",
    paymentIncomplete: "Xác nhận thanh toán chưa hoàn tất.",
    promptError: "Đã xảy ra lỗi khi kết prompt AI oracle.",
    lenormandCopied: "Đã sao chép prompt Lenormand.",
    tarotCopied: "Đã sao chép prompt AI oracle.",
    copyFailed: "Không thể sao chép vào clipboard.",
    cardSelectionIncomplete: "Bạn có thể tạo lại sau khi chọn đủ lá.",
    lenormandRegenerated: "Prompt đã được sắp lại với cùng tổ hợp Lenormand.",
    tarotRegenerated: "Prompt AI oracle đã được sắp lại với cùng tổ hợp lá.",
    tuneAlready: "Điều chỉnh này đã được áp dụng.",
    tuneAdded: (label) => `Đã thêm câu điều chỉnh ${label}.`,
    lenormandDefaultStatus: "Câu hỏi Lenormand mặc định đã chỉnh dòng chảy.",
    categoryDefaultStatus: "Câu hỏi mặc định theo danh mục đã chỉnh hướng tư vấn.",
    copiedDone: "✓ Đã sao chép",
    copyPrompt: "📋 Sao chép prompt",
    generating: "✦ Đang tinh chỉnh prompt...",
  },
  hi: {
    free: "मुफ्त",
    oneTimePrice: "एक बार KRW 5,000",
    lenormandFree: "Lenormand मुफ्त",
    passAvailable: "Pass लागू हो सकता है",
    instantUse: "अभी उपयोग करें",
    paymentRequired: "भुगतान आवश्यक",
    checking: "जाँच हो रही है",
    disconnected: "कनेक्ट नहीं",
    lenormandQuestionReady: "Question flow तैयार है. 6 Lenormand cards repeated signs और action clues को जोड़ेंगे.",
    lenormandQuestionEmpty: "जिस स्थिति या प्रश्न को देखना है, उसे एक वाक्य में लिखें.",
    quickQuestionStatus: "Quick question ने consultation focus सेट किया.",
    recommendedQuestionStatus: "Recommended question ने consultation focus को refined किया.",
    askQuestionFirst: "कृपया पहले प्रश्न लिखें. छोटा प्रश्न भी ठीक है.",
    spreadNeedAll: (count) => `इस spread में सभी ${count} cards खींचने होंगे.`,
    lenormandCompleteToast: "Free Lenormand prompt तैयार है.",
    subscriptionPromptComplete: "Pass benefit लागू हुआ और Tarot Prompt Library खुल गई. AI oracle prompt moonlit flow में पूरा हुआ.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "available pass benefit",
    passRemaining: (amount) => ` Remaining pass benefit: ${amount}`,
    passOpened: (spent, balance) => `Tarot Prompt Library ${spent} pass benefit से खुल गई.${balance}`,
    paidApproved: (balance) => `Tarot Prompt Library access approved. Remaining KRW value: ${balance}`,
    loginRequired: "Login आवश्यक है.",
    insufficientCoins: (amount) => `Available balance कम है. ${amount} required है.`,
    priceNotFound: "Service terms confirm नहीं हो सके. थोड़ी देर बाद फिर कोशिश करें.",
    serverConfigError: "Payment confirmation थोड़ी देर से हो रही है. कृपया फिर कोशिश करें.",
    refunded: "AI oracle prompt पूरा नहीं हुआ, इसलिए यह payment refund कर दिया गया.",
    paymentIncomplete: "Payment confirmation पूरा नहीं हुआ.",
    promptError: "AI oracle prompt बनाते समय समस्या हुई.",
    lenormandCopied: "Lenormand prompt copy हो गया.",
    tarotCopied: "AI oracle prompt copy हो गया.",
    copyFailed: "Clipboard पर copy नहीं हो सका.",
    cardSelectionIncomplete: "Cards selection पूरी होने के बाद regenerate कर सकते हैं.",
    lenormandRegenerated: "Same Lenormand card combination से prompt फिर व्यवस्थित हुआ.",
    tarotRegenerated: "Same card combination से AI oracle prompt फिर व्यवस्थित हुआ.",
    tuneAlready: "यह tuning पहले ही लागू है.",
    tuneAdded: (label) => `${label} tuning जोड़ी गई.`,
    lenormandDefaultStatus: "Lenormand default question ने flow सेट किया.",
    categoryDefaultStatus: "Category default question ने consultation direction सेट की.",
    copiedDone: "✓ Copied",
    copyPrompt: "📋 Copy prompt",
    generating: "✦ Prompt tuning...",
  },
  es: {
    free: "Gratis",
    oneTimePrice: "Una vez 5.000 KRW",
    lenormandFree: "Lenormand gratis",
    passAvailable: "Pase disponible",
    instantUse: "Uso inmediato",
    paymentRequired: "Pago requerido",
    checking: "Comprobando",
    disconnected: "Sin conexión",
    lenormandQuestionReady: "El flujo de la pregunta está listo. Seis cartas Lenormand unirán señales repetidas y pistas de acción.",
    lenormandQuestionEmpty: "Escribe en una frase la situación o pregunta que quieres mirar.",
    quickQuestionStatus: "La pregunta rápida fijó el foco de consulta.",
    recommendedQuestionStatus: "La pregunta recomendada afinó el foco de consulta.",
    askQuestionFirst: "Primero escribe una pregunta. Puede ser breve.",
    spreadNeedAll: (count) => `Esta tirada necesita sacar las ${count} cartas.`,
    lenormandCompleteToast: "El prompt Lenormand gratis está listo.",
    subscriptionPromptComplete: "Se aplicó tu pase y se abrió Tarot Prompt Library. El prompt de oráculo AI está completo bajo la luz lunar.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "beneficio disponible del pase",
    passRemaining: (amount) => ` Beneficio restante: ${amount}`,
    passOpened: (spent, balance) => `Tarot Prompt Library se abrió con ${spent}.${balance}`,
    paidApproved: (balance) => `Acceso aprobado a Tarot Prompt Library. Valor KRW restante: ${balance}`,
    loginRequired: "Debes iniciar sesión.",
    insufficientCoins: (amount) => `Tu saldo disponible no alcanza. Se requiere ${amount}.`,
    priceNotFound: "No se pudieron confirmar las condiciones del servicio. Inténtalo en un momento.",
    serverConfigError: "La confirmación del pago está retrasada. Inténtalo en un momento.",
    refunded: "Este pago fue reembolsado porque el prompt de oráculo AI no se completó.",
    paymentIncomplete: "La confirmación del pago no se completó.",
    promptError: "Ocurrió un problema al tejer el prompt de oráculo AI.",
    lenormandCopied: "Prompt Lenormand copiado.",
    tarotCopied: "Prompt de oráculo AI copiado.",
    copyFailed: "No se pudo copiar al portapapeles.",
    cardSelectionIncomplete: "Puedes regenerar después de completar la selección de cartas.",
    lenormandRegenerated: "El prompt se reorganizó con la misma combinación Lenormand.",
    tarotRegenerated: "El prompt de oráculo AI se reorganizó con la misma combinación de cartas.",
    tuneAlready: "Este ajuste ya fue aplicado.",
    tuneAdded: (label) => `Se agregó el ajuste ${label}.`,
    lenormandDefaultStatus: "La pregunta Lenormand predeterminada ajustó el flujo.",
    categoryDefaultStatus: "La pregunta predeterminada de categoría ajustó la dirección.",
    copiedDone: "✓ Copiado",
    copyPrompt: "📋 Copiar prompt",
    generating: "✦ Ajustando prompt...",
  },
  fr: {
    free: "Gratuit",
    oneTimePrice: "Une fois 5 000 KRW",
    lenormandFree: "Lenormand gratuit",
    passAvailable: "Pass disponible",
    instantUse: "Utilisable maintenant",
    paymentRequired: "Paiement requis",
    checking: "Vérification",
    disconnected: "Non connecté",
    lenormandQuestionReady: "Le flux de la question est prêt. Six cartes Lenormand relieront les signes répétés et les pistes d'action.",
    lenormandQuestionEmpty: "Écrivez en une phrase la situation ou la question à observer.",
    quickQuestionStatus: "La question rapide a fixé le focus de consultation.",
    recommendedQuestionStatus: "La question recommandée a affiné le focus de consultation.",
    askQuestionFirst: "Veuillez d'abord saisir une question. Elle peut être courte.",
    spreadNeedAll: (count) => `Ce tirage demande de tirer les ${count} cartes.`,
    lenormandCompleteToast: "Le prompt Lenormand gratuit est prêt.",
    subscriptionPromptComplete: "Votre pass a ouvert Tarot Prompt Library. Le prompt d'oracle IA est complet dans le flux lunaire.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "avantage de pass disponible",
    passRemaining: (amount) => ` Avantage restant: ${amount}`,
    passOpened: (spent, balance) => `Tarot Prompt Library s'est ouvert avec ${spent}.${balance}`,
    paidApproved: (balance) => `Accès approuvé à Tarot Prompt Library. Valeur KRW restante: ${balance}`,
    loginRequired: "Connexion requise.",
    insufficientCoins: (amount) => `Votre solde disponible est insuffisant. ${amount} est requis.`,
    priceNotFound: "Impossible de confirmer les conditions du service. Réessayez dans un instant.",
    serverConfigError: "La confirmation du paiement est retardée. Réessayez dans un instant.",
    refunded: "Ce paiement a été remboursé car le prompt d'oracle IA n'a pas été terminé.",
    paymentIncomplete: "La confirmation du paiement n'est pas terminée.",
    promptError: "Un problème est survenu pendant la création du prompt d'oracle IA.",
    lenormandCopied: "Prompt Lenormand copié.",
    tarotCopied: "Prompt d'oracle IA copié.",
    copyFailed: "Impossible de copier dans le presse-papiers.",
    cardSelectionIncomplete: "Vous pouvez régénérer après avoir terminé la sélection des cartes.",
    lenormandRegenerated: "Le prompt a été réorganisé avec la même combinaison Lenormand.",
    tarotRegenerated: "Le prompt d'oracle IA a été réorganisé avec la même combinaison de cartes.",
    tuneAlready: "Cet ajustement est déjà appliqué.",
    tuneAdded: (label) => `Ajustement ${label} ajouté.`,
    lenormandDefaultStatus: "La question Lenormand par défaut a réglé le flux.",
    categoryDefaultStatus: "La question par défaut de catégorie a réglé la direction.",
    copiedDone: "✓ Copié",
    copyPrompt: "📋 Copier le prompt",
    generating: "✦ Ajustement du prompt...",
  },
  de: {
    free: "Kostenlos",
    oneTimePrice: "Einmal 5.000 KRW",
    lenormandFree: "Lenormand kostenlos",
    passAvailable: "Pass verfügbar",
    instantUse: "Sofort nutzbar",
    paymentRequired: "Zahlung erforderlich",
    checking: "Prüfung",
    disconnected: "Nicht verbunden",
    lenormandQuestionReady: "Der Fragenfluss steht. Sechs Lenormandkarten verbinden wiederkehrende Zeichen und Handlungshinweise.",
    lenormandQuestionEmpty: "Schreibe die Situation oder Frage in einem Satz auf.",
    quickQuestionStatus: "Die Schnellfrage hat den Beratungsfokus gesetzt.",
    recommendedQuestionStatus: "Die empfohlene Frage hat den Beratungsfokus verfeinert.",
    askQuestionFirst: "Bitte gib zuerst eine Frage ein. Kurz ist in Ordnung.",
    spreadNeedAll: (count) => `Für diese Legung müssen alle ${count} Karten gezogen werden.`,
    lenormandCompleteToast: "Der kostenlose Lenormand-Prompt ist fertig.",
    subscriptionPromptComplete: "Dein Passvorteil hat die Tarot Prompt Library geöffnet. Der KI-Orakel-Prompt ist im Mondlichtfluss fertig.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "verfügbarer Passvorteil",
    passRemaining: (amount) => ` Verbleibender Passvorteil: ${amount}`,
    passOpened: (spent, balance) => `Die Tarot Prompt Library wurde mit ${spent} geöffnet.${balance}`,
    paidApproved: (balance) => `Zugang zur Tarot Prompt Library genehmigt. Verbleibender KRW-Wert: ${balance}`,
    loginRequired: "Login erforderlich.",
    insufficientCoins: (amount) => `Dein verfügbares Guthaben reicht nicht aus. ${amount} ist erforderlich.`,
    priceNotFound: "Die Nutzungsbedingungen konnten nicht bestätigt werden. Bitte versuche es gleich erneut.",
    serverConfigError: "Die Zahlungsbestätigung verzögert sich. Bitte versuche es gleich erneut.",
    refunded: "Diese Zahlung wurde erstattet, weil der KI-Orakel-Prompt nicht fertiggestellt wurde.",
    paymentIncomplete: "Die Zahlungsbestätigung wurde nicht abgeschlossen.",
    promptError: "Beim Erstellen des KI-Orakel-Prompts ist ein Problem aufgetreten.",
    lenormandCopied: "Lenormand-Prompt kopiert.",
    tarotCopied: "KI-Orakel-Prompt kopiert.",
    copyFailed: "Kopieren in die Zwischenablage fehlgeschlagen.",
    cardSelectionIncomplete: "Du kannst neu generieren, nachdem die Kartenauswahl abgeschlossen ist.",
    lenormandRegenerated: "Der Prompt wurde mit derselben Lenormand-Kartenkombination neu geordnet.",
    tarotRegenerated: "Der KI-Orakel-Prompt wurde mit derselben Kartenkombination neu geordnet.",
    tuneAlready: "Diese Anpassung wurde bereits angewendet.",
    tuneAdded: (label) => `${label}-Anpassung hinzugefügt.`,
    lenormandDefaultStatus: "Die Lenormand-Standardfrage hat den Fluss gesetzt.",
    categoryDefaultStatus: "Die Kategorie-Standardfrage hat die Beratungsrichtung gesetzt.",
    copiedDone: "✓ Kopiert",
    copyPrompt: "📋 Prompt kopieren",
    generating: "✦ Prompt wird abgestimmt...",
  },
  nl: {
    free: "Gratis",
    oneTimePrice: "Eenmalig KRW 5.000",
    lenormandFree: "Lenormand gratis",
    passAvailable: "Pass beschikbaar",
    instantUse: "Direct te gebruiken",
    paymentRequired: "Betaling nodig",
    checking: "Controleren",
    disconnected: "Niet verbonden",
    lenormandQuestionReady: "De vraagstroom is gezet. Zes Lenormandkaarten verbinden herhaalde signalen en actietips.",
    lenormandQuestionEmpty: "Schrijf de situatie of vraag die je wilt bekijken in één zin.",
    quickQuestionStatus: "De snelle vraag heeft de consultfocus gezet.",
    recommendedQuestionStatus: "De aanbevolen vraag heeft de consultfocus verfijnd.",
    askQuestionFirst: "Voer eerst een vraag in. Kort is prima.",
    spreadNeedAll: (count) => `Deze spread heeft alle ${count} kaarten nodig.`,
    lenormandCompleteToast: "De gratis Lenormand-prompt is klaar.",
    subscriptionPromptComplete: "Je passvoordeel opende de Tarot Prompt Library. De AI-orakelprompt is klaar in de maanlichtstroom.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "beschikbaar passvoordeel",
    passRemaining: (amount) => ` Resterend passvoordeel: ${amount}`,
    passOpened: (spent, balance) => `Tarot Prompt Library is geopend met ${spent}.${balance}`,
    paidApproved: (balance) => `Toegang tot Tarot Prompt Library goedgekeurd. Resterende KRW-waarde: ${balance}`,
    loginRequired: "Inloggen is vereist.",
    insufficientCoins: (amount) => `Je beschikbare saldo is niet genoeg. ${amount} is vereist.`,
    priceNotFound: "De servicevoorwaarden konden niet worden bevestigd. Probeer het zo opnieuw.",
    serverConfigError: "Betalingscontrole is vertraagd. Probeer het zo opnieuw.",
    refunded: "Deze betaling is terugbetaald omdat de AI-orakelprompt niet is voltooid.",
    paymentIncomplete: "Betalingscontrole is niet voltooid.",
    promptError: "Er ging iets mis bij het maken van de AI-orakelprompt.",
    lenormandCopied: "Lenormand-prompt gekopieerd.",
    tarotCopied: "AI-orakelprompt gekopieerd.",
    copyFailed: "Kopiëren naar klembord mislukt.",
    cardSelectionIncomplete: "Je kunt opnieuw genereren nadat de kaartkeuze compleet is.",
    lenormandRegenerated: "De prompt is opnieuw geordend met dezelfde Lenormandcombinatie.",
    tarotRegenerated: "De AI-orakelprompt is opnieuw geordend met dezelfde kaartcombinatie.",
    tuneAlready: "Deze afstemming is al toegepast.",
    tuneAdded: (label) => `${label}-afstemming toegevoegd.`,
    lenormandDefaultStatus: "De Lenormand-standaardvraag heeft de stroom gezet.",
    categoryDefaultStatus: "De categorie-standaardvraag heeft de consult richting gezet.",
    copiedDone: "✓ Gekopieerd",
    copyPrompt: "📋 Prompt kopiëren",
    generating: "✦ Prompt afstemmen...",
  },
  ms: {
    free: "Percuma",
    oneTimePrice: "Sekali KRW 5,000",
    lenormandFree: "Lenormand percuma",
    passAvailable: "Pas tersedia",
    instantUse: "Boleh guna segera",
    paymentRequired: "Bayaran diperlukan",
    checking: "Menyemak",
    disconnected: "Tidak bersambung",
    lenormandQuestionReady: "Aliran soalan sudah jelas. Enam kad Lenormand akan mengikat isyarat berulang dan petunjuk tindakan.",
    lenormandQuestionEmpty: "Tulis situasi atau soalan yang mahu dilihat dalam satu ayat.",
    quickQuestionStatus: "Soalan pantas menetapkan fokus konsultasi.",
    recommendedQuestionStatus: "Soalan cadangan memperhalus fokus konsultasi.",
    askQuestionFirst: "Sila masukkan soalan dahulu. Pendek pun tidak mengapa.",
    spreadNeedAll: (count) => `Spread ini memerlukan semua ${count} kad dicabut.`,
    lenormandCompleteToast: "Prompt Lenormand percuma sudah siap.",
    subscriptionPromptComplete: "Manfaat pas digunakan dan Tarot Prompt Library dibuka. Prompt oracle AI siap dalam aliran cahaya bulan.",
    subscriptionReason: "Tarot Prompt Library",
    passBenefit: "manfaat pas tersedia",
    passRemaining: (amount) => ` Baki manfaat pas: ${amount}`,
    passOpened: (spent, balance) => `Tarot Prompt Library dibuka dengan manfaat ${spent}.${balance}`,
    paidApproved: (balance) => `Akses Tarot Prompt Library diluluskan. Nilai KRW berbaki: ${balance}`,
    loginRequired: "Log masuk diperlukan.",
    insufficientCoins: (amount) => `Baki tersedia tidak mencukupi. ${amount} diperlukan.`,
    priceNotFound: "Syarat penggunaan servis tidak dapat disahkan. Cuba sebentar lagi.",
    serverConfigError: "Pengesahan bayaran sedang tertangguh. Cuba sebentar lagi.",
    refunded: "Bayaran ini telah dipulangkan kerana prompt oracle AI tidak selesai.",
    paymentIncomplete: "Pengesahan bayaran belum selesai.",
    promptError: "Masalah berlaku semasa menyusun prompt oracle AI.",
    lenormandCopied: "Prompt Lenormand disalin.",
    tarotCopied: "Prompt oracle AI disalin.",
    copyFailed: "Gagal menyalin ke papan klip.",
    cardSelectionIncomplete: "Anda boleh jana semula selepas pilihan kad selesai.",
    lenormandRegenerated: "Prompt disusun semula dengan gabungan kad Lenormand yang sama.",
    tarotRegenerated: "Prompt oracle AI disusun semula dengan gabungan kad yang sama.",
    tuneAlready: "Penalaan ini sudah digunakan.",
    tuneAdded: (label) => `Ayat penalaan ${label} ditambah.`,
    lenormandDefaultStatus: "Soalan lalai Lenormand menetapkan aliran.",
    categoryDefaultStatus: "Soalan lalai kategori menetapkan arah konsultasi.",
    copiedDone: "✓ Disalin",
    copyPrompt: "📋 Salin prompt",
    generating: "✦ Menala prompt...",
  },
};

const ALL_FILTER_LABEL: Record<LoadingLocale, string> = {
  ko: "전체",
  en: "All",
  ja: "すべて",
  "zh-CN": "全部",
  "zh-TW": "全部",
  vi: "Tất cả",
  hi: "सभी",
  es: "Todo",
  fr: "Tout",
  de: "Alle",
  nl: "Alles",
  ms: "Semua",
};

const QUESTION_PLACEHOLDER_COPY: Record<LoadingLocale, { tarot: string; lenormand: string }> = {
  ko: {
    tarot: "지금 가장 궁금한 질문을 적어주세요. 예: 그 사람이 다시 연락할까요?",
    lenormand: "지금 보고 싶은 상황이나 질문을 적어주세요.",
  },
  en: {
    tarot: "Write the question you most want to ask now. Example: Will that person contact me again?",
    lenormand: "Write the situation or question you want to examine now.",
  },
  ja: {
    tarot: "今いちばん気になる質問を入力してください。例：あの人からまた連絡は来ますか？",
    lenormand: "今見たい状況や質問を入力してください。",
  },
  "zh-CN": {
    tarot: "写下你现在最想问的问题。例：那个人还会再联系我吗？",
    lenormand: "写下你现在想查看的状况或问题。",
  },
  "zh-TW": {
    tarot: "寫下你現在最想問的問題。例：那個人還會再聯絡我嗎？",
    lenormand: "寫下你現在想查看的狀況或問題。",
  },
  vi: {
    tarot: "Hãy viết câu hỏi bạn đang muốn hỏi nhất. Ví dụ: Người ấy có liên lạc lại không?",
    lenormand: "Hãy viết tình huống hoặc câu hỏi bạn muốn xem lúc này.",
  },
  hi: {
    tarot: "अभी जो प्रश्न सबसे अधिक मन में है, उसे लिखें. उदाहरण: क्या वह व्यक्ति फिर संपर्क करेगा?",
    lenormand: "अभी जिस स्थिति या प्रश्न को देखना है, उसे लिखें.",
  },
  es: {
    tarot: "Escribe la pregunta que más te inquieta ahora. Ejemplo: ¿Esa persona volverá a contactarme?",
    lenormand: "Escribe la situación o pregunta que quieres mirar ahora.",
  },
  fr: {
    tarot: "Écrivez la question qui vous préoccupe le plus maintenant. Exemple : Cette personne va-t-elle me recontacter ?",
    lenormand: "Écrivez la situation ou la question à observer maintenant.",
  },
  de: {
    tarot: "Schreibe die Frage auf, die dich gerade am meisten beschäftigt. Beispiel: Meldet sich diese Person wieder?",
    lenormand: "Schreibe die Situation oder Frage auf, die du jetzt betrachten möchtest.",
  },
  nl: {
    tarot: "Schrijf de vraag op die je nu het meest bezighoudt. Voorbeeld: Neemt die persoon opnieuw contact op?",
    lenormand: "Schrijf de situatie of vraag op die je nu wilt bekijken.",
  },
  ms: {
    tarot: "Tulis soalan yang paling ingin ditanya sekarang. Contoh: Adakah orang itu akan menghubungi saya semula?",
    lenormand: "Tulis situasi atau soalan yang mahu dilihat sekarang.",
  },
};

const LENORMAND_DEFAULT_QUESTION_COPY: Record<LoadingLocale, string> = {
  ko: "지금 보고 싶은 상황에서 가장 먼저 확인해야 할 흐름과 행동 단서는 무엇일까?",
  en: "What flow and action clue should I check first in the situation I want to examine now?",
  ja: "今見たい状況で、最初に確認すべき流れと行動の手がかりは何ですか？",
  "zh-CN": "在我现在想看的状况里，最先该确认的流向和行动线索是什么？",
  "zh-TW": "在我現在想看的狀況裡，最先該確認的流向和行動線索是什麼？",
  vi: "Trong tình huống tôi muốn xem lúc này, dòng chảy và manh mối hành động nào cần kiểm tra trước?",
  hi: "अभी जिस स्थिति को देखना है, उसमें सबसे पहले कौन सा flow और action clue देखना चाहिए?",
  es: "En la situación que quiero mirar ahora, ¿qué flujo y pista de acción debo revisar primero?",
  fr: "Dans la situation que je veux observer maintenant, quel courant et quelle piste d'action dois-je vérifier d'abord ?",
  de: "Welchen Verlauf und welchen Handlungshinweis sollte ich in der aktuellen Situation zuerst prüfen?",
  nl: "Welke stroom en actietip moet ik eerst bekijken in de situatie die ik nu wil zien?",
  ms: "Dalam situasi yang mahu saya lihat sekarang, aliran dan petunjuk tindakan apa yang patut diperiksa dahulu?",
};

const LENORMAND_RECOMMENDED_QUESTIONS: Record<LoadingLocale, string[]> = {
  ko: [
    "지금 보고 싶은 상황에서 가장 반복되는 신호는 무엇일까?",
    "이 흐름에서 내가 줄여야 할 행동과 늘려야 할 행동은 무엇일까?",
    "가까운 다음 장면으로 이어지는 현실 단서는 무엇일까?",
  ],
  en: [
    "What sign repeats most in the situation I want to examine now?",
    "Which action should I reduce, and which action should I increase in this flow?",
    "What practical clue leads into the next nearby scene?",
  ],
  ja: [
    "今見たい状況で、最も繰り返されているサインは何ですか？",
    "この流れで、私が減らすべき行動と増やすべき行動は何ですか？",
    "近い次の場面につながる現実的な手がかりは何ですか？",
  ],
  "zh-CN": [
    "在我现在想看的状况里，最反复出现的信号是什么？",
    "这段流向中，我该减少的行动和该增加的行动是什么？",
    "通向近期下一幕的现实线索是什么？",
  ],
  "zh-TW": [
    "在我現在想看的狀況裡，最反覆出現的訊號是什麼？",
    "這段流向中，我該減少的行動和該增加的行動是什麼？",
    "通往近期下一幕的現實線索是什麼？",
  ],
  vi: [
    "Trong tình huống tôi muốn xem lúc này, tín hiệu nào lặp lại rõ nhất?",
    "Trong dòng chảy này, tôi nên giảm hành động nào và tăng hành động nào?",
    "Manh mối thực tế nào dẫn tới cảnh gần tiếp theo?",
  ],
  hi: [
    "अभी जिस स्थिति को देखना है, उसमें कौन सा संकेत सबसे अधिक दोहर रहा है?",
    "इस flow में मुझे कौन सा action घटाना और कौन सा action बढ़ाना चाहिए?",
    "अगले निकट दृश्य तक ले जाने वाला वास्तविक clue क्या है?",
  ],
  es: [
    "En la situación que quiero mirar ahora, ¿qué señal se repite con más fuerza?",
    "En este flujo, ¿qué acción debo reducir y cuál debo aumentar?",
    "¿Qué pista práctica conduce a la próxima escena cercana?",
  ],
  fr: [
    "Dans la situation que je veux observer maintenant, quel signe se répète le plus ?",
    "Dans ce flux, quelle action dois-je réduire et quelle action dois-je renforcer ?",
    "Quelle piste concrète mène à la prochaine scène proche ?",
  ],
  de: [
    "Welches Zeichen wiederholt sich in der Situation, die ich jetzt betrachten möchte, am stärksten?",
    "Welche Handlung sollte ich in diesem Verlauf verringern und welche verstärken?",
    "Welcher praktische Hinweis führt in die nächste nahe Szene?",
  ],
  nl: [
    "Welk signaal herhaalt zich het meest in de situatie die ik nu wil bekijken?",
    "Welke actie moet ik in deze stroom verminderen en welke versterken?",
    "Welke praktische aanwijzing leidt naar de volgende nabije scène?",
  ],
  ms: [
    "Dalam situasi yang mahu saya lihat sekarang, isyarat apa yang paling berulang?",
    "Dalam aliran ini, tindakan apa yang patut saya kurangkan dan apa yang patut saya tambah?",
    "Petunjuk nyata apa yang membawa kepada babak terdekat seterusnya?",
  ],
};

const QUESTION_QUALITY_NOTICE_COPY: Record<LoadingLocale, QuestionQualityNoticeCopy> = {
  ko: {
    empty: (categoryName) => `${categoryName} 질문을 한 문장으로 적으면 추천 질문과 스프레드가 더 정확해집니다.`,
    tooShort: "질문이 짧아 해석 범위가 넓어질 수 있어요. 대상, 상황, 알고 싶은 결론 중 하나를 더해보세요.",
    tooLong: "질문이 길어 핵심이 흐려질 수 있어요. 가장 중요한 사건과 알고 싶은 방향만 남기면 프롬프트가 선명해집니다.",
    addDirection: "질문 안에 알고 싶은 방향을 조금 더 넣으면 카드가 답할 상담 초점이 또렷해집니다.",
    ready: "질문 흐름이 충분히 잡혔습니다. 추천 질문을 고르면 더 상담형 문장으로 다듬을 수 있습니다.",
  },
  en: {
    empty: (categoryName) => `Write one ${categoryName} question to make the recommended questions and spread more precise.`,
    tooShort: "The question is short, so the reading may stay broad. Add a person, situation, or outcome you want to understand.",
    tooLong: "The question is long, so the core may blur. Keep the main event and the direction you want to know.",
    addDirection: "Add a little more direction to the question so the cards can answer with a clearer consultation focus.",
    ready: "The question flow is clear enough. Choosing a recommended question can make it more consultation-ready.",
  },
  ja: {
    empty: (categoryName) => `${categoryName}の質問を一文で書くと、おすすめ質問とスプレッドがより正確になります。`,
    tooShort: "質問が短いため、解釈の幅が広がりやすいです。相手、状況、知りたい結論のどれかを少し足してみてください。",
    tooLong: "質問が長いため、核心がぼやけることがあります。いちばん大切な出来事と知りたい方向だけを残すと、プロンプトが澄んできます。",
    addDirection: "質問の中に知りたい方向をもう少し入れると、カードが答える相談の焦点がはっきりします。",
    ready: "質問の流れは十分に整っています。おすすめ質問を選ぶと、さらに相談向きの文に磨けます。",
  },
  "zh-CN": {
    empty: (categoryName) => `请用一句话写下${categoryName}问题，推荐问题和牌阵会更准确。`,
    tooShort: "问题较短，解读范围可能会变宽。可以补充对象、状况或想知道的结果。",
    tooLong: "问题较长，核心可能会变得模糊。只保留最重要的事件和想知道的方向，提示词会更清晰。",
    addDirection: "在问题里再加入一点想知道的方向，卡牌回答的咨询焦点会更清楚。",
    ready: "问题流向已经足够清晰。选择推荐问题，可以把句子打磨得更适合咨询。",
  },
  "zh-TW": {
    empty: (categoryName) => `請用一句話寫下${categoryName}問題，推薦問題和牌陣會更準確。`,
    tooShort: "問題較短，解讀範圍可能會變寬。可以補充對象、狀況或想知道的結果。",
    tooLong: "問題較長，核心可能會變得模糊。只保留最重要的事件和想知道的方向，提示詞會更清晰。",
    addDirection: "在問題裡再加入一點想知道的方向，卡牌回答的諮詢焦點會更清楚。",
    ready: "問題流向已經足夠清晰。選擇推薦問題，可以把句子打磨得更適合諮詢。",
  },
  vi: {
    empty: (categoryName) => `Viết một câu hỏi ${categoryName} trong một câu để gợi ý và trải bài chính xác hơn.`,
    tooShort: "Câu hỏi còn ngắn nên phạm vi luận giải có thể rộng. Hãy thêm đối tượng, tình huống hoặc điều bạn muốn biết.",
    tooLong: "Câu hỏi khá dài nên trọng tâm có thể mờ đi. Giữ lại sự kiện chính và hướng bạn muốn biết.",
    addDirection: "Thêm một chút hướng muốn biết vào câu hỏi để lá bài trả lời với trọng tâm rõ hơn.",
    ready: "Dòng câu hỏi đã đủ rõ. Chọn câu hỏi gợi ý sẽ giúp câu chữ hợp với tư vấn hơn.",
  },
  hi: {
    empty: (categoryName) => `${categoryName} question को एक वाक्य में लिखें, ताकि suggested questions और spread अधिक सटीक हों.`,
    tooShort: "Question छोटा है, इसलिए reading बहुत व्यापक हो सकती है. व्यक्ति, स्थिति या desired outcome में से कुछ जोड़ें.",
    tooLong: "Question लंबा है, इसलिए core धुंधला हो सकता है. मुख्य घटना और जानने की दिशा ही रखें.",
    addDirection: "Question में जानने की दिशा थोड़ा और जोड़ें, ताकि cards का consultation focus साफ हो.",
    ready: "Question flow पर्याप्त स्पष्ट है. Recommended question चुनने से वाक्य consultation-ready हो जाएगा.",
  },
  es: {
    empty: (categoryName) => `Escribe una pregunta de ${categoryName} en una frase para que las sugerencias y la tirada sean más precisas.`,
    tooShort: "La pregunta es breve y la lectura puede quedar amplia. Añade una persona, situación o resultado que quieras comprender.",
    tooLong: "La pregunta es larga y el núcleo puede difuminarse. Conserva el hecho principal y la dirección que deseas conocer.",
    addDirection: "Añade un poco más de dirección a la pregunta para que las cartas respondan con un foco más claro.",
    ready: "El flujo de la pregunta está claro. Una pregunta recomendada puede dejarla más lista para consulta.",
  },
  fr: {
    empty: (categoryName) => `Écrivez une question de ${categoryName} en une phrase pour rendre les suggestions et le tirage plus précis.`,
    tooShort: "La question est courte, la lecture peut rester large. Ajoutez une personne, une situation ou le résultat que vous souhaitez comprendre.",
    tooLong: "La question est longue, le noyau peut se brouiller. Gardez l'événement principal et la direction à éclairer.",
    addDirection: "Ajoutez un peu plus de direction dans la question pour que les cartes répondent avec un focus plus net.",
    ready: "Le flux de la question est assez clair. Une question recommandée peut la rendre plus prête pour la consultation.",
  },
  de: {
    empty: (categoryName) => `Schreibe eine ${categoryName}-Frage in einem Satz, damit Empfehlungen und Legung genauer werden.`,
    tooShort: "Die Frage ist kurz, daher kann die Deutung breit bleiben. Ergänze eine Person, Situation oder das Ergebnis, das du verstehen möchtest.",
    tooLong: "Die Frage ist lang, daher kann der Kern unscharf werden. Behalte das wichtigste Ereignis und die Richtung, die du wissen möchtest.",
    addDirection: "Gib der Frage etwas mehr Richtung, damit die Karten mit klarerem Beratungsfokus antworten können.",
    ready: "Der Fragenfluss ist klar genug. Eine empfohlene Frage kann ihn noch beratungstauglicher machen.",
  },
  nl: {
    empty: (categoryName) => `Schrijf één ${categoryName}-vraag in één zin, zodat suggesties en spread preciezer worden.`,
    tooShort: "De vraag is kort, waardoor de reading breed kan blijven. Voeg een persoon, situatie of gewenste uitkomst toe.",
    tooLong: "De vraag is lang, waardoor de kern kan vervagen. Houd alleen de hoofdgebeurtenis en de richting die je wilt weten.",
    addDirection: "Voeg wat meer richting toe aan de vraag, zodat de kaarten met een duidelijker consultfocus kunnen antwoorden.",
    ready: "De vraagstroom is duidelijk genoeg. Een aanbevolen vraag kan hem meer consultklaar maken.",
  },
  ms: {
    empty: (categoryName) => `Tulis satu soalan ${categoryName} dalam satu ayat supaya cadangan dan spread lebih tepat.`,
    tooShort: "Soalan masih pendek, jadi bacaan boleh menjadi terlalu luas. Tambahkan orang, situasi atau hasil yang mahu difahami.",
    tooLong: "Soalan agak panjang, jadi inti boleh menjadi kabur. Kekalkan peristiwa utama dan arah yang mahu diketahui.",
    addDirection: "Tambahkan sedikit arah dalam soalan supaya kad menjawab dengan fokus konsultasi yang lebih jelas.",
    ready: "Aliran soalan sudah cukup jelas. Soalan cadangan boleh menjadikannya lebih sesuai untuk konsultasi.",
  },
};

function formatWonNumber(amount: number) {
  return Math.max(0, Math.floor(Number(amount || 0) * 100)).toLocaleString("ko-KR");
}

function formatCreditWonNumber(amount: number) {
  return Math.max(0, Math.floor(Number(amount || 0) * 10)).toLocaleString("ko-KR");
}

const PROMPT_MAKER_UI_COPY: Record<LoadingLocale, PromptMakerUiCopy> = {
  ko: {
    heroBadge: "AI 오라클 프롬프트 아틀리에",
    heroSteps: ["질문을 올리고", "카드를 열어", "AI 프롬프트로"],
    questionTitle: { tarot: "마음 속 질문을 들려주세요", lenormand: "질문" },
    questionDescription: { tarot: "타로가 당신만의 이야기를 풀어낼 준비를 합니다.", lenormand: "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다." },
    categoryTitle: "질문 카테고리",
    autoDetected: (categoryName) => `자동 추정: ${categoryName}`,
    autoDetectButton: "자동 추정",
    selectedSpread: "선택된 스프레드",
    cardCount: (count) => `${count}장`,
    consultationCategory: (categoryName) => `상담 카테고리 ${categoryName}`,
    changeSpread: "스프레드 바꾸기",
    recommendedQuestions: "추천 질문",
    applyFirstQuestion: "첫 질문 적용",
    lenormandFreeTitle: "무료 레노먼드 프롬프트",
    lenormandFreeDescription: "질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.",
    defaultQuestionButton: { tarot: "카테고리 기본 질문", lenormand: "레노먼드 기본 질문" },
    completeSuffix: "완료",
    includeReversed: "역방향 포함",
    backToQuestion: "← 질문으로 돌아가기",
    resetStart: "처음으로",
    otherSpread: "다른 스프레드",
    spreadBoardHint: "직관이 끌리는 순서대로 카드를 뽑아보세요.",
    combinationReading: "조합 읽기",
    positionMeaning: "포지션 의미",
    drawCard: { tarot: "카드 뽑기", lenormand: "레노먼드 카드 뽑기" },
    fullDeck: { open: "전체 카드 직접 선택", close: "전체 카드 목록 닫기" },
    selectedCards: "선택된 카드",
    lenormandLabel: "레노먼드",
    changeDirection: "방향 변경",
    notSelected: "아직 선택되지 않았어요.",
    promptMap: { tarot: "전문가 상담 프롬프트 지도", lenormand: "레노먼드 프롬프트 지도" },
    oracleMap: "카드가 만든 신탁 지도",
    outputTitle: { tarot: "지금 복사할 AI 오라클 프롬프트", lenormand: "지금 복사할 무료 레노먼드 프롬프트" },
    tune: {
      consultLabel: "상담톤 강화",
      consultInstruction: "전체 답변을 실제 상담사가 눈앞의 질문자에게 말하듯 자연스럽게 이어 주세요. 카드 이름보다 질문의 맥락, 포지션 의미, 카드 간 관계를 먼저 설명하고, 문장 끝마다 질문자의 주도권을 회복시키는 방향으로 정리하세요.",
      practicalLabel: "더 현실적으로",
      practicalInstruction: "상징 해석 뒤에는 반드시 현실적인 판단 기준과 행동 순서를 붙여 주세요. 법률, 의료, 투자, 임신, 합격 여부 등 민감한 주제는 참고용 조언으로만 표현하고 전문가 상담을 함께 권하세요.",
      warmLabel: "더 따뜻하게",
      warmInstruction: "답변의 온도를 조금 더 부드럽게 낮추고, 불안한 질문자가 숨을 고를 수 있도록 위로와 선택지를 함께 주세요. 공포를 주는 표현이나 단정적 미래 예언은 피하세요.",
    },
    regenerateSameCards: "같은 카드로 다시 엮기",
    redrawCards: "카드 다시 열기",
    chooseAnotherSpread: "다른 스프레드 선택",
    restartFromBeginning: "처음부터 다시 시작",
    guideArticles: [
      { title: "무엇을 정리하나요", paragraphs: ["질문의 주제, 선택한 스프레드, 카드의 방향을 한 문장씩 엮어 타로 상담에 바로 쓸 수 있는 프롬프트 흐름으로 정리합니다. 레노먼드는 사건의 순서와 행동 단서를, 타로는 마음의 층과 상징의 결을 더 깊게 비춥니다."] },
      { title: "어떻게 읽으면 좋나요", paragraphs: ["질문을 구체적으로 적을수록 결과는 막연한 길흉보다 현재 상황, 반복 신호, 전환 단서, 현실 행동 쪽으로 선명해집니다. 무료 레노먼드는 흐름 정리에, 유료 오라클 프롬프트는 더 긴 상담 문장과 조율 지시에 어울립니다."] },
      { title: "주의할 점", paragraphs: ["결과는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 의료, 법률, 투자, 임신, 합격 여부처럼 손실이 큰 결정은 이 리딩만으로 확정하지 말고 현실 정보와 전문가 상담을 함께 확인하세요. 프롬프트는 판단을 대신하지 않고 질문을 더 맑게 정리하는 도구로 읽어 주세요."] },
      { title: "좋은 질문을 만드는 법", paragraphs: ["“그 사람이 돌아올까요”처럼 결말을 묻는 질문보다 “지금 이 관계에서 내가 확인해야 할 신호는 무엇인가요”처럼 마음과 행동을 함께 묻는 문장이 더 안정적으로 읽힙니다. 프롬프트를 복사한 뒤에는 카드 이름만 나열하기보다, 현재 상황, 상대와 나의 감정, 현실적으로 할 수 있는 선택지를 함께 적어 두면 해석이 덜 단정적이고 더 상담답게 열립니다.", "같은 카드 조합이라도 질문의 시점과 태도에 따라 메시지는 달라질 수 있으니, 결과를 압박으로 받아들이기보다 오늘 정리할 한 문장과 줄여야 할 행동 하나를 고르는 방식으로 사용해 주세요.", "타로 초보자는 1장 또는 3장 스프레드로 질문의 방향을 먼저 잡고, 복잡한 관계나 커리어 고민은 5장 이상의 스프레드로 배경과 행동 단서를 나누어 보는 편이 좋습니다. 결과가 마음에 들지 않더라도 같은 질문을 반복해서 뽑기보다, 질문을 더 정확하게 다듬거나 하루 정도 시간을 둔 뒤 다시 읽으면 상징이 더 차분하게 다가옵니다.", "입력값은 질문 문장, 고민 주제, 선택한 스프레드, 뽑은 카드입니다. 질문 문장은 상담의 초점을 정하고, 고민 주제는 사랑·일·돈·건강처럼 해석에서 조심해야 할 경계를 알려 줍니다. 스프레드는 시간의 흐름이나 관계의 위치를 나누고, 카드는 그 자리에 놓인 상징을 비춥니다."] },
    ],
    spreadLibraryTitle: "다른 스프레드 보기",
    close: "닫기",
    spreadSearchPlaceholder: "스프레드 검색",
    recommendedTheme: (categoryName) => `추천 테마: ${categoryName}`,
    countAll: "전체",
    recommendedBadge: "추천",
    noSpreads: "조건에 맞는 스프레드가 없습니다. 필터를 조정해 주세요.",
    subscriptionPassLabel: (tier) => `${tier} 이용권`,
    currency: (amount) => `${formatWonNumber(amount)}원`,
    creditValue: (amount) => `${formatCreditWonNumber(amount)}원 상당`,
  },
  en: {
    heroBadge: "AI Oracle Prompt Atelier",
    heroSteps: ["Lift the question", "Open the cards", "Shape an AI prompt"],
    questionTitle: { tarot: "Tell the question in your heart", lenormand: "Question" },
    questionDescription: { tarot: "Tarot is preparing to unfold your own story.", lenormand: "Enter a topic and read the flow with six Lenormand cards and practical clues." },
    categoryTitle: "Question category",
    autoDetected: (categoryName) => `Auto-detected: ${categoryName}`,
    autoDetectButton: "Auto detect",
    selectedSpread: "Selected spread",
    cardCount: (count) => `${count} cards`,
    consultationCategory: (categoryName) => `Consultation category ${categoryName}`,
    changeSpread: "Change spread",
    recommendedQuestions: "Recommended questions",
    applyFirstQuestion: "Apply first question",
    lenormandFreeTitle: "Free Lenormand prompt",
    lenormandFreeDescription: "Write a question and the matching prompt flow opens right away.",
    defaultQuestionButton: { tarot: "Category default question", lenormand: "Lenormand default question" },
    completeSuffix: "complete",
    includeReversed: "Include reversals",
    backToQuestion: "← Back to question",
    resetStart: "Start over",
    otherSpread: "Other spread",
    spreadBoardHint: "Draw the cards in the order your intuition chooses.",
    combinationReading: "Combination reading",
    positionMeaning: "Position meaning",
    drawCard: { tarot: "Draw card", lenormand: "Draw Lenormand cards" },
    fullDeck: { open: "Choose from full deck", close: "Close full deck list" },
    selectedCards: "Selected cards",
    lenormandLabel: "Lenormand",
    changeDirection: "Change direction",
    notSelected: "Not selected yet.",
    promptMap: { tarot: "AI consultation prompt map", lenormand: "Lenormand prompt map" },
    oracleMap: "Oracle map made by the cards",
    outputTitle: { tarot: "AI oracle prompt ready to copy", lenormand: "Free Lenormand prompt ready to copy" },
    tune: {
      consultLabel: "Strengthen consultation tone",
      consultInstruction: "Let the full answer flow as if a real reader is speaking to the questioner in front of them. Explain the question context, position meaning, and card relationships before card names, and end each paragraph by returning agency to the questioner.",
      practicalLabel: "Make it more practical",
      practicalInstruction: "After symbolic interpretation, add realistic decision standards and action order. For sensitive topics such as legal, medical, investment, pregnancy, or exam outcomes, frame the answer as reference guidance and recommend expert consultation.",
      warmLabel: "Make it warmer",
      warmInstruction: "Soften the emotional temperature, add comfort and choices so an anxious questioner can breathe, and avoid fear-inducing wording or fixed future predictions.",
    },
    regenerateSameCards: "Weave again with same cards",
    redrawCards: "Open cards again",
    chooseAnotherSpread: "Choose another spread",
    restartFromBeginning: "Restart from beginning",
    guideArticles: [
      { title: "What is organized", paragraphs: ["The question topic, chosen spread, and card direction are woven into a prompt flow ready for tarot consultation. Lenormand reads sequence and action clues; tarot looks deeper into emotional layers and symbolic texture."] },
      { title: "How to read it", paragraphs: ["The more specific the question, the clearer the result becomes around current situation, repeated signs, turning clues, and realistic action instead of vague luck. Free Lenormand suits flow sorting; the paid oracle prompt suits longer consultation language and tuning instructions."] },
      { title: "Important note", paragraphs: ["The result is for entertainment and self-reflection. For high-impact decisions involving medicine, law, investment, pregnancy, or admissions, do not decide from this reading alone. Check real-world information and consult a qualified expert."] },
      { title: "How to ask well", paragraphs: ["Questions that ask about heart and action together read more steadily than questions asking only for an ending. After copying the prompt, add the current situation, both people's emotions, and realistic options rather than listing card names only.", "Even with the same cards, the message changes with timing and attitude. Use the result by choosing one sentence to clarify today and one action to reduce.", "Beginners can start with one-card or three-card spreads; complex relationships or career concerns often benefit from five or more cards to separate background and action clues.", "Inputs include the question, concern category, chosen spread, and drawn cards. The prompt does not decide for you; it clears the question so judgment can breathe."] },
    ],
    spreadLibraryTitle: "View other spreads",
    close: "Close",
    spreadSearchPlaceholder: "Search spreads",
    recommendedTheme: (categoryName) => `Recommended theme: ${categoryName}`,
    countAll: "All",
    recommendedBadge: "Recommended",
    noSpreads: "No spreads match the filters. Please adjust them.",
    subscriptionPassLabel: (tier) => `${tier} pass`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `KRW ${formatCreditWonNumber(amount)} value`,
  },
  ja: {
    heroBadge: "AIオラクルプロンプト・アトリエ",
    heroSteps: ["質問を掲げて", "カードを開き", "AIプロンプトへ"],
    questionTitle: { tarot: "心の中の質問を聞かせてください", lenormand: "質問" },
    questionDescription: { tarot: "タロットが、あなただけの物語をほどく準備をしています。", lenormand: "テーマを入力し、6枚のルノルマンカードで流れと行動の手がかりを見ます。" },
    categoryTitle: "質問カテゴリ",
    autoDetected: (categoryName) => `自動推定: ${categoryName}`,
    autoDetectButton: "自動推定",
    selectedSpread: "選択中のスプレッド",
    cardCount: (count) => `${count}枚`,
    consultationCategory: (categoryName) => `相談カテゴリ ${categoryName}`,
    changeSpread: "スプレッドを変更",
    recommendedQuestions: "おすすめ質問",
    applyFirstQuestion: "最初の質問を適用",
    lenormandFreeTitle: "無料ルノルマンプロンプト",
    lenormandFreeDescription: "質問を書くと、そのテーマに合うプロンプトと解釈の流れがすぐ開きます。",
    defaultQuestionButton: { tarot: "カテゴリ基本質問", lenormand: "ルノルマン基本質問" },
    completeSuffix: "完了",
    includeReversed: "逆位置を含める",
    backToQuestion: "← 質問に戻る",
    resetStart: "最初へ",
    otherSpread: "別のスプレッド",
    spreadBoardHint: "直感が惹かれる順にカードを引いてください。",
    combinationReading: "組み合わせ読み",
    positionMeaning: "ポジションの意味",
    drawCard: { tarot: "カードを引く", lenormand: "ルノルマンカードを引く" },
    fullDeck: { open: "全カードから選ぶ", close: "全カード一覧を閉じる" },
    selectedCards: "選択したカード",
    lenormandLabel: "ルノルマン",
    changeDirection: "向きを変更",
    notSelected: "まだ選択されていません。",
    promptMap: { tarot: "AI相談プロンプトマップ", lenormand: "ルノルマンプロンプトマップ" },
    oracleMap: "カードが作った神託マップ",
    outputTitle: { tarot: "今コピーできるAIオラクルプロンプト", lenormand: "今コピーできる無料ルノルマンプロンプト" },
    tune: {
      consultLabel: "相談口調を強める",
      consultInstruction: "回答全体を、実際の占い師が目の前の相談者に語りかけるように自然につなげてください。カード名より先に質問の文脈、ポジションの意味、カード同士の関係を説明し、各段落の最後は相談者が主導権を取り戻せる方向で整えてください。",
      practicalLabel: "もっと現実的に",
      practicalInstruction: "象徴解釈の後には、必ず現実的な判断基準と行動の順序を添えてください。法律、医療、投資、妊娠、合否などの繊細なテーマは参考として表現し、専門家への相談も勧めてください。",
      warmLabel: "もっと温かく",
      warmInstruction: "答えの温度を少しやわらげ、不安な相談者が息を整えられるよう慰めと選択肢を添えてください。恐怖を与える表現や断定的な未来予言は避けてください。",
    },
    regenerateSameCards: "同じカードでもう一度編む",
    redrawCards: "カードをもう一度開く",
    chooseAnotherSpread: "別のスプレッドを選ぶ",
    restartFromBeginning: "最初からやり直す",
    guideArticles: [
      { title: "何を整えますか", paragraphs: ["質問のテーマ、選んだスプレッド、カードの向きを一文ずつ結び、タロット相談ですぐ使えるプロンプトの流れに整えます。ルノルマンは出来事の順序と行動の手がかりを、タロットは心の層と象徴の質感をより深く照らします。"] },
      { title: "どう読むとよいですか", paragraphs: ["質問が具体的であるほど、結果は漠然とした吉凶ではなく、現在の状況、繰り返すサイン、転換の手がかり、現実的な行動へと澄んでいきます。無料ルノルマンは流れの整理に、有料オラクルプロンプトは長い相談文と調整指示に向いています。"] },
      { title: "注意すること", paragraphs: ["結果はエンターテインメントと自己省察のための参考です。医療、法律、投資、妊娠、合否のように影響の大きい判断は、このリーディングだけで決めず、現実の情報と専門家への相談を合わせて確認してください。"] },
      { title: "よい質問の作り方", paragraphs: ["「あの人は戻りますか」のように結末だけを尋ねるより、「今この関係で私が確認すべきサインは何ですか」のように心と行動を一緒に尋ねる文のほうが安定して読めます。", "同じカードの組み合わせでも、質問の時点と態度によってメッセージは変わります。結果を圧力として受け取らず、今日整える一文と減らす行動を一つ選ぶ形で使ってください。", "タロット初心者は1枚または3枚のスプレッドで方向をつかみ、複雑な関係や仕事の悩みは5枚以上で背景と行動の手がかりを分けると読みやすくなります。", "入力されるのは質問文、悩みのテーマ、選んだスプレッド、引いたカードです。プロンプトは判断を代行するものではなく、質問を澄ませるための道具として受け取ってください。"] },
    ],
    spreadLibraryTitle: "別のスプレッドを見る",
    close: "閉じる",
    spreadSearchPlaceholder: "スプレッド検索",
    recommendedTheme: (categoryName) => `おすすめテーマ: ${categoryName}`,
    countAll: "すべて",
    recommendedBadge: "おすすめ",
    noSpreads: "条件に合うスプレッドがありません。フィルターを調整してください。",
    subscriptionPassLabel: (tier) => `${tier}利用券`,
    currency: (amount) => `${formatWonNumber(amount)}ウォン`,
    creditValue: (amount) => `${formatCreditWonNumber(amount)}ウォン相当`,
  },
  "zh-CN": {
    heroBadge: "AI神谕提示词工坊",
    heroSteps: ["托起问题", "开启卡牌", "化为AI提示词"],
    questionTitle: { tarot: "请说出心中的问题", lenormand: "问题" },
    questionDescription: { tarot: "塔罗正准备展开只属于你的故事。", lenormand: "输入主题，用6张雷诺曼牌查看流向和行动线索。" },
    categoryTitle: "问题分类",
    autoDetected: (categoryName) => `自动判断：${categoryName}`,
    autoDetectButton: "自动判断",
    selectedSpread: "已选牌阵",
    cardCount: (count) => `${count}张`,
    consultationCategory: (categoryName) => `咨询分类 ${categoryName}`,
    changeSpread: "更换牌阵",
    recommendedQuestions: "推荐问题",
    applyFirstQuestion: "应用第一个问题",
    lenormandFreeTitle: "免费雷诺曼提示词",
    lenormandFreeDescription: "写下问题后，适合该主题的提示词和解读流向会立即打开。",
    defaultQuestionButton: { tarot: "分类默认问题", lenormand: "雷诺曼默认问题" },
    completeSuffix: "完成",
    includeReversed: "包含逆位",
    backToQuestion: "← 返回问题",
    resetStart: "回到开始",
    otherSpread: "其他牌阵",
    spreadBoardHint: "按直觉牵引的顺序抽牌。",
    combinationReading: "组合解读",
    positionMeaning: "位置含义",
    drawCard: { tarot: "抽牌", lenormand: "抽雷诺曼牌" },
    fullDeck: { open: "从完整牌组选择", close: "关闭完整牌组列表" },
    selectedCards: "已选卡牌",
    lenormandLabel: "雷诺曼",
    changeDirection: "改变方向",
    notSelected: "尚未选择。",
    promptMap: { tarot: "AI咨询提示词地图", lenormand: "雷诺曼提示词地图" },
    oracleMap: "卡牌生成的神谕地图",
    outputTitle: { tarot: "现在可复制的AI神谕提示词", lenormand: "现在可复制的免费雷诺曼提示词" },
    tune: {
      consultLabel: "加强咨询语气",
      consultInstruction: "请让整段回答像真实占卜师面对提问者说话一样自然延展。先说明问题语境、位置含义和卡牌关系，再提卡名，并在每段结尾帮助提问者收回主导权。",
      practicalLabel: "更现实",
      practicalInstruction: "象征解读之后，请加入现实判断标准和行动顺序。法律、医疗、投资、怀孕、录取等敏感主题只作为参考建议，并提醒咨询专家。",
      warmLabel: "更温暖",
      warmInstruction: "请让回答更柔和，加入安抚和可选择的方向，让不安的提问者可以慢慢呼吸。避免制造恐惧或断定未来。",
    },
    regenerateSameCards: "用同一组牌重新编织",
    redrawCards: "重新开牌",
    chooseAnotherSpread: "选择其他牌阵",
    restartFromBeginning: "从头开始",
    guideArticles: [
      { title: "整理什么", paragraphs: ["将问题主题、所选牌阵和卡牌方向逐一连成可用于塔罗咨询的提示词流向。雷诺曼看事件顺序和行动线索，塔罗更深地照见心绪层次和象征纹理。"] },
      { title: "如何阅读", paragraphs: ["问题越具体，结果越会从模糊吉凶转向当前状况、重复信号、转折线索和现实行动。免费雷诺曼适合整理流向，付费神谕提示词适合更长的咨询文字与调校指令。"] },
      { title: "注意事项", paragraphs: ["结果用于娱乐和自我省察。涉及医疗、法律、投资、怀孕、录取等高影响决定时，不要只凭这次解读下结论，请结合现实信息并咨询专业人士。"] },
      { title: "如何提出好问题", paragraphs: ["比起只问结局，把心意和行动一起放进问题里会读得更稳定。复制提示词后，也可以补充当前状况、双方情绪和现实选择。", "同一组牌也会因提问时间和态度不同而显出不同讯息。请把结果当作今天要整理的一句话和一个需要减少的行动。", "初学者可先用1张或3张牌抓住方向，复杂关系或事业问题适合用5张以上拆分背景与行动线索。", "输入内容包括问题句、烦恼主题、所选牌阵和抽到的卡牌。提示词不是替你判断，而是让问题更清澈。"] },
    ],
    spreadLibraryTitle: "查看其他牌阵",
    close: "关闭",
    spreadSearchPlaceholder: "搜索牌阵",
    recommendedTheme: (categoryName) => `推荐主题：${categoryName}`,
    countAll: "全部",
    recommendedBadge: "推荐",
    noSpreads: "没有符合条件的牌阵。请调整筛选。",
    subscriptionPassLabel: (tier) => `${tier}通行权益`,
    currency: (amount) => `${formatWonNumber(amount)}韩元`,
    creditValue: (amount) => `${formatCreditWonNumber(amount)}韩元价值`,
  },
  "zh-TW": {
    heroBadge: "AI神諭提示詞工坊",
    heroSteps: ["托起問題", "開啟卡牌", "化為AI提示詞"],
    questionTitle: { tarot: "請說出心中的問題", lenormand: "問題" },
    questionDescription: { tarot: "塔羅正準備展開只屬於你的故事。", lenormand: "輸入主題，用6張雷諾曼牌查看流向和行動線索。" },
    categoryTitle: "問題分類",
    autoDetected: (categoryName) => `自動判斷：${categoryName}`,
    autoDetectButton: "自動判斷",
    selectedSpread: "已選牌陣",
    cardCount: (count) => `${count}張`,
    consultationCategory: (categoryName) => `諮詢分類 ${categoryName}`,
    changeSpread: "更換牌陣",
    recommendedQuestions: "推薦問題",
    applyFirstQuestion: "套用第一個問題",
    lenormandFreeTitle: "免費雷諾曼提示詞",
    lenormandFreeDescription: "寫下問題後，適合該主題的提示詞和解讀流向會立即開啟。",
    defaultQuestionButton: { tarot: "分類預設問題", lenormand: "雷諾曼預設問題" },
    completeSuffix: "完成",
    includeReversed: "包含逆位",
    backToQuestion: "← 返回問題",
    resetStart: "回到開始",
    otherSpread: "其他牌陣",
    spreadBoardHint: "按直覺牽引的順序抽牌。",
    combinationReading: "組合解讀",
    positionMeaning: "位置含義",
    drawCard: { tarot: "抽牌", lenormand: "抽雷諾曼牌" },
    fullDeck: { open: "從完整牌組選擇", close: "關閉完整牌組列表" },
    selectedCards: "已選卡牌",
    lenormandLabel: "雷諾曼",
    changeDirection: "改變方向",
    notSelected: "尚未選擇。",
    promptMap: { tarot: "AI諮詢提示詞地圖", lenormand: "雷諾曼提示詞地圖" },
    oracleMap: "卡牌生成的神諭地圖",
    outputTitle: { tarot: "現在可複製的AI神諭提示詞", lenormand: "現在可複製的免費雷諾曼提示詞" },
    tune: {
      consultLabel: "加強諮詢語氣",
      consultInstruction: "請讓整段回答像真實占卜師面對提問者說話一樣自然延展。先說明問題語境、位置含義和卡牌關係，再提卡名，並在每段結尾幫助提問者收回主導權。",
      practicalLabel: "更現實",
      practicalInstruction: "象徵解讀之後，請加入現實判斷標準和行動順序。法律、醫療、投資、懷孕、錄取等敏感主題只作為參考建議，並提醒諮詢專家。",
      warmLabel: "更溫暖",
      warmInstruction: "請讓回答更柔和，加入安撫和可選擇的方向，讓不安的提問者可以慢慢呼吸。避免製造恐懼或斷定未來。",
    },
    regenerateSameCards: "用同一組牌重新編織",
    redrawCards: "重新開牌",
    chooseAnotherSpread: "選擇其他牌陣",
    restartFromBeginning: "從頭開始",
    guideArticles: [
      { title: "整理什麼", paragraphs: ["將問題主題、所選牌陣和卡牌方向逐一連成可用於塔羅諮詢的提示詞流向。雷諾曼看事件順序和行動線索，塔羅更深地照見心緒層次和象徵紋理。"] },
      { title: "如何閱讀", paragraphs: ["問題越具體，結果越會從模糊吉凶轉向目前狀況、重複訊號、轉折線索和現實行動。免費雷諾曼適合整理流向，付費神諭提示詞適合更長的諮詢文字與調校指令。"] },
      { title: "注意事項", paragraphs: ["結果用於娛樂和自我省察。涉及醫療、法律、投資、懷孕、錄取等高影響決定時，不要只憑這次解讀下結論，請結合現實資訊並諮詢專業人士。"] },
      { title: "如何提出好問題", paragraphs: ["比起只問結局，把心意和行動一起放進問題裡會讀得更穩定。複製提示詞後，也可以補充目前狀況、雙方情緒和現實選擇。", "同一組牌也會因提問時間和態度不同而顯出不同訊息。請把結果當作今天要整理的一句話和一個需要減少的行動。", "初學者可先用1張或3張牌抓住方向，複雜關係或事業問題適合用5張以上拆分背景與行動線索。", "輸入內容包括問題句、煩惱主題、所選牌陣和抽到的卡牌。提示詞不是替你判斷，而是讓問題更清澈。"] },
    ],
    spreadLibraryTitle: "查看其他牌陣",
    close: "關閉",
    spreadSearchPlaceholder: "搜尋牌陣",
    recommendedTheme: (categoryName) => `推薦主題：${categoryName}`,
    countAll: "全部",
    recommendedBadge: "推薦",
    noSpreads: "沒有符合條件的牌陣。請調整篩選。",
    subscriptionPassLabel: (tier) => `${tier}通行權益`,
    currency: (amount) => `${formatWonNumber(amount)}韓元`,
    creditValue: (amount) => `${formatCreditWonNumber(amount)}韓元價值`,
  },
  vi: {
    heroBadge: "Xưởng prompt AI oracle",
    heroSteps: ["Nâng câu hỏi", "Mở lá bài", "Thành prompt AI"],
    questionTitle: { tarot: "Hãy kể câu hỏi trong lòng bạn", lenormand: "Câu hỏi" },
    questionDescription: { tarot: "Tarot đang chuẩn bị mở câu chuyện riêng của bạn.", lenormand: "Nhập chủ đề và xem dòng chảy cùng manh mối hành động bằng 6 lá Lenormand." },
    categoryTitle: "Danh mục câu hỏi",
    autoDetected: (categoryName) => `Tự nhận diện: ${categoryName}`,
    autoDetectButton: "Tự nhận diện",
    selectedSpread: "Trải bài đã chọn",
    cardCount: (count) => `${count} lá`,
    consultationCategory: (categoryName) => `Danh mục tư vấn ${categoryName}`,
    changeSpread: "Đổi trải bài",
    recommendedQuestions: "Câu hỏi gợi ý",
    applyFirstQuestion: "Dùng câu hỏi đầu",
    lenormandFreeTitle: "Prompt Lenormand miễn phí",
    lenormandFreeDescription: "Viết câu hỏi và dòng prompt phù hợp với chủ đề sẽ mở ngay.",
    defaultQuestionButton: { tarot: "Câu hỏi mặc định theo danh mục", lenormand: "Câu hỏi Lenormand mặc định" },
    completeSuffix: "hoàn tất",
    includeReversed: "Gồm lá ngược",
    backToQuestion: "← Quay lại câu hỏi",
    resetStart: "Bắt đầu lại",
    otherSpread: "Trải bài khác",
    spreadBoardHint: "Rút bài theo thứ tự trực giác dẫn bạn.",
    combinationReading: "Đọc tổ hợp",
    positionMeaning: "Ý nghĩa vị trí",
    drawCard: { tarot: "Rút bài", lenormand: "Rút bài Lenormand" },
    fullDeck: { open: "Chọn từ toàn bộ bộ bài", close: "Đóng danh sách bộ bài" },
    selectedCards: "Lá đã chọn",
    lenormandLabel: "Lenormand",
    changeDirection: "Đổi chiều",
    notSelected: "Chưa được chọn.",
    promptMap: { tarot: "Bản đồ prompt tư vấn AI", lenormand: "Bản đồ prompt Lenormand" },
    oracleMap: "Bản đồ oracle do lá bài tạo",
    outputTitle: { tarot: "Prompt AI oracle sẵn sàng sao chép", lenormand: "Prompt Lenormand miễn phí sẵn sàng sao chép" },
    tune: {
      consultLabel: "Tăng giọng tư vấn",
      consultInstruction: "Hãy để toàn bộ câu trả lời tự nhiên như một reader thật đang nói với người hỏi trước mặt. Giải thích bối cảnh câu hỏi, ý nghĩa vị trí và quan hệ giữa các lá trước tên lá, rồi kết mỗi đoạn theo hướng trả lại quyền chủ động cho người hỏi.",
      practicalLabel: "Thực tế hơn",
      practicalInstruction: "Sau phần biểu tượng, hãy thêm tiêu chuẩn phán đoán thực tế và thứ tự hành động. Với pháp lý, y tế, đầu tư, thai kỳ, kết quả thi cử, chỉ diễn đạt như tham khảo và khuyên hỏi chuyên gia.",
      warmLabel: "Ấm áp hơn",
      warmInstruction: "Làm giọng trả lời dịu hơn, thêm an ủi và lựa chọn để người hỏi đang lo có thể thở lại. Tránh lời gây sợ hoặc tiên đoán tương lai chắc chắn.",
    },
    regenerateSameCards: "Kết lại với cùng lá",
    redrawCards: "Mở bài lại",
    chooseAnotherSpread: "Chọn trải bài khác",
    restartFromBeginning: "Làm lại từ đầu",
    guideArticles: [
      { title: "Điều được sắp xếp", paragraphs: ["Chủ đề câu hỏi, trải bài đã chọn và hướng lá được kết lại thành dòng prompt có thể dùng ngay cho tư vấn tarot. Lenormand đọc thứ tự sự việc và manh mối hành động; tarot soi sâu hơn tầng cảm xúc và đường nét biểu tượng."] },
      { title: "Cách đọc", paragraphs: ["Câu hỏi càng cụ thể, kết quả càng rõ về tình huống hiện tại, tín hiệu lặp lại, manh mối chuyển hướng và hành động thực tế thay vì may rủi mơ hồ. Lenormand miễn phí hợp để sắp dòng chảy; prompt oracle trả phí hợp với câu tư vấn dài hơn và chỉ dẫn tinh chỉnh."] },
      { title: "Lưu ý", paragraphs: ["Kết quả dành cho giải trí và tự soi chiếu. Với quyết định ảnh hưởng lớn như y tế, pháp lý, đầu tư, thai kỳ hoặc thi cử, đừng quyết định chỉ từ trải bài này; hãy kiểm tra thông tin thực tế và hỏi chuyên gia."] },
      { title: "Cách đặt câu hỏi tốt", paragraphs: ["Câu hỏi gộp cả cảm xúc và hành động thường được đọc ổn định hơn câu hỏi chỉ hỏi kết cục. Sau khi sao chép prompt, hãy thêm tình huống hiện tại, cảm xúc của đôi bên và lựa chọn thực tế.", "Cùng một tổ hợp lá vẫn có thể đổi sắc theo thời điểm và thái độ hỏi. Hãy dùng kết quả như một câu cần làm rõ hôm nay và một hành động nên giảm.", "Người mới có thể bắt đầu bằng trải 1 hoặc 3 lá; quan hệ phức tạp hay sự nghiệp thường cần 5 lá trở lên để tách bối cảnh và manh mối hành động.", "Dữ liệu nhập gồm câu hỏi, chủ đề lo lắng, trải bài đã chọn và các lá đã rút. Prompt không phán quyết thay bạn; nó làm câu hỏi trong hơn."] },
    ],
    spreadLibraryTitle: "Xem trải bài khác",
    close: "Đóng",
    spreadSearchPlaceholder: "Tìm trải bài",
    recommendedTheme: (categoryName) => `Chủ đề gợi ý: ${categoryName}`,
    countAll: "Tất cả",
    recommendedBadge: "Gợi ý",
    noSpreads: "Không có trải bài phù hợp. Hãy chỉnh bộ lọc.",
    subscriptionPassLabel: (tier) => `${tier} pass`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `giá trị KRW ${formatCreditWonNumber(amount)}`,
  },
  hi: {
    heroBadge: "AI Oracle Prompt Atelier",
    heroSteps: ["प्रश्न उठाएँ", "Cards खोलें", "AI prompt बनाएँ"],
    questionTitle: { tarot: "अपने मन का प्रश्न बताइए", lenormand: "प्रश्न" },
    questionDescription: { tarot: "Tarot आपकी अपनी कहानी खोलने की तैयारी कर रहा है.", lenormand: "विषय लिखें और 6 Lenormand cards से flow और action clues देखें." },
    categoryTitle: "Question category",
    autoDetected: (categoryName) => `Auto-detected: ${categoryName}`,
    autoDetectButton: "Auto detect",
    selectedSpread: "Selected spread",
    cardCount: (count) => `${count} cards`,
    consultationCategory: (categoryName) => `Consultation category ${categoryName}`,
    changeSpread: "Spread बदलें",
    recommendedQuestions: "Recommended questions",
    applyFirstQuestion: "पहला question लगाएँ",
    lenormandFreeTitle: "Free Lenormand prompt",
    lenormandFreeDescription: "Question लिखते ही उसी theme का prompt और reading flow खुलता है.",
    defaultQuestionButton: { tarot: "Category default question", lenormand: "Lenormand default question" },
    completeSuffix: "complete",
    includeReversed: "Reversals शामिल करें",
    backToQuestion: "← Question पर लौटें",
    resetStart: "Start over",
    otherSpread: "Other spread",
    spreadBoardHint: "जिस क्रम में intuition खींचे, उसी क्रम में cards खोलें.",
    combinationReading: "Combination reading",
    positionMeaning: "Position meaning",
    drawCard: { tarot: "Card draw करें", lenormand: "Lenormand cards draw करें" },
    fullDeck: { open: "Full deck से चुनें", close: "Full deck list बंद करें" },
    selectedCards: "Selected cards",
    lenormandLabel: "Lenormand",
    changeDirection: "Direction बदलें",
    notSelected: "अभी चयन नहीं हुआ.",
    promptMap: { tarot: "AI consultation prompt map", lenormand: "Lenormand prompt map" },
    oracleMap: "Cards से बना oracle map",
    outputTitle: { tarot: "Copy करने के लिए AI oracle prompt", lenormand: "Copy करने के लिए free Lenormand prompt" },
    tune: {
      consultLabel: "Consultation tone बढ़ाएँ",
      consultInstruction: "पूरे उत्तर को ऐसे बहने दें जैसे कोई वास्तविक reader सामने बैठे प्रश्नकर्ता से बात कर रहा हो. Card names से पहले question context, position meaning और card relationships समझाएँ, और हर paragraph के अंत में प्रश्नकर्ता की agency वापस दिलाएँ.",
      practicalLabel: "More practical",
      practicalInstruction: "Symbolic interpretation के बाद realistic judgment standards और action order जोड़ें. Legal, medical, investment, pregnancy या exam result जैसे sensitive topics को reference guidance की तरह रखें और expert consultation सुझाएँ.",
      warmLabel: "Warmer",
      warmInstruction: "Answer की emotional temperature को नरम करें, comfort और choices जोड़ें ताकि anxious questioner साँस ले सके. Fear-inducing wording या fixed future prediction से बचें.",
    },
    regenerateSameCards: "Same cards से फिर weave करें",
    redrawCards: "Cards फिर खोलें",
    chooseAnotherSpread: "Another spread चुनें",
    restartFromBeginning: "Beginning से restart",
    guideArticles: [
      { title: "क्या व्यवस्थित होता है", paragraphs: ["Question topic, chosen spread और card direction मिलकर ऐसा prompt flow बनाते हैं जिसे tarot consultation में तुरंत इस्तेमाल किया जा सके. Lenormand event order और action clues पढ़ता है; tarot emotional layers और symbolic texture को गहराई से देखता है."] },
      { title: "कैसे पढ़ें", paragraphs: ["Question जितना specific होगा, result vague luck से हटकर current situation, repeated signs, turning clues और realistic action की ओर साफ होगा. Free Lenormand flow sorting के लिए है; paid oracle prompt longer consultation language और tuning instructions के लिए अच्छा है."] },
      { title: "ध्यान रखें", paragraphs: ["Result entertainment और self-reflection के लिए है. Medical, legal, investment, pregnancy या admissions जैसे high-impact decisions में केवल reading से निर्णय न लें; real information और qualified expert consultation भी देखें."] },
      { title: "अच्छा question कैसे बनाएँ", paragraphs: ["सिर्फ ending पूछने से बेहतर है कि heart और action को साथ पूछें. Prompt copy करने के बाद current situation, दोनों पक्षों की feelings और realistic options जोड़ें.", "Same cards भी timing और attitude के अनुसार अलग message दिखा सकते हैं. Result को pressure नहीं, आज साफ करने वाली एक sentence और घटाने वाली एक action की तरह लें.", "Beginners one-card या three-card spread से direction पकड़ सकते हैं; complex relationship या career concerns में five-plus cards background और action clues अलग करते हैं.", "Inputs question sentence, concern category, chosen spread और drawn cards हैं. Prompt आपके लिए judgment नहीं करता; यह question को clearer बनाता है."] },
    ],
    spreadLibraryTitle: "Other spreads देखें",
    close: "Close",
    spreadSearchPlaceholder: "Spread search",
    recommendedTheme: (categoryName) => `Recommended theme: ${categoryName}`,
    countAll: "All",
    recommendedBadge: "Recommended",
    noSpreads: "Filters से matching spread नहीं मिला. कृपया filters बदलें.",
    subscriptionPassLabel: (tier) => `${tier} pass`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `KRW ${formatCreditWonNumber(amount)} value`,
  },
  es: {
    heroBadge: "Atelier de prompts de oráculo AI",
    heroSteps: ["Eleva la pregunta", "Abre las cartas", "Llévala a prompt AI"],
    questionTitle: { tarot: "Cuéntame la pregunta que llevas dentro", lenormand: "Pregunta" },
    questionDescription: { tarot: "El tarot se prepara para desplegar tu propia historia.", lenormand: "Escribe un tema y mira el flujo con seis cartas Lenormand y pistas de acción." },
    categoryTitle: "Categoría de pregunta",
    autoDetected: (categoryName) => `Detectado: ${categoryName}`,
    autoDetectButton: "Detectar",
    selectedSpread: "Tirada seleccionada",
    cardCount: (count) => `${count} cartas`,
    consultationCategory: (categoryName) => `Categoría de consulta ${categoryName}`,
    changeSpread: "Cambiar tirada",
    recommendedQuestions: "Preguntas recomendadas",
    applyFirstQuestion: "Aplicar primera pregunta",
    lenormandFreeTitle: "Prompt Lenormand gratis",
    lenormandFreeDescription: "Escribe una pregunta y se abrirá el flujo de prompt adecuado para ese tema.",
    defaultQuestionButton: { tarot: "Pregunta base de categoría", lenormand: "Pregunta base Lenormand" },
    completeSuffix: "completo",
    includeReversed: "Incluir invertidas",
    backToQuestion: "← Volver a la pregunta",
    resetStart: "Empezar de nuevo",
    otherSpread: "Otra tirada",
    spreadBoardHint: "Saca las cartas en el orden que marque tu intuición.",
    combinationReading: "Lectura combinada",
    positionMeaning: "Significado de posición",
    drawCard: { tarot: "Sacar carta", lenormand: "Sacar cartas Lenormand" },
    fullDeck: { open: "Elegir del mazo completo", close: "Cerrar lista del mazo" },
    selectedCards: "Cartas seleccionadas",
    lenormandLabel: "Lenormand",
    changeDirection: "Cambiar dirección",
    notSelected: "Aún no seleccionado.",
    promptMap: { tarot: "Mapa de prompt de consulta AI", lenormand: "Mapa de prompt Lenormand" },
    oracleMap: "Mapa oracular creado por las cartas",
    outputTitle: { tarot: "Prompt de oráculo AI listo para copiar", lenormand: "Prompt Lenormand gratis listo para copiar" },
    tune: {
      consultLabel: "Reforzar tono de consulta",
      consultInstruction: "Haz que toda la respuesta fluya como si una tarotista real hablara a la persona consultante. Explica primero el contexto de la pregunta, las posiciones y la relación entre cartas, y cierra cada párrafo devolviendo agencia a la persona.",
      practicalLabel: "Más realista",
      practicalInstruction: "Después de la interpretación simbólica, añade criterios de juicio realistas y orden de acción. En temas legales, médicos, inversión, embarazo o resultados, exprésalo como guía de referencia y recomienda consulta experta.",
      warmLabel: "Más cálido",
      warmInstruction: "Suaviza la temperatura emocional, añade consuelo y opciones para que la persona ansiosa pueda respirar. Evita expresiones de miedo o predicciones fijas.",
    },
    regenerateSameCards: "Volver a tejer con las mismas cartas",
    redrawCards: "Abrir cartas otra vez",
    chooseAnotherSpread: "Elegir otra tirada",
    restartFromBeginning: "Reiniciar desde el principio",
    guideArticles: [
      { title: "Qué se ordena", paragraphs: ["El tema, la tirada elegida y la dirección de las cartas se unen en un flujo de prompt listo para una consulta de tarot. Lenormand lee secuencia y pistas de acción; el tarot ilumina capas emocionales y textura simbólica."] },
      { title: "Cómo leerlo", paragraphs: ["Cuanto más concreta sea la pregunta, más claro será el resultado en situación actual, señales repetidas, pistas de cambio y acción realista. Lenormand gratis sirve para ordenar el flujo; el prompt de oráculo de pago sirve para textos más largos y ajustes."] },
      { title: "Nota importante", paragraphs: ["El resultado es para entretenimiento y autoobservación. En decisiones de alto impacto como salud, derecho, inversión, embarazo o admisiones, no decidas solo con esta lectura; revisa información real y consulta a una persona experta."] },
      { title: "Cómo formular bien", paragraphs: ["Una pregunta que une emoción y acción se lee con más estabilidad que una que solo pide el final. Después de copiar el prompt, añade situación actual, emociones y opciones realistas.", "Las mismas cartas pueden cambiar según el momento y la actitud. Usa el resultado como una frase a aclarar hoy y una acción a reducir.", "Quien empieza puede usar tiradas de una o tres cartas; temas complejos de relación o carrera suelen beneficiarse de cinco cartas o más.", "Los datos son la pregunta, el tema, la tirada y las cartas. El prompt no decide por ti; limpia la pregunta para que puedas mirar mejor."] },
    ],
    spreadLibraryTitle: "Ver otras tiradas",
    close: "Cerrar",
    spreadSearchPlaceholder: "Buscar tirada",
    recommendedTheme: (categoryName) => `Tema recomendado: ${categoryName}`,
    countAll: "Todo",
    recommendedBadge: "Recomendada",
    noSpreads: "No hay tiradas que coincidan. Ajusta los filtros.",
    subscriptionPassLabel: (tier) => `pase ${tier}`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `valor KRW ${formatCreditWonNumber(amount)}`,
  },
  fr: {
    heroBadge: "Atelier de prompts d'oracle IA",
    heroSteps: ["Élever la question", "Ouvrir les cartes", "En faire un prompt IA"],
    questionTitle: { tarot: "Confiez la question dans votre coeur", lenormand: "Question" },
    questionDescription: { tarot: "Le tarot se prépare à déplier votre propre histoire.", lenormand: "Saisissez un thème et lisez le flux avec six cartes Lenormand et des pistes d'action." },
    categoryTitle: "Catégorie de question",
    autoDetected: (categoryName) => `Détection: ${categoryName}`,
    autoDetectButton: "Détection auto",
    selectedSpread: "Tirage sélectionné",
    cardCount: (count) => `${count} cartes`,
    consultationCategory: (categoryName) => `Catégorie de consultation ${categoryName}`,
    changeSpread: "Changer de tirage",
    recommendedQuestions: "Questions recommandées",
    applyFirstQuestion: "Appliquer la première",
    lenormandFreeTitle: "Prompt Lenormand gratuit",
    lenormandFreeDescription: "Écrivez une question et le flux de prompt adapté au thème s'ouvre aussitôt.",
    defaultQuestionButton: { tarot: "Question par défaut de catégorie", lenormand: "Question Lenormand par défaut" },
    completeSuffix: "terminé",
    includeReversed: "Inclure les renversées",
    backToQuestion: "← Revenir à la question",
    resetStart: "Recommencer",
    otherSpread: "Autre tirage",
    spreadBoardHint: "Tirez les cartes dans l'ordre où votre intuition vous appelle.",
    combinationReading: "Lecture combinée",
    positionMeaning: "Sens des positions",
    drawCard: { tarot: "Tirer une carte", lenormand: "Tirer les cartes Lenormand" },
    fullDeck: { open: "Choisir dans le jeu complet", close: "Fermer la liste du jeu" },
    selectedCards: "Cartes sélectionnées",
    lenormandLabel: "Lenormand",
    changeDirection: "Changer le sens",
    notSelected: "Pas encore sélectionné.",
    promptMap: { tarot: "Carte du prompt de consultation IA", lenormand: "Carte du prompt Lenormand" },
    oracleMap: "Carte oraculaire créée par les cartes",
    outputTitle: { tarot: "Prompt d'oracle IA prêt à copier", lenormand: "Prompt Lenormand gratuit prêt à copier" },
    tune: {
      consultLabel: "Renforcer le ton de consultation",
      consultInstruction: "Faites couler toute la réponse comme si une lectrice réelle parlait à la personne en face. Expliquez d'abord le contexte, le sens des positions et les liens entre cartes, puis terminez chaque paragraphe en rendant du pouvoir d'action à la personne.",
      practicalLabel: "Plus concret",
      practicalInstruction: "Après l'interprétation symbolique, ajoutez des critères réalistes et un ordre d'action. Pour les sujets juridiques, médicaux, financiers, grossesse ou résultats, gardez une guidance de référence et conseillez un expert.",
      warmLabel: "Plus chaleureux",
      warmInstruction: "Adoucissez la température émotionnelle, ajoutez du réconfort et des options pour que la personne anxieuse puisse respirer. Évitez les formules effrayantes ou les prédictions fixes.",
    },
    regenerateSameCards: "Retisser avec les mêmes cartes",
    redrawCards: "Rouvrir les cartes",
    chooseAnotherSpread: "Choisir un autre tirage",
    restartFromBeginning: "Repartir du début",
    guideArticles: [
      { title: "Ce qui est organisé", paragraphs: ["Le thème, le tirage choisi et l'orientation des cartes sont reliés en un flux de prompt prêt pour une consultation de tarot. Lenormand lit la séquence et les pistes d'action; le tarot éclaire les couches émotionnelles et la texture symbolique."] },
      { title: "Comment lire", paragraphs: ["Plus la question est précise, plus le résultat se clarifie autour de la situation actuelle, des signes répétés, des pistes de bascule et de l'action réaliste. Lenormand gratuit sert à ordonner le flux; le prompt d'oracle payant convient aux textes plus longs et aux consignes d'ajustement."] },
      { title: "À garder en tête", paragraphs: ["Le résultat sert au divertissement et à l'introspection. Pour les décisions à fort impact comme santé, droit, investissement, grossesse ou admission, ne décidez pas seulement avec cette lecture; vérifiez les faits et consultez un spécialiste."] },
      { title: "Poser une bonne question", paragraphs: ["Une question qui relie ém et action se lit mieux qu'une demande de résultat seul. Après la copie du prompt, ajoutez la situation actuelle, les émotions et les options réalistes.", "Les mêmes cartes changent selon le moment et l'attitude. Utilisez le résultat comme une phrase à clarifier aujourd'hui et une action à réduire.", "Les débutants peuvent commencer avec une ou trois cartes; les questions relationnelles ou professionnelles complexes gagnent souvent à utiliser cinq cartes ou plus.", "Les entrées sont la question, le thème, le tirage et les cartes. Le prompt ne décide pas à votre place; il clarifie la question."] },
    ],
    spreadLibraryTitle: "Voir d'autres tirages",
    close: "Fermer",
    spreadSearchPlaceholder: "Rechercher un tirage",
    recommendedTheme: (categoryName) => `Thème recommandé: ${categoryName}`,
    countAll: "Tout",
    recommendedBadge: "Recommandé",
    noSpreads: "Aucun tirage ne correspond. Ajustez les filtres.",
    subscriptionPassLabel: (tier) => `pass ${tier}`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `valeur KRW ${formatCreditWonNumber(amount)}`,
  },
  de: {
    heroBadge: "KI-Orakel-Prompt-Atelier",
    heroSteps: ["Frage erheben", "Karten öffnen", "Zum KI-Prompt formen"],
    questionTitle: { tarot: "Erzähle die Frage in deinem Herzen", lenormand: "Frage" },
    questionDescription: { tarot: "Tarot bereitet sich vor, deine eigene Geschichte zu entfalten.", lenormand: "Gib ein Thema ein und lies den Verlauf mit sechs Lenormandkarten und Handlungshinweisen." },
    categoryTitle: "Fragenkategorie",
    autoDetected: (categoryName) => `Automatisch erkannt: ${categoryName}`,
    autoDetectButton: "Automatisch",
    selectedSpread: "Ausgewählte Legung",
    cardCount: (count) => `${count} Karten`,
    consultationCategory: (categoryName) => `Beratungskategorie ${categoryName}`,
    changeSpread: "Legung ändern",
    recommendedQuestions: "Empfohlene Fragen",
    applyFirstQuestion: "Erste Frage übernehmen",
    lenormandFreeTitle: "Kostenloser Lenormand-Prompt",
    lenormandFreeDescription: "Schreibe eine Frage und der passende Promptfluss öffnet sich sofort.",
    defaultQuestionButton: { tarot: "Standardfrage der Kategorie", lenormand: "Lenormand-Standardfrage" },
    completeSuffix: "fertig",
    includeReversed: "Umkehrungen einschließen",
    backToQuestion: "← Zur Frage",
    resetStart: "Neu beginnen",
    otherSpread: "Andere Legung",
    spreadBoardHint: "Ziehe die Karten in der Reihenfolge, die deine Intuition wählt.",
    combinationReading: "Kombinationslesung",
    positionMeaning: "Positionsbedeutung",
    drawCard: { tarot: "Karte ziehen", lenormand: "Lenormandkarten ziehen" },
    fullDeck: { open: "Aus ganzem Deck wählen", close: "Deckliste schließen" },
    selectedCards: "Ausgewählte Karten",
    lenormandLabel: "Lenormand",
    changeDirection: "Richtung ändern",
    notSelected: "Noch nicht gewählt.",
    promptMap: { tarot: "KI-Beratungs-Promptkarte", lenormand: "Lenormand-Promptkarte" },
    oracleMap: "Orakelkarte der Karten",
    outputTitle: { tarot: "KI-Orakel-Prompt zum Kopieren", lenormand: "Kostenloser Lenormand-Prompt zum Kopieren" },
    tune: {
      consultLabel: "Beratungston stärken",
      consultInstruction: "Lass die Antwort klingen, als würde eine echte Leserin direkt zur fragenden Person sprechen. Erkläre zuerst Kontext, Positionen und Kartenbeziehungen und schließe jeden Absatz so, dass die Person ihre Handlungskraft zurückgewinnt.",
      practicalLabel: "Praktischer machen",
      practicalInstruction: "Füge nach der Symboldeutung realistische Entscheidungskriterien und eine Handlungsreihenfolge hinzu. Bei Recht, Medizin, Investitionen, Schwangerschaft oder Ergebnissen nur als Orientierung formulieren und fachliche Beratung empfehlen.",
      warmLabel: "Wärmer machen",
      warmInstruction: "Mache den Ton weicher, füge Trost und Optionen hinzu, damit eine verunsicherte Person wieder atmen kann. Vermeide angstmachende Worte oder feste Zukunftsvorhersagen.",
    },
    regenerateSameCards: "Mit denselben Karten neu weben",
    redrawCards: "Karten erneut öffnen",
    chooseAnotherSpread: "Andere Legung wählen",
    restartFromBeginning: "Von vorn beginnen",
    guideArticles: [
      { title: "Was geordnet wird", paragraphs: ["Thema, Legung und Kartenrichtung werden zu einem Promptfluss verbunden, der für eine Tarotberatung bereit ist. Lenormand liest Reihenfolge und Handlungshinweise; Tarot beleuchtet emotionale Schichten und symbolische Textur."] },
      { title: "Wie man liest", paragraphs: ["Je konkreter die Frage, desto klarer wird das Ergebnis zu aktueller Lage, wiederholten Zeichen, Wendepunkten und realistischem Handeln. Kostenloses Lenormand ordnet den Verlauf; der bezahlte Orakel-Prompt eignet sich für längere Beratungstexte und Feinabstimmung."] },
      { title: "Wichtig", paragraphs: ["Das Ergebnis dient Unterhaltung und Selbstreflexion. Bei folgenreichen Entscheidungen zu Gesundheit, Recht, Investitionen, Schwangerschaft oder Prüfungen nicht allein danach entscheiden; reale Informationen prüfen und Fachleute konsultieren."] },
      { title: "Gute Fragen stellen", paragraphs: ["Fragen, die Gefühl und Handlung verbinden, lesen sich stabiler als reine Ergebnisfragen. Ergänze nach dem Kopieren des Prompts aktuelle Situation, Gefühle und realistische Optionen.", "Dieselben Karten können je nach Zeitpunkt und Haltung anders sprechen. Nutze das Ergebnis als einen Satz für heute und eine Handlung, die du reduzieren kannst.", "Einsteiger beginnen gut mit einer oder drei Karten; komplexe Beziehungen oder Karrierethemen profitieren oft von fünf oder mehr Karten.", "Eingaben sind Frage, Thema, Legung und Karten. Der Prompt entscheidet nicht für dich; er klärt die Frage."] },
    ],
    spreadLibraryTitle: "Andere Legungen ansehen",
    close: "Schließen",
    spreadSearchPlaceholder: "Legung suchen",
    recommendedTheme: (categoryName) => `Empfohlenes Thema: ${categoryName}`,
    countAll: "Alle",
    recommendedBadge: "Empfohlen",
    noSpreads: "Keine passende Legung gefunden. Bitte Filter anpassen.",
    subscriptionPassLabel: (tier) => `${tier}-Pass`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `KRW ${formatCreditWonNumber(amount)} Wert`,
  },
  nl: {
    heroBadge: "AI-orakelprompt atelier",
    heroSteps: ["Til de vraag op", "Open de kaarten", "Vorm een AI-prompt"],
    questionTitle: { tarot: "Vertel de vraag in je hart", lenormand: "Vraag" },
    questionDescription: { tarot: "Tarot bereidt zich voor om jouw verhaal te ontvouwen.", lenormand: "Voer een thema in en lees de stroom met zes Lenormandkaarten en actietips." },
    categoryTitle: "Vraagcategorie",
    autoDetected: (categoryName) => `Automatisch herkend: ${categoryName}`,
    autoDetectButton: "Automatisch",
    selectedSpread: "Gekozen spread",
    cardCount: (count) => `${count} kaarten`,
    consultationCategory: (categoryName) => `Consultcategorie ${categoryName}`,
    changeSpread: "Spread wijzigen",
    recommendedQuestions: "Aanbevolen vragen",
    applyFirstQuestion: "Eerste vraag toepassen",
    lenormandFreeTitle: "Gratis Lenormand-prompt",
    lenormandFreeDescription: "Schrijf een vraag en de passende promptstroom opent meteen.",
    defaultQuestionButton: { tarot: "Categorie standaardvraag", lenormand: "Lenormand standaardvraag" },
    completeSuffix: "voltooid",
    includeReversed: "Omgekeerde kaarten",
    backToQuestion: "← Terug naar vraag",
    resetStart: "Opnieuw beginnen",
    otherSpread: "Andere spread",
    spreadBoardHint: "Trek de kaarten in de volgorde die je intuïtie kiest.",
    combinationReading: "Combinatielezing",
    positionMeaning: "Betekenis positie",
    drawCard: { tarot: "Kaart trekken", lenormand: "Lenormandkaarten trekken" },
    fullDeck: { open: "Kiezen uit volledig deck", close: "Volledige decklijst sluiten" },
    selectedCards: "Gekozen kaarten",
    lenormandLabel: "Lenormand",
    changeDirection: "Richting wijzigen",
    notSelected: "Nog niet gekozen.",
    promptMap: { tarot: "AI-consultprompt kaart", lenormand: "Lenormand-prompt kaart" },
    oracleMap: "Orakelkaart gemaakt door de kaarten",
    outputTitle: { tarot: "AI-orakelprompt klaar om te kopiëren", lenormand: "Gratis Lenormand-prompt klaar om te kopiëren" },
    tune: {
      consultLabel: "Consulttoon versterken",
      consultInstruction: "Laat het antwoord vloeien alsof een echte reader spreekt met de vraagsteller voor zich. Leg eerst context, positiebetekenis en kaartrelaties uit en eindig elke alinea met meer eigen regie voor de vraagsteller.",
      practicalLabel: "Praktischer maken",
      practicalInstruction: "Voeg na symbolische uitleg realistische beoordelingscriteria en actiestappen toe. Bij recht, medisch, investering, zwangerschap of uitslagen alleen als referentie formuleren en deskundig advies aanraden.",
      warmLabel: "Warmer maken",
      warmInstruction: "Verzacht de emotionele toon, voeg troost en keuzes toe zodat een angstige vraagsteller kan ademen. Vermijd angsttaal of vaste toekomstvoorspellingen.",
    },
    regenerateSameCards: "Opnieuw weven met dezelfde kaarten",
    redrawCards: "Kaarten opnieuw openen",
    chooseAnotherSpread: "Andere spread kiezen",
    restartFromBeginning: "Vanaf begin opnieuw",
    guideArticles: [
      { title: "Wat wordt geordend", paragraphs: ["Vraagthema, gekozen spread en kaartrichting worden één promptstroom voor tarotconsult. Lenormand leest volgorde en actietips; tarot belicht emotionele lagen en symbolische textuur."] },
      { title: "Hoe te lezen", paragraphs: ["Hoe specifieker de vraag, hoe helderder het resultaat rond huidige situatie, herhaalde signalen, kantelpunten en realistische actie. Gratis Lenormand ordent de stroom; de betaalde orakelprompt past bij langere consultteksten en tuning."] },
      { title: "Let op", paragraphs: ["Het resultaat is voor entertainment en zelfreflectie. Neem bij medische, juridische, investerings-, zwangerschaps- of toelatingsbeslissingen geen besluit op basis van deze reading alleen; check feiten en raadpleeg een expert."] },
      { title: "Goede vragen maken", paragraphs: ["Een vraag die gevoel en actie verbindt leest stabieler dan alleen een eindvraag. Voeg na het kopiëren huidige situatie, gevoelens en realistische opties toe.", "Dezelfde kaarten kunnen anders spreken door timing en houding. Gebruik het resultaat als één zin voor vandaag en één actie om te verminderen.", "Beginners kunnen starten met één of drie kaarten; complexe relaties of carrièrevragen hebben vaak baat bij vijf of meer kaarten.", "Inputs zijn vraag, thema, spread en kaarten. De prompt beslist niet voor je; hij maakt de vraag helderder."] },
    ],
    spreadLibraryTitle: "Andere spreads bekijken",
    close: "Sluiten",
    spreadSearchPlaceholder: "Spread zoeken",
    recommendedTheme: (categoryName) => `Aanbevolen thema: ${categoryName}`,
    countAll: "Alles",
    recommendedBadge: "Aanbevolen",
    noSpreads: "Geen passende spreads. Pas de filters aan.",
    subscriptionPassLabel: (tier) => `${tier}-pass`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `KRW ${formatCreditWonNumber(amount)} waarde`,
  },
  ms: {
    heroBadge: "Atelier prompt oracle AI",
    heroSteps: ["Angkat soalan", "Buka kad", "Jadi prompt AI"],
    questionTitle: { tarot: "Ceritakan soalan dalam hati anda", lenormand: "Soalan" },
    questionDescription: { tarot: "Tarot sedang bersedia membuka cerita anda sendiri.", lenormand: "Masukkan tema dan baca aliran dengan enam kad Lenormand serta petunjuk tindakan." },
    categoryTitle: "Kategori soalan",
    autoDetected: (categoryName) => `Dikesan automatik: ${categoryName}`,
    autoDetectButton: "Kesan automatik",
    selectedSpread: "Spread dipilih",
    cardCount: (count) => `${count} kad`,
    consultationCategory: (categoryName) => `Kategori konsultasi ${categoryName}`,
    changeSpread: "Tukar spread",
    recommendedQuestions: "Soalan cadangan",
    applyFirstQuestion: "Guna soalan pertama",
    lenormandFreeTitle: "Prompt Lenormand percuma",
    lenormandFreeDescription: "Tulis soalan dan aliran prompt yang sesuai dengan tema akan terbuka segera.",
    defaultQuestionButton: { tarot: "Soalan lalai kategori", lenormand: "Soalan lalai Lenormand" },
    completeSuffix: "selesai",
    includeReversed: "Sertakan terbalik",
    backToQuestion: "← Kembali ke soalan",
    resetStart: "Mula semula",
    otherSpread: "Spread lain",
    spreadBoardHint: "Cabut kad mengikut urutan yang ditarik oleh intuisi.",
    combinationReading: "Bacaan gabungan",
    positionMeaning: "Makna posisi",
    drawCard: { tarot: "Cabut kad", lenormand: "Cabut kad Lenormand" },
    fullDeck: { open: "Pilih daripada dek penuh", close: "Tutup senarai dek penuh" },
    selectedCards: "Kad dipilih",
    lenormandLabel: "Lenormand",
    changeDirection: "Tukar arah",
    notSelected: "Belum dipilih.",
    promptMap: { tarot: "Peta prompt konsultasi AI", lenormand: "Peta prompt Lenormand" },
    oracleMap: "Peta oracle daripada kad",
    outputTitle: { tarot: "Prompt oracle AI sedia disalin", lenormand: "Prompt Lenormand percuma sedia disalin" },
    tune: {
      consultLabel: "Kuatkan nada konsultasi",
      consultInstruction: "Biarkan seluruh jawapan mengalir seperti reader sebenar bercakap dengan penanya di hadapan. Terangkan konteks soalan, makna posisi dan hubungan kad sebelum nama kad, lalu akhiri setiap perenggan dengan memulangkan kuasa pilihan kepada penanya.",
      practicalLabel: "Lebih praktikal",
      practicalInstruction: "Selepas tafsiran simbolik, tambah piawai penilaian realistik dan susunan tindakan. Untuk undang-undang, perubatan, pelaburan, kehamilan atau keputusan, nyatakan sebagai rujukan dan sarankan konsultasi pakar.",
      warmLabel: "Lebih hangat",
      warmInstruction: "Lembutkan suhu emosi, tambah sokongan dan pilihan supaya penanya yang cemas boleh bernafas. Elakkan kata yang menakutkan atau ramalan masa depan yang muktamad.",
    },
    regenerateSameCards: "Susun semula dengan kad sama",
    redrawCards: "Buka kad semula",
    chooseAnotherSpread: "Pilih spread lain",
    restartFromBeginning: "Mula dari awal",
    guideArticles: [
      { title: "Apa yang disusun", paragraphs: ["Tema soalan, spread dipilih dan arah kad digabung menjadi aliran prompt untuk konsultasi tarot. Lenormand membaca urutan peristiwa dan petunjuk tindakan; tarot menyinari lapisan emosi dan tekstur simbol."] },
      { title: "Cara membaca", paragraphs: ["Semakin khusus soalan, semakin jelas hasil pada situasi semasa, isyarat berulang, petunjuk perubahan dan tindakan realistik. Lenormand percuma sesuai untuk menyusun aliran; prompt oracle berbayar sesuai untuk ayat konsultasi lebih panjang dan arahan penalaan."] },
      { title: "Perhatian", paragraphs: ["Hasil ini untuk hiburan dan refleksi diri. Untuk keputusan besar seperti perubatan, undang-undang, pelaburan, kehamilan atau kemasukan, jangan buat keputusan hanya daripada bacaan ini; semak maklumat sebenar dan rujuk pakar."] },
      { title: "Membentuk soalan baik", paragraphs: ["Soalan yang menggabungkan hati dan tindakan lebih stabil dibaca daripada soalan yang hanya meminta akhir cerita. Selepas menyalin prompt, tambah situasi semasa, emosi kedua pihak dan pilihan realistik.", "Gabungan kad sama boleh membawa mesej berbeza mengikut masa dan sikap. Gunakan hasil sebagai satu ayat untuk dijernihkan hari ini dan satu tindakan untuk dikurangkan.", "Pemula boleh bermula dengan spread 1 atau 3 kad; isu hubungan atau kerjaya rumit sering lebih jelas dengan 5 kad atau lebih.", "Input ialah soalan, tema, spread dan kad. Prompt tidak membuat keputusan untuk anda; ia menjernihkan soalan."] },
    ],
    spreadLibraryTitle: "Lihat spread lain",
    close: "Tutup",
    spreadSearchPlaceholder: "Cari spread",
    recommendedTheme: (categoryName) => `Tema cadangan: ${categoryName}`,
    countAll: "Semua",
    recommendedBadge: "Cadangan",
    noSpreads: "Tiada spread sepadan. Laraskan penapis.",
    subscriptionPassLabel: (tier) => `pas ${tier}`,
    currency: (amount) => `KRW ${formatWonNumber(amount)}`,
    creditValue: (amount) => `nilai KRW ${formatCreditWonNumber(amount)}`,
  },
};

const CARD_FLOW_COPY: Record<LoadingLocale, CardFlowCopy> = {
  ko: {
    orientation: { upright: "정방향", reversed: "역방향" },
    waiting: [
      "카드가 열리면 질문의 별자리와 포지션별 흐름이 이곳에 떠오릅니다.",
      "지금은 질문과 스프레드에 맞는 첫 문장을 기다리고 있습니다.",
      "직관이 머무는 순서대로 한 장씩 조용히 열어보세요.",
    ],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [
      `${first} ${firstOrientation}에서 열린 첫빛이 ${middle} ${middleOrientation}을 지나며 질문의 중심을 비춥니다.`,
      `현재 조합에는 정방향 ${uprightCount}장, 역방향 ${reversedCount}장의 흐름 속에서 열리는 힘과 머무는 힘의 균형이 드러납니다.`,
      `${lastPosition}에 놓인 ${last}가 이 프롬프트의 마지막 문장과 행동 톤을 정합니다.`,
    ],
  },
  en: {
    orientation: { upright: "Upright", reversed: "Reversed" },
    waiting: ["When the cards open, the question's constellation and each position flow will appear here.", "The first sentence for this question and spread is waiting quietly.", "Open each card in the order your intuition rests."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`The first light opens with ${first} ${firstOrientation}, then passes through ${middle} ${middleOrientation} to illuminate the question's center.`, `This draw holds ${uprightCount} upright and ${reversedCount} reversed cards, showing the balance between opening force and delayed force.`, `${last} in ${lastPosition} shapes the final sentence and action tone of this prompt.`],
  },
  ja: {
    orientation: { upright: "正位置", reversed: "逆位置" },
    waiting: ["カードが開くと、質問の星座と各ポジションの流れがここに浮かびます。", "今は質問とスプレッドに合う最初の一文を静かに待っています。", "直感が留まる順に、一枚ずつ静かに開いてください。"],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`${first} ${firstOrientation}から開いた最初の光が、${middle} ${middleOrientation}を通って質問の中心を照らします。`, `この組み合わせには正位置${uprightCount}枚、逆位置${reversedCount}枚があり、開く力と留まる力の均衡が表れています。`, `${lastPosition}に置かれた${last}が、このプロンプトの最後の一文と行動の温度を整えます。`],
  },
  "zh-CN": {
    orientation: { upright: "正位", reversed: "逆位" },
    waiting: ["卡牌打开后，问题的星图与各位置流向会浮现在这里。", "现在正等待适合这个问题和牌阵的第一句话。", "请按直觉停留的顺序，一张一张安静地打开。"],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`从${first}${firstOrientation}开启的第一道光，会经过${middle}${middleOrientation}照亮问题中心。`, `当前组合中有正位${uprightCount}张、逆位${reversedCount}张，显示打开之力与停滞之力的平衡。`, `位于${lastPosition}的${last}决定这段提示词最后一句和行动语气。`],
  },
  "zh-TW": {
    orientation: { upright: "正位", reversed: "逆位" },
    waiting: ["卡牌打開後，問題的星圖與各位置流向會浮現在這裡。", "現在正等待適合這個問題和牌陣的第一句話。", "請按直覺停留的順序，一張一張安靜地打開。"],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`從${first}${firstOrientation}開啟的第一道光，會經過${middle}${middleOrientation}照亮問題中心。`, `目前組合中有正位${uprightCount}張、逆位${reversedCount}張，顯示打開之力與停滯之力的平衡。`, `位於${lastPosition}的${last}決定這段提示詞最後一句和行動語氣。`],
  },
  vi: {
    orientation: { upright: "Xuôi", reversed: "Ngược" },
    waiting: ["Khi lá bài mở ra, chòm sao câu hỏi và dòng từng vị trí sẽ hiện ở đây.", "Câu đầu tiên cho câu hỏi và trải bài này đang lặng lẽ chờ.", "Hãy mở từng lá theo thứ tự trực giác dừng lại."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`Ánh sáng đầu mở từ ${first} ${firstOrientation}, đi qua ${middle} ${middleOrientation} để soi tâm điểm câu hỏi.`, `Tổ hợp này có ${uprightCount} lá xuôi và ${reversedCount} lá ngược, cho thấy cân bằng giữa lực mở ra và lực còn giữ lại.`, `${last} ở vị trí ${lastPosition} định hình câu cuối và giọng hành động của prompt này.`],
  },
  hi: {
    orientation: { upright: "Upright", reversed: "Reversed" },
    waiting: ["Cards खुलते ही question constellation और position flow यहाँ दिखेंगे.", "यह question और spread अपनी first sentence का शांत इंतज़ार कर रहे हैं.", "Intuition जहाँ रुके, उसी क्रम में cards खोलें."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`First light ${first} ${firstOrientation} से खुलकर ${middle} ${middleOrientation} से गुजरती हुई question center को रोशन करती है.`, `इस draw में ${uprightCount} upright और ${reversedCount} reversed cards हैं, जो opening force और delayed force का balance दिखाते हैं.`, `${lastPosition} में रखा ${last} इस prompt की final sentence और action tone तय करता है.`],
  },
  es: {
    orientation: { upright: "Derecha", reversed: "Invertida" },
    waiting: ["Cuando se abran las cartas, aparecerán aquí la constelación de la pregunta y el flujo de cada posición.", "La primera frase para esta pregunta y tirada está esperando en silencio.", "Abre cada carta en el orden donde descanse tu intuición."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`La primera luz se abre con ${first} ${firstOrientation} y pasa por ${middle} ${middleOrientation} para iluminar el centro de la pregunta.`, `Esta combinación tiene ${uprightCount} cartas derechas y ${reversedCount} invertidas, mostrando el equilibrio entre fuerza abierta y fuerza detenida.`, `${last} en ${lastPosition} define la última frase y el tono de acción de este prompt.`],
  },
  fr: {
    orientation: { upright: "Droite", reversed: "Renversée" },
    waiting: ["Quand les cartes s'ouvrent, la constellation de la question et le flux de chaque position apparaissent ici.", "La première phrase pour cette question et ce tirage attend en silence.", "Ouvrez chaque carte dans l'ordre où votre intuition se pose."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`La première lumière s'ouvre avec ${first} ${firstOrientation}, puis traverse ${middle} ${middleOrientation} pour éclairer le centre de la question.`, `Ce tirage contient ${uprightCount} cartes droites et ${reversedCount} renversées, montrant l'équilibre entre force d'ouverture et force retenue.`, `${last}, placé en ${lastPosition}, règle la dernière phrase et le ton d'action de ce prompt.`],
  },
  de: {
    orientation: { upright: "Aufrecht", reversed: "Umgekehrt" },
    waiting: ["Wenn die Karten sich öffnen, erscheinen hier die Konstellation der Frage und der Fluss jeder Position.", "Der erste Satz für diese Frage und Legung wartet still.", "Öffne jede Karte in der Reihenfolge, in der deine Intuition verweilt."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`Das erste Licht öffnet sich mit ${first} ${firstOrientation} und geht durch ${middle} ${middleOrientation}, um das Zentrum der Frage zu beleuchten.`, `Diese Legung enthält ${uprightCount} aufrechte und ${reversedCount} umgekehrte Karten und zeigt die Balance zwischen Öffnung und Verzögerung.`, `${last} in ${lastPosition} bestimmt den letzten Satz und den Handlungston dieses Prompts.`],
  },
  nl: {
    orientation: { upright: "Rechtop", reversed: "Omgekeerd" },
    waiting: ["Wanneer de kaarten opengaan, verschijnen hier de constellatie van de vraag en de stroom per positie.", "De eerste zin voor deze vraag en spread wacht rustig.", "Open elke kaart in de volgorde waarin je intuïtie blijft rusten."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`Het eerste licht opent met ${first} ${firstOrientation} en gaat via ${middle} ${middleOrientation} naar het centrum van de vraag.`, `Deze trekking heeft ${uprightCount} rechtop en ${reversedCount} omgekeerde kaarten, met balans tussen openende en vertraagde kracht.`, `${last} in ${lastPosition} bepaalt de laatste zin en actietoon van deze prompt.`],
  },
  ms: {
    orientation: { upright: "Tegak", reversed: "Terbalik" },
    waiting: ["Apabila kad dibuka, buruj soalan dan aliran setiap posisi akan muncul di sini.", "Ayat pertama untuk soalan dan spread ini sedang menunggu dengan tenang.", "Buka setiap kad mengikut urutan intuisi anda berhenti."],
    flow: (first, firstOrientation, middle, middleOrientation, lastPosition, last, uprightCount, reversedCount) => [`Cahaya pertama terbuka melalui ${first} ${firstOrientation}, lalu melalui ${middle} ${middleOrientation} untuk menerangi pusat soalan.`, `Cabutan ini mempunyai ${uprightCount} kad tegak dan ${reversedCount} kad terbalik, menunjukkan imbangan antara daya terbuka dan daya tertahan.`, `${last} di ${lastPosition} membentuk ayat akhir dan nada tindakan prompt ini.`],
  },
};

function formatCoinValue(amount: number, copy: PromptMakerUiCopy = PROMPT_MAKER_UI_COPY.ko) {
  return copy.currency(amount);
}

function formatMonthlyCreditValue(amount: number, copy: PromptMakerUiCopy = PROMPT_MAKER_UI_COPY.ko) {
  return copy.creditValue(amount);
}

const TAROT_CARD_POOL_SIZE = 78;
let tarotCardPoolPromise: Promise<OracleCardPick[]> | null = null;

function loadTarotCardPool() {
  tarotCardPoolPromise ||= import("../../../lib/tarot/tarot-cards.mjs").then(({ buildImageCandidates, TAROT_CARDS }) => (
    (TAROT_CARDS as TarotCardSource[])
      .map((card) => ({
        cardCode: String(card?.code || ""),
        cardNameKo: String(card?.nameKo || "알 수 없는 카드"),
        cardNameEn: String(card?.nameEn || "Unknown Card"),
        keywords: Array.isArray(card?.keywords) ? card.keywords.map((value) => String(value)) : [],
        focus: String(card?.focus || "흐름 읽기"),
        image: buildImageCandidates(String(card?.code || ""))[0] || "/tarot-cards/thefool.jpeg",
      }))
      .filter((card) => card.cardCode)
  ));
  return tarotCardPoolPromise;
}

function buildLenormandCardImage(cardNumber: string, cardName: string, symbol: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f8fafc"/><stop offset="0.52" stop-color="#ede9fe"/><stop offset="1" stop-color="#fef3c7"/></linearGradient></defs><rect width="240" height="360" rx="24" fill="url(#g)"/><rect x="16" y="16" width="208" height="328" rx="18" fill="none" stroke="#7c3aed" stroke-width="3" opacity="0.55"/><text x="120" y="58" text-anchor="middle" font-family="serif" font-size="22" fill="#4c1d95">${cardNumber}</text><text x="120" y="176" text-anchor="middle" font-size="74">${symbol}</text><text x="120" y="282" text-anchor="middle" font-family="serif" font-size="24" font-weight="700" fill="#312e81">${cardName}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const LENORMAND_CARD_DATA = [
  ["01", "기수", "Rider", "소식", "방문", "빠른 움직임", "소식과 접근 신호", "♘"],
  ["02", "클로버", "Clover", "작은 행운", "기회", "가벼운 전환", "작지만 유리한 틈", "♣"],
  ["03", "배", "Ship", "이동", "거리", "확장", "멀어지거나 넓어지는 흐름", "⛵"],
  ["04", "집", "House", "안정", "기반", "가족", "안전한 자리와 생활 기반", "⌂"],
  ["05", "나무", "Tree", "성장", "건강", "시간", "천천히 뿌리내리는 흐름", "♧"],
  ["06", "구름", "Clouds", "혼란", "불확실성", "가림", "시야를 흐리는 요소", "☁"],
  ["07", "뱀", "Snake", "복잡함", "우회", "경계", "직선이 아닌 복잡한 길", "♆"],
  ["08", "관", "Coffin", "종료", "멈춤", "정리", "끝내야 열리는 흐름", "▭"],
  ["09", "꽃다발", "Bouquet", "호의", "선물", "좋은 인상", "부드럽게 열리는 호감", "✽"],
  ["10", "낫", "Scythe", "절단", "결단", "급변", "빠르게 잘라낼 지점", "⌁"],
  ["11", "채찍", "Whip", "반복", "논쟁", "압박", "되풀이되는 긴장", "〰"],
  ["12", "새들", "Birds", "대화", "걱정", "소문", "말과 신경 쓰임의 흐름", "♬"],
  ["13", "아이", "Child", "시작", "순수함", "미숙함", "아직 작고 여린 가능성", "◇"],
  ["14", "여우", "Fox", "주의", "전략", "일", "세밀한 경계와 계산", "△"],
  ["15", "곰", "Bear", "힘", "보호", "영향력", "크게 버티는 힘", "⬟"],
  ["16", "별", "Stars", "희망", "방향", "영감", "멀리서 길을 잡는 신호", "✦"],
  ["17", "황새", "Stork", "변화", "이전", "개선", "상태가 바뀌는 움직임", "⇧"],
  ["18", "개", "Dog", "신뢰", "친구", "충성", "믿을 수 있는 연결", "●"],
  ["19", "탑", "Tower", "거리", "기관", "고립", "높은 기준과 분리된 자리", "▥"],
  ["20", "정원", "Garden", "모임", "공개", "사회성", "사람들 앞에 드러나는 흐름", "✿"],
  ["21", "산", "Mountain", "장애", "지연", "막힘", "넘어야 할 큰 저항", "▲"],
  ["22", "갈림길", "Crossroads", "선택", "분기", "대안", "길이 나뉘는 순간", "⌯"],
  ["23", "쥐", "Mice", "소모", "손실", "불안", "조금씩 갉아먹는 누수", "⋯"],
  ["24", "하트", "Heart", "마음", "애정", "끌림", "감정이 살아 있는 자리", "♡"],
  ["25", "반지", "Ring", "약속", "계약", "순환", "묶임과 반복되는 약속", "○"],
  ["26", "책", "Book", "비밀", "지식", "숨은 정보", "아직 열리지 않은 내용", "▤"],
  ["27", "편지", "Letter", "문서", "메시지", "연락", "글로 오가는 소식", "✉"],
  ["28", "남자", "Man", "남성 인물", "주체", "관계 축", "남성적 축 또는 당사자", "♂"],
  ["29", "여자", "Woman", "여성 인물", "주체", "관계 축", "여성적 축 또는 당사자", "♀"],
  ["30", "백합", "Lily", "성숙", "평온", "품위", "차분하게 익은 흐름", "⚜"],
  ["31", "태양", "Sun", "성공", "활력", "명료함", "밝게 드러나는 힘", "☉"],
  ["32", "달", "Moon", "감정", "평판", "직감", "감정과 인상이 흐르는 자리", "☾"],
  ["33", "열쇠", "Key", "해결", "확신", "돌파", "문을 여는 결정적 단서", "⚿"],
  ["34", "물고기", "Fish", "돈", "흐름", "교환", "자원과 거래의 흐름", "♓"],
  ["35", "닻", "Anchor", "고정", "안정", "지속", "쉽게 흔들리지 않는 기준", "⚓"],
  ["36", "십자가", "Cross", "부담", "운명감", "책임", "피하기 어려운 무게", "✚"],
] as const;

const LENORMAND_CARD_POOL: OracleCardPick[] = LENORMAND_CARD_DATA.map(([number, nameKo, nameEn, ...rest]) => {
  const symbol = rest[rest.length - 1];
  const keywords = rest.slice(0, 3);
  const focus = rest[3];
  return {
    cardCode: `L${number}`,
    cardNameKo: nameKo,
    cardNameEn: nameEn,
    keywords,
    focus,
    image: buildLenormandCardImage(number, nameKo, symbol),
  };
});

const PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "promptMaker.001": "레노먼드 6장 흐름",
    "promptMaker.002": "현재 상황",
    "promptMaker.003": "지금 질문의 표면에 드러난 중심 흐름",
    "promptMaker.004": "가까운 배경",
    "promptMaker.005": "이 흐름을 만든 최근 조건과 주변 분위기",
    "promptMaker.006": "반복 신호",
    "promptMaker.007": "계속 되풀이되는 패턴과 확인할 포인트",
    "promptMaker.008": "전환 단서",
    "promptMaker.009": "흐름이 바뀌거나 열리는 계기",
    "promptMaker.010": "행동 단서",
    "promptMaker.011": "줄이거나 늘려야 할 현실 행동",
    "promptMaker.012": "다음 흐름",
    "promptMaker.013": "가까운 다음 장면과 정리 메시지",
    "promptMaker.014": "타로 프롬프트",
    "promptMaker.015": "질문, 스프레드, 카드의 방향을 하나의 섬세한 AI 타로 상담 프롬프트로 엮습니다.",
    "promptMaker.016": "레노먼드 프롬프트",
    "promptMaker.017": "질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.",
  },
} as const;

function promptMakerPageText(key: keyof typeof PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS.ko): string {
  return PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
const LENORMAND_SPREAD: TarotSpread = {
  id: "lenormand-six-flow",
  title: promptMakerPageText("promptMaker.001"),
  category: "special",
  cardCount: 6,
  difficulty: "easy",
  purpose: "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다.",
  positions: [
    { index: 1, label: promptMakerPageText("promptMaker.002"), description: promptMakerPageText("promptMaker.003"), x: 20, y: 30, rotate: -8 },
    { index: 2, label: promptMakerPageText("promptMaker.004"), description: promptMakerPageText("promptMaker.005"), x: 50, y: 18, rotate: 0 },
    { index: 3, label: promptMakerPageText("promptMaker.006"), description: promptMakerPageText("promptMaker.007"), x: 80, y: 30, rotate: 8 },
    { index: 4, label: promptMakerPageText("promptMaker.008"), description: promptMakerPageText("promptMaker.009"), x: 20, y: 70, rotate: -8 },
    { index: 5, label: promptMakerPageText("promptMaker.010"), description: promptMakerPageText("promptMaker.011"), x: 50, y: 82, rotate: 0, emphasis: true },
    { index: 6, label: promptMakerPageText("promptMaker.012"), description: promptMakerPageText("promptMaker.013"), x: 80, y: 70, rotate: 8 },
  ],
  interpretationGuide: [
    "카드를 한 장씩 고립하지 않고 인접 카드와 조합해 문장처럼 읽습니다.",
    "타로식 역방향을 쓰지 않고 카드의 거리, 순서, 반복 신호를 봅니다.",
    "좋고 나쁨보다 어떤 행동을 줄이거나 늘릴지 정리합니다.",
  ],
  tags: ["레노먼드", "6 cards", "무료"],
  mood: "흐름과 행동 단서를 짧고 또렷하게 읽는 레노먼드 라인",
  ritual: "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리하세요.",
};

const LENORMAND_INFO_ITEMS = [
  ["01", "무엇을 확인하나요", "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다. 단정형 예언보다 현재 흐름, 반복 패턴, 다음 행동 후보를 차분히 나누어 읽습니다."],
  ["02", "전통과 이야기", "레노먼드는 19세기 프랑스의 점술가 마드무아젤 르노르망과 연결되어 널리 알려진 36장 카드 전통입니다."],
  ["03", "특징", "카드를 한 장씩 고립해 보기보다 인접 카드와 조합을 문장처럼 이어 읽고, 타로식 역방향을 쓰지 않는 점이 특징입니다."],
  ["04", "입력 전 체크", "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리하세요. 질문 범위와 확인할 포인트를 좁히면 결과를 더 안정적으로 읽을 수 있습니다."],
  ["05", "해석 기준", "좋고 나쁨의 판정보다 어떤 신호가 반복되는지, 어떤 행동을 줄이거나 늘릴지 확인하는 데 초점을 둡니다."],
  ["06", "주의할 점", "의료, 법률, 재무처럼 손실이 큰 결정은 이 결과만으로 확정하지 말고 판단을 정리하는 참고 자료로 사용하세요."],
] as const;

const ORACLE_MODE_META: Record<OracleDeckMode, { title: string; eyebrow: string; description: string; drawLabel: string; deckLabel: string; deckCaption: string; promptLabel: string; outputLabel: string }> = {
  tarot: {
    title: promptMakerPageText("promptMaker.014"),
    eyebrow: "타로",
    description: promptMakerPageText("promptMaker.015"),
    drawLabel: "✦ 카드 뽑기 시작",
    deckLabel: "Tarot Deck",
    deckCaption: "78장 덱에서 한 장씩 뽑아보세요.",
    promptLabel: "✦ AI 오라클 프롬프트 만들기",
    outputLabel: "AI 오라클 프롬프트",
  },
  lenormand: {
    title: promptMakerPageText("promptMaker.016"),
    eyebrow: "레노먼드",
    description: promptMakerPageText("promptMaker.017"),
    drawLabel: "레노먼드 6장 뽑기",
    deckLabel: "Lenormand Deck",
    deckCaption: "36장 레노먼드 덱에서 6장을 뽑아 흐름과 행동 단서를 봅니다.",
    promptLabel: "무료 레노먼드 프롬프트 만들기",
    outputLabel: "복사용 레노먼드 프롬프트",
  },
};

const ORACLE_MODE_META_COPY: Record<LoadingLocale, typeof ORACLE_MODE_META> = {
  ko: ORACLE_MODE_META,
  en: {
    tarot: {
      title: "Tarot Prompt",
      eyebrow: "Tarot",
      description: "Weave your question, spread, and card directions into one refined AI tarot consultation prompt.",
      drawLabel: "Start drawing cards",
      deckLabel: "Tarot Deck",
      deckCaption: "Draw one card at a time from the 78-card deck.",
      promptLabel: "Create AI oracle prompt",
      outputLabel: "AI oracle prompt",
    },
    lenormand: {
      title: "Lenormand Prompt",
      eyebrow: "Lenormand",
      description: "Write a question and the prompt with its reading flow opens around that theme.",
      drawLabel: "Draw 6 Lenormand cards",
      deckLabel: "Lenormand Deck",
      deckCaption: "Draw 6 cards from the 36-card Lenormand deck to read flow and action clues.",
      promptLabel: "Create free Lenormand prompt",
      outputLabel: "Lenormand prompt to copy",
    },
  },
  ja: {
    tarot: {
      title: "タロットプロンプト",
      eyebrow: "タロット",
      description: "質問、スプレッド、カードの向きを、繊細なAIタロット相談プロンプトへ編み上げます。",
      drawLabel: "カードを引き始める",
      deckLabel: "タロットデッキ",
      deckCaption: "78枚のデッキから一枚ずつ引いてください。",
      promptLabel: "AIオラクルプロンプトを作る",
      outputLabel: "AIオラクルプロンプト",
    },
    lenormand: {
      title: "ルノルマンプロンプト",
      eyebrow: "ルノルマン",
      description: "質問を書くと、そのテーマに合うプロンプトと解釈の流れがすぐ開きます。",
      drawLabel: "ルノルマン6枚を引く",
      deckLabel: "ルノルマンデッキ",
      deckCaption: "36枚のルノルマンデッキから6枚を引き、流れと行動の手がかりを見ます。",
      promptLabel: "無料ルノルマンプロンプトを作る",
      outputLabel: "コピー用ルノルマンプロンプト",
    },
  },
  "zh-CN": {
    tarot: {
      title: "塔罗提示词",
      eyebrow: "塔罗",
      description: "将问题、牌阵和卡牌方向编织成细腻的AI塔罗咨询提示词。",
      drawLabel: "开始抽牌",
      deckLabel: "塔罗牌组",
      deckCaption: "从78张牌组中逐张抽取。",
      promptLabel: "生成AI神谕提示词",
      outputLabel: "AI神谕提示词",
    },
    lenormand: {
      title: "雷诺曼提示词",
      eyebrow: "雷诺曼",
      description: "写下问题后，适合该主题的提示词和解读流向会立即打开。",
      drawLabel: "抽6张雷诺曼牌",
      deckLabel: "雷诺曼牌组",
      deckCaption: "从36张雷诺曼牌中抽6张，查看流向和行动线索。",
      promptLabel: "生成免费雷诺曼提示词",
      outputLabel: "可复制的雷诺曼提示词",
    },
  },
  "zh-TW": {
    tarot: {
      title: "塔羅提示詞",
      eyebrow: "塔羅",
      description: "將問題、牌陣和卡牌方向編織成細膩的AI塔羅諮詢提示詞。",
      drawLabel: "開始抽牌",
      deckLabel: "塔羅牌組",
      deckCaption: "從78張牌組中逐張抽取。",
      promptLabel: "生成AI神諭提示詞",
      outputLabel: "AI神諭提示詞",
    },
    lenormand: {
      title: "雷諾曼提示詞",
      eyebrow: "雷諾曼",
      description: "寫下問題後，適合該主題的提示詞和解讀流向會立即開啟。",
      drawLabel: "抽6張雷諾曼牌",
      deckLabel: "雷諾曼牌組",
      deckCaption: "從36張雷諾曼牌中抽6張，查看流向和行動線索。",
      promptLabel: "生成免費雷諾曼提示詞",
      outputLabel: "可複製的雷諾曼提示詞",
    },
  },
  vi: {
    tarot: {
      title: "Prompt Tarot",
      eyebrow: "Tarot",
      description: "Kết câu hỏi, trải bài và hướng lá thành một prompt tư vấn tarot AI tinh tế.",
      drawLabel: "Bắt đầu rút bài",
      deckLabel: "Bộ Tarot",
      deckCaption: "Rút từng lá từ bộ 78 lá.",
      promptLabel: "Tạo prompt AI oracle",
      outputLabel: "Prompt AI oracle",
    },
    lenormand: {
      title: "Prompt Lenormand",
      eyebrow: "Lenormand",
      description: "Viết câu hỏi và dòng prompt phù hợp với chủ đề sẽ mở ngay.",
      drawLabel: "Rút 6 lá Lenormand",
      deckLabel: "Bộ Lenormand",
      deckCaption: "Rút 6 lá từ bộ Lenormand 36 lá để đọc dòng chảy và manh mối hành động.",
      promptLabel: "Tạo prompt Lenormand miễn phí",
      outputLabel: "Prompt Lenormand để sao chép",
    },
  },
  hi: {
    tarot: {
      title: "Tarot Prompt",
      eyebrow: "Tarot",
      description: "Question, spread और card directions को refined AI tarot consultation prompt में बुनें.",
      drawLabel: "Cards draw शुरू करें",
      deckLabel: "Tarot Deck",
      deckCaption: "78-card deck से एक-एक card draw करें.",
      promptLabel: "AI oracle prompt बनाएँ",
      outputLabel: "AI oracle prompt",
    },
    lenormand: {
      title: "Lenormand Prompt",
      eyebrow: "Lenormand",
      description: "Question लिखते ही theme के अनुरूप prompt और reading flow खुलता है.",
      drawLabel: "6 Lenormand cards draw करें",
      deckLabel: "Lenormand Deck",
      deckCaption: "36-card Lenormand deck से 6 cards draw करके flow और action clues देखें.",
      promptLabel: "Free Lenormand prompt बनाएँ",
      outputLabel: "Copy-ready Lenormand prompt",
    },
  },
  es: {
    tarot: {
      title: "Prompt de tarot",
      eyebrow: "Tarot",
      description: "Une pregunta, tirada y direcciones de cartas en un prompt AI de consulta de tarot.",
      drawLabel: "Empezar a sacar cartas",
      deckLabel: "Mazo de tarot",
      deckCaption: "Saca una carta cada vez del mazo de 78 cartas.",
      promptLabel: "Crear prompt de oráculo AI",
      outputLabel: "Prompt de oráculo AI",
    },
    lenormand: {
      title: "Prompt Lenormand",
      eyebrow: "Lenormand",
      description: "Escribe una pregunta y se abre el prompt con su flujo de lectura.",
      drawLabel: "Sacar 6 cartas Lenormand",
      deckLabel: "Mazo Lenormand",
      deckCaption: "Saca 6 cartas del mazo Lenormand de 36 para leer flujo y pistas de acción.",
      promptLabel: "Crear prompt Lenormand gratis",
      outputLabel: "Prompt Lenormand para copiar",
    },
  },
  fr: {
    tarot: {
      title: "Prompt de tarot",
      eyebrow: "Tarot",
      description: "Tissez question, tirage et orientations des cartes en un prompt IA de consultation tarot.",
      drawLabel: "Commencer le tirage",
      deckLabel: "Jeu de tarot",
      deckCaption: "Tirez une carte à la fois dans le jeu de 78 cartes.",
      promptLabel: "Créer le prompt d'oracle IA",
      outputLabel: "Prompt d'oracle IA",
    },
    lenormand: {
      title: "Prompt Lenormand",
      eyebrow: "Lenormand",
      description: "Écrivez une question et le prompt avec son flux de lecture s'ouvre.",
      drawLabel: "Tirer 6 cartes Lenormand",
      deckLabel: "Jeu Lenormand",
      deckCaption: "Tirez 6 cartes du jeu Lenormand de 36 pour lire le flux et les pistes d'action.",
      promptLabel: "Créer le prompt Lenormand gratuit",
      outputLabel: "Prompt Lenormand à copier",
    },
  },
  de: {
    tarot: {
      title: "Tarot-Prompt",
      eyebrow: "Tarot",
      description: "Webe Frage, Legung und Kartenrichtungen zu einem feinen KI-Tarotberatungs-Prompt.",
      drawLabel: "Karten ziehen starten",
      deckLabel: "Tarotdeck",
      deckCaption: "Ziehe eine Karte nach der anderen aus dem 78-Karten-Deck.",
      promptLabel: "KI-Orakel-Prompt erstellen",
      outputLabel: "KI-Orakel-Prompt",
    },
    lenormand: {
      title: "Lenormand-Prompt",
      eyebrow: "Lenormand",
      description: "Schreibe eine Frage und der passende Prompt mit Lesefluss öffnet sich.",
      drawLabel: "6 Lenormandkarten ziehen",
      deckLabel: "Lenormanddeck",
      deckCaption: "Ziehe 6 Karten aus dem 36-Karten-Lenormanddeck, um Verlauf und Handlungshinweise zu lesen.",
      promptLabel: "Kostenlosen Lenormand-Prompt erstellen",
      outputLabel: "Lenormand-Prompt zum Kopieren",
    },
  },
  nl: {
    tarot: {
      title: "Tarotprompt",
      eyebrow: "Tarot",
      description: "Weef vraag, spread en kaartrichtingen tot één verfijnde AI-tarotconsultprompt.",
      drawLabel: "Kaarten trekken starten",
      deckLabel: "Tarotdeck",
      deckCaption: "Trek één kaart tegelijk uit het deck van 78 kaarten.",
      promptLabel: "AI-orakelprompt maken",
      outputLabel: "AI-orakelprompt",
    },
    lenormand: {
      title: "Lenormand-prompt",
      eyebrow: "Lenormand",
      description: "Schrijf een vraag en de prompt met leesstroom opent rond dat thema.",
      drawLabel: "6 Lenormandkaarten trekken",
      deckLabel: "Lenormanddeck",
      deckCaption: "Trek 6 kaarten uit het Lenormanddeck van 36 om stroom en actietips te lezen.",
      promptLabel: "Gratis Lenormand-prompt maken",
      outputLabel: "Lenormand-prompt om te kopiëren",
    },
  },
  ms: {
    tarot: {
      title: "Prompt Tarot",
      eyebrow: "Tarot",
      description: "Anyam soalan, spread dan arah kad menjadi prompt konsultasi tarot AI yang halus.",
      drawLabel: "Mula cabut kad",
      deckLabel: "Dek Tarot",
      deckCaption: "Cabut satu kad demi satu daripada dek 78 kad.",
      promptLabel: "Cipta prompt oracle AI",
      outputLabel: "Prompt oracle AI",
    },
    lenormand: {
      title: "Prompt Lenormand",
      eyebrow: "Lenormand",
      description: "Tulis soalan dan prompt dengan aliran bacaan akan terbuka mengikut tema.",
      drawLabel: "Cabut 6 kad Lenormand",
      deckLabel: "Dek Lenormand",
      deckCaption: "Cabut 6 kad daripada dek Lenormand 36 kad untuk membaca aliran dan petunjuk tindakan.",
      promptLabel: "Cipta prompt Lenormand percuma",
      outputLabel: "Prompt Lenormand untuk disalin",
    },
  },
};

const DECK_SLOTS = Array.from({ length: Math.max(TAROT_CARD_POOL_SIZE, LENORMAND_CARD_POOL.length) }, (_, index) => index);

const CARD_COUNT_FILTERS = ["all", 1, 3, 5, 7, 10, 12, 14] as const;

const QUESTION_CATEGORY_OPTIONS: TarotSpreadCategory[] = [
  "love",
  "reunion",
  "third_party",
  "relationship",
  "career",
  "money",
  "family",
  "self",
  "choice",
  "daily",
  "crisis",
  "future",
  "spiritual",
  "power",
  "legal",
  "special",
];

const SENSITIVE_CATEGORY_NOTICE: Partial<Record<TarotSpreadCategory, string>> = {
  crisis: "위기 질문은 공포를 키우지 않고, 멈출 선택과 지금 도움을 청할 지점을 먼저 분리합니다.",
  money: "금전 질문에는 수익이나 투자 판단의 단정 대신, 위험 신호와 관리 기준이 먼저 떠오릅니다.",
  self: "마음 질문은 진단이 아니라 감정의 이름과 회복 행동을 찾는 참고 리딩으로 다룹니다.",
  legal: "법률·송사 질문은 승패나 판결을 단정하지 않고, 기록 정리와 전문가 상담을 돕는 참고용 상징 해석으로만 다룹니다.",
};

const SENSITIVE_CATEGORY_NOTICE_COPY: Record<LoadingLocale, Partial<Record<TarotSpreadCategory, string>>> = {
  ko: SENSITIVE_CATEGORY_NOTICE,
  en: {
    crisis: "Crisis questions separate what to pause and where to seek help now, without feeding fear.",
    money: "Money questions bring up risk signals and management standards before profit or investment conclusions.",
    self: "Mind questions are treated as reflective readings for naming emotions and finding recovery actions, not diagnosis.",
    legal: "Legal questions are symbolic references for organizing records and seeking expert counsel, not predictions of wins or rulings.",
  },
  ja: {
    crisis: "危機の質問では恐れを強めず、止める選択と今助けを求める場所を先に分けます。",
    money: "金運の質問では利益や投資判断を断定せず、危険サインと管理基準を先に見ます。",
    self: "心の質問は診断ではなく、感情の名前と回復行動を見つけるための参考リーディングとして扱います。",
    legal: "法律・訴訟の質問は勝敗や判決を断定せず、記録整理と専門家相談を助ける参考の象徴解釈として扱います。",
  },
  "zh-CN": {
    crisis: "危机问题不放大恐惧，而是先区分该暂停的选择和现在该求助的位置。",
    money: "金钱问题不直接断定收益或投资判断，而是先看风险信号和管理标准。",
    self: "内心问题不是诊断，而是作为命名情绪、寻找恢复行动的参考解读。",
    legal: "法律诉讼问题不断定胜负或判决，只作为整理记录、咨询专家的象征参考。",
  },
  "zh-TW": {
    crisis: "危機問題不放大恐懼，而是先區分該暫停的選擇和現在該求助的位置。",
    money: "金錢問題不直接斷定收益或投資判斷，而是先看風險訊號和管理標準。",
    self: "內心問題不是診斷，而是作為命名情緒、尋找恢復行動的參考解讀。",
    legal: "法律訴訟問題不斷定勝負或判決，只作為整理紀錄、諮詢專家的象徵參考。",
  },
  vi: {
    crisis: "Câu hỏi khủng hoảng không nuôi thêm nỗi sợ; nó tách điều cần dừng và nơi cần tìm trợ giúp lúc này.",
    money: "Câu hỏi tiền bạc đặt tín hiệu rủi ro và tiêu chuẩn quản lý trước kết luận lợi nhuận hay đầu tư.",
    self: "Câu hỏi nội tâm là đọc tham khảo để gọi tên cảm xúc và tìm hành động hồi phục, không phải chẩn đoán.",
    legal: "Câu hỏi pháp lý chỉ là tham khảo biểu tượng để sắp hồ sơ và tìm tư vấn chuyên gia, không quyết định thắng thua.",
  },
  hi: {
    crisis: "Crisis questions डर नहीं बढ़ाते; वे पहले रोकने योग्य choice और मदद माँगने की जगह अलग करते हैं.",
    money: "Money questions profit या investment judgment से पहले risk signals और management standards दिखाते हैं.",
    self: "Mind questions diagnosis नहीं हैं; वे emotions को नाम देने और recovery actions खोजने की reflective reading हैं.",
    legal: "Legal questions wins या rulings तय नहीं करते; वे records organize करने और expert counsel लेने की symbolic reference हैं.",
  },
  es: {
    crisis: "Las preguntas de crisis separan lo que conviene pausar y dónde pedir ayuda ahora, sin alimentar el miedo.",
    money: "Las preguntas de dinero muestran señales de riesgo y criterios de gestión antes de concluir sobre ganancias o inversión.",
    self: "Las preguntas del ánimo se leen como referencia para nombrar emociones y hallar acciones de recuperación, no como diagnóstico.",
    legal: "Las preguntas legales son referencia simbólica para ordenar registros y buscar asesoría experta, no predicciones de fallo.",
  },
  fr: {
    crisis: "Les questions de crise séparent ce qu'il faut suspendre et où demander de l'aide maintenant, sans nourrir la peur.",
    money: "Les questions d'argent font d'abord émerger les signaux de risque et les repères de gestion, pas une conclusion d'investissement.",
    self: "Les questions du coeur sont une lecture de référence pour nommer l'ém et trouver une action de rétablissement, pas un diagnostic.",
    legal: "Les questions juridiques restent une référence symbolique pour organiser les dossiers et consulter un expert, sans prédire verdict ou victoire.",
  },
  de: {
    crisis: "Krisenfragen trennen zuerst, was gestoppt werden sollte und wo jetzt Hilfe gesucht werden kann, ohne Angst zu nähren.",
    money: "Geldfragen zeigen zuerst Risikosignale und Managementmaßstäbe, statt Gewinn oder Investition festzulegen.",
    self: "Seelenfragen sind keine Diagnose, sondern eine Reflexionslesung zum Benennen von Gefühlen und Finden von Erholungsschritten.",
    legal: "Rechtsfragen sind symbolische Hinweise für Unterlagen und Fachberatung, keine Aussage über Sieg oder Urteil.",
  },
  nl: {
    crisis: "Crisisvragen scheiden eerst wat moet pauzeren en waar nu hulp gezocht kan worden, zonder angst te voeden.",
    money: "Geldvragen tonen risicosignalen en beheercriteria vóór winst- of investeringsconclusies.",
    self: "Vragen over het innerlijk zijn geen diagnose, maar een reflectieve reading om emoties te benoemen en herstelacties te vinden.",
    legal: "Juridische vragen zijn symbolische referentie voor dossiers en deskundig advies, geen voorspelling van winst of uitspraak.",
  },
  ms: {
    crisis: "Soalan krisis memisahkan pilihan yang perlu dihentikan dan tempat meminta bantuan sekarang, tanpa membesarkan rasa takut.",
    money: "Soalan wang menaikkan isyarat risiko dan piawai pengurusan sebelum kesimpulan untung atau pelaburan.",
    self: "Soalan hati ialah bacaan reflektif untuk menamakan emosi dan mencari tindakan pemulihan, bukan diagnosis.",
    legal: "Soalan undang-undang hanyalah rujukan simbolik untuk menyusun rekod dan mendapatkan nasihat pakar, bukan ramalan keputusan.",
  },
};

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function resolveCardFlowCopy(locale: LoadingLocale) {
  return CARD_FLOW_COPY[locale] || CARD_FLOW_COPY.ko;
}

function resolveOracleCardName(card: Pick<OracleCardPick, "cardNameKo" | "cardNameEn">, locale: LoadingLocale) {
  return locale === "ko" ? card.cardNameKo : (card.cardNameEn || card.cardNameKo);
}

function resolveOrientationLabel(orientation: TarotCardOrientation, locale: LoadingLocale) {
  return resolveCardFlowCopy(locale).orientation[orientation];
}

function buildQuestionQualityNotice(
  question: string,
  category: TarotSpreadCategory,
  categoryLabel: Record<TarotSpreadCategory, string>,
  copy: QuestionQualityNoticeCopy,
) {
  const text = normalizeText(question);
  if (!text) return copy.empty(categoryLabel[category]);
  if (text.length < 12) return copy.tooShort;
  if (text.length > 170) return copy.tooLong;
  if (!/(어떻게|무엇|뭐|왜|언제|가능성|마음|흐름|조언|선택|해야|될까|일까|할까|괜찮|가능|타이밍|결과|주의)/u.test(text)) {
    return copy.addDirection;
  }
  return copy.ready;
}

function buildFlowLines(cards: DrawnTarotCard[], locale: LoadingLocale) {
  const copy = resolveCardFlowCopy(locale);
  if (!cards.length) {
    return copy.waiting;
  }
  const first = cards[0];
  const middle = cards[Math.floor(cards.length / 2)] || first;
  const last = cards[cards.length - 1] || first;
  const uprightCount = cards.filter((card) => card.orientation === "upright").length;
  const reversedCount = cards.length - uprightCount;
  return copy.flow(
    resolveOracleCardName(first, locale),
    resolveOrientationLabel(first.orientation, locale),
    resolveOracleCardName(middle, locale),
    resolveOrientationLabel(middle.orientation, locale),
    last.positionLabel,
    resolveOracleCardName(last, locale),
    uprightCount,
    reversedCount,
  );
}

/* ─── StepIndicator ─── */
function StepIndicator({ current, steps }: { current: Stage; steps: Array<{ id: Stage; title: string; caption: string; icon: string }> }) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-3xl mx-auto">
      {steps.map((step, idx) => {
        const active = currentIndex === idx;
        const done = currentIndex > idx;
        return (
          <div key={step.id} className="flex items-center gap-0 flex-1">
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${
                active ? "border-[#c084fc] bg-[#c084fc]/20 text-[#e9d5ff] shadow-[0_0_18px_rgba(192,132,252,0.5)]"
                : done ? "border-[#a855f7] bg-[#a855f7]/15 text-[#d8b4fe]"
                : "border-white/20 bg-white/5 text-white/40"
              }`}>
                {done ? "✓" : idx + 1}
              </div>
              <div className={`text-xs font-semibold tracking-wide ${active ? "text-[#e9d5ff]" : done ? "text-[#c4b5fd]" : "text-white/35"}`}>
                {step.title}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-px flex-1 mx-2 transition-all duration-700 ${done ? "bg-gradient-to-r from-[#a855f7] to-[#c084fc]" : "bg-white/15"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Floating Stars Background ─── */
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => i);
  return (
    <>
      {stars.map((i) => (
        <m.div
          key={i}
          className="absolute rounded-full bg-white/80"
          style={{
            width: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
            height: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
            left: `${(i * 1.618 * 13) % 100}%`,
            top: `${(i * 2.236 * 7) % 100}%`,
          }}
          animate={{ opacity: [0.15, 0.9, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.8 + (i % 7) * 0.4, repeat: Infinity, ease: "easeInOut", delay: (i % 11) * 0.2 }}
        />
      ))}
    </>
  );
}

/* ─── Main Component ─── */
export default function TarotPromptMakerPage() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const { ensurePaidAccess, isPaying } = useCoinGate();

  const [oracleMode, setOracleMode] = useState<OracleDeckMode>("tarot");
  const [stage, setStage] = useState<Stage>("question");
  const [question, setQuestion] = useState("");
  const [manualCategory, setManualCategory] = useState<"auto" | TarotSpreadCategory>("auto");
  const [selectedSpreadId, setSelectedSpreadId] = useState(SPREAD_LIBRARY[0]?.id || "");
  const [allowReversed, setAllowReversed] = useState(true);
  const [usedDeckSlots, setUsedDeckSlots] = useState<number[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnTarotCard[]>([]);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [questionStatus, setQuestionStatus] = useState("");
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSpreadPicker, setShowSpreadPicker] = useState(false);
  const [showFullDeck, setShowFullDeck] = useState(false);
  const [tarotCardPool, setTarotCardPool] = useState<OracleCardPick[]>([]);
  const [tarotCardPoolLoading, setTarotCardPoolLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TarotSpreadCategory>("all");
  const [cardCountFilter, setCardCountFilter] = useState<number | "all">("all");
  const uiCopy = PROMPT_MAKER_UI_COPY[locale] || PROMPT_MAKER_UI_COPY.ko;
  const feedbackCopy = PROMPT_MAKER_FEEDBACK_COPY[locale] || PROMPT_MAKER_FEEDBACK_COPY.ko;
  const localizedPromptData = useMemo(() => getLocalizedPromptMakerData(locale), [locale]);
  const localizedSpreadLibrary = useMemo(() => getLocalizedSpreadLibrary(locale), [locale]);
  const categoryLabel = localizedPromptData.categoryLabel;
  const questionChips = localizedPromptData.questionChips;
  const defaultQuestionByCategory = localizedPromptData.defaultQuestionByCategory;
  const allFilterLabel = ALL_FILTER_LABEL[locale] || ALL_FILTER_LABEL.ko;
  const questionPlaceholder = QUESTION_PLACEHOLDER_COPY[locale] || QUESTION_PLACEHOLDER_COPY.ko;
  const lenormandDefaultQuestion = LENORMAND_DEFAULT_QUESTION_COPY[locale] || LENORMAND_DEFAULT_QUESTION_COPY.ko;
  const lenormandRecommendedQuestions = LENORMAND_RECOMMENDED_QUESTIONS[locale] || LENORMAND_RECOMMENDED_QUESTIONS.ko;
  const questionQualityCopy = QUESTION_QUALITY_NOTICE_COPY[locale] || QUESTION_QUALITY_NOTICE_COPY.ko;
  const categoryFilterOptions = useMemo<Array<{ id: "all" | TarotSpreadCategory; label: string }>>(
    () => [
      { id: "all", label: allFilterLabel },
      ...(Object.keys(categoryLabel) as TarotSpreadCategory[]).map((id) => ({
        id,
        label: categoryLabel[id],
      })),
    ],
    [categoryLabel, allFilterLabel],
  );

  const isLenormandMode = oracleMode === "lenormand";
  const stepMeta = useMemo<Array<{ id: Stage; title: string; caption: string; icon: string }>>(
    () => [
      { id: "question", title: uiCopy.heroSteps[0], caption: "", icon: "✦" },
      { id: "draw", title: uiCopy.heroSteps[1], caption: "", icon: "✦" },
      { id: "prompt", title: uiCopy.heroSteps[2], caption: "", icon: "✦" },
    ],
    [uiCopy],
  );
  const oracleModeMetaByMode = ORACLE_MODE_META_COPY[locale] || ORACLE_MODE_META_COPY.ko;
  const oracleModeMeta = oracleModeMetaByMode[oracleMode];
  const localizedLenormandSpread = useMemo<TarotSpread>(() => {
    if (locale === "ko") return LENORMAND_SPREAD;
    const templateSpread = localizedSpreadLibrary[0] || LENORMAND_SPREAD;
    return {
      ...LENORMAND_SPREAD,
      title: oracleModeMetaByMode.lenormand.title,
      purpose: uiCopy.questionDescription.lenormand,
      positions: LENORMAND_SPREAD.positions.map((position, index) => ({
        ...position,
        label: templateSpread.positions[index]?.label || position.label,
        description: templateSpread.positions[index]?.description || position.description,
      })),
      interpretationGuide: templateSpread.interpretationGuide,
      tags: [uiCopy.lenormandLabel, uiCopy.cardCount(LENORMAND_SPREAD.cardCount), feedbackCopy.free],
      mood: uiCopy.lenormandFreeDescription,
      ritual: questionPlaceholder.lenormand,
    };
  }, [feedbackCopy.free, locale, localizedSpreadLibrary, oracleModeMetaByMode, questionPlaceholder.lenormand, uiCopy]);
  const selectedSpread = isLenormandMode ? localizedLenormandSpread : findLocalizedSpreadById(selectedSpreadId, locale);
  const activeCardPool = isLenormandMode ? LENORMAND_CARD_POOL : tarotCardPool;
  const cardPoolReady = isLenormandMode || tarotCardPool.length > 0;
  const activeDeckSize = isLenormandMode ? LENORMAND_CARD_POOL.length : (tarotCardPool.length || TAROT_CARD_POOL_SIZE);
  const detectedCategory = detectTarotCategory(question);
  const selectedQuestionCategory = manualCategory === "auto" ? detectedCategory : manualCategory;

  const effectiveQuestion = useMemo(
    () => normalizeText(question) || (isLenormandMode ? lenormandDefaultQuestion : defaultQuestionByCategory[selectedQuestionCategory]),
    [question, isLenormandMode, selectedQuestionCategory, defaultQuestionByCategory, lenormandDefaultQuestion],
  );

  const flowLines = useMemo(() => buildFlowLines(drawnCards, locale), [drawnCards, locale]);
  const progressText = `${drawnCards.length} / ${selectedSpread.cardCount}`;

  const recommendedSpreads = useMemo(
    () => isLenormandMode ? [LENORMAND_SPREAD] : recommendSpreads(effectiveQuestion, cardCountFilter, selectedQuestionCategory).slice(0, 6),
    [effectiveQuestion, cardCountFilter, isLenormandMode, selectedQuestionCategory],
  );

  const filteredSpreads = useMemo(
    () => localizedSpreadLibrary.filter((spread) => {
      const normalizedQuery = normalizeText(searchQuery).toLowerCase();
      const matchesSearch = !normalizedQuery
        || normalizeText(spread.title).toLowerCase().includes(normalizedQuery)
        || normalizeText(spread.purpose).toLowerCase().includes(normalizedQuery)
        || spread.tags.some((tag) => normalizeText(tag).toLowerCase().includes(normalizedQuery));
      const matchesCategory = categoryFilter === "all" || spread.category === categoryFilter;
      const matchesCount = cardCountFilter === "all" || spread.cardCount === cardCountFilter;
      return matchesSearch && matchesCategory && matchesCount;
    }).sort((left, right) => {
      const leftRecommended = recommendedSpreads.some((item) => item.id === left.id) ? 1 : 0;
      const rightRecommended = recommendedSpreads.some((item) => item.id === right.id) ? 1 : 0;
      if (rightRecommended !== leftRecommended) return rightRecommended - leftRecommended;
      if (left.category === selectedQuestionCategory && right.category !== selectedQuestionCategory) return -1;
      if (right.category === selectedQuestionCategory && left.category !== selectedQuestionCategory) return 1;
      return left.cardCount - right.cardCount;
    }),
    [searchQuery, categoryFilter, cardCountFilter, recommendedSpreads, selectedQuestionCategory, localizedSpreadLibrary],
  );

  const recommendedQuestions = useMemo(
    () => isLenormandMode
      ? lenormandRecommendedQuestions
      : buildLocalizedRecommendedQuestionsForSpread(selectedSpread, selectedQuestionCategory, 5, question, locale),
    [isLenormandMode, lenormandRecommendedQuestions, selectedSpread, selectedQuestionCategory, question, locale],
  );

  const billingPassIncluded = Boolean(billingSnapshot?.freeBySubscription || billingSnapshot?.canUseByPass);
  const billingSubscriptionLabel = billingPassIncluded
    ? getSubscriptionTierLabel(billingSnapshot?.subscriptionTier)
    : "";

  const billingCoinLabel = billingSnapshot
    ? (isLenormandMode ? feedbackCopy.free : billingPassIncluded ? uiCopy.subscriptionPassLabel(billingSubscriptionLabel) : billingSnapshot.requiredCoins > 0 ? formatCoinValue(billingSnapshot.requiredCoins, uiCopy) : feedbackCopy.free)
    : (isLenormandMode ? feedbackCopy.free : feedbackCopy.oneTimePrice);

  const billingStateLabel = billingSnapshot
    ? (isLenormandMode ? feedbackCopy.lenormandFree : billingPassIncluded ? feedbackCopy.passAvailable : billingSnapshot.canAccess ? feedbackCopy.instantUse : feedbackCopy.paymentRequired)
    : (isLenormandMode ? feedbackCopy.lenormandFree : billingLoading ? feedbackCopy.checking : feedbackCopy.disconnected);

  const ensureTarotCardPool = useCallback(async () => {
    if (tarotCardPool.length) return tarotCardPool;
    setTarotCardPoolLoading(true);
    try {
      const nextPool = await loadTarotCardPool();
      setTarotCardPool(nextPool);
      return nextPool;
    } finally {
      setTarotCardPoolLoading(false);
    }
  }, [tarotCardPool]);

  const sensitiveCategoryNoticeByCategory = SENSITIVE_CATEGORY_NOTICE_COPY[locale] || SENSITIVE_CATEGORY_NOTICE_COPY.ko;
  const sensitiveCategoryNotice = isLenormandMode ? "" : sensitiveCategoryNoticeByCategory[selectedQuestionCategory];
  const questionQualityNotice = isLenormandMode
    ? (normalizeText(question) ? feedbackCopy.lenormandQuestionReady : feedbackCopy.lenormandQuestionEmpty)
    : buildQuestionQualityNotice(question, selectedQuestionCategory, categoryLabel, questionQualityCopy);

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  useEffect(() => {
    if (selectedSpreadId) return;
    setSelectedSpreadId(localizedSpreadLibrary[0]?.id || "");
  }, [selectedSpreadId, localizedSpreadLibrary]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // 🔴 unlock-status 를 직접 fetch 하지 않는다. 공용 fetchPaymentEligibility 를 쓰면 (1) 클릭 시점의
  // 이용권 검사와 캐시·in-flight 를 공유해 같은 요청이 두 번 나가지 않고, (2) 내부에서 구독 스냅샷을
  // 저장하므로 이후 유료 클릭이 서버 왕복 없는 즉시 판정 경로(보유자=즉시 통과, 미보유자=즉시 결제창)를
  // 탈 수 있다. 직접 fetch 는 그 신호를 그냥 버려서 두 경로가 모두 죽어 있었다.
  useEffect(() => {
    let active = true;
    async function loadBillingSnapshot() {
      setBillingLoading(true);
      try {
        // coinCost 까지 실제 게이트(ensurePaidAccess)와 똑같이 넘겨야 캐시 키가 일치해 클릭 시
        // 같은 조회가 다시 나가지 않는다(캐시 키에 coins/krw 가 들어간다).
        const result = await fetchPaymentEligibility({
          featureKey: "tarot-prompt-maker",
          reason: feedbackCopy.subscriptionReason,
          coinCost: lookupServerCoinPrice("tarot-prompt-maker"),
        }, { phase: "full" });
        if (!active) return;
        if (!result.ok || !result.data) {
          setBillingSnapshot(null);
          return;
        }
        const eligibility = result.data;
        const raw = (eligibility.raw && typeof eligibility.raw === "object" ? eligibility.raw : {}) as Record<string, unknown>;
        const paymentOptions = (raw.paymentOptions && typeof raw.paymentOptions === "object" ? raw.paymentOptions : {}) as Record<string, unknown>;
        const canUseByPass = Boolean(eligibility.pass.canUse || paymentOptions.canUseByPass || raw.canUseByPass);
        setBillingSnapshot({
          requiredCoins: Number(raw.requiredCoins ?? eligibility.coinCost ?? 0),
          canAccess: Boolean(eligibility.access.canAccess || canUseByPass),
          freeBySubscription: Boolean(raw.freeBySubscription || canUseByPass),
          canUseByPass,
          subscriptionTier: String(raw.subscriptionTier || eligibility.pass.tier || "free"),
          accessReason: String(raw.accessReason || eligibility.access.reason || "").trim().toLowerCase(),
        });
      } catch {
        // 타임아웃/네트워크 실패는 재시도 가능 상태로 두고, 게이팅은 실제 결제 게이트가 서버에서 재판정한다.
        if (!active) return;
        setBillingSnapshot(null);
      } finally {
        if (active) setBillingLoading(false);
      }
    }
    loadBillingSnapshot();
    return () => { active = false; };
  }, [feedbackCopy.subscriptionReason]);

  function resetDrawState() {
    setUsedDeckSlots([]);
    setDrawnCards([]);
    setPromptResult(null);
    setCopied(false);
    setShowFullDeck(false);
  }

  function handleOracleModeChange(nextMode: OracleDeckMode) {
    if (nextMode === oracleMode) return;
    setOracleMode(nextMode);
    resetDrawState();
    setStage("question");
    setFeedback("");
    setQuestionStatus("");
    setShowSpreadPicker(false);
    if (nextMode === "lenormand") setAllowReversed(false);
  }

  function handleSelectSpread(spreadId: string) {
    setSelectedSpreadId(spreadId);
    setFeedback("");
    setShowSpreadPicker(false);
  }

  async function buildPromptForCurrentState() {
    const { buildLenormandPrompt, buildOraclePrompt } = await import("./utils/buildOraclePrompt");
    if (isLenormandMode) return buildLenormandPrompt(selectedSpread, effectiveQuestion, drawnCards, locale);
    return buildOraclePrompt(selectedSpread, effectiveQuestion, drawnCards, { questionCategory: selectedQuestionCategory, locale });
  }

  function handleQuestionChip(text: string) {
    setQuestion(text);
    setFeedback("");
    setQuestionStatus(feedbackCopy.quickQuestionStatus);
  }

  function handleRecommendedQuestion(text: string) {
    setQuestion(text);
    setFeedback("");
    setQuestionStatus(feedbackCopy.recommendedQuestionStatus);
  }

  function handleStartDraw() {
    if (!normalizeText(question)) {
      setFeedback(feedbackCopy.askQuestionFirst);
      return;
    }
    if (!selectedSpreadId) setSelectedSpreadId(localizedSpreadLibrary[0]?.id || "");
    resetDrawState();
    setFeedback("");
    setStage("draw");
    if (!isLenormandMode) void ensureTarotCardPool().catch(() => setFeedback(feedbackCopy.promptError));
  }

  function addDrawnCard(picked: OracleCardPick, deckSlot?: number) {
    if (stage !== "draw") return;
    if (drawnCards.length >= selectedSpread.cardCount) return;
    if (drawnCards.some((card) => card.cardCode === picked.cardCode)) return;
    const position = selectedSpread.positions[drawnCards.length];
    if (!position) return;
    const orientation: TarotCardOrientation = !isLenormandMode && allowReversed && Math.random() < 0.35 ? "reversed" : "upright";
    if (typeof deckSlot === "number") {
      setUsedDeckSlots((prev) => prev.includes(deckSlot) ? prev : [...prev, deckSlot]);
    }
    setDrawnCards((prev) => [
      ...prev,
      {
        slotIndex: position.index,
        positionLabel: position.label,
        positionDescription: position.description,
        cardCode: picked.cardCode,
        cardNameKo: picked.cardNameKo,
        cardNameEn: picked.cardNameEn,
        keywords: picked.keywords,
        orientation,
        orientationLabel: orientation === "reversed" ? "역방향" : "정방향",
        image: picked.image,
        focus: picked.focus,
      },
    ]);
    setFeedback("");
  }

  async function drawCardFromDeckSlot(deckSlot: number) {
    if (usedDeckSlots.includes(deckSlot)) return;
    let nextCardPool: OracleCardPick[];
    try {
      nextCardPool = isLenormandMode ? LENORMAND_CARD_POOL : await ensureTarotCardPool();
    } catch {
      setFeedback(feedbackCopy.promptError);
      return;
    }
    const usedCodes = new Set(drawnCards.map((card) => card.cardCode));
    const availableCards = nextCardPool.filter((card) => !usedCodes.has(card.cardCode));
    if (!availableCards.length) return;
    const picked = availableCards[Math.floor(Math.random() * availableCards.length)];
    addDrawnCard(picked, deckSlot);
  }

  function drawSpecificCard(picked: OracleCardPick) {
    const cardSlot = activeCardPool.findIndex((card) => card.cardCode === picked.cardCode);
    addDrawnCard(picked, cardSlot >= 0 ? cardSlot : undefined);
  }

  function toggleDrawnCardOrientation(cardIndex: number) {
    if (isLenormandMode) return;
    setDrawnCards((prev) => prev.map((card, index) => {
      if (index !== cardIndex) return card;
      const orientation: TarotCardOrientation = card.orientation === "upright" ? "reversed" : "upright";
      return {
        ...card,
        orientation,
        orientationLabel: orientation === "reversed" ? "역방향" : "정방향",
      };
    }));
    setPromptResult(null);
  }

  async function drawCardFromStack() {
    const availableSlots = DECK_SLOTS.slice(0, activeDeckSize).filter((slot) => !usedDeckSlots.includes(slot));
    if (!availableSlots.length) return;
    const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    await drawCardFromDeckSlot(randomSlot);
  }

  async function handleGeneratePrompt() {
    if (isGenerating || isPaying) return;
    if (drawnCards.length !== selectedSpread.cardCount) {
      setFeedback(feedbackCopy.spreadNeedAll(selectedSpread.cardCount));
      return;
    }
    let pendingGenerate: Promise<void> | null = null;
    const generate = async () => {
      const nextPrompt = await buildPromptForCurrentState();
      setPromptResult(nextPrompt);
      setStage("prompt");
      setFeedback("");
    };
    setIsGenerating(true);
    try {
      if (isLenormandMode) {
        await generate();
        showToast(feedbackCopy.lenormandCompleteToast, "success");
        return;
      }
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-prompt-maker",
        cost: lookupServerCoinPrice("tarot-prompt-maker"),
        reason: feedbackCopy.subscriptionReason,
        requestId: `tarot-prompt-library:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: ({ chargedCoins, requiredCoins, balanceAfter, accessSource, subscriptionTier, monthlyCreditsSpent, monthlyBalanceAfter }) => {
          pendingGenerate = generate().then(() => {
            if (accessSource === "subscription" || (chargedCoins <= 0 && requiredCoins > 0 && billingPassIncluded)) {
              showSubscriptionIncludedNotice({
                message: feedbackCopy.subscriptionPromptComplete,
                reason: feedbackCopy.subscriptionReason,
                tier: subscriptionTier || billingSnapshot?.subscriptionTier,
              });
              return;
            }
            if (accessSource === "moonlight_stone") {
              const spentText = monthlyCreditsSpent > 0 ? formatMonthlyCreditValue(monthlyCreditsSpent, uiCopy) : feedbackCopy.passBenefit;
              const balanceText = typeof monthlyBalanceAfter === "number" ? feedbackCopy.passRemaining(formatMonthlyCreditValue(monthlyBalanceAfter, uiCopy)) : "";
              showToast(feedbackCopy.passOpened(spentText, balanceText), "info");
              return;
            }
            if (chargedCoins > 0) showToast(feedbackCopy.paidApproved(formatCoinValue(balanceAfter, uiCopy)), "info");
          });
        },
      });
      if (pendingGenerate) await pendingGenerate;
      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setFeedback(feedbackCopy.loginRequired);
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => { window.location.href = `/login?next=${next}`; }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") { setFeedback(feedbackCopy.insufficientCoins(formatCoinValue(paymentResult.requiredCoins, uiCopy))); return; }
        if (paymentResult.code === "PRICE_NOT_FOUND") { setFeedback(feedbackCopy.priceNotFound); return; }
        if (paymentResult.code === "SERVER_CONFIG_ERROR") { setFeedback(feedbackCopy.serverConfigError); return; }
        if (paymentResult.code === "FEATURE_EXECUTION_FAILED" && paymentResult.refunded) showToast(feedbackCopy.refunded, "info");
        setFeedback(paymentResult.message || feedbackCopy.paymentIncomplete);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : feedbackCopy.promptError);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyPrompt() {
    if (!promptResult?.prompt) return;
    try {
      await navigator.clipboard.writeText(promptResult.prompt);
      setCopied(true);
      showToast(isLenormandMode ? feedbackCopy.lenormandCopied : feedbackCopy.tarotCopied, "success");
    } catch {
      showToast(feedbackCopy.copyFailed, "error");
    }
  }

  async function handleRegeneratePrompt() {
    if (drawnCards.length !== selectedSpread.cardCount) { setFeedback(feedbackCopy.cardSelectionIncomplete); return; }
    setIsGenerating(true);
    try {
      const nextPrompt = await buildPromptForCurrentState();
      setPromptResult(nextPrompt);
      setFeedback("");
      showToast(isLenormandMode ? feedbackCopy.lenormandRegenerated : feedbackCopy.tarotRegenerated, "success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : feedbackCopy.promptError);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleTunePrompt(label: string, instruction: string) {
    if (!promptResult) return;
    const marker = `[리딩 톤 조율 - ${label}]`;
    if (promptResult.prompt.includes(marker)) {
      showToast(feedbackCopy.tuneAlready, "info");
      return;
    }
    setPromptResult({
      ...promptResult,
      prompt: `${promptResult.prompt}\n\n${marker}\n${instruction}`,
    });
    showToast(feedbackCopy.tuneAdded(label), "success");
  }

  function handleRedrawCards() { resetDrawState(); setStage("draw"); setFeedback(""); }
  function handleChooseAnotherSpread() { resetDrawState(); setStage("question"); setShowSpreadPicker(true); setFeedback(""); }
  function handleGoQuestion() { setStage("question"); setFeedback(""); }
  function handleResetAll() { setQuestion(""); setManualCategory("auto"); setSelectedSpreadId(localizedSpreadLibrary[0]?.id || ""); setAllowReversed(true); resetDrawState(); setFeedback(""); setStage("question"); }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 20% 0%, #2d0a4e 0%, transparent 50%), radial-gradient(ellipse at 80% 10%, #1a0a3a 0%, transparent 45%), linear-gradient(180deg, #0d0618 0%, #120828 30%, #0f0520 60%, #080312 100%)",
        fontFamily: "'Noto Serif KR', serif",
      }}
    >
      {/* Star field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <StarField />
      </div>

      {/* Moon top-left */}
      <div className="pointer-events-none absolute -top-6 -left-6 w-36 h-36 rounded-full opacity-80"
        style={{ background: "radial-gradient(circle at 65% 35%, #fffbe8 0%, #f5d88a 30%, #d4a820 55%, transparent 70%)", filter: "blur(1px)", boxShadow: "0 0 60px 20px rgba(212, 168, 32, 0.25)" }}
      />
      {/* Crescent accent */}
      <div className="pointer-events-none absolute top-2 left-2 w-28 h-28 rounded-full"
        style={{ background: "transparent", border: "2px solid rgba(212,168,32,0.3)", clipPath: "ellipse(65% 65% at 40% 50%)", filter: "blur(0.5px)" }}
      />

      {/* Bokeh blobs */}
      <div className="pointer-events-none absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)", filter: "blur(40px)" }} />
      <div className="pointer-events-none absolute bottom-1/3 left-1/5 w-48 h-48 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #ec4899, transparent 70%)", filter: "blur(50px)" }} />

      {/* Floral corner ornaments */}
      <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='160' cy='160' r='60' fill='none' stroke='%23a855f7' stroke-width='0.5' opacity='0.6'/%3E%3Ccircle cx='140' cy='170' r='40' fill='none' stroke='%23c084fc' stroke-width='0.5' opacity='0.5'/%3E%3Ccircle cx='170' cy='140' r='45' fill='none' stroke='%23e879f9' stroke-width='0.5' opacity='0.4'/%3E%3C/svg%3E")`,
      }} />
      <div className="pointer-events-none absolute top-0 left-1/3 w-96 h-32 opacity-15" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 120'%3E%3Cpath d='M0,60 Q100,10 200,60 Q300,110 400,60' fill='none' stroke='%23a855f7' stroke-width='0.8' opacity='0.5'/%3E%3Cpath d='M0,40 Q100,-10 200,40 Q300,90 400,40' fill='none' stroke='%23c084fc' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E")`,
      }} />

      {/* Scrollable content wrapper */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full flex flex-col px-4 py-6 sm:px-6 lg:px-10">

          {/* ── Header ── */}
          <header className="text-center mb-8 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/10 text-[11px] font-semibold tracking-[0.25em] text-[#c4b5fd] uppercase mb-4">
              ✦ {uiCopy.heroBadge} ✦
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: "#fff", textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
              <span className="text-[#e9d5ff]">{uiCopy.heroSteps[0]}</span>
              <span className="mx-3 text-[#c084fc]">→</span>
              <span className="text-[#e9d5ff]">{uiCopy.heroSteps[1]}</span>
              <span className="mx-3 text-[#c084fc]">→</span>
              <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">{uiCopy.heroSteps[2]}</span>
            </h1>
            <p className="mt-3 text-[#c4b5fd]/70 text-sm sm:text-base">
              {oracleModeMeta.description}
            </p>

            {/* Billing badge */}
            <div className="inline-flex items-center gap-3 mt-4 px-4 py-2 rounded-full border border-[#7c3aed]/30 bg-[#1e0a3c]/60 backdrop-blur-sm">
              <span className="text-[#a78bfa] text-xs font-semibold">{billingCoinLabel}</span>
              <span className="w-px h-3 bg-white/20" />
              <span className={`text-xs font-semibold ${billingPassIncluded ? "text-[#34d399]" : "text-[#fbbf24]"}`}>{billingStateLabel}</span>
            </div>
          </header>

          {/* ── Step Indicator ── */}
          <div className="mb-8">
            <StepIndicator current={stage} steps={stepMeta} />
          </div>

          {/* ── Stage Content ── */}
          <div className="flex-1">
            <AnimatePresence mode="wait" initial={false}>

              {/* ━━━ QUESTION STAGE ━━━ */}
              {stage === "question" && (
                <m.div
                  key="question-stage"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="max-w-2xl mx-auto"
                >
                  {/* Question card */}
                  <div
                    className="rounded-3xl p-6 sm:p-8 border border-[#7c3aed]/40"
                    style={{
                      background: "linear-gradient(145deg, rgba(30,10,60,0.92), rgba(20,5,45,0.92))",
                      boxShadow: "0 0 60px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="text-center mb-6">
                      <div className="text-4xl mb-3">🌙</div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#e9d5ff]">{isLenormandMode ? uiCopy.questionTitle.lenormand : uiCopy.questionTitle.tarot}</h2>
                      <p className="mt-2 text-[#a78bfa]/80 text-sm leading-relaxed">
                        {isLenormandMode ? uiCopy.questionDescription.lenormand : uiCopy.questionDescription.tarot}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {(["tarot", "lenormand"] as OracleDeckMode[]).map((mode) => (
                        <button
                          key={`oracle-mode-${mode}`}
                          type="button"
                          onClick={() => handleOracleModeChange(mode)}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all ${oracleMode === mode ? "border-[#f59e0b]/45 bg-[#f59e0b]/12 text-[#fff7ed]" : "border-white/10 bg-white/5 text-[#c4b5fd]/75 hover:bg-white/10"}`}
                        >
                          <span className="block text-[10px] uppercase tracking-[0.18em] opacity-70">{oracleModeMetaByMode[mode].eyebrow}</span>
                          <span className="mt-1 block text-sm font-bold">{oracleModeMetaByMode[mode].title}</span>
                        </button>
                      ))}
                    </div>

                    {/* Textarea */}
                    <div
                      className="rounded-2xl border border-[#6d28d9]/40 p-4 mb-4"
                      style={{ background: "rgba(0,0,0,0.35)" }}
                    >
                      <textarea
                        value={question}
                        onChange={(e) => { setQuestion(e.target.value); setFeedback(""); setQuestionStatus(""); }}
                        maxLength={220}
                        placeholder={isLenormandMode ? questionPlaceholder.lenormand : questionPlaceholder.tarot}
                        className="w-full min-h-[140px] resize-none bg-transparent text-[#f3e8ff] text-sm sm:text-base leading-relaxed outline-none placeholder:text-[#7c3aed]/50"
                      />
                      <div className="flex items-start justify-between gap-3 mt-2">
                        <div className="text-xs leading-relaxed text-[#a78bfa]/75">{questionStatus || questionQualityNotice}</div>
                        <div className="shrink-0 text-xs text-[#6d28d9]/60">{question.length} / 220</div>
                      </div>
                    </div>

                    {!isLenormandMode && (
                      <div
                        className="rounded-2xl border border-[#6d28d9]/35 p-4 mb-4"
                        style={{ background: "rgba(15,5,35,0.48)" }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70">{uiCopy.categoryTitle}</div>
                            <div className="text-xs text-[#a78bfa]/70 mt-1">{uiCopy.autoDetected(categoryLabel[detectedCategory])}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setManualCategory("auto")}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${manualCategory === "auto" ? "border-[#f59e0b]/45 bg-[#f59e0b]/15 text-[#fde68a]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                          >
                            {uiCopy.autoDetectButton}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {QUESTION_CATEGORY_OPTIONS.map((category) => (
                            <button
                              key={`question-category-${category}`}
                              type="button"
                              onClick={() => setManualCategory(category)}
                              className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-all ${manualCategory !== "auto" && selectedQuestionCategory === category ? "border-[#c084fc]/50 bg-[#c084fc]/15 text-[#f3e8ff]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                            >
                              {categoryLabel[category]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick chips */}
                    {!isLenormandMode && <div className="flex flex-wrap gap-2 mb-5">
                      {questionChips.slice(0, 6).map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => handleQuestionChip(chip.text)}
                          className="px-3.5 py-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#c4b5fd] text-xs font-medium hover:bg-[#7c3aed]/20 hover:border-[#7c3aed]/50 transition-all duration-200"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>}

                    {/* Selected spread */}
                    <div
                      className="rounded-2xl border border-[#6d28d9]/35 p-4 mb-5"
                      style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.12), rgba(167,139,250,0.08))" }}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70 mb-1">{uiCopy.selectedSpread}</div>
                          <div className="text-[#e9d5ff] font-semibold text-base">{selectedSpread.title}</div>
                          <div className="text-[#a78bfa]/70 text-xs mt-0.5">{uiCopy.cardCount(selectedSpread.cardCount)} · {DIFFICULTY_LABEL[selectedSpread.difficulty]} · {isLenormandMode ? uiCopy.lenormandLabel : uiCopy.consultationCategory(categoryLabel[selectedQuestionCategory])}</div>
                          <div className="text-[#c4b5fd]/60 text-xs mt-1 leading-relaxed">{selectedSpread.purpose}</div>
                        </div>
                        {!isLenormandMode && <button
                          type="button"
                          onClick={() => setShowSpreadPicker(true)}
                          className="px-4 py-2 rounded-full border border-[#c084fc]/40 bg-[#c084fc]/10 text-[#e9d5ff] text-xs font-semibold hover:bg-[#c084fc]/20 transition-all"
                        >
                          {uiCopy.changeSpread}
                        </button>}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border border-[#6d28d9]/35 p-4 mb-5"
                      style={{ background: "rgba(15,5,35,0.48)" }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70">{uiCopy.recommendedQuestions}</div>
                          <div className="text-xs text-[#a78bfa]/70 mt-1">{selectedSpread.title} · {isLenormandMode ? uiCopy.lenormandLabel : categoryLabel[selectedQuestionCategory]}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRecommendedQuestion(recommendedQuestions[0] || defaultQuestionByCategory[selectedQuestionCategory])}
                          className="px-3 py-1.5 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 text-xs font-semibold text-[#fde68a] hover:bg-[#f59e0b]/15 transition-all"
                        >
                          {uiCopy.applyFirstQuestion}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {recommendedQuestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleRecommendedQuestion(item)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs leading-relaxed text-[#d8b4fe] hover:border-[#c084fc]/35 hover:bg-[#c084fc]/10 transition-all"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isLenormandMode && (
                      <div
                        className="rounded-2xl border border-[#f59e0b]/25 p-4 mb-5"
                        style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.18), rgba(88,28,135,0.16))" }}
                      >
                        <div className="mb-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#fbbf24]/70">{uiCopy.lenormandFreeTitle}</div>
                          <div className="mt-1 text-sm leading-relaxed text-[#fde68a]/90">{uiCopy.lenormandFreeDescription}</div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {LENORMAND_INFO_ITEMS.map(([number, title, body]) => (
                            <div key={`lenormand-info-${number}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                              <div className="text-[10px] font-bold text-[#fbbf24]">{number}</div>
                              <div className="mt-0.5 text-xs font-semibold text-[#f3e8ff]">{title}</div>
                              <div className="mt-1 text-[11px] leading-relaxed text-[#c4b5fd]/70">{body}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sensitiveCategoryNotice && (
                      <div className="mb-5 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-xs leading-relaxed text-[#fde68a]/90">
                        {sensitiveCategoryNotice}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                          onClick={() => {
                            setQuestion(isLenormandMode ? lenormandDefaultQuestion : defaultQuestionByCategory[selectedQuestionCategory]);
                            setFeedback("");
                            setQuestionStatus(isLenormandMode ? feedbackCopy.lenormandDefaultStatus : feedbackCopy.categoryDefaultStatus);
                          }}
                        className="flex-1 px-4 py-3 rounded-full border border-white/15 bg-white/5 text-[#c4b5fd] text-sm font-medium hover:bg-white/10 transition-all"
                      >
                        {isLenormandMode ? uiCopy.defaultQuestionButton.lenormand : uiCopy.defaultQuestionButton.tarot}
                      </button>
                      <m.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleStartDraw}
                        className="flex-1 sm:flex-[2] px-6 py-3 rounded-full font-bold text-sm text-[#1a0533] shadow-lg transition-all"
                        style={{ background: "linear-gradient(90deg, #c084fc, #f472b6, #fbbf24)", boxShadow: "0 8px 30px rgba(192,132,252,0.35)" }}
                      >
                        {oracleModeMeta.drawLabel}
                      </m.button>
                    </div>

                    {feedback && <p className="mt-3 text-rose-300/90 text-sm text-center">{feedback}</p>}
                  </div>
                </m.div>
              )}

              {/* ━━━ DRAW STAGE ━━━ */}
              {stage === "draw" && (
                <m.div
                  key="draw-stage"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="grid gap-5 lg:grid-cols-[1fr_380px] max-w-6xl mx-auto"
                >
                  {/* Left: Spread board */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div
                      className="rounded-2xl border border-[#7c3aed]/30 p-4"
                      style={{ background: "linear-gradient(135deg, rgba(25,12,55,0.9), rgba(15,8,35,0.9))" }}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60 mb-1">Moon Archive</div>
                          <h2 className="text-xl font-bold text-[#e9d5ff]">{selectedSpread.title}</h2>
                          <p className="text-[#a78bfa]/75 text-sm mt-1 leading-relaxed">{effectiveQuestion}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className="px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: "linear-gradient(90deg, rgba(192,132,252,0.2), rgba(244,114,182,0.15))", border: "1px solid rgba(192,132,252,0.35)", color: "#e9d5ff" }}
                          >
                            {progressText} {uiCopy.completeSuffix}
                          </div>
                          {!isLenormandMode && <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-xs text-[#c4b5fd]">
                            <input type="checkbox" checked={allowReversed} onChange={(e) => setAllowReversed(e.target.checked)} className="accent-[#a855f7] h-3.5 w-3.5" />
                            {uiCopy.includeReversed}
                          </label>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={handleGoQuestion} className="px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-[#c4b5fd] hover:bg-white/10 transition-all">{uiCopy.backToQuestion}</button>
                        <button type="button" onClick={handleResetAll} className="px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-[#c4b5fd] hover:bg-white/10 transition-all">{uiCopy.resetStart}</button>
                        {!isLenormandMode && <button type="button" onClick={() => setShowSpreadPicker(true)} className="px-3 py-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs text-[#c4b5fd] font-semibold hover:bg-[#7c3aed]/20 transition-all">{uiCopy.otherSpread}</button>}
                      </div>
                    </div>

                    {/* Spread visual board */}
                    <div
                      className="rounded-3xl border border-[#6d28d9]/25 overflow-hidden"
                      style={{
                        background: "radial-gradient(ellipse at 50% 110%, rgba(192,132,252,0.18) 0%, transparent 60%), linear-gradient(180deg, rgba(12,6,30,0.95) 0%, rgba(8,4,20,0.95) 100%)",
                        boxShadow: "inset 0 0 80px rgba(109,40,217,0.06)",
                      }}
                    >
                      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                        <div className="text-xs uppercase tracking-[0.22em] text-[#7c3aed]/55">Spread Board</div>
                        <div className="ml-auto text-xs text-[#a78bfa]/60">{uiCopy.spreadBoardHint}</div>
                      </div>
                      <div className="relative" style={{ paddingBottom: "90%", minHeight: 280 }}>
                        {selectedSpread.positions.map((position) => {
                          const drawn = drawnCards.find((card) => card.slotIndex === position.index);
                          return (
                            <m.div
                              key={`${selectedSpread.id}-${position.index}`}
                              initial={{ opacity: 0.5, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.25 }}
                              className="absolute"
                              style={{
                                left: `${position.x}%`,
                                top: `${position.y}%`,
                                transform: `translate(-50%, -50%) rotate(${position.rotate}deg)`,
                                width: "clamp(56px, 8vw, 80px)",
                                height: "clamp(80px, 12vw, 114px)",
                              }}
                            >
                              <div
                                className="rounded-xl border h-full w-full shadow-xl overflow-hidden"
                                style={{
                                  borderColor: drawn ? "rgba(192,132,252,0.5)" : "rgba(109,40,217,0.25)",
                                  background: drawn ? "transparent" : "rgba(0,0,0,0.4)",
                                  boxShadow: drawn ? "0 0 20px rgba(192,132,252,0.2)" : "none",
                                }}
                              >
                                {drawn ? (
                                  <m.div
                                    key={`${drawn.cardCode}-${drawn.slotIndex}`}
                                    initial={{ rotateY: 120, opacity: 0, scale: 0.85 }}
                                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 230, damping: 22 }}
                                    className="h-full flex flex-col"
                                    style={{ backfaceVisibility: "hidden" }}
                                  >
                                    <img src={drawn.image} alt={resolveOracleCardName(drawn, locale)} className="w-full flex-1 object-cover" style={{ filter: !isLenormandMode && drawn.orientation === "reversed" ? "hue-rotate(180deg) brightness(0.85)" : undefined, transform: !isLenormandMode && drawn.orientation === "reversed" ? "rotate(180deg)" : undefined }} />
                                    <div className="px-1 py-1 text-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                                      <div className="text-[9px] font-bold text-[#e9d5ff] leading-tight line-clamp-1">{resolveOracleCardName(drawn, locale)}</div>
                                      <div className="text-[8px] text-[#f472b6]">{isLenormandMode ? uiCopy.combinationReading : resolveOrientationLabel(drawn.orientation, locale)}</div>
                                    </div>
                                  </m.div>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center rounded-xl border-dashed border border-[#7c3aed]/30" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}>
                                    <div className="text-[10px] font-bold text-[#c084fc]">{position.index}</div>
                                    <div className="text-[8px] text-white/40 mt-0.5 text-center px-1 leading-tight line-clamp-2">{position.label}</div>
                                  </div>
                                )}
                              </div>
                            </m.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Position guide */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(10,5,25,0.7)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">{uiCopy.positionMeaning}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedSpread.positions.map((position) => (
                          <div key={`${selectedSpread.id}-position-${position.index}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                            <div className="text-xs font-semibold text-[#c084fc]">{position.index}. {position.label}</div>
                            <div className="mt-0.5 text-xs text-white/55 leading-relaxed">{position.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Deck + selected cards */}
                  <div className="space-y-4">
                    {/* Deck draw */}
                    <div
                      className="rounded-2xl border border-[#6d28d9]/35 p-5"
                      style={{ background: "linear-gradient(145deg, rgba(30,10,70,0.88), rgba(15,5,40,0.88))" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/60">{oracleModeMeta.deckLabel}</div>
                          <div className="text-xs text-[#a78bfa]/70 mt-0.5">{oracleModeMeta.deckCaption}</div>
                        </div>
                        <div className="px-2.5 py-1 rounded-full border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd]">
                          {activeDeckSize - usedDeckSlots.length} / {activeDeckSize}
                        </div>
                      </div>

                      {/* Deck visual */}
                      <div className="flex justify-center mb-4">
                        <div className="relative w-24 h-36 cursor-pointer group" onClick={drawnCards.length < selectedSpread.cardCount && cardPoolReady ? drawCardFromStack : undefined}>
                          {[2, 1, 0].map((z) => (
                            <div
                              key={z}
                              className="absolute rounded-xl border border-[#7c3aed]/40 transition-transform duration-300 group-hover:scale-105"
                              style={{
                                inset: 0,
                                transform: `translate(${z * 2}px, ${-z * 3}px)`,
                                background: `linear-gradient(135deg, #2d1b69 0%, #1e0f47 100%)`,
                                boxShadow: z === 0 ? "0 8px 30px rgba(124,58,237,0.3)" : "none",
                              }}
                            >
                              {z === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-3xl opacity-60" style={{ filter: "drop-shadow(0 0 8px rgba(192,132,252,0.5))" }}>🌙</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <m.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={drawCardFromStack}
                        disabled={drawnCards.length >= selectedSpread.cardCount || !cardPoolReady || tarotCardPoolLoading}
                        className="w-full py-3 rounded-2xl font-bold text-sm text-[#1a0533] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 6px 25px rgba(168,85,247,0.3)" }}
                      >
                        {isLenormandMode ? uiCopy.drawCard.lenormand : uiCopy.drawCard.tarot}
                      </m.button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isLenormandMode && !cardPoolReady) void ensureTarotCardPool().catch(() => setFeedback(feedbackCopy.promptError));
                          setShowFullDeck((p) => !p);
                        }}
                        className="mt-2 w-full py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-[#a78bfa] hover:bg-white/10 transition-all"
                      >
                        {showFullDeck ? uiCopy.fullDeck.close : uiCopy.fullDeck.open}
                      </button>

                      <AnimatePresence>
                        {showFullDeck && (
                          <m.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar"
                          >
                            <div className="grid grid-cols-2 gap-1.5">
                            {activeCardPool.map((card) => {
                              const disabled = drawnCards.some((drawn) => drawn.cardCode === card.cardCode) || drawnCards.length >= selectedSpread.cardCount;
                              return (
                                <button
                                  key={card.cardCode}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => drawSpecificCard(card)}
                                  className={`min-h-12 rounded-xl px-2 py-2 text-left transition-all ${disabled ? "border border-white/5 bg-black/20 text-white/20" : "border border-[#7c3aed]/35 bg-[#2d1b69]/60 text-[#c4b5fd] hover:-translate-y-0.5 hover:border-[#c084fc]/50 hover:shadow-[0_0_8px_rgba(192,132,252,0.3)]"}`}
                                >
                                  <span className="block text-[10px] font-bold leading-tight line-clamp-1">{resolveOracleCardName(card, locale)}</span>
                                  <span className="block text-[8px] text-[#a78bfa]/60 leading-tight line-clamp-1">{locale === "ko" ? (card.keywords.slice(0, 2).join(" · ") || card.cardNameEn) : card.cardCode}</span>
                                </button>
                              );
                            })}
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Drawn cards list */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(10,5,25,0.7)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">{uiCopy.selectedCards}</div>
                      <div className="space-y-1.5">
                        {selectedSpread.positions.map((position, index) => {
                          const drawn = drawnCards[index];
                          return (
                            <div key={`${selectedSpread.id}-picked-${position.index}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                              <div className="text-xs font-semibold text-[#c084fc]">{position.index}. {position.label}</div>
                              {drawn ? (
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-[#f3e8ff] font-medium truncate">{resolveOracleCardName(drawn, locale)}</span>
                                      <span className="text-[10px] text-[#f472b6] shrink-0">{isLenormandMode ? uiCopy.lenormandLabel : resolveOrientationLabel(drawn.orientation, locale)}</span>
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-white/40 leading-relaxed line-clamp-2">{drawn.positionDescription}</div>
                                  </div>
                                  {!isLenormandMode && <button
                                    type="button"
                                    onClick={() => toggleDrawnCardOrientation(index)}
                                    className="shrink-0 px-2 py-1 rounded-full border border-[#c084fc]/30 bg-[#c084fc]/10 text-[10px] font-semibold text-[#e9d5ff] hover:bg-[#c084fc]/20 transition-all"
                                  >
                                    {uiCopy.changeDirection}
                                  </button>}
                                </div>
                              ) : (
                                <div className="mt-0.5 text-[10px] text-white/30">{uiCopy.notSelected}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Flow lines */}
                    <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(5,3,15,0.6)" }}>
                      <div className="space-y-2">
                        {flowLines.map((line, i) => (
                          <p key={i} className="text-xs leading-relaxed text-[#a78bfa]/75">{line}</p>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={handleGeneratePrompt}
                      disabled={drawnCards.length !== selectedSpread.cardCount || isGenerating || (!isLenormandMode && isPaying)}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-[#1a0533] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 8px 30px rgba(168,85,247,0.3)" }}
                    >
                      {isGenerating || (!isLenormandMode && isPaying) ? feedbackCopy.generating : oracleModeMeta.promptLabel}
                    </m.button>

                    {feedback && <p className="text-rose-300/80 text-xs text-center">{feedback}</p>}
                  </div>
                </m.div>
              )}

              {/* ━━━ PROMPT STAGE ━━━ */}
              {stage === "prompt" && promptResult && (
                <m.div
                  key="prompt-stage"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="grid gap-5 lg:grid-cols-[360px_1fr] max-w-6xl mx-auto"
                >
                  {/* Left: summary */}
                  <div className="space-y-4">
                    <div
                      className="rounded-2xl border border-[#7c3aed]/30 p-5"
                      style={{ background: "linear-gradient(145deg, rgba(25,10,55,0.92), rgba(15,5,38,0.92))" }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60 mb-2">{isLenormandMode ? uiCopy.promptMap.lenormand : uiCopy.promptMap.tarot}</div>
                      <h2 className="text-xl font-bold text-[#e9d5ff] mb-2">{selectedSpread.title}</h2>
                      <p className="text-xs text-[#a78bfa]/75 leading-relaxed mb-2">{promptResult.effectiveQuestion}</p>
                      <p className="text-xs text-[#c4b5fd]/65 leading-relaxed">{promptResult.summary}</p>
                    </div>

                    {/* Card images strip */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(8,4,20,0.75)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">{uiCopy.selectedCards}</div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {drawnCards.slice(0, 5).map((card, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-20 rounded-lg overflow-hidden border border-[#7c3aed]/30 shadow-md">
                              <img src={card.image} alt={resolveOracleCardName(card, locale)} className="w-full h-full object-cover" style={{ filter: !isLenormandMode && card.orientation === "reversed" ? "brightness(0.75)" : undefined, transform: !isLenormandMode && card.orientation === "reversed" ? "rotate(180deg)" : undefined }} />
                            </div>
                            <div className="text-[8px] text-[#c4b5fd] text-center w-14 leading-tight line-clamp-2">{resolveOracleCardName(card, locale)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {selectedSpread.positions.map((position, index) => {
                          const drawn = drawnCards[index];
                          if (!drawn) return null;
                          return (
                            <div key={`${selectedSpread.id}-result-${position.index}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                              <div className="text-[10px] text-[#c084fc]">{position.index}. {position.label}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-[#f3e8ff]">{resolveOracleCardName(drawn, locale)}</span>
                                <span className="text-[10px] text-[#f472b6]">{isLenormandMode ? uiCopy.lenormandLabel : resolveOrientationLabel(drawn.orientation, locale)}</span>
                              </div>
                              <div className="text-[10px] text-white/45 mt-0.5 leading-relaxed">{drawn.positionDescription}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Spread summary */}
                    <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(5,3,15,0.6)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-2">{uiCopy.oracleMap}</div>
                      <div className="space-y-1.5">
                        {flowLines.map((line, i) => (
                          <p key={i} className="text-xs leading-relaxed text-[#a78bfa]/70">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: prompt output */}
                  <div className="space-y-4">
                    <div
                      className="rounded-3xl border border-[#c084fc]/30 p-5 sm:p-6"
                      style={{
                        background: "linear-gradient(155deg, rgba(30,10,65,0.92), rgba(15,5,40,0.92))",
                        boxShadow: "0 0 60px rgba(192,132,252,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60">{oracleModeMeta.outputLabel}</div>
                          <div className="text-base font-bold text-[#e9d5ff] mt-0.5">{isLenormandMode ? uiCopy.outputTitle.lenormand : uiCopy.outputTitle.tarot}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#c084fc]/40 bg-[#c084fc]/10 text-[#e9d5ff] text-xs font-semibold hover:bg-[#c084fc]/20 transition-all"
                        >
                          {copied ? feedbackCopy.copiedDone : feedbackCopy.copyPrompt}
                        </button>
                      </div>

                      <div
                        className="rounded-2xl border border-[#6d28d9]/30 p-5"
                        style={{ background: "rgba(0,0,0,0.45)" }}
                      >
                        <div className="max-h-[55vh] overflow-auto whitespace-pre-wrap text-sm leading-8 text-[#f3e8ff]/85 custom-scrollbar" style={{ fontFamily: "var(--font-sans, sans-serif)" }}>
                          {promptResult.prompt}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={handleCopyPrompt} className="col-span-2 py-3 rounded-2xl font-bold text-sm text-[#1a0533] transition-all" style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 6px 25px rgba(168,85,247,0.25)" }}>
                        {copied ? feedbackCopy.copiedDone : isLenormandMode ? feedbackCopy.copyPrompt : feedbackCopy.copyPrompt}
                      </button>
                      <button type="button" onClick={() => handleTunePrompt(uiCopy.tune.consultLabel, uiCopy.tune.consultInstruction)} className="py-2.5 rounded-xl border border-[#c084fc]/30 bg-[#c084fc]/10 text-xs font-semibold text-[#e9d5ff] hover:bg-[#c084fc]/20 transition-all">
                        {uiCopy.tune.consultLabel}
                      </button>
                      <button type="button" onClick={() => handleTunePrompt(uiCopy.tune.practicalLabel, uiCopy.tune.practicalInstruction)} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        {uiCopy.tune.practicalLabel}
                      </button>
                      <button type="button" onClick={() => handleTunePrompt(uiCopy.tune.warmLabel, uiCopy.tune.warmInstruction)} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        {uiCopy.tune.warmLabel}
                      </button>
                      <button type="button" onClick={handleRegeneratePrompt} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        {uiCopy.regenerateSameCards}
                      </button>
                      <button type="button" onClick={handleRedrawCards} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        {uiCopy.redrawCards}
                      </button>
                      {!isLenormandMode && <button type="button" onClick={handleChooseAnotherSpread} className="py-2.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20 transition-all">
                        {uiCopy.chooseAnotherSpread}
                      </button>}
                      <button type="button" onClick={handleResetAll} className="py-2.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20 transition-all">
                        {uiCopy.restartFromBeginning}
                      </button>
                    </div>

                    {feedback && <p className="text-rose-300/80 text-xs text-center">{feedback}</p>}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <section className="mt-6 grid gap-3 rounded-3xl border border-[#c084fc]/20 bg-black/20 p-5 text-[#ede9fe]/80 backdrop-blur-sm md:grid-cols-3">
            {uiCopy.guideArticles.map((article, index) => (
              <article key={`prompt-guide-${article.title}`} className={index === uiCopy.guideArticles.length - 1 ? "md:col-span-3" : undefined}>
                <h2 className="text-base font-bold text-[#f5d0fe]">{article.title}</h2>
                {article.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-xs leading-6">{paragraph}</p>
                ))}
              </article>
            ))}
          </section>

          <div className="h-8" />
        </div>
      </div>

      {/* ── Spread Picker Modal ── */}
      <AnimatePresence>
        {showSpreadPicker && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
            style={{ background: "rgba(5,2,15,0.75)", backdropFilter: "blur(12px)" }}
          >
            <m.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="w-full sm:max-w-5xl h-[88dvh] sm:h-[85vh] sm:max-h-[860px] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#6d28d9]/40 overflow-hidden"
              style={{ background: "linear-gradient(165deg, #0e0626 0%, #1a0a3a 100%)" }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/60">Spread Library</div>
                  <div className="text-lg font-bold text-[#e9d5ff] mt-0.5">✦ {uiCopy.spreadLibraryTitle}</div>
                </div>
                <button type="button" onClick={() => setShowSpreadPicker(false)} className="px-3 py-1.5 rounded-full border border-white/14 bg-white/6 text-sm text-[#a78bfa] hover:bg-white/12 transition-all">{uiCopy.close}</button>
              </div>

              {/* Search and filters */}
              <div className="px-5 py-3 space-y-2 border-b border-white/5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={uiCopy.spreadSearchPlaceholder}
                    className="rounded-xl border border-[#6d28d9]/35 bg-black/30 px-3 py-2 text-sm text-[#f3e8ff] outline-none placeholder:text-[#7c3aed]/40"
                  />
                  <div className="rounded-xl border border-[#6d28d9]/25 bg-black/20 px-3 py-2 text-xs text-[#a78bfa]/70">
                    {uiCopy.recommendedTheme(categoryLabel[detectedCategory])}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categoryFilterOptions.map((item) => (
                    <button
                      key={`spread-filter-${item.id}`}
                      type="button"
                      onClick={() => setCategoryFilter(item.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${categoryFilter === item.id ? "border-[#c084fc]/45 bg-[#c084fc]/15 text-[#e9d5ff]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CARD_COUNT_FILTERS.map((count) => (
                    <button
                      key={`spread-count-${String(count)}`}
                      type="button"
                      onClick={() => setCardCountFilter(count === "all" ? "all" : count)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${cardCountFilter === count ? "border-[#a855f7]/45 bg-[#a855f7]/15 text-[#e9d5ff]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                    >
                      {count === "all" ? uiCopy.countAll : uiCopy.cardCount(count)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spread grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSpreads.map((spread) => {
                    const active = spread.id === selectedSpread.id;
                    const recommended = recommendedSpreads.some((item) => item.id === spread.id);
                    return (
                      <m.button
                        key={spread.id}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectSpread(spread.id)}
                        className={`rounded-2xl border p-3.5 text-left transition-all ${active ? "border-[#c084fc]/45 shadow-[0_0_20px_rgba(192,132,252,0.1)]" : "border-white/10 hover:border-white/20"}`}
                        style={{
                          background: active
                            ? "linear-gradient(145deg, rgba(192,132,252,0.15), rgba(167,139,250,0.1))"
                            : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-[9px] uppercase tracking-[0.16em] text-[#7c3aed]/55">{categoryLabel[spread.category]}</div>
                          {recommended && <span className="px-1.5 py-0.5 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 text-[9px] text-[#fcd34d]">{uiCopy.recommendedBadge}</span>}
                        </div>
                        <div className="text-sm font-bold text-[#e9d5ff]">{spread.title}</div>
                        <div className="text-xs text-[#a78bfa]/60 mt-0.5">{uiCopy.cardCount(spread.cardCount)} · {DIFFICULTY_LABEL[spread.difficulty]}</div>
                        <p className="mt-2 text-xs leading-relaxed text-white/55">{spread.purpose}</p>
                      </m.button>
                    );
                  })}
                  {!filteredSpreads.length && (
                    <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/3 px-4 py-10 text-center text-sm text-white/45">
                      {uiCopy.noSpreads}
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
      `}</style>
    </div>
  );
}
