import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const SAJU_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    metaTitle: "사주 명리학 기본 가이드 | Code Destiny",
    observe: "사주가 살피는 것",
    inputs: "필요한 입력값",
    useCases: "어떤 때 참고하면 좋은가",
    access: "무료와 유료 범위",
    flow: "해석 흐름",
    resultItems: "결과에서 확인할 수 있는 항목",
    sample: "짧은 예시 리딩",
    caution: "해석 시 주의할 점",
  },
};

function sajuGuideText(key) {
  return SAJU_GUIDE_TEXT_TRANSLATIONS.ko[key];
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/saju/guide",
    title: sajuGuideText("metaTitle"),
    description:
      "사주 명리학이 무엇을 살피는지, 생년월일과 출생시간이 왜 필요한지, 오행·십성·대운을 어떻게 읽는지 차분히 안내합니다.",
    keywords: ["사주 가이드", "명리학 기본", "오행", "십성", "대운", "Code Destiny"],
  });
}

const readingItems = [
  "태어난 해와 달, 날과 시간을 네 기둥으로 세우고 천간과 지지의 관계를 살핍니다.",
  "오행의 많고 적음보다 서로 돕고 제어하는 흐름, 계절의 온도, 일간이 머무는 자리를 함께 봅니다.",
  "십성은 사람과 일, 관계와 책임을 읽는 언어로 사용하며 한 글자만으로 성격을 단정하지 않습니다.",
  "대운과 세운은 변화의 배경으로 보며 현실의 선택, 건강 상태, 환경 조건과 함께 참고합니다.",
];

const resultItems = [
  "타고난 기질과 에너지의 방향",
  "오행 균형과 보완이 필요한 생활 리듬",
  "관계, 일, 공부, 창작, 재물 흐름에서 자주 나타나는 패턴",
  "대운과 세운에서 강해지는 주제",
  "결과를 읽을 때 피해야 할 단정과 주의사항",
];

const faqItems = [
  {
    question: "출생시간을 모르면 사주를 볼 수 없나요?",
    answer:
      "일부 해석은 가능하지만 시주가 빠지면 자녀, 말년, 세부 성향, 특정 흐름의 정밀도가 낮아질 수 있습니다. 모르는 경우에는 모름으로 두고 큰 구조부터 보는 편이 안전합니다.",
  },
  {
    question: "오행이 부족하면 반드시 나쁜가요?",
    answer:
      "부족함 자체가 곧 불운은 아닙니다. 계절, 일간의 힘, 주변 글자와의 관계에 따라 부족한 오행이 오히려 삶의 방향성을 분명히 만들기도 합니다.",
  },
  {
    question: "사주 결과를 중요한 결정의 기준으로 삼아도 되나요?",
    answer:
      "사주는 자신의 흐름을 돌아보는 참고 자료입니다. 건강, 법률, 투자, 결혼, 이혼, 진로처럼 큰 결정은 현실 정보와 전문가 조언을 함께 확인해야 합니다.",
  },
];

export default function SajuGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">사주 명리학 기본 가이드</h1>
        <p className="cd-main-intro">
          사주는 태어난 순간의 하늘과 땅의 기운을 네 기둥으로 세워, 사람이 어떤 리듬 속에서 생각하고 관계 맺고 선택하는지 살피는 동양 명리의 언어입니다. Code Destiny에서는 이 흐름을 겁주거나 단정하기보다, 자기 이해와 현실적인 판단을 돕는 참고 자료로 풀이합니다.
        </p>
      </header>

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{sajuGuideText("observe")}</h2>
          <p>
            사주는 성격 하나를 맞히는 도구가 아니라, 타고난 기질과 환경의 반응 방식, 관계에서 반복되는 태도, 일과 배움의 방향, 시기별로 강해지는 주제를 함께 읽습니다. 같은 오행을 가지고 있어도 계절과 배치가 다르면 전혀 다른 결로 드러납니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{sajuGuideText("inputs")}</h2>
          <p>
            생년월일, 출생시간, 성별, 양력·음력 여부가 기본 입력값입니다. 출생시간은 시주를 세우기 위해 필요하고, 양력·음력 구분은 달의 흐름을 바르게 맞추기 위해 중요합니다. 입력값이 정확할수록 해석의 초점도 선명해집니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{sajuGuideText("useCases")}</h2>
          <p>
            진로의 방향이 흐려질 때, 관계에서 반복되는 감정의 이유를 보고 싶을 때, 올해의 흐름을 차분히 정리하고 싶을 때 도움이 됩니다. 다만 결과가 선택을 대신하지는 않으며, 현실의 조건과 본인의 의지를 함께 살피는 태도가 필요합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{sajuGuideText("access")}</h2>
          <p>
            무료 영역은 기본 사주 구조, 핵심 오행, 간단한 성향과 주의점을 중심으로 안내합니다. 유료 리포트는 대운·세운, 관계와 일의 흐름, 세부 조언, 장문 해석처럼 더 깊은 맥락을 다룹니다. 결제 여부가 운의 좋고 나쁨을 바꾸지는 않습니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{sajuGuideText("flow")}</h2>
        <ul>
          {readingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{sajuGuideText("resultItems")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{sajuGuideText("sample")}</h2>
        <p>
          목의 기운이 뚜렷하고 금의 기운이 균형을 잡아 주는 사주는 새로운 일을 시작하는 감각과 기준을 세우는 힘이 함께 드러납니다. 다만 계절의 열기가 강하면 마음이 앞서 지칠 수 있으니, 결정 전에는 일정과 체력을 먼저 정리하는 편이 안정적입니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{sajuGuideText("caution")}</h2>
        <p>
          사주는 의료 진단, 법률 판단, 투자 조언, 결혼과 이혼 결정, 소송 결과, 진로 선택의 유일한 근거가 아닙니다. 불안할수록 결과를 단정으로 붙잡기보다, 지금 확인할 수 있는 현실 정보와 전문가의 조언을 함께 두고 보아야 합니다.
        </p>
      </section>

      <section className="cd-card-grid" aria-labelledby="saju-guide-faq-title">
        <h2 id="saju-guide-faq-title" className="sr-only">FAQ</h2>
        {faqItems.map((item) => (
          <article key={item.question} className="cd-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <GuideCta target={GUIDE_CTA_TARGETS["/saju/guide"]} />

      <nav className="cd-chip-wrap" aria-label="사주 가이드 관련 링크">
        <Link href="/saju" className="cd-chip">사주 서비스</Link>
        <Link href="/saju/basic" className="cd-chip">기본 사주 보기</Link>
        <Link href="/compatibility" className="cd-chip">궁합 보기</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
