import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildAboutPageJsonLd, buildOrganizationJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.about;

export const metadata = buildSeoMetadata(seo);

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationJsonLd(),
    buildAboutPageJsonLd({
      path: "/about",
      title: seo.title,
      description: seo.description,
    }),
  ],
});

export default function AboutPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">Code Destiny 소개</h1>
        <p className="cd-main-intro">
          Code Destiny는 무료 사주팔자, 만세력, 타로, 오늘의 운세, 궁합, 자미두수, 점성술, 숙요점을 한곳에서 살펴볼 수 있는 한국어 운세 플랫폼입니다.
          모든 해석은 오락과 자기성찰을 돕는 참고 자료로 제공됩니다.
        </p>
      </header>

      <section className="cd-card">
        <h2>제공 서비스</h2>
        <ul>
          <li>사주 만세력, 오행, 십성, 대운 흐름 해석</li>
          <li>타로 카드 리딩과 연애, 재회, 마음 해석</li>
          <li>자미두수, 점성술, 숙요점, 궁합, 오늘의 운세</li>
          <li>프리미엄 리포트와 공개 가이드 문서</li>
        </ul>
      </section>

      <section className="cd-card">
        <h2>운영 원칙</h2>
        <p>
          개인의 선택을 대신하거나 불안을 조장하는 표현을 지양합니다.
          건강, 법률, 투자, 금융처럼 전문 판단이 필요한 영역은 반드시 해당 분야 전문가와 상담해야 합니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>관련 문서</h2>
        <div className="cd-chip-wrap">
          <Link href="/methodology" className="cd-chip">운세 콘텐츠 방법론</Link>
          <Link href="/faq" className="cd-chip">자주 묻는 질문</Link>
          <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
          <Link href="/high-value" className="cd-chip">운세 인사이트 가이드</Link>
        </div>
      </section>
    </main>
  );
}
