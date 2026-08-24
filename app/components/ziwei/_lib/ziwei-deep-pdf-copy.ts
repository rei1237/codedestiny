// ZiweiDeepPdfPanel(심화 자미두수 심층 리포트) UI 크롬 전용 카피.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getZiweiDeepPdfCopy()가 EN과 병합해 자동 폴백한다.
// PDF 파일명/커버 메타데이터(safePdfName, exportResultPdf cover.title)는 다운로드 산출물 텍스트라 범위 밖으로 남겨둔다.

import type { LoadingLocale } from "@/constants/loadingMessages";

export interface ZiweiDeepPdfCopy {
  reasonText: string;
  focusOptions: {
    overall: string;
    personality: string;
    career: string;
    money: string;
    love: string;
    relationship: string;
    health: string;
    custom: string;
  };
  errorText: {
    LOGIN_REQUIRED: string;
    PAYMENT_REQUIRED: string;
    PAYMENT_VERIFY_FAILED: string;
    PAYMENT_CANCELLED: string;
    INVALID_INPUT: string;
    CUSTOM_QUESTION_REQUIRED: string;
    GENERATION_FAILED: string;
    DB_DEGRADED: string;
    SERVER_ERROR: string;
    NETWORK_ERROR: string;
  };
  loadingSteps: string[];
  eyebrow: string;
  title: string;
  introPrefix: string;
  introBold: string;
  introSuffix: string;
  questionPlaceholder: string;
  generateButtonChecking: string;
  generateButtonPayment: string;
  generateButtonGenerating: string;
  generateButtonIdle: string;
  priceBadgePrefix: string;
  footnote: string;
  historyButtonLoading: string;
  historyButtonIdle: string;
  historyEmpty: string;
  historyDefaultName: string;
  historyReportLabel: string;
  historyPartialSuffix: string;
  generatingChapterSuffix: (done: number, total: number) => string;
  readyStatusRestored: string;
  readyStatusComplete: string;
  readyChapterCountTemplate: (count: number, chars: string) => string;
  readyMessageRestored: string;
  readyMessageComplete: string;
  pdfDownloadButtonSaving: string;
  pdfDownloadButtonIdle: string;
  retryButton: string;
  reportCoverEyebrow: string;
  reportCoverNameTemplate: (name: string) => string;
  reportCoverDefaultName: string;
  calendarSolarLabel: string;
  calendarLunarLabel: string;
  timeUnknownLabel: string;
  genderMaleLabel: string;
  genderFemaleLabel: string;
  /** 내려받는 PDF 파일명의 앞머리. 화면 문구가 아니라 파일 이름이라 별도 키다. */
  pdfFileNameStem: string;
  /** 이름을 안 적었을 때 파일명에 들어가는 말. reportCoverDefaultName("당신")은 소유격이라 파일명에 안 맞는다. */
  pdfNameFallback: string;
  /** PDF 표지 제목. 화면 표지(reportCoverNameTemplate)와 문구가 달라 키를 따로 둔다. */
  pdfCoverTitle: (name: string) => string;
  pdfDownloadError: string;
  gateTitleChecking: string;
  gateTitleComplete: string;
  gateMessageGenerating: string;
  gateTitleFailed: string;
}

