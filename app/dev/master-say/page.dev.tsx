import type { Metadata } from "next";
import ConsultationReading from "@/components/fortune/ConsultationReading";

// 개발 전용: 숙요·점성술·베다 결과의 마스터 말풍선 확인 화면. 기존 기능에 연결하지 않는다.
// 프로덕션 빌드에서는 404 이고 색인·사이트맵 대상이 아니다.
export const metadata: Metadata = { title: "마스터 말풍선 데모", robots: { index: false, follow: false } };

const PARAGRAPH = "이 문단은 데모용 본문입니다. 실제 결과에서는 LLM이 쓴 장 본문이 이 자리에 들어가고, 말풍선은 장 중간 문단 사이에 끼어 읽는 호흡을 나눠 줍니다. ".repeat(6);
const BODY = Array.from({ length: 8 }, () => PARAGRAPH).join("\n\n");

export default function MasterSayDemoPage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "16px", display: "grid", gap: 40 }}>
      <section><h2>숙요 · closingLetter (서한비)</h2><ConsultationReading kind="sukuyo" value={BODY} index={1} say={{ sectionKey: "closingLetter" }} /></section>
      <section><h2>숙요 · twoStars (서한비)</h2><ConsultationReading kind="sukuyo" value={BODY} say={{ sectionKey: "twoStars" }} /></section>
      <section><h2>점성술 · 첫 장 (윤달)</h2><ConsultationReading kind="astrology" value={BODY} say={{ index: 0, total: 5 }} /></section>
      <section><h2>점성술 · 마지막 장 (윤달)</h2><ConsultationReading kind="astrology" value={BODY} say={{ index: 4, total: 5 }} /></section>
      <section><h2>베다 · 중간 장 (윤달)</h2><ConsultationReading kind="vedic" value={BODY} say={{ index: 2, total: 6 }} /></section>
      <section><h2>베다 · 마지막 장 (윤달)</h2><ConsultationReading kind="vedic" value={BODY} say={{ index: 5, total: 6 }} /></section>
    </main>
  );
}
