"use client";

import { useEffect, useState, type ComponentType } from "react";

function NeoOperationRoomResultFallback() {
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
          "radial-gradient(circle at 50% 0%, rgba(245, 201, 103, 0.16), transparent 42%), linear-gradient(180deg, #050713 0%, #080a18 100%)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>
        네오의 작전 명령서를 여는 중입니다.
      </p>
    </main>
  );
}

export default function NeoOperationRoomResultClient() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("@/src/features/neo-war-room/NeoOperationRoomResultPage").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <NeoOperationRoomResultFallback />;
  }

  return <Content />;
}
