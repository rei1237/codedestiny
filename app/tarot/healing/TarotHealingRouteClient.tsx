"use client";

import dynamic from "next/dynamic";

const TarotHealingLandingContent = dynamic(() => import("./TarotHealingLandingContent"));

export default function TarotHealingRouteClient() {
  return <TarotHealingLandingContent />;
}
