import StaticOAuthCallbackRedirect from "../../_components/StaticOAuthCallbackRedirect";

export const metadata = {
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
