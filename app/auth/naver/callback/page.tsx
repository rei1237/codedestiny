import StaticOAuthCallbackRedirect from "../../_components/StaticOAuthCallbackRedirect";

export const metadata = {
  title: "네이버 로그인 처리 중",
  description:
    "네이버 계정 로그인을 마무리하는 중간 처리 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function NaverCallbackPage() {
  return <StaticOAuthCallbackRedirect provider="naver" />;
}
