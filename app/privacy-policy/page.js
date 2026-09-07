import PolicyGuide, { policyPageClass, PolicyAccordion } from "../components/PolicyGuide";
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
    <main className={`policy-doc ${policyPageClass}`}>
      <PolicyGuide kind="privacy" title="개인정보처리방침" description="어떤 정보를 왜 사용하고 얼마나 보관하는지, 내 정보에 관한 권리를 확인하세요." meta={`시행일 ${PRIVACY_POLICY_EFFECTIVE_DATE}`} />

      <PolicyAccordion id="privacy-at-a-glance" title="로그인 전·후와 프로필 카드 삭제가 궁금해요">
        <p>회원가입 시 이름·이메일·휴대폰 번호를 처리하며, 생년 정보는 해당 운세나 프로필 기능을 사용할 때 입력받습니다. 로그인하지 않은 경우에도 접속 환경·쿠키·로컬스토리지 등 자동 처리 정보가 발생할 수 있습니다.</p>
        <p>프로필 카드의 이름·생년 정보·출생지는 카드를 삭제하면 서버에서 즉시 삭제됩니다. 결제 기록 등 별도의 보관 기준이 있는 정보는 아래 보관 기간 항목을 확인해 주세요.</p>
        <a href="#retention">보관 기간과 삭제 기준 보기</a> · <Link href="/contact">개인정보 문의하기</Link>
      </PolicyAccordion>
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
