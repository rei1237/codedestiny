import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
// 🔴 12개월 흐름은 손으로 옮겨 적지 않는다. 이 배열이 실제 리딩이 쓰는 값이고,
// 여기서 파생시켜야 리딩과 랜딩 문구가 어긋나지 않는다(서버 컴포넌트라 모듈 자체는
// 클라이언트 번들에 들어가지 않고, 아래에서 뽑은 문자열만 직렬화된다).
import { YEAR_PHASES } from "../../../lib/tarot/tarot-year-data.mjs";

const TAROT_YEAR_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "십이지신 천운 타로 - 1년의 방향과 전환점",
    description: "십이지신의 상징과 12장의 타로를 엮어 올해의 핵심 카드, 12개월 흐름, 분야별 운세와 현실적인 선택 기준을 읽습니다.",
  },
  en: {
    title: "Twelve Zodiac Heavenly Luck Tarot - Your Yearly Direction",
    description: "Combine twelve guardian symbols with twelve tarot cards to read the year's core card, monthly flow, turning points, and grounded choices.",
  },
  ja: {
    title: "十二支天運タロット - 1年の方向と転換点",
    description: "十二支の象徴と12枚のタロットを重ね、今年の核心カード、月ごとの流れ、転換点、現実的な選択を読み解きます。",
  },
} as const;

const META = {
  path: "/tarot/year",
  title: TAROT_YEAR_PAGE_TEXT_TRANSLATIONS.ko.title,
  description: TAROT_YEAR_PAGE_TEXT_TRANSLATIONS.ko.description,
  keywords: ["십이지신 천운", "연간 운세 타로", "12개월 타로", "월별 타로", "재물운", "연애운"],
  image: "https://code-destiny.com/fuctionassets/12animals.webp",
  featureList: ["올해의 핵심 카드와 1년 총운", "1월부터 12월까지 월별 카드 리딩", "금전·일·관계·건강·성장운", "십이지신 상징과 타로의 결합", "올해의 전환점과 귀인운", "저장 후 다시 보는 프리미엄 결과"],
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
        seoText: "열두 장의 카드가 한 해의 핵심 주제와 월별 선택 기준, 분야별 흐름과 전환점을 차례로 비춥니다.",
        valueGuideTitle: "1만원 상담에 담긴 내용",
        valueSections: [
          { title: "한 해 전체를 하나의 흐름으로", body: "오늘의 기분만 보는 운세가 아니라 올해의 핵심 카드, 반복되는 주제, 강한 시기와 속도를 조절할 시기를 연결해 읽습니다." },
          { title: "12개월과 8개 분야의 구체적인 리딩", body: "매월 카드와 십이지신 상징을 함께 해석하고 금전·일·연애·건강·가족·성장·귀인·주의점을 분야별로 정리합니다." },
          { title: "저장하고 다시 꺼내 보는 결과", body: "결과는 계정에 저장되어 새로고침이나 재방문 뒤에도 다시 확인할 수 있습니다. 운세를 결론이 아니라 선택을 점검하는 방향서로 활용해 보세요." },
          ...YEAR_PHASES.map((phase: { month: number; phase: string; keyword: string; flow: string }) => ({
            title: `${phase.month}월 · ${phase.phase}`,
            body: `${phase.keyword} — ${phase.flow}`,
          })),
        ],
        localized: {
          en: {
            title: "Twelve Zodiac Heavenly Luck Tarot - Guardian Rhythm of the Year",
            h1: "Twelve Zodiac Heavenly Luck Tarot",
            description:
              "Read the rising periods of the year, months that need pace control, and the texture of monthly choices through twelve guardian energies and 12 cards.",
            landingPoints: ["Guardian rhythm of twelve months", "Months of rise and pace control", "Small rituals for monthly choices"],
            seoText: "The reading connects a yearly theme, twelve monthly cards, category guidance, and turning points.",
            valueGuideTitle: "What the premium reading includes",
            valueSections: [
              { title: "A complete yearly arc", body: "Read the year's core card, recurring themes, strong periods, and moments that ask for a slower pace as one connected story." },
              { title: "Twelve months and practical categories", body: "Each month combines a guardian symbol with a tarot card, followed by guidance for money, work, love, health, growth, and relationships." },
              { title: "A result you can revisit", body: "Your completed reading is saved to your account so you can return to it after a refresh or on a later visit." },
            ],
          },
          ja: {
            title: "十二支天運タロット - 12か月の守護リズム",
            h1: "十二支天運タロット",
            description:
              "十二の守護の気配と12枚のタロットを重ね、一年の上昇期、速度調整が必要な月、月ごとの選択の流れを読みます。",
            landingPoints: ["12か月の守護リズム", "上昇と速度調整の月", "月ごとの選択の小さな儀式"],
            seoText: "核心カード、12か月の流れ、分野別の助言、転換点を一つの年間リーディングにまとめます。",
            valueGuideTitle: "プレミアムリーディングの内容",
            valueSections: [
              { title: "1年を一つの物語として", body: "今年の核心カード、繰り返すテーマ、伸びる時期、速度を調整する時期をつなげて読みます。" },
              { title: "12か月と分野別の助言", body: "各月の守護象徴とカードを重ね、金運・仕事・恋愛・健康・成長・人間関係を整理します。" },
              { title: "保存して再読できる結果", body: "完成したリーディングはアカウントに保存され、再訪時にも確認できます。" },
            ],
          },
          "zh-CN": {
            title: "十二生肖天运塔罗 - 十二个月的守护节奏",
            h1: "十二生肖天运塔罗",
            description:
              "结合十二守护能量与12张牌，读取一年中的上升阶段、需要放慢脚步的月份，以及每月选择的纹理。",
            landingPoints: ["十二个月的守护节奏", "上升与调速月份", "每月选择的小仪式"],
            seoText: "将核心牌、十二个月的走势、分类建议与年度转折点整理成一份完整的年运塔罗阅读。",
            valueGuideTitle: "高级阅读包含的内容",
            valueSections: [
              { title: "把一年读成一条完整的线索", body: "连接年度核心牌、反复出现的主题、上升阶段与需要调整节奏的月份。" },
              { title: "十二个月与实际领域", body: "每个月结合生肖守护象征与塔罗牌，并整理财运、工作、关系、健康与成长方向。" },
              { title: "保存后再次查看", body: "完成的结果会保存到账号中，刷新或再次访问时也可以继续阅读。" },
            ],
          },
          "zh-TW": {
            title: "十二生肖天運塔羅 - 十二個月的守護節奏",
            h1: "十二生肖天運塔羅",
            description:
              "結合十二守護能量與12張牌，讀取一年中的上升階段、需要放慢腳步的月份，以及每月選擇的紋理。",
            landingPoints: ["十二個月的守護節奏", "上升與調速月份", "每月選擇的小儀式"],
            seoText: "將核心牌、十二個月的走勢、分類建議與年度轉折點整理成一份完整的年運塔羅閱讀。",
            valueGuideTitle: "高級閱讀包含的內容",
            valueSections: [
              { title: "把一年讀成一條完整線索", body: "連結年度核心牌、反覆出現的主題、上升階段與需要調整節奏的月份。" },
              { title: "十二個月與實際領域", body: "每個月結合生肖守護象徵與塔羅牌，整理財運、工作、關係、健康與成長方向。" },
              { title: "保存後再次查看", body: "完成的結果會保存到帳號中，重新整理或再次訪問時也能繼續閱讀。" },
            ],
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
