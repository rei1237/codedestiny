"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock,
  Compass,
  Flame,
  Heart,
  ListChecks,
  Loader2,
  Mail,
  Moon,
  RefreshCw,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
} from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";
import { withCharacterBreaks, yeoniBreaks } from "@/components/fortune/result-character-breaks";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { readDevPreviewState, buildDevPreviewResponse } from "@/lib/dev-preview/core";
import { buildLoveSecretPreviewPayload } from "@/lib/dev-preview/fixtures/love-secret";
import theme from "../love-secret-theme.module.css";
import styles from "./LoveSecretAiResultClient.module.css";
import LoveSecretChecklist, { type ActionSecret } from "./LoveSecretChecklist";
import LoveSecretShareCard from "./LoveSecretShareCard";
import { groupLoveSections, type LoveCardVariant, type LoveSectionGroup } from "./love-secret-sections";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

type LoveSecretResultCopy = {
  genResultTimeoutError: string;
  loadResultFailedError: string;
  myNameFallback: string;
  partnerNameFallback: string;
  summaryTitleFallback: (name: string) => string;
  oneLineFallback: string;
  pdfSaveError: string;
  shareImageError: string;
  backToInputAria: string;
  retryConsultLabel: string;
  shareCardAria: string;
  shareCardDrawing: string;
  shareCardCta: string;
  openingReportHeading: string;
  loadingSavedHeading: string;
  loadingHint: string;
  resultUnavailableHeading: string;
  retryCheckLabel: string;
  topicFallback: string;
  chapterFallback: (n: number) => string;
  todayStrategySubtitle: string;
  keywordsAria: string;
  userQuestionHeading: string;
  deepAnalysisHeading: string;
  tocAria: string;
  deckLabel: string;
  finalWordLabel: string;
  yeoniSignature: string;
  newQuestionLabel: string;
  collapseLabel: string;
  expandLabel: string;
  partnerRoleLabel: string;
  sajuBasicsHeading: string;
  compatibilityFlowLabel: string;
  noonBasisNote: string;
  pdfPreparing: string;
  pdfSaveCta: string;
};

const LOVE_SECRET_RESULT_EN: LoveSecretResultCopy = {
  genResultTimeoutError: "The reading is taking longer than expected. Please try again shortly.",
  loadResultFailedError: "Couldn't load your saved reading.",
  myNameFallback: "Me",
  partnerNameFallback: "Partner",
  summaryTitleFallback: (name) => `${name}'s Love Strategy`,
  oneLineFallback: "We've calmly read the current temperature of your relationship.",
  pdfSaveError: "Couldn't save the reading as a PDF. Please try again shortly.",
  shareImageError: "Couldn't create the share image. Please try again shortly.",
  backToInputAria: "Back to the input screen",
  retryConsultLabel: "Start a new reading",
  shareCardAria: "Save or share the summary card as an image",
  shareCardDrawing: "Drawing the card",
  shareCardCta: "Share the card",
  openingReportHeading: "Opening your reading report",
  loadingSavedHeading: "Loading your saved reading",
  loadingHint: "Keep this window open while we settle the mood of your relationship.",
  resultUnavailableHeading: "The result couldn't be opened",
  retryCheckLabel: "Check again",
  topicFallback: "Overall love flow",
  chapterFallback: (n) => `Chapter ${n}`,
  todayStrategySubtitle: "Today's most important love strategy",
  keywordsAria: "Key keywords",
  userQuestionHeading: "Your Question",
  deepAnalysisHeading: "Detailed Love Strategy Analysis",
  tocAria: "Reading table of contents",
  deckLabel: "Love Strategy Reading",
  finalWordLabel: "💌 One Last Word",
  yeoniSignature: "With love, Yeoni",
  newQuestionLabel: "Ask a new question",
  collapseLabel: "Collapse",
  expandLabel: "Expand",
  partnerRoleLabel: "Partner",
  sajuBasicsHeading: "Love Chart Basics",
  compatibilityFlowLabel: "Compatibility Flow",
  noonBasisNote: "For charts missing a birth time, we carefully read the flow using noon as the baseline.",
  pdfPreparing: "Preparing the PDF",
  pdfSaveCta: "Save as PDF",
};

