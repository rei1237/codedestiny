import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

const seo = publicSeoPages.faq;

const faqs = [
  {
    question: "Code Destiny의 기본 운세 기능은 무료인가요?",
    answer: "사주, 타로, 오늘의 운세 등 주요 기능은 무료로 시작할 수 있습니다. 일부 심층 리포트나 PDF 상품은 별도 이용권 또는 결제가 필요할 수 있습니다.",
  },
  {
    question: "운세 결과는 확정된 미래를 의미하나요?",
    answer: "아닙니다. 모든 해석은 오락과 자기성찰을 위한 참고 자료이며, 법률, 의료, 투자, 금융 판단을 대신하지 않습니다.",
  },
  {
    question: "생년월일과 개인정보는 어떻게 다루나요?",
    answer: "운세 계산에 필요한 입력값은 기능 제공 목적에 맞춰 처리됩니다. 자세한 내용은 개인정보처리방침에서 확인할 수 있습니다.",
  },
  {
    question: "로그인이나 결제 페이지가 검색에 노출되나요?",
    answer: "로그인, 결제, 프로필, 개인화 결과 페이지는 검색 색인 대상이 아니며 noindex 정책을 적용합니다.",
  },
  {
    question: "사주와 타로 결과가 다르게 나오면 어떻게 보나요?",
    answer: "서로 다른 해석 체계를 사용하므로 결과를 하나의 정답으로 합치기보다 현재 상황을 여러 관점에서 점검하는 참고 자료로 보는 것이 좋습니다.",
  },
];

export const metadata = buildSeoMetadata(seo);

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "자주 묻는 질문", path: "/faq" },
    ]),
    buildFaqPageJsonLd(faqs),
  ],
});

export default function FaqPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">Code Destiny 자주 묻는 질문</h1>
        <p className="cd-main-intro">
          무료 사주, 만세력, 타로, 오늘의 운세, 궁합, 결제와 개인정보 처리에 관해 자주 묻는 질문을 정리했습니다.
        </p>
      </header>

      <section className="cd-card-grid">
        {faqs.map((item) => (
          <article key={item.question} className="cd-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <nav className="cd-chip-wrap" aria-label="FAQ 관련 문서">
        <Link href="/about" className="cd-chip">서비스 소개</Link>
        <Link href="/methodology" className="cd-chip">운세 콘텐츠 방법론</Link>
        <Link href="/privacy" className="cd-chip">개인정보처리방침</Link>
        <Link href="/terms" className="cd-chip">이용약관</Link>
      </nav>
    </main>
  );
}
