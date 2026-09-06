import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";

const ASTROLOGY_GUIDE_TEXT_TRANSLATIONS = {
  ko: {
    "metadata.title": "서양 점성술 기본 구조 | Code Destiny",
    heading: "서양 점성술 기본 구조",
    "section.scope": "점성술이 살피는 것",
    "section.inputs": "필요한 입력값",
    "section.when": "어떤 때 참고하면 좋은가",
    "section.freePaid": "무료와 유료 범위",
    "section.flow": "해석 흐름",
    "section.results": "결과에서 확인할 수 있는 항목",
    "section.example": "짧은 예시 리딩",
    "section.caution": "해석 시 주의할 점",
  },
  en: {
    "metadata.title": "Western Astrology Basics | Code Destiny",
    heading: "Western Astrology Basics",
    "section.scope": "What Astrology Looks At",
    "section.inputs": "Required Inputs",
    "section.when": "When It Helps",
    "section.freePaid": "Free and Paid Scope",
    "section.flow": "Reading Flow",
    "section.results": "What You Can Check in the Result",
    "section.example": "Short Sample Reading",
    "section.caution": "What to Keep in Mind",
  },
  ja: {
    "metadata.title": "西洋占星術の基本構造 | Code Destiny",
    heading: "西洋占星術の基本構造",
    "section.scope": "占星術が見つめるもの",
    "section.inputs": "必要な入力項目",
    "section.when": "参考にしやすい場面",
    "section.freePaid": "無料と有料の範囲",
    "section.flow": "解釈の流れ",
    "section.results": "結果で確認できる項目",
    "section.example": "短いサンプルリーディング",
    "section.caution": "解釈時の注意点",
  },
  "zh-CN": {
    "metadata.title": "西洋占星术基础结构 | Code Destiny",
    heading: "西洋占星术基础结构",
    "section.scope": "占星术会观察什么",
    "section.inputs": "需要输入的信息",
    "section.when": "适合参考的时刻",
    "section.freePaid": "免费与付费范围",
    "section.flow": "解读流程",
    "section.results": "结果中可查看的项目",
    "section.example": "简短示例解读",
    "section.caution": "解读时的注意事项",
  },
  "zh-TW": {
    "metadata.title": "西洋占星術基礎結構 | Code Destiny",
    heading: "西洋占星術基礎結構",
    "section.scope": "占星術會觀察什麼",
    "section.inputs": "需要輸入的資訊",
    "section.when": "適合參考的時刻",
    "section.freePaid": "免費與付費範圍",
    "section.flow": "解讀流程",
    "section.results": "結果中可查看的項目",
    "section.example": "簡短示例解讀",
    "section.caution": "解讀時的注意事項",
  },
};

function astrologyGuideText(key) {
  return ASTROLOGY_GUIDE_TEXT_TRANSLATIONS.ko[key] || ASTROLOGY_GUIDE_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

export function generateMetadata() {
  return generatePageMetadata({
    path: "/astrology/guide",
    title: astrologyGuideText("metadata.title"),
    description:
      "서양 점성술의 출생 차트, 행성, 별자리, 하우스, 애스펙트를 어떻게 읽는지와 입력값, 샘플 리딩, 주의사항을 안내합니다.",
    keywords: ["서양 점성술 가이드", "출생 차트", "하우스", "애스펙트", "점성술", "Code Destiny"],
  });
}

const flowItems = [
  "생년월일, 출생시간, 출생지를 바탕으로 출생 차트의 행성 위치를 계산합니다.",
  "태양, 달, 상승궁은 기질의 중심과 감정 반응, 바깥으로 드러나는 태도를 살피는 기본 축입니다.",
  "하우스는 관계, 일, 재물, 건강, 배움처럼 삶의 무대가 어디에서 열리는지 보여 줍니다.",
  "행성 사이의 각도는 조화와 긴장, 반복되는 선택 패턴을 읽는 데 사용합니다.",
];

const resultItems = [
  "태양·달·상승궁의 기본 성향",
  "관계와 일에서 자주 반복되는 반응 방식",
  "강하게 작동하는 하우스와 삶의 관심사",
  "긴장된 애스펙트가 알려 주는 조율 지점",
  "현실 판단과 함께 확인해야 할 주의사항",
];

const faqItems = [
  {
    question: "출생시간을 모르면 점성술 차트를 볼 수 없나요?",
    answer:
      "태양과 여러 행성의 별자리는 확인할 수 있지만 상승궁과 하우스 배치는 달라질 수 있습니다. 시간이 불확실하면 성향의 큰 흐름을 중심으로 참고하는 편이 안전합니다.",
  },
  {
    question: "태양별자리만으로 성격을 알 수 있나요?",
    answer:
      "태양별자리는 중요한 축이지만 전체 차트의 일부입니다. 달, 상승궁, 행성의 하우스와 각도를 함께 보아야 더 균형 있는 해석이 열립니다.",
  },
  {
    question: "나쁜 애스펙트가 있으면 불운한가요?",
    answer:
      "긴장된 각도는 불운 확정보다 조율이 필요한 힘을 뜻하는 경우가 많습니다. 잘 다루면 집중력, 훈련, 현실 감각으로 바뀔 수 있습니다.",
  },
];

// 발행일은 이 파일의 첫 커밋일(git log --diff-filter=A), 수정일은 검수 노트·Article 을 붙인 날.
// 짝 구현: app/guides/[slug]/page.js 의 @graph(BreadcrumbList·Article·FAQPage) + ContentIntegrityNote.
const GUIDE_ARTICLE = {
  path: "/astrology/guide",
  title: astrologyGuideText("heading"),
  description:
    "서양 점성술의 출생 차트, 행성, 별자리, 하우스, 애스펙트를 어떻게 읽는지와 입력값, 샘플 리딩, 주의사항을 안내합니다.",
  datePublished: "2026-06-21",
  dateModified: "2026-09-06",
};

const guideJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "점성술 서비스", path: "/astrology" },
      { name: GUIDE_ARTICLE.title, path: GUIDE_ARTICLE.path },
    ]),
    buildArticleJsonLd({
      ...GUIDE_ARTICLE,
      category: "점성술 서비스",
      keywords: ["서양 점성술 가이드", "출생 차트", "하우스", "애스펙트", "점성술", "Code Destiny"],
    }),
    // 화면의 FAQ 카드와 같은 배열을 넘긴다 — 스키마와 본문이 다른 문답이면 리치결과 정책 위반.
    buildFaqPageJsonLd(faqItems),
  ],
});

