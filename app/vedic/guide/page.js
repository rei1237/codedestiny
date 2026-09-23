import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";

const VEDIC_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    metaTitle: "베다 점성술 기본 구조 | Code Destiny",
    observe: "베다 점성술이 살피는 것",
    inputs: "필요한 입력값",
    useCases: "어떤 때 참고하면 좋은가",
    access: "무료와 유료 범위",
    flow: "해석 흐름",
    resultItems: "결과에서 확인할 수 있는 항목",
    calculation: "계산 예시 — 사이더리얼 좌표에서 나크샤트라·다샤까지",
    sample: "짧은 예시 리딩",
    caution: "해석 시 주의할 점",
  },
};

function vedicGuideText(key) {
  return VEDIC_GUIDE_TEXT_TRANSLATIONS.ko[key];
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/vedic/guide",
    title: vedicGuideText("metaTitle"),
    description:
      "베다 점성술의 라시 차트, 라그나, 나크샤트라, 다샤 흐름을 어떻게 읽는지와 입력값, 샘플 리딩, 주의사항을 안내합니다.",
    keywords: ["베다 점성술 가이드", "베다점 운세", "베다 점성술", "조티쉬", "라시 차트", "라그나", "나크샤트라", "다샤", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일, 출생시간, 출생지를 기준으로 라그나와 라시 차트의 행성 배치를 세웁니다.",
  "달의 위치와 나크샤트라는 마음의 반응, 기억, 관계의 섬세한 결을 읽는 데 사용합니다.",
  "하우스와 행성의 힘은 일, 관계, 재물, 배움, 휴식의 방향을 나누어 보여 줍니다.",
  "다샤는 특정 사건을 확정하기보다 어떤 주제가 삶의 전면에 떠오르는지 살피는 시간의 언어로 봅니다.",
];

const resultItems = [
  "라그나와 달 별자리의 기본 기질",
  "나크샤트라가 비추는 감정과 관계의 습관",
  "강하게 작동하는 하우스와 삶의 주제",
  "다샤 흐름에서 주목할 변화의 배경",
  "현실 판단과 함께 확인해야 할 주의사항",
];

// 가상 입력(lib/seo-reading-examples.js 의 SEO_EXAMPLE_BIRTH)으로 세운 차트. 황경·라그나·나크샤트라·다샤는
// __tests__/ui/core-landing-calculation-examples.test.mjs 가 베다 엔진 결과와 맞춰 본다.
const calculationSteps = [
  "좌표 — 이 날의 라히리 아야남샤는 약 23.82도입니다. 계절 기준인 트로피컬 황경에서 이 값을 빼면 베다 점성술이 쓰는 사이더리얼 황경이 됩니다.",
  "라그나 — 태어난 순간 동쪽 지평선의 지점은 쌍둥이자리 14.49도(나크샤트라 아르드라)입니다. 서양 차트의 상승점 게자리 8.31도가 앞 별자리로 넘어간 결과입니다.",
  "행성 배치 — 쌍둥이자리를 1하우스로 두는 홀 사인 방식에서 태양은 염소자리 27.71도로 8하우스, 달은 물고기자리 4.35도로 10하우스에 놓입니다.",
  "나크샤트라 — 달의 황경 334.35도는 우타라 바드라파다(333.33~346.67도)의 첫 파다이고, 이 나크샤트라의 지배 행성은 토성입니다.",
  "다샤 — 첫 다샤는 토성이며, 달이 구간을 약 1.02도만 지났으므로 19년 가운데 약 17.55년이 남습니다. 토성 다샤는 2014년 8월 31일에 끝나고 수성 다샤가 2031년 8월 31일까지 이어집니다.",
  "요가 — 물고기자리의 달과 처녀자리의 화성이 서로 일곱 번째 자리에서 마주 보아 찬드라 망갈라 요가가 성립합니다. 조합의 이름일 뿐 재물이나 사건을 확정하는 판정은 아닙니다.",
];

const faqItems = [
  {
    question: "베다 점성술은 서양 점성술과 무엇이 다른가요?",
    answer:
      "베다 점성술은 항성 기준의 조디악과 라그나, 나크샤트라, 다샤 체계를 중요하게 다룹니다. 서양 점성술과 같은 하늘을 보지만 계산 기준과 해석 언어가 다릅니다.",
  },
  {
    question: "출생시간이 왜 중요한가요?",
    answer:
      "라그나와 하우스 배치가 출생시간에 따라 달라지기 때문입니다. 시간이 불확실하면 세부 시기 판단보다 큰 성향과 반복되는 삶의 주제를 중심으로 참고해야 합니다.",
  },
  {
    question: "다샤가 힘들게 나오면 조심해야 하나요?",
    answer:
      "다샤는 불운을 확정하지 않습니다. 그 시기에 어떤 행성의 주제가 강해지는지 알려 주는 흐름이므로, 현실적인 준비와 균형 잡힌 생활 리듬을 함께 보는 것이 좋습니다.",
  },
  {
    question: "서양 차트와 태양 별자리가 다르게 나오는 이유는 무엇인가요?",
    answer:
      "베다 점성술은 세차 운동만큼 기준점을 뒤로 물린 사이더리얼 황도대를 쓰기 때문입니다. 지금은 두 황도대가 약 23.8도 벌어져 있어, 서양 차트에서 별자리 안 23.8도보다 앞에 있던 행성만 베다 차트에서 앞 별자리로 넘어갑니다. 예를 들어 1997년 2월 10일 오후 2시 30분 서울 출생이라면 물병자리 21.52도의 태양은 염소자리 27.71도가 되고, 물고기자리 28.17도의 달은 물고기자리에 남습니다.",
  },
];

// 발행일은 이 파일의 첫 커밋일(git log --diff-filter=A), 수정일은 본문을 마지막으로 고친 날(계산 예시·정의 문단).
// 짝 구현: app/guides/[slug]/page.js 의 @graph(BreadcrumbList·Article·FAQPage) + ContentIntegrityNote.
const GUIDE_ARTICLE = {
  path: "/vedic/guide",
  title: "베다 점성술 기본 구조",
  description:
    "베다 점성술의 라시 차트, 라그나, 나크샤트라, 다샤 흐름을 어떻게 읽는지와 입력값, 샘플 리딩, 주의사항을 안내합니다.",
  datePublished: "2026-06-21",
  dateModified: "2026-09-24",
};

const guideJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "베다 점성술 서비스", path: "/vedic" },
      { name: GUIDE_ARTICLE.title, path: GUIDE_ARTICLE.path },
    ]),
    buildArticleJsonLd({
      ...GUIDE_ARTICLE,
      category: "베다 점성술 서비스",
      keywords: ["베다 점성술 가이드", "베다점 운세", "베다 점성술", "조티쉬", "라시 차트", "라그나", "나크샤트라", "다샤", "Code Destiny"],
    }),
    // 화면의 FAQ 카드와 같은 배열을 넘긴다 — 스키마와 본문이 다른 문답이면 리치결과 정책 위반.
    buildFaqPageJsonLd(faqItems),
  ],
});

