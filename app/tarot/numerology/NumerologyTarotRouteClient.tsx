"use client";

import dynamic from "next/dynamic";

const NumerologyTarotClient = dynamic(() => import("./NumerologyTarotClient"));

export default function NumerologyTarotRouteClient() {
  return <NumerologyTarotClient />;
}
