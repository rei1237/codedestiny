"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLocalizedServiceSections } from "../_lib/serviceSections";
import FeatureSymbol from "./icons/FeatureSymbol";
import DestinyIcon from "./icons/DestinyIcon";

const HOME_SERVICE_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof HOME_SERVICE_LOCALES)[number];

function normalizeHomeServiceLocale(value?: string | null): LoadingLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return HOME_SERVICE_LOCALES.includes(base as LoadingLocale) ? (base as LoadingLocale) : "ko";
}

function getCurrentHomeServiceLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeHomeServiceLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeHomeServiceLocale(stored);
  } catch {}
  return normalizeHomeServiceLocale(document.documentElement.lang || navigator.language);
}

const MAIN_ACTION_ROUTE_MAP: Record<string, string> = {
  "/saju/basic": "/saju/basic",
  "/manse": "/index.html",
  "/compatibility": "/index.html?action=runCompat",
  "/tarot/mingri": "/tarot/mingri",
  "/ziwei/chart": "/ziwei/chart",
  "/oracle/sukuyo": "/oracle/sukuyo",
  "/astrology/cosmic": "/astrology/cosmic",
  "/vedic/jyotish": "/vedic/jyotish",
  "/dream": "/index.html?action=openDreamModal",
  "/animal/physio": "/index.html?action=openPhysiognomyApp",
  "/premium": "/index.html",
  "/ifa-oracle.html": "/ifa-oracle.html",
  "/oracle/royal-tea": "/index.html?action=openRoyalTeaOracle",
  "/oracle/sikojen-povailu": "/index.html?action=openSikojenPovailu",
  "/flower/destiny": "/index.html?action=openDestinyFlowerStudio",
  "/dream/tarot": "/index.html?action=openDreamModal",
  "/saju/sibyl": "/saju/sibyl",
  "/life-book-ai": "/life-book-ai",
  "/love-secret-ai": "/love-secret-ai",
  "/naming-ai": "/naming-ai",
  "/saju/love-simulation": "/saju/love-simulation",
  "/saju/destiny-bias": "/index.html?action=openDestinyBias",
  "/saju/animal-destiny": "/saju/animal-destiny",
  "/saju/destiny-meeting-place": "/saju/destiny-meeting-place",
  "/tarot/love": "/tarot/love",
  "/tarot/healing": "/index.html?action=openTarotHealingModal",
  "/tarot/self-esteem": "/tarot/self-esteem",
  "/tarot/reunion": "/tarot/reunion",
  "/tarot/prompt-maker": "/tarot/prompt-maker",
  "/tarot/year": "/tarot/year",
  "/tarot/crystal-soul/": "/index.html?action=startCrystalSoulTarot",
  "/tarot/mindscan/": "/index.html?action=startMindScanTarot",
  "/celestial-harmony.html": "/index.html?action=openCelestialHarmony",
  "/tarot-ijik.html": "/index.html?action=startIjikTarot",
  "/oracle/hwatu": "/oracle/hwatu",
  "/oracle/hwatu-life": "/index.html?action=openHwatuModal",
  "/oracle/kemet": "/index.html?action=openKemetModal",
  "/oracle/juyuk": "/oracle/juyuk",
  "/geomancy-oracle-v4.html": "/index.html?action=openGeomancyOracle",
  "/royal-tea-oracle.html": "/index.html?action=openRoyalTeaOracle",
  "/destiny-poker.html": "/index.html",
  "/dream/psycho": "/index.html?action=openPsychoDreamModal",
  "/secret-house_real.html": "/index.html?action=openSecretHouseRoute",
  "/animal/mbti": "/index.html?action=openMbtiModal",
  "/animal/totem": "/index.html?action=openAnimalTotemModal",
  "/flower/astrology": "/index.html?action=openAstrologyFlowerStudio",
  "/flower/jamidusu": "/index.html?action=openJamidusuFlowerStudio",
  "/flower/sukuyo": "/index.html?action=openSukuyoFlowerStudio",
  "/ziwei": "/index.html?action=openZiweiModal",
  "/astrology": "/index.html?action=openAstroModal",
  "/sukuyo": "/index.html?action=openSukuyoModal",
  "/vedic": "/index.html?action=navigateToVedic",
};

