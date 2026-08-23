import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const TEN_GODS_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    metaTitle: "십성 해석 가이드 | Code Destiny",
    observe: "십성이 살피는 것",
    inputs: "필요한 입력값",
    useCases: "어떤 때 참고하면 좋은가",
    access: "무료와 유료 범위",
    flow: "해석 흐름",
    resultItems: "결과에서 확인할 수 있는 항목",
    sample: "짧은 예시 리딩",
    caution: "해석 시 주의할 점",
  },
};

function tenGodsGuideText(key) {
  return TEN_GODS_GUIDE_TEXT_TRANSLATIONS.ko[key];
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/saju/ten-gods",
    title: tenGodsGuideText("metaTitle"),
    description:
      "사주 십성이 관계, 일, 책임, 표현 방식을 어떻게 비추는지와 입력값, 해석 흐름, 샘플 리딩, 주의사항을 안내합니다.",
    keywords: ["십성", "사주 십성", "비견", "식상", "재성", "관성", "인성", "Code Destiny"],
  });
}

const flowItems = [
  "일간을 기준으로 다른 천간과 지지가 어떤 십성으로 드러나는지 분류합니다.",
  "비겁, 식상, 재성, 관성, 인성이 어디에 놓이고 어떤 계절의 힘을 받는지 살핍니다.",
  "한 십성의 많고 적음만 보지 않고 오행 균형, 대운, 실제 삶의 환경을 함께 읽습니다.",
  "결과는 관계와 일의 경향을 참고하는 상담 언어로 정리합니다.",
];

const resultItems = [
  "내가 힘을 쓰는 방식과 자기 주장",
  "표현력, 창작, 말과 행동의 흐름",
  "재물과 책임을 다루는 태도",
  "규칙, 직업, 관계 안의 역할",
  "배움, 보호, 회복을 받아들이는 방식",
];

const faqItems = [
  {
    question: "십성이 많으면 늘 좋은가요?",
    answer:
      "많다는 사실만으로 좋고 나쁨을 정하지 않습니다. 계절, 일간의 힘, 다른 오행과의 관계에 따라 강점이 되기도 하고 과해져 조율이 필요한 흐름이 되기도 합니다.",
  },
  {
    question: "재성이 강하면 돈을 많이 버나요?",
    answer:
      "재성은 돈 자체보다 현실 감각, 관리, 책임, 관계 속 교환의 태도를 비춥니다. 실제 수입과 투자 결과는 직업, 선택, 시장 상황, 재무 판단을 함께 보아야 합니다.",
  },
  {
    question: "관성이 약하면 직업운이 나쁜가요?",
    answer:
      "관성이 약하다고 직업운이 나쁘다고 단정하지 않습니다. 조직 안의 규칙보다 자율성이나 전문성이 더 중요하게 작동할 수 있으며, 다른 십성이 직업 방향을 보완할 수 있습니다.",
  },
];

export default function SajuTenGodsPage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">십성 해석 가이드</h1>
        <p className="cd-main-intro">
          십성은 사주에서 사람과 일, 표현과 책임, 관계 안에서 반복되는 역할을 읽는 언어입니다. Code Destiny는 십성을 성격을 고정하는 라벨로 보지 않고, 삶의 장면마다 어떤 힘이 자연스럽게 드러나는지 살피는 상담형 기준으로 풉니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{tenGodsGuideText("observe")}</h2>
          <p>
            십성은 일간과 다른 글자의 관계에서 생겨납니다. 비견과 겁재는 자기 힘과 동료성, 식신과 상관은 표현과 창작, 편재와 정재는 현실 감각과 관리, 편관과 정관은 규칙과 책임, 편인과 정인은 배움과 보호를 비춥니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{tenGodsGuideText("inputs")}</h2>
          <p>
            생년월일과 출생시간, 성별 입력이 기본입니다. 생년월일은 사주의 네 기둥을 세우고, 출생시간은 시주와 세부 십성 배치를 확인하는 데 필요합니다. 시간이 불확실하면 세부 해석의 확신도 낮아집니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{tenGodsGuideText("useCases")}</h2>
          <p>
            관계에서 늘 맡게 되는 역할이 궁금할 때, 일에서 강하게 쓰는 재능과 부담을 구분하고 싶을 때, 돈과 책임을 대하는 태도를 차분히 보고 싶을 때 도움이 됩니다. 결과는 현실 선택을 대신하지 않고 자신을 더 분명히 이해하게 돕습니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{tenGodsGuideText("access")}</h2>
          <p>
            무료 영역은 주요 십성의 기본 의미와 간단한 성향을 안내합니다. 유료 리포트는 십성의 위치, 과다와 부족, 대운에서 강해지는 역할, 관계와 일의 조언을 더 깊게 다룹니다. 결제 여부가 운을 바꾸지는 않습니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{tenGodsGuideText("flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{tenGodsGuideText("resultItems")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{tenGodsGuideText("sample")}</h2>
        <p>
          식상이 자연스럽게 살아 있고 관성이 함께 받쳐 준다면, 생각을 말과 결과물로 풀어내는 힘이 있으면서도 일정한 기준을 지키려는 마음이 함께 드러납니다. 이 흐름은 기획, 교육, 상담, 창작처럼 표현과 책임이 동시에 필요한 일에서 빛날 수 있습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{tenGodsGuideText("caution")}</h2>
        <p>
          십성 해석은 엔터테인먼트와 자기 이해를 위한 참고 자료입니다. 직업, 투자, 결혼, 이혼, 소송, 건강처럼 중요한 결정은 십성 결과만으로 정하지 말고 실제 조건과 자격 있는 전문가의 조언을 함께 확인해야 합니다.
        </p>
      </section>

      <section className="cd-card-grid">
        {faqItems.map((item) => (
          <article key={item.question} className="cd-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <GuideCta target={GUIDE_CTA_TARGETS["/saju/ten-gods"]} />

      <nav className="cd-chip-wrap" aria-label="십성 가이드 관련 링크">
        <Link href="/saju/guide" className="cd-chip">사주 기본 가이드</Link>
        <Link href="/saju/five-elements" className="cd-chip">오행 가이드</Link>
        <Link href="/manse" className="cd-chip">만세력 보기</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