const LOVE_SECRET_RESULT_COPY: Partial<Record<LoadingLocale, LoveSecretResultCopy>> = {
  ko: {
    genResultTimeoutError: "상담 결과 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    loadResultFailedError: "저장된 상담 결과를 불러오지 못했습니다.",
    myNameFallback: "나",
    partnerNameFallback: "상대방",
    summaryTitleFallback: (name) => `${name}님의 연애 비책`,
    oneLineFallback: "지금의 관계 온도를 차분히 읽었습니다.",
    pdfSaveError: "상담 리포트를 PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    shareImageError: "공유 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    backToInputAria: "입력 화면으로 돌아가기",
    retryConsultLabel: "다시 상담하기",
    shareCardAria: "요약 카드를 이미지로 저장하거나 공유",
    shareCardDrawing: "카드를 그리는 중",
    shareCardCta: "카드 공유하기",
    openingReportHeading: "상담 리포트를 여는 중입니다",
    loadingSavedHeading: "저장된 상담 결과를 불러오고 있습니다",
    loadingHint: "마음의 온도를 정리하는 동안 이 창을 열어 두세요.",
    resultUnavailableHeading: "결과를 열 수 없습니다",
    retryCheckLabel: "다시 확인하기",
    topicFallback: "전체 연애 흐름",
    chapterFallback: (n) => `${n}장`,
    todayStrategySubtitle: "오늘 가장 중요한 연애 전략입니다",
    keywordsAria: "핵심 키워드",
    userQuestionHeading: "상담 질문",
    deepAnalysisHeading: "연애 비책 상세 분석",
    tocAria: "상담 결과 목차",
    deckLabel: "연애 비책 상담 결과",
    finalWordLabel: "💌 마지막 한마디",
    yeoniSignature: "연이 드림",
    newQuestionLabel: "새로운 질문으로 다시 상담하기",
    collapseLabel: "접기",
    expandLabel: "펼치기",
    partnerRoleLabel: "상대",
    sajuBasicsHeading: "연애 명식 기초",
    compatibilityFlowLabel: "궁합 흐름",
    noonBasisNote: "출생 시간이 비어 있는 명식은 정오 기준의 흐름으로 조심스럽게 읽었습니다.",
    pdfPreparing: "PDF를 정리하고 있습니다",
    pdfSaveCta: "PDF로 저장하기",
  },
  en: LOVE_SECRET_RESULT_EN,
  ja: {
    genResultTimeoutError: "鑑定結果の生成に時間がかかっています。しばらくしてからもう一度お試しください。",
    loadResultFailedError: "保存された鑑定結果を読み込めませんでした。",
    myNameFallback: "私",
    partnerNameFallback: "相手",
    summaryTitleFallback: (name) => `${name}さんの恋愛秘策`,
    oneLineFallback: "今の関係の温度を静かに読み取りました。",
    pdfSaveError: "鑑定レポートをPDFとして保存できませんでした。しばらくしてからもう一度お試しください。",
    shareImageError: "共有用の画像を作成できませんでした。しばらくしてからもう一度お試しください。",
    backToInputAria: "入力画面に戻る",
    retryConsultLabel: "もう一度相談する",
    shareCardAria: "要約カードを画像として保存または共有",
    shareCardDrawing: "カードを作成中",
    shareCardCta: "カードを共有する",
    openingReportHeading: "鑑定レポートを開いています",
    loadingSavedHeading: "保存された鑑定結果を読み込んでいます",
    loadingHint: "気持ちの温度を整理する間、この画面を開いたままにしておいてください。",
    resultUnavailableHeading: "結果を開けませんでした",
    retryCheckLabel: "もう一度確認する",
    topicFallback: "恋愛全体の流れ",
    chapterFallback: (n) => `第${n}章`,
    todayStrategySubtitle: "今日最も重要な恋愛戦略です",
    keywordsAria: "キーワード",
    userQuestionHeading: "相談内容",
    deepAnalysisHeading: "恋愛秘策の詳細分析",
    tocAria: "鑑定結果の目次",
    deckLabel: "恋愛秘策 鑑定結果",
    finalWordLabel: "💌 最後のひとこと",
    yeoniSignature: "ヨニより",
    newQuestionLabel: "新しい質問でもう一度相談する",
    collapseLabel: "閉じる",
    expandLabel: "開く",
    partnerRoleLabel: "相手",
    sajuBasicsHeading: "恋愛命式の基礎",
    compatibilityFlowLabel: "相性の流れ",
    noonBasisNote: "出生時刻が不明な命式は、正午を基準にした流れとして慎重に読み取りました。",
    pdfPreparing: "PDFを準備しています",
    pdfSaveCta: "PDFとして保存",
  },
  "zh-CN": {
    genResultTimeoutError: "咨询结果生成较慢，请稍后重试。",
    loadResultFailedError: "无法加载已保存的咨询结果。",
    myNameFallback: "我",
    partnerNameFallback: "对方",
    summaryTitleFallback: (name) => `${name}的恋爱秘诀`,
    oneLineFallback: "已冷静地解读了当前关系的温度。",
    pdfSaveError: "无法将咨询报告保存为PDF，请稍后重试。",
    shareImageError: "无法生成分享图片，请稍后重试。",
    backToInputAria: "返回输入界面",
    retryConsultLabel: "重新咨询",
    shareCardAria: "将摘要卡保存为图片或分享",
    shareCardDrawing: "正在生成卡片",
    shareCardCta: "分享卡片",
    openingReportHeading: "正在打开咨询报告",
    loadingSavedHeading: "正在加载已保存的咨询结果",
    loadingHint: "在整理感情温度期间，请保持此窗口打开。",
    resultUnavailableHeading: "无法打开结果",
    retryCheckLabel: "重新确认",
    topicFallback: "整体恋爱运势",
    chapterFallback: (n) => `第${n}章`,
    todayStrategySubtitle: "今天最重要的恋爱策略",
    keywordsAria: "核心关键词",
    userQuestionHeading: "咨询问题",
    deepAnalysisHeading: "恋爱秘诀详细分析",
    tocAria: "咨询结果目录",
    deckLabel: "恋爱秘诀咨询结果",
    finalWordLabel: "💌 最后一句话",
    yeoniSignature: "妍伊 敬上",
    newQuestionLabel: "用新问题重新咨询",
    collapseLabel: "收起",
    expandLabel: "展开",
    partnerRoleLabel: "对方",
    sajuBasicsHeading: "恋爱命盘基础",
    compatibilityFlowLabel: "缘分契合走势",
    noonBasisNote: "出生时间缺失的命盘，已谨慎地以正午为基准解读其走势。",
    pdfPreparing: "正在整理PDF",
    pdfSaveCta: "保存为PDF",
  },
  "zh-TW": {
    genResultTimeoutError: "諮詢結果生成較慢，請稍後重試。",
    loadResultFailedError: "無法載入已儲存的諮詢結果。",
    myNameFallback: "我",
    partnerNameFallback: "對方",
    summaryTitleFallback: (name) => `${name}的戀愛秘訣`,
    oneLineFallback: "已冷靜地解讀了目前關係的溫度。",
    pdfSaveError: "無法將諮詢報告儲存為PDF，請稍後重試。",
    shareImageError: "無法產生分享圖片，請稍後重試。",
    backToInputAria: "返回輸入畫面",
    retryConsultLabel: "重新諮詢",
    shareCardAria: "將摘要卡儲存為圖片或分享",
    shareCardDrawing: "正在產生卡片",
    shareCardCta: "分享卡片",
    openingReportHeading: "正在開啟諮詢報告",
    loadingSavedHeading: "正在載入已儲存的諮詢結果",
    loadingHint: "在整理感情溫度期間，請保持此視窗開啟。",
    resultUnavailableHeading: "無法開啟結果",
    retryCheckLabel: "重新確認",
    topicFallback: "整體戀愛運勢",
    chapterFallback: (n) => `第${n}章`,
    todayStrategySubtitle: "今天最重要的戀愛策略",
    keywordsAria: "核心關鍵字",
    userQuestionHeading: "諮詢問題",
    deepAnalysisHeading: "戀愛秘訣詳細分析",
    tocAria: "諮詢結果目錄",
    deckLabel: "戀愛秘訣諮詢結果",
    finalWordLabel: "💌 最後一句話",
    yeoniSignature: "妍伊 敬上",
    newQuestionLabel: "用新問題重新諮詢",
    collapseLabel: "收合",
    expandLabel: "展開",
    partnerRoleLabel: "對方",
    sajuBasicsHeading: "戀愛命盤基礎",
    compatibilityFlowLabel: "緣分契合走勢",
    noonBasisNote: "出生時間缺失的命盤，已謹慎地以正午為基準解讀其走勢。",
    pdfPreparing: "正在整理PDF",
    pdfSaveCta: "儲存為PDF",
  },
  vi: {
    genResultTimeoutError: "Kết quả tư vấn đang được tạo hơi lâu. Vui lòng thử lại sau.",
    loadResultFailedError: "Không thể tải kết quả tư vấn đã lưu.",
    myNameFallback: "Tôi",
    partnerNameFallback: "Đối phương",
    summaryTitleFallback: (name) => `Bí quyết tình yêu của ${name}`,
    oneLineFallback: "Đã đọc một cách bình tĩnh nhiệt độ hiện tại của mối quan hệ.",
    pdfSaveError: "Không thể lưu báo cáo tư vấn dưới dạng PDF. Vui lòng thử lại sau.",
    shareImageError: "Không thể tạo ảnh chia sẻ. Vui lòng thử lại sau.",
    backToInputAria: "Quay lại màn hình nhập",
    retryConsultLabel: "Tư vấn lại",
    shareCardAria: "Lưu hoặc chia sẻ thẻ tóm tắt dưới dạng hình ảnh",
    shareCardDrawing: "Đang vẽ thẻ",
    shareCardCta: "Chia sẻ thẻ",
    openingReportHeading: "Đang mở báo cáo tư vấn",
    loadingSavedHeading: "Đang tải kết quả tư vấn đã lưu",
    loadingHint: "Hãy giữ cửa sổ này mở trong khi chúng tôi sắp xếp nhiệt độ tình cảm của bạn.",
    resultUnavailableHeading: "Không thể mở kết quả",
    retryCheckLabel: "Kiểm tra lại",
    topicFallback: "Dòng chảy tình yêu tổng thể",
    chapterFallback: (n) => `Chương ${n}`,
    todayStrategySubtitle: "Chiến lược tình yêu quan trọng nhất hôm nay",
    keywordsAria: "Từ khóa chính",
    userQuestionHeading: "Câu hỏi tư vấn",
    deepAnalysisHeading: "Phân tích chi tiết bí quyết tình yêu",
    tocAria: "Mục lục kết quả tư vấn",
    deckLabel: "Kết quả tư vấn bí quyết tình yêu",
    finalWordLabel: "💌 Lời cuối cùng",
    yeoniSignature: "Thân mến, Yeoni",
    newQuestionLabel: "Tư vấn lại với câu hỏi mới",
    collapseLabel: "Thu gọn",
    expandLabel: "Mở rộng",
    partnerRoleLabel: "Đối phương",
    sajuBasicsHeading: "Cơ bản về lá số tình yêu",
    compatibilityFlowLabel: "Dòng chảy hợp duyên",
    noonBasisNote: "Với lá số thiếu giờ sinh, chúng tôi đã cẩn thận đọc dòng chảy lấy giữa trưa làm chuẩn.",
    pdfPreparing: "Đang chuẩn bị PDF",
    pdfSaveCta: "Lưu dưới dạng PDF",
  },
  hi: {
    genResultTimeoutError: "परामर्श परिणाम बनने में थोड़ा समय लग रहा है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    loadResultFailedError: "सहेजे गए परामर्श परिणाम लोड नहीं हो सके।",
    myNameFallback: "मैं",
    partnerNameFallback: "साथी",
    summaryTitleFallback: (name) => `${name} की प्रेम रणनीति`,
    oneLineFallback: "हमने आपके रिश्ते के मौजूदा तापमान को शांति से पढ़ा है।",
    pdfSaveError: "परामर्श रिपोर्ट को PDF के रूप में सहेजा नहीं जा सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    shareImageError: "साझा करने के लिए छवि नहीं बनाई जा सकी। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    backToInputAria: "इनपुट स्क्रीन पर वापस जाएं",
    retryConsultLabel: "फिर से परामर्श करें",
    shareCardAria: "सारांश कार्ड को छवि के रूप में सहेजें या साझा करें",
    shareCardDrawing: "कार्ड बनाया जा रहा है",
    shareCardCta: "कार्ड साझा करें",
    openingReportHeading: "परामर्श रिपोर्ट खोली जा रही है",
    loadingSavedHeading: "सहेजे गए परामर्श परिणाम लोड हो रहे हैं",
    loadingHint: "जब तक हम आपके रिश्ते का माहौल व्यवस्थित करते हैं, कृपया यह विंडो खुली रखें।",
    resultUnavailableHeading: "परिणाम नहीं खोला जा सका",
    retryCheckLabel: "फिर से जाँचें",
    topicFallback: "समग्र प्रेम प्रवाह",
    chapterFallback: (n) => `अध्याय ${n}`,
    todayStrategySubtitle: "आज की सबसे महत्वपूर्ण प्रेम रणनीति",
    keywordsAria: "मुख्य कीवर्ड",
    userQuestionHeading: "परामर्श प्रश्न",
    deepAnalysisHeading: "प्रेम रणनीति का विस्तृत विश्लेषण",
    tocAria: "परामर्श परिणाम की विषय-सूची",
    deckLabel: "प्रेम रणनीति परामर्श परिणाम",
    finalWordLabel: "💌 आखिरी बात",
    yeoniSignature: "स्नेह सहित, योनी",
    newQuestionLabel: "नए प्रश्न के साथ फिर से परामर्श करें",
    collapseLabel: "समेटें",
    expandLabel: "विस्तृत करें",
    partnerRoleLabel: "साथी",
    sajuBasicsHeading: "प्रेम कुंडली की मूल बातें",
    compatibilityFlowLabel: "अनुकूलता प्रवाह",
    noonBasisNote: "जिन कुंडलियों में जन्म समय उपलब्ध नहीं है, उन्हें सावधानीपूर्वक दोपहर को आधार मानकर पढ़ा गया है।",
    pdfPreparing: "PDF तैयार किया जा रहा है",
    pdfSaveCta: "PDF के रूप में सहेजें",
  },
  es: {
    genResultTimeoutError: "La lectura está tardando más de lo esperado. Inténtalo de nuevo en unos momentos.",
    loadResultFailedError: "No se pudo cargar tu lectura guardada.",
    myNameFallback: "Yo",
    partnerNameFallback: "Pareja",
    summaryTitleFallback: (name) => `La estrategia amorosa de ${name}`,
    oneLineFallback: "Hemos leído con calma la temperatura actual de tu relación.",
    pdfSaveError: "No se pudo guardar el informe como PDF. Inténtalo de nuevo en unos momentos.",
    shareImageError: "No se pudo crear la imagen para compartir. Inténtalo de nuevo en unos momentos.",
    backToInputAria: "Volver a la pantalla de entrada",
    retryConsultLabel: "Iniciar una nueva consulta",
    shareCardAria: "Guardar o compartir la tarjeta resumen como imagen",
    shareCardDrawing: "Dibujando la tarjeta",
    shareCardCta: "Compartir la tarjeta",
    openingReportHeading: "Abriendo tu informe de lectura",
    loadingSavedHeading: "Cargando tu lectura guardada",
    loadingHint: "Mantén esta ventana abierta mientras organizamos el ambiente de tu relación.",
    resultUnavailableHeading: "No se pudo abrir el resultado",
    retryCheckLabel: "Verificar de nuevo",
    topicFallback: "Flujo amoroso general",
    chapterFallback: (n) => `Capítulo ${n}`,
    todayStrategySubtitle: "La estrategia amorosa más importante de hoy",
    keywordsAria: "Palabras clave",
    userQuestionHeading: "Tu pregunta",
    deepAnalysisHeading: "Análisis detallado de la estrategia amorosa",
    tocAria: "Índice del resultado de la consulta",
    deckLabel: "Resultado de la consulta de estrategia amorosa",
    finalWordLabel: "💌 Una última palabra",
    yeoniSignature: "Con cariño, Yeoni",
    newQuestionLabel: "Consultar de nuevo con una pregunta nueva",
    collapseLabel: "Contraer",
    expandLabel: "Expandir",
    partnerRoleLabel: "Pareja",
    sajuBasicsHeading: "Fundamentos de tu carta amorosa",
    compatibilityFlowLabel: "Flujo de compatibilidad",
    noonBasisNote: "Para las cartas sin hora de nacimiento, hemos leído el flujo con cuidado usando el mediodía como referencia.",
    pdfPreparing: "Preparando el PDF",
    pdfSaveCta: "Guardar como PDF",
  },
  fr: {
    genResultTimeoutError: "La lecture met plus de temps que prévu. Veuillez réessayer dans un instant.",
    loadResultFailedError: "Impossible de charger votre lecture enregistrée.",
    myNameFallback: "Moi",
    partnerNameFallback: "Partenaire",
    summaryTitleFallback: (name) => `La stratégie amoureuse de ${name}`,
    oneLineFallback: "Nous avons lu calmement la température actuelle de votre relation.",
    pdfSaveError: "Impossible d'enregistrer le rapport en PDF. Veuillez réessayer dans un instant.",
    shareImageError: "Impossible de créer l'image à partager. Veuillez réessayer dans un instant.",
    backToInputAria: "Retour à l'écran de saisie",
    retryConsultLabel: "Démarrer une nouvelle consultation",
    shareCardAria: "Enregistrer ou partager la carte résumé en image",
    shareCardDrawing: "Création de la carte en cours",
    shareCardCta: "Partager la carte",
    openingReportHeading: "Ouverture de votre rapport de lecture",
    loadingSavedHeading: "Chargement de votre lecture enregistrée",
    loadingHint: "Laissez cette fenêtre ouverte pendant que nous analysons l'ambiance de votre relation.",
    resultUnavailableHeading: "Impossible d'ouvrir le résultat",
    retryCheckLabel: "Vérifier à nouveau",
    topicFallback: "Flux amoureux général",
    chapterFallback: (n) => `Chapitre ${n}`,
    todayStrategySubtitle: "La stratégie amoureuse la plus importante d'aujourd'hui",
    keywordsAria: "Mots-clés principaux",
    userQuestionHeading: "Votre question",
    deepAnalysisHeading: "Analyse détaillée de la stratégie amoureuse",
    tocAria: "Table des matières du résultat de la consultation",
    deckLabel: "Résultat de la consultation stratégie amoureuse",
    finalWordLabel: "💌 Un dernier mot",
    yeoniSignature: "Avec amour, Yeoni",
    newQuestionLabel: "Consulter à nouveau avec une nouvelle question",
    collapseLabel: "Réduire",
    expandLabel: "Développer",
    partnerRoleLabel: "Partenaire",
    sajuBasicsHeading: "Bases de votre thème amoureux",
    compatibilityFlowLabel: "Flux de compatibilité",
    noonBasisNote: "Pour les thèmes sans heure de naissance, nous avons lu le flux avec prudence en utilisant midi comme référence.",
    pdfPreparing: "Préparation du PDF",
    pdfSaveCta: "Enregistrer en PDF",
  },
  de: {
    genResultTimeoutError: "Die Erstellung der Lesung dauert länger als erwartet. Bitte versuchen Sie es später erneut.",
    loadResultFailedError: "Ihre gespeicherte Lesung konnte nicht geladen werden.",
    myNameFallback: "Ich",
    partnerNameFallback: "Partner",
    summaryTitleFallback: (name) => `${name}s Liebesstrategie`,
    oneLineFallback: "Wir haben die aktuelle Temperatur Ihrer Beziehung ruhig gelesen.",
    pdfSaveError: "Der Beratungsbericht konnte nicht als PDF gespeichert werden. Bitte versuchen Sie es später erneut.",
    shareImageError: "Das Freigabebild konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.",
    backToInputAria: "Zurück zum Eingabebildschirm",
    retryConsultLabel: "Neue Beratung starten",
    shareCardAria: "Zusammenfassungskarte als Bild speichern oder teilen",
    shareCardDrawing: "Karte wird erstellt",
    shareCardCta: "Karte teilen",
    openingReportHeading: "Ihr Lesungsbericht wird geöffnet",
    loadingSavedHeading: "Ihre gespeicherte Lesung wird geladen",
    loadingHint: "Lassen Sie dieses Fenster geöffnet, während wir die Stimmung Ihrer Beziehung ordnen.",
    resultUnavailableHeading: "Ergebnis konnte nicht geöffnet werden",
    retryCheckLabel: "Erneut prüfen",
    topicFallback: "Allgemeiner Liebesfluss",
    chapterFallback: (n) => `Kapitel ${n}`,
    todayStrategySubtitle: "Die wichtigste Liebesstrategie für heute",
    keywordsAria: "Schlüsselwörter",
    userQuestionHeading: "Ihre Frage",
    deepAnalysisHeading: "Detaillierte Analyse der Liebesstrategie",
    tocAria: "Inhaltsverzeichnis der Beratung",
    deckLabel: "Ergebnis der Liebesstrategie-Beratung",
    finalWordLabel: "💌 Ein letztes Wort",
    yeoniSignature: "Mit Liebe, Yeoni",
    newQuestionLabel: "Mit einer neuen Frage erneut beraten",
    collapseLabel: "Einklappen",
    expandLabel: "Ausklappen",
    partnerRoleLabel: "Partner",
    sajuBasicsHeading: "Grundlagen Ihres Liebeshoroskops",
    compatibilityFlowLabel: "Kompatibilitätsfluss",
    noonBasisNote: "Bei Horoskopen ohne Geburtszeit haben wir den Verlauf vorsichtig mit Mittag als Bezugspunkt gelesen.",
    pdfPreparing: "PDF wird vorbereitet",
    pdfSaveCta: "Als PDF speichern",
  },
  nl: {
    genResultTimeoutError: "Het genereren van de lezing duurt iets langer. Probeer het later opnieuw.",
    loadResultFailedError: "Je opgeslagen lezing kon niet worden geladen.",
    myNameFallback: "Ik",
    partnerNameFallback: "Partner",
    summaryTitleFallback: (name) => `${name}'s liefdesstrategie`,
    oneLineFallback: "We hebben de huidige temperatuur van je relatie rustig gelezen.",
    pdfSaveError: "Het rapport kon niet als PDF worden opgeslagen. Probeer het later opnieuw.",
    shareImageError: "De deelafbeelding kon niet worden gemaakt. Probeer het later opnieuw.",
    backToInputAria: "Terug naar het invoerscherm",
    retryConsultLabel: "Nieuw consult starten",
    shareCardAria: "Samenvattingskaart opslaan of delen als afbeelding",
    shareCardDrawing: "Kaart wordt getekend",
    shareCardCta: "Kaart delen",
    openingReportHeading: "Je leesrapport wordt geopend",
    loadingSavedHeading: "Je opgeslagen lezing wordt geladen",
    loadingHint: "Houd dit venster open terwijl we de sfeer van je relatie ordenen.",
    resultUnavailableHeading: "Resultaat kon niet worden geopend",
    retryCheckLabel: "Opnieuw controleren",
    topicFallback: "Algemene liefdesstroom",
    chapterFallback: (n) => `Hoofdstuk ${n}`,
    todayStrategySubtitle: "De belangrijkste liefdesstrategie van vandaag",
    keywordsAria: "Kernwoorden",
    userQuestionHeading: "Jouw vraag",
    deepAnalysisHeading: "Gedetailleerde analyse van de liefdesstrategie",
    tocAria: "Inhoudsopgave van het consultresultaat",
    deckLabel: "Resultaat liefdesstrategie-consult",
    finalWordLabel: "💌 Een laatste woord",
    yeoniSignature: "Met liefde, Yeoni",
    newQuestionLabel: "Opnieuw consulteren met een nieuwe vraag",
    collapseLabel: "Inklappen",
    expandLabel: "Uitklappen",
    partnerRoleLabel: "Partner",
    sajuBasicsHeading: "Basis van je liefdeshoroscoop",
    compatibilityFlowLabel: "Compatibiliteitsstroom",
    noonBasisNote: "Voor horoscopen zonder geboortetijd hebben we de stroom voorzichtig gelezen met het middaguur als uitgangspunt.",
    pdfPreparing: "PDF wordt voorbereid",
    pdfSaveCta: "Opslaan als PDF",
  },
  ms: {
    genResultTimeoutError: "Penjanaan hasil perundingan mengambil masa lebih lama. Sila cuba lagi sebentar lagi.",
    loadResultFailedError: "Tidak dapat memuatkan hasil perundingan yang disimpan.",
    myNameFallback: "Saya",
    partnerNameFallback: "Pasangan",
    summaryTitleFallback: (name) => `Strategi cinta ${name}`,
    oneLineFallback: "Kami telah membaca suhu semasa hubungan anda dengan tenang.",
    pdfSaveError: "Tidak dapat menyimpan laporan sebagai PDF. Sila cuba lagi sebentar lagi.",
    shareImageError: "Tidak dapat mencipta imej perkongsian. Sila cuba lagi sebentar lagi.",
    backToInputAria: "Kembali ke skrin input",
    retryConsultLabel: "Mulakan perundingan baharu",
    shareCardAria: "Simpan atau kongsi kad ringkasan sebagai imej",
    shareCardDrawing: "Sedang melukis kad",
    shareCardCta: "Kongsi kad",
    openingReportHeading: "Membuka laporan perundingan anda",
    loadingSavedHeading: "Memuatkan hasil perundingan yang disimpan",
    loadingHint: "Kekalkan tetingkap ini terbuka semasa kami menyusun suasana hubungan anda.",
    resultUnavailableHeading: "Hasil tidak dapat dibuka",
    retryCheckLabel: "Semak semula",
    topicFallback: "Aliran cinta keseluruhan",
    chapterFallback: (n) => `Bab ${n}`,
    todayStrategySubtitle: "Strategi cinta paling penting hari ini",
    keywordsAria: "Kata kunci utama",
    userQuestionHeading: "Soalan Perundingan",
    deepAnalysisHeading: "Analisis Terperinci Strategi Cinta",
    tocAria: "Kandungan hasil perundingan",
    deckLabel: "Hasil Perundingan Strategi Cinta",
    finalWordLabel: "💌 Kata Akhir",
    yeoniSignature: "Dengan kasih, Yeoni",
    newQuestionLabel: "Berunding semula dengan soalan baharu",
    collapseLabel: "Lipat",
    expandLabel: "Kembang",
    partnerRoleLabel: "Pasangan",
    sajuBasicsHeading: "Asas Carta Cinta",
    compatibilityFlowLabel: "Aliran Keserasian",
    noonBasisNote: "Bagi carta yang tiada masa lahir, alirannya dibaca dengan berhati-hati menggunakan tengah hari sebagai asas.",
    pdfPreparing: "Menyediakan PDF",
    pdfSaveCta: "Simpan sebagai PDF",
  },
};

