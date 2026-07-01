"use client";

import { useEffect, useState, type ComponentType } from "react";

function AstrologyAiResultFallback() {
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
          "radial-gradient(circle at 18% 8%, rgba(245, 212, 135, 0.18), transparent 30%), linear-gradient(135deg, #050816 0%, #0b1028 52%, #050816 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        별자리 리포트를 여는 중입니다.
      </p>
    </main>
  );
}

export default function AstrologyAiResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./AstrologyAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <AstrologyAiResultFallback />;
  }

  return <Content />;
}
