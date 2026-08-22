"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Download, Loader2, Menu, RefreshCw, X } from "lucide-react";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import AiResultProse from "@/components/fortune/AiResultProse";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildKarmaDestinyPreviewPayload } from "@/lib/dev-preview/fixtures/karma-destiny";
import EvidenceDisclosure from "./_components/EvidenceDisclosure";
import LensRadar from "./_components/LensRadar";
import ObservatoryLoader from "./_components/ObservatoryLoader";
import SectionTabs, { type SectionTab } from "./_components/SectionTabs";
import {
  ConstellationMark,
  NorthStarIcon,
  ObservatoryLogIcon,
  OrreryIcon,
  SectionDivider,
  StarChain,
  Starfield,
} from "./_components/ObservatorySvg";
import ResultStyles from "./_components/ResultStyles";
import {
  buildChapterText,
  normalizeReport,
  pickTodayLine,
  type KarmaResult,
} from "./_lib/report-model";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface KarmaResultCopy {
  loadFailed: string;
  loadingRecord: string;
  sessionNotFound: string;
  retryInput: string;
  generationStalled: string;
  generationHalted: string;
  copiedAll: string;
  copiedChapter: (order: number) => string;
  pdfSaveError: string;
  pdfCoverTitle: (name: string) => string;
  defaultUserName: string;
  defaultTopic: string;
  defaultKeywords: string[];
  brandName: string;
  backToView: string;
  tocButton: string;
  copyAllButton: string;
  pdfSaveButton: string;
  tocHead: string;
  tocCloseAriaLabel: string;
  densityGroupAriaLabel: string;
  densityFull: string;
  densitySummary: string;
  chapterCountSuffix: (n: number) => string;
  charCountSuffix: string;
  loaderStageDefault: string;
  loaderDetailDefault: string;
  loaderContinuing: string;
  loaderRetry: string;
  reportIncomplete: string;
  readMoreCollapse: string;
  readMoreExpand: string;
  copyChapterButton: string;
  thisChapterKeyHeading: string;
  tabCore: string;
  tabScore: string;
  tabSynthesis: string;
  tabMap: string;
  tabCards: string;
  tabAction: string;
  tabToday: string;
  coreKicker: string;
  energyKicker: string;
  energyHeading: string;
  energyNote: string;
  synthesisKicker: string;
  mapKicker: string;
  mapHeading: string;
  cardsKicker: string;
  cardsHeading: (n: number) => string;
  tocChapterEntry: (order: number, title: string) => string;
  actionKicker: string;
  actionHeading: string;
  todayKicker: string;
  todayShowAllSummary: string;
  disclaimer: string;
}

const KARMA_RESULT_EN: KarmaResultCopy = {
  loadFailed: "Couldn't load the Karma Destiny report.",
  loadingRecord: "Loading your karmic record",
  sessionNotFound: "Couldn't find the consultation session.",
  retryInput: "Enter again",
  generationStalled: "The long-form report generation is delayed. Please try again with the same session.",
  generationHalted: "The long-form report generation stopped. Please try again with the same session.",
  copiedAll: "Copied the full report.",
  copiedChapter: (order) => `Copied chapter ${order}.`,
  pdfSaveError: "A problem occurred while saving the PDF. Please try again shortly.",
  pdfCoverTitle: (name) => `${name}'s Karma Destiny Long-Form Report`,
  defaultUserName: "You",
  defaultTopic: "Your whole Karma Destiny",
  defaultKeywords: ["Karmic knots", "Recurring relationships", "Real-world strategy"],
  brandName: "Karma Destiny",
  backToView: "View again",
  tocButton: "Contents",
  copyAllButton: "Copy all",
  pdfSaveButton: "Save PDF",
  tocHead: "Contents",
  tocCloseAriaLabel: "Close contents",
  densityGroupAriaLabel: "Reading density",
  densityFull: "Full",
  densitySummary: "Summary",
  chapterCountSuffix: (n) => `${n} chapters`,
  charCountSuffix: " characters",
  loaderStageDefault: "Connecting the constellations of destiny",
  loaderDetailDefault: "Weaving five perspectives in order to build a single map of destiny.",
  loaderContinuing: "Opening the next chapter",
  loaderRetry: "Continue generating",
  reportIncomplete: "Report generation hasn't finished yet.",
  readMoreCollapse: "Collapse text",
  readMoreExpand: "Read more",
  copyChapterButton: "Copy this chapter",
  thisChapterKeyHeading: "This chapter's key points",
  tabCore: "Core",
  tabScore: "Energy",
  tabSynthesis: "Synthesis",
  tabMap: "Destiny Map",
  tabCards: "Categories",
  tabAction: "Action Strategy",
  tabToday: "Today's Line",
  coreKicker: "The one sentence running through this life",
  energyKicker: "Energy Intensity by Area",
  energyHeading: "Where the strength is concentrated right now",
  energyNote: "Each value is judged only by the calculation basis of the chapter that actually analyzed that area.",
  synthesisKicker: "The Synthesis of Five Perspectives",
  mapKicker: "Destiny Map",
  mapHeading: "Where the flow branches",
  cardsKicker: "Interpretation by Category",
  cardsHeading: (n) => `A life seen through ${n} lenses`,
  tocChapterEntry: (order, title) => `Ch. ${order}. ${title}`,
  actionKicker: "What You Can Do Now",
  actionHeading: "Action Strategy",
  todayKicker: "One Line to Remember Today",
  todayShowAllSummary: "See all lines to remember",
  disclaimer: "This consultation is content meant to support self-reflection through destiny symbolism, and does not substitute medical, legal, or investment judgment.",
};

