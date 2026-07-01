"use client";

import { useEffect, useState, type ComponentType } from "react";

function TenGodDebugFallback() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        color: "#f9ead2",
        background:
          "radial-gradient(circle at 18% 10%, rgba(245, 158, 11, 0.18), transparent 32%), linear-gradient(135deg, #120b10 0%, #25160f 52%, #080608 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        십성 상징표를 여는 중입니다.
      </p>
    </main>
  );
}

export default function TenGodDebugRouteClient() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("@/src/features/fortune-tea-house/components/TenGodDebugPage").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <TenGodDebugFallback />;
  }

  return <Content />;
}
