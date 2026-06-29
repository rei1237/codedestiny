"use client";

import dynamic from "next/dynamic";

const MusicPlayerExample = dynamic(() => import("./MusicPlayerExample"));

export default function MusicRouteClient() {
  return <MusicPlayerExample />;
}
