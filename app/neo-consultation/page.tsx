import type { Metadata } from "next";
import NeoConsultationClient from "./NeoConsultationClient";

export const metadata: Metadata = {
  title: "네오에게 물어봐 | Code Destiny",
  description: "고민을 질문 하나씩 정리하고, 네오가 직접 검수한 이메일 답변을 받아보세요.",
  robots: { index: false, follow: false },
};
export default function NeoConsultationPage() { return <NeoConsultationClient />; }
