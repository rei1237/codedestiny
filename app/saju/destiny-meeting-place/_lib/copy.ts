"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface DestinyMeetingPlaceHeroPart {
  text: string;
  highlight?: "place" | "time" | "mood";
}

export interface DestinyMeetingPlaceCopy {
  currency: (amount: number) => string;
  backAria: string;
  resetAria: string;
  gateReason: string;
  heroImageAlt: string;
  pageTitle: string;
  heroHeading: string;
  heroDescriptionParts: DestinyMeetingPlaceHeroPart[];
  onceBadge: (amountText: string) => string;
  badgePassCheck: string;
  badgeMood: string;
  badgeCombo: string;
  badgeLoginRequired: string;
  signalPlaceDesc: string;
  signalTimingDesc: string;
  signalMoodDesc: string;
  formNameLabel: string;
  formNameHelper: string;
  namePlaceholder: string;
  formBirthDateLabel: string;
  formBirthDateHelper: string;
  formCalendarTypeLabel: string;
  calendarSolar: string;
  calendarLunar: string;
  formCalendarHelper: string;
  formBirthTimeLabel: string;
  formBirthTimeHelper: string;
  formGenderLabel: string;
  genderUnknown: string;
  genderFemale: string;
  genderMale: string;
  formGenderHelper: string;
  lunarLeapLabel: string;
  submitCharging: string;
  submitLoading: string;
  submitIdle: string;
  disclaimer: string;
  metaSectionTitle: string;
  metaDayMasterLabel: string;
  metaStageLabel: string;
  metaSourceLabel: string;
  metaTimeInputLabel: string;
  dayMasterSuffix: string;
  infoPendingLabel: string;
  sourceEngine: string;
  sourceLocal: string;
  timeUnknownLabel: string;
  timeKnownLabel: string;
  warningPrefix: string;
  demoBanner: string;
  toastNeedBirthDate: string;
  gateCheckingPass: string;
  toastPaymentRequired: string;
  toastLoginRequired: string;
  toastReportReady: string;
  sajuCalcFailed: string;
  paymentConfirmFailed: string;
}

const DESTINY_MEETING_PLACE_COPY_EN: DestinyMeetingPlaceCopy = {
  currency: (amount) => `KRW ${amount.toLocaleString("en-US")}`,
  backAria: "Go back",
  resetAria: "Reset form",
  gateReason: "Destiny meeting place by saju — one-time analysis",
  heroImageAlt: "Destiny meeting place by saju — hero image",
  pageTitle: "Destiny Meeting Place by Saju",
  heroHeading: "We map the coordinates where your destined meeting begins, like a map of starlight",
  heroDescriptionParts: [
    { text: "Based on the flow of your saju energy, this screen guides you in depth on " },
    { text: "where", highlight: "place" },
    { text: " a meaningful connection may open, " },
    { text: "when", highlight: "time" },
    { text: ", and in " },
    { text: "what mood", highlight: "mood" },
    { text: "." },
  ],
  onceBadge: (amountText) => `One-time ${amountText}`,
  badgePassCheck: "Pass check first, then single payment / monthly stone",
  badgeMood: "Starlight & night-view meeting mood picks",
  badgeCombo: "Place + timing + country + style",
  badgeLoginRequired: "Log in to run the analysis",
  signalPlaceDesc: "Extracts the kind of meeting places that fit your five-element balance.",
  signalTimingDesc: "Guides you to real, actionable timing down to the season, month, and time of day.",
  signalMoodDesc: "Suggests colors, mood, and action points that lift your romance luck.",
  formNameLabel: "Name or nickname",
  formNameHelper: "This is the name shown at the top of the report. It doesn't have to be your legal name.",
  namePlaceholder: "e.g. Galaxy Fox",
  formBirthDateLabel: "Birth date",
  formBirthDateHelper: "Please enter this for the most accurate place recommendations.",
  formCalendarTypeLabel: "Calendar type",
  calendarSolar: "Solar",
  calendarLunar: "Lunar",
  formCalendarHelper: "If your birthday is lunar, also select whether it's a leap month.",
  formBirthTimeLabel: "Birth time",
  formBirthTimeHelper: "You can still analyze without it, but entering it improves place/timing accuracy.",
  formGenderLabel: "Gender",
  genderUnknown: "Not selected",
  genderFemale: "Female",
  genderMale: "Male",
  formGenderHelper: "Only used to tune the tone of relationship-pattern sentences — leaving it unselected is fine.",
  lunarLeapLabel: "Born in a leap month",
  submitCharging: "Confirming payment…",
  submitLoading: "Mapping your starlight map...",
  submitIdle: "Start the destiny meeting place analysis",
  disclaimer: "This result is for entertainment and self-understanding purposes only. Please consult a professional for important financial, legal, or medical decisions.",
  metaSectionTitle: "Analysis basis data",
  metaDayMasterLabel: "Day master:",
  metaStageLabel: "Representative stage:",
  metaSourceLabel: "Engine source:",
  metaTimeInputLabel: "Time input:",
  dayMasterSuffix: "day master",
  infoPendingLabel: "Pending info",
  sourceEngine: "Saju engine",
  sourceLocal: "Local precision calculation",
  timeUnknownLabel: "Time not entered",
  timeKnownLabel: "Time entered",
  warningPrefix: "Note: ",
  demoBanner: "Demo mode: showing an enriched sample report. Enter your birth info and run the analysis to see your actual result.",
  toastNeedBirthDate: "Please enter your birth date.",
  gateCheckingPass: "Checking your pass",
  toastPaymentRequired: "A paid purchase is required. Please choose a product on the payment page.",
  toastLoginRequired: "Please log in.",
  toastReportReady: "Your destiny meeting place report is ready.",
  sajuCalcFailed: "Saju calculation failed. Please check your input and try again.",
  paymentConfirmFailed: "Payment confirmation failed.",
};

