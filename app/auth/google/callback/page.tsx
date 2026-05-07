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

export default function GoogleCallbackPage() {
  return <StaticOAuthCallbackRedirect provider="google" />;
}
