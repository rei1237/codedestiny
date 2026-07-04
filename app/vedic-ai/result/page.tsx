"use client";

import { useEffect, useState, type ComponentType } from "react";

function VedicAiResultFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#ece9ff",
        background:
          "radial-gradient(circle at 20% 10%, rgba(139, 92, 246, 0.22), transparent 34%), linear-gradient(135deg, #0b0720 0%, #170f38 55%, #070510 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
        저장된 별의 지도를 여는 중입니다.
      </p>
    </main>
  );
}

export default function VedicAiResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./VedicAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <VedicAiResultFallback />;
  }

  return <Content />;
}
