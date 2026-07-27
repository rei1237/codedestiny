import type { Metadata } from "next";
import LockScreenFortuneClient from "./LockScreenFortuneClient";

// 앱 잠금화면(네이티브 LockScreenActivity)이 로드하는 몰입 화면 — 색인 불필요(noindex).
export const metadata: Metadata = {
  title: "잠금화면 운세 · Code Destiny",
  description: "매일 바뀌는 운세 지식·긍정 확언·꽃말·명언을 잠금화면에서 만나요.",
  robots: { index: false, follow: false },
};

export default function LockScreenFortunePage() {
  return <LockScreenFortuneClient />;
}
