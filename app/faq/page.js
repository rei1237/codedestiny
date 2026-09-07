import PolicyGuide, { policyPageClass } from "../components/PolicyGuide";
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
    <main className={`cd-main-shell ${policyPageClass}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PolicyGuide kind="faq" title="자주 묻는 질문" description="무료 운세부터 이용권, 결제와 프로필까지 궁금한 항목을 펼쳐보세요." />

      <EditorNote note={getEditorNote("/faq")} className="cd-editor-note" />

      <section className="cd-card-grid" id="faq-list" aria-label="질문과 답변">
        {faqs.map((item) => (
          <details key={item.question} className="cd-card">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
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
