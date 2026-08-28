import { redirect } from "next/navigation";

export const metadata = {
  title: "인생의 책 PDF — 인생 총운으로 이동",
  description:
    "인생의 책 PDF 주소는 /life-book-ai 로 옮겨졌습니다. 이 주소는 이동 안내만 합니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LifeBookLegacyRedirectPage() {
  redirect("/life-book-ai");
}
