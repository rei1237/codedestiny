"use client";

import { usePathname } from "next/navigation";
import GlobalHeader from "./GlobalHeader";
import SiteFooterHub from "./SiteFooterHub";
import DisclaimerBanner from "./DisclaimerBanner";

const CHROMELESS_ROUTES = [
  "/saju/love-simulation",
  "/saju/destiny-bias",
  "/saju/destiny-meeting-place",
  "/yeon-star-hug",
  "/saju-fpti",
  "/tarot/numerology",
  "/tarot/prompt-maker",
  "/tarot/crystal-soul",
  "/tarot/healing",
  "/saju/animal-destiny",
  "/saju/animal-test",
  "/palm-reading",
  "/music",
  "/ziwei/chart",
  "/fortune/prompt-hub",
  "/maya",
];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideChrome = CHROMELESS_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  return (
    <>
      {!hideChrome && <GlobalHeader />}
      {children}
      {!hideChrome && <DisclaimerBanner />}
      {!hideChrome && <SiteFooterHub />}
    </>
  );
}
