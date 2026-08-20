import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import TermsContent, { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from "./TermsContent";

const TERMS_OF_SERVICE_METADATA_COPY = {
  ko: {
    title: "Terms of Service | 이용약관 — Code Destiny",
    description:
      "Code Destiny 이용약관 페이지입니다. 서비스 이용 규칙, 면책, 책임 제한, 환불 정책 및 분쟁 처리 원칙을 안내합니다.",
    keywords: ["Terms of Service", "이용약관", "서비스 책임 제한", "면책", "환불 정책"],
  },
  en: {
    title: "Terms of Service | Code Destiny",
    description:
      "Code Destiny's terms of service explain service rules, disclaimers, liability limits, refund policy, and dispute handling principles.",
    keywords: ["Terms of Service", "service rules", "liability limits", "disclaimer", "refund policy"],
  },
  ja: {
    title: "利用規約 | Code Destiny",
    description:
      "Code Destinyの利用規約です。サービス利用ルール、免責、責任制限、返金ポリシー、紛争処理の原則を案内します。",
    keywords: ["利用規約", "サービス利用ルール", "責任制限", "免責", "返金ポリシー"],
  },
  zh: {
    title: "服务条款 | Code Destiny",
    description:
      "Code Destiny 服务条款说明服务使用规则、免责声明、责任限制、退款政策与争议处理原则。",
    keywords: ["服务条款", "使用规则", "责任限制", "免责声明", "退款政策"],
  },
};

export function generateMetadata() {
  const copy = TERMS_OF_SERVICE_METADATA_COPY.ko;
  const metadata = generatePageMetadata({
    path: "/terms",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });

  return {
    ...metadata,
    alternates: {
      ...(metadata.alternates || {}),
      canonical: "https://code-destiny.com/terms",
    },
  };
}

export default function TermsOfServicePage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">이용약관</h1>
        <p className="policy-doc__meta">시행일 {TERMS_EFFECTIVE_DATE} · Terms of Service</p>
        <p className="policy-doc__lede">
          Code Destiny 서비스의 이용 조건과 절차, 유료 상품의 환불·청약철회 기준, 회사와 이용자의 권리·의무를 정리한 문서입니다.
        </p>
      </header>

      <div className="policy-doc__layout">
        <nav className="policy-doc__toc" aria-label="이용약관 목차">
          <p className="policy-doc__toc-title">목차</p>
          <ul className="policy-doc__toc-list">
            {TERMS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a className="policy-doc__toc-link" href={`#${section.id}`}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="policy-doc__body">
          <TermsContent />

          <nav className="policy-doc__related" aria-label="관련 문서">
            {/* 12조를 단독 페이지로도 제공한다. 사이트맵에만 있고 내부 링크가 0인 고아 URL 을
                만들지 않기 위해 여기서 잇는다(/ja/tokushoho 가 그 상태였다). */}
            <Link className="policy-doc__toc-link" href="/refund-policy">
              환불 및 청약철회 정책
            </Link>
            <Link className="policy-doc__toc-link" href="/privacy">
              개인정보처리방침
            </Link>
            <Link className="policy-doc__toc-link" href="/account/delete">
              계정 삭제 안내
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
