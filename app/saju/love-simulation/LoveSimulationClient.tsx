"use client";

import dynamic from "next/dynamic";

const LoveSimulation = dynamic(
  () => import("../../../LoveSimulation"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "100vh",
          background: "#030309",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C8A96E",
          fontFamily: "serif",
          fontSize: 16,
        }}
      >
        Loading...
      </div>
    ),
  }
);

export default function LoveSimulationClient() {
  return <LoveSimulation />;
}
