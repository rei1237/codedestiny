import type { Metadata } from "next";
import NumerologyTarotClient from "./NumerologyTarotClient";

export const metadata: Metadata = {
  title: "수비학 타로 | Code Destiny",
  description: "생명수·오늘수·질문수를 5카드 흐름과 겹쳐 관계·일·선택의 리듬을 차분히 읽는 수비학 타로",
};

export default function NumerologyTarotPage() {
  return <NumerologyTarotClient />;
}
