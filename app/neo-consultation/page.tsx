import type { Metadata } from "next";
import NeoConsultationClient from "./NeoConsultationClient";

export const metadata: Metadata = {
  title: "네오에게 물어봐 | Code Destiny",
  description: "네오가 접수 내용을 읽고 내부 시스템으로 작성·검수해 전하는 이메일 해석 서비스입니다. 실시간·대면 상담은 제공하지 않습니다.",
  robots: { index: false, follow: false },
};
export default function NeoConsultationPage() { return <NeoConsultationClient />; }
