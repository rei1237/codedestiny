"use client";

import dynamic from "next/dynamic";

const PalmDestinyMain = dynamic(() => import("./PalmDestinyMain"));

export default function PalmReadingRouteClient() {
  return <PalmDestinyMain />;
}
