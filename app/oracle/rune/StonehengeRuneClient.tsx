"use client";

import dynamic from "next/dynamic";

const StonehengeRune = dynamic(
  () => import("../../../StonehengeRune"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "100vh",
          background: "#030712",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e2e8f0",
          fontFamily: "serif",
          fontSize: 16,
        }}
      >
        Loading...
      </div>
    ),
  }
);

export default function StonehengeRuneClient() {
  return <StonehengeRune />;
}
