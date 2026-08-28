import { redirect } from "next/navigation";

export const metadata = {
  title: "사랑의 비밀로 이동",
  description:
    "사주 연애 바이블은 /love-secret-ai 로 옮겨졌습니다. 이 주소는 이동 안내만 합니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SajuLoveBiblePage() {
  redirect("/love-secret-ai");
}
