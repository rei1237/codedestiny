"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

declare global {
  interface Window {
    openTarotYearFortuneModal?: () => void;
  }
}

const YEAR_STYLE_HREF = "/styles/tarot-year-fortune.css?v=20260629-no-llm-prompt";

const TAROT_YEAR_COPY: Record<LoadingLocale, {
  closeLabel: string;
  zodiacTitles: string[];
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  drawTitle: string;
  loadingText: string;
  resultTitle: string;
  resultHint: string;
  detailPlaceholder: string;
  detailTitle: string;
  cardAlt: string;
  monthlyCard: string;
  oracleConsult: string;
  spreadTitle: string;
  tabs: {
    general: string;
    relationship: string;
    money: string;
    health: string;
  };
  categoryTitle: string;
  adviceTitle: string;
  share: string;
  reset: string;
  home: string;
}> = {
  ko: {
    closeLabel: "닫기",
    zodiacTitles: ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"],
    badge: "십이지신 천운 타로",
    title: "열두 달의 문을 차례로 열다",
    subtitle: "열두 수호 리듬과 12장의 카드가 한 해의 상승 구간, 쉬어갈 달, 월별 선택의 기준을 차분히 비춥니다.",
    cta: "12개월 카드 열기",
    drawTitle: "열두 달의 카드를 준비하는 중입니다",
    loadingText: "한 해의 문이 천천히 열리고 있습니다. 잠시만 기다려 주세요.",
    resultTitle: "1월부터 12월까지, 열두 달의 카드 흐름",
    resultHint: "월 카드를 눌러 해당 달의 타로 흐름을 여세요",
    detailPlaceholder: "월 카드를 눌러 해당 달의 흐름을 확인하세요",
    detailTitle: "1월 상세 운세",
    cardAlt: "이달의 타로 카드",
    monthlyCard: "이달의 카드",
    oracleConsult: "월별 타로 해석",
    spreadTitle: "이달의 세 장 흐름",
    tabs: { general: "핵심", relationship: "관계", money: "금전·일", health: "건강" },
    categoryTitle: "전반 흐름 해석",
    adviceTitle: "한 해의 총평",
    share: "1년 흐름 공유",
    reset: "다시 보기",
    home: "홈화면 바로가기",
  },
  en: {
    closeLabel: "Close",
    zodiacTitles: ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"],
    badge: "Zodiac Year Fortune",
    title: "Open the wheel of destiny",
    subtitle: "A year guarded by the twelve celestial guardians. Draw monthly cards from January to December and read money, love, relationships, and exam luck.",
    cta: "Draw yearly cards",
    drawTitle: "Drawing your yearly cards",
    loadingText: "The twelve guardians are opening the gate of the year. Please wait a moment.",
    resultTitle: "Zodiac monthly fortune, January to December spread",
    resultHint: "Tap a monthly card to open that month's tarot reading.",
    detailPlaceholder: "Tap a monthly card to view that month's fortune.",
    detailTitle: "January detailed fortune",
    cardAlt: "This month's tarot card",
    monthlyCard: "Card of the month",
    oracleConsult: "Professional tarot reading",
    spreadTitle: "This month's three-aspect spread",
    tabs: { general: "Core", relationship: "Relationships", money: "Money · Work", health: "Health" },
    categoryTitle: "Overall fortune reading",
    adviceTitle: "Oracle summary",
    share: "Share fortune",
    reset: "Read again",
    home: "Go to home",
  },
  ja: {
    closeLabel: "閉じる",
    zodiacTitles: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
    badge: "十二支の年運",
    title: "運命の輪を開く",
    subtitle: "天上の十二の守護神が見守る一年。1月から12月まで各月のカードを引き、金運・恋愛・人間関係・合格運を読み解きます。",
    cta: "年運カードを引く",
    drawTitle: "年運カードを引いています",
    loadingText: "十二の守護神が一年の扉を開いています。少しだけお待ちください。",
    resultTitle: "十二支の月運、1月から12月のスプレッド",
    resultHint: "月札をタップして、その月のタロット相談を開いてください。",
    detailPlaceholder: "月札をタップして、その月の運勢を確認してください。",
    detailTitle: "1月の詳しい運勢",
    cardAlt: "今月のタロットカード",
    monthlyCard: "今月のカード",
    oracleConsult: "専門タロットリーディング",
    spreadTitle: "今月の三才スプレッド",
    tabs: { general: "核心", relationship: "関係", money: "金運・仕事", health: "健康" },
    categoryTitle: "全体運の読み解き",
    adviceTitle: "オラクル総評",
    share: "年運を共有",
    reset: "もう一度占う",
    home: "ホームへ戻る",
  },
  "zh-CN": {
    closeLabel: "关闭",
    zodiacTitles: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
    badge: "十二生肖年运",
    title: "打开命运之轮",
    subtitle: "由天上的十二守护神守护的一年。抽取1月至12月的月度卡牌，查看财运、恋爱、人际与考试运。",
    cta: "抽取年运卡",
    drawTitle: "正在抽取年运卡",
    loadingText: "十二守护神正在打开一年的大门。请稍候。",
    resultTitle: "十二生肖月运，1月至12月牌阵",
    resultHint: "点击月牌，打开该月的塔罗咨询。",
    detailPlaceholder: "点击月牌查看该月运势。",
    detailTitle: "1月详细运势",
    cardAlt: "本月塔罗牌",
    monthlyCard: "本月之牌",
    oracleConsult: "专业塔罗解读",
    spreadTitle: "本月三才牌阵",
    tabs: { general: "核心", relationship: "关系", money: "金钱·工作", health: "健康" },
    categoryTitle: "整体运势解读",
    adviceTitle: "神谕总评",
    share: "分享年运",
    reset: "重新占卜",
    home: "返回首页",
  },
  "zh-TW": {
    closeLabel: "關閉",
    zodiacTitles: ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"],
    badge: "十二生肖年運",
    title: "打開命運之輪",
    subtitle: "由天上的十二守護神守護的一年。抽取1月至12月的月度卡牌，查看財運、戀愛、人際與考試運。",
    cta: "抽取年運卡",
    drawTitle: "正在抽取年運卡",
    loadingText: "十二守護神正在打開一年的大門。請稍候。",
    resultTitle: "十二生肖月運，1月至12月牌陣",
    resultHint: "點擊月牌，打開該月的塔羅諮詢。",
    detailPlaceholder: "點擊月牌查看該月運勢。",
    detailTitle: "1月詳細運勢",
    cardAlt: "本月塔羅牌",
    monthlyCard: "本月之牌",
    oracleConsult: "專業塔羅解讀",
    spreadTitle: "本月三才牌陣",
    tabs: { general: "核心", relationship: "關係", money: "金錢·工作", health: "健康" },
    categoryTitle: "整體運勢解讀",
    adviceTitle: "神諭總評",
    share: "分享年運",
    reset: "重新占卜",
    home: "返回首頁",
  },
  vi: {
    closeLabel: "Đóng",
    zodiacTitles: ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"],
    badge: "Vận năm 12 con giáp",
    title: "Mở bánh xe vận mệnh",
    subtitle: "Một năm được mười hai thần hộ mệnh trời cao gìn giữ. Rút lá bài từng tháng từ tháng 1 đến tháng 12 để xem tiền bạc, tình yêu, quan hệ và vận thi cử.",
    cta: "Rút bài vận năm",
    drawTitle: "Đang rút bài vận năm",
    loadingText: "Mười hai thần hộ mệnh đang mở cánh cửa của năm. Vui lòng chờ giây lát.",
    resultTitle: "Vận tháng 12 con giáp, trải bài tháng 1 đến tháng 12",
    resultHint: "Chạm vào lá tháng để mở tư vấn tarot của tháng đó.",
    detailPlaceholder: "Chạm vào lá tháng để xem vận tháng đó.",
    detailTitle: "Vận chi tiết tháng 1",
    cardAlt: "Lá tarot tháng này",
    monthlyCard: "Lá bài của tháng",
    oracleConsult: "Luận tarot chuyên sâu",
    spreadTitle: "Trải bài tam tài tháng này",
    tabs: { general: "Cốt lõi", relationship: "Quan hệ", money: "Tiền · Việc", health: "Sức khỏe" },
    categoryTitle: "Luận vận tổng thể",
    adviceTitle: "Tổng luận oracle",
    share: "Chia sẻ vận năm",
    reset: "Xem lại",
    home: "Về trang chủ",
  },
  hi: {
    closeLabel: "बंद करें",
    zodiacTitles: ["चूहा", "बैल", "बाघ", "खरगोश", "ड्रैगन", "साँप", "घोड़ा", "बकरी", "बंदर", "मुर्गा", "कुत्ता", "सूअर"],
    badge: "बारह राशि वर्षफल",
    title: "भाग्य का चक्र खोलें",
    subtitle: "आकाशीय बारह संरक्षक जिस वर्ष की रक्षा करते हैं. जनवरी से दिसंबर तक हर महीने का कार्ड निकालें और धन, प्रेम, संबंध तथा परीक्षा भाग्य देखें.",
    cta: "वर्षफल कार्ड निकालें",
    drawTitle: "वर्षफल कार्ड निकाले जा रहे हैं",
    loadingText: "बारह संरक्षक वर्ष का द्वार खोल रहे हैं. कृपया थोड़ा प्रतीक्षा करें.",
    resultTitle: "बारह राशि मासिक भाग्य, जनवरी से दिसंबर स्प्रेड",
    resultHint: "उस महीने की टैरो सलाह खोलने के लिए मासिक कार्ड दबाएँ.",
    detailPlaceholder: "उस महीने का भाग्य देखने के लिए मासिक कार्ड दबाएँ.",
    detailTitle: "जनवरी विस्तृत भाग्य",
    cardAlt: "इस महीने का टैरो कार्ड",
    monthlyCard: "महीने का कार्ड",
    oracleConsult: "विशेषज्ञ टैरो रीडिंग",
    spreadTitle: "इस महीने का तीन-पहलू स्प्रेड",
    tabs: { general: "मुख्य", relationship: "संबंध", money: "धन · काम", health: "स्वास्थ्य" },
    categoryTitle: "समग्र भाग्य व्याख्या",
    adviceTitle: "ओरेकल सारांश",
    share: "वर्षफल साझा करें",
    reset: "फिर से देखें",
    home: "होम पर जाएँ",
  },
  es: {
    closeLabel: "Cerrar",
    zodiacTitles: ["Rata", "Buey", "Tigre", "Conejo", "Dragón", "Serpiente", "Caballo", "Cabra", "Mono", "Gallo", "Perro", "Cerdo"],
    badge: "Fortuna anual del zodiaco",
    title: "Abrir la rueda del destino",
    subtitle: "Un año protegido por los doce guardianes celestiales. Extrae cartas de enero a diciembre para leer dinero, amor, relaciones y suerte en exámenes.",
    cta: "Sacar cartas del año",
    drawTitle: "Sacando tus cartas anuales",
    loadingText: "Los doce guardianes abren la puerta del año. Espera un momento.",
    resultTitle: "Fortuna mensual del zodiaco, tirada de enero a diciembre",
    resultHint: "Toca una carta mensual para abrir la consulta de tarot de ese mes.",
    detailPlaceholder: "Toca una carta mensual para ver la fortuna de ese mes.",
    detailTitle: "Fortuna detallada de enero",
    cardAlt: "Carta de tarot de este mes",
    monthlyCard: "Carta del mes",
    oracleConsult: "Lectura profesional de tarot",
    spreadTitle: "Tirada de tres aspectos de este mes",
    tabs: { general: "Clave", relationship: "Relaciones", money: "Dinero · Trabajo", health: "Salud" },
    categoryTitle: "Lectura general de fortuna",
    adviceTitle: "Resumen del oráculo",
    share: "Compartir fortuna",
    reset: "Leer de nuevo",
    home: "Ir al inicio",
  },
  fr: {
    closeLabel: "Fermer",
    zodiacTitles: ["Rat", "Bœuf", "Tigre", "Lapin", "Dragon", "Serpent", "Cheval", "Chèvre", "Singe", "Coq", "Chien", "Cochon"],
    badge: "Fortune annuelle du zodiaque",
    title: "Ouvrir la roue du destin",
    subtitle: "Une année gardée par les douze protecteurs célestes. Tirez les cartes de janvier à décembre pour lire argent, amour, relations et réussite aux examens.",
    cta: "Tirer les cartes de l'année",
    drawTitle: "Tirage des cartes annuelles",
    loadingText: "Les douze gardiens ouvrent la porte de l'année. Merci de patienter.",
    resultTitle: "Fortune mensuelle du zodiaque, tirage de janvier à décembre",
    resultHint: "Touchez une carte mensuelle pour ouvrir la consultation tarot du mois.",
    detailPlaceholder: "Touchez une carte mensuelle pour voir la fortune du mois.",
    detailTitle: "Fortune détaillée de janvier",
    cardAlt: "Carte de tarot du mois",
    monthlyCard: "Carte du mois",
    oracleConsult: "Lecture de tarot professionnelle",
    spreadTitle: "Tirage des trois aspects du mois",
    tabs: { general: "Clé", relationship: "Relations", money: "Argent · Travail", health: "Santé" },
    categoryTitle: "Lecture générale de fortune",
    adviceTitle: "Synthèse de l'oracle",
    share: "Partager la fortune",
    reset: "Relire",
    home: "Aller à l'accueil",
  },
  de: {
    closeLabel: "Schließen",
    zodiacTitles: ["Ratte", "Ochse", "Tiger", "Hase", "Drache", "Schlange", "Pferd", "Ziege", "Affe", "Hahn", "Hund", "Schwein"],
    badge: "Jahresglück des Tierkreises",
    title: "Das Rad des Schicksals öffnen",
    subtitle: "Ein Jahr, das von zwölf himmlischen Wächtern behütet wird. Ziehe Monatskarten von Januar bis Dezember für Geld, Liebe, Beziehungen und Prüfungsglück.",
    cta: "Jahreskarten ziehen",
    drawTitle: "Jahreskarten werden gezogen",
    loadingText: "Die zwölf Wächter öffnen das Tor des Jahres. Bitte warte kurz.",
    resultTitle: "Monatsglück des Tierkreises, Januar-bis-Dezember-Legung",
    resultHint: "Tippe auf eine Monatskarte, um die Tarotberatung des Monats zu öffnen.",
    detailPlaceholder: "Tippe auf eine Monatskarte, um das Monatsglück zu sehen.",
    detailTitle: "Detailliertes Januar-Glück",
    cardAlt: "Tarotkarte dieses Monats",
    monthlyCard: "Karte des Monats",
    oracleConsult: "Professionelle Tarot-Lesung",
    spreadTitle: "Drei-Aspekte-Legung dieses Monats",
    tabs: { general: "Kern", relationship: "Beziehung", money: "Geld · Arbeit", health: "Gesundheit" },
    categoryTitle: "Allgemeine Glücksdeutung",
    adviceTitle: "Orakel-Zusammenfassung",
    share: "Jahresglück teilen",
    reset: "Erneut lesen",
    home: "Zur Startseite",
  },
  nl: {
    closeLabel: "Sluiten",
    zodiacTitles: ["Rat", "Os", "Tijger", "Konijn", "Draak", "Slang", "Paard", "Geit", "Aap", "Haan", "Hond", "Varken"],
    badge: "Jaarfortuin van de dierenriem",
    title: "Open het wiel van bestemming",
    subtitle: "Een jaar bewaakt door twaalf hemelse beschermers. Trek maandkaarten van januari tot december voor geld, liefde, relaties en examengeluk.",
    cta: "Trek jaarkaarten",
    drawTitle: "Je jaarkaarten worden getrokken",
    loadingText: "De twaalf beschermers openen de poort van het jaar. Wacht heel even.",
    resultTitle: "Maandfortuin van de dierenriem, januari tot december spread",
    resultHint: "Tik op een maandkaart om de tarotconsultatie van die maand te openen.",
    detailPlaceholder: "Tik op een maandkaart om het maandfortuin te bekijken.",
    detailTitle: "Gedetailleerd januari-fortuin",
    cardAlt: "Tarotkaart van deze maand",
    monthlyCard: "Kaart van de maand",
    oracleConsult: "Professionele tarotlezing",
    spreadTitle: "Drie-aspecten spread van deze maand",
    tabs: { general: "Kern", relationship: "Relatie", money: "Geld · Werk", health: "Gezondheid" },
    categoryTitle: "Algemene fortuinlezing",
    adviceTitle: "Orakeloverzicht",
    share: "Jaarfortuin delen",
    reset: "Opnieuw lezen",
    home: "Naar home",
  },
  ms: {
    closeLabel: "Tutup",
    zodiacTitles: ["Tikus", "Lembu", "Harimau", "Arnab", "Naga", "Ular", "Kuda", "Kambing", "Monyet", "Ayam", "Anjing", "Babi"],
    badge: "Tuah tahunan zodiak",
    title: "Buka roda takdir",
    subtitle: "Setahun yang dijaga dua belas pelindung langit. Cabut kad bulanan dari Januari hingga Disember untuk membaca wang, cinta, hubungan dan tuah peperiksaan.",
    cta: "Cabut kad tahunan",
    drawTitle: "Kad tahunan sedang dicabut",
    loadingText: "Dua belas pelindung sedang membuka pintu tahun. Sila tunggu sebentar.",
    resultTitle: "Tuah bulanan zodiak, hamparan Januari hingga Disember",
    resultHint: "Ketik kad bulan untuk membuka bacaan tarot bulan itu.",
    detailPlaceholder: "Ketik kad bulan untuk melihat tuah bulan itu.",
    detailTitle: "Tuah terperinci Januari",
    cardAlt: "Kad tarot bulan ini",
    monthlyCard: "Kad bulan ini",
    oracleConsult: "Bacaan tarot profesional",
    spreadTitle: "Hamparan tiga aspek bulan ini",
    tabs: { general: "Teras", relationship: "Hubungan", money: "Wang · Kerja", health: "Kesihatan" },
    categoryTitle: "Bacaan tuah keseluruhan",
    adviceTitle: "Rumusan oracle",
    share: "Kongsi tuah",
    reset: "Baca semula",
    home: "Ke halaman utama",
  },
};

