import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";

const ZIWEI_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    metaTitle: "자미두수 명반 읽는 법 | Code Destiny",
    observe: "자미두수가 비추는 것",
    inputs: "필요한 입력값",
    useCases: "언제 참고하면 좋은가",
    access: "무료와 유료 범위",
    flow: "해석 흐름",
    resultItems: "결과에서 확인할 수 있는 항목",
    sample: "짧은 예시 리딩",
    caution: "해석 시 주의할 점",
  },
};

function ziweiGuideText(key) {
  return ZIWEI_GUIDE_TEXT_TRANSLATIONS.ko[key];
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/ziwei/guide",
    title: ziweiGuideText("metaTitle"),
    description:
      "자미두수 명반이 무엇을 살피는지, 생년월일과 출생시간이 왜 필요한지, 12궁과 주성, 대운 흐름을 어떻게 읽는지 안내합니다.",
    keywords: ["자미두수 가이드", "자미두수 명반", "12궁", "주성", "대운", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일과 출생시간을 바탕으로 명궁과 12궁의 위치를 세웁니다.",
  "자미, 천부, 무곡, 태양, 태음 같은 주요 별이 어느 궁에 머무는지 살핍니다.",
  "명궁 하나만 보지 않고 재백궁, 관록궁, 부처궁, 복덕궁처럼 서로 이어진 궁을 함께 읽습니다.",
  "대운과 세운은 특정 사건을 확정하기보다 시기마다 강해지는 관심사와 책임의 방향으로 참고합니다.",
];

const resultItems = [
  "타고난 기질과 삶을 밀어 가는 중심 욕구",
  "일, 재물, 관계, 가족, 마음의 휴식이 드러나는 궁의 균형",
  "강한 별과 부드러운 별이 만드는 행동 방식",
  "시기별로 주목할 만한 변화의 배경",
  "현실 판단과 함께 확인해야 할 주의사항",
];

const faqItems = [
  {
    question: "자미두수는 사주와 무엇이 다른가요?",
    answer:
      "사주가 네 기둥의 오행과 십성을 중심으로 흐름을 읽는다면, 자미두수는 명반의 궁과 별 배치를 통해 삶의 영역을 더 세분해 바라봅니다. 두 체계는 경쟁하기보다 서로 다른 렌즈로 이해하면 좋습니다.",
  },
  {
    question: "출생시간이 꼭 필요한가요?",
    answer:
      "자미두수는 출생시간에 따라 명궁과 별의 배치가 크게 달라질 수 있습니다. 시간이 불확실하면 세부 궁 해석보다 큰 성향과 반복되는 주제 중심으로 읽는 편이 안전합니다.",
  },
  {
    question: "나쁜 궁이 나오면 실제로 나쁜 일이 생기나요?",
    answer:
      "어떤 궁도 단독으로 불운을 확정하지 않습니다. 긴장된 배치는 조심할 영역을 알려 주는 신호에 가깝고, 현실의 선택과 준비에 따라 다르게 드러날 수 있습니다.",
  },
];

// 발행일은 이 파일의 첫 커밋일(git log --diff-filter=A), 수정일은 검수 노트·Article 을 붙인 날.
// 짝 구현: app/guides/[slug]/page.js 의 @graph(BreadcrumbList·Article·FAQPage) + ContentIntegrityNote.
const GUIDE_ARTICLE = {
  path: "/ziwei/guide",
  title: "자미두수 명반 읽는 법",
  description:
    "자미두수 명반이 무엇을 살피는지, 생년월일과 출생시간이 왜 필요한지, 12궁과 주성, 대운 흐름을 어떻게 읽는지 안내합니다.",
  datePublished: "2026-06-21",
  dateModified: "2026-09-06",
};

const guideJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "자미두수 서비스", path: "/ziwei" },
      { name: GUIDE_ARTICLE.title, path: GUIDE_ARTICLE.path },
    ]),
    buildArticleJsonLd({
      ...GUIDE_ARTICLE,
      category: "자미두수 서비스",
      keywords: ["자미두수 가이드", "자미두수 명반", "12궁", "주성", "대운", "Code Destiny"],
    }),
    // 화면의 FAQ 카드와 같은 배열을 넘긴다 — 스키마와 본문이 다른 문답이면 리치결과 정책 위반.
    buildFaqPageJsonLd(faqItems),
  ],
});

