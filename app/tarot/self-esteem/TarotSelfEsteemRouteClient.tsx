"use client";

import dynamic from "next/dynamic";

const TarotSelfEsteemLandingContent = dynamic(() => import("./TarotSelfEsteemLandingContent"));

export default function TarotSelfEsteemRouteClient() {
  return <TarotSelfEsteemLandingContent />;
}
