import { redirect } from "next/navigation";

export const metadata = {
  title: "명리학 타로 실행 | Code Destiny",
  description: "명리학 타로 로컬 실행 페이지. API 호출 없이 브라우저에서 카드 뽑기와 해석을 진행합니다.",
};

export default function MingriTarotPlayPage() {
  redirect("/static?service=tarot&source=tarot-mingri-play");
}
