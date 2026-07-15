import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import PrivacyPolicyContent, {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_SECTIONS,
} from "./PrivacyPolicyContent";

const PRIVACY_POLICY_METADATA_COPY = {
  ko: {
    title: "개인정보처리방침 | Code Destiny",
    description:
      "Code Destiny 개인정보처리방침입니다. 개인정보 수집 목적, 보관 기간, 쿠키와 광고 식별자, Google 광고 파트너 고지, 이용자 권리와 문의 방법을 안내합니다.",
    keywords: ["개인정보처리방침", "쿠키", "광고 식별자", "Google AdSense", "개인정보 삭제"],
  },
  en: {
    title: "Privacy Policy | Code Destiny",
    description:
      "Code Destiny's privacy policy explains collection purposes, retention periods, cookies, advertising identifiers, Google advertising partners, user rights, and contact options.",
    keywords: ["Privacy Policy", "cookies", "advertising identifiers", "Google AdSense", "personal data deletion"],
  },
  ja: {
    title: "プライバシーポリシー | Code Destiny",
    description:
      "Code Destinyのプライバシーポリシーです。個人情報の収集目的、保管期間、Cookieと広告識別子、Google広告パートナー、利用者の権利と問い合わせ方法を案内します。",
    keywords: ["プライバシーポリシー", "Cookie", "広告識別子", "Google AdSense", "個人情報削除"],
  },
  zh: {
    title: "隐私政策 | Code Destiny",
    description:
      "Code Destiny 隐私政策说明个人信息收集目的、保存期限、Cookie 与广告标识符、Google 广告合作伙伴、用户权利和联系方式。",
    keywords: ["隐私政策", "Cookie", "广告标识符", "Google AdSense", "个人信息删除"],
  },
};

export function generateMetadata() {
  const copy = PRIVACY_POLICY_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/privacy",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

export default function PrivacyPolicyPage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">개인정보처리방침</h1>
        <p className="policy-doc__meta">시행일 {PRIVACY_POLICY_EFFECTIVE_DATE} · Privacy Policy</p>
        <p className="policy-doc__lede">
          Code Destiny가 어떤 정보를 왜 처리하고 얼마나 보관하는지, 이용자가 어떤 권리를 어떻게 행사할 수 있는지 정리한 문서입니다.
        </p>
      </header>

      <div className="policy-doc__layout">
        <nav className="policy-doc__toc" aria-label="개인정보처리방침 목차">
          <p className="policy-doc__toc-title">목차</p>
          <ul className="policy-doc__toc-list">
            {PRIVACY_POLICY_SECTIONS.map((section) => (
              <li key={section.id}>
                <a className="policy-doc__toc-link" href={`#${section.id}`}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="policy-doc__body">
          <PrivacyPolicyContent />

          <nav className="policy-doc__related" aria-label="관련 문서">
            <Link className="policy-doc__toc-link" href="/terms">
              이용약관
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
