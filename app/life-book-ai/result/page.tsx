"use client";

import { useEffect, useState, type ComponentType } from "react";

function LifeBookAiResultFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#f5e7c8",
        background:
          "radial-gradient(circle at 18% 8%, rgba(245, 197, 99, 0.18), transparent 30%), linear-gradient(135deg, #050407 0%, #140d0a 52%, #070508 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        인생의 책을 여는 중입니다.
      </p>
    </main>
  );
}

export default function LifeBookResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./LifeBookAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <LifeBookAiResultFallback />;
  }

  return <Content />;
}
