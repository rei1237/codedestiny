import type { Metadata } from "next";
import NeoConsultationClient from "@/app/neo-consultation/NeoConsultationClient";
export const metadata: Metadata = { title: "네오 작전 결정서 | 영냥이", description: "상대의 사주와 궁합을 살피고 네오가 직접 검수해 이메일로 전하는 작전 결정서입니다.", robots: { index: false, follow: false } };
export default function NeoDecisionPage() { return <NeoConsultationClient />; }
