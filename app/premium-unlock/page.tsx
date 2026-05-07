/**
 * /premium-unlock — 인생 총운 해금 세일즈 페이지
 * CRO 구조: 공감 → 문제제기 → 차별성 → 베네핏 → 가격 → CTA
 */

import { Metadata } from "next";
import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";
import PremiumSalesContent from "./PremiumSalesContent";

export const metadata: Metadata = withUniqueRouteMetadata("/premium-unlock", {
  title: "인생 총운 해금 — 당신의 운명이 엇나가는 진짜 이유 | Code Destiny",
  description:
    "AI + 사주명리 8만 케이스 기반. 10년 대운 전환점, 재물운 타이밍, 숨겨진 재능을 한 번에. 49,000원으로 평생 사주 리포트를 받아보세요.",
  openGraph: {
    title: "당신의 운명을 해금하세요 — 인생 총운 분석",
    description: "노력해도 안 풀리는 이유, 사주 명리학이 알고 있습니다.",
  },
}) as Metadata;

const PREMIUM_VALUE_SECTIONS = [
  {
    title: "1. 프리미엄 리포트의 핵심은 정보량보다 의사결정 연결성입니다",
    body:
      "긴 리포트가 반드시 좋은 리포트는 아닙니다. 중요한 것은 결과가 실제 선택으로 연결되는 구조를 갖추는 것입니다. 코드 데스티니 프리미엄 리포트는 성향 설명을 넘어 시기, 리스크, 우선순위를 함께 제시해 사용자가 다음 행동을 결정할 수 있도록 설계되어야 가치가 커집니다.",
  },
  {
    title: "2. 대운·세운 해석은 타이밍 관리 도구로 읽는 것이 안전합니다",
    body:
      "운의 흐름은 결과를 확정하는 예언이 아니라 준비 강도를 조정하는 신호로 활용해야 합니다. 확장기에는 기회 탐색 범위를 넓히고, 조정기에는 구조 정비와 리스크 축소를 우선하는 식으로 해석을 일정 관리에 연결하면 체감 효용이 높아집니다. 핵심은 불안 자극이 아니라 실행 가능성입니다.",
  },
  {
    title: "3. 재물·커리어 파트는 단일 결론보다 시나리오 비교가 중요합니다",
    body:
      "실무에서 유용한 리포트는 \"무조건 A\"가 아니라 A/B/C 시나리오의 장단점과 전제조건을 함께 제시합니다. 같은 운세 신호라도 직무, 조직, 생활비 구조에 따라 최적 선택이 달라지기 때문입니다. 프리미엄 해석은 사용자가 자신의 현실 변수에 맞춰 판단할 수 있게 비교 프레임을 제공해야 합니다.",
  },
  {
    title: "4. 관계 파트는 상대 판정이 아니라 대화 전략 중심이어야 합니다",
    body:
      "프리미엄 궁합이나 관계 해석은 자극적인 단정 문장을 줄이고, 갈등 예방·회복 루틴·경계 설정 같은 행동 가이드를 중심으로 구성해야 장기 만족도가 높습니다. 관계 품질은 미래 예측보다 운영 기술에서 결정되므로, 실행 가능한 대화 스크립트와 체크리스트를 제공하는 방식이 실전적입니다.",
  },
  {
    title: "5. 좋은 리포트는 읽는 순간보다 30일 후에 가치가 증명됩니다",
    body:
      "초기 감탄보다 중요한 것은 한 달 뒤에도 다시 참고되는지 여부입니다. 그래서 리포트는 핵심 요약, 월간 체크포인트, 경보 신호를 분리해 재사용성을 높여야 합니다. 사용자가 반복 열람하며 계획을 조정할 수 있을 때 프리미엄 콘텐츠는 일회성 소비를 넘어 개인 전략 자산으로 작동합니다.",
  },
  {
    title: "6. 비보장 고지와 현실 조언의 균형이 신뢰를 만듭니다",
    body:
      "운세 리포트는 의료, 법률, 투자, 형사 사건 결과를 보장하지 않는다는 고지를 명확히 유지해야 합니다. 동시에 사용자가 당장 적용할 수 있는 현실 조언을 제공해야 신뢰가 생깁니다. 책임 있는 고지와 구체적 실행 제안이 함께 있을 때 프리미엄 리포트는 안전성과 효용을 동시에 확보할 수 있습니다.",
  },
] as const;

export default function PremiumUnlockPage() {
  return (
    <main style={{ background: "#05040d", color: "#e2e8f0" }}>
      <PremiumSalesContent />
      <section style={{ maxWidth: "980px", margin: "0 auto", padding: "22px 16px 72px" }} aria-label="프리미엄 리포트 가치 가이드">
        <h2 style={{ margin: "0 0 12px", color: "#fbbf24", fontSize: "1.06rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          프리미엄 리포트 활용 가이드
        </h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {PREMIUM_VALUE_SECTIONS.map((section) => (
            <article key={section.title} style={{ borderRadius: "12px", border: "1px solid rgba(251,191,36,0.26)", background: "rgba(24,18,8,0.68)", padding: "14px" }}>
              <h3 style={{ margin: "0 0 6px", color: "#fde68a", fontSize: "0.92rem", lineHeight: 1.5 }}>{section.title}</h3>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.78, color: "rgba(226,232,240,0.9)" }}>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
