import PolicyGuide, { policyPageClass } from "../components/PolicyGuide";
import { trustRoutes } from "../../lib/i18n/public-trust-copy.mjs";
import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../lib/structured-data";
import { serializeJsonLd } from "../../lib/seo/json-ld.mjs";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { cmsQaList } from "../../lib/cms/build-text";
import { FAQS_DEFAULT } from "../_content/faq-copy";
import { PUBLIC_RECORD_PATH } from "../../lib/seo/public-record-copy.mjs";
import { getEditorNote } from "../_content/editor-notes";
import EditorNote from "../components/EditorNote";
import FaqExplorer from "./FaqExplorer";
import styles from "./faq.module.css";
import { mergeOfficialInformation } from "../../lib/brand/official-information.mjs";

const seo = publicSeoPages.faq;

export const dynamic = "force-static";


// 관리자 CMS(페이지 → 자주 묻는 질문)에서 고친 목록을 쓴다. 비어 있으면 위 기본 목록.
const faqs = mergeOfficialInformation(cmsQaList("faq", "faq-page", "items", FAQS_DEFAULT));

export const metadata = buildSeoMetadata({ ...seo, hreflang: trustRoutes("faq") });

const jsonLd = serializeJsonLd({
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
      <PolicyGuide
        kind="faq"
        title="꿀꿀 운세 이용 안내와 자주 묻는 질문"
        description="공식 서비스와 영냥이의 관계, 무료 도구와 유료 상담, 결과 생성·보관 방식을 확인하세요."
      />

      <FaqExplorer items={faqs} />

      <EditorNote note={getEditorNote("/faq")} className="cd-editor-note" />

      <section className={styles.readingGuide} aria-labelledby="faq-guide-title">
        <div className={styles.guideIntro}>
          <h2 id="faq-guide-title">조금 더 알아보고 싶다면</h2>
          <p>상담을 고르기 전에, 풀이의 기준과 서비스 이야기를 살펴보세요.</p>
          <Link href="/fusion-fortune/" className={styles.guidePrimary}>초융합 운세 살펴보기<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></Link>
        </div>
        <nav className={styles.guideReading} aria-label="FAQ 관련 문서">
          <Link href={PUBLIC_RECORD_PATH}><span><strong>대통령 사주 공개 분석 기록</strong><small>공개 원문과 실제 사건의 흐름을 비교해요</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></Link>
          <Link href="/methodology"><span><strong>운세 콘텐츠 방법론</strong><small>계산과 해석이 만들어지는 기준을 읽어보세요</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></Link>
        </nav>
        <nav className={styles.guidePolicies} aria-label="서비스 및 이용 정책">
          <Link href="/">공식 사이트 안내</Link>
          <Link href="/about">서비스 소개</Link>
          <Link href="/consultation-samples/">공개 결과 예시</Link>
          <Link href="/neo-consultation/">네오 직접 검수 상담</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/terms">이용약관</Link>
        </nav>
      </section>
    </main>
  );
}
