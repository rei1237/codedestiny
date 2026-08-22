// 자동 수집 환경정보.
//
// 🔴 핵심 설계: collectEnvironment() 가 반환하는 "순서 있는 배열" 하나가
//    (a) 제출 payload 와 (b) 화면에 보여주는 고지 표를 동시에 만든다.
//    두 곳을 따로 만들면 언젠가 어긋나고, 그 순간 고지가 거짓말이 된다.
//    여기 배열에 없는 값은 전송되지 않고, 있는 값은 반드시 사용자에게 보인다.

import type { FeedbackCopy } from "./copy";

export interface EnvEntry {
  key: string;
  label: string;
  value: string;
}

/** 이 목록은 UI 에 "수집하지 않는 정보"로 그대로 렌더된다. */
export function notCollectedList(copy: FeedbackCopy): readonly string[] {
  return Object.freeze([
    copy.notCollectedIp,
    copy.notCollectedPersonalInfo,
    copy.notCollectedCookies,
    copy.notCollectedOtherTabs,
    copy.notCollectedClipboard,
  ]);
}

function safe(read: () => string | number | null | undefined): string {
  try {
    const value = read();
    if (value === null || value === undefined) return "";
    return String(value).trim().slice(0, 500);
  } catch {
    return "";
  }
}

function readPlatform(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return nav.userAgentData?.platform || nav.platform || "";
}

function readConnection(): string {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return nav.connection?.effectiveType || "";
}

function readTheme(copy: FeedbackCopy): string {
  const persona = document.documentElement.classList.contains("neo-mode") ? copy.personaNeo : copy.personaYeoni;
  const scheme = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? copy.schemeDark : copy.schemeLight;
  return `${persona} · ${scheme}`;
}

/**
 * 브라우저에서 읽을 수 있는 재현용 환경 정보를 모은다.
 * SSR 에서 호출되면 빈 배열을 돌려준다(이 페이지는 ssr:false 이지만 방어).
 */
export function collectEnvironment(reportedUrl: string, copy: FeedbackCopy): EnvEntry[] {
  if (typeof window === "undefined" || typeof navigator === "undefined") return [];

  const entries: Array<[string, string, string]> = [
    ["url", copy.envLabelUrl, reportedUrl || safe(() => window.location.href)],
    ["userAgent", copy.envLabelUserAgent, safe(() => navigator.userAgent)],
    ["platform", copy.envLabelPlatform, safe(readPlatform)],
    ["viewport", copy.envLabelViewport, safe(() => `${window.innerWidth}×${window.innerHeight}`)],
    ["screen", copy.envLabelScreen, safe(() => `${window.screen?.width}×${window.screen?.height}`)],
    ["dpr", copy.envLabelDpr, safe(() => `${window.devicePixelRatio}x`)],
    ["language", copy.envLabelLanguage, safe(() => navigator.language)],
    ["timezone", copy.envLabelTimezone, safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone)],
    ["theme", copy.envLabelTheme, safe(() => readTheme(copy))],
    ["connection", copy.envLabelConnection, safe(readConnection)],
    ["appVersion", copy.envLabelAppVersion, safe(() => process.env.NEXT_PUBLIC_APP_VERSION)],
    ["buildVersion", copy.envLabelBuildVersion, safe(() => String(process.env.NEXT_PUBLIC_GIT_SHA || "").slice(0, 8))],
    ["runtime", copy.envLabelRuntime, safe(() => process.env.NEXT_PUBLIC_RUNTIME_TARGET) || "web"],
    ["submittedAt", copy.envLabelSubmittedAt, safe(() => new Date().toISOString())],
  ];

  return entries
    .filter(([, , value]) => Boolean(value))
    .map(([key, label, value]) => ({ key, label, value }));
}

/** 환경 정보 전송을 해제했을 때 남기는 최소 항목. */
export function minimalEnvironment(reportedUrl: string, copy: FeedbackCopy): EnvEntry[] {
  return collectEnvironment(reportedUrl, copy).filter((entry) => entry.key === "url" || entry.key === "submittedAt");
}

export function findEnvValue(entries: EnvEntry[], key: string): string {
  return entries.find((entry) => entry.key === key)?.value || "";
}