function toMainActionHref(href: string): string {
  return MAIN_ACTION_ROUTE_MAP[href] || "/index.html";
}

type Props = {
  /** When legacy iframe is above, hide redundant “open legacy” CTA and shorten copy. */
  variant?: "default" | "belowLegacy";
};

const HOME_SERVICE_COPY: Record<LoadingLocale, {
  title: string;
  defaultIntro: string;
  belowLegacyIntro: string;
  legacyCta: string;
  legacyNote: string;
  quickTitle: string;
  quickLinks: Array<{ href: string; label: string }>;
}> = {
  ko: {
    title: "꿀꿀 만세력",
    defaultIntro: "무료 사주 만세력·자미두수·명리학 타로·점성술·주역·숙요점·화투점·동물 관상·MBTI 궁합·운명의 꽃·드림 타로 등 운세 서비스를 한곳에서 이용할 수 있습니다. 아래 카테고리에서 원하는 항목을 눌러 네이티브 페이지로 이동하세요.",
    belowLegacyIntro: "위 화면에서 기존 메인과 동일하게 카드·모달로 이용할 수 있습니다. 검색·내부 링크용으로 서비스별 네이티브 페이지로 바로 갈 수 있는 목록입니다.",
    legacyCta: "전체 기능 화면 열기 (레거시 메인)",
    legacyNote: "카드·모달이 한 화면에 모여 있는 기존 메인입니다.",
    quickTitle: "사주 외 신비 운세 바로가기",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "이파 오라클" },
      { href: "/oracle/royal-tea", label: "타세오그래피" },
      { href: "/oracle/sikojen-povailu", label: "핀란드 주석점" },
      { href: "/flower/destiny", label: "운명의 꽃" },
      { href: "/dream/tarot", label: "드림 타로" },
    ],
  },
  en: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Use free Saju, Zi Wei Dou Shu, Myeongri Tarot, astrology, I Ching, Sukuyo, Hwatu, animal face reading, MBTI compatibility, Destiny Flower, Dream Tarot, and more in one place. Choose a category below to open the native page.",
    belowLegacyIntro: "The screen above still opens the same cards and modals as the legacy main. This list provides direct native pages for search and internal links.",
    legacyCta: "Open all features screen (legacy main)",
    legacyNote: "The legacy main gathers cards and modals on one screen.",
    quickTitle: "Mystic fortunes beyond Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Ifa Oracle" },
      { href: "/oracle/royal-tea", label: "Tasseography" },
      { href: "/oracle/sikojen-povailu", label: "Finnish Tin Oracle" },
      { href: "/flower/destiny", label: "Destiny Flower" },
      { href: "/dream/tarot", label: "Dream Tarot" },
    ],
  },
  ja: {
    title: "クルクル万歳暦",
    defaultIntro: "無料の四柱推命万歳暦、紫微斗数、命理タロット、占星術、易経、宿曜、花札占い、どうぶつ人相、MBTI相性、運命の花、ドリームプロンプトなどを一か所で利用できます。下のカテゴリから見たい項目を開いてください。",
    belowLegacyIntro: "上の画面では、従来メインと同じカード・モーダル機能を使えます。検索と内部リンク用に、サービス別のネイティブページへ直接移動できる一覧です。",
    legacyCta: "全機能画面を開く（レガシーメイン）",
    legacyNote: "カードとモーダルが一画面にまとまった従来メインです。",
    quickTitle: "四柱推命以外の神秘占いへ",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "イファオラクル" },
      { href: "/oracle/royal-tea", label: "タッセオグラフィー" },
      { href: "/oracle/sikojen-povailu", label: "フィンランド錫占い" },
      { href: "/flower/destiny", label: "運命の花" },
      { href: "/dream/tarot", label: "ドリームプロンプト" },
    ],
  },
  "zh-CN": {
    title: "Kkulkkul 万年历",
    defaultIntro: "可在一处使用免费八字万年历、紫微斗数、命理塔罗、占星术、周易、宿曜、花札占、动物面相、MBTI合盘、命运之花、梦境提示词等运势服务。请选择下方分类进入对应页面。",
    belowLegacyIntro: "上方画面仍可像旧版主页一样使用卡片与弹窗。这里提供按服务区分的原生页面链接，便于搜索和内部跳转。",
    legacyCta: "打开全部功能画面（旧版主页）",
    legacyNote: "旧版主页会把卡片与弹窗集中在同一个画面。",
    quickTitle: "八字以外的神秘运势",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Ifa 神谕" },
      { href: "/oracle/royal-tea", label: "茶叶占卜" },
      { href: "/oracle/sikojen-povailu", label: "芬兰锡占" },
      { href: "/flower/destiny", label: "命运之花" },
      { href: "/dream/tarot", label: "梦境塔罗" },
    ],
  },
  "zh-TW": {
    title: "Kkulkkul 萬年曆",
    defaultIntro: "可在一處使用免費八字萬年曆、紫微斗數、命理塔羅、占星術、周易、宿曜、花札占、動物面相、MBTI合盤、命運之花、夢境提示詞等運勢服務。請選擇下方分類進入對應頁面。",
    belowLegacyIntro: "上方畫面仍可像舊版首頁一樣使用卡片與彈窗。這裡提供按服務區分的原生頁面連結，便於搜尋和內部跳轉。",
    legacyCta: "開啟全部功能畫面（舊版首頁）",
    legacyNote: "舊版首頁會把卡片與彈窗集中在同一個畫面。",
    quickTitle: "八字以外的神秘運勢",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Ifa 神諭" },
      { href: "/oracle/royal-tea", label: "茶葉占卜" },
      { href: "/oracle/sikojen-povailu", label: "芬蘭錫占" },
      { href: "/flower/destiny", label: "命運之花" },
      { href: "/dream/tarot", label: "夢境塔羅" },
    ],
  },
  vi: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Dùng Saju miễn phí, Tử Vi, Myeongri Tarot, chiêm tinh, Kinh Dịch, Sukuyo, Hwatu, xem tướng động vật, tương hợp MBTI, Destiny Flower, Dream Tarot và nhiều dịch vụ vận may khác tại một nơi.",
    belowLegacyIntro: "Màn hình phía trên vẫn mở thẻ và modal giống trang chính cũ. Danh sách này dẫn thẳng đến từng trang native cho tìm kiếm và liên kết nội bộ.",
    legacyCta: "Mở toàn bộ tính năng (main cũ)",
    legacyNote: "Main cũ gom thẻ và modal trên cùng một màn hình.",
    quickTitle: "Vận may huyền bí ngoài Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Oracle Ifa" },
      { href: "/oracle/royal-tea", label: "Bói lá trà" },
      { href: "/oracle/sikojen-povailu", label: "Bói thiếc Phần Lan" },
      { href: "/flower/destiny", label: "Hoa định mệnh" },
      { href: "/dream/tarot", label: "Gợi ý giấc mơ" },
    ],
  },
  hi: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "मुफ्त Saju, Zi Wei, Myeongri Tarot, ज्योतिष, I Ching, Sukuyo, Hwatu, पशु-चेहरा रीडिंग, MBTI संगति, Destiny Flower, Dream Tarot और अन्य भाग्य सेवाएँ एक ही जगह उपलब्ध हैं.",
    belowLegacyIntro: "ऊपर की स्क्रीन पुराने मुख्य पेज की तरह कार्ड और मोडल खोलती है. यह सूची खोज और आंतरिक लिंक के लिए सीधे native पेजों तक ले जाती है.",
    legacyCta: "सभी सुविधाएँ खोलें (पुराना मुख्य पेज)",
    legacyNote: "पुराना मुख्य पेज कार्ड और मोडल को एक ही स्क्रीन पर रखता है.",
    quickTitle: "Saju से आगे की रहस्यमय रीडिंग",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Ifa Oracle" },
      { href: "/oracle/royal-tea", label: "चाय-पत्ती ओरेकल" },
      { href: "/oracle/sikojen-povailu", label: "फ़िनिश टिन ओरेकल" },
      { href: "/flower/destiny", label: "नियति का फूल" },
      { href: "/dream/tarot", label: "स्वप्न प्रॉम्प्ट" },
    ],
  },
  es: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Usa Saju gratis, Zi Wei, Myeongri Tarot, astrología, I Ching, Sukuyo, Hwatu, lectura animal, compatibilidad MBTI, Destiny Flower, Dream Tarot y más en un solo lugar.",
    belowLegacyIntro: "La pantalla superior abre las mismas tarjetas y modales que el main heredado. Esta lista lleva directo a páginas nativas para búsqueda y enlaces internos.",
    legacyCta: "Abrir pantalla de funciones (main heredado)",
    legacyNote: "El main heredado reúne tarjetas y modales en una pantalla.",
    quickTitle: "Fortunas místicas más allá de Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Oráculo Ifá" },
      { href: "/oracle/royal-tea", label: "Lectura de té" },
      { href: "/oracle/sikojen-povailu", label: "Oráculo finlandés de estaño" },
      { href: "/flower/destiny", label: "Flor del destino" },
      { href: "/dream/tarot", label: "Prompt de sueños" },
    ],
  },
  fr: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Utilisez Saju gratuit, Zi Wei, Myeongri Tarot, astrologie, Yi Jing, Sukuyo, Hwatu, lecture animale, compatibilité MBTI, Destiny Flower, Dream Tarot et plus au même endroit.",
    belowLegacyIntro: "L'écran ci-dessus ouvre les mêmes cartes et modales que l'ancien main. Cette liste mène aux pages natives pour la recherche et les liens internes.",
    legacyCta: "Ouvrir toutes les fonctions (ancien main)",
    legacyNote: "L'ancien main rassemble cartes et modales sur un seul écran.",
    quickTitle: "Oracles mystiques au-delà de Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Oracle Ifa" },
      { href: "/oracle/royal-tea", label: "Lecture des feuilles de thé" },
      { href: "/oracle/sikojen-povailu", label: "Oracle finlandais de l'étain" },
      { href: "/flower/destiny", label: "Fleur du destin" },
      { href: "/dream/tarot", label: "Prompt de rêve" },
    ],
  },
  de: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Nutze kostenloses Saju, Zi Wei, Myeongri Tarot, Astrologie, I Ging, Sukuyo, Hwatu, Tiergesichtlesen, MBTI-Kompatibilität, Destiny Flower, Dream Tarot und mehr an einem Ort.",
    belowLegacyIntro: "Der obere Bereich öffnet Karten und Modals wie der alte Main. Diese Liste führt für Suche und interne Links direkt zu nativen Seiten.",
    legacyCta: "Alle Funktionen öffnen (alter Main)",
    legacyNote: "Der alte Main sammelt Karten und Modals auf einem Bildschirm.",
    quickTitle: "Mystische Orakel jenseits von Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Ifa-Orakel" },
      { href: "/oracle/royal-tea", label: "Teeblatt-Orakel" },
      { href: "/oracle/sikojen-povailu", label: "Finnisches Zinnorakel" },
      { href: "/flower/destiny", label: "Blume des Schicksals" },
      { href: "/dream/tarot", label: "Traum-Prompt" },
    ],
  },
  nl: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Gebruik gratis Saju, Zi Wei, Myeongri Tarot, astrologie, I Tjing, Sukuyo, Hwatu, dierlijke gezichtslezing, MBTI-compatibiliteit, Destiny Flower, Dream Tarot en meer op één plek.",
    belowLegacyIntro: "Het scherm hierboven opent dezelfde kaarten en modals als de legacy main. Deze lijst leidt direct naar native pagina's voor zoeken en interne links.",
    legacyCta: "Alle functies openen (legacy main)",
    legacyNote: "De legacy main verzamelt kaarten en modals op één scherm.",
    quickTitle: "Mystieke lezingen buiten Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Ifa-orakel" },
      { href: "/oracle/royal-tea", label: "Theebladlezing" },
      { href: "/oracle/sikojen-povailu", label: "Fins tinorakel" },
      { href: "/flower/destiny", label: "Bloem van bestemming" },
      { href: "/dream/tarot", label: "Droomprompt" },
    ],
  },
  ms: {
    title: "Kkulkkul Manse Calendar",
    defaultIntro: "Gunakan Saju percuma, Zi Wei, Myeongri Tarot, astrologi, I Ching, Sukuyo, Hwatu, bacaan wajah haiwan, keserasian MBTI, Destiny Flower, Dream Tarot dan banyak lagi di satu tempat.",
    belowLegacyIntro: "Skrin di atas membuka kad dan modal seperti main lama. Senarai ini membawa terus ke halaman native untuk carian dan pautan dalaman.",
    legacyCta: "Buka semua fungsi (main lama)",
    legacyNote: "Main lama mengumpulkan kad dan modal pada satu skrin.",
    quickTitle: "Nasib mistik selain Saju",
    quickLinks: [
      { href: "/ifa-oracle.html", label: "Oracle Ifa" },
      { href: "/oracle/royal-tea", label: "Bacaan daun teh" },
      { href: "/oracle/sikojen-povailu", label: "Oracle timah Finland" },
      { href: "/flower/destiny", label: "Bunga takdir" },
      { href: "/dream/tarot", label: "Prompt mimpi" },
    ],
  },
};

