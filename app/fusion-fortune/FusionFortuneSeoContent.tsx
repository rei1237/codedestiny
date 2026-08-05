import Link from "next/link";
import styles from "./fusion-fortune.module.css";

export const FUSION_FORTUNE_FAQS = [
  {
    question: "초융합 운세란 무엇인가요?",
    answer:
      "초융합 운세는 사주, 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로의 관점을 한 리포트 안에서 비교해 보는 CODE DESTINY의 AI 운세 통합 해석입니다. 어느 한 체계의 말을 정답처럼 단정하기보다, 각 체계가 비추는 패턴과 차이를 함께 읽습니다.",
  },
  {
    question: "초융합 운세는 어떤 체계를 함께 분석하나요?",
    answer:
      "사주의 오행과 십성, 자미두수의 삶의 영역, 숙요점의 관계 리듬, 베다 점성술과 서양 점성술의 시기·성향, 타로의 현재 질문을 중심으로 해석합니다. 입력 정보가 부족한 영역은 확정적으로 말하지 않습니다.",
  },
  {
    question: "사주만 보는 것과 무엇이 다른가요?",
    answer:
      "사주가 기질과 흐름을 읽는 중요한 축이라면, 초융합 운세는 다른 체계에서도 같은 신호가 반복되는지와 서로 다르게 보이는 지점을 함께 정리합니다. 그래서 관계, 일, 마음처럼 여러 관점이 필요한 질문을 구조화하는 데 도움이 됩니다.",
  },
  {
    question: "AI는 여러 운세를 어떻게 종합하나요?",
    answer:
      "각 체계의 계산과 해석 언어를 같은 뜻으로 섞지 않고, 공통으로 드러나는 흐름과 체계별로 달라지는 맥락을 나눠 설명합니다. 결과는 미래를 보장하는 답이 아니라 현재의 선택을 검토하는 참고 자료입니다.",
  },
  {
    question: "초융합 운세는 누구에게 추천되나요?",
    answer:
      "한 가지 해석만으로는 질문이 정리되지 않거나, 연애·일·재물·마음의 흐름을 함께 살펴보고 싶은 분에게 적합합니다. 출생시나 출생지를 모르는 경우에는 시간·장소를 전제로 하는 해석 범위를 분명하게 안내합니다.",
  },
] as const;

const SYSTEM_LINKS = [
  { href: "/saju", name: "사주", description: "오행과 십성으로 보는 기질과 흐름" },
  { href: "/ziwei", name: "자미두수", description: "삶의 영역과 별의 배치로 보는 주제" },
  { href: "/sukuyo", name: "숙요점", description: "27숙으로 살피는 관계의 리듬" },
  { href: "/vedic", name: "베다 점성술", description: "조티쉬의 라그나와 다샤 흐름" },
  { href: "/astrology", name: "서양 점성술", description: "출생 차트의 성향과 시기 읽기" },
  { href: "/tarot", name: "타로", description: "현재 질문의 감정과 선택지 정리" },
];

export function FusionFortuneSeoContent() {
  return (
    <section className={styles.seoGuide} aria-labelledby="fusion-fortune-guide-heading">
      <header className={styles.seoGuideHeader}>
        <p className={styles.kicker}>AI 다중 운세 상담</p>
        <h2>꽃돼지 운명상담의 초융합 심층 리딩</h2>
        <p>
          가벼운 고민 상담 뒤에는 사주, 자미두수, 베다점, 숙요점, 점성술, 타로의 흐름을 연결한 초융합 심층 리딩을 같은 상담방에서 이어갈 수 있습니다.
          각 체계의 해석을 한 가지 정답처럼 단정하지 않고, 공통으로 반복되는 신호와 서로 다른 관점을 함께 정리해 다음 선택을 생각할 수 있도록 돕습니다.
          심층 리딩은 기존 Fusion 티켓 정책에 따라 별도 결제가 필요하며, 무료 상담 또는 일반 이용권만으로 열리지 않습니다.
        </p>
      </header>
      <header className={styles.seoGuideHeader}>
        <p className={styles.kicker}>Fusion Fortune Guide</p>
        <h2 id="fusion-fortune-guide-heading">초융합 운세란 무엇인가요?</h2>
        <p>
          초융합 운세는 서로 다른 운세 체계를 나열하는 대신, 질문에 필요한 관점을 AI가 교차해 정리하는 통합 운세입니다.
          사주와 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로는 각각 다른 기준으로 사람과 시기를 읽기 때문에,
          CODE DESTINY는 그 차이를 지운 채 하나의 말처럼 해석하지 않습니다.
        </p>
      </header>

      <div className={styles.seoGuideGrid}>
        <article className={styles.seoGuideCard}>
          <h3>공통 신호와 다른 맥락을 함께 봅니다</h3>
          <p>
            여러 체계에서 반복되는 흐름은 현재의 핵심 패턴으로, 서로 다르게 보이는 부분은 상황별 선택지로 읽습니다.
            그래서 한 줄의 단정 대신 관계·일·돈·마음에서 무엇을 확인할지 현실적으로 정리할 수 있습니다.
          </p>
        </article>
        <article className={styles.seoGuideCard}>
          <h3>체계마다 쓰는 언어를 섞지 않습니다</h3>
          <p>
            사주의 오행, 자미두수의 궁, 숙요점의 관계성, 점성술의 차트는 같은 개념이 아닙니다. 해석할 수 있는 범위와
            입력 정보의 한계를 먼저 밝히고, 쉬운 말로 연결합니다.
          </p>
        </article>
        <article className={styles.seoGuideCard}>
          <h3>결과보다 다음 선택을 돕습니다</h3>
          <p>
            초융합 운세는 미래를 확정하거나 보장하지 않습니다. 반복되는 반응과 현재의 조건을 살펴, 지금 시도할 일과
            잠시 거리를 둘 일을 판단하는 참고 자료로 활용할 수 있습니다.
          </p>
        </article>
      </div>

      <section className={styles.seoSystems} aria-labelledby="fusion-systems-heading">
        <h3 id="fusion-systems-heading">한 리포트 안에서 연결되는 여섯 관점</h3>
        <div className={styles.seoSystemLinks}>
          {SYSTEM_LINKS.map((system) => (
            <Link key={system.href} href={system.href} className={styles.seoSystemLink}>
              <strong>{system.name}</strong>
              <span>{system.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.seoFaq} aria-labelledby="fusion-faq-heading">
        <h3 id="fusion-faq-heading">초융합 운세 FAQ</h3>
        {FUSION_FORTUNE_FAQS.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>
    </section>
  );
}
