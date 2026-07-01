"use client";

import dynamic from "next/dynamic";

function MusicRouteFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#f4e8ff",
        background: "linear-gradient(180deg, #080615 0%, #120b24 58%, #06050f 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>달빛 음악실을 여는 중입니다.</p>
    </main>
  );
}

const MusicPlayerExample = dynamic(() => import("./MusicPlayerExample"), {
  loading: MusicRouteFallback,
});

export default function MusicRouteClient() {
  return <MusicPlayerExample />;
}
