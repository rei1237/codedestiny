"use client";

import dynamic from "next/dynamic";

const SunHealingTarot = dynamic(() => import("../../components/SunHealingTarot"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-amber-50 via-orange-50/80 to-amber-100/90 text-[15px] font-medium text-orange-950/75"
      role="status"
      aria-live="polite"
    >
      따뜻한 태양 타로 화면을 불러오는 중…
    </div>
  ),
});

export default function TarotHealingClient() {
  return <SunHealingTarot />;
}
