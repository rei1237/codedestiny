import StaticOAuthCallbackRedirect from "../../_components/StaticOAuthCallbackRedirect";

export const metadata = {
  title: "구글 로그인 처리 중",
  description:
    "구글 계정 로그인을 마무리하는 중간 처리 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function GoogleCallbackPage() {
  return <StaticOAuthCallbackRedirect provider="google" />;
}
