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

export type MobileTabKey = "home" | "saju" | "fortunes" | "pass" | "my";

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

/** 사주 탭이 셸에서 실행하는 ?action= 이름. js/destiny-profile.js 의 window.cdSajuTabEntry 와 짝. */
export const SAJU_TAB_ACTION = "cdSajuTabEntry";

/** 모든 운세 탭이 셸에서 실행하는 ?action= 이름. index.html 의 window.cdOpenAllFortunes 와 짝. */
export const ALL_FORTUNES_ACTION = "cdOpenAllFortunes";

/**
 * 마이 탭이 셸에서 실행하는 ?action= 이름. js/destiny-profile.js 의 window.dpOpenList 와 짝.
 * 프로필 카드 관리는 셸 하단 시트 하나가 정본이라, React 페이지의 마이 탭도 셸로 넘긴다.
 */
export const PROFILE_SHEET_ACTION = "dpOpenList";

/** 새로고침·뒤로가기에서 활성 탭을 유지하기 위한 sessionStorage 키. */
export const MOBILE_TAB_STATE_KEY = "cd.mobileTab.v1";

/**
 * 데스크탑에서 하단 네비를 접어 둔 상태. 활성 탭(sessionStorage)과 달리 세션을 넘겨
 * 기억해야 하므로 localStorage 다. 값이 "1"/"0" 문자열인 것은 정적 셸의 인라인 스크립트
 * (index.html 의 cd-mnav-collapse 블록)가 JSON 파서 없이 같은 키를 읽고 쓰기 때문이다.
 */
export const MNAV_COLLAPSED_KEY = "cd.mnavCollapsed.v1";

/** 접기 버튼의 aria-label 사전 키. 정적 셸 토글과 같은 문구를 공유한다. */
export const MNAV_TOGGLE_TRANS_KEY = "shell.cdMobileBottomNav.k13uxius.ariaLabel";

/** 위 키가 사전에서 풀리지 않을 때 쓰는 원문. index.html 의 aria-label 과 글자 그대로 같다. */
export const MNAV_TOGGLE_LABEL_KO = "하단 메뉴 접기/펼치기";

export const MOBILE_TABS: readonly MobileTab[] = [
  { key: "home", label: "홈", href: "/", ariaLabel: "홈", glyph: "⌂", transKey: "home.nav.home", ariaTransKey: "home.nav.home" },
  {
    key: "saju",
    label: "사주",
    href: `/?action=${SAJU_TAB_ACTION}`,
    ariaLabel: "내 프로필로 사주 보기",
    // 🔴 셸 탭바와 같은 탭 전용 키를 쓴다. home.nav.saju 는 카드·링크용 정식 명칭이라 탭 칸(58px)에
    // 안 들어간다 — es "Cuatro Pilares" 66.8px, fr "Quatre Piliers" 64.2px, ms "Empat Tiang" 60.3px.
    // Main 네임스페이스에는 그 자리용 짧은 형(es "4 Pilares")이 이미 저작돼 있고,
    // verify-mobile-bottom-nav-sync 가 이 네임스페이스에 12자 상한을 건다.
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.kxvio",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.kb86wy0.ariaLabel",
    glyph: "命",
    shellAction: SAJU_TAB_ACTION,
  },
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
  { key: "pass", label: "이용권", href: "/points/", ariaLabel: "이용권 상점", glyph: "◈",
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.ku6gdz",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.k16eawmw.ariaLabel" },
  // 셸에서는 프로필 시트를 열고, React 페이지에서는 셸로 넘어가 같은 시트를 연다(사주·모든 운세 탭과 동일).
  {
    key: "my",
    label: "마이",
    href: `/?action=${PROFILE_SHEET_ACTION}`,
    ariaLabel: "마이페이지",
    transKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.kwp0s",
    ariaTransKey: "shell.cdMobileBottomNav.cdMobileBottomNavMain.k164wabc.ariaLabel",
    glyph: "☰",
    shellAction: PROFILE_SHEET_ACTION,
  },
] as const;

const TAB_KEYS: readonly MobileTabKey[] = MOBILE_TABS.map((tab) => tab.key);

/** pathname prefix → 탭 key. 위에서부터 먼저 맞는 것을 쓴다(구체적인 것이 앞). */
const PATH_RULES: ReadonlyArray<{ prefix: string; key: MobileTabKey }> = [
  { prefix: "/points", key: "pass" },
  { prefix: "/login", key: "my" },
  { prefix: "/signup", key: "my" },
  { prefix: "/saju", key: "saju" },
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

  // 사주·모든 운세·마이 탭은 홈(/)과 pathname 이 같으므로 ?action= 으로만 구분된다.
  const action = readActionParam(search);
  if (action === SAJU_TAB_ACTION) return "saju";
  if (action === ALL_FORTUNES_ACTION) return "fortunes";
  if (action === PROFILE_SHEET_ACTION) return "my";
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

export function readMnavCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MNAV_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMnavCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MNAV_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* storage 차단 환경 — 다음 방문에 펼친 상태로 돌아갈 뿐이므로 조용히 넘긴다 */
  }
}

/**
 * 최종 활성 탭. URL 이 명확하면 그 값을, 아니면 마지막으로 누른 탭을 유지한다.
 * (기능 상세 페이지로 들어가도 진입에 쓴 탭이 계속 활성으로 남는다 — 요구사항 7)
 */
export function resolveMobileTabKey(pathname: string, search = ""): MobileTabKey | null {
  return resolveActiveTabKey(pathname, search) ?? readStoredTabKey();
}