function getLoveSecretResultCopy(locale: LoadingLocale): LoveSecretResultCopy {
  return LOVE_SECRET_RESULT_COPY[locale] || LOVE_SECRET_RESULT_EN;
}

function useLoveSecretResultCopy(): LoveSecretResultCopy {
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
  return getLoveSecretResultCopy(locale);
}

type PersonInfo = {
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: string;
};

type ResultSection = { title: string; body: string };
type Distribution = Record<string, number>;
type SajuChartSummary = {
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  dayMaster?: string;
  fiveElements?: Distribution;
  tenGods?: Distribution;
  lovePattern?: string;
  reference?: {
    dayElement?: string;
    dominantElement?: string;
    deficientElement?: string;
    dominantTenGod?: string;
    yongshinElement?: string;
    dayElementLabel?: string;
    dominantElementLabel?: string;
    deficientElementLabel?: string;
    yongshinElementLabel?: string;
    dayMasterLabel?: string;
  };
  strength?: string;
  gyeokguk?: string;
  shinsalLines?: string[];
  currentMajorLuck?: string;
};

type LoveCalendarDay = {
  date: string;
  weekday?: string;
  ganji?: string;
  ganjiKo?: string;
  grade?: string;
  score?: number;
  tags?: string[];
};
type SajuSummary = {
  myChart?: SajuChartSummary | null;
  partnerChart?: SajuChartSummary | null;
  compatibility?: {
    summary?: string;
    attractionPattern?: string;
    conflictPattern?: string;
    stability?: string;
  } | null;
  uncertainty?: string[];
  consultationMode?: string;
  calendar?: {
    rangeStart?: string;
    rangeEnd?: string;
    best: LoveCalendarDay[];
    caution?: Array<{ date: string; ganji?: string; tags?: string[] }>;
    monthlyFlow?: Array<{ monthLabel?: string; avgScore?: number; grade?: string }>;
  } | null;
};
type Consultation = {
  ok?: boolean;
  id?: string;
  sessionId?: string;
  attemptId?: string;
  requestId?: string;
  status?: string;
  accessType?: string;
  myInfo?: PersonInfo | null;
  partnerInfo?: PersonInfo | null;
  relationshipStatus?: string;
  topic?: string;
  userQuestion?: string;
  createdAt?: string;
  updatedAt?: string;
  keywords?: string[];
  strategy?: string;
  sections?: ResultSection[];
  finalLine?: string;
  reading?: {
    summaryTitle?: string;
    oneLineDiagnosis?: string;
    relationshipTemperature?: string;
    finalMessage?: string;
    actionSecrets?: string[];
    sevenDayGuide?: string[];
    thirtyDayFlow?: string;
    monthlyHighlights?: { best?: string[]; caution?: string[] };
    luckyDates?: Array<{ date?: string; ganji?: string; why?: string }>;
  } | null;
  pdfSections?: ResultSection[];
  sajuSummary?: SajuSummary | null;
  messages?: Array<{ role: "user" | "assistant"; content: string; createdAt?: string }>;
  message?: string;
  reason?: string;
};

