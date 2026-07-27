"use client";
/**
 * AnalysisLoadingScreen — 신뢰 프로세스(Trust Sequence) 분석 대기 화면
 * CRO 전략: 즉각 결과 대신 "정밀 분석 중" 애니메이션으로 기대감과 신뢰를 구축.
 *
 * 사용법:
 *   <AnalysisLoadingScreen onComplete={() => router.push('/results')} />
 *   <AnalysisLoadingScreen steps={customSteps} totalDuration={6000} onComplete={cb} />
 */

import { useEffect, useMemo, useState, useRef } from "react";
import { m, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

/* ─────────────────────────────────────────
   타입 정의
───────────────────────────────────────── */
export interface AnalysisStep {
  label: string;
  detail: string;
  duration: number; // ms
  icon: string;
}

interface Props {
  steps?: AnalysisStep[];
  totalDuration?: number;
  onComplete?: () => void;
  userName?: string;
}

/* ─────────────────────────────────────────
   기본 분석 단계 (CRO 최적화 문구)
───────────────────────────────────────── */
type StepText = Pick<AnalysisStep, "label" | "detail">;

const STEP_TIMING: Array<Pick<AnalysisStep, "duration" | "icon">> = [
  { duration: 900, icon: "🔐" },
  { duration: 1400, icon: "📊" },
  { duration: 1200, icon: "☯" },
  { duration: 1300, icon: "🌊" },
  { duration: 1100, icon: "✦" },
  { duration: 800, icon: "🌟" },
];

const DEFAULT_STEP_TEXT_BY_LOCALE: Record<LoadingLocale, StepText[]> = {
  ko: [
    { label: "출생 정보 암호화 처리 중", detail: "생년월일시를 천문학적 좌표로 변환하고 있습니다." },
    { label: "8만 건의 명조 데이터 대조 중", detail: "실제 임상 케이스와 당신의 명조를 정밀 비교합니다." },
    { label: "용신 및 격국 정밀 분석 중", detail: "오행의 균형과 천간·지지 상호작용을 계산합니다." },
    { label: "대운 흐름과 세운 접점 계산 중", detail: "10년 대운과 올해 세운의 충·합·형·파 변수를 도출합니다." },
    { label: "재물·직업·관계 운세 벡터 추출 중", detail: "삶의 핵심 영역별 에너지 흐름을 시각화 준비합니다." },
    { label: "최종 리포트 생성 완료", detail: "당신만을 위한 맞춤 분석이 준비되었습니다." },
  ],
  en: [
    { label: "Protecting birth details", detail: "Your birth date and time are being converted into celestial coordinates." },
    { label: "Comparing 80,000 chart patterns", detail: "Real consultation cases are being matched against your natal chart." },
    { label: "Reading useful elements and structure", detail: "The balance of the Five Elements and stem-branch interactions is being calculated." },
    { label: "Mapping decade and annual flow", detail: "Major luck cycles and this year's turning points are being aligned." },
    { label: "Extracting wealth, work, and relationship signals", detail: "The core energy flow of each life area is being prepared for view." },
    { label: "Final report is ready", detail: "A personalized reading has opened for you." },
  ],
  ja: [
    { label: "出生情報を保護して処理中", detail: "生年月日時を天文学的な座標へ丁寧に変換しています。" },
    { label: "8万件の命式データと照合中", detail: "実際の鑑定事例とあなたの命式を精密に重ねています。" },
    { label: "用神と格局を読み解き中", detail: "五行のバランスと天干・地支の響きを計算しています。" },
    { label: "大運と年運の接点を確認中", detail: "10年ごとの大運と今年の流れが交わるところを見ています。" },
    { label: "金運・仕事・ご縁の流れを抽出中", detail: "人生の主要テーマごとのエネルギーを整えています。" },
    { label: "最終レポートの準備完了", detail: "あなただけの鑑定がまもなく開きます。" },
  ],
  "zh-CN": [
    { label: "正在加密处理出生信息", detail: "正在把出生年月日时转换为天文坐标。" },
    { label: "正在对照8万组命盘数据", detail: "正在将真实咨询案例与您的命盘细致比对。" },
    { label: "正在分析用神与格局", detail: "正在计算五行平衡与天干地支的互动。" },
    { label: "正在计算大运与流年交点", detail: "正在梳理十年大运与今年流年的冲合刑破。" },
    { label: "正在提取财运、事业与关系信号", detail: "正在整理人生核心领域的能量流向。" },
    { label: "最终报告已生成", detail: "专属于您的解读已经准备好。" },
  ],
  "zh-TW": [
    { label: "正在加密處理出生資訊", detail: "正在把出生年月日時轉換為天文座標。" },
    { label: "正在對照8萬組命盤資料", detail: "正在將真實諮詢案例與您的命盤細緻比對。" },
    { label: "正在分析用神與格局", detail: "正在計算五行平衡與天干地支的互動。" },
    { label: "正在計算大運與流年交點", detail: "正在梳理十年大運與今年流年的沖合刑破。" },
    { label: "正在提取財運、事業與關係訊號", detail: "正在整理人生核心領域的能量流向。" },
    { label: "最終報告已生成", detail: "專屬於您的解讀已經準備好。" },
  ],
  vi: [
    { label: "Đang bảo vệ thông tin sinh", detail: "Ngày giờ sinh đang được chuyển thành tọa độ thiên văn." },
    { label: "Đang đối chiếu 80.000 lá số", detail: "Các trường hợp tư vấn thực tế đang được so sánh với mệnh bàn của bạn." },
    { label: "Đang đọc dụng thần và cách cục", detail: "Sự cân bằng ngũ hành và tương tác thiên can địa chi đang được tính toán." },
    { label: "Đang nối đại vận với lưu niên", detail: "Dòng đại vận 10 năm và vận khí năm nay đang được đối chiếu." },
    { label: "Đang rút tín hiệu tài lộc, sự nghiệp và quan hệ", detail: "Năng lượng của từng lĩnh vực chính đang được sắp xếp." },
    { label: "Báo cáo cuối đã sẵn sàng", detail: "Phần luận giải riêng dành cho bạn đã được chuẩn bị." },
  ],
  hi: [
    { label: "जन्म विवरण सुरक्षित किए जा रहे हैं", detail: "जन्म तिथि और समय को खगोलीय निर्देशांकों में बदला जा रहा है." },
    { label: "80,000 कुंडली पैटर्न से मिलान", detail: "वास्तविक परामर्श मामलों से आपकी जन्म-कुंडली की तुलना की जा रही है." },
    { label: "उपयोगी तत्व और संरचना पढ़ी जा रही है", detail: "पंचतत्व संतुलन और तना-शाखा संबंधों की गणना हो रही है." },
    { label: "दशकीय और वार्षिक प्रवाह जोड़े जा रहे हैं", detail: "मुख्य भाग्य चक्र और इस वर्ष के संकेत मिलाए जा रहे हैं." },
    { label: "धन, कार्य और संबंध संकेत निकाले जा रहे हैं", detail: "जीवन के मुख्य क्षेत्रों की ऊर्जा धारा व्यवस्थित हो रही है." },
    { label: "अंतिम रिपोर्ट तैयार है", detail: "आपके लिए निजी पाठ तैयार हो चुका है." },
  ],
  es: [
    { label: "Protegiendo los datos de nacimiento", detail: "La fecha y hora de nacimiento se convierten en coordenadas celestes." },
    { label: "Comparando 80.000 patrones natales", detail: "Casos reales de consulta se contrastan con tu carta." },
    { label: "Leyendo elementos útiles y estructura", detail: "Se calcula el equilibrio de los Cinco Elementos y sus interacciones." },
    { label: "Uniendo ciclos de década y año", detail: "Se alinean la gran suerte de 10 años y el pulso de este año." },
    { label: "Extrayendo señales de dinero, trabajo y vínculos", detail: "Se ordena el flujo energético de las áreas centrales de tu vida." },
    { label: "Informe final listo", detail: "Tu lectura personalizada está preparada." },
  ],
  fr: [
    { label: "Protection des données de naissance", detail: "La date et l'heure de naissance sont converties en coordonnées célestes." },
    { label: "Comparaison avec 80 000 thèmes", detail: "Des cas réels de consultation sont rapprochés de votre thème natal." },
    { label: "Lecture des éléments utiles et de la structure", detail: "L'équilibre des Cinq Éléments et leurs interactions sont calculés." },
    { label: "Alignement des cycles décennaux et annuels", detail: "La grande période de 10 ans et le mouvement de cette année sont reliés." },
    { label: "Extraction des signaux d'argent, de travail et de liens", detail: "Le flux énergétique de chaque domaine central se met en place." },
    { label: "Rapport final prêt", detail: "Votre lecture personnalisée est prête." },
  ],
  de: [
    { label: "Geburtsdaten werden geschützt", detail: "Geburtsdatum und Uhrzeit werden in himmlische Koordinaten übertragen." },
    { label: "Abgleich mit 80.000 Chartmustern", detail: "Reale Beratungsmuster werden mit deinem Geburtsbild verglichen." },
    { label: "Nützliche Elemente und Struktur werden gelesen", detail: "Die Balance der Fünf Elemente und ihre Wechselwirkung werden berechnet." },
    { label: "Dekaden- und Jahresfluss werden verbunden", detail: "Der 10-Jahres-Zyklus und die Zeichen dieses Jahres werden ausgerichtet." },
    { label: "Geld-, Arbeits- und Beziehungssignale werden erfasst", detail: "Der Energiefluss der wichtigsten Lebensbereiche wird geordnet." },
    { label: "Abschlussbericht bereit", detail: "Deine persönliche Deutung ist vorbereitet." },
  ],
  nl: [
    { label: "Geboortegegevens worden beschermd", detail: "Geboortedatum en tijd worden omgezet naar hemelse coördinaten." },
    { label: "Vergelijking met 80.000 kaartpatronen", detail: "Echte consultcases worden naast jouw geboorteprofiel gelegd." },
    { label: "Nuttige elementen en structuur worden gelezen", detail: "De balans van de Vijf Elementen en hun wisselwerking wordt berekend." },
    { label: "Decennium- en jaarstroom worden verbonden", detail: "De 10-jarige cyclus en het ritme van dit jaar worden afgestemd." },
    { label: "Signalen voor geld, werk en relaties worden opgehaald", detail: "De energiestroom van de belangrijkste levensgebieden wordt geordend." },
    { label: "Eindrapport klaar", detail: "Je persoonlijke reading staat klaar." },
  ],
  ms: [
    { label: "Melindungi butiran kelahiran", detail: "Tarikh dan masa lahir sedang ditukar kepada koordinat cakerawala." },
    { label: "Membandingkan 80,000 corak carta", detail: "Kes konsultasi sebenar sedang dipadankan dengan carta kelahiran anda." },
    { label: "Membaca unsur berguna dan struktur", detail: "Keseimbangan Lima Unsur dan interaksinya sedang dikira." },
    { label: "Menyambung aliran dekad dan tahun", detail: "Kitaran 10 tahun dan petunjuk tahun ini sedang diselaraskan." },
    { label: "Mengambil isyarat wang, kerja dan hubungan", detail: "Aliran tenaga bidang utama hidup sedang disusun." },
    { label: "Laporan akhir sudah sedia", detail: "Bacaan peribadi anda telah disediakan." },
  ],
};

const LOADING_UI_COPY: Record<LoadingLocale, {
  progressLabel: string;
  badge: string;
  headingPrefix: (name?: string) => string;
  headingHighlight: string;
  headingSuffix: string;
  descriptionLead: string;
  descriptionStrong: string;
  descriptionTail: string;
  complete: string;
  hint: string;
}> = {
  ko: {
    progressLabel: "분석 중",
    badge: "CODE DESTINY · 전문가 명조 분석",
    headingPrefix: (name) => (name ? `${name}님의 ` : ""),
    headingHighlight: "명조를 분석",
    headingSuffix: "하고 있습니다",
    descriptionLead: "8만 건의 실제 임상 데이터를 기반으로",
    descriptionStrong: "당신만의 고유한 운명 패턴",
    descriptionTail: "을 도출합니다",
    complete: "분석 완료 — 결과를 불러오는 중...",
    hint: "잠시만 기다려 주세요 · 정확도를 위해 다중 알고리즘을 병렬 실행 중",
  },
  en: {
    progressLabel: "ANALYZING",
    badge: "CODE DESTINY · AI CHART READING",
    headingPrefix: (name) => (name ? `${name}'s ` : ""),
    headingHighlight: "destiny pattern",
    headingSuffix: " is being analyzed",
    descriptionLead: "Based on 80,000 real consultation data points",
    descriptionStrong: "your unique destiny pattern",
    descriptionTail: " is being drawn out",
    complete: "Analysis complete — loading your result...",
    hint: "Please stay with us · multiple algorithms are running for accuracy",
  },
  ja: {
    progressLabel: "鑑定中",
    badge: "CODE DESTINY · AI 命式鑑定",
    headingPrefix: (name) => (name ? `${name}さんの` : ""),
    headingHighlight: "命式を読み解いて",
    headingSuffix: "います",
    descriptionLead: "8万件の実際の鑑定データをもとに",
    descriptionStrong: "あなただけの運命パターン",
    descriptionTail: "を導き出しています",
    complete: "鑑定完了 — 結果を読み込んでいます...",
    hint: "少しだけお待ちください · 精度を高めるため複数の計算を並行しています",
  },
  "zh-CN": {
    progressLabel: "分析中",
    badge: "CODE DESTINY · AI 命盘分析",
    headingPrefix: (name) => (name ? `${name}的` : ""),
    headingHighlight: "命盘正在解析",
    headingSuffix: "",
    descriptionLead: "基于8万组真实咨询数据",
    descriptionStrong: "属于您的独特命运模式",
    descriptionTail: "正在被提取",
    complete: "分析完成 — 正在载入结果...",
    hint: "请稍候 · 为了更高准确度，多重算法正在并行运行",
  },
  "zh-TW": {
    progressLabel: "分析中",
    badge: "CODE DESTINY · AI 命盤分析",
    headingPrefix: (name) => (name ? `${name}的` : ""),
    headingHighlight: "命盤正在解析",
    headingSuffix: "",
    descriptionLead: "基於8萬組真實諮詢資料",
    descriptionStrong: "屬於您的獨特命運模式",
    descriptionTail: "正在被提取",
    complete: "分析完成 — 正在載入結果...",
    hint: "請稍候 · 為了提升準確度，多重演算法正在並行運行",
  },
  vi: {
    progressLabel: "ĐANG LUẬN GIẢI",
    badge: "CODE DESTINY · AI LUẬN MỆNH",
    headingPrefix: (name) => (name ? `${name} · ` : ""),
    headingHighlight: "lá số đang được đọc",
    headingSuffix: "",
    descriptionLead: "Dựa trên 80.000 dữ liệu tư vấn thực tế",
    descriptionStrong: "mẫu vận mệnh riêng của bạn",
    descriptionTail: "đang được mở ra",
    complete: "Đã hoàn tất — đang tải kết quả...",
    hint: "Xin chờ trong giây lát · nhiều thuật toán đang chạy song song để tăng độ chính xác",
  },
  hi: {
    progressLabel: "विश्लेषण जारी",
    badge: "CODE DESTINY · AI जन्म-पाठ",
    headingPrefix: (name) => (name ? `${name} का ` : ""),
    headingHighlight: "भाग्य पैटर्न पढ़ा",
    headingSuffix: " जा रहा है",
    descriptionLead: "80,000 वास्तविक परामर्श डेटा के आधार पर",
    descriptionStrong: "आपका अपना अनोखा भाग्य पैटर्न",
    descriptionTail: " उभर रहा है",
    complete: "विश्लेषण पूर्ण — परिणाम लोड हो रहा है...",
    hint: "कृपया प्रतीक्षा करें · सटीकता के लिए कई एल्गोरिद्म साथ चल रहे हैं",
  },
  es: {
    progressLabel: "ANALIZANDO",
    badge: "CODE DESTINY · LECTURA AI",
    headingPrefix: (name) => (name ? `${name}: ` : ""),
    headingHighlight: "tu patrón de destino",
    headingSuffix: " se está leyendo",
    descriptionLead: "Con base en 80.000 datos reales de consulta",
    descriptionStrong: "tu patrón único de destino",
    descriptionTail: " está tomando forma",
    complete: "Análisis completo — cargando el resultado...",
    hint: "Espera un momento · varios algoritmos trabajan en paralelo para mayor precisión",
  },
  fr: {
    progressLabel: "ANALYSE",
    badge: "CODE DESTINY · LECTURE AI",
    headingPrefix: (name) => (name ? `${name} · ` : ""),
    headingHighlight: "votre motif de destinée",
    headingSuffix: " est en cours de lecture",
    descriptionLead: "À partir de 80 000 données réelles de consultation",
    descriptionStrong: "votre motif de destinée unique",
    descriptionTail: " se dessine",
    complete: "Analyse terminée — chargement du résultat...",
    hint: "Veuillez patienter · plusieurs algorithmes travaillent ensemble pour plus de justesse",
  },
  de: {
    progressLabel: "ANALYSE",
    badge: "CODE DESTINY · AI GEBURTSBILD",
    headingPrefix: (name) => (name ? `${name}: ` : ""),
    headingHighlight: "dein Schicksalsmuster",
    headingSuffix: " wird gelesen",
    descriptionLead: "Auf Basis von 80.000 echten Beratungsdaten",
    descriptionStrong: "dein einzigartiges Schicksalsmuster",
    descriptionTail: " wird sichtbar",
    complete: "Analyse abgeschlossen — Ergebnis wird geladen...",
    hint: "Bitte kurz warten · mehrere Algorithmen laufen parallel für mehr Genauigkeit",
  },
  nl: {
    progressLabel: "ANALYSE",
    badge: "CODE DESTINY · AI GEBOORTELEZING",
    headingPrefix: (name) => (name ? `${name}: ` : ""),
    headingHighlight: "je lotslijn",
    headingSuffix: " wordt gelezen",
    descriptionLead: "Gebaseerd op 80.000 echte consultgegevens",
    descriptionStrong: "jouw unieke bestemmingsthema",
    descriptionTail: " wordt zichtbaar",
    complete: "Analyse voltooid — resultaat wordt geladen...",
    hint: "Even geduld · meerdere algoritmen lopen parallel voor meer nauwkeurigheid",
  },
  ms: {
    progressLabel: "MENGANALISIS",
    badge: "CODE DESTINY · BACAAN AI",
    headingPrefix: (name) => (name ? `${name}: ` : ""),
    headingHighlight: "pola takdir anda",
    headingSuffix: " sedang dibaca",
    descriptionLead: "Berdasarkan 80,000 data konsultasi sebenar",
    descriptionStrong: "pola takdir unik anda",
    descriptionTail: " sedang dibuka",
    complete: "Analisis selesai — memuatkan keputusan...",
    hint: "Sila tunggu sebentar · beberapa algoritma berjalan serentak untuk ketepatan",
  },
};

function buildDefaultSteps(locale: LoadingLocale): AnalysisStep[] {
  return DEFAULT_STEP_TEXT_BY_LOCALE[locale].map((text, index) => ({
    ...text,
    ...STEP_TIMING[index],
  }));
}

/* ─────────────────────────────────────────
   파티클 배경
───────────────────────────────────────── */
function CosmicParticle({ index }: { index: number }) {
  const symbols = ["✦", "✧", "⋆", "·", "✶", "✸"];
  const sym = symbols[index % symbols.length];
  const size = 8 + (index % 4) * 4;
  const x = (index * 137.5) % 100;
  const y = (index * 73.1) % 100;
  const delay = (index * 0.4) % 3;
  const duration = 3 + (index % 3);

  return (
    <m.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: size, color: index % 3 === 0 ? "#d4a843" : "#a78bfa" }}
      animate={{ opacity: [0.08, 0.35, 0.08], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {sym}
    </m.div>
  );
}

/* ─────────────────────────────────────────
   원형 진행 링
───────────────────────────────────────── */
function CircularProgress({ progress, label }: { progress: number; label: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress / 100);

  return (
    <div className="relative w-36 h-36 mx-auto mb-6">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* 배경 링 */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="6" />
        {/* 진행 링 */}
        <m.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a843" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#d4a843" />
          </linearGradient>
        </defs>
      </svg>
      {/* 퍼센트 텍스트 */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <m.span
          className="text-2xl font-bold"
          style={{ background: "linear-gradient(135deg,#d4a843,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          key={Math.round(progress)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(progress)}%
        </m.span>
        <span className="text-[10px] text-violet-300/60 font-medium tracking-widest">{label}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   단계 아이템
───────────────────────────────────────── */
function StepItem({ step, status, progress }: {
  step: AnalysisStep;
  status: "pending" | "active" | "done";
  progress: number;
}) {
  const isDone = status === "done";
  const isActive = status === "active";

  return (
    <m.div
      className={`relative flex items-start gap-3 p-3 rounded-xl transition-all duration-500 ${
        isActive
          ? "bg-violet-950/60 border border-violet-500/30 shadow-[0_0_20px_rgba(167,139,250,0.12)]"
          : isDone
          ? "opacity-70"
          : "opacity-30"
      }`}
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: status === "pending" ? 0.3 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* 아이콘 */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
          isDone
            ? "bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-400/40"
            : isActive
            ? "bg-gradient-to-br from-violet-600/40 to-violet-800/30 border border-violet-400/50 animate-pulse"
            : "bg-white/5 border border-white/10"
        }`}
      >
        {isDone ? "✓" : step.icon}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className={`text-sm font-semibold leading-tight ${isDone ? "text-amber-300/80" : isActive ? "text-violet-200" : "text-white/40"}`}>
          {step.label}
        </div>
        {isActive && (
          <m.div
            className="text-xs text-violet-300/70 mt-0.5 leading-relaxed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            {step.detail}
          </m.div>
        )}
        {/* 진행 바 */}
        {isActive && (
          <div className="mt-2 h-1 rounded-full bg-violet-900/50 overflow-hidden">
            <m.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#d4a843,#a78bfa,#d4a843)", backgroundSize: "200% 100%" }}
              animate={{ width: `${progress}%`, backgroundPosition: ["0% 50%", "100% 50%"] }}
              transition={{ width: { duration: 0.3 }, backgroundPosition: { duration: 2, repeat: Infinity } }}
            />
          </div>
        )}
      </div>

      {isDone && (
        <m.div
          className="flex-shrink-0 text-amber-400 text-sm pt-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          ✦
        </m.div>
      )}
    </m.div>
  );
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function AnalysisLoadingScreen({ steps: providedSteps, onComplete, userName }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const stepStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale as EventListener);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale as EventListener);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  const copy = LOADING_UI_COPY[locale] || LOADING_UI_COPY.ko;
  const steps = useMemo(
    () => (providedSteps?.length ? providedSteps : buildDefaultSteps(locale)),
    [providedSteps, locale],
  );
  const totalDuration = steps.reduce((s, x) => s + x.duration, 0);

  useEffect(() => {
    let elapsed = 0;
    let stepIdx = 0;
    let stepStart = performance.now();

    function tick(now: number) {
      const stepElapsed = now - stepStart;
      const step = steps[stepIdx];
      if (!step) return;

      const sp = Math.min((stepElapsed / step.duration) * 100, 100);
      setStepProgress(sp);

      const prevDuration = steps.slice(0, stepIdx).reduce((s, x) => s + x.duration, 0);
      const tp = Math.min(((prevDuration + stepElapsed) / totalDuration) * 100, 100);
      setTotalProgress(tp);

      if (stepElapsed >= step.duration) {
        stepIdx++;
        setCurrentStep(stepIdx);
        setStepProgress(0);
        stepStart = now;

        if (stepIdx >= steps.length) {
          setTotalProgress(100);
          setIsComplete(true);
          setTimeout(() => onComplete?.(), 600);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [steps, totalDuration, onComplete]);

  return (
    <div className="relative min-h-[100dvh] bg-[#08050f] flex items-center justify-center overflow-hidden py-12 px-4">
      {/* 배경 오브 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle,#d4a843,transparent 70%)", filter: "blur(50px)" }} />
      </div>

      {/* 파티클 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => <CosmicParticle key={i} index={i} />)}
      </div>

      <m.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <m.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-4 border"
            style={{
              background: "rgba(124,58,237,0.15)",
              borderColor: "rgba(167,139,250,0.3)",
              color: "#a78bfa",
            }}
            animate={{ boxShadow: ["0 0 8px rgba(167,139,250,0.2)", "0 0 20px rgba(167,139,250,0.45)", "0 0 8px rgba(167,139,250,0.2)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {copy.badge}
          </m.div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            {copy.headingPrefix(userName)}
            <span style={{ background: "linear-gradient(135deg,#d4a843 0%,#f0c060 40%,#a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {copy.headingHighlight}
            </span>
            {copy.headingSuffix}
          </h2>
          <p className="text-sm text-violet-300/60 leading-relaxed">
            {copy.descriptionLead}<br />
            <strong className="text-violet-200/80">{copy.descriptionStrong}</strong>{copy.descriptionTail}
          </p>
        </div>

        {/* 원형 진행률 */}
        <CircularProgress progress={totalProgress} label={copy.progressLabel} />

        {/* 단계 목록 */}
        <div className="space-y-2 mb-6">
          {steps.map((step, i) => (
            <StepItem
              key={i}
              step={step}
              status={i < currentStep ? "done" : i === currentStep ? "active" : "pending"}
              progress={i === currentStep ? stepProgress : 100}
            />
          ))}
        </div>

        {/* 하단 안내 */}
        <AnimatePresence>
          {isComplete ? (
            <m.div
              key="complete"
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg,#d4a843,#b8860b)", color: "#1a0e00" }}>
                🌟 {copy.complete}
              </div>
            </m.div>
          ) : (
            <m.p
              key="hint"
              className="text-center text-xs text-violet-400/40 tracking-wide"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              {copy.hint}
            </m.p>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  );
}
