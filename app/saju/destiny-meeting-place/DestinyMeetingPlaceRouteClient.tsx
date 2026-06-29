"use client";

import dynamic from "next/dynamic";

const DestinyMeetingPlacePage = dynamic(() => import("./components/DestinyMeetingPlacePage"));

export default function DestinyMeetingPlaceRouteClient() {
  return <DestinyMeetingPlacePage />;
}
