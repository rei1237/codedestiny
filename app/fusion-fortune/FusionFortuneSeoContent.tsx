import Link from "next/link";
import styles from "./fusion-fortune.module.css";

export const FUSION_FORTUNE_FAQS = [
  {
    question: "초융합 운세란 무엇인가요?",
    answer:
      "사주, 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로를 각각 그 전통의 언어로 따로 읽은 뒤, 여섯 해석이 겹치는 지점과 엇갈리는 지점을 한 리포트로 정리하는 CODE DESTINY의 AI 통합 상담입니다. 본문은 2만 자 이상이며, 체계별 신호 강도와 앞으로 12개월의 시기 라인이 함께 나옵니다.",
  },
  {
    question: "여섯 개를 따로 보는 것과 무엇이 다른가요?",
    answer:
      "따로 보면 여섯 개의 결론이 남습니다. 초융합의 값은 체계 하나하나가 아니라 그 사이의 관계에 있습니다. 두 체계 이상이 같은 신호를 가리키면 우선순위로 올리고, 서로 다르게 말하면 어떤 상황에서 어느 쪽을 따를지 기준을 남깁니다. 이 교차 검증은 각각 따로 본 해석에서는 나오지 않습니다.",
  },
  {
    question: "어떤 체계를 함께 분석하나요?",
    answer:
      "사주의 오행과 십성, 자미두수의 궁과 주요 별, 숙요점의 본명숙과 관계 리듬, 베다 점성술의 라그나와 다샤, 서양 점성술의 태양·달·금성·화성·토성, 그리고 서버가 뽑은 타로 여섯 장입니다. 카드와 별과 궁은 서버 계산값만 인용하며, 계산에 없는 값을 만들어 쓰지 않습니다.",
  },
  {
    question: "결과에는 무엇이 담기나요?",
    answer:
      "핵심 요약, 여섯 체계의 개별 해석, 여섯을 하나로 엮은 통합 리딩, 시기와 행동까지 아홉 개 부분으로 구성됩니다. 여기에 체계별 신호 강도를 보여주는 레이더, 앞으로 12개월의 시기 라인, 겹치는 신호와 엇갈리는 신호를 정리한 교차 검증 지표가 함께 제공됩니다.",
  },
  {
    question: "가격과 이용권 적용은 어떻게 되나요?",
    answer:
      "1회 30,000원이며 매번 새로 생성되는 개인화 리딩이라 회당 결제입니다. 결제창에서는 이용권·단건 결제·월정석을 함께 고를 수 있고, 금액 상한 때문에 이용권으로는 family 등급이 커버됩니다. 접수는 한국 시간 기준 하루 100자리 선착순이며, 결과가 완성된 순서로 자리가 확정됩니다.",
  },
  {
    question: "태어난 시간이나 출생지를 모르면 어떻게 되나요?",
    answer:
      "시주, 라그나, 상승궁, 하우스처럼 시간과 장소에 의존하는 값은 추정하지 않고 유보합니다. 대신 무엇을 확인할 수 있고 무엇을 확인할 수 없는지 결과 안에서 먼저 밝힙니다. 아는 범위가 넓을수록 시기 해석이 구체적으로 나옵니다.",
  },
  {
    question: "초융합 운세는 누구에게 맞나요?",
    answer:
      "이직, 이사, 결혼처럼 되돌리기 어려운 결정을 앞두고 판단 근거가 필요한 분, 여러 곳에서 본 해석이 서로 달라 정리가 안 되는 분, 한 해의 흐름을 한 번에 정리해 두고 싶은 분에게 맞습니다. 오늘 하루의 운을 가볍게 보고 싶다면 무료 상담이 더 알맞습니다.",
  },
] as const;

const DELIVERABLES = [
  { title: "여섯 체계의 개별 해석", body: "각 전통의 언어로 따로 읽습니다. 사주의 오행을 자미두수의 궁으로 옮겨 부르거나, 서로 다른 개념을 같은 말로 뭉개지 않습니다." },
  { title: "겹치는 신호와 엇갈리는 신호", body: "두 체계 이상이 함께 가리키는 항목은 상황이 바뀌어도 잘 흔들리지 않아 우선순위가 됩니다. 엇갈리는 항목은 모순이 아니라 선택지로 남깁니다." },
  { title: "앞으로 12개월의 시기 라인", body: "사건을 예고하지 않습니다. 각 달에 힘을 쓸 만한 정도와 그때 준비·시험·정리할 일을 한 줄씩 표시합니다." },
  { title: "체계별 신호 강도", body: "여섯 체계가 이번 질문에 얼마나 뚜렷하게 말하는지를 레이더로 보여줍니다. 사람을 평가하는 점수가 아니라 읽기의 무게 배분입니다." },
];

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
        <h2 id="fusion-fortune-guide-heading">여섯 개의 운세가 같은 곳을 가리킬 때, 그것이 답에 가장 가깝습니다</h2>
        <p>
          운세를 여러 개 보면 결론도 여러 개가 남습니다. 초융합 심층 리딩은 사주·자미두수·베다점·숙요점·점성술·타로를
          각각 그 전통의 언어로 따로 읽은 뒤, 여섯 해석이 <strong>어디서 겹치고 어디서 갈라지는지</strong>를 정리해
          하나의 상담으로 잇습니다. 겹치는 신호는 지금 우선할 일로, 엇갈리는 신호는 상황에 따라 달라지는 선택지로 남깁니다.
        </p>
        <p>
          본문은 2만 자 이상이고, 체계별 신호 강도와 앞으로 12개월의 시기 라인이 함께 나옵니다.
          1회 30,000원이며 한국 시간 기준 하루 100자리 선착순으로 접수합니다.
        </p>
      </header>

      <div className={styles.seoGuideGrid}>
        {DELIVERABLES.map((item) => (
          <article key={item.title} className={styles.seoGuideCard}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <header className={styles.seoGuideHeader}>
        <p className={styles.kicker}>Fusion Fortune Guide</p>
        <h2>초융합 운세란 무엇인가요?</h2>
        <p>
          초융합 운세는 서로 다른 운세 체계를 나란히 늘어놓는 대신, 질문에 필요한 관점을 AI가 교차해 정리하는 통합 운세입니다.
          사주와 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로는 각각 다른 기준으로 사람과 시기를 읽습니다.
          CODE DESTINY는 그 차이를 지운 채 하나의 말처럼 해석하지 않고, 차이를 보이게 남긴 뒤 그 위에서 지금의 선택을 봅니다.
        </p>
        <p>
          해석의 재료는 전부 서버가 계산한 값입니다. 명식, 명반, 나크샤트라, 본명숙, 출생 차트, 그리고 서버가 뽑은 타로 여섯 장까지
          계산에 실제로 존재하는 값만 인용하며, 없는 별이나 카드를 만들어 채우지 않습니다.
          생시나 출생지를 모르면 그 값에 의존하는 해석은 유보하고, 무엇을 확인할 수 없는지 결과 안에서 먼저 밝힙니다.
        </p>
      </header>

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
