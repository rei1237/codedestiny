import { redirect } from "next/navigation";

export const metadata = {
  title: "사주 라이프북 — 인생 총운으로 이동",
  description:
    "사주 라이프북은 /life-book-ai 로 옮겨졌습니다. 이 주소는 이동 안내만 합니다.",
  alternates: {
    canonical: "https://code-destiny.com/life-book-ai",
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function SajuLifebookPage() {
  redirect("/life-book-ai");
}