export default function ZiweiGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guideJsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">자미두수 명반 읽는 법</h1>
        <p className="cd-main-intro">
          자미두수는 태어난 순간의 별자리를 12개의 궁으로 펼쳐, 삶의 여러 방이 어떤 빛을 받고 있는지 살피는 동양 점술 체계입니다. Code Destiny는 명반을 단정의 도구가 아니라, 일과 관계, 마음의 방향을 차분히 정리하는 상징 지도로 안내합니다.
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
          <h2>{ziweiGuideText("observe")}</h2>
          <p>
            자미두수는 명궁, 형제궁, 부처궁, 자녀궁, 재백궁, 질액궁, 천이궁, 노복궁, 관록궁, 전택궁, 복덕궁, 부모궁을 통해 삶의 영역을 나누어 봅니다. 한 궁의 별만으로 결론을 내리지 않고, 서로 마주 보는 궁과 삼방사정의 연결을 함께 살피는 것이 핵심입니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{ziweiGuideText("inputs")}</h2>
          <p>
            생년월일, 출생시간, 성별, 양력·음력 여부가 기본 입력값입니다. 특히 출생시간은 명궁과 별의 위치를 정하는 데 중요합니다. 시간이 애매하다면 결과를 절대값으로 붙잡기보다 반복되는 성향과 현재 상황에 맞는 조언을 중심으로 참고해야 합니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{ziweiGuideText("useCases")}</h2>
          <p>
            직업의 방향이 자주 바뀔 때, 관계에서 내가 맡는 역할을 알고 싶을 때, 재물과 책임의 흐름을 큰 그림으로 보고 싶을 때 도움이 됩니다. 자미두수는 선택지를 줄이는 도구가 아니라 자신이 어떤 방식으로 선택하는지 비추는 거울에 가깝습니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{ziweiGuideText("access")}</h2>
          <p>
            무료 영역은 명궁과 주요 별, 핵심 궁의 분위기를 중심으로 안내합니다. 유료 리포트는 여러 궁의 상호 관계, 대운 흐름, 관계와 일의 세부 조언을 더 길게 풀어 줍니다. 결제 여부가 결과의 좋고 나쁨을 바꾸지는 않습니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{ziweiGuideText("flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{ziweiGuideText("resultItems")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{ziweiGuideText("sample")}</h2>
        <p>
          관록궁에 추진력을 주는 별이 강하고 복덕궁이 예민하게 반응한다면, 일에서는 책임을 빨리 맡는 흐름이 드러나지만 마음의 회복 속도는 늦을 수 있습니다. 이럴 때는 성취를 밀어붙이기 전에 휴식과 역할의 경계를 함께 세우는 편이 안정적입니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{ziweiGuideText("caution")}</h2>
        <p>
          자미두수는 의료 진단, 투자 판단, 법률 자문, 결혼과 이혼, 소송, 진로 선택의 유일한 근거가 아닙니다. 결과가 불안하게 느껴질수록 현실 자료와 전문가 상담을 함께 확인해야 합니다.
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

      <GuideCta target={GUIDE_CTA_TARGETS["/ziwei/guide"]} />

      <nav className="cd-chip-wrap" aria-label="자미두수 가이드 관련 링크">
        <Link href="/ziwei" className="cd-chip">자미두수 서비스</Link>
        <Link href="/ziwei/chart" className="cd-chip">자미두수 명반 보기</Link>
        <Link href="/insights/ziwei" className="cd-chip">자미두수 인사이트</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
