import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.methodology;

export const metadata = buildSeoMetadata(seo);

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "운세 콘텐츠 방법론과 면책 고지", path: "/methodology" },
    ]),
    buildWebPageJsonLd(seo),
  ],
});

const sections = [
  {
    title: "콘텐츠 작성 기준",
    body: "사주, 타로, 자미두수, 점성술, 숙요점은 서로 다른 상징 체계를 사용합니다. Code Destiny는 각 체계의 기본 개념을 분리해 설명하고, 결과 문장은 사용자가 현실의 선택지를 점검할 수 있도록 작성합니다.",
  },
  {
    title: "검증과 업데이트",
    body: "공개 가이드와 FAQ는 표현 오류, 과장 문구, 내부 작업용 문구가 노출되지 않도록 점검합니다. 서비스 정책이나 기능이 변경되면 관련 문서와 내부 링크를 함께 갱신합니다.",
  },
  {
    title: "면책 고지",
    body: "운세 콘텐츠는 오락과 자기성찰 목적의 참고 자료입니다. 의료, 법률, 금융, 투자, 진로 계약처럼 중대한 결정은 해당 분야의 전문가와 상담해야 합니다.",
  },
  {
    title: "사용자 보호 원칙",
    body: "불안을 조장하거나 특정 행동을 강요하는 표현을 피합니다. 결과는 가능성과 관찰 포인트를 안내하며, 최종 선택과 책임은 사용자에게 있음을 명확히 고지합니다.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">운세 콘텐츠 방법론과 면책 고지</h1>
        <p className="cd-main-intro">
          Code Destiny의 운세 해석은 전통 상징 체계와 현대적인 자기성찰 문장을 결합해 제공합니다.
          검색엔진과 사용자에게 같은 본문, 같은 고지, 같은 내부 링크를 보여주는 것을 원칙으로 합니다.
        </p>
      </header>

      <section className="cd-card-grid">
        {sections.map((section) => (
          <article key={section.title} className="cd-card">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      <nav className="cd-chip-wrap" aria-label="방법론 관련 링크">
        <Link href="/faq" className="cd-chip">자주 묻는 질문</Link>
        <Link href="/high-value" className="cd-chip">운세 인사이트 가이드</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/contact" className="cd-chip">문의하기</Link>
      </nav>
    </main>
  );
}
