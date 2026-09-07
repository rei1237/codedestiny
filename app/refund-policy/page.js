import PolicyGuide, { policyPageClass, PolicyAccordion } from "../components/PolicyGuide";
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
      "Code Destiny의 30일 이용권과 원화 단건 결제 환불·청약철회 기준입니다. 철회 기간, 디지털 콘텐츠 제공 개시에 따른 제한, 월정석 취급, 환급 기간을 안내합니다.",
    keywords: ["환불 정책", "청약철회", "이용권 환불", "단건 결제 환불", "전자상거래법"],
    hreflangPaths: I18N_POLICY_ROUTE_MAP.refundPolicy,
  });
}

export default function RefundPolicyPage() {
  return (
    <main className={`policy-doc ${policyPageClass}`}>
      <PolicyGuide kind="refund" title="환불·취소 안내" description="단건 결제와 30일 이용권의 환불·청약철회 기준입니다. 아래 전문은 이용약관 제12조와 동일합니다." meta={`시행일 ${TERMS_EFFECTIVE_DATE}`} />

      <PolicyAccordion id="payment-help" title="결제 반영이 늦거나, 모바일 결제 후 돌아오지 못했어요">
        <p>결제 완료 내역이 있는데 결과나 이용권이 보이지 않으면, 추가 결제 전에 결제 내역과 현재 이용 상태를 확인해 주세요.</p>
        <p>결제 후 원래 화면으로 돌아오지 못했거나 반영이 지연되는 경우, 결제 시각·상품명·결제 내역과 문제가 발생한 화면을 고객센터에 알려주세요. 카드번호 전체나 비밀번호는 보내지 마세요.</p>
        <Link href="/contact">결제 내역을 기준으로 문의하기</Link>
      </PolicyAccordion>
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
