import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { cmsQaList } from "../../lib/cms/build-text";
import { FAQS_DEFAULT } from "../_content/faq-copy";
import { getEditorNote } from "../_content/editor-notes";
import EditorNote from "../components/EditorNote";

const seo = publicSeoPages.faq;

export const dynamic = "force-static";


// 관리자 CMS(페이지 → 자주 묻는 질문)에서 고친 목록을 쓴다. 비어 있으면 위 기본 목록.
const faqs = cmsQaList("faq", "faq-page", "items", FAQS_DEFAULT);

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

      <EditorNote note={getEditorNote("/faq")} className="cd-editor-note" />

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
