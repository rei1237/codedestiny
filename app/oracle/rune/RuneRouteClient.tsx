"use client";

import dynamic from "next/dynamic";

const StonehengeRune = dynamic(() => import("../../../StonehengeRune"));

export default function RuneRouteClient() {
  return <StonehengeRune />;
}