export default function AstrologyGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guideJsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">{astrologyGuideText("heading")}</h1>
        <p className="cd-main-intro">
          서양 점성술은 태어난 순간의 하늘을 하나의 차트로 펼쳐, 행성의 위치와 서로의 각도를 통해 기질과 관계, 선택의 리듬을 살피는 상징 체계입니다. Code Destiny는 차트를 확정적 예언이 아니라 자기 이해를 돕는 지도처럼 읽습니다.
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
          <h2>{astrologyGuideText("section.scope")}</h2>
          <p>
            점성술은 한 사람의 성향을 하나의 별자리로 단정하지 않습니다. 태양은 삶의 중심 의지, 달은 감정과 안정감, 상승궁은 세상과 만나는 방식을 비추며, 각 행성과 하우스가 더해질 때 더 입체적인 흐름이 드러납니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{astrologyGuideText("section.inputs")}</h2>
          <p>
            생년월일, 출생시간, 출생지가 기본 입력값입니다. 출생시간은 상승궁과 하우스 계산에 중요하고, 출생지는 그 순간 하늘의 위치를 지역 기준으로 맞추는 데 필요합니다. 값이 정확할수록 해석의 초점도 분명해집니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{astrologyGuideText("section.when")}</h2>
          <p>
            내 감정과 행동이 다르게 움직이는 이유가 궁금할 때, 관계에서 반복되는 반응을 정리하고 싶을 때, 일과 배움의 방향을 큰 흐름으로 보고 싶을 때 도움이 됩니다. 차트는 선택을 대신하지 않고 선택의 배경을 비춥니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{astrologyGuideText("section.freePaid")}</h2>
          <p>
            무료 영역은 태양·달·상승궁과 주요 행성의 기본 의미를 중심으로 안내합니다. 유료 리포트는 하우스, 애스펙트, 관계와 시기 흐름을 더 세밀하게 풀어 줍니다. 결제 여부가 미래를 바꾸는 것은 아닙니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{astrologyGuideText("section.flow")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{astrologyGuideText("section.results")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{astrologyGuideText("section.example")}</h2>
        <p>
          태양이 불의 별자리에 있고 달이 물의 별자리에 머문다면, 겉으로는 빠르게 움직이고 싶지만 마음은 충분한 안정과 공감을 필요로 할 수 있습니다. 이 흐름은 추진력과 섬세함이 함께 있는 구조이므로, 결정을 서두르기보다 감정의 회복 시간을 일정 안에 남겨 두는 편이 좋습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{astrologyGuideText("section.caution")}</h2>
        <p>
          점성술은 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 건강, 법률, 투자, 결혼, 이혼, 소송, 진로처럼 중대한 결정은 차트 결과만으로 정하지 말고, 현실 정보와 자격 있는 전문가의 조언을 함께 확인해야 합니다.
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

      <GuideCta target={GUIDE_CTA_TARGETS["/astrology/guide"]} />

      <nav className="cd-chip-wrap" aria-label="점성술 가이드 관련 링크">
        <Link href="/astrology" className="cd-chip">점성술 서비스</Link>
        <Link href="/astrology/cosmic" className="cd-chip">코즈믹 차트</Link>
        <Link href="/insights/astrology" className="cd-chip">점성술 인사이트</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
