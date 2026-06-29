"use client";

import dynamic from "next/dynamic";

const DestinyBiasClient = dynamic(() => import("./DestinyBiasClient"));

export default function DestinyBiasRouteClient() {
  return <DestinyBiasClient />;
}
