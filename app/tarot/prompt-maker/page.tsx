"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { showToast } from "../../components/Toast";
import { getSubscriptionTierLabel, showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { useCoinGate } from "../../hooks/useCoinGate";
import { buildImageCandidates, TAROT_CARDS } from "../../../lib/tarot/tarot-cards.mjs";
import {
  buildLocalizedRecommendedQuestionsForSpread,
  DIFFICULTY_LABEL,
  findSpreadById,
  getLocalizedPromptMakerData,
  SPREAD_LIBRARY,
} from "./data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotCardOrientation, TarotSpread, TarotSpreadCategory } from "./types";
import { detectTarotCategory, recommendSpreads } from "./utils/classifyTarotQuestion";
import { buildLenormandPrompt, buildOraclePrompt } from "./utils/buildOraclePrompt";

type Stage = "question" | "draw" | "prompt";
type OracleDeckMode = "tarot" | "lenormand";

type TarotCardSource = {
  code?: string;
  nameKo?: string;
  nameEn?: string;
  keywords?: string[];
  focus?: string;
};

type PromptResult = ReturnType<typeof buildOraclePrompt>;

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

function formatCoinValue(amount: number) {
  return `${Math.max(0, Math.floor(Number(amount || 0) * 100)).toLocaleString("ko-KR")}원`;
}

function formatMonthlyCreditValue(amount: number) {
  return `${Math.max(0, Math.floor(Number(amount || 0) * 10)).toLocaleString("ko-KR")}원 상당`;
}

const CARD_POOL: OracleCardPick[] = (TAROT_CARDS as TarotCardSource[])
  .map((card) => ({
    cardCode: String(card?.code || ""),
    cardNameKo: String(card?.nameKo || "알 수 없는 카드"),
    cardNameEn: String(card?.nameEn || "Unknown Card"),
    keywords: Array.isArray(card?.keywords) ? card.keywords.map((value) => String(value)) : [],
    focus: String(card?.focus || "흐름 읽기"),
    image: buildImageCandidates(String(card?.code || ""))[0] || "/tarot-cards/thefool.jpeg",
  }))
  .filter((card) => card.cardCode);

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

const LENORMAND_SPREAD: TarotSpread = {
  id: "lenormand-six-flow",
  title: "레노먼드 6장 흐름",
  category: "special",
  cardCount: 6,
  difficulty: "easy",
  purpose: "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다.",
  positions: [
    { index: 1, label: "현재 상황", description: "지금 질문의 표면에 드러난 중심 흐름", x: 20, y: 30, rotate: -8 },
    { index: 2, label: "가까운 배경", description: "이 흐름을 만든 최근 조건과 주변 분위기", x: 50, y: 18, rotate: 0 },
    { index: 3, label: "반복 신호", description: "계속 되풀이되는 패턴과 확인할 포인트", x: 80, y: 30, rotate: 8 },
    { index: 4, label: "전환 단서", description: "흐름이 바뀌거나 열리는 계기", x: 20, y: 70, rotate: -8 },
    { index: 5, label: "행동 단서", description: "줄이거나 늘려야 할 현실 행동", x: 50, y: 82, rotate: 0, emphasis: true },
    { index: 6, label: "다음 흐름", description: "가까운 다음 장면과 정리 메시지", x: 80, y: 70, rotate: 8 },
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

const LENORMAND_DEFAULT_QUESTION = "지금 보고 싶은 상황에서 가장 먼저 확인해야 할 흐름과 행동 단서는 무엇일까?";

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
    title: "타로 프롬프트",
    eyebrow: "타로",
    description: "질문, 스프레드, 카드의 방향을 하나의 섬세한 AI 타로 상담 프롬프트로 엮습니다.",
    drawLabel: "✦ 카드 뽑기 시작",
    deckLabel: "Tarot Deck",
    deckCaption: "78장 덱에서 한 장씩 뽑아보세요.",
    promptLabel: "✦ AI 오라클 프롬프트 만들기",
    outputLabel: "AI 오라클 프롬프트",
  },
  lenormand: {
    title: "레노먼드 프롬프트",
    eyebrow: "레노먼드",
    description: "질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.",
    drawLabel: "레노먼드 6장 뽑기",
    deckLabel: "Lenormand Deck",
    deckCaption: "36장 레노먼드 덱에서 6장을 뽑아 흐름과 행동 단서를 봅니다.",
    promptLabel: "무료 레노먼드 프롬프트 만들기",
    outputLabel: "복사용 레노먼드 프롬프트",
  },
};

const DECK_SLOTS = Array.from({ length: Math.max(CARD_POOL.length, LENORMAND_CARD_POOL.length) }, (_, index) => index);

const STEP_META: Array<{ id: Stage; title: string; caption: string; icon: string }> = [
  { id: "question", title: "질문 올리기", caption: "마음속 질문을 밤하늘에 올리고 어울리는 스프레드를 고르세요.", icon: "✦" },
  { id: "draw", title: "카드 열기", caption: "직관이 닿는 순서대로 카드를 열어 질문의 별자리를 만듭니다.", icon: "✦" },
  { id: "prompt", title: "AI 프롬프트", caption: "카드가 만든 흐름을 AI 타로 상담 프롬프트로 정리합니다.", icon: "✦" },
];

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

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
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

function buildFlowLines(cards: DrawnTarotCard[]) {
  if (!cards.length) {
    return [
      "카드가 열리면 질문의 별자리와 포지션별 흐름이 이곳에 떠오릅니다.",
      "지금은 질문과 스프레드에 맞는 첫 문장을 기다리고 있습니다.",
      "직관이 머무는 순서대로 한 장씩 조용히 열어보세요.",
    ];
  }
  const first = cards[0];
  const middle = cards[Math.floor(cards.length / 2)] || first;
  const last = cards[cards.length - 1] || first;
  const uprightCount = cards.filter((card) => card.orientation === "upright").length;
  const reversedCount = cards.length - uprightCount;
  return [
    `${first.cardNameKo} ${first.orientationLabel}에서 열린 첫빛이 ${middle.cardNameKo} ${middle.orientationLabel}을 지나며 질문의 중심을 비춥니다.`,
    `현재 조합에는 정방향 ${uprightCount}장, 역방향 ${reversedCount}장의 흐름 속에서 열리는 힘과 머무는 힘의 균형이 드러납니다.`,
    `${last.positionLabel}에 놓인 ${last.cardNameKo}가 이 프롬프트의 마지막 문장과 행동 톤을 정합니다.`,
  ];
}

/* ─── StepIndicator ─── */
function StepIndicator({ current }: { current: Stage }) {
  const currentIndex = STEP_META.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-3xl mx-auto">
      {STEP_META.map((step, idx) => {
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
            {idx < STEP_META.length - 1 && (
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
        <motion.div
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TarotSpreadCategory>("all");
  const [cardCountFilter, setCardCountFilter] = useState<number | "all">("all");
  const feedbackCopy = PROMPT_MAKER_FEEDBACK_COPY[locale] || PROMPT_MAKER_FEEDBACK_COPY.ko;
  const localizedPromptData = useMemo(() => getLocalizedPromptMakerData(locale), [locale]);
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
  const oracleModeMeta = ORACLE_MODE_META[oracleMode];
  const selectedSpread = isLenormandMode ? LENORMAND_SPREAD : findSpreadById(selectedSpreadId);
  const activeCardPool = isLenormandMode ? LENORMAND_CARD_POOL : CARD_POOL;
  const activeDeckSize = activeCardPool.length;
  const detectedCategory = detectTarotCategory(question);
  const selectedQuestionCategory = manualCategory === "auto" ? detectedCategory : manualCategory;

  const effectiveQuestion = useMemo(
    () => normalizeText(question) || (isLenormandMode ? lenormandDefaultQuestion : defaultQuestionByCategory[selectedQuestionCategory]),
    [question, isLenormandMode, selectedQuestionCategory, defaultQuestionByCategory, lenormandDefaultQuestion],
  );

  const flowLines = useMemo(() => buildFlowLines(drawnCards), [drawnCards]);
  const progressText = `${drawnCards.length} / ${selectedSpread.cardCount}`;

  const recommendedSpreads = useMemo(
    () => isLenormandMode ? [LENORMAND_SPREAD] : recommendSpreads(effectiveQuestion, cardCountFilter, selectedQuestionCategory).slice(0, 6),
    [effectiveQuestion, cardCountFilter, isLenormandMode, selectedQuestionCategory],
  );

  const filteredSpreads = useMemo(
    () => SPREAD_LIBRARY.filter((spread) => {
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
    [searchQuery, categoryFilter, cardCountFilter, recommendedSpreads, selectedQuestionCategory],
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
    ? (isLenormandMode ? feedbackCopy.free : billingPassIncluded ? `${billingSubscriptionLabel} 이용권` : billingSnapshot.requiredCoins > 0 ? formatCoinValue(billingSnapshot.requiredCoins) : feedbackCopy.free)
    : (isLenormandMode ? feedbackCopy.free : feedbackCopy.oneTimePrice);

  const billingStateLabel = billingSnapshot
    ? (isLenormandMode ? feedbackCopy.lenormandFree : billingPassIncluded ? feedbackCopy.passAvailable : billingSnapshot.canAccess ? feedbackCopy.instantUse : feedbackCopy.paymentRequired)
    : (isLenormandMode ? feedbackCopy.lenormandFree : billingLoading ? feedbackCopy.checking : feedbackCopy.disconnected);
  const sensitiveCategoryNotice = isLenormandMode ? "" : SENSITIVE_CATEGORY_NOTICE[selectedQuestionCategory];
  const questionQualityNotice = isLenormandMode
    ? (normalizeText(question) ? feedbackCopy.lenormandQuestionReady : feedbackCopy.lenormandQuestionEmpty)
    : buildQuestionQualityNotice(question, selectedQuestionCategory, categoryLabel, questionQualityCopy);

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  useEffect(() => {
    if (selectedSpreadId) return;
    setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || "");
  }, [selectedSpreadId]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function loadBillingSnapshot() {
      setBillingLoading(true);
      try {
        const query = new URLSearchParams({ featureKey: "tarot-prompt-maker", reason: "타로 프롬프트 라이브러리" });
        const response = await fetch(`/api/billing/unlock-status?${query.toString()}`, { method: "GET", credentials: "include", signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        const data = payload?.ok && payload?.data && typeof payload.data === "object" ? payload.data : null;
        if (!active || !data) return;
        const paymentOptions = data.paymentOptions && typeof data.paymentOptions === "object" ? data.paymentOptions as Record<string, unknown> : {};
        const canUseByPass = Boolean(paymentOptions.canUseByPass || data.canUseByPass);
        setBillingSnapshot({ requiredCoins: Number(data.requiredCoins || 0), canAccess: Boolean(data.canAccess || canUseByPass), freeBySubscription: Boolean(data.freeBySubscription || canUseByPass), canUseByPass, subscriptionTier: String(data.subscriptionTier || "free"), accessReason: String(data.accessReason || "").trim().toLowerCase() });
      } catch {
        if (!active) return;
        setBillingSnapshot(null);
      } finally {
        if (active) setBillingLoading(false);
      }
    }
    loadBillingSnapshot();
    return () => { active = false; controller.abort(); };
  }, []);

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

  function buildPromptForCurrentState() {
    if (isLenormandMode) return buildLenormandPrompt(selectedSpread, effectiveQuestion, drawnCards);
    return buildOraclePrompt(selectedSpread, effectiveQuestion, drawnCards, { questionCategory: selectedQuestionCategory });
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
    if (!selectedSpreadId) setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || "");
    resetDrawState();
    setFeedback("");
    setStage("draw");
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

  function drawCardFromDeckSlot(deckSlot: number) {
    if (usedDeckSlots.includes(deckSlot)) return;
    const usedCodes = new Set(drawnCards.map((card) => card.cardCode));
    const availableCards = activeCardPool.filter((card) => !usedCodes.has(card.cardCode));
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

  function drawCardFromStack() {
    const availableSlots = DECK_SLOTS.slice(0, activeDeckSize).filter((slot) => !usedDeckSlots.includes(slot));
    if (!availableSlots.length) return;
    const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    drawCardFromDeckSlot(randomSlot);
  }

  async function handleGeneratePrompt() {
    if (isGenerating || isPaying) return;
    if (drawnCards.length !== selectedSpread.cardCount) {
      setFeedback(feedbackCopy.spreadNeedAll(selectedSpread.cardCount));
      return;
    }
    const generate = () => {
      const nextPrompt = buildPromptForCurrentState();
      setPromptResult(nextPrompt);
      setStage("prompt");
      setFeedback("");
    };
    setIsGenerating(true);
    try {
      if (isLenormandMode) {
        generate();
        showToast(feedbackCopy.lenormandCompleteToast, "success");
        return;
      }
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-prompt-maker",
        reason: "타로 프롬프트 라이브러리",
        requestId: `tarot-prompt-library:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: ({ chargedCoins, requiredCoins, balanceAfter, accessSource, subscriptionTier, monthlyCreditsSpent, monthlyBalanceAfter }) => {
          generate();
          if (accessSource === "subscription" || (chargedCoins <= 0 && requiredCoins > 0 && billingPassIncluded)) {
            showSubscriptionIncludedNotice({
              message: feedbackCopy.subscriptionPromptComplete,
              reason: feedbackCopy.subscriptionReason,
              tier: subscriptionTier || billingSnapshot?.subscriptionTier,
            });
            return;
          }
          if (accessSource === "moonlight_stone") {
            const spentText = monthlyCreditsSpent > 0 ? formatMonthlyCreditValue(monthlyCreditsSpent) : feedbackCopy.passBenefit;
            const balanceText = typeof monthlyBalanceAfter === "number" ? feedbackCopy.passRemaining(formatMonthlyCreditValue(monthlyBalanceAfter)) : "";
            showToast(feedbackCopy.passOpened(spentText, balanceText), "info");
            return;
          }
          if (chargedCoins > 0) showToast(feedbackCopy.paidApproved(formatCoinValue(balanceAfter)), "info");
        },
      });
      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setFeedback(feedbackCopy.loginRequired);
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => { window.location.href = `/login?next=${next}`; }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") { setFeedback(feedbackCopy.insufficientCoins(formatCoinValue(paymentResult.requiredCoins))); return; }
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

  function handleRegeneratePrompt() {
    if (drawnCards.length !== selectedSpread.cardCount) { setFeedback(feedbackCopy.cardSelectionIncomplete); return; }
    const nextPrompt = buildPromptForCurrentState();
    setPromptResult(nextPrompt);
    setFeedback("");
    showToast(isLenormandMode ? feedbackCopy.lenormandRegenerated : feedbackCopy.tarotRegenerated, "success");
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
  function handleResetAll() { setQuestion(""); setManualCategory("auto"); setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || ""); setAllowReversed(true); resetDrawState(); setFeedback(""); setStage("question"); }

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
              ✦ AI 오라클 프롬프트 아틀리에 ✦
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: "#fff", textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
              <span className="text-[#e9d5ff]">질문을 올리고</span>
              <span className="mx-3 text-[#c084fc]">→</span>
              <span className="text-[#e9d5ff]">카드를 열어</span>
              <span className="mx-3 text-[#c084fc]">→</span>
              <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">AI 프롬프트로</span>
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
            <StepIndicator current={stage} />
          </div>

          {/* ── Stage Content ── */}
          <div className="flex-1">
            <AnimatePresence mode="wait" initial={false}>

              {/* ━━━ QUESTION STAGE ━━━ */}
              {stage === "question" && (
                <motion.div
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
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#e9d5ff]">{isLenormandMode ? "질문" : "마음 속 질문을 들려주세요"}</h2>
                      <p className="mt-2 text-[#a78bfa]/80 text-sm leading-relaxed">
                        {isLenormandMode ? "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다." : "타로가 당신만의 이야기를 풀어낼 준비를 합니다."}
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
                          <span className="block text-[10px] uppercase tracking-[0.18em] opacity-70">{ORACLE_MODE_META[mode].eyebrow}</span>
                          <span className="mt-1 block text-sm font-bold">{ORACLE_MODE_META[mode].title}</span>
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
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70">질문 카테고리</div>
                            <div className="text-xs text-[#a78bfa]/70 mt-1">자동 추정: {categoryLabel[detectedCategory]}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setManualCategory("auto")}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${manualCategory === "auto" ? "border-[#f59e0b]/45 bg-[#f59e0b]/15 text-[#fde68a]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                          >
                            자동 추정
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
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70 mb-1">선택된 스프레드</div>
                          <div className="text-[#e9d5ff] font-semibold text-base">{selectedSpread.title}</div>
                          <div className="text-[#a78bfa]/70 text-xs mt-0.5">{selectedSpread.cardCount}장 · {DIFFICULTY_LABEL[selectedSpread.difficulty]} · {isLenormandMode ? "레노먼드" : `상담 카테고리 ${categoryLabel[selectedQuestionCategory]}`}</div>
                          <div className="text-[#c4b5fd]/60 text-xs mt-1 leading-relaxed">{selectedSpread.purpose}</div>
                        </div>
                        {!isLenormandMode && <button
                          type="button"
                          onClick={() => setShowSpreadPicker(true)}
                          className="px-4 py-2 rounded-full border border-[#c084fc]/40 bg-[#c084fc]/10 text-[#e9d5ff] text-xs font-semibold hover:bg-[#c084fc]/20 transition-all"
                        >
                          스프레드 바꾸기
                        </button>}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border border-[#6d28d9]/35 p-4 mb-5"
                      style={{ background: "rgba(15,5,35,0.48)" }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70">추천 질문</div>
                          <div className="text-xs text-[#a78bfa]/70 mt-1">{selectedSpread.title} · {isLenormandMode ? "레노먼드" : categoryLabel[selectedQuestionCategory]}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRecommendedQuestion(recommendedQuestions[0] || defaultQuestionByCategory[selectedQuestionCategory])}
                          className="px-3 py-1.5 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 text-xs font-semibold text-[#fde68a] hover:bg-[#f59e0b]/15 transition-all"
                        >
                          첫 질문 적용
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
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#fbbf24]/70">무료 레노먼드 프롬프트</div>
                          <div className="mt-1 text-sm leading-relaxed text-[#fde68a]/90">질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.</div>
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
                            setQuestion(isLenormandMode ? LENORMAND_DEFAULT_QUESTION : defaultQuestionByCategory[selectedQuestionCategory]);
                            setFeedback("");
                            setQuestionStatus(isLenormandMode ? feedbackCopy.lenormandDefaultStatus : feedbackCopy.categoryDefaultStatus);
                          }}
                        className="flex-1 px-4 py-3 rounded-full border border-white/15 bg-white/5 text-[#c4b5fd] text-sm font-medium hover:bg-white/10 transition-all"
                      >
                        {isLenormandMode ? "레노먼드 기본 질문" : "카테고리 기본 질문"}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleStartDraw}
                        className="flex-1 sm:flex-[2] px-6 py-3 rounded-full font-bold text-sm text-[#1a0533] shadow-lg transition-all"
                        style={{ background: "linear-gradient(90deg, #c084fc, #f472b6, #fbbf24)", boxShadow: "0 8px 30px rgba(192,132,252,0.35)" }}
                      >
                        {oracleModeMeta.drawLabel}
                      </motion.button>
                    </div>

                    {feedback && <p className="mt-3 text-rose-300/90 text-sm text-center">{feedback}</p>}
                  </div>
                </motion.div>
              )}

              {/* ━━━ DRAW STAGE ━━━ */}
              {stage === "draw" && (
                <motion.div
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
                            {progressText} 완료
                          </div>
                          {!isLenormandMode && <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-xs text-[#c4b5fd]">
                            <input type="checkbox" checked={allowReversed} onChange={(e) => setAllowReversed(e.target.checked)} className="accent-[#a855f7] h-3.5 w-3.5" />
                            역방향 포함
                          </label>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={handleGoQuestion} className="px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-[#c4b5fd] hover:bg-white/10 transition-all">← 질문으로 돌아가기</button>
                        <button type="button" onClick={handleResetAll} className="px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-[#c4b5fd] hover:bg-white/10 transition-all">처음으로</button>
                        {!isLenormandMode && <button type="button" onClick={() => setShowSpreadPicker(true)} className="px-3 py-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs text-[#c4b5fd] font-semibold hover:bg-[#7c3aed]/20 transition-all">다른 스프레드</button>}
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
                        <div className="ml-auto text-xs text-[#a78bfa]/60">직관이 끌리는 순서대로 카드를 뽑아보세요.</div>
                      </div>
                      <div className="relative" style={{ paddingBottom: "90%", minHeight: 280 }}>
                        {selectedSpread.positions.map((position) => {
                          const drawn = drawnCards.find((card) => card.slotIndex === position.index);
                          return (
                            <motion.div
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
                                  <motion.div
                                    key={`${drawn.cardCode}-${drawn.slotIndex}`}
                                    initial={{ rotateY: 120, opacity: 0, scale: 0.85 }}
                                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 230, damping: 22 }}
                                    className="h-full flex flex-col"
                                    style={{ backfaceVisibility: "hidden" }}
                                  >
                                    <img src={drawn.image} alt={drawn.cardNameKo} className="w-full flex-1 object-cover" style={{ filter: !isLenormandMode && drawn.orientation === "reversed" ? "hue-rotate(180deg) brightness(0.85)" : undefined, transform: !isLenormandMode && drawn.orientation === "reversed" ? "rotate(180deg)" : undefined }} />
                                    <div className="px-1 py-1 text-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                                      <div className="text-[9px] font-bold text-[#e9d5ff] leading-tight line-clamp-1">{drawn.cardNameKo}</div>
                                      <div className="text-[8px] text-[#f472b6]">{isLenormandMode ? "조합 읽기" : drawn.orientationLabel}</div>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center rounded-xl border-dashed border border-[#7c3aed]/30" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}>
                                    <div className="text-[10px] font-bold text-[#c084fc]">{position.index}</div>
                                    <div className="text-[8px] text-white/40 mt-0.5 text-center px-1 leading-tight line-clamp-2">{position.label}</div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Position guide */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(10,5,25,0.7)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">포지션 의미</div>
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
                        <div className="relative w-24 h-36 cursor-pointer group" onClick={drawnCards.length < selectedSpread.cardCount ? drawCardFromStack : undefined}>
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

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={drawCardFromStack}
                        disabled={drawnCards.length >= selectedSpread.cardCount}
                        className="w-full py-3 rounded-2xl font-bold text-sm text-[#1a0533] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 6px 25px rgba(168,85,247,0.3)" }}
                      >
                        {isLenormandMode ? "레노먼드 카드 뽑기" : "✦ 카드 뽑기"}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setShowFullDeck((p) => !p)}
                        className="mt-2 w-full py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-[#a78bfa] hover:bg-white/10 transition-all"
                      >
                        {showFullDeck ? "전체 카드 목록 닫기" : "전체 카드 직접 선택"}
                      </button>

                      <AnimatePresence>
                        {showFullDeck && (
                          <motion.div
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
                                  <span className="block text-[10px] font-bold leading-tight line-clamp-1">{card.cardNameKo}</span>
                                  <span className="block text-[8px] text-[#a78bfa]/60 leading-tight line-clamp-1">{card.keywords.slice(0, 2).join(" · ") || card.cardNameEn}</span>
                                </button>
                              );
                            })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Drawn cards list */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(10,5,25,0.7)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">선택된 카드</div>
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
                                      <span className="text-xs text-[#f3e8ff] font-medium truncate">{drawn.cardNameKo}</span>
                                      <span className="text-[10px] text-[#f472b6] shrink-0">{isLenormandMode ? "레노먼드" : drawn.orientationLabel}</span>
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-white/40 leading-relaxed line-clamp-2">{drawn.positionDescription}</div>
                                  </div>
                                  {!isLenormandMode && <button
                                    type="button"
                                    onClick={() => toggleDrawnCardOrientation(index)}
                                    className="shrink-0 px-2 py-1 rounded-full border border-[#c084fc]/30 bg-[#c084fc]/10 text-[10px] font-semibold text-[#e9d5ff] hover:bg-[#c084fc]/20 transition-all"
                                  >
                                    방향 변경
                                  </button>}
                                </div>
                              ) : (
                                <div className="mt-0.5 text-[10px] text-white/30">아직 선택되지 않았어요.</div>
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
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={handleGeneratePrompt}
                      disabled={drawnCards.length !== selectedSpread.cardCount || isGenerating || (!isLenormandMode && isPaying)}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-[#1a0533] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 8px 30px rgba(168,85,247,0.3)" }}
                    >
                      {isGenerating || (!isLenormandMode && isPaying) ? feedbackCopy.generating : oracleModeMeta.promptLabel}
                    </motion.button>

                    {feedback && <p className="text-rose-300/80 text-xs text-center">{feedback}</p>}
                  </div>
                </motion.div>
              )}

              {/* ━━━ PROMPT STAGE ━━━ */}
              {stage === "prompt" && promptResult && (
                <motion.div
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
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60 mb-2">{isLenormandMode ? "레노먼드 프롬프트 지도" : "AI 상담 프롬프트 지도"}</div>
                      <h2 className="text-xl font-bold text-[#e9d5ff] mb-2">{selectedSpread.title}</h2>
                      <p className="text-xs text-[#a78bfa]/75 leading-relaxed mb-2">{promptResult.effectiveQuestion}</p>
                      <p className="text-xs text-[#c4b5fd]/65 leading-relaxed">{promptResult.summary}</p>
                    </div>

                    {/* Card images strip */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(8,4,20,0.75)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">선택된 카드</div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {drawnCards.slice(0, 5).map((card, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-20 rounded-lg overflow-hidden border border-[#7c3aed]/30 shadow-md">
                              <img src={card.image} alt={card.cardNameKo} className="w-full h-full object-cover" style={{ filter: !isLenormandMode && card.orientation === "reversed" ? "brightness(0.75)" : undefined, transform: !isLenormandMode && card.orientation === "reversed" ? "rotate(180deg)" : undefined }} />
                            </div>
                            <div className="text-[8px] text-[#c4b5fd] text-center w-14 leading-tight line-clamp-2">{card.cardNameKo}</div>
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
                                <span className="text-xs font-semibold text-[#f3e8ff]">{drawn.cardNameKo}</span>
                                <span className="text-[10px] text-[#f472b6]">{isLenormandMode ? "레노먼드" : drawn.orientationLabel}</span>
                              </div>
                              <div className="text-[10px] text-white/45 mt-0.5 leading-relaxed">{drawn.positionDescription}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Spread summary */}
                    <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(5,3,15,0.6)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-2">카드가 만든 신탁 지도</div>
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
                          <div className="text-base font-bold text-[#e9d5ff] mt-0.5">{isLenormandMode ? "지금 복사할 무료 레노먼드 프롬프트" : "지금 복사할 AI 오라클 프롬프트 ✦"}</div>
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
                      <button type="button" onClick={() => handleTunePrompt("상담톤 강화", "전체 답변을 실제 상담사가 눈앞의 질문자에게 말하듯 자연스럽게 이어 주세요. 카드 이름보다 질문의 맥락, 포지션 의미, 카드 간 관계를 먼저 설명하고, 문장 끝마다 질문자의 주도권을 회복시키는 방향으로 정리하세요.")} className="py-2.5 rounded-xl border border-[#c084fc]/30 bg-[#c084fc]/10 text-xs font-semibold text-[#e9d5ff] hover:bg-[#c084fc]/20 transition-all">
                        상담톤 강화
                      </button>
                      <button type="button" onClick={() => handleTunePrompt("더 현실적으로", "상징 해석 뒤에는 반드시 현실적인 판단 기준과 행동 순서를 붙여 주세요. 법률, 의료, 투자, 임신, 합격 여부 등 민감한 주제는 참고용 조언으로만 표현하고 전문가 상담을 함께 권하세요.")} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        더 현실적으로
                      </button>
                      <button type="button" onClick={() => handleTunePrompt("더 따뜻하게", "답변의 온도를 조금 더 부드럽게 낮추고, 불안한 질문자가 숨을 고를 수 있도록 위로와 선택지를 함께 주세요. 공포를 주는 표현이나 단정적 미래 예언은 피하세요.")} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        더 따뜻하게
                      </button>
                      <button type="button" onClick={handleRegeneratePrompt} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        ↺ 같은 카드로 다시 엮기
                      </button>
                      <button type="button" onClick={handleRedrawCards} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        🃏 카드 다시 열기
                      </button>
                      {!isLenormandMode && <button type="button" onClick={handleChooseAnotherSpread} className="py-2.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20 transition-all">
                        다른 스프레드 선택
                      </button>}
                      <button type="button" onClick={handleResetAll} className="py-2.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20 transition-all">
                        처음부터 다시 시작
                      </button>
                    </div>

                    {feedback && <p className="text-rose-300/80 text-xs text-center">{feedback}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <section className="mt-6 grid gap-3 rounded-3xl border border-[#c084fc]/20 bg-black/20 p-5 text-[#ede9fe]/80 backdrop-blur-sm md:grid-cols-3">
            <article>
              <h2 className="text-base font-bold text-[#f5d0fe]">무엇을 정리하나요</h2>
              <p className="mt-2 text-xs leading-6">
                질문의 주제, 선택한 스프레드, 카드의 방향을 한 문장씩 엮어 타로 상담에 바로 쓸 수 있는 프롬프트 흐름으로 정리합니다.
                레노먼드는 사건의 순서와 행동 단서를, 타로는 마음의 층과 상징의 결을 더 깊게 비춥니다.
              </p>
            </article>
            <article>
              <h2 className="text-base font-bold text-[#f5d0fe]">어떻게 읽으면 좋나요</h2>
              <p className="mt-2 text-xs leading-6">
                질문을 구체적으로 적을수록 결과는 막연한 길흉보다 현재 상황, 반복 신호, 전환 단서, 현실 행동 쪽으로 선명해집니다.
                무료 레노먼드는 흐름 정리에, 유료 오라클 프롬프트는 더 긴 상담 문장과 조율 지시에 어울립니다.
              </p>
            </article>
            <article>
              <h2 className="text-base font-bold text-[#f5d0fe]">주의할 점</h2>
              <p className="mt-2 text-xs leading-6">
                결과는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 의료, 법률, 투자, 임신, 합격 여부처럼 손실이 큰 결정은
                이 리딩만으로 확정하지 말고 현실 정보와 전문가 상담을 함께 확인하세요. 프롬프트는 판단을 대신하지 않고 질문을 더 맑게 정리하는 도구로 읽어 주세요.
              </p>
            </article>
            <article className="md:col-span-3">
              <h2 className="text-base font-bold text-[#f5d0fe]">좋은 질문을 만드는 법</h2>
              <p className="mt-2 text-xs leading-6">
                “그 사람이 돌아올까요”처럼 결말을 묻는 질문보다 “지금 이 관계에서 내가 확인해야 할 신호는 무엇인가요”처럼
                마음과 행동을 함께 묻는 문장이 더 안정적으로 읽힙니다. 프롬프트를 복사한 뒤에는 카드 이름만 나열하기보다,
                현재 상황, 상대와 나의 감정, 현실적으로 할 수 있는 선택지를 함께 적어 두면 해석이 덜 단정적이고 더 상담답게 열립니다.
                같은 카드 조합이라도 질문의 시점과 태도에 따라 메시지는 달라질 수 있으니, 결과를 압박으로 받아들이기보다
                오늘 정리할 한 문장과 줄여야 할 행동 하나를 고르는 방식으로 사용해 주세요.
              </p>
              <p className="mt-2 text-xs leading-6">
                타로 초보자는 1장 또는 3장 스프레드로 질문의 방향을 먼저 잡고, 복잡한 관계나 커리어 고민은 5장 이상의 스프레드로
                배경과 행동 단서를 나누어 보는 편이 좋습니다. 결과가 마음에 들지 않더라도 같은 질문을 반복해서 뽑기보다,
                질문을 더 정확하게 다듬거나 하루 정도 시간을 둔 뒤 다시 읽으면 상징이 더 차분하게 다가옵니다.
                저장한 프롬프트는 상담 기록처럼 다시 보며 마음의 변화와 선택의 흐름을 비교해도 좋습니다.
                처음 방문한 사용자는 무료 레노먼드로 흐름을 익힌 뒤, 필요한 때에만 더 긴 오라클 프롬프트를 열어도 충분합니다.
              </p>
              <p className="mt-2 text-xs leading-6">
                입력값은 질문 문장, 고민 주제, 선택한 스프레드, 뽑은 카드입니다. 질문 문장은 상담의 초점을 정하고,
                고민 주제는 사랑·일·돈·건강처럼 해석에서 조심해야 할 경계를 알려 줍니다. 스프레드는 시간의 흐름이나
                관계의 위치를 나누고, 카드는 그 자리에 놓인 상징을 비춥니다. 예를 들어 “이직을 준비해도 될까요”라는 질문에
                현재·장애물·조언 3장을 놓았다면, 프롬프트는 합격이나 수입을 단정하기보다 준비 상태, 확인해야 할 현실 조건,
                무리하지 않고 움직일 수 있는 순서를 묻는 문장으로 정리됩니다.
              </p>
            </article>
          </section>

          <div className="h-8" />
        </div>
      </div>

      {/* ── Spread Picker Modal ── */}
      <AnimatePresence>
        {showSpreadPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
            style={{ background: "rgba(5,2,15,0.75)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
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
                  <div className="text-lg font-bold text-[#e9d5ff] mt-0.5">✦ 다른 스프레드 보기</div>
                </div>
                <button type="button" onClick={() => setShowSpreadPicker(false)} className="px-3 py-1.5 rounded-full border border-white/14 bg-white/6 text-sm text-[#a78bfa] hover:bg-white/12 transition-all">닫기</button>
              </div>

              {/* Search and filters */}
              <div className="px-5 py-3 space-y-2 border-b border-white/5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="스프레드 검색"
                    className="rounded-xl border border-[#6d28d9]/35 bg-black/30 px-3 py-2 text-sm text-[#f3e8ff] outline-none placeholder:text-[#7c3aed]/40"
                  />
                  <div className="rounded-xl border border-[#6d28d9]/25 bg-black/20 px-3 py-2 text-xs text-[#a78bfa]/70">
                    추천 테마: {categoryLabel[detectedCategory]}
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
                      {count === "all" ? "전체" : `${count}장`}
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
                      <motion.button
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
                          {recommended && <span className="px-1.5 py-0.5 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 text-[9px] text-[#fcd34d]">추천</span>}
                        </div>
                        <div className="text-sm font-bold text-[#e9d5ff]">{spread.title}</div>
                        <div className="text-xs text-[#a78bfa]/60 mt-0.5">{spread.cardCount}장 · {DIFFICULTY_LABEL[spread.difficulty]}</div>
                        <p className="mt-2 text-xs leading-relaxed text-white/55">{spread.purpose}</p>
                      </motion.button>
                    );
                  })}
                  {!filteredSpreads.length && (
                    <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/3 px-4 py-10 text-center text-sm text-white/45">
                      조건에 맞는 스프레드가 없습니다. 필터를 조정해 주세요.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
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