const KARMA_RESULT_COPY: Partial<Record<LoadingLocale, KarmaResultCopy>> = {
  ko: {
    loadFailed: "운명의 업 리포트를 불러오지 못했습니다.",
    loadingRecord: "운명의 기록을 불러오는 중",
    sessionNotFound: "상담 세션을 찾을 수 없습니다.",
    retryInput: "다시 입력하기",
    generationStalled: "장문 리포트 생성이 지연되고 있습니다. 같은 세션으로 다시 시도해 주세요.",
    generationHalted: "장문 리포트 생성이 멈췄습니다. 같은 세션으로 다시 시도해 주세요.",
    copiedAll: "전체 리포트를 복사했습니다.",
    copiedChapter: (order) => `${order}장을 복사했습니다.`,
    pdfSaveError: "PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    pdfCoverTitle: (name) => `${name}님의 운명의 업 장문 리포트`,
    defaultUserName: "당신",
    defaultTopic: "전체 운명의 업",
    defaultKeywords: ["업의 매듭", "관계의 반복", "현실 전략"],
    brandName: "운명의 업",
    backToView: "다시 보기",
    tocButton: "목차",
    copyAllButton: "전체 복사",
    pdfSaveButton: "PDF 저장",
    tocHead: "목차",
    tocCloseAriaLabel: "목차 닫기",
    densityGroupAriaLabel: "읽기 밀도",
    densityFull: "전문",
    densitySummary: "요약",
    chapterCountSuffix: (n) => `${n}장`,
    charCountSuffix: "자",
    loaderStageDefault: "운명의 별자리를 잇는 중",
    loaderDetailDefault: "다섯 관점을 순서대로 이어 하나의 운명 지도를 짓고 있습니다.",
    loaderContinuing: "다음 장을 여는 중",
    loaderRetry: "생성 이어가기",
    reportIncomplete: "리포트 생성이 완료되지 않았습니다.",
    readMoreCollapse: "본문 접기",
    readMoreExpand: "본문 더 읽기",
    copyChapterButton: "이 장 복사",
    thisChapterKeyHeading: "이번 장의 핵심",
    tabCore: "핵심",
    tabScore: "에너지",
    tabSynthesis: "종합",
    tabMap: "운명 지도",
    tabCards: "카테고리",
    tabAction: "행동 전략",
    tabToday: "오늘의 문장",
    coreKicker: "이번 삶을 관통하는 한 문장",
    energyKicker: "영역별 에너지 강도",
    energyHeading: "지금 어디에 힘이 실려 있는가",
    energyNote: "각 영역을 실제로 분석한 장이 그 장의 계산 근거만으로 판정한 값입니다.",
    synthesisKicker: "다섯 관점의 종합 결론",
    mapKicker: "운명 지도",
    mapHeading: "흐름이 갈라지는 지점",
    cardsKicker: "카테고리별 해석",
    cardsHeading: (n) => `${n}개의 렌즈로 본 삶`,
    tocChapterEntry: (order, title) => `${order}장. ${title}`,
    actionKicker: "지금 할 수 있는 것",
    actionHeading: "행동 전략",
    todayKicker: "오늘 기억해야 할 한 문장",
    todayShowAllSummary: "기억할 문장 전부 보기",
    disclaimer: "이 상담은 운명학적 상징과 자기 성찰을 돕기 위한 콘텐츠이며, 의료·법률·투자 판단을 대신하지 않습니다.",
  },
  ja: {
    loadFailed: "カルマ・デスティニーレポートを読み込めませんでした。",
    loadingRecord: "運命の記録を読み込んでいます",
    sessionNotFound: "相談セッションが見つかりません。",
    retryInput: "もう一度入力する",
    generationStalled: "長文レポートの生成が遅れています。同じセッションで再度お試しください。",
    generationHalted: "長文レポートの生成が止まりました。同じセッションで再度お試しください。",
    copiedAll: "レポート全体をコピーしました。",
    copiedChapter: (order) => `第${order}章をコピーしました。`,
    pdfSaveError: "PDF保存中に問題が発生しました。しばらくしてからもう一度お試しください。",
    pdfCoverTitle: (name) => `${name}様のカルマ・デスティニー長文レポート`,
    defaultUserName: "あなた",
    defaultTopic: "カルマ・デスティニー全体",
    defaultKeywords: ["業の結び目", "関係の反復", "現実戦略"],
    brandName: "カルマ・デスティニー",
    backToView: "もう一度見る",
    tocButton: "目次",
    copyAllButton: "全体コピー",
    pdfSaveButton: "PDF保存",
    tocHead: "目次",
    tocCloseAriaLabel: "目次を閉じる",
    densityGroupAriaLabel: "読解密度",
    densityFull: "全文",
    densitySummary: "要約",
    chapterCountSuffix: (n) => `${n}章`,
    charCountSuffix: "字",
    loaderStageDefault: "運命の星座をつないでいます",
    loaderDetailDefault: "五つの視点を順につないで一つの運命地図を作っています。",
    loaderContinuing: "次の章を開いています",
    loaderRetry: "生成を続ける",
    reportIncomplete: "レポート生成が完了していません。",
    readMoreCollapse: "本文を閉じる",
    readMoreExpand: "本文をもっと読む",
    copyChapterButton: "この章をコピー",
    thisChapterKeyHeading: "この章の要点",
    tabCore: "核心",
    tabScore: "エネルギー",
    tabSynthesis: "総合",
    tabMap: "運命地図",
    tabCards: "カテゴリー",
    tabAction: "行動戦略",
    tabToday: "今日の一文",
    coreKicker: "この人生を貫く一文",
    energyKicker: "領域別エネルギー強度",
    energyHeading: "今どこに力が集まっているか",
    energyNote: "各領域を実際に分析した章が、その章の計算根拠のみで判定した値です。",
    synthesisKicker: "五つの視点の総合結論",
    mapKicker: "運命地図",
    mapHeading: "流れが分かれる地点",
    cardsKicker: "カテゴリー別解釈",
    cardsHeading: (n) => `${n}のレンズで見る人生`,
    tocChapterEntry: (order, title) => `第${order}章 ${title}`,
    actionKicker: "今できること",
    actionHeading: "行動戦略",
    todayKicker: "今日覚えておくべき一文",
    todayShowAllSummary: "覚えておくべき文をすべて見る",
    disclaimer: "この相談は運命学的な象徴と自己省察を助けるためのコンテンツであり、医療・法律・投資の判断に代わるものではありません。",
  },
  "zh-CN": {
    loadFailed: "无法加载业力命运报告。",
    loadingRecord: "正在加载命运记录",
    sessionNotFound: "找不到咨询会话。",
    retryInput: "重新输入",
    generationStalled: "长篇报告生成延迟。请用同一会话重试。",
    generationHalted: "长篇报告生成已停止。请用同一会话重试。",
    copiedAll: "已复制整份报告。",
    copiedChapter: (order) => `已复制第${order}章。`,
    pdfSaveError: "保存PDF时出现问题，请稍后重试。",
    pdfCoverTitle: (name) => `${name}的业力命运长篇报告`,
    defaultUserName: "你",
    defaultTopic: "整体业力命运",
    defaultKeywords: ["业的纠结", "关系的重复", "现实策略"],
    brandName: "业力命运",
    backToView: "再次查看",
    tocButton: "目录",
    copyAllButton: "全部复制",
    pdfSaveButton: "保存PDF",
    tocHead: "目录",
    tocCloseAriaLabel: "关闭目录",
    densityGroupAriaLabel: "阅读密度",
    densityFull: "全文",
    densitySummary: "摘要",
    chapterCountSuffix: (n) => `${n}章`,
    charCountSuffix: "字",
    loaderStageDefault: "正在连接命运的星座",
    loaderDetailDefault: "正按顺序连接五种视角，构建一张完整的命运地图。",
    loaderContinuing: "正在打开下一章",
    loaderRetry: "继续生成",
    reportIncomplete: "报告生成尚未完成。",
    readMoreCollapse: "收起正文",
    readMoreExpand: "阅读更多正文",
    copyChapterButton: "复制本章",
    thisChapterKeyHeading: "本章要点",
    tabCore: "核心",
    tabScore: "能量",
    tabSynthesis: "综合",
    tabMap: "命运地图",
    tabCards: "分类",
    tabAction: "行动策略",
    tabToday: "今日一句",
    coreKicker: "贯穿这一生的一句话",
    energyKicker: "各领域能量强度",
    energyHeading: "现在力量集中在哪里",
    energyNote: "每个数值仅根据实际分析该领域的那一章的计算依据判定。",
    synthesisKicker: "五种视角的综合结论",
    mapKicker: "命运地图",
    mapHeading: "分流的节点",
    cardsKicker: "分类解读",
    cardsHeading: (n) => `以${n}个视角看人生`,
    tocChapterEntry: (order, title) => `第${order}章 ${title}`,
    actionKicker: "现在能做的事",
    actionHeading: "行动策略",
    todayKicker: "今天要记住的一句话",
    todayShowAllSummary: "查看全部值得记住的句子",
    disclaimer: "本次咨询是为帮助命理象征与自我省察而提供的内容，不能替代医疗、法律或投资判断。",
  },
  "zh-TW": {
    loadFailed: "無法載入業力命運報告。",
    loadingRecord: "正在載入命運記錄",
    sessionNotFound: "找不到諮詢會話。",
    retryInput: "重新輸入",
    generationStalled: "長篇報告生成延遲。請用同一會話重試。",
    generationHalted: "長篇報告生成已停止。請用同一會話重試。",
    copiedAll: "已複製整份報告。",
    copiedChapter: (order) => `已複製第${order}章。`,
    pdfSaveError: "儲存PDF時發生問題，請稍後重試。",
    pdfCoverTitle: (name) => `${name}的業力命運長篇報告`,
    defaultUserName: "你",
    defaultTopic: "整體業力命運",
    defaultKeywords: ["業的糾結", "關係的重複", "現實策略"],
    brandName: "業力命運",
    backToView: "再次查看",
    tocButton: "目錄",
    copyAllButton: "全部複製",
    pdfSaveButton: "儲存PDF",
    tocHead: "目錄",
    tocCloseAriaLabel: "關閉目錄",
    densityGroupAriaLabel: "閱讀密度",
    densityFull: "全文",
    densitySummary: "摘要",
    chapterCountSuffix: (n) => `${n}章`,
    charCountSuffix: "字",
    loaderStageDefault: "正在連接命運的星座",
    loaderDetailDefault: "正按順序連接五種視角，構建一張完整的命運地圖。",
    loaderContinuing: "正在開啟下一章",
    loaderRetry: "繼續生成",
    reportIncomplete: "報告生成尚未完成。",
    readMoreCollapse: "收起正文",
    readMoreExpand: "閱讀更多正文",
    copyChapterButton: "複製本章",
    thisChapterKeyHeading: "本章要點",
    tabCore: "核心",
    tabScore: "能量",
    tabSynthesis: "綜合",
    tabMap: "命運地圖",
    tabCards: "分類",
    tabAction: "行動策略",
    tabToday: "今日一句",
    coreKicker: "貫穿這一生的一句話",
    energyKicker: "各領域能量強度",
    energyHeading: "現在力量集中在哪裡",
    energyNote: "每個數值僅根據實際分析該領域的那一章的計算依據判定。",
    synthesisKicker: "五種視角的綜合結論",
    mapKicker: "命運地圖",
    mapHeading: "分流的節點",
    cardsKicker: "分類解讀",
    cardsHeading: (n) => `以${n}個視角看人生`,
    tocChapterEntry: (order, title) => `第${order}章 ${title}`,
    actionKicker: "現在能做的事",
    actionHeading: "行動策略",
    todayKicker: "今天要記住的一句話",
    todayShowAllSummary: "查看全部值得記住的句子",
    disclaimer: "本次諮詢是為幫助命理象徵與自我省察而提供的內容，不能替代醫療、法律或投資判斷。",
  },
  vi: {
    loadFailed: "Không thể tải báo cáo Nghiệp Vận Mệnh.",
    loadingRecord: "Đang tải hồ sơ vận mệnh",
    sessionNotFound: "Không tìm thấy phiên tư vấn.",
    retryInput: "Nhập lại",
    generationStalled: "Việc tạo báo cáo dài đang bị chậm trễ. Vui lòng thử lại với cùng phiên.",
    generationHalted: "Việc tạo báo cáo dài đã dừng lại. Vui lòng thử lại với cùng phiên.",
    copiedAll: "Đã sao chép toàn bộ báo cáo.",
    copiedChapter: (order) => `Đã sao chép chương ${order}.`,
    pdfSaveError: "Đã xảy ra sự cố khi lưu PDF. Vui lòng thử lại sau.",
    pdfCoverTitle: (name) => `Báo Cáo Dài Nghiệp Vận Mệnh của ${name}`,
    defaultUserName: "Bạn",
    defaultTopic: "Toàn bộ Nghiệp Vận Mệnh",
    defaultKeywords: ["Nút thắt nghiệp", "Lặp lại trong quan hệ", "Chiến lược thực tế"],
    brandName: "Nghiệp Vận Mệnh",
    backToView: "Xem lại",
    tocButton: "Mục lục",
    copyAllButton: "Sao chép tất cả",
    pdfSaveButton: "Lưu PDF",
    tocHead: "Mục lục",
    tocCloseAriaLabel: "Đóng mục lục",
    densityGroupAriaLabel: "Mật độ đọc",
    densityFull: "Đầy đủ",
    densitySummary: "Tóm tắt",
    chapterCountSuffix: (n) => `${n} chương`,
    charCountSuffix: " ký tự",
    loaderStageDefault: "Đang kết nối các chòm sao vận mệnh",
    loaderDetailDefault: "Đang lần lượt kết nối năm góc nhìn để xây dựng một bản đồ vận mệnh duy nhất.",
    loaderContinuing: "Đang mở chương tiếp theo",
    loaderRetry: "Tiếp tục tạo",
    reportIncomplete: "Việc tạo báo cáo chưa hoàn tất.",
    readMoreCollapse: "Thu gọn nội dung",
    readMoreExpand: "Đọc thêm",
    copyChapterButton: "Sao chép chương này",
    thisChapterKeyHeading: "Điểm chính của chương này",
    tabCore: "Cốt lõi",
    tabScore: "Năng lượng",
    tabSynthesis: "Tổng hợp",
    tabMap: "Bản Đồ Vận Mệnh",
    tabCards: "Danh mục",
    tabAction: "Chiến Lược Hành Động",
    tabToday: "Câu Hôm Nay",
    coreKicker: "Một câu xuyên suốt cuộc đời này",
    energyKicker: "Cường Độ Năng Lượng Theo Lĩnh Vực",
    energyHeading: "Hiện tại sức mạnh đang tập trung ở đâu",
    energyNote: "Mỗi giá trị chỉ được đánh giá dựa trên căn cứ tính toán của chương thực sự phân tích lĩnh vực đó.",
    synthesisKicker: "Tổng Hợp Từ Năm Góc Nhìn",
    mapKicker: "Bản Đồ Vận Mệnh",
    mapHeading: "Điểm dòng chảy phân nhánh",
    cardsKicker: "Diễn Giải Theo Danh Mục",
    cardsHeading: (n) => `Cuộc đời nhìn qua ${n} lăng kính`,
    tocChapterEntry: (order, title) => `Chương ${order}. ${title}`,
    actionKicker: "Điều Bạn Có Thể Làm Ngay",
    actionHeading: "Chiến Lược Hành Động",
    todayKicker: "Một Câu Cần Nhớ Hôm Nay",
    todayShowAllSummary: "Xem tất cả các câu cần nhớ",
    disclaimer: "Buổi tư vấn này là nội dung hỗ trợ biểu tượng vận mệnh học và tự chiêm nghiệm, không thay thế cho phán đoán y tế, pháp lý hay đầu tư.",
  },
  hi: {
    loadFailed: "कर्म डेस्टिनी रिपोर्ट लोड नहीं हो सकी।",
    loadingRecord: "भाग्य का रिकॉर्ड लोड हो रहा है",
    sessionNotFound: "परामर्श सत्र नहीं मिला।",
    retryInput: "फिर से दर्ज करें",
    generationStalled: "दीर्घ रिपोर्ट निर्माण में देरी हो रही है। कृपया उसी सत्र से पुनः प्रयास करें।",
    generationHalted: "दीर्घ रिपोर्ट निर्माण रुक गया है। कृपया उसी सत्र से पुनः प्रयास करें।",
    copiedAll: "पूरी रिपोर्ट कॉपी की गई।",
    copiedChapter: (order) => `अध्याय ${order} कॉपी किया गया।`,
    pdfSaveError: "PDF सहेजते समय समस्या हुई। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    pdfCoverTitle: (name) => `${name} की कर्म डेस्टिनी दीर्घ रिपोर्ट`,
    defaultUserName: "आप",
    defaultTopic: "संपूर्ण कर्म डेस्टिनी",
    defaultKeywords: ["कर्म की गांठ", "संबंधों की पुनरावृत्ति", "वास्तविक रणनीति"],
    brandName: "कर्म डेस्टिनी",
    backToView: "फिर से देखें",
    tocButton: "विषय-सूची",
    copyAllButton: "सब कॉपी करें",
    pdfSaveButton: "PDF सहेजें",
    tocHead: "विषय-सूची",
    tocCloseAriaLabel: "विषय-सूची बंद करें",
    densityGroupAriaLabel: "पठन घनत्व",
    densityFull: "पूर्ण",
    densitySummary: "सारांश",
    chapterCountSuffix: (n) => `${n} अध्याय`,
    charCountSuffix: " अक्षर",
    loaderStageDefault: "भाग्य के तारामंडल को जोड़ा जा रहा है",
    loaderDetailDefault: "एक भाग्य मानचित्र बनाने के लिए पांच दृष्टिकोणों को क्रम से जोड़ा जा रहा है।",
    loaderContinuing: "अगला अध्याय खोला जा रहा है",
    loaderRetry: "निर्माण जारी रखें",
    reportIncomplete: "रिपोर्ट निर्माण पूरा नहीं हुआ है।",
    readMoreCollapse: "मुख्य भाग संक्षिप्त करें",
    readMoreExpand: "और पढ़ें",
    copyChapterButton: "यह अध्याय कॉपी करें",
    thisChapterKeyHeading: "इस अध्याय के मुख्य बिंदु",
    tabCore: "मूल",
    tabScore: "ऊर्जा",
    tabSynthesis: "संश्लेषण",
    tabMap: "भाग्य मानचित्र",
    tabCards: "श्रेणियां",
    tabAction: "कार्य रणनीति",
    tabToday: "आज की पंक्ति",
    coreKicker: "इस जीवन को भेदने वाला एक वाक्य",
    energyKicker: "क्षेत्र अनुसार ऊर्जा तीव्रता",
    energyHeading: "अभी शक्ति कहां केंद्रित है",
    energyNote: "प्रत्येक मान का निर्णय केवल उस अध्याय के गणना आधार से किया जाता है जिसने वास्तव में उस क्षेत्र का विश्लेषण किया।",
    synthesisKicker: "पांच दृष्टिकोणों का संश्लेषित निष्कर्ष",
    mapKicker: "भाग्य मानचित्र",
    mapHeading: "जहां प्रवाह विभाजित होता है",
    cardsKicker: "श्रेणी अनुसार व्याख्या",
    cardsHeading: (n) => `${n} लेंसों से देखा गया जीवन`,
    tocChapterEntry: (order, title) => `अध्याय ${order}. ${title}`,
    actionKicker: "अभी आप जो कर सकते हैं",
    actionHeading: "कार्य रणनीति",
    todayKicker: "आज याद रखने योग्य एक वाक्य",
    todayShowAllSummary: "याद रखने योग्य सभी वाक्य देखें",
    disclaimer: "यह परामर्श भाग्यशास्त्रीय प्रतीकों और आत्म-चिंतन में सहायता के लिए सामग्री है, और यह चिकित्सा, कानूनी या निवेश संबंधी निर्णय का विकल्प नहीं है।",
  },
  es: {
    loadFailed: "No se pudo cargar el informe de Karma Destino.",
    loadingRecord: "Cargando tu registro kármico",
    sessionNotFound: "No se pudo encontrar la sesión de consulta.",
    retryInput: "Ingresar de nuevo",
    generationStalled: "La generación del informe extenso está retrasada. Inténtalo de nuevo con la misma sesión.",
    generationHalted: "La generación del informe extenso se detuvo. Inténtalo de nuevo con la misma sesión.",
    copiedAll: "Se copió el informe completo.",
    copiedChapter: (order) => `Se copió el capítulo ${order}.`,
    pdfSaveError: "Ocurrió un problema al guardar el PDF. Inténtalo de nuevo en unos momentos.",
    pdfCoverTitle: (name) => `Informe Extenso de Karma Destino de ${name}`,
    defaultUserName: "Tú",
    defaultTopic: "Todo tu Karma Destino",
    defaultKeywords: ["Nudos kármicos", "Relaciones recurrentes", "Estrategia real"],
    brandName: "Karma Destino",
    backToView: "Ver de nuevo",
    tocButton: "Índice",
    copyAllButton: "Copiar todo",
    pdfSaveButton: "Guardar PDF",
    tocHead: "Índice",
    tocCloseAriaLabel: "Cerrar índice",
    densityGroupAriaLabel: "Densidad de lectura",
    densityFull: "Completo",
    densitySummary: "Resumen",
    chapterCountSuffix: (n) => `${n} capítulos`,
    charCountSuffix: " caracteres",
    loaderStageDefault: "Conectando las constelaciones del destino",
    loaderDetailDefault: "Entrelazando cinco perspectivas en orden para construir un solo mapa del destino.",
    loaderContinuing: "Abriendo el siguiente capítulo",
    loaderRetry: "Continuar generando",
    reportIncomplete: "La generación del informe aún no ha terminado.",
    readMoreCollapse: "Colapsar texto",
    readMoreExpand: "Leer más",
    copyChapterButton: "Copiar este capítulo",
    thisChapterKeyHeading: "Puntos clave de este capítulo",
    tabCore: "Núcleo",
    tabScore: "Energía",
    tabSynthesis: "Síntesis",
    tabMap: "Mapa del Destino",
    tabCards: "Categorías",
    tabAction: "Estrategia de Acción",
    tabToday: "Frase de Hoy",
    coreKicker: "La frase que atraviesa esta vida",
    energyKicker: "Intensidad de Energía por Área",
    energyHeading: "Dónde está concentrada la fuerza ahora",
    energyNote: "Cada valor se juzga solo con la base de cálculo del capítulo que realmente analizó esa área.",
    synthesisKicker: "La Síntesis de las Cinco Perspectivas",
    mapKicker: "Mapa del Destino",
    mapHeading: "Dónde se ramifica el flujo",
    cardsKicker: "Interpretación por Categoría",
    cardsHeading: (n) => `Una vida vista a través de ${n} lentes`,
    tocChapterEntry: (order, title) => `Cap. ${order}. ${title}`,
    actionKicker: "Lo Que Puedes Hacer Ahora",
    actionHeading: "Estrategia de Acción",
    todayKicker: "Una Frase para Recordar Hoy",
    todayShowAllSummary: "Ver todas las frases para recordar",
    disclaimer: "Esta consulta es contenido para apoyar el simbolismo del destino y la autorreflexión, y no sustituye el criterio médico, legal o de inversión.",
  },
  fr: {
    loadFailed: "Impossible de charger le rapport Karma Destin.",
    loadingRecord: "Chargement de votre registre karmique",
    sessionNotFound: "Session de consultation introuvable.",
    retryInput: "Saisir à nouveau",
    generationStalled: "La génération du rapport long est retardée. Veuillez réessayer avec la même session.",
    generationHalted: "La génération du rapport long s'est arrêtée. Veuillez réessayer avec la même session.",
    copiedAll: "Rapport complet copié.",
    copiedChapter: (order) => `Chapitre ${order} copié.`,
    pdfSaveError: "Un problème est survenu lors de l'enregistrement du PDF. Veuillez réessayer dans un instant.",
    pdfCoverTitle: (name) => `Rapport Long Karma Destin de ${name}`,
    defaultUserName: "Vous",
    defaultTopic: "Tout votre Karma Destin",
    defaultKeywords: ["Nœuds karmiques", "Relations récurrentes", "Stratégie réelle"],
    brandName: "Karma Destin",
    backToView: "Revoir",
    tocButton: "Sommaire",
    copyAllButton: "Tout copier",
    pdfSaveButton: "Enregistrer en PDF",
    tocHead: "Sommaire",
    tocCloseAriaLabel: "Fermer le sommaire",
    densityGroupAriaLabel: "Densité de lecture",
    densityFull: "Complet",
    densitySummary: "Résumé",
    chapterCountSuffix: (n) => `${n} chapitres`,
    charCountSuffix: " caractères",
    loaderStageDefault: "Connexion des constellations du destin",
    loaderDetailDefault: "Tissage de cinq perspectives dans l'ordre pour construire une carte unique du destin.",
    loaderContinuing: "Ouverture du chapitre suivant",
    loaderRetry: "Continuer la génération",
    reportIncomplete: "La génération du rapport n'est pas encore terminée.",
    readMoreCollapse: "Réduire le texte",
    readMoreExpand: "Lire davantage",
    copyChapterButton: "Copier ce chapitre",
    thisChapterKeyHeading: "Points clés de ce chapitre",
    tabCore: "Essentiel",
    tabScore: "Énergie",
    tabSynthesis: "Synthèse",
    tabMap: "Carte du Destin",
    tabCards: "Catégories",
    tabAction: "Stratégie d'Action",
    tabToday: "Phrase du Jour",
    coreKicker: "La phrase qui traverse cette vie",
    energyKicker: "Intensité Énergétique par Domaine",
    energyHeading: "Où la force est concentrée en ce moment",
    energyNote: "Chaque valeur n'est jugée qu'à partir de la base de calcul du chapitre ayant réellement analysé ce domaine.",
    synthesisKicker: "La Synthèse des Cinq Perspectives",
    mapKicker: "Carte du Destin",
    mapHeading: "Où le flux se ramifie",
    cardsKicker: "Interprétation par Catégorie",
    cardsHeading: (n) => `Une vie vue à travers ${n} objectifs`,
    tocChapterEntry: (order, title) => `Chap. ${order}. ${title}`,
    actionKicker: "Ce Que Vous Pouvez Faire Maintenant",
    actionHeading: "Stratégie d'Action",
    todayKicker: "Une Phrase à Retenir Aujourd'hui",
    todayShowAllSummary: "Voir toutes les phrases à retenir",
    disclaimer: "Cette consultation est un contenu destiné à soutenir le symbolisme du destin et l'introspection, et ne remplace pas un jugement médical, juridique ou d'investissement.",
  },
  de: {
    loadFailed: "Der Karma-Schicksal-Bericht konnte nicht geladen werden.",
    loadingRecord: "Dein karmisches Protokoll wird geladen",
    sessionNotFound: "Die Beratungssitzung konnte nicht gefunden werden.",
    retryInput: "Erneut eingeben",
    generationStalled: "Die Erstellung des Langberichts verzögert sich. Bitte versuche es mit derselben Sitzung erneut.",
    generationHalted: "Die Erstellung des Langberichts wurde gestoppt. Bitte versuche es mit derselben Sitzung erneut.",
    copiedAll: "Den gesamten Bericht kopiert.",
    copiedChapter: (order) => `Kapitel ${order} kopiert.`,
    pdfSaveError: "Beim Speichern des PDFs ist ein Problem aufgetreten. Bitte versuche es später erneut.",
    pdfCoverTitle: (name) => `${name}s Karma-Schicksal-Langbericht`,
    defaultUserName: "Du",
    defaultTopic: "Dein gesamtes Karma-Schicksal",
    defaultKeywords: ["Karmische Knoten", "Wiederkehrende Beziehungen", "Reale Strategie"],
    brandName: "Karma-Schicksal",
    backToView: "Erneut ansehen",
    tocButton: "Inhalt",
    copyAllButton: "Alles kopieren",
    pdfSaveButton: "PDF speichern",
    tocHead: "Inhalt",
    tocCloseAriaLabel: "Inhalt schließen",
    densityGroupAriaLabel: "Lesedichte",
    densityFull: "Vollständig",
    densitySummary: "Zusammenfassung",
    chapterCountSuffix: (n) => `${n} Kapitel`,
    charCountSuffix: " Zeichen",
    loaderStageDefault: "Die Sternbilder des Schicksals werden verbunden",
    loaderDetailDefault: "Fünf Perspektiven werden der Reihe nach verwoben, um eine einzige Schicksalskarte zu erstellen.",
    loaderContinuing: "Das nächste Kapitel wird geöffnet",
    loaderRetry: "Erstellung fortsetzen",
    reportIncomplete: "Die Berichtserstellung ist noch nicht abgeschlossen.",
    readMoreCollapse: "Text einklappen",
    readMoreExpand: "Mehr lesen",
    copyChapterButton: "Dieses Kapitel kopieren",
    thisChapterKeyHeading: "Kernpunkte dieses Kapitels",
    tabCore: "Kern",
    tabScore: "Energie",
    tabSynthesis: "Synthese",
    tabMap: "Schicksalskarte",
    tabCards: "Kategorien",
    tabAction: "Handlungsstrategie",
    tabToday: "Satz des Tages",
    coreKicker: "Der Satz, der dieses Leben durchzieht",
    energyKicker: "Energieintensität nach Bereich",
    energyHeading: "Wo die Kraft gerade konzentriert ist",
    energyNote: "Jeder Wert wird nur anhand der Berechnungsgrundlage des Kapitels beurteilt, das diesen Bereich tatsächlich analysiert hat.",
    synthesisKicker: "Die Synthese der Fünf Perspektiven",
    mapKicker: "Schicksalskarte",
    mapHeading: "Wo sich der Fluss verzweigt",
    cardsKicker: "Deutung nach Kategorie",
    cardsHeading: (n) => `Ein Leben durch ${n} Linsen betrachtet`,
    tocChapterEntry: (order, title) => `Kap. ${order}. ${title}`,
    actionKicker: "Was du jetzt tun kannst",
    actionHeading: "Handlungsstrategie",
    todayKicker: "Ein Satz, den man sich heute merken sollte",
    todayShowAllSummary: "Alle zu merkenden Sätze ansehen",
    disclaimer: "Diese Beratung ist Inhalt, der schicksalssymbolische Reflexion und Selbstbetrachtung unterstützen soll, und ersetzt kein medizinisches, rechtliches oder finanzielles Urteil.",
  },
  nl: {
    loadFailed: "Kon het Karma Destiny-rapport niet laden.",
    loadingRecord: "Je karmische verslag wordt geladen",
    sessionNotFound: "Kon de consultatiesessie niet vinden.",
    retryInput: "Opnieuw invoeren",
    generationStalled: "Het genereren van het lange rapport loopt vertraging op. Probeer het opnieuw met dezelfde sessie.",
    generationHalted: "Het genereren van het lange rapport is gestopt. Probeer het opnieuw met dezelfde sessie.",
    copiedAll: "Het volledige rapport is gekopieerd.",
    copiedChapter: (order) => `Hoofdstuk ${order} gekopieerd.`,
    pdfSaveError: "Er is een probleem opgetreden bij het opslaan van de PDF. Probeer het later opnieuw.",
    pdfCoverTitle: (name) => `${name}'s Karma Destiny Lang Rapport`,
    defaultUserName: "Jij",
    defaultTopic: "Je hele Karma Destiny",
    defaultKeywords: ["Karmische knopen", "Terugkerende relaties", "Praktische strategie"],
    brandName: "Karma Destiny",
    backToView: "Opnieuw bekijken",
    tocButton: "Inhoud",
    copyAllButton: "Alles kopiëren",
    pdfSaveButton: "PDF opslaan",
    tocHead: "Inhoud",
    tocCloseAriaLabel: "Inhoud sluiten",
    densityGroupAriaLabel: "Leesdichtheid",
    densityFull: "Volledig",
    densitySummary: "Samenvatting",
    chapterCountSuffix: (n) => `${n} hoofdstukken`,
    charCountSuffix: " tekens",
    loaderStageDefault: "De sterrenbeelden van het lot worden verbonden",
    loaderDetailDefault: "Vijf perspectieven worden op volgorde verweven om één lotskaart te bouwen.",
    loaderContinuing: "Het volgende hoofdstuk wordt geopend",
    loaderRetry: "Doorgaan met genereren",
    reportIncomplete: "Het genereren van het rapport is nog niet voltooid.",
    readMoreCollapse: "Tekst inklappen",
    readMoreExpand: "Meer lezen",
    copyChapterButton: "Dit hoofdstuk kopiëren",
    thisChapterKeyHeading: "Kernpunten van dit hoofdstuk",
    tabCore: "Kern",
    tabScore: "Energie",
    tabSynthesis: "Synthese",
    tabMap: "Lotskaart",
    tabCards: "Categorieën",
    tabAction: "Actiestrategie",
    tabToday: "Zin van Vandaag",
    coreKicker: "De zin die dit leven doortrekt",
    energyKicker: "Energie-intensiteit per Gebied",
    energyHeading: "Waar de kracht nu geconcentreerd is",
    energyNote: "Elke waarde wordt alleen beoordeeld op basis van de berekeningsgrondslag van het hoofdstuk dat dat gebied daadwerkelijk heeft geanalyseerd.",
    synthesisKicker: "De Synthese van Vijf Perspectieven",
    mapKicker: "Lotskaart",
    mapHeading: "Waar de stroom zich vertakt",
    cardsKicker: "Duiding per Categorie",
    cardsHeading: (n) => `Een leven bekeken door ${n} lenzen`,
    tocChapterEntry: (order, title) => `Hfst. ${order}. ${title}`,
    actionKicker: "Wat Je Nu Kunt Doen",
    actionHeading: "Actiestrategie",
    todayKicker: "Een Zin om Vandaag te Onthouden",
    todayShowAllSummary: "Bekijk alle te onthouden zinnen",
    disclaimer: "Deze consultatie is inhoud bedoeld om lotssymboliek en zelfreflectie te ondersteunen, en vervangt geen medisch, juridisch of financieel oordeel.",
  },
  ms: {
    loadFailed: "Tidak dapat memuatkan laporan Karma Destiny.",
    loadingRecord: "Rekod nasib anda sedang dimuatkan",
    sessionNotFound: "Tidak dapat mencari sesi konsultasi.",
    retryInput: "Masukkan semula",
    generationStalled: "Penjanaan laporan panjang tertunda. Sila cuba lagi dengan sesi yang sama.",
    generationHalted: "Penjanaan laporan panjang terhenti. Sila cuba lagi dengan sesi yang sama.",
    copiedAll: "Laporan penuh telah disalin.",
    copiedChapter: (order) => `Bab ${order} telah disalin.`,
    pdfSaveError: "Masalah berlaku semasa menyimpan PDF. Sila cuba lagi sebentar lagi.",
    pdfCoverTitle: (name) => `Laporan Panjang Karma Destiny ${name}`,
    defaultUserName: "Anda",
    defaultTopic: "Keseluruhan Karma Destiny anda",
    defaultKeywords: ["Simpulan karma", "Hubungan berulang", "Strategi realiti"],
    brandName: "Karma Destiny",
    backToView: "Lihat semula",
    tocButton: "Kandungan",
    copyAllButton: "Salin semua",
    pdfSaveButton: "Simpan PDF",
    tocHead: "Kandungan",
    tocCloseAriaLabel: "Tutup kandungan",
    densityGroupAriaLabel: "Ketumpatan bacaan",
    densityFull: "Penuh",
    densitySummary: "Ringkasan",
    chapterCountSuffix: (n) => `${n} bab`,
    charCountSuffix: " aksara",
    loaderStageDefault: "Menghubungkan buruj nasib",
    loaderDetailDefault: "Menganyam lima perspektif secara berurutan untuk membina satu peta nasib.",
    loaderContinuing: "Membuka bab seterusnya",
    loaderRetry: "Teruskan penjanaan",
    reportIncomplete: "Penjanaan laporan belum selesai.",
    readMoreCollapse: "Kuncupkan teks",
    readMoreExpand: "Baca lagi",
    copyChapterButton: "Salin bab ini",
    thisChapterKeyHeading: "Perkara utama bab ini",
    tabCore: "Teras",
    tabScore: "Tenaga",
    tabSynthesis: "Sintesis",
    tabMap: "Peta Nasib",
    tabCards: "Kategori",
    tabAction: "Strategi Tindakan",
    tabToday: "Ayat Hari Ini",
    coreKicker: "Satu ayat yang meresapi kehidupan ini",
    energyKicker: "Keamatan Tenaga Mengikut Bidang",
    energyHeading: "Di mana kekuatan tertumpu sekarang",
    energyNote: "Setiap nilai dinilai hanya berdasarkan asas pengiraan bab yang benar-benar menganalisis bidang tersebut.",
    synthesisKicker: "Sintesis Lima Perspektif",
    mapKicker: "Peta Nasib",
    mapHeading: "Titik aliran bercabang",
    cardsKicker: "Tafsiran Mengikut Kategori",
    cardsHeading: (n) => `Kehidupan dilihat melalui ${n} lensa`,
    tocChapterEntry: (order, title) => `Bab ${order}. ${title}`,
    actionKicker: "Apa Yang Boleh Anda Lakukan Sekarang",
    actionHeading: "Strategi Tindakan",
    todayKicker: "Satu Ayat Untuk Diingati Hari Ini",
    todayShowAllSummary: "Lihat semua ayat yang perlu diingati",
    disclaimer: "Konsultasi ini adalah kandungan untuk membantu simbolisme nasib dan refleksi diri, dan tidak menggantikan pertimbangan perubatan, undang-undang, atau pelaburan.",
  },
};

