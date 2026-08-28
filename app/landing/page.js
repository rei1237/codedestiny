import { redirect } from "next/navigation";

export const metadata = {
  title: "홈으로 이동",
  description:
    "보조 랜딩 페이지는 홈으로 통합됐습니다. 이 주소는 이동 안내만 합니다.",
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
