// 마야점(Maya Sacred Calendar) UI 크롬 공용 카피 — MAYA_PROMPT_TOPICS(AI 프롬프트 페이로드 값)와
// src/data/maya-calendar-symbols.ts(Tzolk'in/Haab 서명·키워드 고유명사), maya-calendar.ts의
// labelKo/weekdayKo(계산된 한국어 날짜 표기)는 대상이 아니다 — 후자는 다른 클러스터의
// "ko-KR 하드코딩 날짜 포맷" 이슈(핸드오프 문서 항목 7)와 같은 범주라 이 PR 범위 밖.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getMayaCopy()가 EN과 병합해 자동 폴백한다.

import { useEffect, useState } from "react";
import { FEATURE_KEY_PRICE_TABLE } from "@/worker/lib/paid-feature-registry.js";

const mayaPrice = new Intl.NumberFormat("ko-KR").format(FEATURE_KEY_PRICE_TABLE["maya-prompt-generator"].amountKRW);
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface MayaCopy {
  historyTitle: string;
  readAgain: string;
  retryDelivery: string;
  deliveryRetry: string;
  deliveryReview: string;
  supportLink: string;
  templeVisualAlt: string;
  heroTitle: string;
  heroTagline: string;
  heroDescription: string;
  chipLongCount: string;
  chipTzolkin: string;
  chipHaab: string;

  dateSectionLabel: string;
  dateSectionTitle: string;
  selectedCoordinatePrefix: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  yearSelectAria: string;
  monthSelectAria: string;
  daySelectAria: string;
  yearSuffix: (year: number) => string;
  monthSuffix: (month: number) => string;
  daySuffix: (day: number) => string;
  todayButton: string;

  monthGridLabel: string;
  monthGridTitle: (year: number, month: number) => string;
  monthGridDesc: string;
  weekdays: string[];
  cellAria: (dateLabel: string, tzolkin: string, haab: string) => string;
  todayBadge: string;

  referenceHeading: string;
  referenceDisclaimer: string;

  summarySelectedCoordinate: string;
  summaryCorrelationNote: string;
  longCountName: string;
  longCountDesc: string;
  tzolkinName: string;
  tzolkinDesc: string;
  haabName: string;
  haabDesc: string;
  tzolkinKeywordsLabel: string;
  haabKeywordsLabel: string;
  calcBasisLabel: string;

  promptFeatureReason: string;
  promptPriceLabel: string;
  gateTitle: string;
  gateCheckingMessage: string;
  errorLoginRequired: string;
  errorInsufficientCoins: string;
  errorPaymentFailedFallback: string;
  errorInterrupted: string;
  successGenerated: string;
  successCopied: string;
  buttonOpening: string;
  buttonRegenerate: string;
  buttonGenerate: string;
  promptHeading: string;
  promptDesc: string;
  nameLabel: string;
  namePlaceholder: string;
  birthDateLabel: string;
  topicLabel: string;
  questionLabel: string;
  questionPlaceholder: string;
  copyButton: string;
  resultHeading: string;
  resultDesc: string;
  emptyStateTitle: string;
  emptyStateDesc: string;
}

