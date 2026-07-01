"use client";

import { useEffect, useState, type ComponentType } from "react";

function KarmaDestinyResultFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#f8efd8",
        background:
          "radial-gradient(circle at 18% 8%, rgba(126, 34, 206, 0.24), transparent 28%), linear-gradient(135deg, #060814 0%, #111021 52%, #071923 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        업장 리포트를 여는 중입니다.
      </p>
    </main>
  );
}

export default function KarmaDestinyAiResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./KarmaDestinyAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <KarmaDestinyResultFallback />;
  }

  return <Content />;
}