function resolveLocaleFromPath(pathname: string | null): LoadingLocale {
  const firstSegment = (pathname || "").split("/").filter(Boolean)[0];
  return firstSegment ? normalizeHomeServiceLocale(firstSegment) : "ko";
}

/**
 * Native hub: crawlable links + visible copy. On home, usually shown below legacy iframe.
 */
export default function HomeServiceSections({ variant = "default" }: Props) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<LoadingLocale>(() => resolveLocaleFromPath(pathname));
  const belowLegacy = variant === "belowLegacy";
  const cleanTitle = (raw: string) => raw.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const copy = HOME_SERVICE_COPY[locale] || HOME_SERVICE_COPY.ko;
  const serviceSections = getLocalizedServiceSections(locale);
  const mysticQuickLinks = copy.quickLinks;

  useEffect(() => {
    const fromPath = resolveLocaleFromPath(pathname);
    setLocale(fromPath === "ko" ? getCurrentHomeServiceLocale() : fromPath);
  }, [pathname]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="home-hub-title">
      <header className="mb-6 rounded-3xl border border-violet-300/30 bg-[linear-gradient(140deg,rgba(45,25,85,0.72),rgba(22,30,70,0.86))] p-5 text-slate-100 shadow-[0_20px_44px_rgba(16,10,35,0.42)]">
        <h1 id="home-hub-title" className="text-2xl font-semibold">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {belowLegacy ? copy.belowLegacyIntro : copy.defaultIntro}
        </p>
        {!belowLegacy ? (
          <p className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-amber-500/90 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              {copy.legacyCta}
            </Link>
            <span className="self-center text-xs text-slate-500">
              {copy.legacyNote}
            </span>
          </p>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-200/90">
            <DestinyIcon name="sparkleLine" size={14} className="text-violet-100" variant="soft" />
            {copy.quickTitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {mysticQuickLinks.map((item) => (
              <Link
                key={item.href}
                href={toMainActionHref(item.href)}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/35 bg-violet-900/35 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:border-cyan-300/45 hover:text-cyan-100"
              >
                <FeatureSymbol route={item.href} size={14} className="text-violet-100" variant="soft" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {serviceSections.map((section) => (
          <article key={section.id} className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(170deg,rgba(10,18,48,0.92),rgba(22,14,40,0.86))] p-4 shadow-[0_14px_30px_rgba(8,10,24,0.35)]">
            <h2 className="mb-3 text-lg font-semibold text-violet-100">{section.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={toMainActionHref(item.href)}
                  className="group overflow-hidden rounded-2xl border border-violet-300/20 bg-[linear-gradient(160deg,rgba(39,26,67,0.72),rgba(25,34,64,0.72))] transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-[0_10px_24px_rgba(34,211,238,0.15)]"
                >
                  {item.image ? (
                    <div className="relative h-36 border-b border-white/10">
                      <Image
                        src={item.image}
                        alt={item.alt || item.title}
                        width={640}
                        height={360}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,26,0.08),rgba(9,10,26,0.72))]" />
                      <span className="absolute left-3 top-3 inline-flex rounded-full border border-cyan-200/30 bg-cyan-400/15 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-cyan-100 backdrop-blur">
                        NEW
                      </span>
                    </div>
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-50">
                      <FeatureSymbol route={item.href} size={15} className="text-violet-100" variant="soft" />
                      {cleanTitle(item.title)}
                    </div>
                    <div className="mt-1 text-xs text-violet-100/75">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

