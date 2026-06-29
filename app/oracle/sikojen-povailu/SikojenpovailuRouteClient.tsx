"use client";

import dynamic from "next/dynamic";

const SikojenpovailuApp = dynamic(() => import("./SikojenpovailuApp"), {
  ssr: false,
});

export default function SikojenpovailuRouteClient() {
  return <SikojenpovailuApp />;
}
