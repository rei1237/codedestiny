"use client";

import dynamic from "next/dynamic";

function TarotRouteFallback() {
  return (
    <main className="min-h-dvh bg-[#080612] px-5 py-10 text-[#f5e8ff]" aria-busy="true">
      <p className="mx-auto mt-28 max-w-sm text-center text-sm font-bold">마음의 카드를 여는 중입니다.</p>
    </main>
  );
}

const MindScanTarot = dynamic(() => import("../../components/MindScanTarot"), {
  loading: TarotRouteFallback,
});

export default function MindScanTarotRouteClient() {
  return <MindScanTarot />;
}
