import LoveSimulationClient from "./LoveSimulationClient";

const LOVE_SIMULATION_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "LOVE CODE - 사주 연애 시뮬레이션 | Code Destiny",
    description: "상대방의 생년월일로 사주를 분석해 페르소나 캐릭터를 만들고, 다양한 데이트 코스와 선택지를 통해 상대방의 취향·성격을 미리 경험해보는 연애 시뮬레이션.",
    keywords: ["연애 시뮬레이션", "사주 연애", "상대방 사주 분석", "데이트 시뮬레이션", "love simulation", "saju love", "사주 궁합 게임"],
    ogTitle: "LOVE CODE - 사주 연애 시뮬레이션",
    ogDescription: "상대방의 생년월일로 사주 분석 후 연애 시뮬레이션을 체험하세요.",
    ogAlt: "LOVE CODE 사주 연애 시뮬레이션",
  },
  en: {
    title: "LOVE CODE - Saju Love Simulation | Code Destiny",
    description: "Create a Saju-based persona from the other person's birth date, then explore their taste and temperament through date routes and choices.",
    keywords: ["love simulation", "Saju love", "Saju analysis for crush", "date simulation", "Saju compatibility game"],
    ogTitle: "LOVE CODE - Saju Love Simulation",
    ogDescription: "Analyze a birth date through Saju and experience a love simulation.",
    ogAlt: "LOVE CODE Saju love simulation",
  },
  ja: {
    title: "LOVE CODE - 四柱推命恋愛シミュレーション | Code Destiny",
    description: "相手の生年月日から四柱推命ベースのペルソナを作り、デートコースと選択肢を通じて好みや性格を先に体験する恋愛シミュレーションです。",
    keywords: ["恋愛シミュレーション", "四柱推命 恋愛", "相手の四柱推命分析", "デートシミュレーション", "四柱推命相性ゲーム"],
    ogTitle: "LOVE CODE - 四柱推命恋愛シミュレーション",
    ogDescription: "相手の生年月日を四柱推命で分析し、恋愛シミュレーションを体験してください。",
    ogAlt: "LOVE CODE 四柱推命恋愛シミュレーション",
  },
} as const;

const loveSimulationPageCopy = LOVE_SIMULATION_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: loveSimulationPageCopy.title,
  description: loveSimulationPageCopy.description,
  keywords: loveSimulationPageCopy.keywords,
  alternates: {
    canonical: "https://code-destiny.com/saju/love-simulation",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/love-simulation",
    title: loveSimulationPageCopy.ogTitle,
    description: loveSimulationPageCopy.ogDescription,
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/love%20code.webp",
        width: 1200,
        height: 630,
        alt: loveSimulationPageCopy.ogAlt,
      },
    ],
  },
};

export default function LoveSimulationPage() {
  return (
    <main style={{ background: "#070a16", color: "#e2e8f0" }}>
      <LoveSimulationClient />
    </main>
  );
}
