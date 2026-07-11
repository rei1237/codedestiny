"use client";

import { useEffect, useState, type ComponentType } from "react";

function NamingAiResultFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#f4eeff",
        background:
          "radial-gradient(circle at 18% 8%, rgba(167, 139, 250, 0.16), transparent 32%), linear-gradient(178deg, #0a0818 0%, #13102a 52%, #090718 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        작명첩을 펼치는 중입니다.
      </p>
    </main>
  );
}

export default function NamingAiResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./NamingAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <NamingAiResultFallback />;
  }

  return <Content />;
}
