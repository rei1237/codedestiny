"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const ZIWEI_CHART_PAGE_COPY: Record<LoadingLocale, {
  title: string;
  description: string;
  sectionTitle: string;
  points: string[];
  primary: string;
  secondary: string;
}> = {
  ko: { title: "자미두수 12궁 명반 분석", description: "자미두수(紫微斗數) 기반으로 명궁, 주요 성군, 12궁 배치를 읽어 성향과 인생 흐름을 해석하는 서비스입니다. 본 페이지는 자미두수 기능의 SEO 노출을 강화하기 위한 안전한 랜딩 페이지입니다.", sectionTitle: "핵심 해석 항목", points: ["명궁/신궁 중심 성향과 기질 분석", "재물, 관계, 직업, 이동운 등 12궁 포인트", "생년월일시 기반 개인화된 명반 리딩"], primary: "자미두수 기능 바로 실행", secondary: "자미두수 가이드 읽기" },
  en: { title: "Zi Wei 12 Palace Chart Reading", description: "A Zi Wei Dou Shu service that reads the life palace, major stars, and 12 palace placements to interpret temperament and life flow. This page safely supports SEO visibility for the Zi Wei feature.", sectionTitle: "Core Reading Points", points: ["Life and body palace temperament analysis", "12 palace points for wealth, relationships, career, and movement", "Personalized chart reading from birth date and time"], primary: "Open Zi Wei Feature", secondary: "Read Zi Wei Guide" },
  ja: { title: "紫微斗数 十二宮命盤分析", description: "紫微斗数にもとづき、命宮・主要星・十二宮の配置から性質と人生の流れを読み解くサービスです。紫微斗数機能の検索露出を支える安全なランディングページです。", sectionTitle: "主な読み解き項目", points: ["命宮・身宮を中心にした性質と気質の分析", "財・関係・仕事・移動運など十二宮の要点", "生年月日時にもとづくパーソナル命盤リーディング"], primary: "紫微斗数を開く", secondary: "紫微斗数ガイドを読む" },
  "zh-CN": { title: "紫微斗数十二宫命盘分析", description: "基于紫微斗数，读取命宫、主要星曜与十二宫配置，解读性格与人生流向。此页面用于安全强化紫微斗数功能的搜索曝光。", sectionTitle: "核心解读项目", points: ["以命宫/身宫为中心的性格与气质分析", "财富、关系、事业、迁移运等十二宫重点", "基于出生年月日时的个人命盘解读"], primary: "立即打开紫微斗数", secondary: "阅读紫微斗数指南" },
  "zh-TW": { title: "紫微斗數十二宮命盤分析", description: "基於紫微斗數，讀取命宮、主要星曜與十二宮配置，解讀性格與人生流向。此頁面用於安全強化紫微斗數功能的搜尋曝光。", sectionTitle: "核心解讀項目", points: ["以命宮/身宮為中心的性格與氣質分析", "財富、關係、事業、遷移運等十二宮重點", "基於出生年月日時的個人命盤解讀"], primary: "立即開啟紫微斗數", secondary: "閱讀紫微斗數指南" },
  vi: { title: "Luận lá số Tử Vi 12 cung", description: "Dịch vụ Tử Vi Đẩu Số đọc cung Mệnh, các chính tinh và bố cục 12 cung để luận khí chất và dòng đời. Trang này hỗ trợ SEO an toàn cho tính năng Tử Vi.", sectionTitle: "Hạng mục luận giải chính", points: ["Phân tích khí chất qua cung Mệnh và cung Thân", "Điểm trọng yếu 12 cung về tài lộc, quan hệ, sự nghiệp và dịch chuyển", "Luận lá số cá nhân theo ngày giờ sinh"], primary: "Mở tính năng Tử Vi", secondary: "Đọc hướng dẫn Tử Vi" },
  hi: { title: "Zi Wei 12 महल चार्ट रीडिंग", description: "Zi Wei Dou Shu के आधार पर जीवन महल, मुख्य सितारों और 12 महलों की स्थिति से स्वभाव और जीवन प्रवाह पढ़ा जाता है. यह पेज Zi Wei सुविधा की खोज दृश्यता को सुरक्षित रूप से सहारा देता है.", sectionTitle: "मुख्य पढ़ाई बिंदु", points: ["जीवन और शरीर महल से स्वभाव विश्लेषण", "धन, संबंध, करियर और यात्रा से जुड़े 12 महल बिंदु", "जन्म तारीख और समय पर आधारित व्यक्तिगत चार्ट रीडिंग"], primary: "Zi Wei सुविधा खोलें", secondary: "Zi Wei गाइड पढ़ें" },
  es: { title: "Lectura Zi Wei de 12 palacios", description: "Servicio de Zi Wei Dou Shu que lee el palacio de vida, estrellas principales y los 12 palacios para interpretar temperamento y flujo vital. Esta página refuerza de forma segura la visibilidad SEO de Zi Wei.", sectionTitle: "Puntos clave de lectura", points: ["Análisis de temperamento desde palacio de vida y cuerpo", "Puntos de riqueza, relaciones, carrera y movimiento en los 12 palacios", "Lectura personalizada por fecha y hora de nacimiento"], primary: "Abrir Zi Wei", secondary: "Leer guía Zi Wei" },
  fr: { title: "Lecture Zi Wei des 12 palais", description: "Service de Zi Wei Dou Shu qui lit le palais de vie, les étoiles majeures et les 12 palais pour interpréter tempérament et flux de vie. Cette page soutient sûrement la visibilité SEO de Zi Wei.", sectionTitle: "Points clés de lecture", points: ["Analyse du tempérament par les palais de vie et de corps", "Points des 12 palais pour richesse, relations, carrière et déplacement", "Lecture personnalisée par date et heure de naissance"], primary: "Ouvrir Zi Wei", secondary: "Lire le guide Zi Wei" },
  de: { title: "Zi Wei Analyse der 12 Paläste", description: "Ein Zi-Wei-Dou-Shu-Service, der Lebenspalast, Hauptsterne und 12 Paläste liest, um Temperament und Lebensfluss zu deuten. Diese Seite stärkt sicher die SEO-Sichtbarkeit der Zi-Wei-Funktion.", sectionTitle: "Kernpunkte der Deutung", points: ["Temperamentanalyse über Lebens- und Körperpalast", "12-Palast-Punkte zu Vermögen, Beziehungen, Beruf und Bewegung", "Persönliche Chart-Deutung nach Geburtsdatum und Uhrzeit"], primary: "Zi Wei öffnen", secondary: "Zi Wei Guide lesen" },
  nl: { title: "Zi Wei lezing van 12 paleizen", description: "Een Zi Wei Dou Shu-service die levenspaleis, hoofdsterren en 12 paleizen leest om temperament en levensstroom te duiden. Deze pagina ondersteunt veilig de SEO-zichtbaarheid van Zi Wei.", sectionTitle: "Belangrijkste lezingspunten", points: ["Temperamentanalyse via levens- en lichaamspaleis", "12-paleispunten voor welvaart, relaties, carrière en beweging", "Persoonlijke kaartlezing op basis van geboortedatum en tijd"], primary: "Zi Wei openen", secondary: "Zi Wei gids lezen" },
  ms: { title: "Bacaan carta Zi Wei 12 istana", description: "Servis Zi Wei Dou Shu yang membaca istana hidup, bintang utama dan susunan 12 istana untuk mentafsir perangai dan aliran hidup. Halaman ini menyokong SEO ciri Zi Wei dengan selamat.", sectionTitle: "Poin bacaan utama", points: ["Analisis perangai melalui istana hidup dan tubuh", "Poin 12 istana untuk kekayaan, hubungan, kerjaya dan pergerakan", "Bacaan carta peribadi berdasarkan tarikh dan masa lahir"], primary: "Buka Zi Wei", secondary: "Baca panduan Zi Wei" },
};

export default function ZiweiChartPage() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = ZIWEI_CHART_PAGE_COPY[locale] || ZIWEI_CHART_PAGE_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-6">
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
          <Link href="/?action=openZiweiModal" className="rounded-lg bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white">
            {copy.primary}
          </Link>
          <Link href="/insights/ziwei-doushu-stars-intro" className="rounded-lg border border-slate-600 px-4 py-2 text-sm">
            {copy.secondary}
          </Link>
        </div>
      </div>
    </main>
  );
}

