"use client";

import dynamic from "next/dynamic";

const CrystalSoulTarotClient = dynamic(() => import("./CrystalSoulTarotClient"));

export default function CrystalSoulRouteClient() {
  return <CrystalSoulTarotClient />;
}
