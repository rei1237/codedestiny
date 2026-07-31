// 자동 수집 환경정보.
//
// 🔴 핵심 설계: collectEnvironment() 가 반환하는 "순서 있는 배열" 하나가
//    (a) 제출 payload 와 (b) 화면에 보여주는 고지 표를 동시에 만든다.
//    두 곳을 따로 만들면 언젠가 어긋나고, 그 순간 고지가 거짓말이 된다.
//    여기 배열에 없는 값은 전송되지 않고, 있는 값은 반드시 사용자에게 보인다.

export interface EnvEntry {
  key: string;
  label: string;
  value: string;
}

/** 이 목록은 UI 에 "수집하지 않는 정보"로 그대로 렌더된다. */
export const NOT_COLLECTED = Object.freeze([
  "IP 주소·접속 위치",
  "이름·연락처 등 직접 입력하지 않은 개인정보",
  "쿠키·로그인 토큰 값",
  "다른 탭이나 다른 사이트의 정보",
  "클립보드 내용",
]);

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

function readTheme(): string {
  const persona = document.documentElement.classList.contains("neo-mode") ? "네오" : "연이";
  const scheme = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "다크" : "라이트";
  return `${persona} · ${scheme}`;
}

/**
 * 브라우저에서 읽을 수 있는 재현용 환경 정보를 모은다.
 * SSR 에서 호출되면 빈 배열을 돌려준다(이 페이지는 ssr:false 이지만 방어).
 */
export function collectEnvironment(reportedUrl: string): EnvEntry[] {
  if (typeof window === "undefined" || typeof navigator === "undefined") return [];

  const entries: Array<[string, string, string]> = [
    ["url", "제보 대상 페이지", reportedUrl || safe(() => window.location.href)],
    ["userAgent", "브라우저 정보", safe(() => navigator.userAgent)],
    ["platform", "운영체제", safe(readPlatform)],
    ["viewport", "창 크기", safe(() => `${window.innerWidth}×${window.innerHeight}`)],
    ["screen", "화면 해상도", safe(() => `${window.screen?.width}×${window.screen?.height}`)],
    ["dpr", "화면 배율", safe(() => `${window.devicePixelRatio}x`)],
    ["language", "언어 설정", safe(() => navigator.language)],
    ["timezone", "시간대", safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone)],
    ["theme", "테마", safe(readTheme)],
    ["connection", "네트워크 종류", safe(readConnection)],
    ["appVersion", "앱 버전", safe(() => process.env.NEXT_PUBLIC_APP_VERSION)],
    ["buildVersion", "빌드", safe(() => String(process.env.NEXT_PUBLIC_GIT_SHA || "").slice(0, 8))],
    ["runtime", "실행 환경", safe(() => process.env.NEXT_PUBLIC_RUNTIME_TARGET) || "web"],
    ["submittedAt", "제출 시각", safe(() => new Date().toISOString())],
  ];

  return entries
    .filter(([, , value]) => Boolean(value))
    .map(([key, label, value]) => ({ key, label, value }));
}

/** 환경 정보 전송을 해제했을 때 남기는 최소 항목. */
export function minimalEnvironment(reportedUrl: string): EnvEntry[] {
  return collectEnvironment(reportedUrl).filter((entry) => entry.key === "url" || entry.key === "submittedAt");
}

export function findEnvValue(entries: EnvEntry[], key: string): string {
  return entries.find((entry) => entry.key === key)?.value || "";
}
