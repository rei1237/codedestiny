import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const TAROT_YEAR_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "십이지신 천운 타로 - 열두 달의 선택 리듬",
    description: "열두 수호 리듬과 12장의 카드를 엮어 한 해의 상승 구간, 쉬어갈 달, 월별 선택의 결을 차분히 읽습니다.",
  },
  en: {
    title: "Twelve Zodiac Heavenly Luck Tarot - Guardian Rhythm of the Year",
    description: "Read the rising periods, months that need pacing, and monthly choices of the year through twelve guardian energies and twelve cards.",
  },
  ja: {
    title: "十二支天運タロット - 12か月の守護リズム",
    description: "十二の守護の気と12枚のカードを結び、一年の上昇期、速度調整が必要な月、月別の選択の質を読みます。",
  },
} as const;

const META = {
  path: "/tarot/year",
  title: TAROT_YEAR_PAGE_TEXT_TRANSLATIONS.ko.title,
  description: TAROT_YEAR_PAGE_TEXT_TRANSLATIONS.ko.description,
  keywords: ["십이지신 천운", "연간 운세 타로", "12개월 타로", "월별 타로", "재물운", "연애운"],
  image: "https://code-destiny.com/fuctionassets/12animals.webp",
  featureList: ["열두 달의 수호 리듬", "상승과 쉬어갈 달", "월별 선택의 작은 기준"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotYearLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "십이지신 천운 타로",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "열두 장의 카드가 한 해의 리듬과 월별 선택의 기준을 차례로 비춥니다.",
        localized: {
          en: {
            title: "Twelve Zodiac Heavenly Luck Tarot - Guardian Rhythm of the Year",
            h1: "Twelve Zodiac Heavenly Luck Tarot",
            description:
              "Read the rising periods of the year, months that need pace control, and the texture of monthly choices through twelve guardian energies and 12 cards.",
            landingPoints: ["Guardian rhythm of twelve months", "Months of rise and pace control", "Small rituals for monthly choices"],
            seoText: "The reading starts from the main launcher.",
          },
          ja: {
            title: "十二支天運タロット - 12か月の守護リズム",
            h1: "十二支天運タロット",
            description:
              "十二の守護の気配と12枚のタロットを重ね、一年の上昇期、速度調整が必要な月、月ごとの選択の流れを読みます。",
            landingPoints: ["12か月の守護リズム", "上昇と速度調整の月", "月ごとの選択の小さな儀式"],
            seoText: "リーディングはメインランチャーから始まります。",
          },
          "zh-CN": {
            title: "十二生肖天运塔罗 - 十二个月的守护节奏",
            h1: "十二生肖天运塔罗",
            description:
              "结合十二守护能量与12张牌，读取一年中的上升阶段、需要放慢脚步的月份，以及每月选择的纹理。",
            landingPoints: ["十二个月的守护节奏", "上升与调速月份", "每月选择的小仪式"],
            seoText: "阅读将在主启动器中进行。",
          },
          "zh-TW": {
            title: "十二生肖天運塔羅 - 十二個月的守護節奏",
            h1: "十二生肖天運塔羅",
            description:
              "結合十二守護能量與12張牌，讀取一年中的上升階段、需要放慢腳步的月份，以及每月選擇的紋理。",
            landingPoints: ["十二個月的守護節奏", "上升與調速月份", "每月選擇的小儀式"],
            seoText: "閱讀將在主啟動器中進行。",
          },
          vi: {
            title: "Tarot thiên vận 12 con giáp - Nhịp hộ mệnh của mười hai tháng",
            h1: "Tarot thiên vận 12 con giáp",
            description:
              "Kết nối mười hai năng lượng hộ mệnh và 12 lá bài để đọc giai đoạn đi lên trong năm, tháng cần chỉnh tốc độ và sắc thái lựa chọn theo từng tháng.",
            landingPoints: ["Nhịp hộ mệnh của mười hai tháng", "Tháng đi lên và tháng cần chỉnh tốc", "Nghi thức nhỏ cho lựa chọn hằng tháng"],
            seoText: "Bài đọc được bắt đầu từ launcher chính.",
          },
          hi: {
            title: "बारह राशि स्वर्गीय भाग्य टैरो - वर्ष की संरक्षक लय",
            h1: "बारह राशि स्वर्गीय भाग्य टैरो",
            description:
              "बारह संरक्षक ऊर्जाओं और 12 कार्डों से वर्ष के उभरते समय, गति संभालने वाले महीनों और मासिक चुनावों की परत पढ़ें.",
            landingPoints: ["बारह महीनों की संरक्षक लय", "उभार और गति समायोजन के महीने", "मासिक चुनावों के छोटे अनुष्ठान"],
            seoText: "रीडिंग मुख्य लॉन्चर से शुरू होती है.",
          },
          es: {
            title: "Tarot de suerte celestial de los doce animales - Ritmo guardián del año",
            h1: "Tarot de suerte celestial de los doce animales",
            description:
              "Lee los periodos de ascenso del año, los meses que piden regular el ritmo y la textura de las elecciones mensuales con doce energías guardianas y 12 cartas.",
            landingPoints: ["Ritmo guardián de doce meses", "Meses de ascenso y ajuste de ritmo", "Pequeños rituales de elección mensual"],
            seoText: "La lectura se inicia desde el lanzador principal.",
          },
          fr: {
            title: "Tarot de chance céleste des douze animaux - Rythme gardien de l'année",
            h1: "Tarot de chance céleste des douze animaux",
            description:
              "Lisez les périodes d'ascension de l'année, les mois qui demandent un ajustement du rythme et la texture des choix mensuels avec douze énergies gardiennes et 12 cartes.",
            landingPoints: ["Rythme gardien des douze mois", "Mois d'ascension et d'ajustement", "Petits rituels de choix mensuels"],
            seoText: "La lecture démarre depuis le lanceur principal.",
          },
          de: {
            title: "Zwölf-Tierkreis-Himmelsglück-Tarot - Schutzrhythmus des Jahres",
            h1: "Zwölf-Tierkreis-Himmelsglück-Tarot",
            description:
              "Lies mit zwölf Schutzenergien und 12 Karten die Aufstiegsphasen des Jahres, Monate für Tempokontrolle und die Struktur monatlicher Entscheidungen.",
            landingPoints: ["Schutzrhythmus der zwölf Monate", "Monate für Aufstieg und Tempokontrolle", "Kleine Rituale für Monatsentscheidungen"],
            seoText: "Die Lesung startet im Haupt-Launcher.",
          },
          nl: {
            title: "Twaalf dierenriem hemels geluk tarot - Bewakersritme van het jaar",
            h1: "Twaalf dierenriem hemels geluk tarot",
            description:
              "Lees met twaalf bewakersenergieën en 12 kaarten de stijgende perioden van het jaar, maanden die tempo vragen en de textuur van maandelijkse keuzes.",
            landingPoints: ["Bewakersritme van twaalf maanden", "Maanden van groei en tempoafstemming", "Kleine rituelen voor maandkeuzes"],
            seoText: "De reading start vanuit de hoofdlauncher.",
          },
          ms: {
            title: "Tarot nasib langit 12 zodiak - Ritma penjaga setahun",
            h1: "Tarot nasib langit 12 zodiak",
            description:
              "Baca fasa naik sepanjang tahun, bulan yang memerlukan kawalan rentak dan tekstur pilihan bulanan melalui dua belas tenaga penjaga dan 12 kad.",
            landingPoints: ["Ritma penjaga dua belas bulan", "Bulan naik dan bulan laras rentak", "Ritual kecil untuk pilihan bulanan"],
            seoText: "Bacaan bermula daripada pelancar utama.",
          },
        },
      }}
    />
  );
}
