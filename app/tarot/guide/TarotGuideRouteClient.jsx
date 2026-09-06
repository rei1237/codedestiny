"use client";

import dynamic from "next/dynamic";

const TarotGuideContent = dynamic(() => import("./TarotGuideContent"));

export default function TarotGuideRouteClient({ integrityNote = null }) {
  return <TarotGuideContent integrityNote={integrityNote} />;
}
