"use client";

import dynamic from "next/dynamic";

const ZiweiAnimalDestinyClient = dynamic(() => import("./ZiweiAnimalDestinyClient"), {
  ssr: false,
  loading: () => null,
});

export default function ZiweiAnimalDestinyClientLoader() {
  return <ZiweiAnimalDestinyClient />;
}
