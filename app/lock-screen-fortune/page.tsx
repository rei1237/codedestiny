import "./companion.css";
import type { Metadata } from "next";
import LockScreenFortuneClient from "./LockScreenFortuneClient";

// 앱 잠금화면(네이티브 LockScreenActivity)이 로드하는 몰입 화면 — 색인 불필요(noindex).
export const metadata: Metadata = {
  title: "잠금화면 운세 · 꿀꿀운세",
  description: "캐릭터 부적과 긍정 확언, 오늘의 운세를 앱에서 함께 확인하고 나만의 부적을 골라보세요.",
  robots: { index: false, follow: false },
};

export default function LockScreenFortunePage() {
  return <LockScreenFortuneClient />;
}
