"use client";

import dynamic from "next/dynamic";

const AnimalDestinyPage = dynamic(() => import("./components/AnimalDestinyPage"));

export default function AnimalDestinyRouteClient() {
  return <AnimalDestinyPage />;
}