// 서버가 sections 없이 messages 만 줬을 때 프로즈를 되살리는 제목 집합(worker 그룹 정의와 같은 순서).
const FALLBACK_SECTIONS = [
  "현재 관계의 자리와 질문의 핵심",
  "핵심 연애운 — 명식이 사랑에서 그리는 큰 결",
  "오행과 조후로 보는 감정의 온도",
  "나의 명식이 사랑에서 반복하는 방식",
  "십성으로 보는 애착과 표현 방식",
  "연애 장점 — 상대가 먼저 알아보는 힘",
  "연애 약점 — 반복해서 걸려 넘어지는 자리",
  "애정 표현 스타일과 연애 심리",
  "상대의 기운과 감정 거리감",
  "두 사람 사이 끌림이 살아나는 조건",
  "속궁합과 친밀감 리듬",
  "이상형 분석 — 내 명식이 끌리는 사람",
  "상대가 원하는 연애 스타일",
  "갈등의 뿌리와 회복 방식",
  "바람기와 마음이 흩어지는 조건",
  "재회 가능성과 그 조건",
  "피해야 할 선택과 자기 보호",
  "연락/고백/재회/관계 진전 타이밍",
  "올해 연애운 — 좋은 달과 조심할 달",
  "좋은 날짜 — 계산된 일진으로 고른 날",
  "결혼운과 인연이 굳어지는 시기",
  "30일 관계 흐름 처방",
  "썸에서 확신으로 가는 전략",
  "관계 단계별 실행 비책",
  "상대에게 다가가는 대화 문장",
  "매력적으로 보이는 방법 — 이미지·말투·스타일",
  "7일 실천 가이드",
  "마지막 상담사의 한마디",
];