const ZIWEI_DEEP_PDF_COPY_EN: ZiweiDeepPdfCopy = {
  reasonText: "Advanced Zi Wei Deep Report",
  focusOptions: {
    overall: "Full chart reading",
    personality: "Innate personality",
    career: "Career / business luck",
    money: "Money luck",
    love: "Love / marriage luck",
    relationship: "Relationships",
    health: "Health / mental state",
    custom: "Ask about my current concern",
  },
  errorText: {
    LOGIN_REQUIRED: "You need to log in to generate the report.",
    PAYMENT_REQUIRED: "This report requires a per-use payment.",
    PAYMENT_VERIFY_FAILED: "Payment verification isn't complete yet. If you already paid, please try again shortly.",
    PAYMENT_CANCELLED: "Payment was cancelled.",
    INVALID_INPUT: "Please check your birth date and birth time details.",
    CUSTOM_QUESTION_REQUIRED: "Please write your question a bit more specifically.",
    GENERATION_FAILED: "We couldn't finish the report. Your payment has been reversed — please try again shortly.",
    DB_DEGRADED: "The connection is briefly unstable right now. Please try again shortly.",
    SERVER_ERROR: "Something went wrong while preparing the report.",
    NETWORK_ERROR: "The connection is unstable. Please try again shortly.",
  },
  loadingSteps: [
    "Casting your chart...",
    "Reading the axis of the Life and Body palaces...",
    "Interpreting all 12 palaces chapter by chapter...",
    "Weaving the Four Transformations and triangle alignments...",
    "Compiling the decade/yearly master plan...",
  ],
  eyebrow: "ZIWEI Expert Consultation · Per-use payment",
  title: "✨ Advanced Zi Wei Expert Consultation Report",
  introPrefix: "Leave the question on your mind right now, and we'll unfold all 12 palaces from the Life Palace to the Blessing Palace, along with the Four Transformations and decade flow, into ",
  introBold: "15 chapters, 30,000-40,000 characters",
  introSuffix: " to answer it. Read it right on screen, or save it as a PDF.",
  questionPlaceholder: "Write the question you'd like answered. (Optional — required for \"Ask about my current concern\")",
  generateButtonChecking: "Checking payment...",
  generateButtonPayment: "Processing payment...",
  generateButtonGenerating: "Generating report...",
  generateButtonIdle: "Get the Advanced Expert Consultation (₩30,000)",
  priceBadgePrefix: "Consultation price ",
  footnote: "Per-use payment · 15 chapters · 30,000-40,000 characters · No deduction if you hold a pass/moonstone",
  historyButtonLoading: "Loading...",
  historyButtonIdle: "View past reports",
  historyEmpty: "No saved reports yet.",
  historyDefaultName: "My",
  historyReportLabel: "Report",
  historyPartialSuffix: " (generation interrupted)",
  generatingChapterSuffix: (done, total) => (done > 0 ? ` (${done}/${total} chapters)` : ""),
  readyStatusRestored: "Saved report",
  readyStatusComplete: "Complete",
  readyChapterCountTemplate: (count, chars) => `${count} chapters · about ${chars} characters`,
  readyMessageRestored: "Reopened your saved report",
  readyMessageComplete: "Your advanced Zi Wei report is complete",
  pdfDownloadButtonSaving: "Saving...",
  pdfDownloadButtonIdle: "Download PDF",
  retryButton: "Ask a different question",
  reportCoverEyebrow: "紫微斗數 · Deep Report",
  reportCoverNameTemplate: (name) => `${name}'s Advanced Zi Wei 15 Chapters`,
  reportCoverDefaultName: "Your",
  calendarSolarLabel: "Solar calendar",
  calendarLunarLabel: "Lunar calendar",
  timeUnknownLabel: "Birth time unknown",
  genderMaleLabel: "Male",
  genderFemaleLabel: "Female",
  pdfFileNameStem: "ZiweiDeepReport",
  pdfNameFallback: "Ziwei",
  pdfCoverTitle: (name) => `${name}'s Advanced Zi Wei report`,
  pdfDownloadError: "Something went wrong while saving the PDF. Please try again shortly.",
  gateTitleChecking: "Confirming payment",
  gateTitleComplete: "Confirmed",
  gateMessageGenerating: "Generating your report.",
  gateTitleFailed: "Confirmation failed",
};

