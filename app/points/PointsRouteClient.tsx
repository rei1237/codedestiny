"use client";

import dynamic from "next/dynamic";

import { MoonShopSkeleton } from "./MoonShopFrame";

const PointsClient = dynamic(() => import("./PointsClient"), {
  ssr: false,
  loading: () => <MoonShopSkeleton />,
});

export default function PointsRouteClient() {
  return <PointsClient />;
}