// 카드 차별화는 variant → CSS 클래스 맵으로만 표현한다(JSX 분기 금지).
const VARIANT_CLASS: Record<LoveCardVariant, string> = {
  summary: styles.cardSummary,
  insight: styles.cardInsight,
  strategy: styles.cardStrategy,
  practice: styles.cardPractice,
  luck: styles.cardLuck,
  timing: styles.cardTiming,
  caution: styles.cardCaution,
  letter: styles.cardLetter,
};

function prefersDark() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function toText(value: unknown) {
  return toDisplayText(value);
}

// 난이도(=중요도·성공 가능성) → 하트 게이지 채움 개수
const IMPORTANCE_BY_DIFFICULTY: Record<string, number> = {
  낮음: 1,
  쉬움: 1,
  중간: 2,
  보통: 2,
  높음: 3,
  도전: 3,
};

// "[낮음·이번주] 행동 (근거: …)" 형식의 전략 문자열을 배지·행동·근거로 분해
// (난이도·타이밍 표기는 데이터마다 쉬움/보통/도전 또는 낮음/중간/높음, 오늘~분기내까지 폭넓게 등장한다)
function parseActionSecret(raw: string): ActionSecret {
  const text = toText(raw);
  const badgeMatch = text.match(/^\[\s*(쉬움|보통|도전|낮음|중간|높음)\s*[·,\s]\s*(오늘|이번\s*주|2\s*주\s*내|이번\s*달|다음\s*달|분기\s*내)\s*\]\s*/);
  const rest = badgeMatch ? text.slice(badgeMatch[0].length) : text;
  const evidenceMatch = rest.match(/\(근거\s*[:：]\s*([^)]+)\)\s*$/);
  const difficulty = badgeMatch?.[1] || "";
  return {
    difficulty,
    importance: IMPORTANCE_BY_DIFFICULTY[difficulty] || 0,
    timing: badgeMatch?.[2]?.replace(/\s+/g, "") || "",
    action: evidenceMatch ? rest.slice(0, evidenceMatch.index).trim() : rest,
    evidence: evidenceMatch?.[1]?.trim() || "",
  };
}

function keywordIcon(keyword: string) {
  const value = toText(keyword);
  if (/끌림|매력|호감|설렘|이끌/.test(value)) return Flame;
  if (/타이밍|시기|때|시간|흐름/.test(value)) return Clock;
  if (/진심|마음|신뢰|사랑|애정/.test(value)) return Sparkles;
  return Star;
}

function safeFilePart(value: string) {
  return (value || "love-secret-reading").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 80);
}

function formatDate(value?: string, locale: LoadingLocale = getCurrentLoadingLocale()) {
  const intlLocale = INTL_LOCALE_BY_LOADING_LOCALE[locale];
  if (!value) return new Date().toLocaleDateString(intlLocale);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString(intlLocale);
  return date.toLocaleDateString(intlLocale, { year: "numeric", month: "long", day: "numeric" });
}

function formatDistribution(value?: Distribution) {
  const entries = Object.entries(value || {}).filter(([, score]) => Number(score) > 0);
  if (!entries.length) return "확인된 균형 없음";
  return entries.map(([key, score]) => `${key} ${toText(score)}`).join(" · ");
}

function splitAssistantSections(content: string) {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }
  const headingMatches: RegExpExecArray[] = [];
  const headingPattern = /^(?:#{1,3}\s*)?(\d{1,2}[.)]\s*)?([^\n]{2,46})\n+/gm;
  let match = headingPattern.exec(normalized);
  while (match) {
    if (/관계|연애|궁합|오행|조후|십성|끌림|감정|친밀감|갈등|회복|대화|타이밍|비책|보호|가이드|처방|한마디|진단/.test(match[2] || "")) headingMatches.push(match);
    match = headingPattern.exec(normalized);
  }

  if (headingMatches.length >= 3) {
    return headingMatches.map((item, index) => {
      const start = item.index + item[0].length;
      const end = headingMatches[index + 1]?.index ?? normalized.length;
      return {
        title: item[2].replace(/\*\*/g, "").trim(),
        body: normalized.slice(start, end).trim(),
      };
    }).filter((section) => section.body);
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / FALLBACK_SECTIONS.length));
  return FALLBACK_SECTIONS.map((title, index) => ({
    title,
    body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n"),
  })).filter((section) => section.body);
}

function buildResultEndpoint() {
  const params = new URL(window.location.href).searchParams;
  const sessionId = toText(params.get("sessionId") || params.get("id"));
  if (sessionId) return `/api/love-secret-ai/result/${encodeURIComponent(sessionId)}`;
  const query = new URLSearchParams();
  ["requestId", "idempotencyKey", "attemptId"].forEach((key) => {
    const value = toText(params.get(key));
    if (value) query.set(key, value);
  });
  return `/api/love-secret-ai/result${query.toString() ? `?${query.toString()}` : ""}`;
}

