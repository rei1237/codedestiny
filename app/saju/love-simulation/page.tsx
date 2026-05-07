import LoveSimulationClient from "./LoveSimulationClient";

export const metadata = {
  title: "LOVE CODE - 사주 연애 시뮬레이션 | Code Destiny",
  description:
    "상대방의 생년월일로 사주를 분석해 페르소나 캐릭터를 만들고, 다양한 데이트 코스와 선택지를 통해 상대방의 취향·성격을 미리 경험해보는 연애 시뮬레이션.",
  keywords: [
    "연애 시뮬레이션",
    "사주 연애",
    "상대방 사주 분석",
    "데이트 시뮬레이션",
    "love simulation",
    "saju love",
    "사주 궁합 게임",
  ],
  alternates: {
    canonical: "https://code-destiny.com/saju/love-simulation",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/love-simulation",
    title: "LOVE CODE - 사주 연애 시뮬레이션",
    description: "상대방의 생년월일로 사주 분석 후 연애 시뮬레이션을 체험하세요.",
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/lovesimulation.webp",
        width: 1200,
        height: 630,
        alt: "LOVE CODE 사주 연애 시뮬레이션",
      },
    ],
  },
};

const LOVE_SIMULATION_VALUE_SECTIONS = [
  {
    title: "1. 사주 궁합은 맞고 틀림보다 작동 방식 이해가 핵심입니다",
    body:
      "궁합을 점수로만 보면 관계가 단순화됩니다. 실제 관계에서는 감정 회복 속도, 갈등 대화 방식, 결정 우선순위 차이가 더 크게 작동합니다. 사주 궁합은 상대를 판정하는 도구가 아니라 서로의 작동 방식을 번역해 협력 규칙을 만드는 도구로 사용할 때 훨씬 현실적인 도움이 됩니다.",
  },
  {
    title: "2. 시뮬레이션은 미래 예언이 아니라 반응 연습장입니다",
    body:
      "연애 시뮬레이션 결과는 \"반드시 이렇게 된다\"는 예언이 아니라 특정 선택에서 어떤 반응이 자주 발생하는지 보여주는 실험 환경입니다. 안전한 환경에서 여러 선택지를 경험해 보면 실제 대화에서 내 말투, 질문 순서, 감정 표현 강도를 조정할 수 있어 관계 피로를 줄이는 데 유용합니다.",
  },
  {
    title: "3. 오행 균형은 감정 온도와 소통 템포를 설명합니다",
    body:
      "오행 배합은 누가 우월한지 가리는 기준이 아니라 서로의 에너지 온도를 보여주는 지표입니다. 빠른 합의를 원하는 유형과 충분한 확인이 필요한 유형이 만났을 때 갈등이 생기기 쉬운데, 이 차이를 미리 이해하면 불필요한 오해를 줄일 수 있습니다. 궁합의 가치는 차이를 없애는 것이 아니라 조율하는 데 있습니다.",
  },
  {
    title: "4. 좋은 궁합도 운영 규칙이 없으면 쉽게 흔들립니다",
    body:
      "초기 케미가 좋아도 일정 압박이나 기대치 불일치가 누적되면 관계 만족도는 빠르게 낮아집니다. 주간 대화 시간, 갈등 시 금지 문장, 돈·시간 의사결정 기준 같은 운영 규칙을 미리 정해두면 궁합의 장점이 유지됩니다. 결국 관계 품질은 궁합 점수보다 운영 습관에서 결정됩니다.",
  },
  {
    title: "5. 결과는 상대 진단이 아니라 자기 조정 체크리스트로 사용하세요",
    body:
      "궁합 해석을 상대를 평가하는 근거로 쓰면 방어적 대화가 늘어납니다. 반대로 \"내가 불안할 때 어떤 표현을 쓰는가\", \"갈등 후 회복에 무엇이 필요한가\"를 점검하는 체크리스트로 사용하면 관계가 훨씬 건강해집니다. 해석의 초점은 타인 규정이 아니라 내 반응 조정에 두는 것이 안전합니다.",
  },
  {
    title: "6. 실전 적용은 작은 대화 실험부터 시작하세요",
    body:
      "시뮬레이션 후 바로 적용할 수 있는 행동 한두 가지를 정해보세요. 예를 들어 결론부터 말하던 습관을 질문 먼저로 바꾸거나, 감정이 올라올 때 10분 정리 후 대화하는 규칙을 적용하는 방식입니다. 작은 실험이 반복되면 궁합 콘텐츠는 단순 흥미를 넘어 관계 기술을 훈련하는 도구가 됩니다.",
  },
] as const;

export default function LoveSimulationPage() {
  return (
    <main style={{ background: "#070a16", color: "#e2e8f0" }}>
      <LoveSimulationClient />
      <section style={{ maxWidth: "980px", margin: "0 auto", padding: "28px 16px 68px" }} aria-label="사주 궁합 활용 가이드">
        <h2 style={{ margin: "0 0 12px", color: "#c4b5fd", fontSize: "1.06rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          사주 궁합 실전 가이드
        </h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {LOVE_SIMULATION_VALUE_SECTIONS.map((section) => (
            <article key={section.title} style={{ borderRadius: "12px", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(20,18,45,0.72)", padding: "14px" }}>
              <h3 style={{ margin: "0 0 6px", color: "#ddd6fe", fontSize: "0.92rem", lineHeight: 1.5 }}>{section.title}</h3>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.78, color: "rgba(226,232,240,0.9)" }}>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
