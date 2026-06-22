"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const ASTROLOGY_COSMIC_PAGE_COPY: Record<LoadingLocale, {
  title: string;
  description: string;
  sectionTitle: string;
  points: string[];
  primary: string;
  secondary: string;
}> = {
  ko: { title: "점성술 코즈믹 차트 분석", description: "태양, 달, 상승궁을 중심으로 한 서양 점성술 코즈믹 차트 서비스입니다. 이 페이지는 점성술 기능의 검색 노출을 강화하면서 기존 메인 모달 동작은 유지하기 위한 SEO 랜딩 페이지입니다.", sectionTitle: "주요 분석 포인트", points: ["태양궁: 기본 성향과 핵심 동력", "달궁: 정서 패턴과 관계 반응", "상승궁: 외부 표현 방식과 첫인상"], primary: "점성술 기능 바로 실행", secondary: "점성술 인사이트 읽기" },
  en: { title: "Astrology Cosmic Chart Reading", description: "A Western astrology cosmic chart service centered on the Sun, Moon, and Ascendant. This SEO landing page preserves the existing main modal flow while improving search visibility.", sectionTitle: "Main Analysis Points", points: ["Sun sign: core temperament and driving force", "Moon sign: emotional patterns and relationship responses", "Ascendant: outer expression and first impression"], primary: "Open Astrology Feature", secondary: "Read Astrology Insights" },
  ja: { title: "占星術コズミックチャート分析", description: "太陽・月・アセンダントを中心に読む西洋占星術のコズミックチャートサービスです。既存のメインモーダル動作を保ちながら、検索露出を支えるSEOランディングページです。", sectionTitle: "主な分析ポイント", points: ["太陽星座：基本性質と核となる推進力", "月星座：感情パターンと関係での反応", "アセンダント：外側への表れ方と第一印象"], primary: "占星術を開く", secondary: "占星術インサイトを読む" },
  "zh-CN": { title: "占星宇宙星盘分析", description: "以太阳、月亮与上升星座为核心的西洋占星宇宙星盘服务。本页面在保留原有主弹窗流程的同时强化搜索曝光。", sectionTitle: "主要分析重点", points: ["太阳星座：基本性格与核心动力", "月亮星座：情绪模式与关系反应", "上升星座：外在表达方式与第一印象"], primary: "立即打开占星功能", secondary: "阅读占星洞察" },
  "zh-TW": { title: "占星宇宙星盤分析", description: "以太陽、月亮與上升星座為核心的西洋占星宇宙星盤服務。本頁面在保留原有主彈窗流程的同時強化搜尋曝光。", sectionTitle: "主要分析重點", points: ["太陽星座：基本性格與核心動力", "月亮星座：情緒模式與關係反應", "上升星座：外在表達方式與第一印象"], primary: "立即開啟占星功能", secondary: "閱讀占星洞察" },
  vi: { title: "Luận bản đồ chiêm tinh vũ trụ", description: "Dịch vụ bản đồ chiêm tinh phương Tây xoay quanh Mặt Trời, Mặt Trăng và Cung mọc. Trang SEO này giữ nguyên luồng modal chính và tăng khả năng hiển thị tìm kiếm.", sectionTitle: "Điểm phân tích chính", points: ["Cung Mặt Trời: khí chất cơ bản và động lực cốt lõi", "Cung Mặt Trăng: mẫu cảm xúc và phản ứng trong quan hệ", "Cung Mọc: cách biểu hiện bên ngoài và ấn tượng đầu"], primary: "Mở tính năng chiêm tinh", secondary: "Đọc insight chiêm tinh" },
  hi: { title: "ज्योतिष कॉस्मिक चार्ट रीडिंग", description: "सूर्य, चंद्र और लग्न पर केंद्रित पश्चिमी ज्योतिष कॉस्मिक चार्ट सेवा. यह SEO लैंडिंग पेज मौजूदा मुख्य मोडल प्रवाह को बनाए रखते हुए खोज दृश्यता बढ़ाता है.", sectionTitle: "मुख्य विश्लेषण बिंदु", points: ["सूर्य राशि: मूल स्वभाव और मुख्य प्रेरणा", "चंद्र राशि: भावनात्मक पैटर्न और संबंध प्रतिक्रिया", "लग्न: बाहरी अभिव्यक्ति और पहली छाप"], primary: "ज्योतिष सुविधा खोलें", secondary: "ज्योतिष इनसाइट पढ़ें" },
  es: { title: "Lectura de carta cósmica astrológica", description: "Servicio de astrología occidental centrado en Sol, Luna y Ascendente. Esta página SEO mantiene el flujo del modal principal mientras mejora la visibilidad en búsquedas.", sectionTitle: "Puntos principales", points: ["Signo solar: temperamento base y fuerza central", "Signo lunar: patrones emocionales y respuesta relacional", "Ascendente: expresión externa y primera impresión"], primary: "Abrir astrología", secondary: "Leer insights de astrología" },
  fr: { title: "Lecture de thème cosmique astrologique", description: "Service d'astrologie occidentale centré sur le Soleil, la Lune et l'Ascendant. Cette page SEO conserve le flux du modal principal tout en améliorant la visibilité de recherche.", sectionTitle: "Points principaux", points: ["Signe solaire : tempérament de base et moteur central", "Signe lunaire : schémas émotionnels et réactions relationnelles", "Ascendant : expression extérieure et première impression"], primary: "Ouvrir l'astrologie", secondary: "Lire les insights astrologiques" },
  de: { title: "Astrologische Cosmic-Chart-Analyse", description: "Ein westlicher Astrologie-Service rund um Sonne, Mond und Aszendent. Diese SEO-Landingpage bewahrt den bestehenden Modalfluss und stärkt die Suchsichtbarkeit.", sectionTitle: "Wichtige Analysepunkte", points: ["Sonnenzeichen: Grundtemperament und Kernantrieb", "Mondzeichen: emotionale Muster und Beziehungsreaktionen", "Aszendent: äußerer Ausdruck und erster Eindruck"], primary: "Astrologie öffnen", secondary: "Astrologie-Insights lesen" },
  nl: { title: "Astrologische kosmische kaartlezing", description: "Een westerse astrologieservice rond zon, maan en ascendant. Deze SEO-landingspagina bewaart de bestaande modalstroom en verbetert zoekzichtbaarheid.", sectionTitle: "Belangrijkste analysepunten", points: ["Zonneteken: basistemperament en kernkracht", "Maanteken: emotionele patronen en relatie-reacties", "Ascendant: uiterlijke expressie en eerste indruk"], primary: "Astrologie openen", secondary: "Astrologie-inzichten lezen" },
  ms: { title: "Bacaan carta kosmik astrologi", description: "Servis astrologi Barat yang berpusat pada Matahari, Bulan dan Ascendant. Halaman SEO ini mengekalkan aliran modal utama sambil meningkatkan keterlihatan carian.", sectionTitle: "Poin analisis utama", points: ["Tanda Matahari: perangai asas dan daya utama", "Tanda Bulan: pola emosi dan reaksi hubungan", "Ascendant: ekspresi luar dan tanggapan pertama"], primary: "Buka astrologi", secondary: "Baca insight astrologi" },
};

export default function AstrologyCosmicPage() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = ASTROLOGY_COSMIC_PAGE_COPY[locale] || ASTROLOGY_COSMIC_PAGE_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {copy.description}
        </p>

        <section className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
          <h2 className="text-lg font-semibold">{copy.sectionTitle}</h2>
          {copy.points.map((point) => (
            <p key={point}>- {point}</p>
          ))}
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/?action=openAstroModal" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
            {copy.primary}
          </Link>
          <Link href="/insights/astrology-houses-quick-guide" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">
            {copy.secondary}
          </Link>
        </div>
      </div>
    </main>
  );
}

