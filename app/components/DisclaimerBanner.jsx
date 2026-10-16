/**
 * DisclaimerBanner — 운세 랜딩의 "서비스를 만든 사람" 한 줄.
 * 저장 경로: app/components/DisclaimerBanner.jsx
 *
 * 2026-10-16 "직관성": 모든 페이지 하단에 뜨던 닫기형 면책 바(⚠️ 오락 및 참고 목적)를 없앴다.
 * 같은 안내는 모든 푸터의 한 줄(lib/brand/site-footer.ts FOOTER_NOTICE)이 맡는다.
 * 이름은 AppChrome 의 hideChrome 경계 검사(__tests__/ui/*-immersive, locale-footer)가 가리키므로 유지한다.
 */
"use client";

import { usePathname } from "next/navigation";
import { PUBLIC_RECORD_PATH, publicRecordCopy } from "@/lib/seo/public-record-copy.mjs";
import landingStyles from "./fortune-landing.module.css";
import { useLocale } from "@/lib/i18n/useT";

const FORTUNE_LANDINGS = ["/saju", "/ziwei", "/ziwei/chart", "/astrology", "/vedic", "/sukuyo", "/tarot"];

export default function DisclaimerBanner() {
  const locale = useLocale();
  const pathname = usePathname();
  if (locale !== "ko" || !FORTUNE_LANDINGS.includes((pathname || "").replace(/\/$/, ""))) return null;

  return <aside className={landingStyles.founderNote} aria-label="서비스를 만든 사람">
    <p>{publicRecordCopy.ko.landingLead}<br /><strong>{publicRecordCopy.ko.landingCreator}</strong></p>
    <a href={PUBLIC_RECORD_PATH}>{publicRecordCopy.ko.landingLink} →</a>
  </aside>;
}
