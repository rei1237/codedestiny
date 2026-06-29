"use client";

import dynamic from "next/dynamic";

const MindScanTarot = dynamic(() => import("../../components/MindScanTarot"));

export default function MindScanTarotRouteClient() {
  return <MindScanTarot />;
}
