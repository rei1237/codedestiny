import { redirect } from "next/navigation";

export const metadata = {
  title: "명리학 타로 리딩 | Code Destiny",
  description: "오행의 결과 타로 카드의 상징을 함께 열어 오늘의 선택 방향을 읽습니다.",
};

export default function MingriTarotPlayPage() {
  redirect("/tarot/mingri");
}
