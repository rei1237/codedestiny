import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { ZiweiPremiumPdfBuilder } from "@/app/components/ziwei-pdf";
import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/ziwei/chart",
    title: "자미두수 명반 보기 · 명궁·재백궁·관록궁 해석 | Code Destiny",
    description:
      "자미두수(紫微斗數) 명반을 기반으로 12궁·명궁·신궁·사화·대한 흐름을 로컬 계산과 템플릿으로 생성하는 인터랙티브 심화 리포트입니다.",
    keywords: [
      "자미두수",
      "자미두수 명반",
      "자미두수 무료",
      "12궁",
      "명궁",
      "신궁",
      "사화",
      "대한",
      "자미두수 심화",
      "12궁 심층 분석",
      "ziwei chart",
      "zi wei dou shu",
    ],
  });
}

const ZIWEI_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "자미두수 명반은 무엇을 보나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "명궁·신궁을 기준으로 12궁에 배치된 주성과 사화, 대한 흐름을 함께 읽어 성향·관계·진로·재물의 작동 방식을 해석합니다.",
      },
    },
    {
      "@type": "Question",
      name: "사주와 자미두수는 어떻게 다른가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "사주는 오행 균형과 간지 관계를 중심으로 기질을 읽고, 자미두수는 12궁 공간 배치와 시간축 흐름으로 영역별 변화를 읽는 데 강점이 있습니다.",
      },
    },
  ],
});

const ZIWEI_VALUE_SECTIONS = [
  {
    title: "1. 자미두수는 궁위 중심으로 삶의 장면을 분해합니다",
    body:
      "자미두수의 강점은 성향 한 줄 요약이 아니라 12궁이라는 구조로 삶의 영역을 분해해 읽는 데 있습니다. 명궁, 부처궁, 관록궁처럼 영역별로 작동 방식이 다르게 나타나기 때문에, \"나는 어떤 사람인가\"보다 \"어떤 상황에서 어떤 반응을 반복하는가\"를 파악할 때 훨씬 실용적입니다.",
  },
  {
    title: "2. 명궁·신궁을 함께 봐야 현재 체감과 맞습니다",
    body:
      "명궁은 기본 기질을, 신궁은 실제 행동이 드러나는 방향을 설명하는 경우가 많습니다. 두 축이 같은 성향을 가리키면 장점이 안정적으로 발현되고, 서로 다른 신호를 보이면 내적 욕구와 외적 역할 사이의 긴장이 커질 수 있습니다. 이 차이를 인식하면 \"왜 내가 나답지 않게 느껴지는지\"를 설명하기 쉬워집니다.",
  },
  {
    title: "3. 사화와 보조성은 이벤트보다 패턴을 읽는 단서입니다",
    body:
      "화록, 화권, 화과, 화기는 흔히 길흉으로 소비되지만 실제로는 에너지가 어디로 몰리고 어디서 막히는지 알려주는 패턴 신호에 가깝습니다. 보조성과 함께 읽으면 과장된 예언 문장을 줄이고 현실적인 대응 전략을 세울 수 있습니다. 자미두수 해석은 결론보다 맥락 연결이 품질을 결정합니다.",
  },
  {
    title: "4. 대한·유년은 타이밍 조정 프레임으로 쓰는 것이 안전합니다",
    body:
      "큰 운의 전환 시기와 연 단위 흐름을 함께 보면, 무리해서 밀어붙일 시기와 정비가 필요한 시기를 구분할 수 있습니다. 이를 운명 확정으로 받아들이면 불안만 커지지만, 일정·재정·관계 우선순위를 조정하는 기준으로 쓰면 실질적인 도움을 받습니다. 핵심은 예언보다 준비의 정밀도입니다.",
  },
  {
    title: "5. 궁합 해석은 관계 운영 규칙 설계에 초점을 두세요",
    body:
      "자미두수 궁합은 맞고 틀림을 판정하기보다 갈등이 생기는 지점을 미리 파악하는 데 유용합니다. 특히 부처궁, 복덕궁, 명궁의 상호작용을 보면 소통 방식과 회복 속도 차이가 드러납니다. 결과를 바탕으로 \"갈등 시 금지 문장\", \"회복 루틴\" 같은 운영 규칙을 정하면 궁합 해석이 실제 관계 개선으로 이어집니다.",
  },
  {
    title: "6. 해석을 기록하면 자미두수가 개인 전략 데이터가 됩니다",
    body:
      "한 번의 리딩보다 반복 기록이 더 큰 가치를 만듭니다. 중요한 의사결정 전후에 어떤 궁위 신호가 체감됐는지 메모하면, 나만의 반응 패턴이 선명해집니다. 이 축적 데이터는 다음 분기 계획, 커리어 선택, 관계 조율에서 실전 기준으로 활용할 수 있습니다. 자미두수는 기록할수록 정밀해지는 도구입니다.",
  },
] as const;

export default function ZiweiChartPage() {
  return (
    <main className="relative min-h-[100dvh] bg-[#030712] text-slate-100">
      <h1 className="sr-only">
        자미두수 명반으로 보는 내 인생의 12궁
      </h1>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ZIWEI_FAQ_JSON_LD }} />
      <ZiweiChartClientLoader />
      <section
        aria-label="자미두수 실전 해석 가이드"
        className="relative mx-auto max-w-5xl px-4 pb-20 pt-10"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.2),transparent_40%),radial-gradient(circle_at_20%_76%,rgba(250,204,21,0.14),transparent_42%)]" />
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-cyan-200">
          자미두수 명반 활용 가이드
        </h2>
        <div className="grid gap-3">
          {ZIWEI_VALUE_SECTIONS.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-cyan-200/20 bg-[#09162d]/75 p-4 shadow-[0_12px_40px_rgba(2,6,23,0.35)]"
            >
              <h3 className="mb-2 text-base font-semibold leading-relaxed text-cyan-100">
                {section.title}
              </h3>
              <p className="text-sm leading-8 text-slate-200/90">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-100">
            자미두수 15챕터 PDF 빌더 미리보기
          </summary>
          <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-[#08111f] p-4 shadow-[0_16px_48px_rgba(2,6,23,0.38)]">
            <ZiweiPremiumPdfBuilder report={null} />
          </div>
        </details>
      </section>
    </main>
  );
}
