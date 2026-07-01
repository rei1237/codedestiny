"use client";

import { useEffect, useState, type ComponentType } from "react";

function LoveSecretAiResultFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#ffe8ef",
        background:
          "radial-gradient(circle at 18% 8%, rgba(244, 114, 182, 0.20), transparent 30%), linear-gradient(135deg, #100814 0%, #210b18 52%, #09070d 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        사랑의 비밀 리포트를 여는 중입니다.
      </p>
    </main>
  );
}

export default function LoveSecretResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./LoveSecretAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <LoveSecretAiResultFallback />;
  }

  return <Content />;
}
