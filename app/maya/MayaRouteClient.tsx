"use client";

import dynamic from "next/dynamic";

const MayaCalendarView = dynamic(() => import("@/src/components/maya/MayaCalendarView"), {
  ssr: false,
});

export default function MayaRouteClient() {
  return <MayaCalendarView />;
}
