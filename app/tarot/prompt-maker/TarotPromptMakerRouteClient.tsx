"use client";

import dynamic from "next/dynamic";

const TarotPromptMakerClient = dynamic(() => import("./TarotPromptMakerClient"));

export default function TarotPromptMakerRouteClient() {
  return <TarotPromptMakerClient />;
}
