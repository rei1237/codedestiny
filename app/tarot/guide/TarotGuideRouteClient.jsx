"use client";

import dynamic from "next/dynamic";

const TarotGuideContent = dynamic(() => import("./TarotGuideContent"));

export default function TarotGuideRouteClient() {
  return <TarotGuideContent />;
}
