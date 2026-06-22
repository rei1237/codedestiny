"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZiweiDeepChapter } from "@/app/_lib/ziwei-types";
import ZiweiRemedyChecklist from "./ZiweiRemedyChecklist";
import ZiweiMasterPlan from "./ZiweiMasterPlan";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface ZiweiDeepChapterViewProps {
  chapter: ZiweiDeepChapter;
}

interface MobilePanelProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  toggleLabels: {
    close: string;
    open: string;
  };
  children: React.ReactNode;
}

type ZiweiDeepChapterCopy = {
  toggle: {
    close: string;
    open: string;
    expand: string;
  };
  morePreview: string;
  emptyPalace: string;
  mainStarDirect: string;
  branch: string;
  unknown: string;
  mainStars: string;
  mainStarsFallback: string;
  supportStars: string;
  supportStarsFallback: string;
  transformations: string;
  transformationsFallback: string;
  sanFang: string;
  checking: string;
  brightnessSummary: string;
  opposite: string;
  categoryDetail: string;
  opportunity: string;
  caution: string;
  actionAdvice: string;
  palacePracticeAdvice: string;
  readingProgress: string;
  estimated: string;
  minutes: string;
  bodyReading: string;
  bodyCollapse: string;
  bodyMore: string;
  insightPanel: string;
  strengths: string;
  highlights: string;
  checklist: string;
  transformationTypes: Record<string, string>;
};

