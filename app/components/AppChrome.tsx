"use client";

import { usePathname } from "next/navigation";
import GlobalHeader from "./GlobalHeader";
import SiteFooterHub from "./SiteFooterHub";
import DisclaimerBanner from "./DisclaimerBanner";

const CHROMELESS_ROUTES = ["/saju/destiny-bias", "/yeon-star-hug", "/saju-fpti", "/tarot/numerology"];

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
