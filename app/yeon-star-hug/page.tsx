import type { Metadata } from "next";
import YeonStarHugPage from "@/components/yeon/YeonStarHugPage";

export const metadata: Metadata = {
  title: "연이의 마음 별자리 | Code Destiny",
  description:
    "점성술 데이터 기반으로 연이가 건네는 감성 위로 메시지와 공유 카드를 만드는 마음 별자리 서비스.",
};

export default function Page() {
  return <YeonStarHugPage />;
}
