import type { Metadata } from "next";
import NumerologyTarotClient from "./NumerologyTarotClient";

export const metadata: Metadata = {
  title: "수비학 타로 | Code Destiny",
  description: "생년월일 기반 수비학 숫자와 3카드 스프레드를 결합해 연애/재회/직업 흐름을 읽는 리딩",
};

export default function NumerologyTarotPage() {
  return <NumerologyTarotClient />;
}
