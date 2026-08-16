import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { I18N_POLICY_ROUTE_MAP } from "../../lib/i18n/routes";
import TermsOfServicePage from "../terms-of-service/page";

const TERMS_METADATA_COPY = {
  ko: {
    title: "Terms of Service | 이용약관 — Code Destiny",
    description:
      "Code Destiny 이용약관 페이지입니다. 서비스 이용조건, 면책, 책임 제한, 환불 정책, 분쟁 처리 원칙을 안내합니다.",
    keywords: ["Terms of Service", "이용약관", "면책", "책임 제한", "환불 정책"],
  },
  en: {
    title: "Terms of Service | Code Destiny",
    description:
      "Code Destiny's terms explain service conditions, disclaimers, liability limits, refund policy, and dispute handling principles.",
    keywords: ["Terms of Service", "disclaimer", "liability limits", "refund policy", "service conditions"],
  },
  ja: {
    title: "利用規約 | Code Destiny",
    description:
      "Code Destinyの利用規約です。サービス利用条件、免責、責任制限、返金ポリシー、紛争処理の原則を案内します。",
    keywords: ["利用規約", "免責", "責任制限", "返金ポリシー", "利用条件"],
  },
  zh: {
    title: "服务条款 | Code Destiny",
    description:
      "Code Destiny 服务条款说明服务使用条件、免责声明、责任限制、退款政策与争议处理原则。",
    keywords: ["服务条款", "免责声明", "责任限制", "退款政策", "使用条件"],
  },
};

export function generateMetadata() {
  const copy = TERMS_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/terms",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
    // 리턴 태그. 이게 없으면 /ja·/zh·/zh-tw·/en 쪽에서 ko 를 가리켜도 한 방향이라 쌍이 통째로 버려진다.
    hreflangPaths: I18N_POLICY_ROUTE_MAP.terms,
  });
}

export default function TermsPage() {
  return <TermsOfServicePage />;
}
