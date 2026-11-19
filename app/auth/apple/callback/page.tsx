import StaticOAuthCallbackRedirect from "../../_components/StaticOAuthCallbackRedirect";
import { ROBOTS_META } from "../../../../lib/seo/index-policy.mjs";

export const metadata = {
  title: "Apple 로그인 처리 중",
  description:
    "Apple 계정 로그인을 마무리하는 중간 처리 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: ROBOTS_META.NOINDEX,
};

export default function AppleCallbackPage() {
  return <StaticOAuthCallbackRedirect provider="apple" />;
}