const DESTINY_MEETING_PLACE_COPY: Partial<Record<LoadingLocale, DestinyMeetingPlaceCopy>> = {
  ko: {
    currency: (amount) => `${amount.toLocaleString("ko-KR")}원`,
    backAria: "뒤로 가기",
    resetAria: "초기화",
    gateReason: "사주로 보는 인연의 장소 1회 분석",
    heroImageAlt: "사주로 보는 인연의 장소 대표 이미지",
    pageTitle: "사주로 보는 인연의 장소",
    heroHeading: "운명의 만남이 시작될 좌표를 별빛 지도처럼 찾아드립니다",
    heroDescriptionParts: [
      { text: "사주 에너지 흐름을 바탕으로 " },
      { text: "어떤 장소에서", highlight: "place" },
      { text: ", " },
      { text: "언제", highlight: "time" },
      { text: ", " },
      { text: "어떤 분위기", highlight: "mood" },
      { text: "로 인연 운이 상승하는지 한 화면에서 깊이 있게 안내합니다." },
    ],
    onceBadge: (amountText) => `1회 ${amountText}`,
    badgePassCheck: "이용권 확인 후 단건 결제/월정석 사용",
    badgeMood: "별빛/야경 인연 무드 추천",
    badgeCombo: "장소 + 시기 + 국가 + 스타일",
    badgeLoginRequired: "로그인 후 분석 가능",
    signalPlaceDesc: "당신의 오행 균형에 맞는 만남 장소 성향을 추출합니다.",
    signalTimingDesc: "계절, 월, 시간대까지 실제 행동 가능한 타이밍으로 안내합니다.",
    signalMoodDesc: "인연운을 살리는 컬러와 분위기, 행동 포인트를 제안합니다.",
    formNameLabel: "이름 또는 닉네임",
    formNameHelper: "리포트 상단에 표시될 호칭입니다. 본명이 아니어도 괜찮아요.",
    namePlaceholder: "예: 은하수여우",
    formBirthDateLabel: "출생일",
    formBirthDateHelper: "가장 정확한 장소 추천을 위해 반드시 입력해 주세요.",
    formCalendarTypeLabel: "달력 타입",
    calendarSolar: "양력",
    calendarLunar: "음력",
    formCalendarHelper: "음력 생일이라면 음력 + 윤달 여부를 함께 선택해 주세요.",
    formBirthTimeLabel: "태어난 시간",
    formBirthTimeHelper: "모르면 비워도 분석할 수 있지만, 입력 시 장소/시간 추천 정확도가 올라갑니다.",
    formGenderLabel: "성별",
    genderUnknown: "성별 미선택",
    genderFemale: "여성",
    genderMale: "남성",
    formGenderHelper: "관계 패턴 문장 톤 보정에만 사용되며, 미선택도 가능합니다.",
    lunarLeapLabel: "윤달 출생입니다",
    submitCharging: "결제 확인 중…",
    submitLoading: "별빛 지도를 분석하는 중...",
    submitIdle: "인연의 장소 분석 시작",
    disclaimer: "결과는 오락 및 자기이해 참고용입니다. 중요한 재무/법률/의료 판단은 반드시 전문 상담을 함께 진행해 주세요.",
    metaSectionTitle: "분석 근거 데이터",
    metaDayMasterLabel: "일간:",
    metaStageLabel: "대표 운성:",
    metaSourceLabel: "엔진 소스:",
    metaTimeInputLabel: "시간 입력:",
    dayMasterSuffix: "일간",
    infoPendingLabel: "정보 보완",
    sourceEngine: "사주 엔진",
    sourceLocal: "로컬 정밀 계산",
    timeUnknownLabel: "시간 미입력",
    timeKnownLabel: "시간 입력됨",
    warningPrefix: "주의: ",
    demoBanner: "데모 모드: 풍부화된 샘플 리포트를 표시 중입니다. 실제 계산 결과를 보려면 출생 정보를 입력해 분석을 실행하세요.",
    toastNeedBirthDate: "생년월일을 입력해 주세요.",
    gateCheckingPass: "이용권 확인 중",
    toastPaymentRequired: "유료 결제가 필요합니다. 결제 페이지에서 상품을 선택해 주세요.",
    toastLoginRequired: "로그인이 필요합니다.",
    toastReportReady: "인연의 장소 리포트가 완성되었습니다.",
    sajuCalcFailed: "사주 계산에 실패했습니다. 입력값을 다시 확인해 주세요.",
    paymentConfirmFailed: "결제 확인에 실패했습니다.",
  },
  en: DESTINY_MEETING_PLACE_COPY_EN,
  ja: {
    currency: (amount) => `${amount.toLocaleString("ja-JP")} KRW`,
    backAria: "戻る",
    resetAria: "初期化",
    gateReason: "四柱推命で見る縁の場所 1回分析",
    heroImageAlt: "四柱推命で見る縁の場所 代表イメージ",
    pageTitle: "四柱推命で見る縁の場所",
    heroHeading: "運命の出会いが始まる座標を、星明かりの地図のようにお探しします",
    heroDescriptionParts: [
      { text: "四柱のエネルギーの流れをもとに、" },
      { text: "どんな場所で", highlight: "place" },
      { text: "、" },
      { text: "いつ", highlight: "time" },
      { text: "、" },
      { text: "どんな雰囲気", highlight: "mood" },
      { text: "で縁の運が高まるのかを、一画面で深く案内します。" },
    ],
    onceBadge: (amountText) => `1回 ${amountText}`,
    badgePassCheck: "利用券確認後、単発決済/月定石を使用",
    badgeMood: "星明かり/夜景の縁ムードをおすすめ",
    badgeCombo: "場所 + 時期 + 国 + スタイル",
    badgeLoginRequired: "ログイン後に分析可能",
    signalPlaceDesc: "あなたの五行バランスに合う出会いの場所の傾向を抽出します。",
    signalTimingDesc: "季節、月、時間帯まで実際に行動できるタイミングをご案内します。",
    signalMoodDesc: "縁の運を高める色や雰囲気、行動のポイントを提案します。",
    formNameLabel: "名前またはニックネーム",
    formNameHelper: "レポート上部に表示される呼び名です。本名でなくても構いません。",
    namePlaceholder: "例：銀河の狐",
    formBirthDateLabel: "生年月日",
    formBirthDateHelper: "最も正確な場所の推薦のため、必ず入力してください。",
    formCalendarTypeLabel: "暦の種類",
    calendarSolar: "新暦",
    calendarLunar: "旧暦",
    formCalendarHelper: "旧暦の誕生日の場合は、旧暦 + うるう月かどうかも選択してください。",
    formBirthTimeLabel: "生まれた時間",
    formBirthTimeHelper: "分からなければ空欄でも分析できますが、入力すると場所・時間の推薦精度が上がります。",
    formGenderLabel: "性別",
    genderUnknown: "性別未選択",
    genderFemale: "女性",
    genderMale: "男性",
    formGenderHelper: "関係パターンの文章トーン調整にのみ使用され、未選択でも構いません。",
    lunarLeapLabel: "うるう月生まれです",
    submitCharging: "決済確認中…",
    submitLoading: "星明かりの地図を分析中...",
    submitIdle: "縁の場所分析を開始",
    disclaimer: "結果は娯楽および自己理解の参考用です。重要な財務・法律・医療の判断は必ず専門家にご相談ください。",
    metaSectionTitle: "分析根拠データ",
    metaDayMasterLabel: "日干：",
    metaStageLabel: "代表運星：",
    metaSourceLabel: "エンジンソース：",
    metaTimeInputLabel: "時間入力：",
    dayMasterSuffix: "日干",
    infoPendingLabel: "情報を補完中",
    sourceEngine: "四柱エンジン",
    sourceLocal: "ローカル精密計算",
    timeUnknownLabel: "時間未入力",
    timeKnownLabel: "時間入力済み",
    warningPrefix: "注意：",
    demoBanner: "デモモード：充実したサンプルレポートを表示中です。実際の計算結果を見るには、生年情報を入力して分析を実行してください。",
    toastNeedBirthDate: "生年月日を入力してください。",
    gateCheckingPass: "利用券確認中",
    toastPaymentRequired: "有料決済が必要です。決済ページで商品を選択してください。",
    toastLoginRequired: "ログインが必要です。",
    toastReportReady: "縁の場所レポートが完成しました。",
    sajuCalcFailed: "四柱の計算に失敗しました。入力内容をご確認ください。",
    paymentConfirmFailed: "決済確認に失敗しました。",
  },
  "zh-CN": {
    currency: (amount) => `KRW ${amount.toLocaleString("zh-CN")}`,
    backAria: "返回",
    resetAria: "重置",
    gateReason: "四柱看缘分之地 单次分析",
    heroImageAlt: "四柱看缘分之地 代表图片",
    pageTitle: "用四柱看见缘分之地",
    heroHeading: "我们将如星光地图般，为您找到缘分开始的坐标",
    heroDescriptionParts: [
      { text: "根据您的四柱能量流向，本页面将深入指引缘分运势在" },
      { text: "何地", highlight: "place" },
      { text: "、" },
      { text: "何时", highlight: "time" },
      { text: "、以" },
      { text: "何种氛围", highlight: "mood" },
      { text: "中提升。" },
    ],
    onceBadge: (amountText) => `单次 ${amountText}`,
    badgePassCheck: "先确认利用券，再使用单次支付/月定石",
    badgeMood: "星光/夜景缘分氛围推荐",
    badgeCombo: "地点 + 时机 + 国家 + 风格",
    badgeLoginRequired: "登录后可分析",
    signalPlaceDesc: "提取符合您五行平衡的相遇地点倾向。",
    signalTimingDesc: "从季节、月份到时间段，指引真正可行动的时机。",
    signalMoodDesc: "提出能提升缘分运的色彩、氛围与行动要点。",
    formNameLabel: "姓名或昵称",
    formNameHelper: "将显示在报告顶部的称呼，不必是本名。",
    namePlaceholder: "例：银河狐狸",
    formBirthDateLabel: "出生日期",
    formBirthDateHelper: "为获得最准确的地点推荐，请务必填写。",
    formCalendarTypeLabel: "历法类型",
    calendarSolar: "阳历",
    calendarLunar: "阴历",
    formCalendarHelper: "若生日为阴历，请一并选择是否为闰月。",
    formBirthTimeLabel: "出生时间",
    formBirthTimeHelper: "不清楚也可留空进行分析，填写后地点/时机推荐精度会提高。",
    formGenderLabel: "性别",
    genderUnknown: "未选择性别",
    genderFemale: "女性",
    genderMale: "男性",
    formGenderHelper: "仅用于调整关系模式文字的语气，也可以不选择。",
    lunarLeapLabel: "出生于闰月",
    submitCharging: "正在确认支付…",
    submitLoading: "正在分析星光地图...",
    submitIdle: "开始缘分之地分析",
    disclaimer: "结果仅供娱乐与自我了解参考。重要的财务、法律、医疗判断请务必咨询专业人士。",
    metaSectionTitle: "分析依据数据",
    metaDayMasterLabel: "日干：",
    metaStageLabel: "代表运星：",
    metaSourceLabel: "引擎来源：",
    metaTimeInputLabel: "时间输入：",
    dayMasterSuffix: "日干",
    infoPendingLabel: "信息补充中",
    sourceEngine: "四柱引擎",
    sourceLocal: "本地精密计算",
    timeUnknownLabel: "未输入时间",
    timeKnownLabel: "已输入时间",
    warningPrefix: "注意：",
    demoBanner: "演示模式：正在显示丰富化的示例报告。请输入出生信息并运行分析以查看实际结果。",
    toastNeedBirthDate: "请输入出生日期。",
    gateCheckingPass: "正在确认利用券",
    toastPaymentRequired: "需要付费购买。请在支付页面选择商品。",
    toastLoginRequired: "需要登录。",
    toastReportReady: "缘分之地报告已完成。",
    sajuCalcFailed: "四柱计算失败，请重新确认输入内容。",
    paymentConfirmFailed: "支付确认失败。",
  },
  "zh-TW": {
    currency: (amount) => `KRW ${amount.toLocaleString("zh-TW")}`,
    backAria: "返回",
    resetAria: "重置",
    gateReason: "四柱看緣分之地 單次分析",
    heroImageAlt: "四柱看緣分之地 代表圖片",
    pageTitle: "用四柱看見緣分之地",
    heroHeading: "我們將如星光地圖般，為您找到緣分開始的座標",
    heroDescriptionParts: [
      { text: "根據您的四柱能量流向，本頁面將深入指引緣分運勢在" },
      { text: "何地", highlight: "place" },
      { text: "、" },
      { text: "何時", highlight: "time" },
      { text: "、以" },
      { text: "何種氛圍", highlight: "mood" },
      { text: "中提升。" },
    ],
    onceBadge: (amountText) => `單次 ${amountText}`,
    badgePassCheck: "先確認利用券，再使用單次付款/月定石",
    badgeMood: "星光/夜景緣分氛圍推薦",
    badgeCombo: "地點 + 時機 + 國家 + 風格",
    badgeLoginRequired: "登入後可分析",
    signalPlaceDesc: "擷取符合您五行平衡的相遇地點傾向。",
    signalTimingDesc: "從季節、月份到時間段，指引真正可行動的時機。",
    signalMoodDesc: "提出能提升緣分運的色彩、氛圍與行動要點。",
    formNameLabel: "姓名或暱稱",
    formNameHelper: "將顯示於報告頂部的稱呼，不必是本名。",
    namePlaceholder: "例：銀河狐狸",
    formBirthDateLabel: "出生日期",
    formBirthDateHelper: "為獲得最準確的地點推薦，請務必填寫。",
    formCalendarTypeLabel: "曆法類型",
    calendarSolar: "陽曆",
    calendarLunar: "陰曆",
    formCalendarHelper: "若生日為陰曆，請一併選擇是否為閏月。",
    formBirthTimeLabel: "出生時間",
    formBirthTimeHelper: "不清楚也可留空進行分析，填寫後地點/時機推薦精度會提高。",
    formGenderLabel: "性別",
    genderUnknown: "未選擇性別",
    genderFemale: "女性",
    genderMale: "男性",
    formGenderHelper: "僅用於調整關係模式文字的語氣，也可以不選擇。",
    lunarLeapLabel: "出生於閏月",
    submitCharging: "正在確認付款…",
    submitLoading: "正在分析星光地圖...",
    submitIdle: "開始緣分之地分析",
    disclaimer: "結果僅供娛樂與自我了解參考。重要的財務、法律、醫療判斷請務必諮詢專業人士。",
    metaSectionTitle: "分析依據資料",
    metaDayMasterLabel: "日干：",
    metaStageLabel: "代表運星：",
    metaSourceLabel: "引擎來源：",
    metaTimeInputLabel: "時間輸入：",
    dayMasterSuffix: "日干",
    infoPendingLabel: "資訊補充中",
    sourceEngine: "四柱引擎",
    sourceLocal: "本地精密計算",
    timeUnknownLabel: "未輸入時間",
    timeKnownLabel: "已輸入時間",
    warningPrefix: "注意：",
    demoBanner: "示範模式：正在顯示豐富化的範例報告。請輸入出生資訊並執行分析以查看實際結果。",
    toastNeedBirthDate: "請輸入出生日期。",
    gateCheckingPass: "正在確認利用券",
    toastPaymentRequired: "需要付費購買。請在付款頁面選擇商品。",
    toastLoginRequired: "需要登入。",
    toastReportReady: "緣分之地報告已完成。",
    sajuCalcFailed: "四柱計算失敗，請重新確認輸入內容。",
    paymentConfirmFailed: "付款確認失敗。",
  },
};

export function getDestinyMeetingPlaceCopy(locale: LoadingLocale): DestinyMeetingPlaceCopy {
  return { ...DESTINY_MEETING_PLACE_COPY_EN, ...(DESTINY_MEETING_PLACE_COPY[locale] || {}) };
}

export function useDestinyMeetingPlaceCopy(): DestinyMeetingPlaceCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getDestinyMeetingPlaceCopy(locale);
}
