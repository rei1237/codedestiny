"use client";

import dynamic from "next/dynamic";

const YeonStarHugClient = dynamic(() => import("./YeonStarHugClient"), {
  ssr: false,
});

export default function YeonStarHugRouteClient() {
  return <YeonStarHugClient />;
}