const ZIWEI_DEEP_CHAPTER_COPY: Record<LoadingLocale, ZiweiDeepChapterCopy> = {
  ko: {
    toggle: { close: "접기", open: "열기", expand: "펼치기" },
    morePreview: "더 보기",
    emptyPalace: "공궁",
    mainStarDirect: "주성 직좌",
    branch: "지지",
    unknown: "미확인",
    mainStars: "주성",
    mainStarsFallback: "대궁·삼방사정 중심 해석",
    supportStars: "보조성",
    supportStarsFallback: "직접 보조성 약함",
    transformations: "사화",
    transformationsFallback: "직접 사화 약함",
    sanFang: "삼방사정",
    checking: "확인 중",
    brightnessSummary: "별 세기 요약",
    opposite: "대궁",
    categoryDetail: "상세 해석",
    opportunity: "기회",
    caution: "주의점",
    actionAdvice: "현실 조언",
    palacePracticeAdvice: "궁별 실전 조언",
    readingProgress: "읽기 진행도",
    estimated: "예상 읽기",
    minutes: "분",
    bodyReading: "본문 읽기",
    bodyCollapse: "본문 접기",
    bodyMore: "본문 더 보기",
    insightPanel: "강점·주의·하이라이트",
    strengths: "장점",
    highlights: "핵심 하이라이트",
    checklist: "실천 체크리스트",
    transformationTypes: { "록": "화록", "권": "화권", "과": "화과", "기": "화기" },
  },
  en: {
    toggle: { close: "Close", open: "Open", expand: "Expand" },
    morePreview: "Read more",
    emptyPalace: "Empty palace",
    mainStarDirect: "Main star seated",
    branch: "Branch",
    unknown: "Unknown",
    mainStars: "Main stars",
    mainStarsFallback: "Read through the opposite palace and triad",
    supportStars: "Support stars",
    supportStarsFallback: "Weak direct support stars",
    transformations: "Transformations",
    transformationsFallback: "Weak direct transformations",
    sanFang: "Triad",
    checking: "Checking",
    brightnessSummary: "Star Strength Summary",
    opposite: "Opposite palace",
    categoryDetail: "Detailed Reading",
    opportunity: "Opportunity",
    caution: "Caution",
    actionAdvice: "Practical Advice",
    palacePracticeAdvice: "Practical Palace Advice",
    readingProgress: "Reading progress",
    estimated: "Estimated reading",
    minutes: "min",
    bodyReading: "Read Body",
    bodyCollapse: "Collapse body",
    bodyMore: "Read more body",
    insightPanel: "Strengths, Cautions, Highlights",
    strengths: "Strengths",
    highlights: "Key Highlights",
    checklist: "Practice Checklist",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  ja: {
    toggle: { close: "閉じる", open: "開く", expand: "展開" },
    morePreview: "続きを読む",
    emptyPalace: "空宮",
    mainStarDirect: "主星が坐す",
    branch: "地支",
    unknown: "未確認",
    mainStars: "主星",
    mainStarsFallback: "対宮・三方四正を中心に読む",
    supportStars: "補助星",
    supportStarsFallback: "直接の補助星は弱め",
    transformations: "四化",
    transformationsFallback: "直接の四化は弱め",
    sanFang: "三方四正",
    checking: "確認中",
    brightnessSummary: "星の強さの要約",
    opposite: "対宮",
    categoryDetail: "詳しい読み解き",
    opportunity: "機会",
    caution: "注意点",
    actionAdvice: "現実的な助言",
    palacePracticeAdvice: "宮ごとの実践アドバイス",
    readingProgress: "読了進捗",
    estimated: "目安時間",
    minutes: "分",
    bodyReading: "本文を読む",
    bodyCollapse: "本文を閉じる",
    bodyMore: "本文をもっと読む",
    insightPanel: "強み・注意・ハイライト",
    strengths: "強み",
    highlights: "重要なハイライト",
    checklist: "実践チェックリスト",
    transformationTypes: { "록": "化禄", "권": "化権", "과": "化科", "기": "化忌" },
  },
  "zh-CN": {
    toggle: { close: "收起", open: "打开", expand: "展开" },
    morePreview: "查看更多",
    emptyPalace: "空宫",
    mainStarDirect: "主星坐守",
    branch: "地支",
    unknown: "未确认",
    mainStars: "主星",
    mainStarsFallback: "以对宫与三方四正为核心解读",
    supportStars: "辅星",
    supportStarsFallback: "直接辅星较弱",
    transformations: "四化",
    transformationsFallback: "直接四化较弱",
    sanFang: "三方四正",
    checking: "确认中",
    brightnessSummary: "星曜强度摘要",
    opposite: "对宫",
    categoryDetail: "详细解读",
    opportunity: "机会",
    caution: "注意点",
    actionAdvice: "现实建议",
    palacePracticeAdvice: "各宫实践建议",
    readingProgress: "阅读进度",
    estimated: "预计阅读",
    minutes: "分钟",
    bodyReading: "阅读正文",
    bodyCollapse: "收起正文",
    bodyMore: "查看更多正文",
    insightPanel: "优势·注意·重点",
    strengths: "优势",
    highlights: "核心重点",
    checklist: "实践清单",
    transformationTypes: { "록": "化禄", "권": "化权", "과": "化科", "기": "化忌" },
  },
  "zh-TW": {
    toggle: { close: "收起", open: "開啟", expand: "展開" },
    morePreview: "查看更多",
    emptyPalace: "空宮",
    mainStarDirect: "主星坐守",
    branch: "地支",
    unknown: "未確認",
    mainStars: "主星",
    mainStarsFallback: "以對宮與三方四正為核心解讀",
    supportStars: "輔星",
    supportStarsFallback: "直接輔星較弱",
    transformations: "四化",
    transformationsFallback: "直接四化較弱",
    sanFang: "三方四正",
    checking: "確認中",
    brightnessSummary: "星曜強度摘要",
    opposite: "對宮",
    categoryDetail: "詳細解讀",
    opportunity: "機會",
    caution: "注意點",
    actionAdvice: "現實建議",
    palacePracticeAdvice: "各宮實踐建議",
    readingProgress: "閱讀進度",
    estimated: "預計閱讀",
    minutes: "分鐘",
    bodyReading: "閱讀正文",
    bodyCollapse: "收起正文",
    bodyMore: "查看更多正文",
    insightPanel: "優勢·注意·重點",
    strengths: "優勢",
    highlights: "核心重點",
    checklist: "實踐清單",
    transformationTypes: { "록": "化祿", "권": "化權", "과": "化科", "기": "化忌" },
  },
  vi: {
    toggle: { close: "Thu gọn", open: "Mở", expand: "Mở rộng" },
    morePreview: "Xem thêm",
    emptyPalace: "Cung trống",
    mainStarDirect: "Chính tinh tọa thủ",
    branch: "Địa chi",
    unknown: "Chưa rõ",
    mainStars: "Chính tinh",
    mainStarsFallback: "Luận qua đối cung và tam phương tứ chính",
    supportStars: "Phụ tinh",
    supportStarsFallback: "Phụ tinh trực tiếp yếu",
    transformations: "Tứ hóa",
    transformationsFallback: "Tứ hóa trực tiếp yếu",
    sanFang: "Tam phương tứ chính",
    checking: "Đang xác nhận",
    brightnessSummary: "Tóm tắt độ sáng của sao",
    opposite: "Đối cung",
    categoryDetail: "Luận giải chi tiết",
    opportunity: "Cơ hội",
    caution: "Điểm cần lưu ý",
    actionAdvice: "Lời khuyên thực tế",
    palacePracticeAdvice: "Lời khuyên thực hành theo cung",
    readingProgress: "Tiến độ đọc",
    estimated: "Thời gian đọc",
    minutes: "phút",
    bodyReading: "Đọc nội dung",
    bodyCollapse: "Thu gọn nội dung",
    bodyMore: "Xem thêm nội dung",
    insightPanel: "Điểm mạnh · Lưu ý · Điểm nổi bật",
    strengths: "Điểm mạnh",
    highlights: "Điểm nổi bật chính",
    checklist: "Danh sách thực hành",
    transformationTypes: { "록": "Hóa Lộc", "권": "Hóa Quyền", "과": "Hóa Khoa", "기": "Hóa Kỵ" },
  },
  hi: {
    toggle: { close: "बंद करें", open: "खोलें", expand: "फैलाएं" },
    morePreview: "और पढ़ें",
    emptyPalace: "रिक्त महल",
    mainStarDirect: "मुख्य सितारा स्थित",
    branch: "पृथ्वी शाखा",
    unknown: "अज्ञात",
    mainStars: "मुख्य सितारे",
    mainStarsFallback: "विपरीत महल और त्रिकोण से पढ़ें",
    supportStars: "सहायक सितारे",
    supportStarsFallback: "सीधे सहायक सितारे कमजोर",
    transformations: "परिवर्तन",
    transformationsFallback: "सीधे परिवर्तन कमजोर",
    sanFang: "त्रिकोण संबंध",
    checking: "जांच जारी",
    brightnessSummary: "सितारा शक्ति सारांश",
    opposite: "विपरीत महल",
    categoryDetail: "विस्तृत पाठ",
    opportunity: "अवसर",
    caution: "सावधानी",
    actionAdvice: "व्यावहारिक सलाह",
    palacePracticeAdvice: "महलवार अभ्यास सलाह",
    readingProgress: "पढ़ने की प्रगति",
    estimated: "अनुमानित पढ़ाई",
    minutes: "मिनट",
    bodyReading: "मुख्य पाठ पढ़ें",
    bodyCollapse: "मुख्य पाठ बंद करें",
    bodyMore: "मुख्य पाठ और पढ़ें",
    insightPanel: "ताकत · सावधानी · मुख्य बातें",
    strengths: "ताकत",
    highlights: "मुख्य बातें",
    checklist: "अभ्यास सूची",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  es: {
    toggle: { close: "Cerrar", open: "Abrir", expand: "Expandir" },
    morePreview: "Ver más",
    emptyPalace: "Palacio vacío",
    mainStarDirect: "Estrella principal asentada",
    branch: "Rama",
    unknown: "Sin confirmar",
    mainStars: "Estrellas principales",
    mainStarsFallback: "Lectura centrada en palacio opuesto y tríada",
    supportStars: "Estrellas de apoyo",
    supportStarsFallback: "Apoyo directo débil",
    transformations: "Transformaciones",
    transformationsFallback: "Transformaciones directas débiles",
    sanFang: "Tríada",
    checking: "Comprobando",
    brightnessSummary: "Resumen de fuerza estelar",
    opposite: "Palacio opuesto",
    categoryDetail: "Lectura detallada",
    opportunity: "Oportunidad",
    caution: "Cuidado",
    actionAdvice: "Consejo práctico",
    palacePracticeAdvice: "Consejo práctico por palacio",
    readingProgress: "Progreso de lectura",
    estimated: "Lectura estimada",
    minutes: "min",
    bodyReading: "Leer texto",
    bodyCollapse: "Cerrar texto",
    bodyMore: "Ver más texto",
    insightPanel: "Fortalezas · cuidados · destacados",
    strengths: "Fortalezas",
    highlights: "Destacados clave",
    checklist: "Lista de práctica",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  fr: {
    toggle: { close: "Fermer", open: "Ouvrir", expand: "Déplier" },
    morePreview: "Voir plus",
    emptyPalace: "Palais vide",
    mainStarDirect: "Étoile principale posée",
    branch: "Branche",
    unknown: "Non confirmé",
    mainStars: "Étoiles principales",
    mainStarsFallback: "Lecture par le palais opposé et la triade",
    supportStars: "Étoiles de soutien",
    supportStarsFallback: "Soutien direct faible",
    transformations: "Transformations",
    transformationsFallback: "Transformations directes faibles",
    sanFang: "Triade",
    checking: "Vérification",
    brightnessSummary: "Résumé de force des étoiles",
    opposite: "Palais opposé",
    categoryDetail: "Lecture détaillée",
    opportunity: "Ouverture",
    caution: "Point de vigilance",
    actionAdvice: "Conseil pratique",
    palacePracticeAdvice: "Conseils pratiques par palais",
    readingProgress: "Progression de lecture",
    estimated: "Lecture estimée",
    minutes: "min",
    bodyReading: "Lire le texte",
    bodyCollapse: "Fermer le texte",
    bodyMore: "Lire davantage",
    insightPanel: "Forces · vigilance · points clés",
    strengths: "Forces",
    highlights: "Points clés",
    checklist: "Liste de pratique",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  de: {
    toggle: { close: "Schließen", open: "Öffnen", expand: "Ausklappen" },
    morePreview: "Mehr lesen",
    emptyPalace: "Leerer Palast",
    mainStarDirect: "Hauptstern sitzt direkt",
    branch: "Zweig",
    unknown: "Unbekannt",
    mainStars: "Hauptsterne",
    mainStarsFallback: "Deutung über Gegenpalast und Dreieck",
    supportStars: "Begleitsterne",
    supportStarsFallback: "Direkte Begleitsterne schwach",
    transformations: "Transformationen",
    transformationsFallback: "Direkte Transformationen schwach",
    sanFang: "Dreieck",
    checking: "Prüfung läuft",
    brightnessSummary: "Sternstärke-Zusammenfassung",
    opposite: "Gegenpalast",
    categoryDetail: "Detaillierte Deutung",
    opportunity: "Chance",
    caution: "Achtsamkeit",
    actionAdvice: "Praktischer Rat",
    palacePracticeAdvice: "Praktischer Rat je Palast",
    readingProgress: "Lesefortschritt",
    estimated: "Geschätzte Lesezeit",
    minutes: "Min.",
    bodyReading: "Text lesen",
    bodyCollapse: "Text schließen",
    bodyMore: "Mehr Text lesen",
    insightPanel: "Stärken · Achtsamkeit · Highlights",
    strengths: "Stärken",
    highlights: "Wichtige Highlights",
    checklist: "Praxis-Checkliste",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  nl: {
    toggle: { close: "Sluiten", open: "Openen", expand: "Uitklappen" },
    morePreview: "Meer lezen",
    emptyPalace: "Leeg paleis",
    mainStarDirect: "Hoofdster aanwezig",
    branch: "Tak",
    unknown: "Onbekend",
    mainStars: "Hoofdsterren",
    mainStarsFallback: "Lezing via tegenpaleis en driehoek",
    supportStars: "Steunsterren",
    supportStarsFallback: "Zwakke directe steunsterren",
    transformations: "Transformaties",
    transformationsFallback: "Zwakke directe transformaties",
    sanFang: "Driehoek",
    checking: "Controleren",
    brightnessSummary: "Samenvatting sterkte",
    opposite: "Tegenpaleis",
    categoryDetail: "Gedetailleerde lezing",
    opportunity: "Kans",
    caution: "Let op",
    actionAdvice: "Praktisch advies",
    palacePracticeAdvice: "Praktisch advies per paleis",
    readingProgress: "Leesvoortgang",
    estimated: "Geschatte leestijd",
    minutes: "min",
    bodyReading: "Tekst lezen",
    bodyCollapse: "Tekst sluiten",
    bodyMore: "Meer tekst lezen",
    insightPanel: "Sterktes · aandacht · hoogtepunten",
    strengths: "Sterktes",
    highlights: "Belangrijkste hoogtepunten",
    checklist: "Praktische checklist",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
  ms: {
    toggle: { close: "Tutup", open: "Buka", expand: "Kembangkan" },
    morePreview: "Lihat lagi",
    emptyPalace: "Istana kosong",
    mainStarDirect: "Bintang utama bertakhta",
    branch: "Cabang",
    unknown: "Belum dikenal pasti",
    mainStars: "Bintang utama",
    mainStarsFallback: "Bacaan melalui istana lawan dan triad",
    supportStars: "Bintang sokongan",
    supportStarsFallback: "Sokongan langsung lemah",
    transformations: "Transformasi",
    transformationsFallback: "Transformasi langsung lemah",
    sanFang: "Triad",
    checking: "Sedang disemak",
    brightnessSummary: "Ringkasan kekuatan bintang",
    opposite: "Istana lawan",
    categoryDetail: "Bacaan terperinci",
    opportunity: "Peluang",
    caution: "Perhatian",
    actionAdvice: "Nasihat praktikal",
    palacePracticeAdvice: "Nasihat praktikal mengikut istana",
    readingProgress: "Kemajuan bacaan",
    estimated: "Anggaran bacaan",
    minutes: "min",
    bodyReading: "Baca kandungan",
    bodyCollapse: "Tutup kandungan",
    bodyMore: "Lihat lagi kandungan",
    insightPanel: "Kekuatan · perhatian · sorotan",
    strengths: "Kekuatan",
    highlights: "Sorotan utama",
    checklist: "Senarai amalan",
    transformationTypes: { "록": "Hua Lu", "권": "Hua Quan", "과": "Hua Ke", "기": "Hua Ji" },
  },
};

function MobilePanel({ title, open, onToggle, toggleLabels, children }: MobilePanelProps) {
  return (
    <section className="rounded-2xl border border-white/12 bg-slate-950/35">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-black text-slate-100">{title}</span>
        <span className="text-xs text-cyan-100">{open ? toggleLabels.close : toggleLabels.open}</span>
      </button>
      {open ? <div className="border-t border-white/10 px-4 py-4">{children}</div> : null}
    </section>
  );
}

export default function ZiweiDeepChapterView({ chapter }: ZiweiDeepChapterViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [mobileBodyOpen, setMobileBodyOpen] = useState(true);
  const [mobileInsightOpen, setMobileInsightOpen] = useState(false);
  const [mobileChecklistOpen, setMobileChecklistOpen] = useState(false);
  const [openCategoryTitle, setOpenCategoryTitle] = useState<string | null>(null);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const bodyRef = useRef<HTMLElement | null>(null);
  const palaceReading = chapter.palaceReading;
  const copy = ZIWEI_DEEP_CHAPTER_COPY[locale] || ZIWEI_DEEP_CHAPTER_COPY.ko;
  const transformationLabel = (type: string) => copy.transformationTypes[type] || type;

  const estimatedMinutes = useMemo(() => {
    return Math.max(4, Math.round(chapter.fullText.length / 650));
  }, [chapter.fullText]);

  const displayText = useMemo(() => {
    if (expanded) return chapter.fullText;
    return chapter.fullText.slice(0, 2400) + (chapter.fullText.length > 2400 ? `\n\n... (${copy.morePreview})` : "");
  }, [chapter.fullText, expanded, copy.morePreview]);

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  useEffect(() => {
    setExpanded(false);
    setReadingProgress(0);
    setMobileBodyOpen(true);
    setMobileInsightOpen(false);
    setMobileChecklistOpen(false);
    setOpenCategoryTitle(chapter.palaceReading?.categories[0]?.categoryTitle || null);
  }, [chapter.sectionId]);

  useEffect(() => {
    const updateProgress = () => {
      const target = bodyRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewport = Math.max(window.innerHeight, 1);
      const total = Math.max(rect.height + viewport, 1);
      const passed = viewport - rect.top;
      const pct = Math.round(Math.max(0, Math.min(100, (passed / total) * 100)));
      setReadingProgress(pct);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [chapter.sectionId, expanded]);

  if (chapter.sectionId === "master") {
    return <ZiweiMasterPlan chapter={chapter} />;
  }

  if (palaceReading) {
    return (
      <article className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl md:p-7">
        <header className="space-y-3">
          <p className="text-xs font-bold tracking-wide text-amber-200/90">Deep Palace Reading</p>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-100">{chapter.title}</h2>
                <p className="mt-1 text-sm text-slate-300">{chapter.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/40 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  {palaceReading.isEmptyPalace ? copy.emptyPalace : copy.mainStarDirect}
                </span>
                <span className="rounded-full border border-amber-300/40 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  {copy.branch} {palaceReading.palaceBranch || copy.unknown}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-200">{palaceReading.summary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{copy.mainStars}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                {palaceReading.mainStars.length ? palaceReading.mainStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(", ") : copy.mainStarsFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{copy.supportStars}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                {palaceReading.supportStars.length ? palaceReading.supportStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(", ") : copy.supportStarsFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{copy.transformations}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
                {palaceReading.transformations.length ? palaceReading.transformations.map((item) => `${transformationLabel(item.type)} ${item.starName}`).join(", ") : copy.transformationsFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{copy.sanFang}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{palaceReading.sanFangSiZheng?.sourcePalaces.join(", ") || copy.checking}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-200/10 via-white/5 to-cyan-200/10 p-4">
            <p className="text-xs font-bold text-amber-100">{copy.brightnessSummary}</p>
            <p className="mt-2 text-sm leading-7 text-slate-100">{palaceReading.brightnessSummary}</p>
            <p className="mt-3 text-xs text-slate-300">{copy.opposite} {palaceReading.oppositePalace || copy.unknown} · {palaceReading.sanFangSiZheng?.summary}</p>
          </div>
        </header>

        <section className="space-y-3">
          {palaceReading.categories.map((category, index) => {
            const open = openCategoryTitle === category.categoryTitle;
            return (
              <article key={category.categoryTitle} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
                <button
                  type="button"
                  onClick={() => setOpenCategoryTitle((prev) => prev === category.categoryTitle ? null : category.categoryTitle)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  aria-expanded={open}
                >
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-cyan-200/80">CATEGORY {String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-100">{category.categoryTitle}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200">{open ? copy.toggle.close : copy.toggle.expand}</span>
                </button>
                {open ? (
                  <div className="border-t border-white/10 px-4 py-4">
                    <div className="space-y-4 text-sm leading-7 text-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-400">{copy.categoryDetail}</p>
                        <p className="mt-1 whitespace-pre-wrap">{category.interpretation}</p>
                      </div>
                      <div className="grid gap-3 xl:grid-cols-3">
                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-200/5 p-3">
                          <p className="text-xs font-bold text-emerald-100">{copy.opportunity}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{category.opportunity}</p>
                        </div>
                        <div className="rounded-xl border border-rose-300/20 bg-rose-200/5 p-3">
                          <p className="text-xs font-bold text-rose-100">{copy.caution}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{category.caution}</p>
                        </div>
                        <div className="rounded-xl border border-amber-300/20 bg-amber-200/5 p-3">
                          <p className="text-xs font-bold text-amber-100">{copy.actionAdvice}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{category.action}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold text-amber-100">{copy.palacePracticeAdvice}</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-100">
            {palaceReading.practicalAdvice.map((advice) => (
              <li key={advice}>- {advice}</li>
            ))}
          </ul>
        </section>
      </article>
    );
  }

  return (
    <article className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl md:p-7">
      <div className="sticky top-2 z-20 rounded-xl border border-cyan-200/30 bg-slate-950/75 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between text-[11px] font-bold text-cyan-100">
          <span>{copy.readingProgress}</span>
          <span>{readingProgress}% · {copy.estimated} {estimatedMinutes}{copy.minutes}</span>
        </div>
        <div className="mt-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div
            className="h-1.5 bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>

      <header>
        <p className="text-xs font-bold tracking-wide text-amber-200/90">Deep Reading Section</p>
        <h2 className="mt-1 text-2xl font-black text-slate-100">{chapter.title}</h2>
        <div className="mt-3 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-200/10 via-white/5 to-cyan-200/10 px-4 py-3">
          <p className="text-sm leading-7 text-amber-100/90">{chapter.summary.join(" ")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chapter.highlights.slice(0, 5).map((item) => (
              <span key={item} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2.5 py-1 text-[11px] text-cyan-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-3 lg:hidden">
        <MobilePanel title={copy.bodyReading} open={mobileBodyOpen} onToggle={() => setMobileBodyOpen((prev) => !prev)} toggleLabels={copy.toggle}>
          <section ref={bodyRef} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-8 text-slate-100">{displayText}</p>
            {chapter.fullText.length > 2400 ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                aria-label={expanded ? copy.bodyCollapse : copy.bodyMore}
              >
                {expanded ? copy.toggle.close : copy.morePreview}
              </button>
            ) : null}
          </section>
        </MobilePanel>

        <MobilePanel title={copy.insightPanel} open={mobileInsightOpen} onToggle={() => setMobileInsightOpen((prev) => !prev)} toggleLabels={copy.toggle}>
          <section className="grid gap-3">
            <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/5 p-3">
              <p className="text-xs font-bold text-cyan-100">{copy.strengths}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100">
                {chapter.strengths.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-200/20 bg-rose-200/5 p-3">
              <p className="text-xs font-bold text-rose-100">{copy.caution}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100">
                {chapter.cautions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200/20 bg-amber-200/5 p-3">
              <p className="text-xs font-bold text-amber-100">{copy.highlights}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100">
                {chapter.highlights.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </section>
        </MobilePanel>

        <MobilePanel title={copy.checklist} open={mobileChecklistOpen} onToggle={() => setMobileChecklistOpen((prev) => !prev)} toggleLabels={copy.toggle}>
          <ZiweiRemedyChecklist
            remedies={chapter.remedies}
            actionItems={chapter.actionItems}
            routine7Days={chapter.routine7Days}
            routine30Days={chapter.routine30Days}
          />
        </MobilePanel>
      </div>

      <div className="hidden space-y-5 lg:block">
        <section ref={bodyRef} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
            <span>{copy.readingProgress} {readingProgress}%</span>
            <span>{copy.estimated} {estimatedMinutes}{copy.minutes}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-8 text-slate-100">{displayText}</p>
          {chapter.fullText.length > 2400 ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
              aria-label={expanded ? copy.bodyCollapse : copy.bodyMore}
            >
              {expanded ? copy.toggle.close : copy.morePreview}
            </button>
          ) : null}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/5 p-3">
            <p className="text-xs font-bold text-cyan-100">{copy.strengths}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {chapter.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/20 bg-rose-200/5 p-3">
            <p className="text-xs font-bold text-rose-100">{copy.caution}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {chapter.cautions.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200/20 bg-amber-200/5 p-3">
            <p className="text-xs font-bold text-amber-100">{copy.highlights}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {chapter.highlights.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <ZiweiRemedyChecklist
          remedies={chapter.remedies}
          actionItems={chapter.actionItems}
          routine7Days={chapter.routine7Days}
          routine30Days={chapter.routine30Days}
        />
      </div>
    </article>
  );
}