function getKarmaResultCopy(locale: LoadingLocale): KarmaResultCopy {
  return KARMA_RESULT_COPY[locale] || KARMA_RESULT_EN;
}

function useKarmaResultCopy(): KarmaResultCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getKarmaResultCopy(locale);
}

async function requestJson<T>(url: string, init: RequestInit | undefined, copy: KarmaResultCopy): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && payload?.ok !== true) {
    throw new Error(payload?.message || copy.loadFailed);
  }
  return payload as T;
}

const DATE_GENERATING_EN = "Generating";
const DATE_GENERATING_COPY: Partial<Record<LoadingLocale, string>> = {
  ko: "생성 중", ja: "生成中", "zh-CN": "生成中", "zh-TW": "生成中", vi: "Đang tạo",
  hi: "बन रहा है", es: "Generando", fr: "Génération en cours", de: "Wird erstellt",
  nl: "Wordt gegenereerd", ms: "Sedang dijana",
};

function formatDate(value: string | undefined, locale: LoadingLocale) {
  const generating = DATE_GENERATING_COPY[locale] || DATE_GENERATING_EN;
  if (!value) return generating;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return generating;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

type Density = "full" | "summary";

function KarmaDestinyResultInner() {
  const copy = useKarmaResultCopy();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("sessionId") || searchParams?.get("reportId") || searchParams?.get("attemptId") || searchParams?.get("idempotencyKey") || "";
  const [result, setResult] = useState<KarmaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set());
  const [openEvidence, setOpenEvidence] = useState<Set<string>>(new Set());
  const [activeChapterId, setActiveChapterId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [density, setDensity] = useState<Density>("full");
  const [readCount, setReadCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const batchInFlightRef = useRef(false);
  const readIdsRef = useRef<Set<string>>(new Set());
  // handleDownload 가 전 챕터를 강제로 펼치면 스크롤 없이 DOM 이 뷰포트에 들어와 "전부 읽음"
  // 으로 오염된다. state 가 아니라 ref 여야 옵저버 콜백이 최신값을 본다.
  const exportingRef = useRef(false);
  // 서버가 진척 없이 generating을 반복 반환할 때 generate-batch POST가 무한 폭주(Cloudflare 1015)하지 않도록
  // "무진척(stall)" 배치가 연속되면 중단한다. 챕터가 진행되면 리셋되므로 정상 생성에는 영향이 없다.
  const generationStallRef = useRef({ lastChapters: -1, stalls: 0 });
  // 배치 락 TTL 390s(서버) 동안 다른 탭/죽은 isolate가 락을 쥐면 무진척 라운드(~1.2s)가 이어진다.
  // 390s를 견디도록 상한을 설정(≈0.8req/s — CF 10초당 100회 제한 대비 충분한 여유).
  const maxGenerationStalls = 360;

  const report = useMemo(() => normalizeReport(result), [result]);
  // `report?.chapters || []` 를 그대로 쓰면 report 가 null 인 동안 매 렌더 새 배열이 되어
  // 아래 스파이 옵저버가 폴링마다 재생성된다.
  const chapters = useMemo(() => report?.chapters || [], [report]);
  const progress = result?.generationProgress || {};
  const percent = Math.max(4, Math.min(100, Math.round(Number(progress.percent || (result?.status === "completed" ? 100 : 8)))));
  const userName = result?.userInput?.name?.trim() || copy.defaultUserName;
  const keywords = result?.summaryCards?.keywords?.length ? result.summaryCards.keywords.slice(0, 3) : copy.defaultKeywords;
  const todayLine = useMemo(() => pickTodayLine(report?.keyLines || []), [report?.keyLines]);

  const loadResult = useCallback(async () => {
    const previewState = readDevPreviewState();
    if (previewState) {
      setResult(buildKarmaDestinyPreviewPayload(previewState) as KarmaResult);
      setError("");
      setLoading(false);
      return;
    }
    if (!sessionId) {
      setError(copy.sessionNotFound);
      setLoading(false);
      return;
    }
    try {
      const payload = await requestJson<KarmaResult>(`/api/karma-destiny-ai/result?sessionId=${encodeURIComponent(sessionId)}`, undefined, copy);
      setResult(payload);
      setError("");
    } catch (caught) {
      setError(friendlyErrorMessage(caught, copy.loadFailed));
    } finally {
      setLoading(false);
    }
  }, [sessionId, copy]);

  const continueGeneration = useCallback(async () => {
    if (!sessionId || batchInFlightRef.current) return;
    batchInFlightRef.current = true;
    setContinuing(true);
    try {
      const payload = await requestJson<KarmaResult>("/api/karma-destiny-ai/generate-batch", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      }, copy);
      const completed = Number(payload?.generationProgress?.completedChapters ?? 0);
      const stall = generationStallRef.current;
      if (completed > stall.lastChapters) {
        stall.lastChapters = completed;
        stall.stalls = 0;
      } else {
        stall.stalls += 1;
      }
      setResult(payload);
      if (payload?.status === "generating" && stall.stalls >= maxGenerationStalls) {
        setError(copy.generationStalled);
      } else {
        setError("");
      }
    } catch (caught) {
      setError(friendlyErrorMessage(caught, copy.generationHalted));
    } finally {
      batchInFlightRef.current = false;
      setContinuing(false);
    }
  }, [sessionId, copy]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  useEffect(() => {
    if (result?.status !== "generating" || error) return undefined;
    const timer = window.setTimeout(() => {
      void continueGeneration();
    }, continuing ? 2600 : 900);
    return () => window.clearTimeout(timer);
  }, [continueGeneration, continuing, error, result?.status, result?.generationProgress?.completedChapters]);

  useEffect(() => {
    if (result?.status !== "completed" || !chapters.length) return;
    setOpenChapters((prev) => (prev.size ? prev : new Set(chapters.map((chapter) => chapter.id))));
  }, [chapters, result?.status]);

  // 밀도 선호는 세션 단위로만 기억한다. localStorage 면 다른 리포트와 섞인다.
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(`kdai:density:${sessionId}`);
    if (saved === "summary" || saved === "full") setDensity(saved);
    const savedRead = window.sessionStorage.getItem(`kdai:read:${sessionId}`);
    if (savedRead) {
      try {
        const ids: string[] = JSON.parse(savedRead);
        readIdsRef.current = new Set(ids);
        setReadCount(readIdsRef.current.size);
      } catch {
        /* 저장값이 깨졌으면 그냥 처음부터 센다. */
      }
    }
  }, [sessionId]);

  const changeDensity = useCallback((next: Density) => {
    setDensity(next);
    if (sessionId && typeof window !== "undefined") window.sessionStorage.setItem(`kdai:density:${sessionId}`, next);
  }, [sessionId]);

  // 스크롤 스파이 — 섹션 탭·염주 레일·읽기 진행률·순차 등장을 옵저버 하나로 처리한다.
  // rootMargin/threshold 는 기존 튜닝값 그대로다(활성 판정이 이 값에 맞춰져 있다).
  useEffect(() => {
    if (result?.status !== "completed" || !chapters.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const markRead = (id: string) => {
      if (exportingRef.current || readIdsRef.current.has(id)) return;
      readIdsRef.current.add(id);
      setReadCount(readIdsRef.current.size);
      if (sessionId && typeof window !== "undefined") {
        window.sessionStorage.setItem(`kdai:read:${sessionId}`, JSON.stringify([...readIdsRef.current]));
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            visible.set(node.id, entry.intersectionRatio);
            node.classList.add("is-revealed");
            markRead(node.id);
          } else {
            visible.delete(node.id);
          }
        }
        let bestId = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (!bestId) return;
        const kind = document.getElementById(bestId)?.dataset.kdaiSpy;
        if (kind === "section") setActiveSectionId(bestId);
        else setActiveChapterId(bestId);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.01, 0.25, 0.5] },
    );
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-kdai-spy]"));
    nodes.forEach((node) => observer.observe(node));
    setActiveChapterId((prev) => prev || chapters[0]?.id || "");
    return () => observer.disconnect();
  }, [chapters, density, result?.status, sessionId]);

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const copyAll = async () => {
    await copyText(chapters.map(buildChapterText).join("\n\n"), copy.copiedAll);
  };

  const handleDownload = async () => {
    const element = document.getElementById("karma-premium-report");
    if (!element || downloading) return;
    setDownloading(true);
    // 접힌 "더 읽기" 본문·미개봉 챕터·요약 모드가 PDF에서 잘리지 않도록 전부 펼친 뒤 캡처한다.
    setOpenChapters(new Set(chapters.map((chapter) => chapter.id)));
    setExpandedBodies(new Set(chapters.map((chapter) => chapter.id)));
    changeDensity("full");
    exportingRef.current = true;
    setExporting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const safeName = userName.replace(/[\\/:*?"<>|]/g, "_");
      await exportResultPdf({
        captureTargets: ["#karma-premium-report [data-kdai-pdf-page]"],
        fileName: `karma-destiny-report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`,
        backgroundColor: "#060A18",
        cover: {
          title: copy.pdfCoverTitle(userName),
          subtitle: result?.userInput?.topic || copy.defaultTopic,
          name: userName,
          date: formatDate(result?.generatedAt, getCurrentLoadingLocale()),
        },
      });
    } catch {
      setError(copy.pdfSaveError);
    } finally {
      exportingRef.current = false;
      setExporting(false);
      setDownloading(false);
    }
  };

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBody = (id: string) => {
    setExpandedBodies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEvidence = (id: string, open: boolean) => {
    setOpenEvidence((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="kdai-result-page">
        <div className="kdai-pending">
          <Loader2 className="kdai-spin" size={28} />
          <p>{copy.loadingRecord}</p>
        </div>
        <ResultStyles />
      </main>
    );
  }

  if (error && !result) {
    return (
      <main className="kdai-result-page">
        <div className="kdai-error-state">
          <p>{error}</p>
          <Link href="/karma-destiny-ai"><ArrowLeft size={17} /> {copy.retryInput}</Link>
        </div>
        <ResultStyles />
      </main>
    );
  }

  const isGenerating = result?.status === "generating";
  const isCompleted = result?.status === "completed";
  const summaryMode = density === "summary" && !exporting;

  // 탭은 실제로 마운트된 섹션에서만 만든다. 렌더되지 않는 단으로 가는 탭이 있으면 안 된다.
  const sectionTabs: SectionTab[] = [
    { id: "kdo-core", label: copy.tabCore },
    ...(report?.energyScores.length ? [{ id: "kdo-score", label: copy.tabScore }] : []),
    ...(report?.synthesis ? [{ id: "kdo-synthesis", label: copy.tabSynthesis }] : []),
    ...(report?.timeline.length ? [{ id: "kdo-map", label: copy.tabMap }] : []),
    { id: "kdo-cards", label: copy.tabCards },
    ...(report?.actionItems.length || report?.letter ? [{ id: "kdo-action", label: copy.tabAction }] : []),
    ...(todayLine ? [{ id: "kdo-today", label: copy.tabToday }] : []),
  ];
  const totalSpyNodes = sectionTabs.length + (report?.categories.length || 0);
  const readProgress = totalSpyNodes > 0 ? Math.min(1, readCount / totalSpyNodes) : 0;

  return (
    <main className="kdai-result-page">
      {notice && <div className="kdai-toast">{notice}</div>}

      {isGenerating && (
        <ObservatoryLoader
          stageIndex={progress.stageIndex}
          totalStages={progress.totalStages}
          percent={percent}
          stageLabel={progress.stageLabel || copy.loaderStageDefault}
          detail={progress.currentChapterTitle || copy.loaderDetailDefault}
        >
          <StarChain
            total={Number(progress.totalChapters || 15)}
            filled={Number(progress.completedChapters || 0)}
            className="kdo-loader__chain"
          />
          <span className="kdo-loader__count">
            {copy.chapterCountSuffix(Number(progress.completedChapters || 0))} / {copy.chapterCountSuffix(Number(progress.totalChapters || 15))}
          </span>
          <button type="button" className="kdo-loader__retry" onClick={() => void continueGeneration()} disabled={continuing}>
            {continuing ? <Loader2 size={17} className="kdai-spin" /> : <RefreshCw size={17} />}
            <span>{continuing ? copy.loaderContinuing : copy.loaderRetry}</span>
          </button>
          {error && <p className="kdai-inline-error">{error}</p>}
        </ObservatoryLoader>
      )}

      {isCompleted && report && (
        <div className="kdo-observatory">
          <aside className={`kdai-toc ${tocOpen ? "is-open" : ""}`}>
            <div className="kdai-toc__head">
              <strong>{copy.tocHead}</strong>
              <span className="kdai-toc__count">{copy.chapterCountSuffix(chapters.length)}</span>
              <button type="button" onClick={() => setTocOpen(false)} aria-label={copy.tocCloseAriaLabel}><X size={17} /></button>
            </div>
            <SectionTabs tabs={sectionTabs} activeId={activeSectionId} progress={readProgress} variant="rail" />
            <nav className="kdai-toc__rail">
              {chapters.map((chapter) => {
                const active = activeChapterId === chapter.id;
                return (
                  <a
                    key={chapter.id}
                    href={`#${chapter.id}`}
                    className={active ? "is-active" : ""}
                    aria-current={active ? "true" : undefined}
                    onClick={() => setTocOpen(false)}
                  >
                    <span className="kdai-toc__bead" aria-hidden="true" />
                    <span className="kdai-toc__order">{String(chapter.order).padStart(2, "0")}</span>
                    <span className="kdai-toc__title">{chapter.title}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          <section id="karma-premium-report" className="kdai-report" data-kdai-exporting={exporting ? "true" : undefined}>
            <Starfield />

            <header className="kdai-report-hero kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
              <Link href="/karma-destiny-ai" className="kdai-back"><ArrowLeft size={17} /> {copy.backToView}</Link>
              <ConstellationMark unravel={1} className="kdo-hero__mark" />
              <span>{copy.brandName} · Karma Destiny AI</span>
              <h1>{userName} · {copy.tabMap}</h1>
              <p>{result?.userInput?.topic || copy.defaultTopic} · {formatDate(result?.generatedAt, getCurrentLoadingLocale())}</p>
              <div className="kdai-report-actions">
                <button type="button" onClick={() => setTocOpen(true)}><Menu size={17} /> {copy.tocButton}</button>
                <button type="button" onClick={() => void copyAll()}><Copy size={17} /> {copy.copyAllButton}</button>
                <button type="button" onClick={handleDownload} disabled={downloading}>
                  {downloading ? <Loader2 size={17} className="kdai-spin" /> : <Download size={17} />}
                  {copy.pdfSaveButton}
                </button>
              </div>
            </header>

            {/* ① 운명의 핵심 문장 */}
            <section id="kdo-core" data-kdai-spy="section" data-kdo-reveal className="kdo-core kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
              <span className="kdo-kicker">{copy.coreKicker}</span>
              <p className="kdo-core__line">{report.heroSentence}</p>
              <div className="kdo-core__meta">
                <span><ObservatoryLogIcon className="kdo-core__icon" /> {Number(result?.totalCharCount || 0).toLocaleString("ko-KR")}{copy.charCountSuffix}</span>
                <span><NorthStarIcon className="kdo-core__icon" /> {copy.chapterCountSuffix(chapters.length)}</span>
                <span className="kdo-core__keywords">{keywords.map((keyword) => <em key={keyword}>{keyword}</em>)}</span>
              </div>
            </section>

            {/* ② 영역별 에너지 강도 */}
            {report.energyScores.length > 0 && (
              <section id="kdo-score" data-kdai-spy="section" data-kdo-reveal className="kdo-energy kdo-pane" data-kdai-pdf-page>
                <span className="kdo-kicker">{copy.energyKicker}</span>
                <h2>{copy.energyHeading}</h2>
                <ul className="kdo-energy__list">
                  {report.energyScores.map((score) => (
                    <li key={score.domain}>
                      <div className="kdo-energy__head">
                        <strong>{score.label}</strong>
                        <span>{score.value}</span>
                      </div>
                      <span className="kdo-energy__track">
                        <span className="kdo-energy__fill" style={{ transform: `scaleX(${Math.max(0, Math.min(100, score.value)) / 100})` }} />
                      </span>
                      {score.basis && <p>{score.basis}</p>}
                    </li>
                  ))}
                </ul>
                <p className="kdo-energy__note">{copy.energyNote}</p>
              </section>
            )}

            {/* ③ AI 종합 결론 + 관점 기여도 */}
            {report.synthesis && (
              <section id="kdo-synthesis" data-kdai-spy="section" data-kdo-reveal className="kdo-synthesis kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
                <span className="kdo-kicker">{copy.synthesisKicker}</span>
                <h2>{report.synthesis.title}</h2>
                <div className="kdo-synthesis__body">
                  <div className="kdo-synthesis__prose">
                    {report.synthesis.highlightQuotes?.[0] && (
                      <blockquote className="kdo-quote">{report.synthesis.highlightQuotes[0]}</blockquote>
                    )}
                    <AiResultProse
                      value={report.synthesis.content}
                      highlight={report.synthesis.highlightQuotes}
                      className="kdo-prose"
                    />
                  </div>
                  {report.radar.kind !== "none" && (
                    <div className="kdo-synthesis__radar">
                      <LensRadar model={report.radar} forceTable={exporting} />
                    </div>
                  )}
                </div>
                <EvidenceDisclosure
                  evidence={report.synthesis.evidence || []}
                  open={exporting || openEvidence.has(report.synthesis.id)}
                  onToggle={(open) => toggleEvidence(report.synthesis!.id, open)}
                />
              </section>
            )}

            {/* ④ 운명 지도 */}
            {report.timeline.length > 0 && (
              <section id="kdo-map" data-kdai-spy="section" data-kdo-reveal className="kdo-map kdo-pane" data-kdai-pdf-page>
                <span className="kdo-kicker">{copy.mapKicker}</span>
                <h2>{copy.mapHeading}</h2>
                <ol className="kdo-map__list">
                  {report.timeline.map((node) => (
                    <li key={node.id}>
                      <span className="kdo-map__dot" aria-hidden="true" />
                      <div>
                        <strong>{node.label}</strong>
                        <p>{node.detail}</p>
                        <span className="kdo-map__source">{node.source}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ⑤ 카테고리별 카드 */}
            <section id="kdo-cards" data-kdai-spy="section" className="kdo-deck">
              <div className="kdo-deck__head" data-kdai-pdf-page>
                <div>
                  <span className="kdo-kicker">{copy.cardsKicker}</span>
                  <h2>{copy.cardsHeading(report.categories.length)}</h2>
                </div>
                <div className="kdo-density" role="group" aria-label={copy.densityGroupAriaLabel}>
                  <button type="button" aria-pressed={density === "full"} onClick={() => changeDensity("full")}>{copy.densityFull}</button>
                  <button type="button" aria-pressed={density === "summary"} onClick={() => changeDensity("summary")}>{copy.densitySummary}</button>
                </div>
              </div>

              <ol className="kdo-deck__toc" data-kdai-pdf-page>
                {chapters.map((chapter) => <li key={chapter.id}>{copy.tocChapterEntry(chapter.order, chapter.title)}</li>)}
              </ol>

              {report.categories.map((chapter, index) => {
                const open = openChapters.has(chapter.id);
                const expanded = expandedBodies.has(chapter.id);
                const longBody = (chapter.content || "").length > 360;
                const clamp = longBody && !expanded && !exporting && !summaryMode;
                const lensLabel = chapter.leadLens && chapter.leadLens !== "none" && chapter.leadLens !== "cross"
                  ? chapter.leadLens
                  : "";
                return (
                  <Fragment key={chapter.id}>
                    {index > 0 && <SectionDivider />}
                    <article
                      id={chapter.id}
                      data-kdai-spy="chapter"
                      data-kdo-reveal
                      className={`kdai-chapter kdo-pane ${open ? "is-open" : ""}`.trim()}
                      data-kdai-pdf-page
                    >
                      <button type="button" className="kdai-chapter__head" onClick={() => toggleChapter(chapter.id)} aria-expanded={open}>
                        <span className="kdai-chapter__num">{chapter.symbol || String(chapter.order).padStart(2, "0")}</span>
                        <h2>{chapter.title}</h2>
                        {lensLabel && <span className="kdo-lens-badge">{lensLabel}</span>}
                        {open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                      </button>
                      {open && (
                        <div className="kdai-chapter__body">
                          {chapter.highlightQuotes?.[0] && (
                            <blockquote className="kdo-quote">{chapter.highlightQuotes[0]}</blockquote>
                          )}
                          {!summaryMode && (
                            <>
                              <div className={`kdai-chapter__prose ${clamp ? "is-clamped" : ""}`.trim()}>
                                <AiResultProse
                                  value={chapter.content}
                                  highlight={chapter.highlightQuotes}
                                  className="kdo-prose"
                                />
                              </div>
                              {longBody && (
                                <button type="button" className="kdai-more-toggle" onClick={() => toggleBody(chapter.id)} aria-expanded={expanded}>
                                  <span>{expanded ? copy.readMoreCollapse : copy.readMoreExpand}</span>
                                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              )}
                            </>
                          )}
                          {summaryMode && chapter.summary && <p className="kdo-summary-line">{chapter.summary}</p>}
                          <div className="kdai-core-box">
                            <div className="kdai-core-box__head">
                              <NorthStarIcon className="kdai-core-box__icon" />
                              <strong>{copy.thisChapterKeyHeading}</strong>
                            </div>
                            {(chapter.keyTakeaways || []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                          </div>
                          <EvidenceDisclosure
                            evidence={chapter.evidence || []}
                            open={exporting || openEvidence.has(chapter.id)}
                            onToggle={(value) => toggleEvidence(chapter.id, value)}
                          />
                          <button type="button" className="kdai-copy-chapter" onClick={() => void copyText(buildChapterText(chapter), copy.copiedChapter(chapter.order))}>
                            <Copy size={16} /> {copy.copyChapterButton}
                          </button>
                        </div>
                      )}
                    </article>
                  </Fragment>
                );
              })}
            </section>

            {/* ⑥ 행동 전략 + 최종 편지 */}
            {(report.actionItems.length > 0 || report.letter) && (
              <section id="kdo-action" data-kdai-spy="section" data-kdo-reveal className="kdo-action kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
                <span className="kdo-kicker">{copy.actionKicker}</span>
                <h2>{copy.actionHeading}</h2>
                {report.actionItems.length > 0 && (
                  <ul className="kdo-action__list">
                    {report.actionItems.map((item) => (
                      <li key={item}><OrreryIcon className="kdo-action__icon" /><span>{item}</span></li>
                    ))}
                  </ul>
                )}
                {report.letter && (
                  <div className="kdo-letter">
                    <span className="kdo-kicker">{report.letter.title}</span>
                    <AiResultProse value={report.letter.content} className="kdo-prose" />
                  </div>
                )}
              </section>
            )}

            {/* ⑦ 오늘 기억해야 할 한 문장 */}
            {todayLine && (
              <section id="kdo-today" data-kdai-spy="section" data-kdo-reveal className="kdo-today kdo-pane" data-kdai-pdf-page>
                <span className="kdo-kicker">{copy.todayKicker}</span>
                <p className="kdo-today__line">{todayLine}</p>
                {report.keyLines.length > 1 && (
                  <details className="kdo-today__more">
                    <summary>{copy.todayShowAllSummary}</summary>
                    <ul>
                      {report.keyLines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </details>
                )}
              </section>
            )}

            <footer className="kdai-disclaimer" data-kdai-pdf-page>
              {copy.disclaimer}
            </footer>
          </section>

          <SectionTabs tabs={sectionTabs} activeId={activeSectionId} progress={readProgress} variant="mobile" />
        </div>
      )}

      {!isGenerating && !isCompleted && (
        <section className="kdai-error-state">
          <p>{error || result?.message || copy.reportIncomplete}</p>
          <Link href="/karma-destiny-ai"><ArrowLeft size={17} /> {copy.retryInput}</Link>
        </section>
      )}

      <ResultStyles />
    </main>
  );
}

function KarmaDestinySuspenseFallback() {
  const copy = useKarmaResultCopy();
  return (
    <main className="kdai-result-page">
      <div className="kdai-pending">
        <Loader2 className="kdai-spin" size={28} />
        <p>{copy.loadingRecord}</p>
      </div>
      <ResultStyles />
    </main>
  );
}

export default function KarmaDestinyAiResultClient() {
  return (
    <Suspense fallback={<KarmaDestinySuspenseFallback />}>
      <KarmaDestinyResultInner />
    </Suspense>
  );
}