function ensureYearStyleSheet() {
  if (typeof document === "undefined") return;
  const existed = document.querySelector('link[data-tarot-year-style="1"]');
  if (existed) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = YEAR_STYLE_HREF;
  link.setAttribute("data-tarot-year-style", "1");
  document.head.appendChild(link);
}

function openYearExperienceWhenReady() {
  if (typeof window === "undefined") return;
  if (typeof window.openTarotYearFortuneModal === "function") {
    window.openTarotYearFortuneModal();
  }
}

export default function TarotYearFortuneClient() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = TAROT_YEAR_COPY[locale] || TAROT_YEAR_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
    ensureYearStyleSheet();
    openYearExperienceWhenReady();

    const timer = window.setInterval(() => {
      if (typeof window.openTarotYearFortuneModal === "function") {
        window.openTarotYearFortuneModal();
        window.clearInterval(timer);
      }
    }, 150);

    return () => {
      window.clearInterval(timer);
      try {
        // 레거시 경험 스크립트가 건 락만 청소 — ref-count 락(data-cd-scroll-lock)은 건드리지 않음
        if (!document.body.hasAttribute("data-cd-scroll-lock")) {
          document.body.style.overflow = "";
        }
      } catch {
        // no-op
      }
    };
  }, []);

  return (
    <>
      <Script src="/js/tarot-year-fortune-experience.js?v=20260629-no-llm-prompt" strategy="afterInteractive" onLoad={openYearExperienceWhenReady} />

      <div
        id="tarotYearFortuneOverlay"
        className="tarot-year-overlay"
        style={{ display: "none" }}
        data-action="closeTarotYearFortuneModal"
        data-action-self-only="1"
      >
        <div className="ty-eastern-pattern" aria-hidden="true" />
        <div className="ty-zodiac-silhouettes" aria-hidden="true">
          <span className="ty-zodiac-sil ty-zodiac-sil--1" title={copy.zodiacTitles[0]}>🐭</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--2" title={copy.zodiacTitles[1]}>🐮</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--3" title={copy.zodiacTitles[2]}>🐅</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--4" title={copy.zodiacTitles[3]}>🐇</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--5" title={copy.zodiacTitles[4]}>🐉</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--6" title={copy.zodiacTitles[5]}>🐍</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--7" title={copy.zodiacTitles[6]}>🐴</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--8" title={copy.zodiacTitles[7]}>🐐</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--9" title={copy.zodiacTitles[8]}>🐒</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--10" title={copy.zodiacTitles[9]}>🐓</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--11" title={copy.zodiacTitles[10]}>🐕</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--12" title={copy.zodiacTitles[11]}>🌸</span>
        </div>
        <div className="ty-bg-glow ty-bg-glow--1" aria-hidden="true" />
        <div className="ty-bg-glow ty-bg-glow--2" aria-hidden="true" />
        <div className="ty-particles" aria-hidden="true">
          <span className="ty-particle p1" />
          <span className="ty-particle p2" />
          <span className="ty-particle p3" />
          <span className="ty-particle p4" />
          <span className="ty-particle p5" />
          <span className="ty-particle p6" />
        </div>

        <div className="tarot-year-shell">
          <div className="tarot-year-panel">
            <button className="tarot-year-close" id="tarotYearCloseBtn" type="button" aria-label={copy.closeLabel}>
              ×
            </button>

            <section id="tarotYearFortuneIntroStage" className="tarot-year-stage is-active">
              <div className="ty-hero">
                <div className="ty-hero-badge">{copy.badge}</div>
                <h1 className="ty-hero-title">{copy.title}</h1>
                <p className="ty-hero-subtitle">
                  {copy.subtitle}
                </p>
                <button type="button" className="ty-cta-btn" id="tarotYearCtaBtn">
                  {copy.cta}
                </button>
              </div>
            </section>

            <section id="tarotYearFortuneDrawStage" className="tarot-year-stage">
              <div className="ty-loading-block">
                <h3 className="ty-draw-title">{copy.drawTitle}</h3>
                <p className="ty-loading-text">{copy.loadingText}</p>
                <div className="ty-loading-spinner" aria-hidden="true" />
              </div>
              <div id="tarotYearDrawCardGrid" className="ty-draw-grid" aria-hidden="true" />
            </section>

            <section id="tarotYearFortuneResultStage" className="tarot-year-stage">
              <header className="ty-result-header">
                <h2 className="ty-result-title">{copy.resultTitle}</h2>
              </header>
              <p className="ty-result-hint">{copy.resultHint}</p>
              <div className="ty-result-summary" id="tarotYearSummary" style={{ display: "none" }} />
              <div id="tarotYearResultCards" className="ty-result-cards" />

              <div id="tarotYearMonthDetailPanel" className="ty-month-detail-panel">
                <p className="ty-month-detail-placeholder" id="tarotYearMonthDetailPlaceholder">
                  {copy.detailPlaceholder}
                </p>

                <div id="tarotYearMonthDetailContent" className="ty-month-detail-content" style={{ display: "none" }}>
                  <h4 className="ty-month-detail-title" id="tarotYearMonthDetailTitle">
                    {copy.detailTitle}
                  </h4>

                  <div className="ty-month-oracle-hero">
                    <div className="ty-month-oracle-card" id="tarotYearMonthDetailCardWrap">
                      <img
                        id="tarotYearMonthDetailCardImg"
                        alt={copy.cardAlt}
                        loading="lazy"
                        decoding="async"
                        width={200}
                        height={300}
                      />
                    </div>
                    <div className="ty-month-oracle-meta">
                      <p className="ty-month-oracle-name" id="tarotYearMonthDetailCardName">
                        {copy.monthlyCard}
                      </p>
                      <p className="ty-month-oracle-consult">{copy.oracleConsult}</p>
                    </div>
                  </div>

                  <div className="ty-month-spread-wrap">
                    <h5 className="ty-month-spread-title">{copy.spreadTitle}</h5>
                    <div className="ty-month-spread-cards" id="tarotYearMonthSpreadCards" />
                  </div>

                  <div className="ty-month-category-tabs" id="tarotYearMonthCategoryTabs">
                    <button type="button" className="ty-month-cat-btn is-active" data-cat="general">
                      {copy.tabs.general}
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="relationship">
                      {copy.tabs.relationship}
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="money">
                      {copy.tabs.money}
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="health">
                      {copy.tabs.health}
                    </button>
                  </div>

                  <div className="ty-month-category-panel">
                    <h6 className="ty-month-category-title" id="tarotYearMonthCategoryTitle">
                      {copy.categoryTitle}
                    </h6>
                    <p className="ty-month-category-text" id="tarotYearMonthCategoryText" />
                  </div>
                </div>
              </div>

              <div className="ty-advice-section">
                <h4 className="ty-advice-title">{copy.adviceTitle}</h4>
                <p className="ty-advice-text" id="tarotYearFinalAdvice" />
              </div>

              <div className="ty-result-actions">
                <button type="button" className="ty-result-btn" id="tarotYearShareBtn">
                  {copy.share}
                </button>
                <button type="button" className="ty-result-btn ty-result-btn--outline" id="tarotYearResetBtn">
                  {copy.reset}
                </button>
                <button type="button" className="ty-result-btn ty-result-btn--outline ty-result-btn--home" id="tarotYearHomeBtn">
                  {copy.home}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
