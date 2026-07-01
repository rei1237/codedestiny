"use client";

import dynamic from "next/dynamic";

function TarotRouteFallback() {
  return (
    <main className="min-h-dvh bg-[#080612] px-5 py-10 text-[#f5e8ff]" aria-busy="true">
      <p className="mx-auto mt-28 max-w-sm text-center text-sm font-bold">자존감의 카드를 여는 중입니다.</p>
    </main>
  );
}

const TarotSelfEsteemLandingContent = dynamic(() => import("./TarotSelfEsteemLandingContent"), {
  loading: TarotRouteFallback,
});

export default function TarotSelfEsteemRouteClient() {
  return <TarotSelfEsteemLandingContent />;
}
