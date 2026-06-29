"use client";

import dynamic from "next/dynamic";

const PromptHubClient = dynamic(() => import("./PromptHubClient"), {
  ssr: false,
});

export default function PromptHubRouteClient() {
  return <PromptHubClient />;
}