const MAYA_COPY_EN: MayaCopy = {
  templeVisualAlt: "A golden sun-calendar ring over a highland ruin silhouette",
  historyTitle: "Saved Maya consultations",
  readAgain: "View result",
  retryDelivery: "Resume this consultation",
  deliveryRetry: "Your answer is not ready yet. Resume the same consultation without paying again.",
  deliveryReview: "Your saved consultation needs review. Please contact support before paying again.",
  supportLink: "Consultation and payment support",
  heroTitle: "Maya Reading",
  heroTagline: "Read today's flow through the time code of an ancient calendar",
  heroDescription: "Explore the selected date's Long Count, Tzolk'in and Haab values, and bring one question to a saved Maya calendar consultation.",
  chipLongCount: "Long Count time coordinate",
  chipTzolkin: "Tzolk'in inner rhythm",
  chipHaab: "Haab season of the sun",

  dateSectionLabel: "Maya Date",
  dateSectionTitle: "Choose a date",
  selectedCoordinatePrefix: "Selected time coordinate",
  yearLabel: "Year",
  monthLabel: "Month",
  dayLabel: "Day",
  yearSelectAria: "Select Maya calendar year",
  monthSelectAria: "Select Maya calendar month",
  daySelectAria: "Select Maya calendar day",
  yearSuffix: (year) => String(year),
  monthSuffix: (month) => String(month),
  daySuffix: (day) => String(day),
  todayButton: "Today's Maya code",

  monthGridLabel: "Maya Month Grid",
  monthGridTitle: (year, month) => `Maya calendar for ${year}-${String(month).padStart(2, "0")}`,
  monthGridDesc: "See each date's Tzolk'in and Haab flow clearly.",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  cellAria: (dateLabel, tzolkin, haab) => `Select ${dateLabel}, Tzolk'in ${tzolkin}, Haab ${haab}`,
  todayBadge: "Today",

  referenceHeading: "Note",
  referenceDisclaimer: "Calendar symbols and AI interpretations are for reflection and entertainment. Pair important decisions with practical judgment and professional advice.",

  summarySelectedCoordinate: "Selected time coordinate",
  summaryCorrelationNote: "Maya calendar coordinates calculated on the GMT 584283 correlation.",
  longCountName: "Long Count",
  longCountDesc: "Your current position within the grand flow of time",
  tzolkinName: "Tzolk'in",
  tzolkinDesc: "The inner rhythm of a 260-day cycle",
  haabName: "Haab",
  haabDesc: "The seasonal flow of a 365-day solar year",
  tzolkinKeywordsLabel: "Tzolk'in keywords",
  haabKeywordsLabel: "Haab keywords",
  calcBasisLabel: "Calculation basis",

  promptFeatureReason: "Maya calendar consultation",
  promptPriceLabel: `One-time ₩${mayaPrice}`,
  gateTitle: "Maya calendar consultation",
  gateCheckingMessage: "Checking your pass",
  errorLoginRequired: "Please log in to check your pass or payment.",
  errorInsufficientCoins: "Your available payment balance is insufficient. Please top up on the payment page and try again.",
  errorPaymentFailedFallback: "Payment verification failed. Please try again shortly.",
  errorInterrupted: "The flow was interrupted while opening the Maya time code. Please try again shortly.",
  successGenerated: "Your consultation is saved. Reopen it from your history below.",
  successCopied: "Consultation copied.",
  buttonOpening: "Connecting the calendar symbols to your question…",
  buttonRegenerate: "Prepare a new question",
  buttonGenerate: "Start Maya consultation",
  promptHeading: "Maya calendar consultation",
  promptDesc: "One question, interpreted with calculated Tzolk’in, Haab and Long Count values. Your completed answer is saved for rereading.",
  nameLabel: "Name or nickname",
  namePlaceholder: "Optional",
  birthDateLabel: "Date of birth (optional)",
  topicLabel: "Consultation topic",
  questionLabel: "Consultation question",
  questionPlaceholder: "Describe one question in 2–500 characters. Your input is sent to the server to generate and save the consultation.",
  copyButton: "Copy consultation",
  resultHeading: "Your Maya consultation",
  resultDesc: "Based on your question and the calculated calendar for your selected date.",
  emptyStateTitle: "Bring your question to the calendar.",
  emptyStateDesc: "The answer explores possibilities and conditions. Each new question starts a separate consultation.",
};

