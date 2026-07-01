"use client";

import dynamic from "next/dynamic";

function PremiumUnlockFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#f8e7b6",
        background:
          "radial-gradient(circle at 50% 0%, rgba(212, 168, 67, 0.18), transparent 44%), linear-gradient(180deg, #05040d 0%, #08050f 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        프리미엄 해금 페이지를 여는 중입니다.
      </p>
    </main>
  );
}

const PremiumSalesContent = dynamic(() => import("./PremiumSalesContent"), {
  loading: PremiumUnlockFallback,
});

export default function PremiumUnlockClient() {
  return <PremiumSalesContent />;
}