export default function LoveSecretAiResultClient() {
  const copy = useLoveSecretResultCopy();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [viewAll, setViewAll] = usePagedViewerMode("loveSecretViewerModeV1");
  // export 여부의 단일 진리 소스. data-ls-export 와 expandForExport 가 같은 값을 본다.
  const [exportMode, setExportMode] = useState<"idle" | "pdf">("idle");
  const shareRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    let attempts = 0;
    // 생성은 요청 안에서 끝나지만(최대 ~90초) 네트워크·재시도 여지를 두고 상한을 넉넉히 잡는다.
    // 2.5s 간격이라 CF rate-limit(10초당 100회)에는 여유가 크다.
    const maxAttempts = 140;
    async function loadResult() {
      setLoading(true);
      setError("");
      try {
        const previewState = readDevPreviewState();
        const response = previewState
          ? buildDevPreviewResponse(buildLoveSecretPreviewPayload(previewState), previewState === "failed" ? 503 : 200)
          : await authFetch(buildResultEndpoint());
        const payload = await response.json().catch(() => ({})) as Consultation;
        // 일시적 DB/인증 장애(503·retryable)는 202와 동일하게 재폴링해 자가 복구한다(하드 종료 금지).
        if (response.status === 202 || isRetriableResultPollFailure(response.status, payload)) {
          if (!alive) return;
          attempts += 1;
          if (attempts >= maxAttempts) {
            setPending(false);
            setError(copy.genResultTimeoutError);
            return;
          }
          setPending(true);
          setLoading(true);
          timer = window.setTimeout(loadResult, attempts <= 1 ? 700 : 2500);
          return;
        }
        if (!response.ok || payload?.ok === false) throw new Error(toText(payload?.message) || copy.loadResultFailedError);
        if (alive) {
          setConsultation(payload);
          setPending(false);
        }
      } catch (caught) {
        if (alive) setError(friendlyErrorMessage(caught, copy.loadResultFailedError));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadResult();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
    // 마운트 시 1회만 로드한다; 로딩 중 로케일이 바뀌어도 진행 중인 폴링을 재시작하지 않는다
    // (copy.* 는 에러 메시지 문구일 뿐 재요청 트리거가 아니다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스크롤 진행률은 리렌더 없이 DOM 에 직접 쓴다(스크롤 프레임마다 setState 하면 결과 전체가 다시 그려진다).
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressRef.current?.style.setProperty("--ls-progress", String(ratio));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [consultation]);

  const assistantContent = consultation?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
  const sections = useMemo(() => {
    const direct = consultation?.pdfSections?.length ? consultation.pdfSections : consultation?.sections;
    return direct?.length ? direct : splitAssistantSections(assistantContent);
  }, [assistantContent, consultation?.pdfSections, consultation?.sections]);
  const myName = toText(consultation?.myInfo?.name) || copy.myNameFallback;
  const partnerName = toText(consultation?.partnerInfo?.name) || copy.partnerNameFallback;
  const generatedAt = formatDate(consultation?.createdAt || consultation?.updatedAt);
  const summaryTitle = consultation?.reading?.summaryTitle || copy.summaryTitleFallback(myName);
  const oneLine = consultation?.reading?.oneLineDiagnosis || consultation?.strategy || sections[0]?.body || copy.oneLineFallback;
  const consultationKey = toText(consultation?.sessionId || consultation?.id || consultation?.attemptId || consultation?.requestId);
  const exporting = exportMode === "pdf";

  async function withExportMode(run: () => Promise<void>) {
    setExportMode("pdf");
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    // export CSS 가 애니메이션을 전부 죽이므로 transition 을 기다릴 필요가 없다. 폰트만 기다린다.
    await document.fonts?.ready?.catch?.(() => {});
    await new Promise((resolve) => setTimeout(resolve, 180));
    try {
      await run();
    } finally {
      setExportMode("idle");
    }
  }

  async function handlePdfDownload() {
    const element = document.getElementById("love-secret-result-document");
    if (!element || pdfLoading || !consultation) return;
    setPdfLoading(true);
    setActionError("");
    try {
      await withExportMode(async () => {
        const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
        await exportResultPdf({
          captureTargets: ["#love-secret-result-document"],
          fileName: `love-secret-reading-${safeFilePart(consultation.sessionId || consultation.attemptId || "result")}.pdf`,
          // 캡처 시점의 실제 모드로 해석한다(하드코딩하면 라이트 사용자가 검은 배경을 받는다).
          backgroundColor: prefersDark() ? "#24081a" : "#fffaf7",
          cover: {
            title: summaryTitle,
            subtitle: oneLine,
            date: new Date().toISOString().slice(0, 10),
          },
        });
      });
    } catch (_) {
      setActionError(copy.pdfSaveError);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleShareCard() {
    const node = shareRef.current;
    if (!node || shareLoading) return;
    setShareLoading(true);
    setActionError("");
    try {
      await document.fonts?.ready?.catch?.(() => {});
      const html2canvas = (await import("html2canvas")).default;
      // 캡처 동안만 뷰포트 좌표로 들여놓고 페이지 뒤(z-index -1)에 둔다.
      // 화면 밖 음수 좌표에서 그대로 캡처하면 html2canvas 가 빈 캔버스를 내는 경우가 있다.
      const restore = { left: node.style.left, top: node.style.top, zIndex: node.style.zIndex };
      node.style.left = "0px";
      node.style.top = "0px";
      node.style.zIndex = "-1";
      let canvas: HTMLCanvasElement;
      try {
        // scale: 1 — 노드가 이미 최종 1080px 이라 정확히 1080×1350 이 나온다.
        // devicePixelRatio 를 쓰면 레티나에서 2160px, 아니면 1080px 로 결과가 비결정적이 된다.
        canvas = await html2canvas(node, {
          backgroundColor: null,
          scale: 1,
          useCORS: true,
          logging: false,
          width: 1080,
          height: 1350,
          windowWidth: 1080,
          windowHeight: 1350,
        });
      } finally {
        node.style.left = restore.left;
        node.style.top = restore.top;
        node.style.zIndex = restore.zIndex;
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("capture failed");
      const fileName = `love-secret-${safeFilePart(myName)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: summaryTitle });
        return;
      }
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (_) {
      setActionError(copy.shareImageError);
    } finally {
      setShareLoading(false);
    }
  }

  return (
    <main className={`${theme.theme} relative min-h-screen overflow-hidden text-[var(--ls-text)] [font-family:var(--font-body)]`}>
      <div ref={progressRef} className={styles.scrollProgress} aria-hidden="true" />
      <div className={`${theme.pageBg} pointer-events-none fixed inset-0`} aria-hidden="true" />
      <div className={`${theme.pageGlow} pointer-events-none fixed inset-0`} aria-hidden="true" />
      <div className={`${styles.petals} pointer-events-none fixed inset-0`} aria-hidden="true" />

      {consultation && (
        <LoveSecretShareCard
          ref={shareRef}
          myName={myName}
          summaryTitle={summaryTitle}
          oneLine={oneLine}
          temperature={toText(consultation.reading?.relationshipTemperature)}
          keywords={(consultation.keywords || []).map(toText).filter(Boolean)}
          generatedAt={generatedAt}
          dark={prefersDark()}
        />
      )}

      <section className="relative mx-auto w-full max-w-5xl px-4 pb-12 pt-16 sm:px-6 sm:pt-14 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/love-secret-ai/"
            aria-label={copy.backToInputAria}
            className={`${theme.focusRing} inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ls-line-control)] bg-[var(--ls-surface)] px-4 text-sm font-bold text-[var(--ls-text)] transition hover:bg-[var(--ls-surface-sunken)]`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.retryConsultLabel}
          </a>
          {consultation && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleShareCard()}
                disabled={shareLoading}
                aria-label={copy.shareCardAria}
                className={`${theme.focusRing} inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ls-line-control)] bg-[var(--ls-surface)] px-4 text-sm font-bold text-[var(--ls-text)] transition hover:bg-[var(--ls-surface-sunken)] disabled:opacity-60`}
              >
                {shareLoading
                  ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  : <Share2 className="h-4 w-4" aria-hidden="true" />}
                {shareLoading ? copy.shareCardDrawing : copy.shareCardCta}
              </button>
              <LoveSecretPdfButton loading={pdfLoading} onClick={() => void handlePdfDownload()} />
            </div>
          )}
        </div>

        {loading && (
          <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-8 text-center">
            <div>
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-[var(--ls-accent)] motion-reduce:animate-none" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ls-text)]">
                {pending ? copy.openingReportHeading : copy.loadingSavedHeading}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--ls-text-muted)]">
                {copy.loadingHint}
              </p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="grid min-h-[62vh] place-items-center rounded-3xl border border-[var(--ls-accent)] bg-[var(--ls-surface)] p-8 text-center">
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-10 w-10 text-[var(--ls-accent)]" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ls-text)]">{copy.resultUnavailableHeading}</h1>
              <p className="mt-3 text-sm leading-7 text-[var(--ls-text-muted)]">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`${theme.focusRing} mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[image:var(--ls-cta)] px-4 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5`}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {copy.retryCheckLabel}
              </button>
            </div>
          </div>
        )}

        {!loading && consultation && (
          <LoveSecretResultPageContent
            consultation={consultation}
            sections={sections}
            myName={myName}
            partnerName={partnerName}
            generatedAt={generatedAt}
            summaryTitle={summaryTitle}
            oneLine={oneLine}
            consultationKey={consultationKey}
            actionError={actionError}
            viewAll={viewAll}
            onViewAllChange={setViewAll}
            expandForExport={exporting}
          />
        )}
      </section>
    </main>
  );
}

function LoveSecretResultPageContent({
  consultation,
  sections,
  myName,
  partnerName,
  generatedAt,
  summaryTitle,
  oneLine,
  consultationKey,
  actionError,
  viewAll,
  onViewAllChange,
  expandForExport,
}: {
  consultation: Consultation;
  sections: ResultSection[];
  myName: string;
  partnerName: string;
  generatedAt: string;
  summaryTitle: string;
  oneLine: string;
  consultationKey: string;
  actionError: string;
  viewAll: boolean;
  onViewAllChange: (viewAll: boolean) => void;
  expandForExport: boolean;
}) {
  const copy = useLoveSecretResultCopy();
  const topic = toText(consultation.topic) || copy.topicFallback;
  const groups = useMemo(() => groupLoveSections(sections), [sections]);
  const flowGroups = groups.filter((group) => group.spec.placement === "flow");
  const deckGroups = groups.filter((group) => group.spec.placement === "deck");
  const [activePage, setActivePage] = useState(0);

  // 덱은 그룹 순서대로 평탄화한다. 각 페이지는 자기 그룹을 들고 다녀 목차 점프에 쓰인다.
  const deckPages = useMemo(() => {
    const pages: Array<{ id: string; label: string; content: ReactNode; groupId: string }> = [];
    deckGroups.forEach((group) => {
      group.sections.forEach((section, index) => {
        pages.push({
          id: `love-secret-${group.spec.id}-${index}`,
          label: toDisplayText(section.title).slice(0, 12) || copy.chapterFallback(pages.length + 1),
          content: <LoveSecretResultSection index={pages.length} section={section} />,
          groupId: group.spec.id,
        });
      });
    });
    return pages;
  }, [deckGroups, copy]);

  const deckJumpTargets = useMemo(() => deckGroups.map((group) => ({
    id: group.spec.id,
    label: group.spec.label,
    page: deckPages.findIndex((page) => page.groupId === group.spec.id),
  })).filter((item) => item.page >= 0), [deckGroups, deckPages]);

  const calendar = consultation.sajuSummary?.calendar;
  const reading = consultation.reading;
  const secrets = (reading?.actionSecrets || []).map(parseActionSecret).filter((item) => item.action);

  return (
    <div
      id="love-secret-result-document"
      data-ls-export={expandForExport ? "true" : "false"}
      className={`${styles.resultDocument} relative rounded-[32px] border border-[var(--ls-line)] bg-[var(--ls-bg-0)] p-4 sm:p-6`}
    >
      <div className={`${styles.petals} pointer-events-none absolute inset-0 rounded-[32px]`} aria-hidden="true" />
      <div className="relative">
        <header className={`${styles.card} ${styles.cardSummary} overflow-hidden text-center`}>
          <p className="text-[3.2rem] leading-none" aria-hidden="true">💖</p>
          <h1 className="mt-5 break-keep text-[clamp(1.9rem,5.4vw,3rem)] font-black leading-[1.15] text-[var(--ls-text)] [font-family:var(--font-display)] [text-wrap:balance]">
            {summaryTitle}
          </h1>
          <p className="mt-3 text-sm font-bold text-[var(--ls-accent)]">
            {copy.todayStrategySubtitle}
          </p>
          <figure className={`${styles.accentQuote} mx-auto mt-7 max-w-2xl text-left`}>
            <blockquote className="whitespace-pre-wrap pl-4 text-lg italic leading-9 text-[var(--ls-text)] [font-family:var(--font-premium)] sm:text-xl">
              {oneLine}
            </blockquote>
          </figure>
          {reading?.relationshipTemperature && (
            <p className="mt-5 text-sm leading-7 text-[var(--ls-text-muted)]">{reading.relationshipTemperature}</p>
          )}

          {consultation.keywords?.length ? (
            <div className="mt-6 flex flex-wrap justify-center gap-2.5" aria-label={copy.keywordsAria}>
              {consultation.keywords.map((keyword, index) => {
                const Icon = keywordIcon(keyword);
                return (
                  <span
                    key={`${index}-${toText(keyword).slice(0, 16)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-3.5 py-1.5 text-sm font-bold text-[var(--ls-accent)]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {toText(keyword)}
                  </span>
                );
              })}
            </div>
          ) : null}

          <LoveSecretConnectionCard myName={myName} partnerName={partnerName} topic={topic} generatedAt={generatedAt} />
        </header>

        {consultation.sajuSummary?.myChart && (
          <LoveSecretSajuSummary summary={consultation.sajuSummary} myName={myName} partnerName={partnerName} />
        )}

        {consultation.userQuestion && (
          <section className={`${styles.card} mt-5`}>
            <div className="mb-3 flex items-center gap-2 text-[var(--ls-accent)]">
              <Heart className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-lg font-black text-[var(--ls-text)]">{copy.userQuestionHeading}</h2>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--ls-text-muted)]">{consultation.userQuestion}</p>
          </section>
        )}

        {/* 요약 그룹은 히어로가 이미 담당하므로 흐름 배치에서 제외한다. */}
        {flowGroups.filter((group) => group.spec.id !== "summary" && group.spec.id !== "letter").map((group) => (
          <LoveSecretGroupCard key={group.spec.id} group={group} expandForExport={expandForExport}>
            {group.spec.id === "practice" && (secrets.length > 0 || (reading?.sevenDayGuide || []).length > 0) ? (
              <LoveSecretChecklist
                secrets={secrets}
                sevenDayGuide={(reading?.sevenDayGuide || []).map(toText).filter(Boolean)}
                consultationKey={consultationKey}
                forceExpanded={expandForExport}
              />
            ) : null}
            {group.spec.id === "timing" && calendar?.best?.length ? (
              <LoveSecretLuckyDates calendar={calendar} />
            ) : null}
          </LoveSecretGroupCard>
        ))}

        {deckPages.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2 text-[var(--ls-accent)]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-black text-[var(--ls-text)]">{copy.deepAnalysisHeading}</h2>
            </div>
            {deckJumpTargets.length > 1 && (
              <nav aria-label={copy.tocAria} className="mb-4 flex flex-wrap gap-2">
                {deckJumpTargets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setActivePage(target.page)}
                    aria-current={activePage === target.page ? "true" : undefined}
                    className={`${theme.focusRing} min-h-9 rounded-full border px-3.5 text-xs font-bold transition ${
                      activePage === target.page
                        ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
                        : "border-[var(--ls-line-control)] bg-[var(--ls-surface)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]"
                    }`}
                  >
                    {target.label}
                  </button>
                ))}
              </nav>
            )}
            <PagedResultViewer
              pages={withCharacterBreaks(
                deckPages.map((page) => ({ id: page.id, label: page.label, content: page.content })),
                yeoniBreaks,
              )}
              deckLabel={copy.deckLabel}
              viewAll={viewAll}
              onViewAllChange={onViewAllChange}
              activePage={activePage}
              onPageChange={setActivePage}
              expandForExport={expandForExport}
            />
          </section>
        )}

        {flowGroups.filter((group) => group.spec.id === "letter").map((group) => (
          <LoveSecretGroupCard key={group.spec.id} group={group} expandForExport={expandForExport} />
        ))}

        {consultation.finalLine && (
          <footer className={`${styles.card} ${styles.cardLetter} mt-8 text-center`}>
            <p className="text-sm font-black tracking-[0.12em] text-[var(--ls-accent)]">{copy.finalWordLabel}</p>
            <p className="mt-4 whitespace-pre-wrap text-lg font-bold leading-9 text-[var(--ls-text)] [font-family:var(--font-premium)]">
              {consultation.finalLine}
            </p>
            <p className="mt-6 text-sm font-bold text-[var(--ls-text-muted)]">{copy.yeoniSignature}</p>
          </footer>
        )}

        <div className="mt-8 flex justify-center">
          <a
            href="/love-secret-ai/"
            aria-label={copy.newQuestionLabel}
            className={`${theme.focusRing} inline-flex min-h-12 items-center gap-2 rounded-full bg-[image:var(--ls-cta)] px-6 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5`}
          >
            <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
            {copy.newQuestionLabel}
          </a>
        </div>

        {actionError && (
          <div role="alert" className="mt-5 rounded-2xl border border-[var(--ls-accent)] bg-[var(--ls-surface)] p-4 text-sm leading-7 text-[var(--ls-text-muted)]">
            {actionError}
          </div>
        )}
      </div>
    </div>
  );
}

