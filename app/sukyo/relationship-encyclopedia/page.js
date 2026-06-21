import { redirect } from "next/navigation";

export const metadata = {
  title: "숙요 인연 도감 | 내 운명에 들어오는 27가지 사람들 | Code Destiny",
  description:
    "나의 숙을 기준으로 27숙 전체 인연 지도를 펼쳐보세요. 안정형 인연, 강렬한 인연, 조심해야 할 인연, 성장형 인연, 비즈니스 인연까지 숙요점으로 살핍니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  keywords: [
    "숙요점",
    "숙요 인연",
    "27숙",
    "숙요 궁합",
    "안괴",
    "영친",
    "업태",
    "우쇠",
    "성위",
    "명",
    "인연 도감",
    "연애 궁합",
    "결혼 궁합",
  ],
};

export default function SukyoRelationshipEncyclopediaPage() {
  redirect("/sukuyo");
}
