import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";

const SAJU_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    metaTitle: "사주 명리학 기본 가이드 | Code Destiny",
    observe: "사주가 살피는 것",
    inputs: "필요한 입력값",
    useCases: "어떤 때 참고하면 좋은가",
    access: "무료와 유료 범위",
    flow: "해석 흐름",
    resultItems: "결과에서 확인할 수 있는 항목",
    calculation: "계산 예시 — 명식에서 일간·오행·십성까지",
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

// 가상 입력(lib/seo-reading-examples.js 의 SEO_EXAMPLE_BIRTH)으로 세운 명식. 간지·오행·십성은
// __tests__/ui/core-landing-calculation-examples.test.mjs 가 사주 엔진 결과와 맞춰 본다.
const calculationSteps = [
  "네 기둥 — 1997년 입춘(2월 4일)이 지났으므로 연주는 丁丑(정축), 입춘부터 경칩 전까지인 寅월이라 월주는 壬寅(임인), 날짜의 간지인 일주는 癸未(계미), 오후 2시 30분은 未시라 시주는 己未(기미)입니다.",
  "일간 — 태어난 날의 천간 癸(계수)가 나를 대표하는 글자입니다. 나머지 일곱 글자는 모두 癸와의 관계로 읽습니다.",
  "계절 — 월지 寅은 입춘 뒤 초봄의 목(木) 자리입니다. 계절을 먼저 확인해야 일간이 힘을 얻는지 잃는지를 판단할 수 있습니다.",
  "오행 — 겉으로 드러난 여덟 글자를 세면 토가 丑·未·己·未의 넷으로 가장 많고 금은 하나도 없습니다. 지장간까지 넣으면 비율이 달라지므로 개수는 출발점일 뿐입니다.",
  "십성 — 癸를 기준으로 연간 丁은 편재, 월간 壬은 겁재, 시간 己는 편관입니다. 같은 십성도 어느 기둥에 있느냐에 따라 무게가 달라집니다.",
  "입춘 경계 — 같은 해 2월 3일생이라면 입춘 하루 전이라 연주는 앞 해의 丙子(병자), 월주는 辛丑(신축)이 됩니다. 해석보다 명식이 맞는지를 먼저 확인하는 이유입니다.",
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
  {
    question: "생년과 명식의 연주가 다르게 나올 수 있나요?",
    answer:
      "그렇습니다. 명리에서 한 해는 양력 1월 1일이나 설날이 아니라 입춘에 바뀌므로, 입춘 전에 태어났다면 명식의 연주는 앞 해의 간지가 됩니다. 예를 들어 1997년 2월 3일생은 그해 입춘(2월 4일) 하루 전이라 연주가 丁丑이 아니라 丙子입니다. 설날로 띠를 세는 방식과도 입춘과 설날 사이에 태어난 사람은 결과가 갈릴 수 있습니다.",
  },
];

// 발행일은 이 파일의 첫 커밋일(git log --diff-filter=A), 수정일은 본문을 마지막으로 고친 날(계산 예시·정의 문단).
// 짝 구현: app/guides/[slug]/page.js 의 @graph(BreadcrumbList·Article·FAQPage) + ContentIntegrityNote.
const GUIDE_ARTICLE = {
  path: "/saju/guide",
  title: "사주 명리학 기본 가이드",
  description:
    "사주 명리학이 무엇을 살피는지, 생년월일과 출생시간이 왜 필요한지, 오행·십성·대운을 어떻게 읽는지 차분히 안내합니다.",
  datePublished: "2026-06-21",
  dateModified: "2026-09-24",
};

const guideJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "사주 서비스", path: "/saju" },
      { name: GUIDE_ARTICLE.title, path: GUIDE_ARTICLE.path },
    ]),
    buildArticleJsonLd({
      ...GUIDE_ARTICLE,
      category: "사주 서비스",
      keywords: ["사주 가이드", "명리학 기본", "오행", "십성", "대운", "Code Destiny"],
    }),
    // 화면의 FAQ 카드와 같은 배열을 넘긴다 — 스키마와 본문이 다른 문답이면 리치결과 정책 위반.
    buildFaqPageJsonLd(faqItems),
  ],
});

export default function SajuGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guideJsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">사주 명리학 기본 가이드</h1>
        <p className="cd-main-intro">
          사주(사주팔자)는 태어난 연·월·일·시를 각각 천간과 지지 두 글자로 옮긴 네 기둥, 모두 여덟 글자의 명식입니다. 명리학은 이 여덟 글자 가운데 태어난 날의 천간(일간)을 나로 두고, 나머지 글자가 나를 돕는지 제어하는지와 오행이 어디에 몰리고 비었는지를 읽습니다. Code Destiny에서는 이 흐름을 겁주거나 단정하기보다, 자기 이해와 현실적인 판단을 돕는 참고 자료로 풀이합니다.
        </p>
      </header>

      <ContentIntegrityNote
        contentSource="authored"
        datePublished={GUIDE_ARTICLE.datePublished}
        dateModified={GUIDE_ARTICLE.dateModified}
        tone="dark"
      />

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
        <h2>{sajuGuideText("calculation")}</h2>
        <p>
          실제 고객 사례가 아니라 계산 순서를 보여 주려고 고른 가상 입력입니다. 1997년 2월 10일 오후 2시 30분, 서울 출생 여성으로 두고 명식을 세워 보겠습니다. 이 명식의 좋고 나쁨을 판정하는 예시가 아닙니다.
        </p>
        <ol>
          {calculationSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
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
        <Link href="/manse" className="cd-chip">무료 만세력으로 명식 세우기</Link>
        <Link href="/saju/basic" className="cd-chip">기본 사주 보기</Link>
        <Link href="/compatibility" className="cd-chip">궁합 보기</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
