// 마야점(Maya Sacred Calendar) UI 크롬 공용 카피 — MAYA_PROMPT_TOPICS(AI 프롬프트 페이로드 값)와
// src/data/maya-calendar-symbols.ts(Tzolk'in/Haab 서명·키워드 고유명사), maya-calendar.ts의
// labelKo/weekdayKo(계산된 한국어 날짜 표기)는 대상이 아니다 — 후자는 다른 클러스터의
// "ko-KR 하드코딩 날짜 포맷" 이슈(핸드오프 문서 항목 7)와 같은 범주라 이 PR 범위 밖.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getMayaCopy()가 EN과 병합해 자동 폴백한다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface MayaCopy {
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
  heroTitle: "Maya Reading",
  heroTagline: "Read today's flow through the time code of an ancient calendar",
  heroDescription: "See the selected date's Long Count, Tzolk'in, and Haab values at a glance, and prepare a consultation prompt based on the symbols of the Maya sacred calendar.",
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
  referenceDisclaimer: "The selected date is presented in Maya calendar notation, and the generated prompt and any external AI reply are for entertainment purposes only. Please pair important decisions with practical judgment and expert consultation.",

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

  promptFeatureReason: "Maya reading consultation prompt generation",
  promptPriceLabel: "One-time ₩3,000",
  gateTitle: "Maya reading prompt generation",
  gateCheckingMessage: "Checking your pass",
  errorLoginRequired: "Please log in to check your pass or payment.",
  errorInsufficientCoins: "Your available payment balance is insufficient. Please top up on the payment page and try again.",
  errorPaymentFailedFallback: "Payment verification failed. Please try again shortly.",
  errorInterrupted: "The flow was interrupted while opening the Maya time code. Please try again shortly.",
  successGenerated: "Your Maya reading prompt is ready. Paste it into your preferred AI to continue the consultation.",
  successCopied: "Your Maya reading prompt has been copied from the stone tablet.",
  buttonOpening: "Opening the ancient time glyph...",
  buttonRegenerate: "Generate again",
  buttonGenerate: "Generate Maya reading prompt",
  promptHeading: "Maya reading prompt generator",
  promptDesc: "Prepares a consultation prompt to ask an AI, based on the selected date's Long Count, Tzolk'in, and Haab values.",
  nameLabel: "Name or nickname",
  namePlaceholder: "Optional",
  birthDateLabel: "Date of birth (optional)",
  topicLabel: "Consultation topic",
  questionLabel: "Consultation question",
  questionPlaceholder: "Optional. Never sent to a server — only reflected into the prompt in your browser.",
  copyButton: "Copy time code",
  resultHeading: "Your completed Maya reading prompt",
  resultDesc: "Generated from the time coordinates of your selected date.",
  emptyStateTitle: "Select a date to unlock the Maya time code.",
  emptyStateDesc: "The flow of your selected date's Long Count, Tzolk'in, and Haab will be woven into the prompt like a coordinate of fate.",
};

