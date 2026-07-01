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
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 20px 18px", lineHeight: 1.8 }} aria-label="사주 연애 시뮬레이션 안내">
        <p style={{ margin: 0, color: "#f9a8d4", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.24em" }}>LOVE CODE</p>
        <h1 style={{ margin: "10px 0 0", color: "#fff7ed", fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.1 }}>사주 연애 시뮬레이션</h1>
        <p style={{ margin: "18px 0 0", color: "rgba(255,247,237,0.86)" }}>
          LOVE CODE는 두 사람의 생년월일에 흐르는 오행의 온도와 일간의 반응을 살펴, 끌림이 어디에서 시작되고 어떤 장면에서 어긋나기 쉬운지를 연애 상담처럼 풀어냅니다.
          상대가 보여 주는 말과 행동만으로는 알기 어려운 속도, 거리감, 안정감의 결을 사주 흐름 위에서 다시 바라보며 지금 관계가 품은 가능성을 차분히 짚어 줍니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.78)" }}>
          시뮬레이션은 단순한 궁합 점수보다 데이트 장면 속 선택의 흐름을 중요하게 봅니다. 어느 대화에서 마음이 열리고, 어떤 태도에서 방어가 올라오며,
          서로의 기질이 편안하게 맞물리는 순간과 조심해야 할 순간을 가상의 만남 안에서 자연스럽게 확인합니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.74)" }}>
          사랑의 흐름은 늘 한 가지 답으로 닫히지 않습니다. LOVE CODE는 호감의 리듬, 관계가 깊어지는 속도, 다시 조율해야 할 말의 온도를 함께 비추며
          지금 건네도 좋은 문장과 조금 더 기다려야 할 장면을 부드럽게 구분해 줍니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.72)" }}>
          이미 마음이 시작된 사람에게는 상대의 기질을 이해하는 차분한 지도처럼, 아직 확신이 필요한 사람에게는 다음 만남을 준비하는 작은 등불처럼 작동합니다.
          결과는 감정의 결을 부드럽게 읽되, 필요한 곳에서는 분명한 경계와 현실적인 선택 기준을 함께 비춥니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.7)" }}>
          누군가를 좋아한다는 마음은 빠르게 타오르기도 하고, 아주 작은 말 한마디 앞에서 오래 멈추기도 합니다. 이 상담은 그 미묘한 흔들림을 가볍게 넘기지 않고,
          서로가 편안하게 다가갈 수 있는 방식과 관계를 서두르지 않아도 되는 이유를 함께 살핍니다. 오늘의 선택이 상대를 붙잡기 위한 조급함이 아니라,
          나의 마음을 더 정직하게 이해하는 방향으로 이어지도록 돕습니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.68)" }}>
          상대가 곧바로 다가오지 않는 순간에도 마음의 문이 닫힌 것인지, 신중하게 거리를 재는 것인지, 표현 방식이 다른 것인지를 사주의 리듬 속에서 나누어 봅니다.
          그래서 한 번의 답장이나 짧은 행동에 크게 흔들리기보다, 관계 전체의 호흡을 읽고 자신에게 어울리는 속도로 다가갈 수 있습니다.
          설렘은 가볍게 시작되더라도 해석의 말투는 조심스럽고 따뜻하게 머무릅니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.66)" }}>
          상대의 일간이 무엇을 편안하게 받아들이는지, 어떤 오행의 분위기에서 마음이 열리는지, 어떤 말투가 부담보다 안정으로 닿는지도 함께 살핍니다.
          연애는 타이밍과 온도의 예술이라서, 같은 마음도 너무 빠르면 밀려나고 너무 늦으면 흐려질 수 있습니다.
          LOVE CODE는 그 사이의 작은 간격을 읽어, 지금 관계에서 더 자연스럽게 선택할 수 있는 방향을 비춥니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.64)" }}>
          결론은 상대를 마음대로 움직이기 위한 요령이 아니라, 서로의 기질을 존중하며 가까워지는 법에 머무릅니다.
          좋은 인연은 강한 끌림만으로 이어지지 않고, 상대가 숨 쉴 수 있는 여백과 내가 나답게 표현할 수 있는 용기 사이에서 자랍니다.
          그 균형을 찾는 과정이 러브 코드의 중심입니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.62)" }}>
          때로는 적극적인 표현이 사랑을 밝히고, 때로는 한 걸음 물러선 침묵이 관계를 더 깊게 만듭니다.
          사주의 기운은 그 차이를 섬세하게 가리키며, 상대에게 닿는 말과 나를 지키는 거리 사이의 균형을 보여 줍니다.
          LOVE CODE는 설렘을 무조건 밀어붙이지 않고, 마음이 상하지 않으면서도 진심이 흐를 수 있는 장면을 천천히 열어 줍니다.
        </p>
        <p style={{ margin: "14px 0 0", color: "rgba(255,247,237,0.6)" }}>
          관계가 막힌 듯 보이는 날에도 운의 흐름은 아주 작은 신호를 남깁니다. 말수가 줄어드는 이유, 약속이 미뤄지는 이유,
          가까워질수록 조심스러워지는 마음의 이유를 차분히 읽으면 불안은 조금씩 형태를 잃습니다.
          이 시뮬레이션은 그 신호를 따라가며, 지금은 다가가도 좋은지 아니면 마음을 정돈할 시간이 먼저 필요한지를 부드럽게 비춥니다.
        </p>
      </section>
      <LoveSimulationClient />
    </main>
  );
}