const MAYA_COPY: Partial<Record<LoadingLocale, MayaCopy>> = {
  ko: {
    templeVisualAlt: "금빛 태양 달력 링과 고산 유적 실루엣",
    historyTitle: "저장한 마야 상담",
    readAgain: "결과 확인하기",
    retryDelivery: "같은 상담 다시 받기",
    deliveryRetry: "상담을 아직 마치지 못했어요. 다시 결제하지 않고 같은 상담을 이어 받을 수 있어요.",
    deliveryReview: "저장된 상담의 확인이 필요해요. 다시 결제하지 말고 문의해 주세요.",
    supportLink: "상담·결제 문의",
    heroTitle: "마야점",
    heroTagline: "고대 달력의 시간 코드로 오늘의 흐름을 읽습니다",
    heroDescription: "선택한 날짜의 장기력·촐킨·하아브를 살펴보고, 시간의 상징에 나의 질문을 더해 보세요. 완성된 상담은 저장해 다시 읽을 수 있어요.",
    chipLongCount: "Long Count 시간 좌표",
    chipTzolkin: "Tzolk'in 내면 리듬",
    chipHaab: "Haab 태양의 계절",

    dateSectionLabel: "Maya Date",
    dateSectionTitle: "날짜 선택",
    selectedCoordinatePrefix: "선택된 시간 좌표",
    yearLabel: "연도",
    monthLabel: "월",
    dayLabel: "일",
    yearSelectAria: "마야 달력 연도 선택",
    monthSelectAria: "마야 달력 월 선택",
    daySelectAria: "마야 달력 일 선택",
    yearSuffix: (year) => `${year}년`,
    monthSuffix: (month) => `${month}월`,
    daySuffix: (day) => `${day}일`,
    todayButton: "오늘의 마야 코드",

    monthGridLabel: "Maya Month Grid",
    monthGridTitle: (year, month) => `${year}년 ${month}월 마야 달력`,
    monthGridDesc: "각 날짜의 Tzolk'in과 Haab 흐름을 선명하게 확인합니다.",
    weekdays: ["일", "월", "화", "수", "목", "금", "토"],
    cellAria: (dateLabel, tzolkin, haab) => `${dateLabel} 선택, Tzolk'in ${tzolkin}, Haab ${haab}`,
    todayBadge: "오늘",

    referenceHeading: "참고",
    referenceDisclaimer: "달력의 상징과 AI 해석은 나를 돌아보기 위한 참고용입니다. 중요한 결정에는 현실의 정보와 전문가의 조언을 함께 살펴보세요.",

    summarySelectedCoordinate: "선택된 시간 좌표",
    summaryCorrelationNote: "GMT 584283 기준으로 계산된 마야 달력 좌표입니다.",
    longCountName: "Long Count",
    longCountDesc: "장대한 시간의 흐름 속 현재 위치",
    tzolkinName: "Tzolk'in",
    tzolkinDesc: "260일 주기의 내면 리듬",
    haabName: "Haab",
    haabDesc: "365일 태양력의 계절 흐름",
    tzolkinKeywordsLabel: "Tzolk'in 키워드",
    haabKeywordsLabel: "Haab 키워드",
    calcBasisLabel: "계산 기준",

    promptFeatureReason: "마야 달력 질문 상담",
    promptPriceLabel: `1회 ${mayaPrice}원`,
    gateTitle: "마야 달력 상담",
    gateCheckingMessage: "이용권 확인 중",
    errorLoginRequired: "로그인 후 이용권 또는 결제를 확인할 수 있습니다.",
    errorInsufficientCoins: "결제 가능 금액이 부족합니다. 결제 페이지에서 충전 후 다시 시도해 주세요.",
    errorPaymentFailedFallback: "결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    errorInterrupted: "마야 시간 코드를 여는 중 흐름이 끊겼어요. 잠시 후 다시 시도해 주세요.",
    successGenerated: "상담이 저장됐어요. 아래 상담 이력에서 다시 읽을 수 있어요.",
    successCopied: "상담 내용을 복사했어요.",
    buttonOpening: "시간의 상징을 질문에 연결하고 있어요.",
    buttonRegenerate: "새 질문 준비하기",
    buttonGenerate: "마야 상담 시작하기",
    promptHeading: "마야 달력 상담",
    promptDesc: "촐킨·하아브·장기력의 계산 근거로 질문 한 건을 상담합니다. 완성된 답변은 저장되며 상담 이력에서 다시 읽을 수 있어요.",
    nameLabel: "이름 또는 닉네임",
    namePlaceholder: "미입력 가능",
    birthDateLabel: "생년월일, 선택",
    topicLabel: "상담 주제",
    questionLabel: "상담 질문",
    questionPlaceholder: "지금 고민하는 선택이나 상황을 2~500자로 적어 주세요. 입력은 상담 생성과 저장을 위해 서버로 전송됩니다.",
    copyButton: "상담 복사하기",
    resultHeading: "나의 마야 달력 상담",
    resultDesc: "선택한 날짜의 계산 근거와 질문을 함께 읽은 상담입니다.",
    emptyStateTitle: "시간의 상징에 나의 질문을 더해 보세요.",
    emptyStateDesc: "답변은 가능성과 선택의 조건을 중심으로 전합니다. 새 질문은 별도의 상담으로 진행됩니다.",
  },
  ja: {
    templeVisualAlt: "黄金の太陽暦の輪と高地遺跡のシルエット",
    historyTitle: "保存したマヤ暦相談",
    readAgain: "結果を読む",
    retryDelivery: "同じ相談を再開",
    deliveryRetry: "回答の準備中です。再決済せず同じ相談を再開できます。",
    deliveryReview: "保存した相談の確認が必要です。再決済せずお問い合わせください。",
    supportLink: "相談・決済のお問い合わせ",
    heroTitle: "マヤ占い",
    heroTagline: "古代暦の時間コードで今日の流れを読みます",
    heroDescription: "選択した日付の長期暦・ツォルキン・ハアブを確認し、質問をマヤ暦の象徴と一緒に考えましょう。完成した相談は保存して読み返せます。",
    chipLongCount: "Long Count 時間座標",
    chipTzolkin: "Tzolk'in 内面のリズム",
    chipHaab: "Haab 太陽の季節",

    dateSectionLabel: "Maya Date",
    dateSectionTitle: "日付を選択",
    selectedCoordinatePrefix: "選択された時間座標",
    yearLabel: "年",
    monthLabel: "月",
    dayLabel: "日",
    yearSelectAria: "マヤ暦の年を選択",
    monthSelectAria: "マヤ暦の月を選択",
    daySelectAria: "マヤ暦の日を選択",
    yearSuffix: (year) => `${year}年`,
    monthSuffix: (month) => `${month}月`,
    daySuffix: (day) => `${day}日`,
    todayButton: "今日のマヤコード",

    monthGridLabel: "Maya Month Grid",
    monthGridTitle: (year, month) => `${year}年${month}月 マヤ暦`,
    monthGridDesc: "各日付のTzolk'inとHaabの流れをはっきり確認できます。",
    weekdays: ["日", "月", "火", "水", "木", "金", "土"],
    cellAria: (dateLabel, tzolkin, haab) => `${dateLabel}を選択、Tzolk'in ${tzolkin}、Haab ${haab}`,
    todayBadge: "今日",

    referenceHeading: "参考",
    referenceDisclaimer: "暦の象徴とAI解釈は振り返りのための参考情報です。大切な判断には現実の情報や専門家の助言も合わせて考えてください。",

    summarySelectedCoordinate: "選択された時間座標",
    summaryCorrelationNote: "GMT 584283基準で計算されたマヤ暦の座標です。",
    longCountName: "Long Count",
    longCountDesc: "壮大な時間の流れの中の現在位置",
    tzolkinName: "Tzolk'in",
    tzolkinDesc: "260日周期の内面のリズム",
    haabName: "Haab",
    haabDesc: "365日太陽暦の季節の流れ",
    tzolkinKeywordsLabel: "Tzolk'in キーワード",
    haabKeywordsLabel: "Haab キーワード",
    calcBasisLabel: "計算基準",

    promptFeatureReason: "マヤ暦の質問相談",
    promptPriceLabel: `1回 ${mayaPrice}ウォン`,
    gateTitle: "マヤ暦の相談",
    gateCheckingMessage: "利用券を確認中",
    errorLoginRequired: "ログイン後、利用券または決済を確認できます。",
    errorInsufficientCoins: "決済可能な金額が不足しています。決済ページでチャージ後、もう一度お試しください。",
    errorPaymentFailedFallback: "決済確認に失敗しました。しばらくしてからもう一度お試しください。",
    errorInterrupted: "マヤの時間コードを開く途中で流れが途切れました。しばらくしてからもう一度お試しください。",
    successGenerated: "相談を保存しました。下の履歴から読み返せます。",
    successCopied: "相談内容をコピーしました。",
    buttonOpening: "暦の象徴と質問を結び付けています…",
    buttonRegenerate: "新しい質問を準備",
    buttonGenerate: "マヤ暦の相談を始める",
    promptHeading: "マヤ暦の相談",
    promptDesc: "ツォルキン・ハアブ・長期暦の計算に基づき、質問1件に答えます。完成した回答は保存され、読み返せます。",
    nameLabel: "名前またはニックネーム",
    namePlaceholder: "未入力可",
    birthDateLabel: "生年月日（任意）",
    topicLabel: "相談テーマ",
    questionLabel: "相談内容",
    questionPlaceholder: "質問を2〜500文字で入力してください。相談の作成・保存のためサーバーに送信されます。",
    copyButton: "相談をコピー",
    resultHeading: "あなたのマヤ暦相談",
    resultDesc: "選んだ日付の計算根拠と質問を合わせて読み解きます。",
    emptyStateTitle: "暦の象徴に、あなたの質問を。",
    emptyStateDesc: "可能性や選択の条件を考えます。新しい質問は別の相談となります。",
  },
  "zh-CN": {
    templeVisualAlt: "金色太阳历法环与高原遗迹剪影",
    historyTitle: "已保存的玛雅咨询",
    readAgain: "查看结果",
    retryDelivery: "继续同一咨询",
    deliveryRetry: "答复尚未完成，可继续同一咨询，无需再次付款。",
    deliveryReview: "已保存的咨询需要核实，请勿再次付款，请联系客服。",
    supportLink: "咨询与付款帮助",
    heroTitle: "玛雅占卜",
    heroTagline: "以古代历法的时间密码解读今日的流转",
    heroDescription: "查看所选日期的长纪历、卓尔金历和哈布历数值，结合历法象征探讨一个问题。完成的咨询可保存并重读。",
    chipLongCount: "Long Count 时间坐标",
    chipTzolkin: "Tzolk'in 内在节律",
    chipHaab: "Haab 太阳的季节",

    dateSectionLabel: "Maya Date",
    dateSectionTitle: "选择日期",
    selectedCoordinatePrefix: "已选时间坐标",
    yearLabel: "年",
    monthLabel: "月",
    dayLabel: "日",
    yearSelectAria: "选择玛雅历年份",
    monthSelectAria: "选择玛雅历月份",
    daySelectAria: "选择玛雅历日期",
    yearSuffix: (year) => `${year}年`,
    monthSuffix: (month) => `${month}月`,
    daySuffix: (day) => `${day}日`,
    todayButton: "今日的玛雅密码",

    monthGridLabel: "Maya Month Grid",
    monthGridTitle: (year, month) => `${year}年${month}月 玛雅历`,
    monthGridDesc: "清晰查看每个日期的Tzolk'in与Haab流转。",
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    cellAria: (dateLabel, tzolkin, haab) => `选择${dateLabel}，Tzolk'in ${tzolkin}，Haab ${haab}`,
    todayBadge: "今日",

    referenceHeading: "说明",
    referenceDisclaimer: "历法象征与AI解读供自我思考与娱乐参考。重要决定请结合现实信息和专业建议。",

    summarySelectedCoordinate: "已选时间坐标",
    summaryCorrelationNote: "按GMT 584283基准计算得出的玛雅历坐标。",
    longCountName: "Long Count",
    longCountDesc: "宏大时间流转中的当前位置",
    tzolkinName: "Tzolk'in",
    tzolkinDesc: "260天周期的内在节律",
    haabName: "Haab",
    haabDesc: "365天太阳历的季节流转",
    tzolkinKeywordsLabel: "Tzolk'in 关键词",
    haabKeywordsLabel: "Haab 关键词",
    calcBasisLabel: "计算依据",

    promptFeatureReason: "玛雅历问题咨询",
    promptPriceLabel: `单次${mayaPrice}韩元`,
    gateTitle: "玛雅历咨询",
    gateCheckingMessage: "正在确认通行证",
    errorLoginRequired: "登录后即可确认通行证或付款。",
    errorInsufficientCoins: "可用付款余额不足，请在付款页面充值后重试。",
    errorPaymentFailedFallback: "付款确认失败，请稍后再试。",
    errorInterrupted: "打开玛雅时间密码时流程中断了，请稍后再试。",
    successGenerated: "咨询已保存，可在下方记录中重新阅读。",
    successCopied: "已复制咨询内容。",
    buttonOpening: "正在结合历法象征解读问题…",
    buttonRegenerate: "准备新问题",
    buttonGenerate: "开始玛雅历咨询",
    promptHeading: "玛雅历咨询",
    promptDesc: "根据卓尔金历、哈布历与长纪历的计算依据，解答一个问题。完整答复会保存，供您重读。",
    nameLabel: "姓名或昵称",
    namePlaceholder: "可不填",
    birthDateLabel: "出生日期（可选）",
    topicLabel: "咨询主题",
    questionLabel: "咨询问题",
    questionPlaceholder: "请输入一个问题（2–500字）。内容将发送至服务器，用于生成和保存咨询。",
    copyButton: "复制咨询",
    resultHeading: "我的玛雅历咨询",
    resultDesc: "结合所选日期的计算依据与问题进行解读。",
    emptyStateTitle: "为时间的象征加上你的问题。",
    emptyStateDesc: "解读以可能性和选择条件为主。每个新问题需另行开启咨询。",
  },
  "zh-TW": {
    templeVisualAlt: "金色太陽曆法環與高原遺跡剪影",
    historyTitle: "已儲存的馬雅諮詢",
    readAgain: "查看結果",
    retryDelivery: "繼續同一諮詢",
    deliveryRetry: "答覆尚未完成，可繼續同一諮詢，無需再次付款。",
    deliveryReview: "已儲存的諮詢需要核實，請勿再次付款，請聯絡客服。",
    supportLink: "諮詢與付款協助",
    heroTitle: "馬雅占卜",
    heroTagline: "以古代曆法的時間密碼解讀今日的流轉",
    heroDescription: "查看所選日期的長紀曆、卓爾金曆和哈布曆數值，結合曆法象徵探討一個問題。完成的諮詢可儲存並重讀。",
    chipLongCount: "Long Count 時間座標",
    chipTzolkin: "Tzolk'in 內在節律",
    chipHaab: "Haab 太陽的季節",

    dateSectionLabel: "Maya Date",
    dateSectionTitle: "選擇日期",
    selectedCoordinatePrefix: "已選時間座標",
    yearLabel: "年",
    monthLabel: "月",
    dayLabel: "日",
    yearSelectAria: "選擇馬雅曆年份",
    monthSelectAria: "選擇馬雅曆月份",
    daySelectAria: "選擇馬雅曆日期",
    yearSuffix: (year) => `${year}年`,
    monthSuffix: (month) => `${month}月`,
    daySuffix: (day) => `${day}日`,
    todayButton: "今日的馬雅密碼",

    monthGridLabel: "Maya Month Grid",
    monthGridTitle: (year, month) => `${year}年${month}月 馬雅曆`,
    monthGridDesc: "清晰查看每個日期的Tzolk'in與Haab流轉。",
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    cellAria: (dateLabel, tzolkin, haab) => `選擇${dateLabel}，Tzolk'in ${tzolkin}，Haab ${haab}`,
    todayBadge: "今日",

    referenceHeading: "說明",
    referenceDisclaimer: "曆法象徵與AI解讀供自我思考與娛樂參考。重要決定請結合現實資訊和專業建議。",

    summarySelectedCoordinate: "已選時間座標",
    summaryCorrelationNote: "按GMT 584283基準計算得出的馬雅曆座標。",
    longCountName: "Long Count",
    longCountDesc: "宏大時間流轉中的當前位置",
    tzolkinName: "Tzolk'in",
    tzolkinDesc: "260天週期的內在節律",
    haabName: "Haab",
    haabDesc: "365天太陽曆的季節流轉",
    tzolkinKeywordsLabel: "Tzolk'in 關鍵詞",
    haabKeywordsLabel: "Haab 關鍵詞",
    calcBasisLabel: "計算依據",

    promptFeatureReason: "馬雅曆問題諮詢",
    promptPriceLabel: `單次${mayaPrice}韓元`,
    gateTitle: "馬雅曆諮詢",
    gateCheckingMessage: "正在確認通行證",
    errorLoginRequired: "登入後即可確認通行證或付款。",
    errorInsufficientCoins: "可用付款餘額不足，請在付款頁面儲值後重試。",
    errorPaymentFailedFallback: "付款確認失敗，請稍後再試。",
    errorInterrupted: "打開馬雅時間密碼時流程中斷了，請稍後再試。",
    successGenerated: "諮詢已儲存，可在下方紀錄中重新閱讀。",
    successCopied: "已複製諮詢內容。",
    buttonOpening: "正在結合曆法象徵解讀問題…",
    buttonRegenerate: "準備新問題",
    buttonGenerate: "開始馬雅曆諮詢",
    promptHeading: "馬雅曆諮詢",
    promptDesc: "根據卓爾金曆、哈布曆與長紀曆的計算依據，解答一個問題。完整答覆會儲存，供您重讀。",
    nameLabel: "姓名或暱稱",
    namePlaceholder: "可不填",
    birthDateLabel: "出生日期（可選）",
    topicLabel: "諮詢主題",
    questionLabel: "諮詢問題",
    questionPlaceholder: "請輸入一個問題（2–500字）。內容將傳送至伺服器，用於生成和儲存諮詢。",
    copyButton: "複製諮詢",
    resultHeading: "我的馬雅曆諮詢",
    resultDesc: "結合所選日期的計算依據與問題進行解讀。",
    emptyStateTitle: "為時間的象徵加上你的問題。",
    emptyStateDesc: "解讀以可能性和選擇條件為主。每個新問題需另行開啟諮詢。",
  },
  en: MAYA_COPY_EN,
};

export function getMayaCopy(locale: LoadingLocale): MayaCopy {
  return { ...MAYA_COPY_EN, ...(MAYA_COPY[locale] || {}) };
}

export function useMayaCopy(): MayaCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getMayaCopy(locale);
}
