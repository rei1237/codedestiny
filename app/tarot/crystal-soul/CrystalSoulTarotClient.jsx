"use client";

import dynamic from "next/dynamic";

const CrystalSoulTarot = dynamic(
  () => import("../../../CrystalSoulTarot_v2"),
  { ssr: false }
);

export default function CrystalSoulTarotClient() {
  return <CrystalSoulTarot />;
}
