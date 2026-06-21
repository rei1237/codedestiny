import { redirect } from "next/navigation";

export const metadata = {
  title: "사주 만세력 기본 해석 - 오행·십성·명식 분석 | Code Destiny",
  description:
    "생년월일시 기반 사주 명식으로 오행 균형과 십성 흐름을 분석하는 사주 서비스.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SajuBasicPlayPage() {
  redirect("/#destinyCardForm");
}