export default function VedicGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guideJsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">베다 점성술 기본 구조</h1>
        <p className="cd-main-intro">
          베다 점성술(조티쉬)은 태어난 순간의 하늘을 실제 별자리 위치에 맞춘 사이더리얼 황도대에 옮기고, 동쪽 지평선의 라그나를 1하우스로 삼아 행성을 배치한 뒤, 달이 머문 나크샤트라와 그 지배 행성에서 시작하는 다샤로 시기를 읽는 인도 전통의 별자리 해석 체계입니다. Code Destiny는 이 오래된 언어를 현실 판단과 함께 참고할 수 있는 상담형 해석으로 풀어냅니다.
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
          <h2>{vedicGuideText("observe")}</h2>
          <p>
            베다 점성술은 라그나가 여는 삶의 무대, 달이 비추는 마음의 습관, 행성이 놓인 하우스와 나크샤트라의 상징을 함께 살핍니다. 한 행성만으로 성격이나 사건을 단정하지 않고, 여러 요소가 서로 어떤 힘을 주고받는지 봅니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{vedicGuideText("inputs")}</h2>
          <p>
            생년월일, 출생시간, 출생지가 기본 입력값입니다. 출생시간은 라그나와 하우스를 세우는 데 중요하고, 출생지는 지역별 하늘의 위치를 맞추는 기준이 됩니다. 시간이 불확실하면 정밀한 시기 해석은 낮은 확신으로 보아야 합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{vedicGuideText("useCases")}</h2>
          <p>
            삶의 큰 방향이 바뀌는 느낌이 들 때, 반복되는 관계와 일의 주제를 정리하고 싶을 때, 특정 시기의 배경을 차분히 보고 싶을 때 도움이 됩니다. 결과는 선택을 강요하지 않고 지금 확인할 현실의 단서를 함께 보도록 이끕니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{vedicGuideText("access")}</h2>
          <p>
            무료 영역은 라그나, 달, 기본 하우스의 분위기를 중심으로 안내합니다. 유료 리포트는 나크샤트라, 행성의 상호작용, 다샤 흐름, 관계와 일의 세부 조언을 더 길게 다룹니다. 결제는 해석의 깊이를 넓히는 선택일 뿐 운명을 바꾸는 조건이 아닙니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{vedicGuideText("flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{vedicGuideText("resultItems")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{vedicGuideText("calculation")}</h2>
        <p>
          실제 고객 사례가 아니라 계산 순서를 보여 주려고 고른 가상 입력입니다. 1997년 2월 10일 오후 2시 30분, 서울 출생으로 두고 베다 차트를 세워 보겠습니다. 이 차트의 좋고 나쁨을 판정하는 예시가 아닙니다.
        </p>
        <ol className="mt-[14px] max-w-[66ch] list-decimal pl-[1.2em]">
          {calculationSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="cd-card">
        <h2>{vedicGuideText("sample")}</h2>
        <p>
          라그나가 현실적인 흙의 기운을 띠고 달이 섬세한 나크샤트라에 머문다면, 겉으로는 차분히 책임을 지는 사람처럼 보이지만 마음은 작은 말과 분위기에 깊이 반응할 수 있습니다. 이 흐름은 안정감을 만드는 힘과 감정의 예민함을 함께 돌볼 때 더 부드럽게 열립니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{vedicGuideText("caution")}</h2>
        <p>
          베다 점성술은 의료, 법률, 투자, 결혼, 이혼, 소송, 진로 결정의 유일한 근거가 아닙니다. 다샤나 행성 흐름이 무겁게 느껴질 때일수록 현실 자료, 주변의 도움, 자격 있는 전문가의 조언을 함께 확인해야 합니다.
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

      <GuideCta target={GUIDE_CTA_TARGETS["/vedic/guide"]} />

      <nav className="cd-chip-wrap" aria-label="베다 점성술 가이드 관련 링크">
        <Link href="/vedic" className="cd-chip">베다 점성술 서비스</Link>
        <Link href="/vedic/jyotish" className="cd-chip">조티시 차트</Link>
        <Link href="/insights/vedic" className="cd-chip">베다 인사이트</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