const GROUP_ICON = {
  heart: Heart,
  book: BookOpen,
  compass: Compass,
  check: ListChecks,
  talisman: Sparkles,
  calendar: CalendarDays,
  shield: ShieldAlert,
  letter: Mail,
} as const;

/** 그룹 카드. JSX 는 한 형태로 고정하고, 프레임/스킨 차별화는 전부 CSS 클래스 맵이 담당한다. */
function LoveSecretGroupCard({
  group,
  expandForExport,
  children,
}: {
  group: LoveSectionGroup;
  expandForExport: boolean;
  children?: ReactNode;
}) {
  const copy = useLoveSecretResultCopy();
  const [open, setOpen] = useState(true);
  const isOpen = expandForExport || open;
  const Icon = GROUP_ICON[group.spec.iconKey];
  const bodyId = `love-secret-group-${group.spec.id}`;
  const variantClass = VARIANT_CLASS[group.spec.variant];

  return (
    <section className={`${styles.card} ${variantClass} ${styles.revealItem} mt-5`}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--ls-surface-sunken)] text-[var(--ls-accent)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="break-keep text-xl font-black text-[var(--ls-text)] [font-family:var(--font-display)]">{group.spec.label}</h2>
          {group.spec.lead && <p className="mt-1 text-sm leading-6 text-[var(--ls-text-muted)]">{group.spec.lead}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={`${group.spec.label} ${isOpen ? copy.collapseLabel : copy.expandLabel}`}
          className={`${theme.focusRing} grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--ls-line-control)] text-[var(--ls-accent)] transition hover:bg-[var(--ls-surface-sunken)]`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div id={bodyId} className={`${styles.collapsible} mt-4`} data-open={isOpen ? "true" : "false"}>
        <div>
          <div className="grid gap-5">
            {group.sections.map((section, index) => (
              <article key={`${group.spec.id}-${index}`}>
                <h3 className="text-base font-black text-[var(--ls-text)]">{section.title}</h3>
                <AiResultProse value={section.body} className={`${styles.chapterProse} mt-2 text-[var(--ls-text-muted)]`} />
              </article>
            ))}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

/** 좋은 날짜 — LLM 문장이 아니라 계산된 일진을 그대로 렌더한다. */
function LoveSecretLuckyDates({ calendar }: { calendar: NonNullable<SajuSummary["calendar"]> }) {
  return (
    <div className="mt-5">
      <p className="text-sm font-black text-[var(--ls-accent)]">
        계산된 일진 · {calendar.rangeStart} ~ {calendar.rangeEnd}
      </p>
      <div className={`${styles.dateGrid} mt-3`}>
        {calendar.best.map((day) => (
          <div key={day.date} className={styles.dateChip}>
            <p className="text-sm font-black text-[var(--ls-text)]">
              {day.date.slice(5).replace("-", "월 ")}일
            </p>
            <p className="mt-0.5 text-xs font-bold text-[var(--ls-accent)]">
              {day.weekday}요일 · {day.ganjiKo || day.ganji}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--ls-text-muted)]">{day.grade}</p>
          </div>
        ))}
      </div>
      {calendar.caution?.length ? (
        <p className="mt-3 text-xs leading-6 text-[var(--ls-text-muted)]">
          조심할 날 · {calendar.caution.map((day) => day.date.slice(5)).join(", ")}
        </p>
      ) : null}
      {calendar.monthlyFlow?.length ? (
        <p className="mt-1.5 text-xs leading-6 text-[var(--ls-text-muted)]">
          월별 흐름 · {calendar.monthlyFlow.map((month) => `${month.monthLabel} ${month.grade}`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function LoveSecretConnectionCard({ myName, partnerName, topic, generatedAt }: { myName: string; partnerName: string; topic: string; generatedAt: string }) {
  const copy = useLoveSecretResultCopy();
  return (
    <div className="relative mt-7 overflow-hidden rounded-[26px] border border-[var(--ls-line)] bg-[var(--ls-surface-2)] p-5 sm:p-7">
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
        <ConnectionName role={copy.myNameFallback} name={myName} className="sm:text-right" />
        <span className="grid shrink-0 place-items-center" aria-hidden="true">
          <Heart className={`${styles.connectionHeart} h-9 w-9 fill-[var(--ls-rose)] text-[var(--ls-rose)]`} />
        </span>
        <ConnectionName role={copy.partnerRoleLabel} name={partnerName} className="sm:text-left" />
      </div>
      <p className="mt-5 text-center text-sm font-semibold text-[var(--ls-text-muted)] sm:text-base">{topic}</p>
      <p className="mt-1.5 text-center text-xs text-[var(--ls-text-muted)]">{generatedAt}</p>
    </div>
  );
}

function ConnectionName({ role, name, className }: { role: string; name: string; className?: string }) {
  return (
    <div className={`text-center ${className || ""}`}>
      <p className="text-[11px] font-bold text-[var(--ls-accent)]">{role}</p>
      <p className="mt-1 break-keep text-2xl font-black text-[var(--ls-text)] [font-family:var(--font-display)] sm:text-3xl">{name}</p>
    </div>
  );
}

function LoveSecretSajuSummary({ summary, myName, partnerName }: { summary: SajuSummary; myName: string; partnerName: string }) {
  const copy = useLoveSecretResultCopy();
  return (
    <section className="mt-5 rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5">
      <div className="mb-4 flex items-center gap-2 text-[var(--ls-accent)]">
        <Moon className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-lg font-black text-[var(--ls-text)]">{copy.sajuBasicsHeading}</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SajuChartCard label={myName} chart={summary.myChart} />
        {summary.partnerChart ? <SajuChartCard label={partnerName} chart={summary.partnerChart} /> : null}
      </div>
      {summary.compatibility && (
        <div className="mt-4 rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-2)] p-4 text-sm leading-7 text-[var(--ls-text-muted)]">
          <p className="font-black text-[var(--ls-accent)]">{copy.compatibilityFlowLabel}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.summary}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.attractionPattern}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.conflictPattern}</p>
          <p className="mt-2 whitespace-pre-wrap">{summary.compatibility.stability}</p>
        </div>
      )}
      {summary.uncertainty?.length ? (
        <p className="mt-3 text-xs font-bold leading-6 text-[var(--ls-text-muted)]">
          {copy.noonBasisNote}
        </p>
      ) : null}
    </section>
  );
}

function SajuChartCard({ label, chart }: { label: string; chart?: SajuChartSummary | null }) {
  if (!chart) return null;
  const pillars: Array<[string, string | undefined]> = [
    ["년주", chart.yearPillar],
    ["월주", chart.monthPillar],
    ["일주", chart.dayPillar],
    ["시주", chart.hourPillar || "시 미상"],
  ];
  return (
    <article className="rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface-2)] p-4">
      <p className="text-sm font-black text-[var(--ls-accent)]">{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
        {pillars.map(([title, value]) => (
          <div key={title} className="rounded-xl border border-[var(--ls-line)] bg-[var(--ls-surface)] px-2 py-3">
            <p className="text-xs font-black text-[var(--ls-text-muted)]">{title}</p>
            <p className="mt-1 font-black text-[var(--ls-text)]">{value || "-"}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm leading-7 text-[var(--ls-text-muted)]">
        {/* 오행 키는 영문(water)이 아니라 한글 라벨을 쓴다 — 서버가 *Label 필드로 함께 내려준다. */}
        <p><span className="font-black text-[var(--ls-accent)]">일간</span> {chart.reference?.dayMasterLabel || chart.dayMaster || "-"}{chart.strength ? ` · ${chart.strength}` : ""}</p>
        <p><span className="font-black text-[var(--ls-accent)]">오행</span> {formatDistribution(chart.fiveElements)}</p>
        <p><span className="font-black text-[var(--ls-accent)]">십성</span> {formatDistribution(chart.tenGods)}</p>
        <p>
          <span className="font-black text-[var(--ls-accent)]">강한 기운</span> {chart.reference?.dominantElementLabel || chart.reference?.dominantElement || "-"}
          {" · "}
          <span className="font-black text-[var(--ls-accent)]">보완 기운</span> {chart.reference?.deficientElementLabel || chart.reference?.deficientElement || "-"}
          {" · "}
          <span className="font-black text-[var(--ls-accent)]">용신</span> {chart.reference?.yongshinElementLabel || chart.reference?.yongshinElement || "-"}
        </p>
        {chart.reference?.dominantTenGod && <p><span className="font-black text-[var(--ls-accent)]">두드러진 십성</span> {chart.reference.dominantTenGod}{chart.gyeokguk ? ` · ${chart.gyeokguk}` : ""}</p>}
        {chart.currentMajorLuck && <p><span className="font-black text-[var(--ls-accent)]">현재 대운</span> {chart.currentMajorLuck}</p>}
        {chart.shinsalLines?.length ? (
          <div>
            <p className="font-black text-[var(--ls-accent)]">신살</p>
            <ul className="mt-1 grid gap-1">
              {chart.shinsalLines.map((line) => (
                <li key={line} className="text-xs leading-6">{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {chart.lovePattern && <p className="whitespace-pre-wrap">{chart.lovePattern}</p>}
      </div>
    </article>
  );
}

function LoveSecretResultSection({ index, section }: { index: number; section: ResultSection }) {
  return (
    <article className="rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[rgba(244,190,209,0.28)] to-[rgba(236,208,141,0.18)] text-sm font-black text-[var(--ls-accent)] ring-1 ring-[var(--ls-line-control)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="text-xl font-black text-[var(--ls-text)] [text-wrap:balance]">{section.title}</h3>
      </div>
      <AiResultProse value={section.body} className={`${styles.chapterProse} text-[var(--ls-text-muted)]`} />
    </article>
  );
}

function LoveSecretPdfButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  const copy = useLoveSecretResultCopy();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#f6d9c4] via-[#eeb0a0] to-[#e0a5ab] px-5 text-sm font-black text-[#3a1424] shadow-[0_0_24px_-6px_rgba(238,176,160,0.55)] transition hover:shadow-[0_0_30px_-4px_rgba(238,176,160,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Heart className="h-4 w-4 fill-current" aria-hidden="true" />}
      {loading ? copy.pdfPreparing : copy.pdfSaveCta}
    </button>
  );
}