const MAYA_COPY: Partial<Record<LoadingLocale, MayaCopy>> = {
  ko: {
    templeVisualAlt: "금빛 태양 달력 링과 고산 유적 실루엣",
    heroTitle: "마야점",
    heroTagline: "고대 달력의 시간 코드로 오늘의 흐름을 읽습니다",
    heroDescription: "선택한 날짜의 Long Count, Tzolk'in, Haab 값을 한눈에 확인하고, 마야 sacred calendar의 상징을 바탕으로 상담 프롬프트를 준비하세요.",
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
    referenceDisclaimer: "선택한 날짜는 마야 달력 표기로 정리되며, 생성된 프롬프트와 외부 AI 답변은 엔터테인먼트 목적의 참고용입니다. 중요한 의사결정은 현실적인 검토와 전문가 상담을 함께 진행하세요.",

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

    promptFeatureReason: "마야점 상담 프롬프트 생성",
    promptPriceLabel: "1회 3,000원",
    gateTitle: "마야점 프롬프트 생성",
    gateCheckingMessage: "이용권 확인 중",
    errorLoginRequired: "로그인 후 이용권 또는 결제를 확인할 수 있습니다.",
    errorInsufficientCoins: "결제 가능 금액이 부족합니다. 결제 페이지에서 충전 후 다시 시도해 주세요.",
    errorPaymentFailedFallback: "결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    errorInterrupted: "마야 시간 코드를 여는 중 흐름이 끊겼어요. 잠시 후 다시 시도해 주세요.",
    successGenerated: "마야점 프롬프트가 준비됐어요. 원하는 AI에게 붙여넣어 상담을 이어가세요.",
    successCopied: "마야점 프롬프트가 석판에서 복사되었어요.",
    buttonOpening: "고대 시간 문양을 여는 중...",
    buttonRegenerate: "다시 생성하기",
    buttonGenerate: "마야점 프롬프트 생성하기",
    promptHeading: "마야점 프롬프트 생성",
    promptDesc: "선택한 날짜의 Long Count, Tzolk'in, Haab 값을 바탕으로 AI에게 물어볼 상담 프롬프트를 준비합니다.",
    nameLabel: "이름 또는 닉네임",
    namePlaceholder: "미입력 가능",
    birthDateLabel: "생년월일, 선택",
    topicLabel: "상담 주제",
    questionLabel: "상담 질문",
    questionPlaceholder: "선택 입력입니다. 서버로 전송되지 않고 브라우저에서 프롬프트에만 반영됩니다.",
    copyButton: "시간 코드 복사하기",
    resultHeading: "완성된 마야점 프롬프트",
    resultDesc: "선택한 날짜의 시간 좌표를 바탕으로 생성되었습니다.",
    emptyStateTitle: "날짜를 선택하면 마야 시간 코드가 열립니다.",
    emptyStateDesc: "선택된 날짜의 Long Count, Tzolk'in, Haab 흐름이 운명 좌표처럼 프롬프트에 담깁니다.",
  },
  ja: {
    templeVisualAlt: "黄金の太陽暦の輪と高地遺跡のシルエット",
    heroTitle: "マヤ占い",
    heroTagline: "古代暦の時間コードで今日の流れを読みます",
    heroDescription: "選択した日付のLong Count、Tzolk'in、Haabの値を一目で確認し、マヤの神聖暦のシンボルをもとに相談プロンプトを準備しましょう。",
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
    referenceDisclaimer: "選択した日付はマヤ暦の表記で整理され、生成されたプロンプトや外部AIの回答はエンターテインメント目的の参考情報です。重要な意思決定は現実的な検討と専門家への相談を併せて行ってください。",

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

    promptFeatureReason: "マヤ占い相談プロンプト生成",
    promptPriceLabel: "1回 3,000ウォン",
    gateTitle: "マヤ占いプロンプト生成",
    gateCheckingMessage: "利用券を確認中",
    errorLoginRequired: "ログイン後、利用券または決済を確認できます。",
    errorInsufficientCoins: "決済可能な金額が不足しています。決済ページでチャージ後、もう一度お試しください。",
    errorPaymentFailedFallback: "決済確認に失敗しました。しばらくしてからもう一度お試しください。",
    errorInterrupted: "マヤの時間コードを開く途中で流れが途切れました。しばらくしてからもう一度お試しください。",
    successGenerated: "マヤ占いプロンプトの準備ができました。お好みのAIに貼り付けて相談を続けてください。",
    successCopied: "マヤ占いプロンプトが石板からコピーされました。",
    buttonOpening: "古代の時間文様を開いています...",
    buttonRegenerate: "もう一度生成する",
    buttonGenerate: "マヤ占いプロンプトを生成する",
    promptHeading: "マヤ占いプロンプト生成",
    promptDesc: "選択した日付のLong Count、Tzolk'in、Haabの値をもとに、AIに尋ねる相談プロンプトを準備します。",
    nameLabel: "名前またはニックネーム",
    namePlaceholder: "未入力可",
    birthDateLabel: "生年月日（任意）",
    topicLabel: "相談テーマ",
    questionLabel: "相談内容",
    questionPlaceholder: "任意入力です。サーバーには送信されず、ブラウザ内でプロンプトにのみ反映されます。",
    copyButton: "時間コードをコピー",
    resultHeading: "完成したマヤ占いプロンプト",
    resultDesc: "選択した日付の時間座標をもとに生成されました。",
    emptyStateTitle: "日付を選択するとマヤの時間コードが開きます。",
    emptyStateDesc: "選択した日付のLong Count、Tzolk'in、Haabの流れが運命の座標のようにプロンプトに込められます。",
  },
  "zh-CN": {
    templeVisualAlt: "金色太阳历法环与高原遗迹剪影",
    heroTitle: "玛雅占卜",
    heroTagline: "以古代历法的时间密码解读今日的流转",
    heroDescription: "一目了然地查看所选日期的Long Count、Tzolk'in、Haab数值，并以玛雅神圣历法的象征为基础准备咨询提示词。",
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
    referenceDisclaimer: "所选日期以玛雅历表示法呈现，生成的提示词及外部AI的回答仅供娱乐参考。重要决策请结合现实判断与专业咨询共同进行。",

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

    promptFeatureReason: "玛雅占卜咨询提示词生成",
    promptPriceLabel: "单次3,000韩元",
    gateTitle: "玛雅占卜提示词生成",
    gateCheckingMessage: "正在确认通行证",
    errorLoginRequired: "登录后即可确认通行证或付款。",
    errorInsufficientCoins: "可用付款余额不足，请在付款页面充值后重试。",
    errorPaymentFailedFallback: "付款确认失败，请稍后再试。",
    errorInterrupted: "打开玛雅时间密码时流程中断了，请稍后再试。",
    successGenerated: "您的玛雅占卜提示词已准备就绪，可粘贴给您喜欢的AI继续咨询。",
    successCopied: "玛雅占卜提示词已从石板复制。",
    buttonOpening: "正在打开古代时间图纹...",
    buttonRegenerate: "重新生成",
    buttonGenerate: "生成玛雅占卜提示词",
    promptHeading: "玛雅占卜提示词生成",
    promptDesc: "根据所选日期的Long Count、Tzolk'in、Haab数值，准备向AI提问的咨询提示词。",
    nameLabel: "姓名或昵称",
    namePlaceholder: "可不填",
    birthDateLabel: "出生日期（可选）",
    topicLabel: "咨询主题",
    questionLabel: "咨询问题",
    questionPlaceholder: "可选填写。不会发送至服务器，仅在浏览器中反映到提示词内。",
    copyButton: "复制时间密码",
    resultHeading: "已生成的玛雅占卜提示词",
    resultDesc: "根据所选日期的时间坐标生成。",
    emptyStateTitle: "选择日期即可开启玛雅时间密码。",
    emptyStateDesc: "所选日期的Long Count、Tzolk'in、Haab流转将如命运坐标般融入提示词。",
  },
  "zh-TW": {
    templeVisualAlt: "金色太陽曆法環與高原遺跡剪影",
    heroTitle: "馬雅占卜",
    heroTagline: "以古代曆法的時間密碼解讀今日的流轉",
    heroDescription: "一目了然地查看所選日期的Long Count、Tzolk'in、Haab數值，並以馬雅神聖曆法的象徵為基礎準備諮詢提示詞。",
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
    referenceDisclaimer: "所選日期以馬雅曆表示法呈現，生成的提示詞及外部AI的回答僅供娛樂參考。重要決策請結合現實判斷與專業諮詢共同進行。",

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

    promptFeatureReason: "馬雅占卜諮詢提示詞生成",
    promptPriceLabel: "單次3,000韓元",
    gateTitle: "馬雅占卜提示詞生成",
    gateCheckingMessage: "正在確認通行證",
    errorLoginRequired: "登入後即可確認通行證或付款。",
    errorInsufficientCoins: "可用付款餘額不足，請在付款頁面儲值後重試。",
    errorPaymentFailedFallback: "付款確認失敗，請稍後再試。",
    errorInterrupted: "打開馬雅時間密碼時流程中斷了，請稍後再試。",
    successGenerated: "您的馬雅占卜提示詞已準備就緒，可貼上給您喜歡的AI繼續諮詢。",
    successCopied: "馬雅占卜提示詞已從石板複製。",
    buttonOpening: "正在打開古代時間圖紋...",
    buttonRegenerate: "重新生成",
    buttonGenerate: "生成馬雅占卜提示詞",
    promptHeading: "馬雅占卜提示詞生成",
    promptDesc: "根據所選日期的Long Count、Tzolk'in、Haab數值，準備向AI提問的諮詢提示詞。",
    nameLabel: "姓名或暱稱",
    namePlaceholder: "可不填",
    birthDateLabel: "出生日期（可選）",
    topicLabel: "諮詢主題",
    questionLabel: "諮詢問題",
    questionPlaceholder: "可選填寫。不會傳送至伺服器，僅在瀏覽器中反映到提示詞內。",
    copyButton: "複製時間密碼",
    resultHeading: "已生成的馬雅占卜提示詞",
    resultDesc: "根據所選日期的時間座標生成。",
    emptyStateTitle: "選擇日期即可開啟馬雅時間密碼。",
    emptyStateDesc: "所選日期的Long Count、Tzolk'in、Haab流轉將如命運座標般融入提示詞。",
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
    window.addEventListener("cd:locale-change", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
      window.removeEventListener("cd:locale-change", sync);
    };
  }, []);
  return getMayaCopy(locale);
}
