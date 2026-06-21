import { redirect } from "next/navigation";

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

/**
 * AUXILIARY LANDING (React Home)
 * - 메인 서비스 화면만 사용하도록 루트(/)로 통합 리다이렉트
 */
export default function LandingPage() {
  redirect("/");
}
