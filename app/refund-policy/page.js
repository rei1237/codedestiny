import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { I18N_POLICY_ROUTE_MAP } from "../../lib/i18n/routes";
import { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from "../terms-of-service/TermsContent";

/**
 * 한국어 환불·청약철회 정책 — en/ja/zh/zh-TW 에는 있고 ko 에만 없던 페이지.
 *
 * 🔴 **본문을 여기에 다시 쓰지 않는다.** 이용약관 12조 섹션 객체를 그대로 렌더한다.
 *    같은 계약을 두 벌로 적어 두면 개정 때 한쪽만 고쳐지고, 그러면 어느 쪽이 정본인지 다투게 된다
 *    (`lib/legal/refundContent.ts` 머리주석이 번역본에 대해 이미 같은 말을 하고 있다).
 *    비-ko 4개 로케일도 정확히 같은 구조다 — `getRefundSection(locale)` 이 그 로케일 약관 12조를
 *    그대로 읽어 온다(`app/[locale]/refund-policy/page.js`).
 *
 * 🔴 이 라우트가 생기면서 refund-policy hreflang 묶음의 ko 자리가 채워진다. 그 전에는 ko URL 이
 *    없어 `x-default` 가 홈(`/`)으로 폴백하고 있었다 — 정책 페이지 묶음이 홈을 기본값으로 가리키는
 *    모양이었다. `lib/i18n/routes.ts` 와 `scripts/generate-sitemap.mjs` 를 함께 고쳐야 한다
 *    (HTML hreflang 과 사이트맵 `xhtml:link` 가 어긋나면 Google 이 그 쌍을 통째로 버린다).
 */
const REFUND_SECTION = TERMS_SECTIONS.find((section) => section.id === "refund-policy");

export function generateMetadata() {
  return generatePageMetadata({
    path: "/refund-policy",
    title: "환불 및 청약철회 정책 | Refund Policy — Code Destiny",
    description:
      "Code Destiny의 30일 이용권과 원화 단건 결제에 대한 환불·청약철회 기준입니다. 청약철회 기간, 디지털 콘텐츠 제공 개시에 따른 제한, 월정석 취급, 환급 처리 기간을 안내합니다.",
    keywords: ["환불 정책", "청약철회", "이용권 환불", "단건 결제 환불", "전자상거래법"],
    hreflangPaths: I18N_POLICY_ROUTE_MAP.refundPolicy,
  });
}

export default function RefundPolicyPage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">환불 및 청약철회 정책</h1>
        <p className="policy-doc__meta">시행일 {TERMS_EFFECTIVE_DATE} · Refund Policy</p>
        <p className="policy-doc__lede">
          Code Destiny의 유료 상품(30일 이용권, 상품별 원화 단건 결제)에 대한 환불·청약철회 기준입니다.
          내용은 이용약관 제12조와 동일하며, 결제 전후에 찾아보기 쉽도록 별도 페이지로 제공합니다.
        </p>
      </header>

      <div className="policy-doc__layout">
        <div className="policy-doc__body">
          <section id={REFUND_SECTION.id} className="policy-doc__section">
            <h2 className="policy-doc__section-title">{REFUND_SECTION.heading}</h2>
            {REFUND_SECTION.body}
          </section>

          <nav className="policy-doc__related" aria-label="관련 문서">
            <Link className="policy-doc__toc-link" href="/terms#refund-policy">
              이용약관 제12조 전문
            </Link>
            <Link className="policy-doc__toc-link" href="/privacy">
              개인정보처리방침
            </Link>
            <Link className="policy-doc__toc-link" href="/contact">
              문의하기
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