const ZIWEI_DEEP_PDF_COPY: Partial<Record<LoadingLocale, ZiweiDeepPdfCopy>> = {
  ko: {
    reasonText: "심화 자미두수 심층 리포트",
    focusOptions: {
      overall: "전체 명반 해석",
      personality: "타고난 성향",
      career: "직업/사업운",
      money: "재물운",
      love: "연애/결혼운",
      relationship: "인간관계",
      health: "건강/멘탈",
      custom: "현재 고민 상담",
    },
    errorText: {
      LOGIN_REQUIRED: "리포트를 생성하려면 로그인이 필요합니다.",
      PAYMENT_REQUIRED: "회당 결제가 필요한 리포트입니다.",
      PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
      PAYMENT_CANCELLED: "결제가 취소되었습니다.",
      INVALID_INPUT: "생년월일과 출생시간 정보를 확인해 주세요.",
      CUSTOM_QUESTION_REQUIRED: "묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
      GENERATION_FAILED: "리포트를 완성하지 못했습니다. 결제는 되돌렸으니 잠시 후 다시 시도해 주세요.",
      DB_DEGRADED: "지금 접속이 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.",
      SERVER_ERROR: "리포트를 준비하는 중 문제가 발생했습니다.",
      NETWORK_ERROR: "연결이 불안정합니다. 잠시 후 다시 시도해 주세요.",
    },
    loadingSteps: [
      "명반을 세우는 중...",
      "명궁·신궁의 축을 읽는 중...",
      "12궁 전체를 챕터별로 해석하는 중...",
      "사화·삼방사정 호응을 엮는 중...",
      "대한·유년 마스터플랜을 정리하는 중...",
    ],
    eyebrow: "ZIWEI 전문가 상담 · 회당 결제",
    title: "✨ 심화 자미두수 전문가 상담 리포트",
    introPrefix: "지금 가장 궁금한 질문을 남기면, 명궁부터 복덕궁까지 12궁 전체와 사화·삼방사정·대한 흐름을 ",
    introBold: "15개 챕터·3~4만자",
    introSuffix: "로 풀어 그 질문에 답합니다. 화면에서 바로 읽고 PDF로도 저장할 수 있습니다.",
    questionPlaceholder: "묻고 싶은 질문을 적어 주세요. (선택 · '현재 고민 상담'은 필수)",
    generateButtonChecking: "결제 확인 중...",
    generateButtonPayment: "결제 진행 중...",
    generateButtonGenerating: "리포트 생성 중...",
    generateButtonIdle: "심화 전문가 상담 받기 (30,000원)",
    priceBadgePrefix: "상담 이용 가격 ",
    footnote: "회당 결제 · 15챕터 · 3~4만자 · 이용권/월정석 보유 시 무차감 진행",
    historyButtonLoading: "불러오는 중...",
    historyButtonIdle: "지난 리포트 다시 보기",
    historyEmpty: "아직 저장된 리포트가 없습니다.",
    historyDefaultName: "내",
    historyReportLabel: "리포트",
    historyPartialSuffix: " (생성 중단)",
    generatingChapterSuffix: (done, total) => (done > 0 ? ` (${done}/${total}챕터)` : ""),
    readyStatusRestored: "저장된 리포트",
    readyStatusComplete: "완성",
    readyChapterCountTemplate: (count, chars) => `${count}챕터 · 약 ${chars}자`,
    readyMessageRestored: "저장된 리포트를 다시 열었습니다",
    readyMessageComplete: "심화 자미두수 리포트가 완성되었습니다",
    pdfDownloadButtonSaving: "저장 중...",
    pdfDownloadButtonIdle: "PDF 다운로드",
    retryButton: "다른 질문으로 다시 상담하기",
    reportCoverEyebrow: "紫微斗數 · 심화 리포트",
    reportCoverNameTemplate: (name) => `${name}님의 심화 자미두수 15챕터`,
    reportCoverDefaultName: "당신",
    calendarSolarLabel: "양력",
    calendarLunarLabel: "음력",
    timeUnknownLabel: "출생시간 모름",
    genderMaleLabel: "남성",
    genderFemaleLabel: "여성",
    pdfFileNameStem: "심화자미두수",
    pdfNameFallback: "자미두수",
    pdfCoverTitle: (name) => `${name}님의 심화 자미두수 리포트`,
    pdfDownloadError: "PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    gateTitleChecking: "결제 확인",
    gateTitleComplete: "확인 완료",
    gateMessageGenerating: "리포트를 생성합니다.",
    gateTitleFailed: "확인 실패",
  },
  ja: {
    reasonText: "深化紫微斗数 深層レポート",
    focusOptions: {
      overall: "命盤全体の解釈",
      personality: "生まれ持った性向",
      career: "仕事・事業運",
      money: "金運",
      love: "恋愛・結婚運",
      relationship: "人間関係",
      health: "健康・メンタル",
      custom: "今の悩みを相談",
    },
    errorText: {
      LOGIN_REQUIRED: "レポートを生成するにはログインが必要です。",
      PAYMENT_REQUIRED: "都度決済が必要なレポートです。",
      PAYMENT_VERIFY_FAILED: "決済確認が完了していません。決済がお済みの場合はしばらくしてから再度お試しください。",
      PAYMENT_CANCELLED: "決済がキャンセルされました。",
      INVALID_INPUT: "生年月日と出生時刻の情報をご確認ください。",
      CUSTOM_QUESTION_REQUIRED: "お聞きになりたい質問をもう少し具体的にご記入ください。",
      GENERATION_FAILED: "レポートを完成できませんでした。決済は取り消しましたので、しばらくしてから再度お試しください。",
      DB_DEGRADED: "只今接続が一時的に不安定です。しばらくしてから再度お試しください。",
      SERVER_ERROR: "レポートの準備中に問題が発生しました。",
      NETWORK_ERROR: "接続が不安定です。しばらくしてから再度お試しください。",
    },
    loadingSteps: [
      "命盤を組み立てています...",
      "命宮・身宮の軸を読み解いています...",
      "12宮全体を章ごとに解釈しています...",
      "四化・三方四正の呼応を織り込んでいます...",
      "大限・流年のマスタープランを整理しています...",
    ],
    eyebrow: "ZIWEI専門家相談・都度決済",
    title: "✨ 深化紫微斗数 専門家相談レポート",
    introPrefix: "今いちばん気になる質問を残していただければ、命宮から福徳宮まで12宮全体と四化・三方四正・大限の流れを",
    introBold: "15章・3～4万字",
    introSuffix: "で解き明かし、その質問にお答えします。画面ですぐ読め、PDFとしても保存できます。",
    questionPlaceholder: "お聞きになりたい質問をご記入ください。（任意・「今の悩みを相談」は必須）",
    generateButtonChecking: "決済確認中...",
    generateButtonPayment: "決済処理中...",
    generateButtonGenerating: "レポート生成中...",
    generateButtonIdle: "深化専門家相談を受ける（30,000ウォン）",
    priceBadgePrefix: "相談利用価格 ",
    footnote: "都度決済・15章・3～4万字・パス/月精石保有時は控除なし",
    historyButtonLoading: "読み込み中...",
    historyButtonIdle: "過去のレポートを見る",
    historyEmpty: "まだ保存されたレポートはありません。",
    historyDefaultName: "自分の",
    historyReportLabel: "レポート",
    historyPartialSuffix: "（生成中断）",
    generatingChapterSuffix: (done, total) => (done > 0 ? `（${done}/${total}章）` : ""),
    readyStatusRestored: "保存済みレポート",
    readyStatusComplete: "完成",
    readyChapterCountTemplate: (count, chars) => `${count}章・約${chars}字`,
    readyMessageRestored: "保存されたレポートを再度開きました",
    readyMessageComplete: "深化紫微斗数レポートが完成しました",
    pdfDownloadButtonSaving: "保存中...",
    pdfDownloadButtonIdle: "PDFダウンロード",
    retryButton: "別の質問でもう一度相談する",
    reportCoverEyebrow: "紫微斗數・深化レポート",
    reportCoverNameTemplate: (name) => `${name}様の深化紫微斗数15章`,
    reportCoverDefaultName: "あなた",
    calendarSolarLabel: "太陽暦",
    calendarLunarLabel: "太陰暦",
    timeUnknownLabel: "出生時刻不明",
    genderMaleLabel: "男性",
    genderFemaleLabel: "女性",
    pdfFileNameStem: "深化紫微斗数",
    pdfNameFallback: "紫微斗数",
    pdfCoverTitle: (name) => `${name}様の深化紫微斗数レポート`,
    pdfDownloadError: "PDF保存中に問題が発生しました。しばらくしてから再度お試しください。",
    gateTitleChecking: "決済確認",
    gateTitleComplete: "確認完了",
    gateMessageGenerating: "レポートを生成します。",
    gateTitleFailed: "確認失敗",
  },
  "zh-CN": {
    reasonText: "深化紫微斗数深度报告",
    focusOptions: {
      overall: "全盘解读",
      personality: "先天性向",
      career: "事业/工作运",
      money: "财运",
      love: "恋爱/婚姻运",
      relationship: "人际关系",
      health: "健康/心理状态",
      custom: "咨询当前烦恼",
    },
    errorText: {
      LOGIN_REQUIRED: "生成报告需要登录。",
      PAYMENT_REQUIRED: "此报告需要按次付费。",
      PAYMENT_VERIFY_FAILED: "支付确认尚未完成。如果已完成支付，请稍后重试。",
      PAYMENT_CANCELLED: "支付已取消。",
      INVALID_INPUT: "请确认出生日期与出生时间信息。",
      CUSTOM_QUESTION_REQUIRED: "请再具体描述一下您想咨询的问题。",
      GENERATION_FAILED: "报告未能生成完成，费用已退还，请稍后重试。",
      DB_DEGRADED: "当前连接暂时不稳定，请稍后重试。",
      SERVER_ERROR: "准备报告时出现问题。",
      NETWORK_ERROR: "网络连接不稳定，请稍后重试。",
    },
    loadingSteps: [
      "正在排定命盘...",
      "正在解读命宫、身宫的轴线...",
      "正在按章节解读全部12宫...",
      "正在编织四化与三方四正的呼应...",
      "正在整理大限、流年总体规划...",
    ],
    eyebrow: "ZIWEI 专家咨询 · 按次付费",
    title: "✨ 深化紫微斗数专家咨询报告",
    introPrefix: "留下你现在最想问的问题，我们将命宫到福德宫的全部12宫，连同四化、三方四正、大限流转，展开为",
    introBold: "15个章节、3-4万字",
    introSuffix: "来回答这个问题。可在屏幕上直接阅读，也可保存为 PDF。",
    questionPlaceholder: "请写下你想问的问题。（可选，选择「咨询当前烦恼」时必填）",
    generateButtonChecking: "正在确认支付...",
    generateButtonPayment: "正在处理支付...",
    generateButtonGenerating: "正在生成报告...",
    generateButtonIdle: "获取深化专家咨询（30,000韩元）",
    priceBadgePrefix: "咨询价格 ",
    footnote: "按次付费 · 15章节 · 3-4万字 · 持有通行证/月精石时无需扣费",
    historyButtonLoading: "加载中...",
    historyButtonIdle: "查看历史报告",
    historyEmpty: "暂无已保存的报告。",
    historyDefaultName: "我的",
    historyReportLabel: "报告",
    historyPartialSuffix: "（生成中断）",
    generatingChapterSuffix: (done, total) => (done > 0 ? `（${done}/${total}章）` : ""),
    readyStatusRestored: "已保存的报告",
    readyStatusComplete: "已完成",
    readyChapterCountTemplate: (count, chars) => `${count}章 · 约${chars}字`,
    readyMessageRestored: "已重新打开保存的报告",
    readyMessageComplete: "深化紫微斗数报告已完成",
    pdfDownloadButtonSaving: "保存中...",
    pdfDownloadButtonIdle: "下载 PDF",
    retryButton: "换个问题重新咨询",
    reportCoverEyebrow: "紫微斗數 · 深化报告",
    reportCoverNameTemplate: (name) => `${name}的深化紫微斗数15章`,
    reportCoverDefaultName: "您",
    calendarSolarLabel: "阳历",
    calendarLunarLabel: "阴历",
    timeUnknownLabel: "出生时间未知",
    genderMaleLabel: "男性",
    genderFemaleLabel: "女性",
    pdfFileNameStem: "深化紫微斗数",
    pdfNameFallback: "紫微斗数",
    pdfCoverTitle: (name) => `${name}的深化紫微斗数报告`,
    pdfDownloadError: "保存 PDF 时出现问题，请稍后重试。",
    gateTitleChecking: "确认支付",
    gateTitleComplete: "确认完成",
    gateMessageGenerating: "正在生成报告。",
    gateTitleFailed: "确认失败",
  },
  "zh-TW": {
    reasonText: "深化紫微斗數深度報告",
    focusOptions: {
      overall: "全盤解讀",
      personality: "先天性向",
      career: "事業/工作運",
      money: "財運",
      love: "戀愛/婚姻運",
      relationship: "人際關係",
      health: "健康/心理狀態",
      custom: "諮詢目前煩惱",
    },
    errorText: {
      LOGIN_REQUIRED: "產生報告需要登入。",
      PAYMENT_REQUIRED: "此報告需要按次付費。",
      PAYMENT_VERIFY_FAILED: "付款確認尚未完成。如果已完成付款，請稍後再試。",
      PAYMENT_CANCELLED: "付款已取消。",
      INVALID_INPUT: "請確認出生日期與出生時間資訊。",
      CUSTOM_QUESTION_REQUIRED: "請再具體描述一下您想諮詢的問題。",
      GENERATION_FAILED: "報告未能產生完成，費用已退還，請稍後再試。",
      DB_DEGRADED: "目前連線暫時不穩定，請稍後再試。",
      SERVER_ERROR: "準備報告時發生問題。",
      NETWORK_ERROR: "網路連線不穩定，請稍後再試。",
    },
    loadingSteps: [
      "正在排定命盤...",
      "正在解讀命宮、身宮的軸線...",
      "正在依章節解讀全部12宮...",
      "正在編織四化與三方四正的呼應...",
      "正在整理大限、流年總體規劃...",
    ],
    eyebrow: "ZIWEI 專家諮詢 · 按次付費",
    title: "✨ 深化紫微斗數專家諮詢報告",
    introPrefix: "留下你現在最想問的問題，我們將命宮到福德宮的全部12宮，連同四化、三方四正、大限流轉，展開為",
    introBold: "15個章節、3-4萬字",
    introSuffix: "來回答這個問題。可在畫面上直接閱讀，也可儲存為 PDF。",
    questionPlaceholder: "請寫下你想問的問題。（可選，選擇「諮詢目前煩惱」時必填）",
    generateButtonChecking: "正在確認付款...",
    generateButtonPayment: "正在處理付款...",
    generateButtonGenerating: "正在產生報告...",
    generateButtonIdle: "獲取深化專家諮詢（30,000韓元）",
    priceBadgePrefix: "諮詢價格 ",
    footnote: "按次付費 · 15章節 · 3-4萬字 · 持有通行證/月精石時無需扣費",
    historyButtonLoading: "載入中...",
    historyButtonIdle: "查看歷史報告",
    historyEmpty: "尚無已儲存的報告。",
    historyDefaultName: "我的",
    historyReportLabel: "報告",
    historyPartialSuffix: "（產生中斷）",
    generatingChapterSuffix: (done, total) => (done > 0 ? `（${done}/${total}章）` : ""),
    readyStatusRestored: "已儲存的報告",
    readyStatusComplete: "已完成",
    readyChapterCountTemplate: (count, chars) => `${count}章 · 約${chars}字`,
    readyMessageRestored: "已重新開啟儲存的報告",
    readyMessageComplete: "深化紫微斗數報告已完成",
    pdfDownloadButtonSaving: "儲存中...",
    pdfDownloadButtonIdle: "下載 PDF",
    retryButton: "換個問題重新諮詢",
    reportCoverEyebrow: "紫微斗數 · 深化報告",
    reportCoverNameTemplate: (name) => `${name}的深化紫微斗數15章`,
    reportCoverDefaultName: "您",
    calendarSolarLabel: "陽曆",
    calendarLunarLabel: "陰曆",
    timeUnknownLabel: "出生時間未知",
    genderMaleLabel: "男性",
    genderFemaleLabel: "女性",
    pdfFileNameStem: "深化紫微斗數",
    pdfNameFallback: "紫微斗數",
    pdfCoverTitle: (name) => `${name}的深化紫微斗數報告`,
    pdfDownloadError: "儲存 PDF 時發生問題，請稍後再試。",
    gateTitleChecking: "確認付款",
    gateTitleComplete: "確認完成",
    gateMessageGenerating: "正在產生報告。",
    gateTitleFailed: "確認失敗",
  },
  en: ZIWEI_DEEP_PDF_COPY_EN,
};

export function getZiweiDeepPdfCopy(locale: LoadingLocale): ZiweiDeepPdfCopy {
  return { ...ZIWEI_DEEP_PDF_COPY_EN, ...(ZIWEI_DEEP_PDF_COPY[locale] || {}) };
}
