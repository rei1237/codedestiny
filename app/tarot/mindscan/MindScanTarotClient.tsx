"use client";

import dynamic from "next/dynamic";

const MindScanTarot = dynamic(() => import("../../components/MindScanTarot"), {
  ssr: false,
});

export default function MindScanTarotClient() {
  return <MindScanTarot />;
}
