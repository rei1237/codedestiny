/**
 * 모바일 하단 네비게이션 탭 정의 정본.
 *
 * 렌더러는 둘이다:
 *   - React: app/components/MobileBottomNav.tsx (이 파일을 import)
 *   - 정적 셸: index.html 의 #cdMobileBottomNav 마크업 (수기 미러)
 * 두 벌의 정합성은 scripts/verify-mobile-bottom-nav-sync.mjs 가 강제한다.
 * 라벨·href·순서를 바꾸면 반드시 index.html 도 함께 고치고 npm run sync:public 을 돌린다.
 */
import { stripLocalePrefix } from "./localePath";

export type MobileTabKey = "home" | "fortunes" | "consult" | "library" | "my";

export interface MobileTab {
  key: MobileTabKey;
  label: string;
  href: string;
  ariaLabel: string;
  /**
   * 런타임 사전 키. 값은 정적 셸이 쓰던 것을 그대로 가리킨다 — 여기서 새로 번역하지 않는다.
   * 🔴 마커 키는 **코어 사전에서만** 해석된다(app/components/LocaleRuntimeBridge.tsx).
   */
  transKey: string;
  ariaTransKey: string;
  /** 정적 셸의 data-nav-icon 글리프 (React 는 SVG 아이콘을 쓰지만 동기화 검사 대상) */
  glyph: string;
  /**
   * 셸에서 이동 대신 실행할 전역 액션(data-action). 실행은 기존 [data-action] 위임이 맡고,
   * 네비 스크립트는 이동만 취소한다 — 직접 호출하면 이중 실행이다.
   * React 네비는 이 필드를 무시하고 href 로만 이동한다.
   */
  shellAction?: string;
}

/**
 * 무료 사주 진입 액션. 2026-10-02 연이 정원 개편으로 사주 탭은 빠졌지만(모든 운세·검색·질문 카드에서
 * 찾는다) 딥링크와 DiaryTogetherSheet 가 계속 쓰고, 이 URL 은 모든 운세 탭으로 표시한다.
 */
export const SAJU_TAB_ACTION = "cdOneStepFreeSajuEntry";

/** 모든 운세 탭이 셸에서 실행하는 ?action= 이름. index.html 의 window.cdOpenAllFortunes 와 짝. */
export const ALL_FORTUNES_ACTION = "cdOpenAllFortunes";

/** 프로필 카드 시트(js/destiny-profile.js 의 window.dpOpenList). 계정 시트 안에서 열고, 딥링크는 마이 탭으로 표시한다. */
export const PROFILE_SHEET_ACTION = "dpOpenList";

/** 보관함·마이 탭이 셸에서 여는 시트(js/core/shell-sheet.js). React 페이지에서는 셸로 넘어가 같은 시트를 연다. */
export const LIBRARY_SHEET_ACTION = "cdOpenLibrary";
export const ACCOUNT_SHEET_ACTION = "cdOpenAccount";

/** 새로고침·뒤로가기에서 활성 탭을 유지하기 위한 sessionStorage 키. */
export const MOBILE_TAB_STATE_KEY = "cd.mobileTab.v1";

export const MOBILE_TABS: readonly MobileTab[] = [
  { key: "home", label: "홈", href: "/", ariaLabel: "홈", glyph: "⌂", transKey: "home.nav.home", ariaTransKey: "home.nav.home" },
  {
    key: "fortunes",
    label: "모든 운세",
    href: `/?action=${ALL_FORTUNES_ACTION}`,
    ariaLabel: "모든 운세 둘러보기",
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.k16cq4to",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.k1mpcz5w.ariaLabel",
    glyph: "✦",
    shellAction: ALL_FORTUNES_ACTION,
  },
  { key: "consult", label: "상담", href: "/consultations/", ariaLabel: "운명 상담 고르기", glyph: "✿",
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.consult",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.consultTab.ariaLabel" },
  {
    key: "library",
    label: "보관함",
    href: "/records/",
    ariaLabel: "내 보관함",
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.library",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.libraryTab.ariaLabel",
    glyph: "▤",
  },
  {
    key: "my",
    label: "마이",
    href: `/?action=${ACCOUNT_SHEET_ACTION}`,
    ariaLabel: "마이페이지",
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.kwp0s",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.k164wabc.ariaLabel",
    glyph: "☰",
    shellAction: ACCOUNT_SHEET_ACTION,
  },
] as const;

const TAB_KEYS: readonly MobileTabKey[] = MOBILE_TABS.map((tab) => tab.key);

/** pathname prefix → 탭 key. 위에서부터 먼저 맞는 것을 쓴다(구체적인 것이 앞). */
const PATH_RULES: ReadonlyArray<{ prefix: string; key: MobileTabKey }> = [
  { prefix: "/consultations", key: "consult" },
  { prefix: "/records", key: "library" },
  { prefix: "/fortune-chat", key: "consult" },
  { prefix: "/yeongnyangi/library", key: "library" },
  { prefix: "/points", key: "my" },
  { prefix: "/login", key: "my" },
  { prefix: "/signup", key: "my" },
  { prefix: "/saju", key: "fortunes" },
  { prefix: "/music", key: "home" },
  { prefix: "/today", key: "home" },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function readActionParam(search: string): string {
  if (!search) return "";
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return "";
  try {
    return String(new URLSearchParams(query).get("action") || "").trim();
  } catch {
    return "";
  }
}

/**
 * URL 만으로 활성 탭을 판정한다. 확실히 매칭되지 않으면 null 을 돌려주고,
 * 호출부가 sessionStorage 폴백(resolveMobileTabKey)으로 넘긴다.
 */
export function resolveActiveTabKey(pathname: string, search = ""): MobileTabKey | null {
  const path = stripLocalePrefix(String(pathname || "/").replace(/\/+$/, "") || "/");

  // 모든 운세·보관함·마이 탭은 홈(/)과 pathname 이 같으므로 ?action= 으로만 구분된다.
  const action = readActionParam(search);
  if (action === SAJU_TAB_ACTION || action === "cdSajuTabEntry") return "fortunes";
  if (new URLSearchParams(search).get("view") === "consultations") return "fortunes";
  if (action === ALL_FORTUNES_ACTION) return "fortunes";
  if (action === LIBRARY_SHEET_ACTION) return "library";
  if (action === ACCOUNT_SHEET_ACTION || action === PROFILE_SHEET_ACTION) return "my";
  if (path === "/") return "home";

  for (const rule of PATH_RULES) {
    if (matchesPrefix(path, rule.prefix)) return rule.key;
  }
  return null;
}

function isTabKey(value: string): value is MobileTabKey {
  return (TAB_KEYS as readonly string[]).includes(value);
}

export function readStoredTabKey(): MobileTabKey | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = String(window.sessionStorage.getItem(MOBILE_TAB_STATE_KEY) || "");
    return isTabKey(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function writeStoredTabKey(key: MobileTabKey): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MOBILE_TAB_STATE_KEY, key);
  } catch {
    /* 사파리 프라이빗 모드 등 storage 차단 환경 — 활성 표시만 포기하고 진행 */
  }
}

/**
 * 최종 활성 탭. URL 이 명확하면 그 값을, 아니면 마지막으로 누른 탭을 유지한다.
 * (기능 상세 페이지로 들어가도 진입에 쓴 탭이 계속 활성으로 남는다 — 요구사항 7)
 */
export function resolveMobileTabKey(pathname: string, search = ""): MobileTabKey | null {
  return resolveActiveTabKey(pathname, search) ?? readStoredTabKey();
}
